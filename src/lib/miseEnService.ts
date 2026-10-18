// Mise en service à la réception de pose (décision de Matthieu du 18/10/2026, 14 h 41 : « il y a une mise en service à
// faire sur chaque chantier »). Points à mesurer = les bornes et prises renforcées du scénario retenu (à défaut, de tous
// les scénarios non archivés) ; sans borne (infrastructure collective), les TD IRVE / coffrets, avec les étapes
// électriques seulement. Chaque mesure est un commentaire « ⚡ Mise en service · <élément> » sur l'élément (il suit la
// borne jusqu'au Parc) et une copie sur le chantier. Le dernier commentaire de l'élément fait foi : une mesure refaite
// après correction remplace la précédente.
import { CHAMPS, OPTIONS, cleOption, indexMenu, type Nature } from '@/lib/champsClickUp';
import { chargerTypes, estScenario } from '@/lib/typesTaches';
import { PREFIXE_RETENU } from '@/lib/scenarioRetenu';

export type ModeMes = 'borne' | 'infra';
export type PointMes = { id: string; nom: string; mode: ModeMes };
export type EtatMes = PointMes & { fait: boolean; defaut: boolean; le: number | null };
export const ENTETE_MES = '⚡ Mise en service ·';

async function lire(token: string, id: string, sousTaches = false): Promise<any | null> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(id)}${sousTaches ? '?include_subtasks=true' : ''}`, {
    headers: { Authorization: token }, cache: 'no-store',
  });
  return res.ok ? res.json() : null;
}

export async function pointsDuChantier(token: string, chantierId: string, directes: any[]): Promise<PointMes[]> {
  const { carte } = await chargerTypes(token);
  const enfants = (Array.isArray(directes) ? directes : []).filter((s: any) => !s?.archived && String(s?.parent || '') === String(chantierId));
  const retenus = enfants.filter((s: any) => String(s?.name || '').startsWith(PREFIXE_RETENU));
  const scenarios = retenus.length ? retenus : enfants.filter((s: any) => estScenario(s, carte));
  const lus = await Promise.all(scenarios.map((s: any) => lire(token, String(s.id), true)));
  const ids: string[] = [];
  for (const s of lus) {
    for (const e of Array.isArray(s?.subtasks) ? s.subtasks : []) {
      if (!e?.archived && String(e?.parent || '') === String(s.id)) ids.push(String(e.id));
    }
  }
  const complets = await Promise.all(ids.map((id) => lire(token, id)));
  const bornes: PointMes[] = [];
  const coffrets: PointMes[] = [];
  complets.forEach((e) => {
    if (!e) return;
    const n = (cleOption(OPTIONS.nature, indexMenu(e, CHAMPS.nature)) as Nature | null) || null;
    const point = { id: String(e.id), nom: String(e.name || 'élément') };
    if (n === 'borne' || n === 'priseRenforcee') bornes.push({ ...point, mode: 'borne' });
    else if (n === 'tdIrveCoffret') coffrets.push({ ...point, mode: 'infra' });
  });
  return bornes.length ? bornes : coffrets;
}

export async function commentairesDe(token: string, id: string): Promise<any[]> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(id)}/comment`, { headers: { Authorization: token }, cache: 'no-store' });
  return res.ok ? (await res.json().catch(() => ({})))?.comments || [] : [];
}

export async function etatMiseEnService(token: string, chantierId: string, directes: any[]): Promise<EtatMes[]> {
  const points = await pointsDuChantier(token, chantierId, directes);
  return Promise.all(points.map(async (p) => {
    const mesures = (await commentairesDe(token, p.id))
      .filter((c: any) => String(c?.comment_text || '').startsWith(ENTETE_MES))
      .sort((a: any, b: any) => Number(b?.date || 0) - Number(a?.date || 0));
    const dernier = mesures[0];
    return {
      ...p,
      fait: !!dernier,
      defaut: !!dernier && String(dernier.comment_text || '').includes('⚠️ Défauts'),
      le: dernier ? Number(dernier.date) : null,
    };
  }));
}
