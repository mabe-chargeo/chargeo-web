// Durées des rendez-vous lues dans ClickUp (18/10/2026, 9 h 22, Matthieu : « il faut que toutes les durées soient
// paramétrables comme pour les chantiers et les relevés techniques »). Chaque type de rendez-vous a son menu déroulant,
// lu par son nom (jamais par la position de l'option) :
// - relevé technique : ⏳ Durée relevé (Qualification) : 30 min, 1 h, 1 h 30, 2 h, 3 h ; 1 h si vide ;
// - visite de maintenance et dépannage SAV : ⏳ Durée RDV (Maintenance, Tickets SAV) : 30 min à 4 h ; 1 h 30 si vide ;
// - pose : ⏳ Durée intervention (Planning Chantiers) : ½ journée à 5 jours, en demi-journées (src/lib/demiJournees.ts).
// Fichier pur (aucun accès réseau) : fonctions sur les tâches lues par l'appelant.

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const DUREE_RELEVE_DEFAUT = 60;
export const DUREE_RDV_DEFAUT = 90;
export const MOT_DUREE_RELEVE = 'duree releve';
export const MOT_DUREE_RDV = 'duree rdv';
export const MOT_DUREE_POSE = 'duree intervention';

// Menu déroulant d'une tâche trouvé par un mot de son nom : champ, options et option choisie
export function menuNomme(t: any, mot: string): { id: string; options: { id: string; nom: string }[]; choisi: string } | null {
  const f = (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => normal(c?.name).includes(mot));
  if (!f) return null;
  const brutes: any[] = Array.isArray(f?.type_config?.options) ? f.type_config.options : [];
  const options = brutes.map((o: any) => ({ id: String(o?.id), nom: String(o?.name ?? o?.label ?? ''), ordre: Number(o?.orderindex) }));
  const v = f?.value;
  const o = v === undefined || v === null || v === '' ? undefined : options.find((x) => x.id === String(v) || x.ordre === Number(v));
  return { id: String(f.id), options: options.map((x) => ({ id: x.id, nom: x.nom })), choisi: o?.nom || '' };
}

// « 30 min » → 30, « 1 h » → 60, « 1 h 30 » → 90 ; 0 si inconnu
export function minutesDe(libelle: string): number {
  const n = normal(libelle).replace(/\s+/g, '');
  const h = n.match(/(\d+)h(\d+)?/);
  if (h) return Number(h[1]) * 60 + (h[2] ? Number(h[2]) : 0);
  const m = n.match(/(\d+)min/);
  return m ? Number(m[1]) : 0;
}

// Durée en minutes d'un rendez-vous (option choisie, sinon la valeur par défaut)
export const dureeDe = (t: any, mot: string, defaut: number): number => minutesDe(menuNomme(t, mot)?.choisi || '') || defaut;
export const dureeReleve = (t: any) => dureeDe(t, MOT_DUREE_RELEVE, DUREE_RELEVE_DEFAUT);
export const dureeRdv = (t: any) => dureeDe(t, MOT_DUREE_RDV, DUREE_RDV_DEFAUT);
// Libellé de la durée d'une pose (« 1 jour »), vide si rien
export const dureePose = (t: any): string => menuNomme(t, MOT_DUREE_POSE)?.choisi || '';
