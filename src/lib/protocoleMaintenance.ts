// Protocole de la visite de maintenance (décision de Matthieu du 17/10/2026, 14 h 48 et 14 h 50) : CHARGéO suit le protocole
// du contrôleur Sefram MW9665 avec l'adaptateur de borne A1532-XA (autoséquence borne de recharge, documentation
// Sefram relue le 17/10). Même ordre que l'appareil, pour chaque point de charge : contrôle visuel, états du pilote CP,
// signal PP, simulations de défaut (A1532-XA), tension, boucle et impédance, différentiel, isolement hors tension, test
// de charge jusqu'à 13 A (A1532-XA), synthèse. Le rapport professionnel reste celui du logiciel MESM, joint à la visite.
// 18/10/2026, 14 h 41 (Matthieu : « il y a une mise en service à faire sur chaque chantier ») : le même protocole sert à
// la mise en service de la réception (/interne/mise-en-service). Sans borne (infrastructure collective), le TD IRVE
// est mesuré avec les étapes électriques seulement (etapesDe('infra')).
// Fichier pur : utilisé par les écrans (saisie) et par les routes (commentaire lisible).

export type Controle = {
  cle: string;
  libelle: string;
  type: 'okko' | 'nombre';
  unite?: string;
  // Seulement en triphasé
  tri?: boolean;
  // Peut être « non applicable » (borne sans ventilation…)
  na?: boolean;
};
export type EtapeProtocole = { cle: string; titre: string; aide: string; controles: Controle[]; photo?: boolean };

export const APPAREIL = 'Sefram MW9665 + A1532-XA';
export const APPAREIL_INFRA = 'Sefram MW9665';

export const PROTOCOLE: EtapeProtocole[] = [
  {
    cle: 'visuel', titre: '1. Contrôle visuel', aide: 'Borne en mode installateur si nécessaire. Contrôles visuels de l’autoséquence.', photo: true,
    controles: [
      { cle: 'borne', libelle: 'Borne : boîtier, fixation, étiquetage', type: 'okko' },
      { cle: 'cable', libelle: 'Câble, connecteur ou prise', type: 'okko' },
      { cle: 'tableau', libelle: 'Protections au tableau : repérage, serrage', type: 'okko' },
    ],
  },
  {
    cle: 'cp', titre: '2. États du pilote CP', aide: 'Sélecteur d’état du A1532-XA : la borne répond-elle correctement ?',
    controles: [
      { cle: 'a', libelle: 'État A : non connecté', type: 'okko' },
      { cle: 'b', libelle: 'État B : connecté, pas en charge', type: 'okko' },
      { cle: 'c', libelle: 'État C : en charge', type: 'okko' },
      { cle: 'd', libelle: 'État D : en charge avec ventilation', type: 'okko', na: true },
      { cle: 'e', libelle: 'État E : erreur, la borne coupe', type: 'okko' },
    ],
  },
  {
    cle: 'pp', titre: '3. Signal PP', aide: 'Simulation du câble (13, 20, 32, 63 A) : la borne limite ou se met en défaut selon son réglage.',
    controles: [{ cle: 'limitation', libelle: 'Réaction conforme au câble simulé', type: 'okko' }],
  },
  {
    cle: 'defauts', titre: '4. Simulations de défaut', aide: 'A1532-XA : la borne doit arrêter la charge.',
    controles: [
      { cle: 'diode', libelle: 'Diode court-circuitée', type: 'okko' },
      { cle: 'pe', libelle: 'PE ouvert', type: 'okko' },
      { cle: 'cppe', libelle: 'Court-circuit CP-PE', type: 'okko' },
    ],
  },
  {
    cle: 'tension', titre: '5. Tension', aide: 'Mesure de tension de l’autoséquence (A1532-XA en charge).',
    controles: [
      { cle: 'l1n', libelle: 'L1-N', type: 'nombre', unite: 'V' },
      { cle: 'l2n', libelle: 'L2-N', type: 'nombre', unite: 'V', tri: true },
      { cle: 'l3n', libelle: 'L3-N', type: 'nombre', unite: 'V', tri: true },
      { cle: 'lpe', libelle: 'L-PE', type: 'nombre', unite: 'V' },
      { cle: 'npe', libelle: 'N-PE', type: 'nombre', unite: 'V' },
      { cle: 'ordre', libelle: 'Ordre des phases', type: 'okko', tri: true },
    ],
  },
  {
    cle: 'boucle', titre: '6. Boucle et impédance', aide: 'Impédance de boucle avec DDR (Zs ddr), sans déclencher le différentiel.',
    controles: [
      { cle: 'zs', libelle: 'Zs', type: 'nombre', unite: 'Ω' },
      { cle: 'ipsc', libelle: 'Courant de défaut présumé', type: 'nombre', unite: 'A' },
      { cle: 'resultat', libelle: 'Résultat boucle', type: 'okko' },
    ],
  },
  {
    cle: 'ddr', titre: '7. Différentiel', aide: 'Temps et courant de déclenchement du DDR (type A, F, B ou EV selon l’installation).',
    controles: [
      { cle: 'temps', libelle: 'Temps de déclenchement à IΔn', type: 'nombre', unite: 'ms' },
      { cle: 'courant', libelle: 'Courant de déclenchement', type: 'nombre', unite: 'mA' },
      { cle: 'resultat', libelle: 'Résultat différentiel', type: 'okko' },
    ],
  },
  {
    cle: 'isolement', titre: '8. Isolement (hors tension)', aide: 'Borne consignée. Mesure d’isolement de l’autoséquence.',
    controles: [
      { cle: 'riso', libelle: 'Résistance d’isolement', type: 'nombre', unite: 'MΩ' },
      { cle: 'resultat', libelle: 'Résultat isolement', type: 'okko' },
    ],
  },
  {
    cle: 'charge', titre: '9. Test de charge', aide: 'A1532-XA : charge jusqu’à 13 A, contrôle du compteur de la borne.',
    controles: [
      { cle: 'courant', libelle: 'Courant délivré', type: 'nombre', unite: 'A' },
      { cle: 'compteur', libelle: 'Compteur de la borne cohérent', type: 'okko' },
    ],
  },
  {
    cle: 'synthese', titre: '10. Synthèse', aide: 'Page de résumé du MW9665 : photographie l’écran et enregistre la séquence dans l’appareil (rapport MESM).', photo: true,
    controles: [{ cle: 'global', libelle: 'Autoséquence réussie', type: 'okko' }],
  },
];

// Sans borne (TD IRVE d'une infrastructure collective) : étapes électriques seulement, pas d'adaptateur de borne
export const ETAPES_INFRA = ['visuel', 'tension', 'boucle', 'ddr', 'isolement', 'synthese'];
export type ModeProtocole = 'borne' | 'infra';
export const etapesDe = (mode: ModeProtocole = 'borne'): EtapeProtocole[] =>
  mode === 'infra' ? PROTOCOLE.filter((e) => ETAPES_INFRA.includes(e.cle)) : PROTOCOLE;
export const appareilDe = (mode: ModeProtocole = 'borne') => (mode === 'infra' ? APPAREIL_INFRA : APPAREIL);

export type Resultats = { tri: boolean; valeurs: Record<string, string>; remarque: string };

export const cleValeur = (etape: string, controle: string) => `${etape}.${controle}`;

const libelleValeur = (c: Controle, v: string) => {
  if (c.type === 'nombre') return `${v} ${c.unite || ''}`.trim();
  return v === 'ok' ? '✅ OK' : v === 'ko' ? '❌ Défaut' : v === 'na' ? 'NA' : v;
};

// Contrôles en défaut (pour l'alerte de fin et le commentaire)
export function defauts(r: Resultats, etapes: EtapeProtocole[] = PROTOCOLE): string[] {
  const sortie: string[] = [];
  for (const e of etapes) for (const c of e.controles) {
    if (c.tri && !r.tri) continue;
    if (c.type === 'okko' && r.valeurs[cleValeur(e.cle, c.cle)] === 'ko') sortie.push(`${e.titre.replace(/^\d+\.\s*/, '')} : ${c.libelle}`);
  }
  return sortie;
}

// Contrôles pas encore renseignés
export function manquants(r: Resultats, etapes: EtapeProtocole[] = PROTOCOLE): number {
  let n = 0;
  for (const e of etapes) for (const c of e.controles) {
    if (c.tri && !r.tri) continue;
    if (!String(r.valeurs[cleValeur(e.cle, c.cle)] || '').trim()) n++;
  }
  return n;
}

// Texte du commentaire laissé sur la visite ou sur l'élément mis en service
export function texteResultats(r: Resultats, etapes: EtapeProtocole[] = PROTOCOLE, appareil: string = APPAREIL): string {
  const lignes: string[] = [];
  for (const e of etapes) {
    const vus = e.controles.filter((c) => !(c.tri && !r.tri)).map((c) => {
      const v = String(r.valeurs[cleValeur(e.cle, c.cle)] || '').trim();
      return v ? `   ${c.libelle} : ${libelleValeur(c, v)}` : '';
    }).filter(Boolean);
    if (vus.length) lignes.push(e.titre, ...vus);
  }
  const d = defauts(r, etapes);
  return [
    `Appareil : ${appareil} · ${r.tri ? 'triphasé' : 'monophasé'}`,
    ...lignes,
    d.length ? `⚠️ Défauts : ${d.join(' ; ')}` : '✅ Aucun défaut noté',
    r.remarque ? `Remarque : ${r.remarque}` : '',
  ].filter(Boolean).join('\n');
}
