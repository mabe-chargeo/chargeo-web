// Mise en service à la réception de pose (décision de Matthieu du 18/10/2026, 14 h 41 : « il y a une mise en service à
// faire sur chaque chantier »). 15 h 08 : « les éléments demandés s'adaptent à ce qu'on met en service ». Chaque élément
// du scénario retenu (à défaut, de tous les scénarios non archivés) a les contrôles de sa nature : raccordement,
// alimentation, TD IRVE, artère, boîte de dérivation, communication, liaison data, prise renforcée, borne
// (src/lib/protocoleMaintenance.ts). Nature « Autre » : rien à mesurer.
// Chaque mesure est un commentaire « ⚡ Mise en service · <élément> » sur l'élément (il suit jusqu'au Parc) et une copie
// sur le chantier. Le dernier commentaire de l'élément fait foi : une mesure refaite après correction remplace l'autre.
// 18/10, 15 h 56 (test : Communication enregistrée vide et comptée conforme) : un commentaire sans aucune valeur
// mesurée ne compte pas, l'élément reste « à faire ».
import { CHAMPS, OPTIONS, cleOption, indexMenu, type Nature } from '@/lib/champsClickUp';
import { chargerTypes, estScenario } from '@/lib/typesTaches';
import { PREFIXE_RETENU } from '@/lib/scenarioRetenu';
import type { ModeProtocole } from '@/lib/protocoleMaintenance';

export type ModeMes = ModeProtocole;
export type PointMes = { id: string; nom: string; mode: ModeMes };
export type EtatMes = PointMes & { fait: boolean; defaut: boolean; le: number | null };
export const ENTETE_MES = '⚡ Mise en service ·';

// Ordre de mise en service : de l'arrivée du courant jusqu'aux points de charge
const RANG: Record<ModeMes, number> = { raccordement: 0, alimentation: 1, td: 2, artere: 3, derivation: 4, communication: 5, data: 6, prise: 7, borne: 8 };
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Une mesure contient au moins une ligne de valeur («    Libellé : valeur »)
export const aDesValeurs = (texte: string) => /\n {2,}\S[^\n]* : \S/.test(String(texte || ''));

async function lire(token: string, id: string, sousTaches = false): Promise<any | null> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(id)}${sousTaches ? '?include_subtasks=true' : ''}`, {
    headers: { Authorization: token }, cache: 'no-store',
  });
  return res.ok ? res.json() : null;
}

// Protocole d'un élément selon sa nature (et, pour un cheminement, son type)
export function modeDe(e: any): ModeMes | null {
  const n = (cleOption(OPTIONS.nature, indexMenu(e, CHAMPS.nature)) as Nature | null) || null;
  const nom = normal(e?.name);
  if (n === 'borne') return 'borne';
  if (n === 'priseRenforcee') return 'prise';
  if (n === 'raccordement') return 'raccordement';
  if (n === 'tdIrveCoffret') return 'td';
  if (n === 'boiteDerivation') return 'derivation';
  if (n === 'communication') return 'communication';
  if (n === 'cheminement') {
    const t = cleOption(OPTIONS.typeCheminement, indexMenu(e, CHAMPS.typeCheminement));
    if (t === 'liaisonData' || nom.includes('liaison data')) return 'data';
    if (t === 'artere' || nom.includes('artere')) return 'artere';
    return 'alimentation';
  }
  return null;
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
  const points: PointMes[] = [];
  complets.forEach((e) => {
    if (!e) return;
    const mode = modeDe(e);
    if (mode) points.push({ id: String(e.id), nom: String(e.name || 'élément'), mode });
  });
  return points.sort((a, b) => RANG[a.mode] - RANG[b.mode]);
}

export async function commentairesDe(token: string, id: string): Promise<any[]> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(id)}/comment`, { headers: { Authorization: token }, cache: 'no-store' });
  return res.ok ? (await res.json().catch(() => ({})))?.comments || [] : [];
}

// Mesures valides d'un élément, la plus récente d'abord
export async function mesuresDe(token: string, id: string): Promise<any[]> {
  return (await commentairesDe(token, id))
    .filter((c: any) => String(c?.comment_text || '').startsWith(ENTETE_MES) && aDesValeurs(String(c?.comment_text || '')))
    .sort((a: any, b: any) => Number(b?.date || 0) - Number(a?.date || 0));
}

export async function etatMiseEnService(token: string, chantierId: string, directes: any[]): Promise<EtatMes[]> {
  const points = await pointsDuChantier(token, chantierId, directes);
  return Promise.all(points.map(async (p) => {
    const dernier = (await mesuresDe(token, p.id))[0];
    return {
      ...p,
      fait: !!dernier,
      defaut: !!dernier && String(dernier.comment_text || '').includes('⚠️ Défauts'),
      le: dernier ? Number(dernier.date) : null,
    };
  }));
}
