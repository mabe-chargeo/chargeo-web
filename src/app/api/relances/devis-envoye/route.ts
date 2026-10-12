import { NextResponse } from 'next/server';
import { getQualificationListId, QUALIFICATION_PROD_ID } from '@/lib/listesClickUp';
import { aujourdhuiParis, ajouterJoursOuvres, echeanceClickUp, libelleJour, type Jour } from '@/lib/joursOuvres';

// Devis envoyé (Phase 4, décision Matthieu du 11/10/2026). Appelé par l'automatisation ClickUp
// « statut → 📩 devis envoyé » de Qualification : POST ?taskId=...
// Le devis part par email depuis la tâche, puis le commercial passe la fiche en devis envoyé (ClickUp ne sait pas
// réagir à un email envoyé). Le futur bouton « Envoyer le devis » de l'appli (Phase 6) réutilisera ce calcul.
// 1. Sous-tâche (scénario, emplacement) : ignorée, seule la fiche principale porte la relance.
// 2. Fin des relances (décision Matthieu du 12/10, trou vu au test à blanc) : fiche 🏆 gagnée, ❌ perdue ou archivée
//    (statut terminé), ou déjà arrivée dans Planning Chantiers (l'automatisation du gagné peut la déplacer avant
//    l'appel) : l'échéance de relance est retirée et un commentaire le note. Appelé aussi par l'automatisation
//    « statut → 🏆 gagné ou ❌ perdu » de Qualification.
// 3. Sinon la fiche doit être en « devis envoyé » au moment de l'appel, sinon rien n'est fait.
// 4. Échéance = première relance interne à J+3 ouvrés (week-ends et jours fériés français sautés).
//    C'est un rappel au commercial : aucun email n'est envoyé au client.
// 5. L'écriture est vérifiée par relecture (même jour à Paris : ClickUp arrondit l'heure d'une date sans heure,
//    constaté au test du 11/10), puis un commentaire note l'envoi et la date de relance.
// Preview : GET ?taskId=...&simulation=1 (rien n'est écrit) ou &executer=1 (fiches TEST uniquement).

const STATUT_ENVOYE = 'devis envoy';
const DELAI_OUVRES = 3;
const PLANNING_CHANTIERS_ID = '901520038258';

const memeJour = (a: Jour, b: Jour) => a.a === b.a && a.m === b.m && a.j === b.j;
const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function lireTache(taskId: string, token: string): Promise<any | null> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}?custom_task_ids=true`, {
    headers: { Authorization: token },
    cache: 'no-store',
  });
  return res.ok ? res.json() : null;
}

async function commenter(taskId: string, token: string, texte: string): Promise<boolean> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/comment`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment_text: texte, notify_all: false }),
  });
  if (!res.ok) console.error(`Commentaire refusé (${res.status}) sur ${taskId}`);
  return res.ok;
}

// ms = null : retire l'échéance
async function ecrireEcheance(taskId: string, token: string, ms: number | null): Promise<boolean> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
    method: 'PUT',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(ms === null ? { due_date: null } : { due_date: ms, due_date_time: false }),
  });
  if (!res.ok) console.error(`Écriture de l'échéance refusée (${res.status}) sur ${taskId}`, await res.text().catch(() => ''));
  return res.ok;
}

async function traiter(taskId: string, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { status: 500, body: { success: false, error: 'Configuration serveur incomplète' } };

  const tache = await lireTache(taskId, token);
  if (!tache) return { status: 404, body: { success: false, error: 'Fiche introuvable' } };

  // 1. Sous-tâche : rien
  if (tache.parent) {
    return { status: 200, body: { success: true, action: 'ignore_sous_tache', parent: String(tache.parent), simulation } };
  }

  const liste = String(tache?.list?.id ?? '');
  // Preview : vrai passage sur les fiches TEST seulement ; simulation aussi sur une vraie fiche Qualification
  if (process.env.VERCEL_ENV !== 'production') {
    const listeTest = getQualificationListId();
    const estTest = (!!listeTest && liste === String(listeTest))
      || (liste === PLANNING_CHANTIERS_ID && normal(tache.name).startsWith('test'));
    if (!estTest && !(simulation && liste === QUALIFICATION_PROD_ID)) {
      return { status: 403, body: { success: false, error: 'En preview : fiches TEST, ou simulation seule sur une vraie fiche Qualification' } };
    }
  }
  const id = String(tache.id);
  const statut = String(tache?.status?.status || '');

  // 2. Fin des relances : gagné, perdu, archivé, ou fiche déjà partie en Planning Chantiers
  const typeStatut = String(tache?.status?.type || '');
  if (typeStatut === 'done' || typeStatut === 'closed' || liste === PLANNING_CHANTIERS_ID) {
    if (!tache.due_date) return { status: 200, body: { success: true, action: 'deja_sans_relance', statut, simulation } };
    const texte = `🛑 Relances commerciales arrêtées (fiche « ${statut} ») : l'échéance de relance est retirée.`;
    if (simulation) return { status: 200, body: { success: true, action: 'arreterait', statut, commentaire: texte, simulation } };
    if (!(await ecrireEcheance(id, token, null))) {
      await commenter(id, token, "⚠️ Relances : l'échéance de relance n'a pas pu être retirée. Retire-la à la main sur la fiche.");
      return { status: 502, body: { success: false, error: 'Retrait de l’échéance impossible', statut } };
    }
    await commenter(id, token, texte);
    return { status: 200, body: { success: true, action: 'arret', statut, commentaire: texte } };
  }

  // 3. Statut actuel
  if (!statut.toLowerCase().includes(STATUT_ENVOYE)) {
    return { status: 200, body: { success: true, action: 'ignore_statut', statut, simulation } };
  }

  // 4. Date de relance
  const envoi = aujourdhuiParis();
  const relance = ajouterJoursOuvres(envoi, DELAI_OUVRES);
  const ms = echeanceClickUp(relance);
  const resume = { envoi: libelleJour(envoi), relance: libelleJour(relance), echeance: ms };
  if (simulation) return { status: 200, body: { success: true, action: 'programmerait', ...resume, simulation } };

  // 5. Écriture vérifiée (même jour à Paris), puis commentaire
  const ecrit = await ecrireEcheance(id, token, ms);
  const relue = ecrit ? await lireTache(id, token) : null;
  const lue = relue?.due_date ? aujourdhuiParis(new Date(Number(relue.due_date))) : null;
  const verif = !!lue && memeJour(lue, relance);
  if (!verif) {
    await commenter(id, token, `⚠️ Relance : l'échéance du ${resume.relance} n'a pas pu être enregistrée. Mets-la à la main sur la fiche.`);
    return { status: 502, body: { success: false, error: 'Écriture de l’échéance impossible', ...resume, lue: lue ? libelleJour(lue) : null } };
  }
  await commenter(id, token, `📩 Devis envoyé le ${resume.envoi}. Première relance prévue le ${resume.relance} (J+${DELAI_OUVRES} ouvrés), dans l'échéance de la fiche.`);
  return { status: 200, body: { success: true, action: 'programme', ...resume, verif } };
}

export async function POST(request: Request) {
  try {
    const taskId = new URL(request.url).searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ success: false, error: 'Aucun taskId reçu' }, { status: 400 });
    const r = await traiter(taskId, false);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur relance devis envoyé :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Preview uniquement : ?taskId=...&simulation=1 (rien n'est écrit) ou ?taskId=...&executer=1 (vrai passage, TEST)
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ error: 'Non disponible' }, { status: 404 });
  }
  try {
    const p = new URL(request.url).searchParams;
    const taskId = p.get('taskId');
    const executer = p.get('executer') === '1';
    const simulation = p.get('simulation') === '1';
    if (!taskId || (!executer && !simulation)) {
      return NextResponse.json({ error: 'Ajoute ?taskId=...&simulation=1 ou &executer=1' }, { status: 400 });
    }
    const r = await traiter(taskId, !executer);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur relance devis envoyé (preview) :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
