// Fil d'Ariane de l'en-tête (18/10/2026, 17 h 20, validé sur maquette par Matthieu après sa demande de 17 h 11 :
// « À chaque fois tu me donnes des liens… un fil d'Ariane quelque part vers les boutons retour »).
// Sous le bouton Retour : l'onglet de la barre du bas, puis les écrans parents ; chaque mot est un lien.
// Pas de fil sur les 4 écrans racines de la barre (Ma journée, À traiter, Consulter, Créer).
// Calculé depuis la carte des menus (src/lib/menusAppli.ts) ; fichier pur, sans accès réseau.
import { ECRANS, MENUS, precisionActif, libelleBarre, type Ecran } from './menusAppli';

export type Miette = { libelle: string; href: string };

const BARRE = MENUS.direction.barre;
const base = (href: string) => href.split('?')[0];

// Écran parent d'un chemin, quand la carte des menus ne le donne pas ('' = aucun parent)
const PARENT_CHEMIN: [string, string][] = [
  ['/interne/pv', 'reception'],
  ['/interne/mise-en-service', 'reception'],
  ['/interne/reception', 'interventions'],
  ['/interne/pose', 'interventions'],
  ['/interne/maintenance', 'interventions'],
  ['/interne/validation', 'chantiers'],
  ['/interne/feu-vert', 'chantiers'],
  ['/interne/element', 'chantiers'],
  ['/interne/prospection/nouveau', ''],
  ['/interne/prospection', 'pipeline'],
  ['/interne/metre', 'releves'],
];
// Écran parent d'un écran : on remonte la chaîne
const PARENT_ECRAN: Record<string, string> = { reception: 'interventions', validation: 'chantiers', feuVert: 'chantiers' };

const correspond = (p: string, chemin: string) => chemin === p || chemin.startsWith(`${p}/`);

function ongletDe(chemin: string): Ecran | null {
  let onglet: Ecran | null = null;
  let meilleur = 0;
  for (const cle of BARRE) {
    const e = ECRANS[cle];
    const p = e ? precisionActif(e, chemin) : 0;
    if (p > meilleur) { meilleur = p; onglet = e; }
  }
  return onglet;
}

export function filAriane(chemin: string): Miette[] {
  if (!chemin.startsWith('/interne')) return [];
  // Écran racine de la barre : pas de fil
  if (BARRE.some((cle) => ECRANS[cle] && base(ECRANS[cle].href) === chemin)) return [];

  // Premier parent : table des chemins, sinon l'écran du menu dont l'adresse contient ce chemin (fiche d'une liste...)
  const trouve = PARENT_CHEMIN.filter(([p]) => correspond(p, chemin)).sort((a, b) => b[0].length - a[0].length)[0];
  let cle: string | undefined = trouve ? trouve[1] || undefined : undefined;
  if (!trouve) {
    let long = 0;
    for (const e of Object.values(ECRANS)) {
      const b = base(e.href);
      if (BARRE.includes(e.cle) || b === '/interne' || !chemin.startsWith(`${b}/`)) continue;
      if (b.length > long) { long = b.length; cle = e.cle; }
    }
  }
  const chaine: Ecran[] = [];
  while (cle && ECRANS[cle] && !chaine.some((e) => e.cle === cle) && chaine.length < 4) {
    chaine.unshift(ECRANS[cle]);
    cle = PARENT_ECRAN[cle];
  }

  const onglet = ongletDe(chemin) || (chaine[0] ? ongletDe(base(chaine[0].href)) : null) || ECRANS.espace;
  return [
    { libelle: libelleBarre(onglet), href: onglet.href },
    ...chaine.filter((e) => e.cle !== onglet.cle).map((e) => ({ libelle: e.libelle, href: e.href })),
  ];
}
