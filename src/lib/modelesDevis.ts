// Les modèles de devis Costructor (Phase 8). Le brief de chiffrage (src/lib/briefChiffrage.ts) dit lequel copier.
// Fichier neutre, sans appel réseau. Un modèle ajouté ou renommé dans Costructor se reporte ici (nom exact et identifiant).
// Règles du choix (décisions D5, D6, D10, D13 et questions du 01/11) :
// - COP et PAR : variante selon la source (services généraux ou point de livraison dédié) ;
// - DAP : variante selon la source (services généraux de la copropriété, ou tableau du logement), décision de Mathieu du
//   04/11/2026 (« deux modèles séparés, un pour les SG et l'autre non ») ;
// - RIC : colonne Enedis si la source est « Colonne Enedis », sinon tarif type (fiche au nom d'un syndic ou d'un pro)
//   ou résident (fiche au nom d'un particulier) ;
// - RES : borne, ou prise renforcée (TVA 10 %) si le scénario n'a que des prises ;
// - point de livraison dédié, quel que soit le segment : un devis AMO « Création d'un point de livraison Enedis »
//   séparé, envoyé en premier pour lancer la demande Enedis (01/11, 19 h 23) ;
// - AMO colonne horizontale : hors relevé (Enedis fait tout), jamais choisi par le brief.
// 04/11/2026 (Phase 8, étape 7, passe 2 de la recette) : les 13 modèles de travaux sont refaits en V2 complets
// (Mathieu : « Nomme-le V2, comme ça je peux supprimer l'ancien » ; « mieux des lignes à supprimer qu'à ajouter ») :
// tous les modes de pose, toutes les bornes, prises et options du segment, quantités à 1, TVA du segment ; un texte de
// bibliothèque est placé juste en dessous de l'ouvrage qu'il qualifie (la coupure en tête du Raccordement). Les deux AMO
// sont inchangés. ADMIN-CREATION-PDL n'est plus dans les devis de travaux sur PDL dédié : il est porté par l'AMO.
// 04/11/2026, 22 h 15 (passe 3, cas 1, choix de Mathieu) : LIA-ROUTEUR ajouté juste sous INFRA-COP-ROUTEUR dans RES, DAP SG,
// DAP hors SG, PAR SG et PAR PDL (COP, FLT et TER l'avaient déjà).
// 05/11/2026, 7 h 31 (passe 3, cas 6, choix de Mathieu) : COP SG et COP PDL V2 ont directement les percements -40 (gaine
// Ø40 du 5G25) dans leurs deux sous-sections Cheminement, à la place des percements normaux.
// 05/11/2026, 10 h 58 (passe 3, cas 11, accord de Mathieu) : RIC colonne V2 a une sous-section Cheminement en section 1,
// entre Raccordement et TD IRVE (LIA-TUBE-3G10 × 5, LIA-DATA-TIC × 5), pour la liaison Linky → coffret.
// 06/11/2026 (Phase 9, lot 3 ; Mathieu : « nous n'avons pas de modèle de devis pour la prise renforcée en droit à la
// prise », puis « Prise possible seulement sur colonne Enedis » et « fais-le toi-même », 18 h 47 ; branchement accordé à
// 19 h 08) : trois modèles prise renforcée, copies de « MODÈLE RES · Prise renforcée V2 » (même pied de devis : mention
// TVA 10 % et conditions de paiement), TVA 10 %, sans ADVENIR : DAP SG (coupure TGBT, sous-compteur MID), DAP hors SG
// (coupure tableau), RIC colonne Enedis (Linky de la place, 5 m + 5 m de tube apparent 3G2.5, Consuel PDL Enedis). Pas
// de prise sur l'infra collective CHARGéO. Une prise seule prend la version prise du modèle (VERSION_PRISE).

export type CleModele =
  | 'COP_PDL' | 'COP_SG' | 'PAR_SG' | 'PAR_PDL' | 'RIC_TARIF_TYPE' | 'RIC_RESIDENT' | 'RIC_COLONNE' | 'RIC_COLONNE_PRISE'
  | 'RES' | 'RES_PRISE' | 'DAP_SG' | 'DAP_SG_PRISE' | 'DAP_HSG' | 'DAP_HSG_PRISE' | 'FLT' | 'TER' | 'AMO_PDL' | 'AMO_COLONNE';

export type ModeleDevis = { cle: CleModele; nom: string; id: string; tva: string };

export const MODELES: Record<CleModele, ModeleDevis> = {
  COP_PDL: { cle: 'COP_PDL', nom: 'MODÈLE COP PDL · Infrastructure collective sur PDL dédié V2', id: 'quote_01m6kdqz4yak5j3grn04kxjbc3', tva: '5,5 %' },
  COP_SG: { cle: 'COP_SG', nom: 'MODÈLE COP SG · Infrastructure collective sur services généraux V2', id: 'quote_01m6kbwdqhztrs97j1kh66v5jw', tva: '5,5 %' },
  PAR_SG: { cle: 'PAR_SG', nom: 'MODÈLE PAR SG · Borne partagée sur services généraux V2', id: 'quote_01m6k46jg47skh8vyh7y17e8z6', tva: '5,5 %' },
  PAR_PDL: { cle: 'PAR_PDL', nom: 'MODÈLE PAR PDL · Borne partagée sur PDL dédié V2', id: 'quote_01m6k4mdvxzcz4krnvfj1bj683', tva: '5,5 %' },
  RIC_TARIF_TYPE: { cle: 'RIC_TARIF_TYPE', nom: "MODÈLE RIC · Tarif type résident (avec l'infrastructure) V2", id: 'quote_01m6kf5f69cqpn7t38yyqsw3fb', tva: '5,5 %' },
  RIC_RESIDENT: { cle: 'RIC_RESIDENT', nom: 'MODÈLE RIC · Résident (vrai devis) V2', id: 'quote_01m6kgyezn1bt94g5azbannr3r', tva: '5,5 %' },
  RIC_COLONNE: { cle: 'RIC_COLONNE', nom: 'MODÈLE RIC · Résident sur colonne Enedis V2', id: 'quote_01m6khee5bvnx3e77679b3akn9', tva: '5,5 %' },
  RIC_COLONNE_PRISE: { cle: 'RIC_COLONNE_PRISE', nom: 'MODÈLE RIC · Prise renforcée sur colonne Enedis V2', id: 'quote_01m6s0bv853w5mcktxzhkvmfv7', tva: '10 %' },
  RES: { cle: 'RES', nom: 'MODÈLE RES · Résidentiel V2', id: 'quote_01m6js6t3wqbr90heerdwembcp', tva: '5,5 %' },
  RES_PRISE: { cle: 'RES_PRISE', nom: 'MODÈLE RES · Prise renforcée V2', id: 'quote_01m6jxzwtdtj61n0bvtgnmpxnj', tva: '10 %' },
  DAP_SG: { cle: 'DAP_SG', nom: 'MODÈLE DAP SG · Droit à la prise sur services généraux V2', id: 'quote_01m6jyvw4rdndytk1j7pqkawdm', tva: '5,5 %' },
  DAP_SG_PRISE: { cle: 'DAP_SG_PRISE', nom: 'MODÈLE DAP SG · Prise renforcée sur services généraux V2', id: 'quote_01m6s09dgcf2fr3tevn0hbr1zv', tva: '10 %' },
  DAP_HSG: { cle: 'DAP_HSG', nom: 'MODÈLE DAP hors SG · Droit à la prise sur tableau du logement V2', id: 'quote_01m6k1ejdvdc5fr6pm0cyhmmmn', tva: '5,5 %' },
  DAP_HSG_PRISE: { cle: 'DAP_HSG_PRISE', nom: 'MODÈLE DAP hors SG · Prise renforcée sur tableau du logement V2', id: 'quote_01m6s0b21qgr0w86b404aemkz4', tva: '10 %' },
  FLT: { cle: 'FLT', nom: 'MODÈLE FLT · Flotte V2', id: 'quote_01m6kjvpb9psf6b15ae8dc2602', tva: '20 %' },
  TER: { cle: 'TER', nom: 'MODÈLE TER · Tertiaire V2', id: 'quote_01m6km0matvbnh6aqzf8wq56gh', tva: '20 %' },
  AMO_PDL: { cle: 'AMO_PDL', nom: "MODÈLE AMO · Création d'un point de livraison Enedis", id: 'quote_01m6bsrq9akgea3yp5ws69trqa', tva: '20 %' },
  AMO_COLONNE: { cle: 'AMO_COLONNE', nom: 'MODÈLE AMO · Colonne horizontale Enedis (Réseau Électrique Auto)', id: 'quote_01m6bst6m24hjqprjc7y7721ds', tva: '20 %' },
};

// Version prise renforcée d'un modèle de borne (06/11) : choisie par le brief quand le scénario n'a que des prises.
// Les autres segments (PAR, COP, FLT, TER, RIC sur l'infra CHARGéO) n'en ont pas.
export const VERSION_PRISE: Partial<Record<CleModele, CleModele>> = {
  RES: 'RES_PRISE', DAP_SG: 'DAP_SG_PRISE', DAP_HSG: 'DAP_HSG_PRISE', RIC_COLONNE: 'RIC_COLONNE_PRISE',
};
export const MODELES_PRISE = new Set<CleModele>(['RES_PRISE', 'DAP_SG_PRISE', 'DAP_HSG_PRISE', 'RIC_COLONNE_PRISE']);

export const lienModele = (m: ModeleDevis) => `https://app.costructor.co/quotes/${m.id}`;

// ---- Plan de chaque modèle (V2 relus dans Costructor le 04/11/2026) ----
// Le brief suit ce plan : mêmes sections, mêmes sous-sections, dans le même ordre, et dit pour chaque ligne du modèle
// quoi en faire (garder, changer la quantité, remplacer la section du câble, retirer), puis place les lignes à ajouter
// dans la bonne sous-section. Si un modèle est modifié dans Costructor (ligne, quantité, sous-section), son plan se met à
// jour ici.
// zone : où va chaque ligne du relevé. chemAmont = cheminement qui arrive au TD IRVE / coffret (ou part du
// raccordement) ; chemAval = cheminement vers la borne, la prise ou les boîtes (artère) ; pilotage = sous-section
// « Gestionnaire de charge » de la section Communication (repli dans le TD IRVE / coffret si le modèle ne l'a pas) ;
// logistique = déplacement (dans Prestations).
export type Zone =
  | 'raccordement' | 'chemAmont' | 'td' | 'chemAval' | 'boite' | 'borne' | 'prise' | 'autre'
  | 'pilotage' | 'communication' | 'prestations' | 'logistique';
export const ORDRE_ZONES: Zone[] = [
  'raccordement', 'chemAmont', 'td', 'chemAval', 'boite', 'borne', 'prise', 'autre', 'communication', 'pilotage', 'prestations', 'logistique',
];
// Zones par point de recharge (sections « POINT DE RECHARGE N°1 », à dupliquer s'il y a plusieurs points)
export const ZONES_PAR_POINT: Zone[] = ['chemAval', 'borne', 'prise', 'autre'];
export const NOM_ZONE: Record<Zone, string> = {
  raccordement: 'Raccordement', chemAmont: 'Cheminement', td: 'TD IRVE / coffret', chemAval: 'Cheminement',
  boite: 'Boîte de dérivation', borne: 'Borne', prise: 'Prise renforcée', autre: 'Autre', pilotage: 'Gestionnaire de charge',
  communication: 'Communication', prestations: 'Prestations', logistique: 'Prestations',
};
// Repli quand le modèle n'a pas la sous-section
export const REPLI_ZONE: Partial<Record<Zone, Zone>> = { pilotage: 'td', logistique: 'prestations' };

// texte : libellé court d'un texte du modèle (ligne sans prix) ; ref = code du texte côté brief quand il en a un
export type LigneModele = { ref: string; qte?: number; texte?: string };
export type SousSectionModele = { zone: Zone; lignes: LigneModele[] };
export type SectionModele = { titre: string; parPoint?: boolean; sous: SousSectionModele[] };

// Textes posés seulement si le relevé les demande (sinon ✖ dans le brief). Les autres textes du modèle restent toujours.
export const TEXTES_CONDITIONNELS = new Set<string>([
  'JUR-COUPURE-TABLEAU', 'JUR-COUPURE-TGBT', 'JUR-RESERVE-EXISTANT', 'JUR-AUGM-PUISSANCE', 'JUR-PUISSANCE-SANS-DELESTAGE',
  'INFO-TRANCHEE-TERRASSIER', 'JUR-AUTORISATION-FACADE',
]);

const T = (ref: string, texte: string): LigneModele => ({ ref, texte });
const P = (ref: string, qte = 1): LigneModele => ({ ref, qte });
const Ps = (...refs: string[]): LigneModele[] => refs.map((r) => P(r));

// Textes de bibliothèque
const COUPURE_TABLEAU = T('JUR-COUPURE-TABLEAU', 'Coupure électrique pendant les travaux (tableau du logement)');
const COUPURE_TGBT = T('JUR-COUPURE-TGBT', 'Coupure électrique pendant les travaux (TGBT des services généraux)');
const RESERVE = T('JUR-RESERVE-EXISTANT', "Réserve sur l'installation existante");
const AUGM = T('JUR-AUGM-PUISSANCE', 'Augmentation de puissance');
const SANS_DELESTAGE = T('JUR-PUISSANCE-SANS-DELESTAGE', 'Puissance sans gestion de charge');
const TRANCHEE = T('INFO-TRANCHEE-TERRASSIER', 'Tranchée par un terrassier');
const FACADE = T('JUR-AUTORISATION-FACADE', 'Autorisation de passage en façade');
const ADV_PARTAGE = T('INFO-ADVENIR-PARTAGE', 'Aides financières, prime ADVENIR point de recharge partagé');
const ADV_INDIV = T('INFO-ADVENIR-INDIVIDUEL', 'Aides financières, prime ADVENIR point de recharge individuel');
const ADV_INFRA = T('INFO-ADVENIR-INFRA', 'Aides financières, prime ADVENIR infrastructure collective');
const CONSUEL_COPRO = T('JUR-CONSUEL-COPRO', 'Attestation Consuel, obligation légale en habitat collectif');
const CONSUEL_PDL = T('JUR-CONSUEL-PDL-ENEDIS', 'Attestation Consuel, obligation pour la mise en service du compteur');
const CONVENTION = T('', "Convention d'exploitation");
const LINKY = T('INFO-RACC-LINKY-ENEDIS', 'Raccordement sur compteur Linky Enedis');

// Blocs d'ouvrages communs
const MODES = ['TUBE', 'GOUL', 'CDC-EX', 'VIDE', 'ENC', 'TIR', 'ENT'];
const cables = (section: string) => MODES.map((m) => P(`LIA-${m}-${section}`));
const PERCEMENTS = Ps('PER-PLACO', 'PER-PARPAING', 'PER-BETON', 'PER-DALLE');
// COP : percements -40 directement dans le modèle (05/11, 7 h 31), le 5G25 passe en gaine Ø40
const PERCEMENTS_40 = Ps('PER-PLACO-40', 'PER-PARPAING-40', 'PER-BETON-40', 'PER-DALLE-40');
const DEPARTS = Ps('DEPART-TGBT-MONO-40', 'DEPART-TGBT-TRI-40');
const TERRES = Ps('TERRE-RENF', 'TERRE-PIQ');
const PDL = Ps('LIA-PDL-MONO-2X16', 'LIA-PDL-TRI-4X16');
const COFFRETS = Ps('COFF-MONO-7K', 'COFF-MONO-7K-MOD', 'COFF-MONO-3K', 'COFF-TRI-11K', 'COFF-TRI-11K-MOD', 'COFF-TRI-22K', 'COFF-TRI-22K-MOD');
const TD_PARTAGE = Ps('INFRA-TD-TRI-2D22-H10', 'INFRA-TD-TRI-3D22-H10');
const ZONES_DEP = Ps('LOG-DEP-Z1', 'LOG-DEP-Z2', 'LOG-DEP-Z3');
const PILOTAGES = Ps('INFRA-COP-PILOTAGE-10', 'INFRA-COP-PILOTAGE-20', 'INFRA-COP-PILOTAGE-150');
const COMPTAGES = Ps('INFRA-COP-COMPTAGE-MONO', 'INFRA-COP-COMPTAGE-TRI');
const PRISES = Ps('PRISE-HAG-3K', 'PRISE-LEG-3K', 'PRISE-SCH-3K');
const OPTIONS = Ps('OPT-BADGE-LOCAL', 'OPT-BADGE-EMSP', 'OPT-ARCEAU-PROT');
const CHEM_AMONT = [...cables('3G10'), ...Ps('LIA-DATA-TIC', 'LIA-DATA-MOD', 'LIA-DATA-RJ45', 'LIA-ENT-RJ45'), ...PERCEMENTS, TRANCHEE, FACADE];
const CHEM_AVAL = [...cables('3G10'), ...Ps('LIA-DATA-TIC', 'LIA-DATA-RJ45', 'LIA-ENT-RJ45'), ...PERCEMENTS, TRANCHEE, FACADE];
const BORNES = Ps(
  'BORNE-HAG-WONE-7', 'BORNE-HAG-WONE-11', 'BORNE-HAG-WPLUS-22', 'BORNE-LEG-HOME-3', 'BORNE-LEG-HOME-7', 'BORNE-LEG-DUO-22',
  'BORNE-PEB-HOME-7', 'BORNE-PEB-BUS-22', 'BORNE-PEB-DUAL', 'BORNE-SCH-CHG-22', 'BORNE-SCH-PRO-22', 'PIED-PEB-S', 'PIED-PEB-DUAL',
  'SERV-SETUP-PDC-LOCAL', 'SERV-SETUP-PDC', 'DEPOSE-BORNE',
);
// FLT et TER : ordre du modèle, mise en service supervisée en dernier, sans dépose
const BORNES_PRO = Ps(
  'BORNE-HAG-WPLUS-22', 'BORNE-HAG-WONE-7', 'BORNE-HAG-WONE-11', 'BORNE-SCH-CHG-22', 'BORNE-SCH-PRO-22', 'BORNE-LEG-HOME-3',
  'BORNE-LEG-HOME-7', 'BORNE-LEG-DUO-22', 'BORNE-PEB-HOME-7', 'BORNE-PEB-BUS-22', 'BORNE-PEB-DUAL', 'PIED-PEB-S', 'PIED-PEB-DUAL',
  'SERV-SETUP-PDC',
);
// RIC : bornes simples seulement
const BORNES_RIC = Ps(
  'BORNE-HAG-WPLUS-22', 'BORNE-HAG-WONE-7', 'BORNE-HAG-WONE-11', 'BORNE-SCH-CHG-22', 'BORNE-SCH-PRO-22', 'BORNE-LEG-HOME-3',
  'BORNE-LEG-HOME-7', 'BORNE-PEB-HOME-7', 'BORNE-PEB-BUS-22',
);
const COFFRETS_RIC = Ps('COFF-MONO-7K', 'COFF-TRI-11K', 'COFF-TRI-22K');

const ALIM = (racc: LigneModele[], amont: LigneModele[], td: LigneModele[], titre = '1. ALIMENTATION & PROTECTION IRVE'): SectionModele => ({
  titre,
  sous: [{ zone: 'raccordement', lignes: racc }, { zone: 'chemAmont', lignes: amont }, { zone: 'td', lignes: td }],
});
const POINT_N1 = (sous: SousSectionModele[]): SectionModele => ({ titre: '2. POINT DE RECHARGE N°1', parPoint: true, sous });
const POINT_COMPLET = (bornes = BORNES): SectionModele => POINT_N1([
  { zone: 'chemAval', lignes: CHEM_AVAL }, { zone: 'borne', lignes: bornes }, { zone: 'prise', lignes: PRISES }, { zone: 'autre', lignes: OPTIONS },
]);
const COMMUNICATION = (com: LigneModele[], gestionnaire?: LigneModele[]): SectionModele => ({
  titre: '3. COMMUNICATION',
  sous: [{ zone: 'communication', lignes: com }, ...(gestionnaire ? [{ zone: 'pilotage' as Zone, lignes: gestionnaire }] : [])],
});
const PRESTATIONS = (lignes: LigneModele[], titre = '4. PRESTATIONS GLOBALES & CONFORMITÉ'): SectionModele => ({ titre, sous: [{ zone: 'prestations', lignes }] });

// Raccordement sur un tableau existant (logement ou TGBT des services généraux)
const RACC_TABLEAU = (coupure: LigneModele) => [coupure, ...DEPARTS, RESERVE, P('ADMIN-AUGM-PDL'), AUGM, ...TERRES];
const RACC_PDL = [...PDL, RESERVE, ...TERRES];

const PLAN_RES: SectionModele[] = [
  ALIM(RACC_TABLEAU(COUPURE_TABLEAU), CHEM_AMONT, [...COFFRETS, SANS_DELESTAGE]),
  POINT_COMPLET(),
  COMMUNICATION(Ps('INFRA-COP-ROUTEUR', 'LIA-ROUTEUR', 'OPT-4G-HAG')),
  PRESTATIONS([P('ADMIN-CONSUEL'), ...ZONES_DEP]),
];

const CHEM_PRISE = [...cables('3G2.5'), ...PERCEMENTS, TRANCHEE, FACADE];
const PLAN_RES_PRISE: SectionModele[] = [
  ALIM([COUPURE_TABLEAU, P('ADMIN-AUGM-PDL'), AUGM, ...TERRES, RESERVE], CHEM_PRISE, [P('COFF-MONO-3K')]),
  POINT_N1([{ zone: 'chemAval', lignes: CHEM_PRISE }, { zone: 'prise', lignes: PRISES }, { zone: 'autre', lignes: [P('OPT-ARCEAU-PROT')] }]),
  PRESTATIONS([P('ADMIN-CONSUEL'), ...ZONES_DEP], '3. PRESTATIONS GLOBALES & CONFORMITÉ'),
];

// Prises renforcées DAP et RIC colonne (06/11, copies de RES prise V2 relues dans Costructor le 06/11)
const POINT_PRISE = (chem: LigneModele[]): SectionModele => POINT_N1([
  { zone: 'chemAval', lignes: chem }, { zone: 'prise', lignes: PRISES }, { zone: 'autre', lignes: [P('OPT-ARCEAU-PROT')] },
]);
const PLAN_DAP_PRISE = (sg: boolean): SectionModele[] => [
  ALIM(
    [sg ? COUPURE_TGBT : COUPURE_TABLEAU, P('ADMIN-AUGM-PDL'), AUGM, ...TERRES, RESERVE],
    CHEM_PRISE,
    [...(sg ? [P('MID-SOUS-COMPTAGE')] : []), P('COFF-MONO-3K')],
  ),
  POINT_PRISE(CHEM_PRISE),
  PRESTATIONS([P('ADMIN-CONSUEL'), CONSUEL_COPRO, P('ADMIN-DAP'), ...ZONES_DEP], '3. PRESTATIONS GLOBALES & CONFORMITÉ'),
];
// RIC colonne : forfait 5 m + 5 m de tube apparent 3G2.5 (Linky → coffret, coffret → prise)
const PLAN_RIC_COLONNE_PRISE: SectionModele[] = [
  ALIM([LINKY], [P('LIA-TUBE-3G2.5', 5)], [P('COFF-MONO-3K')]),
  POINT_PRISE([P('LIA-TUBE-3G2.5', 5)]),
  PRESTATIONS([P('ADMIN-CONSUEL'), CONSUEL_PDL, ...ZONES_DEP], '3. PRESTATIONS GLOBALES & CONFORMITÉ'),
];

const PLAN_DAP = (sg: boolean): SectionModele[] => [
  ALIM(RACC_TABLEAU(sg ? COUPURE_TGBT : COUPURE_TABLEAU), CHEM_AMONT, [...(sg ? [P('MID-SOUS-COMPTAGE')] : []), ...COFFRETS, SANS_DELESTAGE]),
  POINT_COMPLET(),
  COMMUNICATION(Ps('INFRA-COP-ROUTEUR', 'LIA-ROUTEUR', 'OPT-4G-HAG')),
  PRESTATIONS(sg
    ? [P('ADMIN-CONSUEL'), CONSUEL_COPRO, P('ADMIN-DAP'), P('ADMIN-ADVENIR'), ADV_INDIV, ...ZONES_DEP]
    : [P('ADMIN-CONSUEL'), CONSUEL_COPRO, P('ADMIN-DAP'), ...ZONES_DEP]),
];

const PLAN_PAR = (sg: boolean): SectionModele[] => [
  ALIM(sg ? RACC_TABLEAU(COUPURE_TGBT) : RACC_PDL, CHEM_AMONT, [...COFFRETS, ...TD_PARTAGE, SANS_DELESTAGE]),
  POINT_COMPLET(),
  COMMUNICATION(Ps('INFRA-COP-ROUTEUR', 'LIA-ROUTEUR', 'OPT-4G-HAG', 'SERV-SETUP-SUPERVISION', 'SERV-SETUP-SUPERVISION-REFACT'), sg ? [...PILOTAGES, ...COMPTAGES] : PILOTAGES),
  PRESTATIONS([P('ADMIN-CONSUEL'), CONSUEL_COPRO, ...(sg ? [] : [CONSUEL_PDL]), P('ADMIN-ADVENIR'), ADV_PARTAGE, ...ZONES_DEP]),
];

const PLAN_COP = (sg: boolean): SectionModele[] => [
  ALIM(
    sg ? [COUPURE_TGBT, RESERVE, P('ADMIN-AUGM-PDL'), AUGM, ...TERRES] : RACC_PDL,
    [...Ps('LIA-TUBE-5G25', 'LIA-CDC-5G25', 'LIA-ENT-5G25'), ...(sg ? [P('LIA-DATA-MOD')] : []), ...PERCEMENTS_40, TRANCHEE],
    Ps('INFRA-COP-TETE-MONO', 'INFRA-COP-TETE-TRI'),
    '1. INFRASTRUCTURE & TÊTE DE DISTRIBUTION',
  ),
  {
    titre: '2. ARTÈRE DE DISTRIBUTION DU PARKING',
    sous: [
      { zone: 'chemAval', lignes: [...Ps('LIA-CDC-5G25', 'LIA-TUBE-5G25', 'LIA-ENT-5G25', 'LIA-DATA-RJ45', 'LIA-ENT-RJ45'), ...PERCEMENTS_40, TRANCHEE] },
      { zone: 'boite', lignes: [P('INFRA-COP-BOITE')] },
    ],
  },
  COMMUNICATION([...Ps('INFRA-COP-ROUTEUR', 'LIA-ROUTEUR', 'SERV-SETUP-SUPERVISION'), CONVENTION], sg ? [...PILOTAGES, ...COMPTAGES] : PILOTAGES),
  PRESTATIONS([
    ...Ps('SERV-ETUDE-COP', 'ADMIN-CONTROLE', 'ADMIN-CONSUEL'), CONSUEL_COPRO, ...(sg ? [] : [CONSUEL_PDL]), P('ADMIN-ADVENIR'), ADV_INFRA, ...ZONES_DEP,
  ]),
];

// RIC colonne : Cheminement Linky → coffret en section 1 depuis le 05/11 (cas 11)
const PLAN_RIC = (colonne: boolean): SectionModele[] => [
  {
    titre: '1. ALIMENTATION & PROTECTION IRVE',
    sous: colonne
      ? [{ zone: 'raccordement', lignes: [LINKY] }, { zone: 'chemAmont', lignes: [P('LIA-TUBE-3G10', 5), P('LIA-DATA-TIC', 5)] }, { zone: 'td', lignes: COFFRETS_RIC }]
      : [{ zone: 'chemAmont', lignes: [P('LIA-DERIV-3G25', 5), P('LIA-DATA-RJ45', 5)] }, { zone: 'td', lignes: COFFRETS_RIC }],
  },
  POINT_N1([
    { zone: 'chemAval', lignes: [P('LIA-TUBE-3G10', 5), P(colonne ? 'LIA-DATA-TIC' : 'LIA-DATA-RJ45', 5)] },
    { zone: 'borne', lignes: [...BORNES_RIC, P(colonne ? 'SERV-SETUP-PDC-LOCAL' : 'SERV-SETUP-PDC')] },
    { zone: 'autre', lignes: [P('OPT-BADGE-LOCAL')] },
  ]),
  PRESTATIONS(colonne
    ? [P('ADMIN-CONSUEL'), CONSUEL_PDL, P('ADMIN-ADVENIR'), ADV_INDIV, ...ZONES_DEP]
    : [P('ADMIN-ADVENIR'), ADV_INDIV, ...ZONES_DEP], '3. PRESTATIONS GLOBALES & CONFORMITÉ'),
];

const CHEM_AMONT_PRO = [...cables('3G10'), ...Ps('LIA-DATA-TIC', 'LIA-DATA-MOD', 'LIA-DATA-RJ45', 'LIA-ENT-RJ45'), ...PERCEMENTS, TRANCHEE];
const CHEM_AVAL_PRO = [...cables('3G10'), ...Ps('LIA-DATA-TIC', 'LIA-DATA-RJ45', 'LIA-ENT-RJ45'), ...PERCEMENTS, TRANCHEE];
const PLAN_PRO = (supervision: string): SectionModele[] => [
  ALIM(
    [COUPURE_TABLEAU, ...DEPARTS, P('ADMIN-AUGM-PDL'), AUGM, ...PDL, RESERVE, ...TERRES],
    CHEM_AMONT_PRO,
    [...Ps('COFF-MONO-3K', 'COFF-MONO-7K', 'COFF-MONO-7K-MOD', 'COFF-TRI-11K', 'COFF-TRI-11K-MOD', 'COFF-TRI-22K', 'COFF-TRI-22K-MOD'), ...TD_PARTAGE, SANS_DELESTAGE],
  ),
  POINT_N1([
    { zone: 'chemAval', lignes: CHEM_AVAL_PRO }, { zone: 'borne', lignes: BORNES_PRO }, { zone: 'prise', lignes: PRISES }, { zone: 'autre', lignes: OPTIONS },
  ]),
  COMMUNICATION(Ps('INFRA-COP-ROUTEUR', 'LIA-ROUTEUR', 'OPT-4G-HAG', supervision), [...PILOTAGES, ...COMPTAGES]),
  PRESTATIONS([P('ADMIN-CONSUEL-VERT'), ...ZONES_DEP]),
];

export const PLANS: Record<CleModele, SectionModele[]> = {
  COP_PDL: PLAN_COP(false),
  COP_SG: PLAN_COP(true),
  PAR_SG: PLAN_PAR(true),
  PAR_PDL: PLAN_PAR(false),
  RIC_TARIF_TYPE: PLAN_RIC(false),
  RIC_RESIDENT: PLAN_RIC(false),
  RIC_COLONNE: PLAN_RIC(true),
  RIC_COLONNE_PRISE: PLAN_RIC_COLONNE_PRISE,
  RES: PLAN_RES,
  RES_PRISE: PLAN_RES_PRISE,
  DAP_SG: PLAN_DAP(true),
  DAP_SG_PRISE: PLAN_DAP_PRISE(true),
  DAP_HSG: PLAN_DAP(false),
  DAP_HSG_PRISE: PLAN_DAP_PRISE(false),
  FLT: PLAN_PRO('SERV-SETUP-SUPERVISION'),
  TER: PLAN_PRO('SERV-SETUP-SUPERVISION-REFACT'),
  AMO_PDL: [{ titre: "1. ASSISTANCE À MAÎTRISE D'OUVRAGE", sous: [{ zone: 'prestations', lignes: [P('ADMIN-CREATION-PDL'), CONSUEL_PDL, P('LOG-DEP-Z1')] }] }],
  AMO_COLONNE: [], // hors relevé, jamais choisi par le brief
};
