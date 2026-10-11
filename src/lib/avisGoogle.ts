// Avis Google (Phase 4, validé par Matthieu le 11/10/2026). Rappels internes uniquement : aucun email n'est envoyé
// au client par le site. Les brouillons d'email sont rédigés par Brain à partir des infos du commentaire de rappel.
// - Au passage au Parc : sous-tâche « ⭐ Demander un avis Google » assignée au 👷 Technicien, à faire le lendemain.
// - 🔵 Demande envoyée : rappel 1 à J+7 après la demande. 🔁 Relancé : rappel 2 (dernier) à J+14, puis fin.
// - ✅ Avis reçu / 🚫 Refus du client : fin. Jours calendaires. Une seule séquence par chantier, jamais par borne.
// - Prime collaborateur (à définir) : 🏅 Cité dans l'avis, rempli à la vérification, quelle que soit la note.
import { aujourdhuiParis, ajouterJours, echeanceClickUp, libelleJour, type Jour } from '@/lib/joursOuvres';

export const LIEN_AVIS = process.env.AVIS_GOOGLE_URL || 'https://g.page/r/CVX9CIKSR7ddEBM/review';
export const CHAMP_AVIS = '2bd6f4cc-27c7-491b-98a1-075296d4a64a'; // ⭐ Avis Google (ex « Avis & Récompense »)
export const CHAMP_TECHNICIEN = 'b400c953-ae06-4336-b471-405296f9ff1c';
export const CHAMP_CITE = 'cite dans l avis'; // 🏅 Cité dans l'avis (Parc Installé), lu par nom
export const NOM_SOUS_TACHE = '⭐ Demander un avis Google';

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
    `Client : ${tache?.name || ''}. Poseur : ${noms.join(', ') || 'à préciser'}.`,
    `Lien direct vers l'avis : ${LIEN_AVIS}`,
    'Règle : demande neutre, sans cadeau ni contrepartie, à tous les clients. Le client peut citer le prénom du poseur s\'il le souhaite.',
  ].join('\n');
}

// Création de la sous-tâche au passage au Parc. La tâche mère doit déjà être dans Parc Installé.
export async function creerRappelAvis(
  tache: any, token: string, parcId: string, pose: { ids: number[]; noms: string[] },
): Promise<{ ok: boolean; deja?: boolean; echeance?: Jour; id?: string }> {
  if (sousTacheAvis(tache)) return { ok: true, deja: true };
  const echeance = ajouterJours(aujourdhuiParis(), 1);
  const res = await clickup(token, `/list/${parcId}/task`, 'POST', {
    name: NOM_SOUS_TACHE,
    parent: String(tache.id),
    assignees: pose.ids,
    due_date: echeance ? echeanceClickUp(echeance) : undefined,
    due_date_time: false,
    markdown_description: infosBrouillon(tache, 'première demande, le lendemain de la réception', pose.noms),
  });
  if (!res.ok) return { ok: false };
  const json = await res.json().catch(() => ({}));
  return { ok: true, echeance, id: String(json?.id || '') };
}

export { libelleJour };
