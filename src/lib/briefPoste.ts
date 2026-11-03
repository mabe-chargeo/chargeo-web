// Brief de chiffrage : envoi sur le scénario et lecture depuis l'appli (Phase 8, passe 2 de la recette, 03/11/2026).
// - Le brief est calculé par src/lib/briefChiffrage.ts (genererBrief) et posté en commentaire sur le scénario.
// - Un nouveau brief marque les précédents « ⛔ BRIEF PÉRIMÉ » (écart 41) : un seul brief valable sur le scénario.
// - L'appli lit le dernier brief valable (dernierBrief) pour l'afficher sous le relevé (idée de Mathieu, écart 24).
// - Places de parking et date du permis : données du site, lues sur la fiche d'abord, puis sur le scénario (ancien relevé).
// - Les alertes et les lignes à faire à la main sont comptées à part (écart 35 : « 1 alerte » alors que le brief dit
//   « Alertes : aucune », c'était une ligne ⏳).
import { CHAMPS, OPTIONS, cleOption, indexMenu, type Segment } from '@/lib/champsClickUp';
import { genererBrief } from '@/lib/briefChiffrage';
import type { ElementReleve } from '@/lib/releveElements';

export const ENTETE_BRIEF = '📋 Brief de chiffrage';
const PERIME = '⛔ BRIEF PÉRIMÉ';

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

type CommentaireBrief = { id: string; texte: string; date: number };

// Commentaires de brief du scénario, du plus récent au plus ancien
async function commentairesBrief(token: string, scenarioId: string): Promise<CommentaireBrief[]> {
  const res = await api(token, `/task/${encodeURIComponent(scenarioId)}/comment`);
  if (!res.ok) return [];
  const j = await res.json().catch(() => ({}));
  return (Array.isArray(j?.comments) ? j.comments : [])
    .map((c: any) => ({ id: String(c?.id || ''), texte: String(c?.comment_text || ''), date: Number(c?.date) || 0 }))
    .filter((c: CommentaireBrief) => c.id && (c.texte.startsWith(ENTETE_BRIEF) || c.texte.startsWith(PERIME)))
    .sort((a: CommentaireBrief, b: CommentaireBrief) => b.date - a.date);
}

// Dernier brief valable du scénario (null s'il n'y en a pas encore)
export async function dernierBrief(token: string, scenarioId: string): Promise<{ texte: string; date: number } | null> {
  const d = (await commentairesBrief(token, scenarioId)).find((c) => c.texte.startsWith(ENTETE_BRIEF));
  return d ? { texte: d.texte, date: d.date } : null;
}

// Calcule le brief d'un scénario, le poste en commentaire et marque les anciens périmés
export async function posterBrief(token: string, scenario: any, elements: ElementReleve[]): Promise<{ ok: boolean; alertes: number; aFaire: number; texte: string; perimes: number }> {
  const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c?.id === id);
  let fiche: any = null;
  if (scenario?.parent) {
    const r = await api(token, `/task/${encodeURIComponent(String(scenario.parent))}`);
    if (r.ok) fiche = await r.json().catch(() => null);
  }
  const places = (t: any): number | null => {
    const v = Number(champ(t, CHAMPS.nbPlacesParking)?.value);
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const zone = (t: any): string | null => (t ? ((cleOption(OPTIONS.zoneDeplacement, indexMenu(t, CHAMPS.zoneDeplacement)) as string | null) ?? null) : null);
  // 📅 Date Visite Technique (horodatage ClickUp en millisecondes) → JJ/MM/AAAA, heure de Paris (02/11)
  const dateVisite = (t: any): string | null => {
    const v = Number(champ(t, CHAMPS.dateVisiteTechnique)?.value);
    return Number.isFinite(v) && v > 0 ? new Date(v).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) : null;
  };
  const segment = cleOption(OPTIONS.segment, indexMenu(scenario, CHAMPS.segment)) as Segment | null;
  const typeClient = fiche ? ((cleOption(OPTIONS.typeClient, indexMenu(fiche, CHAMPS.typeClient)) as string | null) ?? null) : null;
  const brief = genererBrief({
    scenarioNom: String(scenario?.name || ''),
    segment,
    nbPlaces: places(fiche) ?? places(scenario),
    zone: zone(scenario) ?? zone(fiche),
    elements,
    typeClient,
    ficheNom: fiche?.name ? String(fiche.name) : null,
    dateVisite: dateVisite(fiche) ?? dateVisite(scenario),
  });
  const id = String(scenario?.id || '');
  const anciens = (await commentairesBrief(token, id)).filter((c) => c.texte.startsWith(ENTETE_BRIEF));
  const res = await api(token, `/task/${encodeURIComponent(id)}/comment`, 'POST', { comment_text: brief.texte, notify_all: false });
  if (!res.ok) console.error(`Brief de chiffrage refusé (${res.status}) sur ${id}`, await res.text().catch(() => ''));
  let perimes = 0;
  if (res.ok) {
    const quand = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });
    for (const a of anciens) {
      const r = await api(token, `/comment/${encodeURIComponent(a.id)}`, 'PUT', {
        comment_text: `${PERIME} : remplacé par le brief du ${quand}, ne plus l'utiliser.\n\n${a.texte}`,
      });
      if (r.ok) perimes += 1;
      else console.error(`Ancien brief ${a.id} non marqué périmé (${r.status})`);
    }
  }
  return { ok: res.ok, alertes: brief.alertes.length, aFaire: brief.aFaire.length, texte: brief.texte, perimes };
}
