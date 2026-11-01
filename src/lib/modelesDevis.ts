// Les 14 modèles de devis Costructor (Phase 8, clôture de l'étape 3 du 01/11/2026, 18 h 30).
// Le brief de chiffrage (src/lib/briefChiffrage.ts) dit lequel copier. Fichier neutre, sans appel réseau.
// Un modèle ajouté ou renommé dans Costructor se reporte ici (nom exact et identifiant).
// Règles du choix (décisions D5, D6, D10, D13 et questions du 01/11) :
// - COP et PAR : variante selon la source (services généraux ou point de livraison dédié) ;
// - RIC : colonne Enedis si la source est « Colonne Enedis », sinon tarif type (fiche au nom d'un syndic ou d'un pro)
//   ou résident (fiche au nom d'un particulier) ;
// - RES : borne, ou prise renforcée (TVA 10 %) si le scénario n'a que des prises ;
// - point de livraison dédié, quel que soit le segment : un devis AMO « Création d'un point de livraison Enedis »
//   séparé, envoyé en premier pour lancer la demande Enedis (01/11, 19 h 23) ;
// - AMO colonne horizontale : hors relevé (Enedis fait tout), jamais choisi par le brief.

export type CleModele =
  | 'COP_PDL' | 'COP_SG' | 'PAR_SG' | 'PAR_PDL' | 'RIC_TARIF_TYPE' | 'RIC_RESIDENT' | 'RIC_COLONNE'
  | 'RES' | 'RES_PRISE' | 'DAP' | 'FLT' | 'TER' | 'AMO_PDL' | 'AMO_COLONNE';

export type ModeleDevis = { cle: CleModele; nom: string; id: string; tva: string };

export const MODELES: Record<CleModele, ModeleDevis> = {
  COP_PDL: { cle: 'COP_PDL', nom: 'MODÈLE COP · Infrastructure collective sur PDL dédié', id: 'quote_01m66syj25agr2z9g4ckzknzp7', tva: '5,5 %' },
  COP_SG: { cle: 'COP_SG', nom: 'MODÈLE COP · Infrastructure collective sur services généraux', id: 'quote_01m6bt1qvy2rtk38az096tx9h5', tva: '5,5 %' },
  PAR_SG: { cle: 'PAR_SG', nom: 'MODÈLE PAR · Borne partagée sur services généraux', id: 'quote_01m66xwvqjwzgnq7ztjw4d79zd', tva: '5,5 %' },
  PAR_PDL: { cle: 'PAR_PDL', nom: 'MODÈLE PAR · Borne partagée sur PDL dédié', id: 'quote_01m6bswa32xfj11f2nm6z8w5xg', tva: '5,5 %' },
  RIC_TARIF_TYPE: { cle: 'RIC_TARIF_TYPE', nom: "MODÈLE RIC · Tarif type résident (avec l'infrastructure)", id: 'quote_01m66xxmnzx2nm9xw97bttpn4x', tva: '5,5 %' },
  RIC_RESIDENT: { cle: 'RIC_RESIDENT', nom: 'MODÈLE RIC · Résident (vrai devis)', id: 'quote_01m66xys2taehgs4gz0v9d4359', tva: '5,5 %' },
  RIC_COLONNE: { cle: 'RIC_COLONNE', nom: 'MODÈLE RIC · Résident sur colonne Enedis', id: 'quote_01m6bt5b9ykcje24havcqn7sx8', tva: '5,5 %' },
  RES: { cle: 'RES', nom: 'MODÈLE RES · Résidentiel', id: 'quote_01m66xzazjd9xkpymnn0z3142c', tva: '5,5 %' },
  RES_PRISE: { cle: 'RES_PRISE', nom: 'MODÈLE RES · Prise renforcée (TVA 10 %)', id: 'quote_01kz1rv25k9ktzrgzw1p1hmcjt', tva: '10 %' },
  DAP: { cle: 'DAP', nom: 'MODÈLE DAP · Droit à la prise', id: 'quote_01m66xzm3ahyrea7x401xzbyt2', tva: '5,5 %' },
  FLT: { cle: 'FLT', nom: 'MODÈLE FLT · Flotte', id: 'quote_01m66xzsrb9pnp5ybn4sgwm7vg', tva: '20 %' },
  TER: { cle: 'TER', nom: 'MODÈLE TER · Tertiaire', id: 'quote_01m66xzypz4m7d7rxde772g98q', tva: '20 %' },
  AMO_PDL: { cle: 'AMO_PDL', nom: "MODÈLE AMO · Création d'un point de livraison Enedis", id: 'quote_01m6bsrq9akgea3yp5ws69trqa', tva: '20 %' },
  AMO_COLONNE: { cle: 'AMO_COLONNE', nom: 'MODÈLE AMO · Colonne horizontale Enedis (Réseau Électrique Auto)', id: 'quote_01m6bst6m24hjqprjc7y7721ds', tva: '20 %' },
};

export const lienModele = (m: ModeleDevis) => `https://app.costructor.co/quotes/${m.id}`;

// ---- Plan de chaque modèle (lu dans Costructor le 01/11/2026 vers 20 h 15, totaux inchangés) ----
// Le brief suit ce plan : mêmes sections, mêmes sous-sections, dans le même ordre, et dit pour chaque ligne du modèle
// quoi en faire (garder, changer la quantité, remplacer, à vérifier), puis place les lignes à ajouter dans la bonne
// sous-section. Si un modèle est modifié dans Costructor (ligne, quantité, sous-section), son plan se met à jour ici.
// zone : où va chaque ligne du relevé. chemAmont = cheminement qui arrive au TD IRVE / coffret (ou part du
// raccordement) ; chemAval = cheminement vers la borne, la prise ou les boîtes (artère) ; pilotage = gestionnaire de
// charge (sous-section « TD IRVE / coffret » de la section pilotage en COP, sinon celle de la section 1) ;
// logistique = déplacement (section 5 en COP, sinon Prestations).
export type Zone =
  | 'raccordement' | 'chemAmont' | 'td' | 'chemAval' | 'boite' | 'borne' | 'prise' | 'autre'
  | 'pilotage' | 'communication' | 'prestations' | 'logistique';
export const ORDRE_ZONES: Zone[] = [
  'raccordement', 'chemAmont', 'td', 'chemAval', 'boite', 'borne', 'prise', 'autre', 'pilotage', 'communication', 'prestations', 'logistique',
];
// Zones par point de recharge (sections « POINT DE RECHARGE N°1 », à dupliquer s'il y a plusieurs points)
export const ZONES_PAR_POINT: Zone[] = ['chemAval', 'borne', 'prise', 'autre'];
export const NOM_ZONE: Record<Zone, string> = {
  raccordement: 'Raccordement', chemAmont: 'Cheminement', td: 'TD IRVE / coffret', chemAval: 'Cheminement',
  boite: 'Boîte de dérivation', borne: 'Borne', prise: 'Prise renforcée', autre: 'Autre', pilotage: 'TD IRVE / coffret',
  communication: 'Communication', prestations: 'Prestations', logistique: 'Prestations',
};
// Repli quand le modèle n'a pas la sous-section
export const REPLI_ZONE: Partial<Record<Zone, Zone>> = { pilotage: 'td', logistique: 'prestations' };

// texte : libellé court d'un texte du modèle (ligne sans prix) ; ref = code du texte côté brief quand il en a un
export type LigneModele = { ref: string; qte?: number; texte?: string };
export type SousSectionModele = { zone: Zone; lignes: LigneModele[] };
export type SectionModele = { titre: string; parPoint?: boolean; sous: SousSectionModele[] };

const T = (ref: string, texte: string): LigneModele => ({ ref, texte });
const P = (ref: string, qte = 1): LigneModele => ({ ref, qte });
const COUPURE = T('JUR-COUPURE-TGBT', 'Coupure électrique pendant les travaux');
const ADV_PARTAGE = T('INFO-ADVENIR-PARTAGE', 'Aides financières, prime ADVENIR point de recharge partagé');
const ADV_INDIV = T('INFO-ADVENIR-INDIVIDUEL', 'Aides financières, prime ADVENIR point de recharge individuel');
const ADV_INFRA = T('INFO-ADVENIR-INFRA', 'Aides financières, prime ADVENIR infrastructure collective');
const CONSUEL_COPRO = T('JUR-CONSUEL-COPRO', 'Attestation Consuel, obligation légale en habitat collectif');
const CONSUEL_PDL = T('JUR-CONSUEL-PDL-ENEDIS', 'Attestation Consuel, obligation pour la mise en service du compteur');
const CONVENTION = T('', "Convention d'exploitation");
const LINKY = T('INFO-RACC-LINKY-ENEDIS', 'Raccordement sur compteur Linky Enedis');

const ALIM = (racc: LigneModele[] = [], td: LigneModele[] = []): SectionModele => ({
  titre: '1. ALIMENTATION & PROTECTION IRVE',
  sous: [{ zone: 'raccordement', lignes: racc }, { zone: 'chemAmont', lignes: [] }, { zone: 'td', lignes: td }],
});
const POINT_N1 = (borne: SousSectionModele[]): SectionModele => ({ titre: '2. POINT DE RECHARGE N°1', parPoint: true, sous: borne });

const PLAN_PAR = (sg: boolean): SectionModele[] => [
  ALIM(sg ? [COUPURE] : []),
  { titre: '2. POINTS DE RECHARGE PARTAGÉS', sous: [{ zone: 'chemAval', lignes: [] }, { zone: 'borne', lignes: [] }] },
  { titre: '3. PILOTAGE ÉNERGÉTIQUE & COMMUNICATION', sous: [{ zone: 'communication', lignes: [P('SERV-SETUP-SUPERVISION-REFACT')] }] },
  { titre: '4. PRESTATIONS GLOBALES & CONFORMITÉ', sous: [{ zone: 'prestations', lignes: [P('ADMIN-CONSUEL'), P('ADMIN-ADVENIR'), ADV_PARTAGE, P('LOG-DEP-Z1')] }] },
];
const PLAN_COP = (sg: boolean): SectionModele[] => [
  {
    titre: '1. INFRASTRUCTURE & TÊTE DE DISTRIBUTION',
    sous: [{ zone: 'raccordement', lignes: sg ? [COUPURE] : [] }, { zone: 'chemAmont', lignes: [] }, { zone: 'td', lignes: [] }],
  },
  { titre: '2. ARTÈRE DE DISTRIBUTION DU PARKING', sous: [{ zone: 'chemAval', lignes: [] }, { zone: 'boite', lignes: [] }] },
  {
    titre: '3. PILOTAGE ÉNERGÉTIQUE & COMMUNICATION',
    sous: [{ zone: 'pilotage', lignes: [] }, { zone: 'communication', lignes: [P('INFRA-COP-ROUTEUR'), CONVENTION, P('SERV-SETUP-SUPERVISION')] }],
  },
  {
    titre: '4. INGÉNIERIE, CONFORMITÉ & AIDES ADVENIR',
    sous: [{ zone: 'prestations', lignes: [P('SERV-ETUDE-COP'), P('ADMIN-CONTROLE'), P('ADMIN-CONSUEL'), CONSUEL_COPRO, P('ADMIN-ADVENIR'), ADV_INFRA] }],
  },
  { titre: '5. PRÉPARATION & LOGISTIQUE CHANTIER', sous: [{ zone: 'logistique', lignes: [P('LOG-DEP-Z1')] }] },
];
const PLAN_RIC = (colonne: boolean): SectionModele[] => [
  {
    titre: '1. ALIMENTATION & PROTECTION IRVE',
    sous: colonne
      ? [{ zone: 'raccordement', lignes: [LINKY, CONSUEL_PDL] }, { zone: 'td', lignes: [P('COFF-MONO-7K')] }]
      : [{ zone: 'chemAmont', lignes: [P('LIA-DERIV-3G25', 5), P('LIA-DATA-RJ45', 5)] }, { zone: 'td', lignes: [P('COFF-MONO-7K')] }],
  },
  POINT_N1([
    { zone: 'chemAval', lignes: colonne ? [P('LIA-TUBE-3G10', 5)] : [P('LIA-TUBE-3G10', 5), P('LIA-DATA-RJ45', 5)] },
    { zone: 'borne', lignes: [P('BORNE-HAG-WPLUS-22'), P(colonne ? 'SERV-SETUP-PDC-LOCAL' : 'SERV-SETUP-PDC')] },
    { zone: 'autre', lignes: [P('OPT-BADGE-LOCAL')] },
  ]),
  {
    titre: '3. PRESTATIONS GLOBALES & CONFORMITÉ',
    sous: [{ zone: 'prestations', lignes: colonne ? [P('ADMIN-CONSUEL'), P('ADMIN-ADVENIR'), ADV_INDIV, P('LOG-DEP-Z1')] : [P('ADMIN-ADVENIR'), ADV_INDIV, P('LOG-DEP-Z1')] }],
  },
];
const PLAN_PRO = (supervision: string): SectionModele[] => [
  ALIM(),
  POINT_N1([{ zone: 'chemAval', lignes: [] }, { zone: 'borne', lignes: [P('SERV-SETUP-PDC')] }]),
  { titre: '3. COMMUNICATION & SUPERVISION', sous: [{ zone: 'communication', lignes: [P(supervision)] }] },
  { titre: '4. PRESTATIONS GLOBALES & CONFORMITÉ', sous: [{ zone: 'prestations', lignes: [P('ADMIN-CONSUEL-VERT'), P('LOG-DEP-Z1')] }] },
];
const PRESTA_RES = (lignes: LigneModele[]): SectionModele => ({ titre: '3. PRESTATIONS GLOBALES & CONFORMITÉ', sous: [{ zone: 'prestations', lignes }] });

export const PLANS: Record<CleModele, SectionModele[]> = {
  COP_PDL: PLAN_COP(false),
  COP_SG: PLAN_COP(true),
  PAR_SG: PLAN_PAR(true),
  PAR_PDL: PLAN_PAR(false),
  RIC_TARIF_TYPE: PLAN_RIC(false),
  RIC_RESIDENT: PLAN_RIC(false),
  RIC_COLONNE: PLAN_RIC(true),
  RES: [ALIM(), POINT_N1([{ zone: 'chemAval', lignes: [] }, { zone: 'borne', lignes: [] }]), PRESTA_RES([P('ADMIN-CONSUEL'), P('LOG-DEP-Z1')])],
  RES_PRISE: [ALIM([], [P('COFF-MONO-3K')]), POINT_N1([{ zone: 'chemAval', lignes: [] }, { zone: 'prise', lignes: [] }]), PRESTA_RES([P('ADMIN-CONSUEL'), P('LOG-DEP-Z1')])],
  DAP: [
    ALIM([], [P('MID-SOUS-COMPTAGE')]),
    POINT_N1([{ zone: 'chemAval', lignes: [] }, { zone: 'borne', lignes: [] }]),
    PRESTA_RES([P('ADMIN-CONSUEL'), P('ADMIN-DAP'), P('ADMIN-ADVENIR'), ADV_INDIV, P('LOG-DEP-Z1')]),
  ],
  FLT: PLAN_PRO('SERV-SETUP-SUPERVISION'),
  TER: PLAN_PRO('SERV-SETUP-SUPERVISION-REFACT'),
  AMO_PDL: [{ titre: "1. ASSISTANCE À MAÎTRISE D'OUVRAGE", sous: [{ zone: 'prestations', lignes: [P('ADMIN-CREATION-PDL'), CONSUEL_PDL, P('LOG-DEP-Z1')] }] }],
  AMO_COLONNE: [], // hors relevé, jamais choisi par le brief
};
