// Avis Google (Phase 4, validé par Matthieu le 11/10/2026).
// 01/11/2026 (Phase 8, étape 4, D12) : le rappel renvoyait au modèle d'e-mail « Avis Google » de l'onglet Email.
// 06/11/2026 (Phase 9, lot 4, accord de Mathieu à 23 h 13 et 23 h 25) : le mail part depuis l'appli. Le jour du rappel
// (J+7, puis J+14), la fiche du Parc affiche le mail « Avis Google » en tête, déjà rempli (date de mise en service,
// prénom du poseur, lien) : la personne ajoute un détail du chantier et l'envoie. Le mail parti compte comme le rappel
// (noterRappelAvis) : rappel 1 → dernier rappel à J+14 après la demande ; rappel 2 → fin de séquence. Il ne bloque rien.
// Texte : src/lib/modelesMails.ts (clé avis-google). Rien ne part tout seul.
// - Le jour de la mise en service, le poseur demande l'avis sur place avec le QR code (écran de réception,
//   src/components/ui/AvisGoogle.tsx, vers chargeo.fr/avis).
// - Au passage au Parc : commentaire « 🔵 Demande d'avis faite sur place » et sous-tâche ⭐ assignée au 👷 Technicien,
//   début = jour de réception, échéance = rappel 1 à J+7 s'il n'y a pas d'avis.
// - 🔁 Relancé (menu ⭐ Avis Google) : même comptage que le mail parti, pour un rappel fait hors de l'appli.
// - ✅ Avis reçu / 🚫 Refus du client : fin. Jours calendaires. Une seule séquence par chantier, jamais par borne.
// - Prime collaborateur (à définir) : 🏅 Cité dans l'avis, rempli à la vérification, quelle que soit la note.
import { aujourdhuiParis, ajouterJours, comparer, echeanceClickUp, libelleJour, type Jour } from '@/lib/joursOuvres';

export const LIEN_AVIS = process.env.AVIS_GOOGLE_URL || 'https://g.page/r/CVX9CIKSR7ddEBM/review';
export const CHAMP_AVIS = '2bd6f4cc-27c7-491b-98a1-075296d4a64a'; // ⭐ Avis Google (ex « Avis & Récompense »)
export const CHAMP_TECHNICIEN = 'b400c953-ae06-4336-b471-405296f9ff1c';
export const PARC_ID = '901520038290';
export const NOM_SOUS_TACHE = '⭐ Avis Google : relancer par email si pas d\'avis';
export const NOM_TERMINE = '⭐ Avis Google : terminé';
// Clé du mail dans src/lib/modelesMails.ts
export const CLE_MAIL_AVIS = 'avis-google';
export const RAPPELS_MAX = 2;

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export async function clickup(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

function champ(tache: any, id: string): any {
  return (Array.isArray(tache?.custom_fields) ? tache.custom_fields : []).find((c: any) => c.id === id);
}

// Poseurs du chantier (👷 Technicien), sinon les personnes assignées
export function poseurs(tache: any): { ids: number[]; noms: string[] } {
  const v = champ(tache, CHAMP_TECHNICIEN)?.value;
  const liste: any[] = Array.isArray(v) && v.length ? v : Array.isArray(tache?.assignees) ? tache.assignees : [];
  return {
    ids: liste.map((u) => Number(u?.id)).filter((n) => Number.isFinite(n)),
    noms: liste.map((u) => String(u?.username || u?.email || '')).filter(Boolean),
  };
}

export function sousTacheAvis(tache: any): any | undefined {
  return (Array.isArray(tache?.subtasks) ? tache.subtasks : []).find((s: any) => normal(s?.name).includes('avis google'));
}
const ouverte = (st: any) => !!st && !normal(st?.name).includes('termine');

// Valeur du menu ⭐ Avis Google, sans accents ni emoji ('' si vide)
export function valeurAvis(tache: any): string {
  const f = champ(tache, CHAMP_AVIS);
  if (!f || f.value === undefined || f.value === null || f.value === '') return '';
  const o = (f.type_config?.options || []).find((x: any) => x.orderindex === Number(f.value) || x.id === f.value);
  return normal(o?.name || '');
}

// Rappels déjà faits : commentaires « 🔁 Rappel avis n° » depuis la dernière « 🔵 Demande d'avis » (null = illisible)
export async function compterRappels(id: string, token: string): Promise<number | null> {
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

const jourDe = (ms: unknown): Jour | null => (ms ? aujourdhuiParis(new Date(Number(ms))) : null);
// Date de mise en service : champ de la fiche du Parc qui la porte, sinon début de la sous-tâche (jour de réception)
function miseEnServiceDe(tache: any, st: any): Jour | null {
  const f = (Array.isArray(tache?.custom_fields) ? tache.custom_fields : []).find((c: any) => c?.type === 'date' && normal(c?.name).includes('mise en service'));
  return jourDe(f?.value) || jourDe(st?.start_date);
}

// Mail « Avis Google » à envoyer aujourd'hui sur une fiche du Parc (lue avec ses sous-tâches) : sous-tâche ⭐ ouverte
// dont l'échéance est arrivée, ni avis reçu ni refus, moins de 2 rappels. null sinon.
export async function avisAEnvoyer(tache: any, token: string): Promise<{ rappel: number; miseEnService: string; poseur: string } | null> {
  if (!tache || tache.parent || String(tache?.list?.id ?? '') !== PARC_ID) return null;
  const v = valeurAvis(tache);
  if (v.includes('recu') || v.includes('refus')) return null;
  const st = sousTacheAvis(tache);
  const echeance = jourDe(st?.due_date);
  if (!ouverte(st) || !echeance || comparer(echeance, aujourdhuiParis()) > 0) return null;
  const deja = await compterRappels(String(tache.id), token);
  if (deja === null || deja >= RAPPELS_MAX) return null;
  const mes = miseEnServiceDe(tache, st);
  const prenom = (poseurs(tache).noms[0] || '').trim().split(/\s+/)[0] || '';
  return { rappel: deja + 1, miseEnService: mes ? libelleJour(mes) : '', poseur: prenom };
}

// Rappel fait depuis l'appli (mail parti, ou client prévenu par téléphone faute d'adresse) : compté comme 🔁 Relancé.
// Rappel 1 : dernier rappel à J+14 après la demande (au moins une semaine après celui-ci) ; rappel 2 : séquence terminée.
export async function noterRappelAvis(token: string, tache: any, par: 'mail' | 'telephone'): Promise<{ n: number; prochain: string; fin: boolean; probleme?: string }> {
  const id = String(tache?.id || '');
  const st = sousTacheAvis(tache);
  if (!st?.id) return { n: 0, prochain: '', fin: false, probleme: 'sous-tâche ⭐ Avis Google introuvable' };
  const deja = await compterRappels(id, token);
  if (deja === null) return { n: 0, prochain: '', fin: false, probleme: 'commentaires de la fiche illisibles' };
  const n = deja + 1;
  const aujourdhui = aujourdhuiParis();
  const comment = par === 'telephone' ? 'par téléphone' : 'par mail depuis l’appli';
  const commenter = (texte: string) => clickup(token, `/task/${id}/comment`, 'POST', { comment_text: texte, notify_all: false });
  if (n >= RAPPELS_MAX) {
    const ok = (await clickup(token, `/task/${st.id}`, 'PUT', { due_date: null, name: `${NOM_TERMINE} (sans réponse après ${RAPPELS_MAX} rappels)` })).ok;
    await commenter(`🔁 Rappel avis n°${n} fait ${comment} le ${libelleJour(aujourdhui)}. Séquence terminée après ${RAPPELS_MAX} rappels : plus aucune relance pour ce chantier.`);
    return { n, prochain: '', fin: true, probleme: ok ? undefined : 'la sous-tâche ⭐ n’a pas pu être close' };
  }
  const debut = jourDe(st.start_date) || aujourdhui;
  let r2 = ajouterJours(debut, 14);
  const auPlusTot = ajouterJours(aujourdhui, 7);
  if (comparer(r2, auPlusTot) < 0) r2 = auPlusTot;
  const ok = (await clickup(token, `/task/${st.id}`, 'PUT', { due_date: echeanceClickUp(r2), due_date_time: false })).ok;
  await commenter(`🔁 Rappel avis n°${n} fait ${comment} le ${libelleJour(aujourdhui)}. ${ok ? `Dernier rappel le ${libelleJour(r2)}, s'il n'y a toujours pas d'avis.` : `⚠️ Le dernier rappel du ${libelleJour(r2)} n'a pas pu être enregistré : mets l'échéance de la sous-tâche ⭐ à la main.`}`);
  return { n, prochain: libelleJour(r2), fin: false, probleme: ok ? undefined : 'dernier rappel non enregistré' };
}

// Bloc d'informations du rappel interne (sous-tâche ⭐ et commentaires)
export function infosBrouillon(tache: any, etape: string, noms: string[]): string {
  return [
    `✉️ Mail à envoyer depuis l'appli : ${etape}. Le jour du rappel, le mail « Avis Google » s'affiche en tête de la fiche, déjà rempli : ajoute un détail du chantier, puis envoie.`,
    `Client : ${tache?.name || ''}. Poseur : ${noms.join(', ') || 'à préciser'}. L'avis a déjà été demandé sur place le jour de la mise en service.`,
    `Lien direct vers l'avis : ${LIEN_AVIS}`,
    'Règle : demande neutre, sans cadeau ni contrepartie, à tous les clients. Le client peut citer le prénom du poseur s\'il le souhaite.',
  ].join('\n');
}

// Création de la sous-tâche (tâche mère déjà dans Parc Installé). surPlace : la demande vient d'être faite
// sur place (passage au Parc) et le commentaire 🔵 est posé sur la fiche, point de départ du comptage des relances.
export async function creerRappelAvis(
  tache: any, token: string, parcId: string, pose: { ids: number[]; noms: string[] }, surPlace = false,
): Promise<{ ok: boolean; deja?: boolean; echeance?: Jour; id?: string }> {
  if (sousTacheAvis(tache)) return { ok: true, deja: true };
  const debut = aujourdhuiParis();
  const echeance = ajouterJours(debut, 7);
  const res = await clickup(token, `/list/${parcId}/task`, 'POST', {
    name: NOM_SOUS_TACHE,
    parent: String(tache.id),
    assignees: pose.ids,
    start_date: echeanceClickUp(debut),
    start_date_time: false,
    due_date: echeanceClickUp(echeance),
    due_date_time: false,
    markdown_description: infosBrouillon(tache, 'rappel 1, une semaine après la mise en service', pose.noms),
  });
  if (!res.ok) return { ok: false };
  const json = await res.json().catch(() => ({}));
  if (surPlace) {
    const qui = pose.noms.length ? ` par ${pose.noms.join(', ')}` : '';
    await clickup(token, `/task/${tache.id}/comment`, 'POST', {
      comment_text: `🔵 Demande d'avis faite sur place le ${libelleJour(debut)}${qui} (QR code). Sans avis, relance 1 par email le ${libelleJour(echeance)} (J+7).`,
      notify_all: false,
    });
  }
  return { ok: true, echeance, id: String(json?.id || '') };
}

export { libelleJour };
