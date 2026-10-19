// Fil d'Ariane de l'en-tête (18/10/2026, 17 h 20, validé sur maquette par Matthieu après sa demande de 17 h 11 :
// « À chaque fois tu me donnes des liens… un fil d'Ariane quelque part vers les boutons retour »).
// Sous le bouton Retour : l'onglet de la barre du bas, puis les écrans parents ; chaque mot est un lien.
// Pas de fil sur les 4 écrans racines de la barre (Ma journée, À traiter, Consulter, Créer).
// Calculé depuis la carte des menus (src/lib/menusAppli.ts) ; fichier pur, sans accès réseau.
// 18/10, 17 h 37 (Matthieu, au Parc : « le fil d'Ariane dit à traiter pipeline », correctif validé sur maquette) :
// l'écran parent peut être imposé (la fiche affaire donne celui de son étape : Pipeline, Chantiers ou Parc installé), et
// un écran rangé dans Consulter pour le rôle (Parc, Ressources, Wikis, cartes) est rattaché à l'onglet Consulter.
// 19/10/2026 (passe de cohérence validée par Matthieu) : parents des écrans d'action qui n'en avaient pas. Caler la
// visite → Pipeline ; Planifier un chantier → Chantiers ; Caler ou décaler un rendez-vous et Rapport d'intervention →
// SAV (l'écran du rapport impose Mes interventions pour l'installateur). Nouveau projet et les créations restent sous
// l'onglet Créer.
import { ECRANS, MENUS, precisionActif, libelleBarre, type Ecran, type RoleAppli } from './menusAppli';

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
  ['/interne/caler', 'pipeline'],
  ['/interne/planifier', 'chantiers'],
  ['/interne/rdv', 'sav'],
  ['/interne/rapport-sav', 'sav'],
];
// Écran parent d'un écran : on remonte la chaîne
const PARENT_ECRAN: Record<string, string> = { reception: 'interventions', validation: 'chantiers', feuVert: 'chantiers' };

const correspond = (p: string, chemin: string) => chemin === p || chemin.startsWith(`${p}/`);

// Écrans de l'onglet Consulter pour le rôle (tous rôles confondus si le rôle n'est pas connu)
const dansConsulter = (cle: string, role?: RoleAppli | null) =>
  (role && MENUS[role] ? MENUS[role].consulter : Object.values(MENUS).flatMap((m) => m.consulter)).includes(cle);

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

export function filAriane(chemin: string, o: { parent?: string; role?: RoleAppli | null } = {}): Miette[] {
  if (!chemin.startsWith('/interne')) return [];
  // Écran racine de la barre : pas de fil
  if (BARRE.some((cle) => ECRANS[cle] && base(ECRANS[cle].href) === chemin)) return [];

  // Premier parent : table des chemins, sinon l'écran du menu dont l'adresse contient ce chemin (fiche d'une liste...)
  // (ou celui imposé par l'écran)
  const trouve = o.parent !== undefined ? null : PARENT_CHEMIN.filter(([p]) => correspond(p, chemin)).sort((a, b) => b[0].length - a[0].length)[0];
  let cle: string | undefined = o.parent !== undefined ? o.parent || undefined : trouve ? trouve[1] || undefined : undefined;
  if (o.parent === undefined && !trouve) {
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

  // Onglet : Consulter pour un écran qui y est rangé (l'écran lui-même ou son premier parent), sinon le chemin le plus précis
  const ici = Object.values(ECRANS).find((e) => !BARRE.includes(e.cle) && base(e.href) === chemin && dansConsulter(e.cle, o.role));
  const consulter = !!ici || (!!chaine[0] && dansConsulter(chaine[0].cle, o.role));
  const onglet = (consulter ? ECRANS.consulter : null) || ongletDe(chemin) || (chaine[0] ? ongletDe(base(chaine[0].href)) : null) || ECRANS.espace;
  return [
    { libelle: libelleBarre(onglet), href: onglet.href },
    ...chaine.filter((e) => e.cle !== onglet.cle).map((e) => ({ libelle: e.libelle, href: e.href })),
  ];
}
