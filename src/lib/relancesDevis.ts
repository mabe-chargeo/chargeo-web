import { getQualificationListId } from '@/lib/listesClickUp';
import { lister } from '@/lib/rappelVeille';
import { enRelance, estRelance, mailAFaire, poserMailAFaire } from '@/lib/mailsAFaire';
import { aujourdhuiParis, ajouterJoursOuvres, comparer, echeanceClickUp, libelleJour, type Jour } from '@/lib/joursOuvres';

// Relances de devis par mail (Phase 9, lot 4, accord de Mathieu du 06/11/2026 à 22 h 20, bouton « Oui, code-le comme
// ça ») :
// - à la date de relance (échéance de la fiche, posée à J+3 ouvrés au passage en 📩 devis envoyé puis à chaque
//   relance, ou après une AG ou une date convenue), le contrôle quotidien pose « ✉️ Mail à envoyer » = devis-relance,
//   ou devis-derniere-relance à la 3e tentative ; jamais après 3 tentatives (relances suspendues) ;
// - le mail parti depuis l'appli compte tout seul comme la relance (noterRelanceParMail) : même règle que
//   « Relancé, pas de réponse » dans 🔁 Suivi relance (src/app/api/relances/suivi/route.ts), prochaine relance à J+3
//   ouvrés, suspension à la 3e ;
// - une relance en attente sur une fiche qui n'est plus en devis envoyé ni en négociation (gagnée, perdue) est
//   effacée au contrôle quotidien.
// 06/11/2026, 22 h 42 (accord de Mathieu) : devis révisé envoyé par mail = relances remises à zéro, comme après un
// premier envoi (relancesApresRevision).
// Tentatives = commentaires « 🔁 Relance n° » depuis le dernier envoi (📩) ou la dernière pause (📅), comme avant.
// Rien ne part tout seul : le commercial écrit la phrase utile et clique « Envoyer ».

export const DELAI_RELANCE_OUVRES = 3;
export const MAX_TENTATIVES = 3;
const API = 'https://api.clickup.com/api/v2';

async function lireTache(token: string, id: string): Promise<any | null> {
  const r = await fetch(`${API}/task/${encodeURIComponent(id)}`, { headers: { Authorization: token }, cache: 'no-store' });
  return r.ok ? r.json().catch(() => null) : null;
}

async function commenter(token: string, id: string, texte: string): Promise<boolean> {
  const r = await fetch(`${API}/task/${encodeURIComponent(id)}/comment`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment_text: texte, notify_all: false }),
  });
  return r.ok;
}

// Tentatives depuis le dernier envoi ou la dernière pause (les commentaires arrivent du plus récent au plus ancien)
export async function compterTentatives(taskId: string, token: string): Promise<number | null> {
  const res = await fetch(`${API}/task/${encodeURIComponent(taskId)}/comment`, { headers: { Authorization: token }, cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  const liste: any[] = Array.isArray(json?.comments) ? json.comments : [];
  let n = 0;
  for (const c of liste) {
    const t = String(c?.comment_text || '').trim();
    if (t.startsWith('📩') || t.startsWith('📅')) break;
    if (t.includes('🔁 Relance n°')) n++;
  }
  return n;
}

// Texte à poser selon les tentatives déjà notées : la 3e est la dernière relance
export const texteRelance = (deja: number) => (deja >= MAX_TENTATIVES - 1 ? 'devis-derniere-relance' : 'devis-relance');

// Échéance de la fiche, vérifiée par relecture (même jour à Paris)
async function ecrireEcheance(token: string, id: string, jour: Jour): Promise<boolean> {
  const r = await fetch(`${API}/task/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ due_date: echeanceClickUp(jour), due_date_time: false }),
    cache: 'no-store',
  });
  if (!r.ok) return false;
  const relue = await lireTache(token, id);
  return !!relue?.due_date && comparer(aujourdhuiParis(new Date(Number(relue.due_date))), jour) === 0;
}

// Relance faite par mail depuis l'appli : tentative notée, prochaine relance programmée (ou suspension à la 3e)
export async function noterRelanceParMail(token: string, t: any, nomTexte: string): Promise<{ tentative: number; prochaine: string; suspendu: boolean; probleme?: string }> {
  const id = String(t?.id || '');
  const deja = await compterTentatives(id, token);
  if (deja === null) return { tentative: 0, prochaine: '', suspendu: false, probleme: 'commentaires de la fiche illisibles' };
  const n = deja + 1;
  const aujourdhui = aujourdhuiParis();
  if (n >= MAX_TENTATIVES) {
    await commenter(token, id, `🔁 Relance n°${n} faite par mail le ${libelleJour(aujourdhui)} (« ${nomTexte} »). ⏸️ ${MAX_TENTATIVES} relances sans réponse : les relances automatiques sont suspendues. À toi de choisir : poursuivre, reprogrammer (« Date convenue ») ou mettre en pause. La fiche n'est pas classée en perdu.`);
    return { tentative: n, prochaine: '', suspendu: true };
  }
  const prochaine = ajouterJoursOuvres(aujourdhui, DELAI_RELANCE_OUVRES);
  if (!(await ecrireEcheance(token, id, prochaine))) {
    await commenter(token, id, `🔁 Relance n°${n} faite par mail le ${libelleJour(aujourdhui)} (« ${nomTexte} »). ⚠️ La prochaine relance du ${libelleJour(prochaine)} n'a pas pu être enregistrée : mets l'échéance à la main.`);
    return { tentative: n, prochaine: libelleJour(prochaine), suspendu: false, probleme: 'prochaine relance non enregistrée' };
  }
  await commenter(token, id, `🔁 Relance n°${n} faite par mail le ${libelleJour(aujourdhui)} (« ${nomTexte} »). Prochaine relance le ${libelleJour(prochaine)} (J+${DELAI_RELANCE_OUVRES} ouvrés).`);
  return { tentative: n, prochaine: libelleJour(prochaine), suspendu: false };
}

// Devis révisé envoyé par mail : relances remises à zéro (commentaire 📩, comme un premier envoi), première à J+3 ouvrés
export async function relancesApresRevision(token: string, t: any, auteur: string): Promise<{ prochaine: string; probleme?: string }> {
  const id = String(t?.id || '');
  const aujourdhui = aujourdhuiParis();
  const prochaine = ajouterJoursOuvres(aujourdhui, DELAI_RELANCE_OUVRES);
  const ok = await ecrireEcheance(token, id, prochaine);
  await commenter(
    token,
    id,
    `📩 Devis révisé envoyé par mail le ${libelleJour(aujourdhui)} par ${auteur} : relances remises à zéro.${ok ? ` Première relance le ${libelleJour(prochaine)} (J+${DELAI_RELANCE_OUVRES} ouvrés).` : ` ⚠️ La relance du ${libelleJour(prochaine)} n'a pas pu être enregistrée : mets l'échéance à la main.`}`,
  );
  return { prochaine: libelleJour(prochaine), probleme: ok ? undefined : 'première relance non enregistrée' };
}

// Contrôle quotidien : relances à envoyer aujourd'hui, et relances en attente devenues inutiles. Simulation : rien
// n'est écrit.
export async function poserRelancesDevis(simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY as string;
  const listId = getQualificationListId();
  if (!token || !listId) return { success: false, error: 'configuration incomplète' };
  const taches = await lister(token, String(listId));
  const aujourdhui = aujourdhuiParis();
  const poses: string[] = [];
  const refus: string[] = [];
  const effaces: string[] = [];
  for (const t of taches) {
    const nom = String(t?.name || t?.id || '');
    const attendu = mailAFaire(t);
    const statut = t?.status?.status;
    if (estRelance(attendu) && !enRelance(statut)) {
      if (!simulation) await poserMailAFaire(token, t, '').catch(() => false);
      effaces.push(nom);
      continue;
    }
    if (attendu || !enRelance(statut) || !t?.due_date) continue;
    if (comparer(aujourdhuiParis(new Date(Number(t.due_date))), aujourdhui) > 0) continue;
    const deja = await compterTentatives(String(t.id), token);
    if (deja === null || deja >= MAX_TENTATIVES) continue;
    const cle = texteRelance(deja);
    if (simulation) { poses.push(`${nom} (${cle})`); continue; }
    const ok = await poserMailAFaire(token, t, cle).catch(() => false);
    (ok ? poses : refus).push(`${nom} (${cle})`);
  }
  return { success: true, simulation, poses, refus, effaces };
}
