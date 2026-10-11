// Sous-relevés d'une fiche : scénarios (point 12 règle 2) et emplacements (point 21).
// Fichier neutre : utilisable côté serveur (pages, routes) et client (écrans).
// - Scénario : une autre façon de raccorder, alternative (un devis chacun). Nom « Scénario A : ... ».
// - Emplacement : une borne physique du site, qui s'additionne aux autres (un seul devis par sections).
//   Nom « Emplacement 1 : ... ». Une borne double compte pour un seul emplacement.
// Une fiche a soit des scénarios, soit des emplacements (pas de mélange, décision du 11/10/2026).
export type ScenarioResume = { id: string; nom: string; statut: string };
export type TypeSousReleve = 'scenario' | 'emplacement';

export const estAVisiter = (statut: string) => statut.toUpperCase().includes('VISITER');

export const typeSousReleve = (nom: string): TypeSousReleve =>
  /^\s*Emplacement\b/i.test(nom) ? 'emplacement' : 'scenario';

// Type des sous-relevés d'une fiche (null si aucun)
export const typeDesSousReleves = (liste: { nom: string }[]): TypeSousReleve | null => {
  if (liste.length === 0) return null;
  return liste.some((s) => typeSousReleve(s.nom) === 'emplacement') ? 'emplacement' : 'scenario';
};

// Tri naturel en français : « 2 » avant « 10 », A avant B
export const trierScenarios = (liste: ScenarioResume[]): ScenarioResume[] =>
  [...liste].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true, sensitivity: 'base' }));
