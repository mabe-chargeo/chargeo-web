// Jours ouvrés CHARGéO (Phase 4, décision du 11/10/2026 : première relance devis à J+3 ouvrés).
// Ouvré = du lundi au vendredi, hors jours fériés nationaux français. Dates calculées à l'heure de Paris.
// Les jours sont manipulés en { a, m, j } (m de 1 à 12) pour ne dépendre d'aucun fuseau.

export type Jour = { a: number; m: number; j: number };

const cle = (d: Jour) => `${d.a}-${d.m}-${d.j}`;
const versUTC = (d: Jour) => new Date(Date.UTC(d.a, d.m - 1, d.j));
const depuisUTC = (x: Date): Jour => ({ a: x.getUTCFullYear(), m: x.getUTCMonth() + 1, j: x.getUTCDate() });
const decaler = (d: Jour, n: number): Jour => { const x = versUTC(d); x.setUTCDate(x.getUTCDate() + n); return depuisUTC(x); };

// Dimanche de Pâques (algorithme de Meeus / Butcher, calendrier grégorien)
function paques(a: number): Jour {
  const g = a % 19, c = Math.floor(a / 100), h = (c - Math.floor(c / 4) - Math.floor((8 * c + 13) / 25) + 19 * g + 15) % 30;
  const i = h - Math.floor(h / 28) * (1 - Math.floor(29 / (h + 1)) * Math.floor((21 - g) / 11));
  const jsem = (a + Math.floor(a / 4) + i + 2 - c + Math.floor(c / 4)) % 7;
  const l = i - jsem;
  const m = 3 + Math.floor((l + 40) / 44);
  const j = l + 28 - 31 * Math.floor(m / 4);
  return { a, m, j };
}

// 11 jours fériés nationaux (hors Alsace-Moselle)
const cache = new Map<number, Set<string>>();
export function feries(a: number): Set<string> {
  const deja = cache.get(a);
  if (deja) return deja;
  const p = paques(a);
  const liste: Jour[] = [
    { a, m: 1, j: 1 }, { a, m: 5, j: 1 }, { a, m: 5, j: 8 }, { a, m: 7, j: 14 },
    { a, m: 8, j: 15 }, { a, m: 11, j: 1 }, { a, m: 11, j: 11 }, { a, m: 12, j: 25 },
    decaler(p, 1),  // lundi de Pâques
    decaler(p, 39), // Ascension
    decaler(p, 50), // lundi de Pentecôte
  ];
  const s = new Set(liste.map(cle));
  cache.set(a, s);
  return s;
}

export function estOuvre(d: Jour): boolean {
  const js = versUTC(d).getUTCDay(); // 0 = dimanche, 6 = samedi
  return js !== 0 && js !== 6 && !feries(d.a).has(cle(d));
}

// Aujourd'hui à Paris (ou le jour à Paris d'un instant donné)
export function aujourdhuiParis(maintenant: Date = new Date()): Jour {
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(maintenant);
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { a: v('year'), m: v('month'), j: v('day') };
}

// n jours ouvrés après d (d lui-même ne compte pas). Ex : jeudi + 3 = mardi.
export function ajouterJoursOuvres(d: Jour, n: number): Jour {
  let x = d;
  let reste = n;
  while (reste > 0) {
    x = decaler(x, 1);
    if (estOuvre(x)) reste--;
  }
  return x;
}

// d lui-même s'il est ouvré, sinon le jour ouvré suivant
export function prochainOuvre(d: Jour): Jour {
  let x = d;
  while (!estOuvre(x)) x = decaler(x, 1);
  return x;
}

// n jours calendaires après d
export const ajouterJours = (d: Jour, n: number): Jour => decaler(d, n);

// Comparaison : négatif si a est avant b
export const comparer = (a: Jour, b: Jour): number => (a.a - b.a) * 10000 + (a.m - b.m) * 100 + (a.j - b.j);

// Échéance ClickUp sans heure : 10 h UTC, soit le bon jour à Paris en hiver comme en été
export const echeanceClickUp = (d: Jour): number => Date.UTC(d.a, d.m - 1, d.j, 10, 0, 0);

// « mardi 20/10 »
export function libelleJour(d: Jour): string {
  const nom = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' }).format(versUTC(d));
  return `${nom} ${String(d.j).padStart(2, '0')}/${String(d.m).padStart(2, '0')}`;
}
