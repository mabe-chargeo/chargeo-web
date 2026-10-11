// Scénarios de raccordement (lot 3.3). Fichier neutre : utilisable côté serveur (page) et client (écran Scénarios).
export type ScenarioResume = { id: string; nom: string; statut: string };

export const estAVisiter = (statut: string) => statut.toUpperCase().includes('VISITER');

// Tri naturel en français : « Scénario 2 » avant « Scénario 10 », A avant B
export const trierScenarios = (liste: ScenarioResume[]): ScenarioResume[] =>
  [...liste].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true, sensitivity: 'base' }));
