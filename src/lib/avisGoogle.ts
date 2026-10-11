// Avis Google (Phase 4, validé par Matthieu le 11/10/2026). Rappels internes uniquement : aucun email n'est envoyé
// au client par le site. Les brouillons d'email sont rédigés par Brain à partir des infos du commentaire de rappel.
// - Le jour de la mise en service, le poseur demande l'avis sur place avec le QR code (chargeo.fr/interne/avis).
// - Au passage au Parc : commentaire « 🔵 Demande d'avis faite sur place » et sous-tâche ⭐ assignée au 👷 Technicien,
//   début = jour de réception, échéance = relance 1 par email à J+7 s'il n'y a pas d'avis.
// - 🔁 Relancé : dernier rappel à J+14 après la demande, puis fin. 🔵 Demande envoyée : nouvelle demande manuelle.
// - ✅ Avis reçu / 🚫 Refus du client : fin. Jours calendaires. Une seule séquence par chantier, jamais par borne.
// - Prime collaborateur (à définir) : 🏅 Cité dans l'avis, rempli à la vérification, quelle que soit la note.
import { aujourdhuiParis, ajouterJours, echeanceClickUp, libelleJour, type Jour } from '@/lib/joursOuvres';

export const LIEN_AVIS = process.env.AVIS_GOOGLE_URL || 'https://g.page/r/CVX9CIKSR7ddEBM/review';
export const CHAMP_AVIS = '2bd6f4cc-27c7-491b-98a1-075296d4a64a'; // ⭐ Avis Google (ex « Avis & Récompense »)
export const CHAMP_TECHNICIEN = 'b400c953-ae06-4336-b471-405296f9ff1c';
export const NOM_SOUS_TACHE = '⭐ Avis Google : relancer par email si pas d\'avis';

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

// Bloc d'informations pour que Brain rédige le brouillon d'email personnalisé
export function infosBrouillon(tache: any, etape: string, noms: string[]): string {
  return [
    `✍️ Pour le brouillon (demande à Brain « rédige l'email d'avis ») : ${etape}.`,
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
    markdown_description: infosBrouillon(tache, 'relance 1, une semaine après la mise en service', pose.noms),
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
