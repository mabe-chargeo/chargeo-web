// Protocole de mesure CHARGéO : contrôleur Sefram MW9665 (équivalent Metrel MI 3155) avec l'adaptateur A1532-XA
// (décisions de Matthieu du 17/10/2026, 14 h 48 et 14 h 50). Sert à la visite de maintenance et, depuis le 18/10/2026
// (14 h 41), à la mise en service de la réception.
// 18/10/2026, 14 h 56 (Matthieu : « tu es sûr de bien avoir suivi le protocole prévu par le contrôleur MW9665 ? ») :
// réaligné sur les sources relues ce jour, et non plus sur un résumé :
// - manuel utilisateur A1532-XA (Sefram) : PP sur N.C. et CP sur A pour brancher ; simulations PP 13/20/32/63 A et CP
//   A, B, C, D ; erreurs PE ouvert, diode court-circuitée, court-circuit CP-PE ; tests sous tension avec CP sur C ;
//   test de charge 13 A au plus (compteur de la borne) ; CP sur A avant de débrancher ;
// - fiche A1532-XA (Sefram) : tension, impédance de boucle, tension de contact, DDR, isolement hors tension,
//   contrôles visuels et rapport MESM (MW9665 seulement) ;
// - autoséquence EVSE Metrel (MI 3155 / MI 3152) : test fonctionnel, puis sous tension CP = C (test de tension, Z auto,
//   RCD auto type A + B ou EV RCD avec 6 mA DC), puis hors tension CP = B (R iso L1, L2, L3, N contre PE).
// L'appareil donne le verdict : l'application note la valeur et le verdict de l'appareil, sans seuil maison.
// Sans borne (TD IRVE d'une infrastructure collective), pas d'A1532-XA : contrôles d'installation du MW9665.
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
export const APPAREIL_INFRA = 'Sefram MW9665';

// Borne ou prise renforcée : autoséquence EVSE avec l'A1532-XA
export const PROTOCOLE: EtapeProtocole[] = [
  {
    cle: 'visuel', titre: '1. Contrôle visuel', aide: 'Avant de brancher l’A1532-XA. Contrôles visuels de l’autoséquence, repris dans le rapport MESM.', photo: true,
    controles: [
      { cle: 'borne', libelle: 'Borne : boîtier, fixation, étiquetage', type: 'okko' },
      { cle: 'cable', libelle: 'Socle ou câble T2 : état, verrouillage', type: 'okko' },
      { cle: 'tableau', libelle: 'Protections au tableau : repérage, serrage', type: 'okko' },
    ],
  },
  {
    cle: 'cp', titre: '2. Test fonctionnel : états CP', aide: 'A1532-XA branché avec PP sur N.C. et CP sur A, puis PP sur le calibre du câble. Passe A → B → C et note la réaction de la borne.',
    controles: [
      { cle: 'a', libelle: 'État A : non connecté, borne au repos', type: 'okko' },
      { cle: 'b', libelle: 'État B : connecté, en attente', type: 'okko' },
      { cle: 'c', libelle: 'État C : en charge, sortie sous tension', type: 'okko' },
      { cle: 'd', libelle: 'État D : en charge avec ventilation', type: 'okko', na: true },
    ],
  },
  {
    cle: 'pp', titre: '3. Test fonctionnel : PP', aide: 'Sélecteur PP de l’A1532-XA sur 13, 20, 32 puis 63 A : la borne limite son courant ou se met en défaut, selon son réglage.',
    controles: [
      { cle: 'p13', libelle: 'PP 13 A : réaction conforme', type: 'okko', na: true },
      { cle: 'p20', libelle: 'PP 20 A : réaction conforme', type: 'okko', na: true },
      { cle: 'p32', libelle: 'PP 32 A : réaction conforme', type: 'okko', na: true },
      { cle: 'p63', libelle: 'PP 63 A : réaction conforme', type: 'okko', na: true },
    ],
  },
  {
    cle: 'defauts', titre: '4. Simulations d’erreur', aide: 'A1532-XA, en charge (CP sur C) : la borne doit couper sa sortie pour chaque erreur.',
    controles: [
      { cle: 'pe', libelle: 'PE ouvert : la borne coupe', type: 'okko' },
      { cle: 'diode', libelle: 'Diode court-circuitée : la borne coupe', type: 'okko' },
      { cle: 'cppe', libelle: 'Court-circuit CP-PE : la borne coupe', type: 'okko' },
    ],
  },
  {
    cle: 'tension', titre: '5. Tension (sous tension, CP sur C)', aide: 'Test de tension de l’autoséquence, sur les fiches bananes de l’A1532-XA.',
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
    cle: 'boucle', titre: '6. Impédances, Z auto (CP sur C)', aide: 'Z auto de l’autoséquence : boucle L-PE sans déclencher le DDR, ligne L-N, tension de contact.',
    controles: [
      { cle: 'zs', libelle: 'Zs boucle L-PE', type: 'nombre', unite: 'Ω' },
      { cle: 'zline', libelle: 'Z ligne L-N', type: 'nombre', unite: 'Ω' },
      { cle: 'ipsc', libelle: 'Courant de court-circuit présumé', type: 'nombre', unite: 'A' },
      { cle: 'uc', libelle: 'Tension de contact Uc', type: 'nombre', unite: 'V' },
      { cle: 'resultat', libelle: 'Verdict de l’appareil', type: 'okko' },
    ],
  },
  {
    cle: 'ddr', titre: '7. Différentiel, RCD auto (CP sur C)', aide: 'RCD auto de l’autoséquence : type A + détection 6 mA DC (EV RCD, IEC 62955), ou type B.',
    controles: [
      { cle: 'temps', libelle: 'Temps de déclenchement à IΔn', type: 'nombre', unite: 'ms' },
      { cle: 'temps5', libelle: 'Temps de déclenchement à 5 × IΔn', type: 'nombre', unite: 'ms' },
      { cle: 'courant', libelle: 'Courant de déclenchement IΔ', type: 'nombre', unite: 'mA' },
      { cle: 'dc6', libelle: 'Détection 6 mA DC', type: 'okko', na: true },
      { cle: 'resultat', libelle: 'Verdict de l’appareil', type: 'okko' },
    ],
  },
  {
    cle: 'isolement', titre: '8. Isolement (hors tension, CP sur B)', aide: 'R iso de l’autoséquence, conducteur par conducteur contre le PE.',
    controles: [
      { cle: 'l1pe', libelle: 'L1-PE', type: 'nombre', unite: 'MΩ' },
      { cle: 'l2pe', libelle: 'L2-PE', type: 'nombre', unite: 'MΩ', tri: true },
      { cle: 'l3pe', libelle: 'L3-PE', type: 'nombre', unite: 'MΩ', tri: true },
      { cle: 'npe', libelle: 'N-PE', type: 'nombre', unite: 'MΩ' },
      { cle: 'resultat', libelle: 'Verdict de l’appareil', type: 'okko' },
    ],
  },
  {
    cle: 'charge', titre: '9. Test de charge', aide: 'A1532-XA, CP sur C : charge de 13 A au plus (prise 2P+T en mono, fiches bananes en tri). Contrôle le compteur de la borne.',
    controles: [
      { cle: 'courant', libelle: 'Courant délivré', type: 'nombre', unite: 'A' },
      { cle: 'compteur', libelle: 'Compteur de la borne cohérent', type: 'okko' },
    ],
  },
  {
    cle: 'synthese', titre: '10. Synthèse', aide: 'CP sur A avant de débrancher. Photographie l’écran de résumé et enregistre la séquence dans le MW9665 (rapport MESM).', photo: true,
    controles: [{ cle: 'global', libelle: 'Autoséquence réussie et enregistrée', type: 'okko' }],
  },
];

// TD IRVE sans borne (infrastructure collective) : pas d'A1532-XA, contrôles d'installation du MW9665
export const PROTOCOLE_INFRA: EtapeProtocole[] = [
  {
    cle: 'visuel', titre: '1. Contrôle visuel du TD IRVE', aide: 'Avant toute mesure.', photo: true,
    controles: [
      { cle: 'coffret', libelle: 'Coffret : fixation, fermeture, étiquetage', type: 'okko' },
      { cle: 'protections', libelle: 'Protections : calibres, repérage, serrage', type: 'okko' },
      { cle: 'departs', libelle: 'Départs en attente : repérés et protégés', type: 'okko', na: true },
    ],
  },
  {
    cle: 'continuite', titre: '2. Continuité du PE (hors tension)', aide: 'R basse du MW9665 entre la barrette de terre du TD IRVE et les masses.',
    controles: [
      { cle: 'rpe', libelle: 'R continuité PE', type: 'nombre', unite: 'Ω' },
      { cle: 'resultat', libelle: 'Verdict de l’appareil', type: 'okko' },
    ],
  },
  {
    cle: 'isolement', titre: '3. Isolement (hors tension)', aide: 'R iso du MW9665, départs consignés, conducteur par conducteur contre le PE.',
    controles: [
      { cle: 'l1pe', libelle: 'L1-PE', type: 'nombre', unite: 'MΩ' },
      { cle: 'l2pe', libelle: 'L2-PE', type: 'nombre', unite: 'MΩ', tri: true },
      { cle: 'l3pe', libelle: 'L3-PE', type: 'nombre', unite: 'MΩ', tri: true },
      { cle: 'npe', libelle: 'N-PE', type: 'nombre', unite: 'MΩ' },
      { cle: 'resultat', libelle: 'Verdict de l’appareil', type: 'okko' },
    ],
  },
  {
    cle: 'tension', titre: '4. Tension (sous tension)', aide: 'Test de tension du MW9665 en sortie du TD IRVE.',
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
    cle: 'boucle', titre: '5. Impédances (sous tension)', aide: 'Z auto du MW9665 : boucle L-PE sans déclencher le DDR, ligne L-N, tension de contact.',
    controles: [
      { cle: 'zs', libelle: 'Zs boucle L-PE', type: 'nombre', unite: 'Ω' },
      { cle: 'zline', libelle: 'Z ligne L-N', type: 'nombre', unite: 'Ω' },
      { cle: 'ipsc', libelle: 'Courant de court-circuit présumé', type: 'nombre', unite: 'A' },
      { cle: 'uc', libelle: 'Tension de contact Uc', type: 'nombre', unite: 'V' },
      { cle: 'resultat', libelle: 'Verdict de l’appareil', type: 'okko' },
    ],
  },
  {
    cle: 'ddr', titre: '6. Différentiel (sous tension)', aide: 'RCD auto du MW9665 sur le DDR de tête du TD IRVE.',
    controles: [
      { cle: 'temps', libelle: 'Temps de déclenchement à IΔn', type: 'nombre', unite: 'ms' },
      { cle: 'temps5', libelle: 'Temps de déclenchement à 5 × IΔn', type: 'nombre', unite: 'ms' },
      { cle: 'courant', libelle: 'Courant de déclenchement IΔ', type: 'nombre', unite: 'mA' },
      { cle: 'resultat', libelle: 'Verdict de l’appareil', type: 'okko' },
    ],
  },
  {
    cle: 'synthese', titre: '7. Synthèse', aide: 'Photographie l’écran de résumé et enregistre les mesures dans le MW9665 (rapport MESM).', photo: true,
    controles: [{ cle: 'global', libelle: 'Mesures réussies et enregistrées', type: 'okko' }],
  },
];

export type ModeProtocole = 'borne' | 'infra';
export const etapesDe = (mode: ModeProtocole = 'borne'): EtapeProtocole[] => (mode === 'infra' ? PROTOCOLE_INFRA : PROTOCOLE);
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
