import { NextResponse } from 'next/server';
import { aujourdhuiParis, ajouterJours, comparer, echeanceClickUp, libelleJour, type Jour } from '@/lib/joursOuvres';
import { CHAMP_AVIS, NOM_SOUS_TACHE, clickup, creerRappelAvis, infosBrouillon, poseurs, sousTacheAvis } from '@/lib/avisGoogle';

// Suivi des avis Google (Phase 4, validé par Matthieu le 11/10/2026). Rappels internes, aucun email au client.
// Appelé par l'automatisation de Parc Installé « ⭐ Avis Google modifié » : POST ?taskId=<fiche Parc>
// - 🔵 Demande envoyée : la sous-tâche ⭐ prend la date de demande et le rappel 1 à J+7.
// - 🔁 Relancé : 1re fois = dernier rappel à J+14 après la demande ; 2e fois = fin de séquence. Le menu est vidé
//   après chaque relance notée, pour pouvoir noter la suivante (comme pour les devis).
// - ✅ Avis reçu / 🚫 Refus du client : fin de séquence (sous-tâche renommée, échéance retirée).
// Les relances sont comptées dans les commentaires « 🔁 Rappel avis n° » depuis le dernier « 🔵 Demande d'avis ».
// Preview : GET ?taskId=...&simulation=1 (rien n'est écrit) ou &executer=1 (fiches « Test » uniquement).

const PARC_ID = '901520038290';
const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

async function lireTache(id: string, token: string): Promise<any | null> {
  const res = await clickup(token, `/task/${encodeURIComponent(id)}?custom_task_ids=true&include_subtasks=true`);
  return res.ok ? res.json() : null;
}

async function commenter(token: string, id: string, texte: string, notifier = false) {
  const res = await clickup(token, `/task/${id}/comment`, 'POST', { comment_text: texte, notify_all: notifier });
  if (!res.ok) console.error(`Commentaire refusé (${res.status}) sur ${id}`);
}

function valeurAvis(tache: any): string {
  const f = (Array.isArray(tache?.custom_fields) ? tache.custom_fields : []).find((c: any) => c.id === CHAMP_AVIS);
  if (!f || f.value === undefined || f.value === null || f.value === '') return '';
  const o = (f.type_config?.options || []).find((x: any) => x.orderindex === Number(f.value) || x.id === f.value);
  return normal(o?.name || '');
}

async function compterRappels(id: string, token: string): Promise<number | null> {
  const res = await clickup(token, `/task/${id}/comment`);
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  let n = 0;
  for (const c of Array.isArray(json?.comments) ? json.comments : []) {
    const t = String(c?.comment_text || '').trim();
    if (t.startsWith('🔵 Demande d')) break;
    if (t.startsWith('🔁 Rappel avis n°')) n++;
  }
  return n;
}

const jourDe = (ms: any): Jour | null => (ms ? aujourdhuiParis(new Date(Number(ms))) : null);

async function traiter(taskId: string, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { status: 500, body: { success: false, error: 'Configuration serveur incomplète' } };
  const tache = await lireTache(taskId, token);
  if (!tache) return { status: 404, body: { success: false, error: 'Fiche introuvable' } };
  if (tache.parent) return { status: 200, body: { success: true, action: 'ignore_sous_tache', simulation } };
  if (String(tache?.list?.id ?? '') !== PARC_ID) return { status: 200, body: { success: true, action: 'ignore_hors_parc', simulation } };
  if (process.env.VERCEL_ENV !== 'production' && !simulation && !normal(tache.name).startsWith('test')) {
    return { status: 403, body: { success: false, error: 'En preview : exécution sur une fiche « Test » uniquement, simulation partout' } };
  }

  const id = String(tache.id);
  const v = valeurAvis(tache);
  const pose = poseurs(tache);
  const aujourdhui = aujourdhuiParis();
  let st = sousTacheAvis(tache);
  const terminee = !!st && normal(st.name).includes('termine');
  const base = { valeur: v || 'vide', sousTache: st ? st.name : null, poseurs: pose.noms, simulation };

  if (!v || v.includes('a faire')) return { status: 200, body: { success: true, action: 'ignore_vide', ...base } };
  const estFin = v.includes('recu') || v.includes('refus');
  if (terminee && !estFin) return { status: 200, body: { success: true, action: 'ignore_sequence_terminee', ...base } };

  type Plan = { action: string; commentaire: string; debut?: Jour; echeance?: Jour; fin?: string; vider?: boolean };
  let plan: Plan;

  if (v.includes('demande')) {
    const r1 = ajouterJours(aujourdhui, 7);
    plan = {
      action: 'demande_notee', debut: aujourdhui, echeance: r1,
      commentaire: `🔵 Demande d'avis envoyée le ${libelleJour(aujourdhui)}. Rappel 1 le ${libelleJour(r1)} (J+7).\n${infosBrouillon(tache, 'rappel 1, une semaine après la demande', pose.noms)}`,
    };
  } else if (v.includes('relance')) {
    const deja = await compterRappels(id, token);
    if (deja === null) return { status: 502, body: { success: false, error: 'Lecture des commentaires impossible' } };
    const n = deja + 1;
    if (n >= 2) {
      plan = { action: 'sequence_terminee', fin: 'sans réponse après 2 rappels', vider: true,
        commentaire: `🔁 Rappel avis n°${n} noté le ${libelleJour(aujourdhui)}. Séquence terminée après 2 rappels : plus aucune relance pour ce chantier.` };
    } else {
      const debut = jourDe(st?.start_date) || aujourdhui;
      let r2 = ajouterJours(debut, 14);
      if (comparer(r2, aujourdhui) <= 0) r2 = ajouterJours(aujourdhui, 1);
      plan = { action: 'rappel_note', echeance: r2, vider: true,
        commentaire: `🔁 Rappel avis n°${n} noté le ${libelleJour(aujourdhui)}. Dernier rappel le ${libelleJour(r2)} (J+14 après la demande).\n${infosBrouillon(tache, 'dernier rappel, deux semaines après la demande', pose.noms)}` };
    }
  } else if (v.includes('recu')) {
    plan = { action: 'avis_recu', fin: 'avis reçu',
      commentaire: '✅ Avis Google reçu : séquence terminée. Remplis 🏅 Cité dans l\'avis avec le ou les poseurs nommés dans l\'avis (quelle que soit la note).' };
  } else if (v.includes('refus')) {
    plan = { action: 'refus_client', fin: 'refus du client', commentaire: '🚫 Refus du client noté : plus aucune demande d\'avis pour ce chantier.' };
  } else {
    return { status: 200, body: { success: true, action: 'ignore_valeur_inconnue', ...base } };
  }

  const resume = { action: plan.action, echeance: plan.echeance ? libelleJour(plan.echeance) : null, commentaire: plan.commentaire };
  if (simulation) return { status: 200, body: { success: true, ...base, ...resume } };

  // Sous-tâche absente (chantier passé au Parc avant le système) : on la crée
  if (!st) {
    const c = await creerRappelAvis(tache, token, PARC_ID, pose);
    if (!c.ok || !c.id) {
      await commenter(token, id, '⚠️ Avis Google : je n\'ai pas pu créer la sous-tâche ⭐. Note le rappel à la main.', true);
      return { status: 502, body: { success: false, error: 'Création de la sous-tâche impossible', ...base } };
    }
    st = { id: c.id, name: NOM_SOUS_TACHE };
  }

  const maj: any = {};
  if (plan.debut) { maj.start_date = echeanceClickUp(plan.debut); maj.start_date_time = false; }
  if (plan.echeance) { maj.due_date = echeanceClickUp(plan.echeance); maj.due_date_time = false; }
  if (plan.fin) { maj.due_date = null; maj.name = `${NOM_SOUS_TACHE} : terminé (${plan.fin})`; }
  const ecrit = await clickup(token, `/task/${st.id}`, 'PUT', maj);
  if (!ecrit.ok) {
    await commenter(token, id, `⚠️ Avis Google : la sous-tâche ⭐ n'a pas pu être mise à jour. ${plan.echeance ? `Note le rappel du ${libelleJour(plan.echeance)} à la main.` : ''}`, true);
    return { status: 502, body: { success: false, error: 'Écriture de la sous-tâche impossible', ...base, ...resume } };
  }
  await commenter(token, id, plan.commentaire);
  let menuVide: boolean | undefined;
  if (plan.vider) menuVide = (await clickup(token, `/task/${id}/field/${CHAMP_AVIS}`, 'DELETE')).ok;
  return { status: 200, body: { success: true, ...base, ...resume, menuVide } };
}

export async function POST(request: Request) {
  try {
    const taskId = new URL(request.url).searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ success: false, error: 'Aucun taskId reçu' }, { status: 400 });
    const r = await traiter(taskId, false);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur suivi avis :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Preview uniquement : ?taskId=...&simulation=1 ou &executer=1
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === 'production') return NextResponse.json({ error: 'Non disponible' }, { status: 404 });
  try {
    const p = new URL(request.url).searchParams;
    const taskId = p.get('taskId');
    const executer = p.get('executer') === '1';
    const simulation = p.get('simulation') === '1';
    if (!taskId || (!executer && !simulation)) return NextResponse.json({ error: 'Ajoute ?taskId=...&simulation=1 ou &executer=1' }, { status: 400 });
    const r = await traiter(taskId, !executer);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur suivi avis (preview) :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
