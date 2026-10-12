import { NextResponse } from 'next/server';
import { aujourdhuiParis, ajouterJours, prochainOuvre, comparer, echeanceClickUp, libelleJour, type Jour } from '@/lib/joursOuvres';

// Relances impayés (Phase 4, décision Matthieu du 11/10/2026 : aucun email automatique au client).
// Appelé par les automatisations ClickUp de Factures Clients v2 (statut modifié, Date d'échéance modifiée,
// Relances envoyées modifié) : POST ?taskId=...
// Le site ne fait que poser l'échéance de la tâche (rappel interne) et commenter. Un humain relance le client,
// puis augmente « Relances envoyées » de 1, ce qui programme la relance suivante.
// 1. 📄 à émettre : rien. ✅ payée, 🚫 annulée, fermée : séquence arrêtée.
//    ⚖️ en litige (statut ajouté par Matthieu le 12/10, reconnu par le mot « litige ») : rappel retiré, relances
//    suspendues. Retour en 📤 émise ou 💵 partiellement payée : la relance suivante se reprogramme (compteur conservé).
// 2. 📤 émise ou 💵 partiellement payée : il faut une Date d'échéance, sinon commentaire ⚠️.
// 3. Relances envoyées = 0 → rappel à échéance + 3 j ; = 1 → + 10 j ; = 2 → + 15 j, prise en charge back-office ;
//    3 ou plus → plus de rappel, dossier au back-office.
//    Jours calendaires, reportés au jour ouvré suivant si week-end ou férié. Date déjà passée → aujourd'hui (ou ouvré suivant).
// 4. Échéance déjà au bon jour → rien (pas de commentaire en double quand plusieurs automatisations se déclenchent).
// Preview : GET ?taskId=...&simulation=1 (rien n'est écrit) ou &executer=1 (tâches dont le nom commence par « Test »).

const FACTURES_ID = process.env.CLICKUP_FACTURES_LIST_ID || '1200630000003863';
const CHAMP_ECHEANCE = 'ad00c457-c263-46cd-a2bb-83741ab5a240';
const CHAMP_RELANCES = 'e823883c-db1d-4ae1-ad72-1cd8e8064aa3';
const PALIERS = [3, 10, 15];

const memeJour = (a: Jour, b: Jour) => comparer(a, b) === 0;
const sansAccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

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

// ms = null : retire l'échéance de la tâche
async function ecrireEcheance(taskId: string, token: string, ms: number | null): Promise<boolean> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
    method: 'PUT',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(ms === null ? { due_date: null } : { due_date: ms, due_date_time: false }),
  });
  if (!res.ok) console.error(`Écriture de l'échéance refusée (${res.status}) sur ${taskId}`, await res.text().catch(() => ''));
  return res.ok;
}

const champ = (tache: any, id: string) => (tache?.custom_fields || []).find((c: any) => c?.id === id)?.value;

function lireStatut(statut: string): 'a_emettre' | 'emise' | 'partielle' | 'litige' | 'payee' | 'annulee' | 'fermee' | 'autre' {
  const s = sansAccent(statut);
  if (s.includes('litige')) return 'litige';
  if (s.includes('a emettre')) return 'a_emettre';
  if (s.includes('partiel')) return 'partielle';
  if (s.includes('emise')) return 'emise';
  if (s.includes('payee')) return 'payee';
  if (s.includes('annul')) return 'annulee';
  if (s.includes('complete') || s.includes('ferm')) return 'fermee';
  return 'autre';
}

async function traiter(taskId: string, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { status: 500, body: { success: false, error: 'Configuration serveur incomplète' } };

  const tache = await lireTache(taskId, token);
  if (!tache) return { status: 404, body: { success: false, error: 'Facture introuvable' } };
  if (tache.parent) return { status: 200, body: { success: true, action: 'ignore_sous_tache', simulation } };

  const liste = String(tache?.list?.id ?? '');
  if (liste !== String(FACTURES_ID)) {
    return { status: 403, body: { success: false, error: 'Tâche hors de Factures Clients', liste } };
  }
  // Preview : vrai passage seulement sur une tâche « Test… »
  const nom = String(tache.name || '');
  if (process.env.VERCEL_ENV !== 'production' && !simulation && !/^test/i.test(nom.trim())) {
    return { status: 403, body: { success: false, error: 'En preview : exécution seulement sur une facture dont le nom commence par « Test »' } };
  }
  const id = String(tache.id);

  // 1. Statut
  const statut = String(tache?.status?.status || '');
  const etat = lireStatut(statut);
  if (etat === 'a_emettre' || etat === 'autre') {
    return { status: 200, body: { success: true, action: 'ignore_statut', statut, simulation } };
  }
  if (etat === 'payee' || etat === 'annulee' || etat === 'fermee') {
    const texte = etat === 'annulee' ? '🚫 Facture annulée : relances arrêtées.' : '✅ Facture payée : relances arrêtées.';
    if (!simulation) await commenter(id, token, texte);
    return { status: 200, body: { success: true, action: 'arret', statut, commentaire: texte, simulation } };
  }
  if (etat === 'litige') {
    // Déjà suspendue (plus d'échéance) : rien, pour ne pas commenter en double
    if (!tache.due_date) return { status: 200, body: { success: true, action: 'deja_suspendu', statut, simulation } };
    const texte = '⚖️ Facture en litige : relances suspendues, rappel retiré. Quand le litige est réglé, repasse la facture en 📤 émise (ou 💵 partiellement payée) : la relance suivante se reprogramme toute seule.';
    if (simulation) return { status: 200, body: { success: true, action: 'suspendrait', statut, commentaire: texte, simulation } };
    if (!(await ecrireEcheance(id, token, null))) {
      await commenter(id, token, '⚠️ Facture en litige : le rappel n\'a pas pu être retiré. Retire l\'échéance à la main pour suspendre les relances.');
      return { status: 502, body: { success: false, error: 'Retrait de l’échéance impossible', statut } };
    }
    await commenter(id, token, texte);
    return { status: 200, body: { success: true, action: 'suspendu', statut, commentaire: texte } };
  }

  // 2. Date d'échéance obligatoire
  const brute = champ(tache, CHAMP_ECHEANCE);
  if (!brute) {
    const texte = "⚠️ Facture émise sans Date d'échéance : remplis-la pour programmer les relances.";
    if (!simulation) await commenter(id, token, texte);
    return { status: 200, body: { success: true, action: 'echeance_manquante', statut, commentaire: texte, simulation } };
  }
  const echeance = aujourdhuiParis(new Date(Number(brute)));
  const n = Math.max(0, Math.floor(Number(champ(tache, CHAMP_RELANCES) ?? 0) || 0));

  // 3. Fin de séquence
  if (n >= PALIERS.length) {
    const texte = `🛑 ${n} relances faites : dossier au back-office. Plus de rappel automatique sur cette facture.`;
    if (!simulation) await commenter(id, token, texte);
    return { status: 200, body: { success: true, action: 'fin_sequence', relances: n, commentaire: texte, simulation } };
  }

  const delai = PALIERS[n];
  const aujourdhui = aujourdhuiParis();
  let cible = prochainOuvre(ajouterJours(echeance, delai));
  const enRetard = comparer(cible, aujourdhui) < 0;
  if (enRetard) cible = prochainOuvre(aujourdhui);
  const ms = echeanceClickUp(cible);

  const quand = `le ${libelleJour(cible)}${enRetard ? ' (date déjà passée, donc dès que possible)' : ''}`;
  const suite = n + 1;
  const textes = [
    `💶 Facture émise, échéance le ${libelleJour(echeance)}. Relance 1 ${quand} (échéance + 3 j), dans l'échéance de la tâche. Une fois le client relancé, passe Relances envoyées à 1.`,
    `🔁 Relance 1 notée. Relance 2 ${quand} (échéance + 10 j). Une fois faite, passe Relances envoyées à 2.`,
    `🔁 Relance 2 notée. Dernière relance ${quand} (échéance + 15 j) : prise en charge back-office (appel, puis mise en demeure si besoin). Une fois faite, passe Relances envoyées à 3.`,
  ];
  const texte = textes[n];
  const resume = { statut, echeanceFacture: libelleJour(echeance), relances: n, prochaine: suite, rappel: libelleJour(cible), enRetard, echeance: ms };

  // 4. Déjà programmé ?
  const actuelle = tache.due_date ? aujourdhuiParis(new Date(Number(tache.due_date))) : null;
  if (actuelle && memeJour(actuelle, cible)) {
    return { status: 200, body: { success: true, action: 'deja_programme', ...resume, simulation } };
  }
  if (simulation) return { status: 200, body: { success: true, action: 'programmerait', ...resume, commentaire: texte, simulation } };

  const ecrit = await ecrireEcheance(id, token, ms);
  const relue = ecrit ? await lireTache(id, token) : null;
  const lue = relue?.due_date ? aujourdhuiParis(new Date(Number(relue.due_date))) : null;
  const verif = !!lue && memeJour(lue, cible);
  if (!verif) {
    await commenter(id, token, `⚠️ Relance impayé : le rappel du ${libelleJour(cible)} n'a pas pu être enregistré. Mets l'échéance à la main.`);
    return { status: 502, body: { success: false, error: 'Écriture de l’échéance impossible', ...resume } };
  }
  await commenter(id, token, texte);
  return { status: 200, body: { success: true, action: 'programme', ...resume, commentaire: texte, verif } };
}

export async function POST(request: Request) {
  try {
    const taskId = new URL(request.url).searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ success: false, error: 'Aucun taskId reçu' }, { status: 400 });
    const r = await traiter(taskId, false);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur relance impayé :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Preview uniquement : ?taskId=...&simulation=1 (rien n'est écrit) ou ?taskId=...&executer=1 (vrai passage, tâche Test)
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
    console.error('Erreur relance impayé (preview) :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
