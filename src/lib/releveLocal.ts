// Suivi local des relevés sur le téléphone (lot 3.2, 10/10/2026).
// Fonctions appelées uniquement dans le navigateur (localStorage).
// - Un relevé modifié et pas encore confirmé reste « à terminer », sans limite de durée.
// - Un relevé confirmé (tout reçu par ClickUp) est conservé 7 jours, puis purgé.
export const CLE_INDEX = "metreIndex";
export const CONSERVATION_MS = 7 * 24 * 60 * 60 * 1000;

export type EntreeReleve = { nom: string; majLe: number; confirmeLe?: number };

export function lireIndex(): Record<string, EntreeReleve> {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_INDEX) || "{}");
    return brut && typeof brut === "object" ? brut : {};
  } catch {
    return {};
  }
}

function ecrireIndex(index: Record<string, EntreeReleve>) {
  try {
    localStorage.setItem(CLE_INDEX, JSON.stringify(index));
  } catch {
    /* stockage plein ou bloqué : sans gravité, le relevé lui-même est sauvegardé à part */
  }
}

// Une modification rend le relevé « à terminer » (efface une éventuelle confirmation précédente)
export function noterModification(taskId: string, nom: string) {
  const index = lireIndex();
  index[taskId] = { nom, majLe: Date.now() };
  ecrireIndex(index);
}

export function noterConfirmation(taskId: string, nom: string) {
  const index = lireIndex();
  index[taskId] = { nom, majLe: index[taskId]?.majLe || Date.now(), confirmeLe: Date.now() };
  ecrireIndex(index);
}

export function retirerDeIndex(taskId: string) {
  const index = lireIndex();
  delete index[taskId];
  ecrireIndex(index);
}

export function relevesATerminer(): { id: string; nom: string; majLe: number }[] {
  return Object.entries(lireIndex())
    .filter(([, e]) => e && !e.confirmeLe)
    .map(([id, e]) => ({ id, nom: e.nom, majLe: e.majLe }))
    .sort((a, b) => b.majLe - a.majLe);
}

export function relevesAPurger(): string[] {
  const maintenant = Date.now();
  return Object.entries(lireIndex())
    .filter(([, e]) => e?.confirmeLe && maintenant - e.confirmeLe > CONSERVATION_MS)
    .map(([id]) => id);
}
