// Protocoles de mesure CHARGéO : contrôleur Sefram MW9665 (équivalent Metrel MI 3155), adaptateur A1532-XA pour les
// bornes (décisions de Matthieu du 17/10/2026, 14 h 48 et 14 h 50). Servent à la visite de maintenance et, depuis le
// 18/10/2026 (14 h 41), à la mise en service de la réception.
// 18/10, 14 h 56 : protocole borne réaligné sur le manuel et la fiche A1532-XA (Sefram) et sur l'autoséquence EVSE
// Metrel (fonctionnel CP/PP, erreurs, CP sur C : tension, Z auto, RCD auto avec 6 mA DC ; CP sur B : R iso ; charge).
// 18/10, 15 h 08 (Matthieu : « les éléments demandés pour la mise en service s'adaptent à ce qu'on met en service, ce
// n'est pas pareil si on met en service une infrastructure collective ou un point de charge ») : un protocole par nature
// d'élément (raccordement, alimentation, TD IRVE, artère, boîte de dérivation, communication, liaison data, prise
// renforcée, borne). L'appareil donne le verdict : l'application note la valeur et le verdict, sans seuil maison.
// Ordre exact des écrans du MW9665 à recaler quand CHARGéO aura l'appareil.
// Fichier pur : utilisé par les écrans (saisie) et par les routes (commentaire lisible).

export type Controle = {
  cle: string;
  libelle: string;
  type: 'okko' | 'nombre';
  unite?: string;
  // Seulement en triphasé
  tri?: boolean;
  // Peut être « non applicable »
  na?: boolean;
};
export type EtapeProtocole = { cle: string; titre: string; aide: string; controles: Controle[]; photo?: boolean };

export const APPAREIL = 'Sefram MW9665 + A1532-XA';

const numeroter = (etapes: Omit<EtapeProtocole, 'titre'> & { titre: string }[] | EtapeProtocole[]): EtapeProtocole[] =>
  (etapes as EtapeProtocole[]).map((e, i) => ({ ...e, titre: `${i + 1}. ${e.titre}` }));

// Briques communes
const tension = (aide: string): EtapeProtocole => ({
  cle: 'tension', titre: 'Tension', aide,
  controles: [
    { cle: 'l1n', libelle: 'L1-N', type: 'nombre', unite: 'V' },
    { cle: 'l2n', libelle: 'L2-N', type: 'nombre', unite: 'V', tri: true },
    { cle: 'l3n', libelle: 'L3-N', type: 'nombre', unite: 'V', tri: true },
    { cle: 'lpe', libelle: 'L-PE', type: 'nombre', unite: 'V' },
    { cle: 'npe', libelle: 'N-PE', type: 'nombre', unite: 'V' },
    { cle: 'ordre', libelle: 'Ordre des phases', type: 'okko', tri: true },
  ],
});
const impedances = (aide: string): EtapeProtocole => ({
  cle: 'boucle', titre: 'Impédances (Z auto)', aide,
  controles: [
    { cle: 'zs', libelle: 'Zs boucle L-PE', type: 'nombre', unite: 'Ω' },
    { cle: 'zline', libelle: 'Z ligne L-N', type: 'nombre', unite: 'Ω' },
    { cle: 'ipsc', libelle: 'Courant de court-circuit présumé', type: 'nombre', unite: 'A' },
    { cle: 'uc', libelle: 'Tension de contact Uc', type: 'nombre', unite: 'V' },
    { cle: 'resultat', libelle: 'Verdict de l’appareil', type: 'okko' },
  ],
});
const isolement = (aide: string): EtapeProtocole => ({
  cle: 'isolement', titre: 'Isolement (hors tension)', aide,
  controles: [
    { cle: 'l1pe', libelle: 'L1-PE', type: 'nombre', unite: 'MΩ' },
    { cle: 'l2pe', libelle: 'L2-PE', type: 'nombre', unite: 'MΩ', tri: true },
    { cle: 'l3pe', libelle: 'L3-PE', type: 'nombre', unite: 'MΩ', tri: true },
    { cle: 'npe', libelle: 'N-PE', type: 'nombre', unite: 'MΩ' },
    { cle: 'resultat', libelle: 'Verdict de l’appareil', type: 'okko' },
  ],
});
const continuite = (aide: string): EtapeProtocole => ({
  cle: 'continuite', titre: 'Continuité du PE (hors tension)', aide,
  controles: [
    { cle: 'rpe', libelle: 'R continuité PE', type: 'nombre', unite: 'Ω' },
    { cle: 'resultat', libelle: 'Verdict de l’appareil', type: 'okko' },
  ],
});
const differentiel = (aide: string, dc6 = false): EtapeProtocole => ({
  cle: 'ddr', titre: 'Différentiel (RCD auto)', aide,
  controles: [
    { cle: 'temps', libelle: 'Temps de déclenchement à IΔn', type: 'nombre', unite: 'ms' },
    { cle: 'temps5', libelle: 'Temps de déclenchement à 5 × IΔn', type: 'nombre', unite: 'ms' },
    { cle: 'courant', libelle: 'Courant de déclenchement IΔ', type: 'nombre', unite: 'mA' },
    ...(dc6 ? [{ cle: 'dc6', libelle: 'Détection 6 mA DC', type: 'okko' as const, na: true }] : []),
    { cle: 'resultat', libelle: 'Verdict de l’appareil', type: 'okko' },
  ],
});
const synthese = (libelle = 'Mesures enregistrées dans le MW9665'): EtapeProtocole => ({
  cle: 'synthese', titre: 'Synthèse', aide: 'Photographie l’écran de résumé du MW9665 (rapport MESM ensuite).', photo: true,
  controles: [{ cle: 'global', libelle, type: 'okko' }],
});

// Borne : autoséquence EVSE avec l'A1532-XA (ordre du 18/10, 14 h 56)
export const PROTOCOLE: EtapeProtocole[] = numeroter([
  {
    cle: 'visuel', titre: 'Contrôle visuel', aide: 'Avant de brancher l’A1532-XA. Contrôles visuels de l’autoséquence, repris dans le rapport MESM.', photo: true,
    controles: [
      { cle: 'borne', libelle: 'Borne : boîtier, fixation, étiquetage', type: 'okko' },
      { cle: 'cable', libelle: 'Socle ou câble T2 : état, verrouillage', type: 'okko' },
      { cle: 'tableau', libelle: 'Protections au tableau : repérage, serrage', type: 'okko' },
    ],
  },
  {
    cle: 'cp', titre: 'Test fonctionnel : états CP', aide: 'A1532-XA branché avec PP sur N.C. et CP sur A, puis PP sur le calibre du câble. Passe A → B → C et note la réaction de la borne.',
    controles: [
      { cle: 'a', libelle: 'État A : non connecté, borne au repos', type: 'okko' },
      { cle: 'b', libelle: 'État B : connecté, en attente', type: 'okko' },
      { cle: 'c', libelle: 'État C : en charge, sortie sous tension', type: 'okko' },
      { cle: 'd', libelle: 'État D : en charge avec ventilation', type: 'okko', na: true },
    ],
  },
  {
    cle: 'pp', titre: 'Test fonctionnel : PP', aide: 'Sélecteur PP de l’A1532-XA sur 13, 20, 32 puis 63 A : la borne limite son courant ou se met en défaut, selon son réglage.',
    controles: [
      { cle: 'p13', libelle: 'PP 13 A : réaction conforme', type: 'okko', na: true },
      { cle: 'p20', libelle: 'PP 20 A : réaction conforme', type: 'okko', na: true },
      { cle: 'p32', libelle: 'PP 32 A : réaction conforme', type: 'okko', na: true },
      { cle: 'p63', libelle: 'PP 63 A : réaction conforme', type: 'okko', na: true },
    ],
  },
  {
    cle: 'defauts', titre: 'Simulations d’erreur', aide: 'A1532-XA, en charge (CP sur C) : la borne doit couper sa sortie pour chaque erreur.',
    controles: [
      { cle: 'pe', libelle: 'PE ouvert : la borne coupe', type: 'okko' },
      { cle: 'diode', libelle: 'Diode court-circuitée : la borne coupe', type: 'okko' },
      { cle: 'cppe', libelle: 'Court-circuit CP-PE : la borne coupe', type: 'okko' },
    ],
  },
  tension('Sous tension, CP sur C : test de tension de l’autoséquence, sur les fiches bananes de l’A1532-XA.'),
  impedances('CP sur C : boucle L-PE sans déclencher le DDR, ligne L-N, tension de contact.'),
  differentiel('CP sur C : type A + détection 6 mA DC (EV RCD, IEC 62955), ou type B.', true),
  isolement('CP sur B, borne hors tension : conducteur par conducteur contre le PE.'),
  {
    cle: 'charge', titre: 'Test de charge', aide: 'A1532-XA, CP sur C : charge de 13 A au plus (prise 2P+T en mono, fiches bananes en tri). Contrôle le compteur de la borne.',
    controles: [
      { cle: 'courant', libelle: 'Courant délivré', type: 'nombre', unite: 'A' },
      { cle: 'compteur', libelle: 'Compteur de la borne cohérent', type: 'okko' },
    ],
  },
  { ...synthese('Autoséquence réussie et enregistrée'), aide: 'CP sur A avant de débrancher. Photographie l’écran de résumé et enregistre la séquence dans le MW9665 (rapport MESM).' },
]);

// Prise renforcée : pas de CP ni de PP, contrôles d'installation du circuit et essai d'une charge
const PROTOCOLE_PRISE: EtapeProtocole[] = numeroter([
  {
    cle: 'visuel', titre: 'Contrôle visuel', aide: 'Prise, support et protection dédiée au tableau.', photo: true,
    controles: [
      { cle: 'prise', libelle: 'Prise : fixation, état, étiquetage', type: 'okko' },
      { cle: 'tableau', libelle: 'Protection dédiée : calibre, repérage, serrage', type: 'okko' },
    ],
  },
  continuite('R basse du MW9665 entre la borne de terre de la prise et la barrette du tableau.'),
  isolement('Circuit consigné, conducteur par conducteur contre le PE.'),
  tension('Sous tension, à la prise.'),
  impedances('À la prise, sans déclencher le DDR.'),
  differentiel('DDR qui protège la prise.'),
  {
    cle: 'essai', titre: 'Essai de charge', aide: 'Câble de recharge occasionnelle ou charge d’essai branché sur la prise.',
    controles: [{ cle: 'charge', libelle: 'La charge démarre et tient', type: 'okko' }],
  },
  synthese(),
]);

// Raccordement (PDL dédié, TGBT, tableau) : prise de terre et arrivée
const PROTOCOLE_RACCORDEMENT: EtapeProtocole[] = numeroter([
  {
    cle: 'visuel', titre: 'Contrôle visuel', aide: 'Point de raccordement : protection de tête, repérage, serrage, plombage le cas échéant.', photo: true,
    controles: [
      { cle: 'arrivee', libelle: 'Arrivée : protection de tête, repérage, serrage', type: 'okko' },
    ],
  },
  {
    cle: 'terre', titre: 'Prise de terre', aide: 'Mesure de terre du MW9665 (piquets ou boucle) : surtout sur un PDL dédié, qui a sa propre terre.',
    controles: [
      { cle: 'ra', libelle: 'Résistance de terre RA', type: 'nombre', unite: 'Ω' },
      { cle: 'resultat', libelle: 'Verdict de l’appareil', type: 'okko', na: true },
    ],
  },
  tension('Sous tension, à l’arrivée.'),
  synthese(),
]);

// Alimentation (raccordement → TD IRVE) et artère (TD IRVE → fin d'artère) : contrôles du câble posé, mesurés au bout
const cable = (bout: string): EtapeProtocole[] => numeroter([
  continuite(`R basse du MW9665 entre la barrette de terre de départ et le PE ${bout}.`),
  isolement('Câble consigné aux deux bouts, conducteur par conducteur contre le PE.'),
  tension(`Sous tension, ${bout}.`),
  impedances(`${bout.charAt(0).toUpperCase()}${bout.slice(1)}, sans déclencher le DDR.`),
  synthese(),
]);
const PROTOCOLE_ALIMENTATION = cable('à l’arrivée dans le TD IRVE');
const PROTOCOLE_ARTERE = cable('en fin d’artère');

// TD IRVE / coffret : coffret, protections et gestion de charge
const PROTOCOLE_TD: EtapeProtocole[] = numeroter([
  {
    cle: 'visuel', titre: 'Contrôle visuel', aide: 'Coffret fermé puis ouvert.', photo: true,
    controles: [
      { cle: 'coffret', libelle: 'Coffret : fixation, fermeture, étiquetage', type: 'okko' },
      { cle: 'protections', libelle: 'Protections : calibres, repérage, serrage', type: 'okko' },
      { cle: 'departs', libelle: 'Départs en attente : repérés et protégés', type: 'okko', na: true },
    ],
  },
  continuite('R basse du MW9665 entre la barrette de terre du TD IRVE et ses masses.'),
  differentiel('DDR de tête du TD IRVE.'),
  {
    cle: 'pilotage', titre: 'Gestion de charge et mesure', aide: 'Selon ce qui est posé dans le TD IRVE.',
    controles: [
      { cle: 'gestion', libelle: 'Délesteur ou gestionnaire de grappe : fonctionne', type: 'okko', na: true },
      { cle: 'mesure', libelle: 'Mesure de puissance (TIC ou compteur) : remonte', type: 'okko', na: true },
    ],
  },
  synthese(),
]);

// Boîte de dérivation
const PROTOCOLE_DERIVATION: EtapeProtocole[] = numeroter([
  {
    cle: 'visuel', titre: 'Contrôle visuel', aide: 'Boîte ouverte.', photo: true,
    controles: [
      { cle: 'boite', libelle: 'Boîte : fixation, fermeture, étiquetage', type: 'okko' },
      { cle: 'connexions', libelle: 'Connexions : serrage, repérage', type: 'okko' },
    ],
  },
  continuite('R basse du MW9665 entre la barrette de terre du TD IRVE et le PE de la boîte.'),
  synthese(),
]);

// Communication (HUB, switch, modem) : contrôle fonctionnel, pas de MW9665
const PROTOCOLE_COMMUNICATION: EtapeProtocole[] = numeroter([
  {
    cle: 'materiel', titre: 'Matériel', aide: 'HUB, switch ou modem en place.', photo: true,
    controles: [
      { cle: 'alim', libelle: 'Alimenté, voyants normaux', type: 'okko' },
      { cle: 'fixation', libelle: 'Fixé et étiqueté', type: 'okko' },
    ],
  },
  {
    cle: 'reseau', titre: 'Réseau', aide: 'Connexion vers l’extérieur (4G, WiFi ou câble) et vers les équipements.',
    controles: [
      { cle: 'connecte', libelle: 'Connecté au réseau', type: 'okko' },
      { cle: 'equipements', libelle: 'Équipements vus (TD IRVE, bornes)', type: 'okko', na: true },
    ],
  },
]);

// Liaison data : test du câble
const PROTOCOLE_DATA: EtapeProtocole[] = numeroter([
  {
    cle: 'cable', titre: 'Câble data', aide: 'Testeur de câble réseau entre les deux bouts.', photo: true,
    controles: [
      { cle: 'paires', libelle: 'Toutes les paires OK', type: 'okko' },
      { cle: 'reperage', libelle: 'Repéré aux deux bouts', type: 'okko' },
    ],
  },
]);

export type ModeProtocole = 'borne' | 'prise' | 'raccordement' | 'alimentation' | 'td' | 'artere' | 'derivation' | 'communication' | 'data';

const PROTOCOLES: Record<ModeProtocole, EtapeProtocole[]> = {
  borne: PROTOCOLE,
  prise: PROTOCOLE_PRISE,
  raccordement: PROTOCOLE_RACCORDEMENT,
  alimentation: PROTOCOLE_ALIMENTATION,
  td: PROTOCOLE_TD,
  artere: PROTOCOLE_ARTERE,
  derivation: PROTOCOLE_DERIVATION,
  communication: PROTOCOLE_COMMUNICATION,
  data: PROTOCOLE_DATA,
};
const APPAREILS: Record<ModeProtocole, string> = {
  borne: APPAREIL,
  prise: 'Sefram MW9665',
  raccordement: 'Sefram MW9665',
  alimentation: 'Sefram MW9665',
  td: 'Sefram MW9665',
  artere: 'Sefram MW9665',
  derivation: 'Sefram MW9665',
  communication: 'Contrôle fonctionnel',
  data: 'Testeur de câble réseau',
};
// Ce qu'on met en service, en une phrase pour l'installateur
export const OBJET: Record<ModeProtocole, string> = {
  borne: 'Point de charge : autoséquence borne du MW9665 avec l’A1532-XA.',
  prise: 'Prise renforcée : contrôles du circuit au MW9665 et essai de charge.',
  raccordement: 'Raccordement : prise de terre et tension à l’arrivée.',
  alimentation: 'Alimentation du TD IRVE : continuité, isolement et mesures à l’arrivée dans le TD.',
  td: 'TD IRVE : coffret, protections, différentiel de tête et gestion de charge.',
  artere: 'Artère : continuité, isolement et mesures en fin d’artère.',
  derivation: 'Boîte de dérivation : connexions et continuité du PE.',
  communication: 'Communication : matériel alimenté et connecté.',
  data: 'Liaison data : test du câble.',
};

export const etapesDe = (mode: ModeProtocole = 'borne'): EtapeProtocole[] => PROTOCOLES[mode] || PROTOCOLE;
export const appareilDe = (mode: ModeProtocole = 'borne') => APPAREILS[mode] || APPAREIL;
export const aDuTri = (etapes: EtapeProtocole[]) => etapes.some((e) => e.controles.some((c) => c.tri));

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
    `Appareil : ${appareil}${aDuTri(etapes) ? ` · ${r.tri ? 'triphasé' : 'monophasé'}` : ''}`,
    ...lignes,
    d.length ? `⚠️ Défauts : ${d.join(' ; ')}` : '✅ Aucun défaut noté',
    r.remarque ? `Remarque : ${r.remarque}` : '',
  ].filter(Boolean).join('\n');
}
