// Relevé élément par élément (étape 4 du plan du 15/10/2026, PR #51).
// Matrice des champs par nature : synthèse finale du 14/10, section 4. Fichier neutre (serveur et écran).
// Les clés sont celles de CHAMPS (identifiant du champ) et de OPTIONS (options des menus) dans src/lib/champsClickUp.ts.
// Notes : un seul champ ClickUp « 📝 Notes Cheminement », utilisé comme notes de tout élément.
// 15/10, 16 h 31 (retour de Matthieu) : scénario à prise renforcée seule (aucune borne), le coffret ne demande plus la
// gestion de charge ni la mesure de puissance, et « Prêt à chiffrer » ne les exige plus.
// 01/11/2026 (Phase 8, étape 4 : l'appli ne propose que ce qui a un ouvrage en bibliothèque) :
// - bornes : liste extensible BORNES (marque, gamme, puissances, ouvrage, pied), choisie dans 🔋 Modèle de borne ;
//   ABB masqué à l'écran, son option ClickUp reste en index 2 (D2) ; pied Peblar seulement, « Sur pied » toujours
//   proposé (D4, le brief signale un pied à créer pour les autres marques) ;
// - prises renforcées : Legrand, Hager, Schneider (PRISE-SCH-3K vérifié en bibliothèque le 01/11) ; ABB et Peblar
//   masqués (D3) ;
// - coffret : INFRA-TD-TRI-2D22-H10 et 3D22-H10 proposés en PAR, FLT et TER seulement (D15) ;
// - section forcée 35 mm² masquée en monophasé, option conservée en index 6 (D14) ;
// - source « Colonne Enedis » proposée en RIC seulement (D13 ; l'AMO colonne en COP est hors relevé) ;
// - case 🏢 Passage en façade sur le cheminement (JUR-AUTORISATION-FACADE) ; la dépose d'une borne existante est un
//   élément Autre « Dépose d'une borne existante » (DEPOSE-BORNE), décision de Mathieu du 01/11, 19 h 11.
// Une option masquée déjà saisie reste affichée (jamais effacée en silence) ; le brief la signale.
// 01/11, 21 h 55 (Mathieu) : le TD de borne partagée contient le HUB 10 Charge Unix et un switch, pas de 4G. Il faut
// toujours un modem 4G séparé : connectivité « Modem déporté » (INFRA-COP-ROUTEUR), « Intégrée au TD IRVE » masquée
// (option ClickUp gardée, index 2). La SIM intégrée à la borne ne marche que pour une borne seule. Taille du HUB : toujours
// HUB 10 avec ce TD (plus de 10 points de charge en borne partagée est rare), donc la question n'est pas posée.
// 02/11 (recette de Mathieu, 7 h 22) : avec ce TD, la gestion de charge n'est pas demandée non plus (gestionnaire de grappe
// compris), et la mesure de puissance n'est jamais demandée sur un PDL dédié (consigne statique, ni compteur ni comptage,
// D5 et D6).
// 02/11, 7 h 33 (recette) : « Switch de la boîte de dérivation » proposé en RIC seulement ; avec un TD de borne partagée,
// la connectivité n'est pas demandée (toujours un modem déporté, posé d'office à l'enregistrement).
// 02/11, 7 h 38 (Mathieu) : la question « Connectivité » s'affiche « Accès Internet » (libellé de l'écran seulement, le
// champ ClickUp garde son nom et ses options).
// 02/11, 19 h 57 (Phase 8, étape 7, choix de Mathieu) : « 📌 Emplacement de la borne », texte libre sur l'élément Borne
// en PAR, FLT et TER (ex. « places 12 et 14 du sous-sol »), lu par le brief pour le crochet [emplacements] de l'en-tête.
// Pas recopié à la duplication (propre à la place).
// 03/11/2026 (passe 2 de la recette sans IA, décisions de Mathieu et T1 à T7 tranchés à 21 h 23) :
// - Puissance Dispo : paliers 24, 30 et 36 kVA (fin du menu), « 18 kVA et plus » n'est plus proposé, et en monophasé
//   rien au-dessus de 12 kVA (écarts 27 et 45) ;
// - Raccordement cible : Inchangé, Augmentation de puissance, Passage en triphasé ; « Mono renforcé » masqué (gardé dans
//   ClickUp, index 1, écart 28) ;
// - 📈 Pointe réelle des communs (kVA) sur le raccordement d'une COP sur services généraux (écart 51) ;
// - Communication en COP (décision du 03/11, 15 h 45) : gestionnaire de grappe posé d'office, mesure posée d'office
//   (compteur Modbus sur les services généraux, aucune sur un PDL dédié), HUB présélectionné selon les points de charge ;
//   il ne reste que la taille du HUB, l'accès Internet et le réseau. Même logique en RIC sur l'infra CHARGéO (rien sur
//   la gestion : c'est celle de l'infra, écart 67). RIC sur colonne Enedis : la gestion de charge (aucune ou délesteur
//   TIC) et l'accès Internet sont reposés (écart 71). Mesure obligatoire sur les services généraux (écart 62) ;
// - HUB (T6, capacité stricte) : jusqu'à 10 points de charge → HUB 10, de 11 à 20 → HUB 20, au-delà → HUB 150 ;
// - Réseau (T4) : « Box ou WiFi du client » (libellé de l'option WiFi) et « Sans objet » (fin du menu) ;
// - Artère : chemin de câbles, tranchée, vide sanitaire ou tirage existant seulement (écart 47) ; liaison data sans
//   section forcée (écart 49) ;
// - Boîte de dérivation : un seul élément avec une quantité (écart 46).
import type { Nature, Segment } from '@/lib/champsClickUp';

export type TypeSaisie = 'menu' | 'nombre' | 'texte' | 'case';
export type Saisie = { cle: string; libelle: string; type: TypeSaisie; options?: { cle: string; libelle: string }[] };
export type Valeurs = Record<string, string | number | null>;
export type ElementReleve = {
  id: string;
  nom: string;
  nature: Nature | null;
  depart: string | null;
  arrivee: string | null;
  typeCheminement: string | null;
  valeurs: Valeurs;
};
// prise : le scénario n'a que des prises renforcées (aucune borne), donc pas de gestion de charge au coffret
// mono : raccordement monophasé (section 35 mm² masquée) ; source : source du raccordement
// gestion et mesure : gestion de charge et mesure de puissance du site (élément Communication, ou TD d'un ancien relevé)
// tdPartage : un TD de borne partagée est choisi (HUB 10 compris) ; bornes : nombre de bornes du scénario
export type ContexteReleve = {
  segment: Segment | null; grappe: boolean; prise?: boolean; mono?: boolean; source?: string | null; gestion?: string; mesure?: string;
  tdPartage?: boolean; bornes?: number;
};

// Bornes proposées (D2) : uniquement les couples marque × puissance qui ont un ouvrage. Liste extensible : une nouvelle
// borne = une ligne ici + une option ajoutée EN FIN du menu 🔋 Modèle de borne dans ClickUp, puis dans OPTIONS.modeleBorne.
// points : points de charge de la borne (borne double = 2 mises en service). pied : ouvrage du pied, null = à créer.
export type LigneBorne = { ref: string; marque: string; gamme: string; puissances: string[]; points: number; pied: string | null };
export const BORNES: LigneBorne[] = [
  { ref: 'BORNE-HAG-WONE-7', marque: 'hager', gamme: 'Hager Witty One 7,4 kW', puissances: ['7.4'], points: 1, pied: null },
  { ref: 'BORNE-HAG-WONE-11', marque: 'hager', gamme: 'Hager Witty One 11 kW', puissances: ['11'], points: 1, pied: null },
  { ref: 'BORNE-HAG-WPLUS-22', marque: 'hager', gamme: 'Hager Witty Plus 7,4 à 22 kW', puissances: ['7.4', '11', '22'], points: 1, pied: null },
  { ref: 'BORNE-SCH-CHG-22', marque: 'schneider', gamme: 'Schneider Charge 7,4 à 22 kW', puissances: ['7.4', '11', '22'], points: 1, pied: null },
  { ref: 'BORNE-SCH-PRO-22', marque: 'schneider', gamme: 'Schneider Charge Pro 7,4 à 22 kW', puissances: ['7.4', '11', '22'], points: 1, pied: null },
  { ref: 'BORNE-LEG-HOME-3', marque: 'legrand', gamme: "Legrand Green'up Home 3,7 kW", puissances: ['3.7'], points: 1, pied: null },
  { ref: 'BORNE-LEG-HOME-7', marque: 'legrand', gamme: "Legrand Green'up Home 7,4 kW", puissances: ['7.4'], points: 1, pied: null },
  { ref: 'BORNE-LEG-DUO-22', marque: 'legrand', gamme: "Legrand Green'up Control Duo 2 × 7,4 à 22 kW", puissances: ['7.4', '11', '22'], points: 2, pied: null },
  { ref: 'BORNE-PEB-HOME-7', marque: 'peblar', gamme: 'Peblar Home 7,4 kW', puissances: ['7.4'], points: 1, pied: 'PIED-PEB-S' },
  { ref: 'BORNE-PEB-BUS-22', marque: 'peblar', gamme: 'Peblar Business 7,4 à 22 kW', puissances: ['7.4', '11', '22'], points: 1, pied: 'PIED-PEB-S' },
  { ref: 'BORNE-PEB-DUAL', marque: 'peblar', gamme: 'Peblar Dual 2 × 11 kW', puissances: ['11'], points: 2, pied: 'PIED-PEB-DUAL' },
];
// Prises renforcées proposées (D3) : marque → ouvrage
export const PRISES: Record<string, string> = { hager: 'PRISE-HAG-3K', schneider: 'PRISE-SCH-3K', legrand: 'PRISE-LEG-3K' };
// TD de borne partagée (D15) : HUB 10 Charge Unix et switch compris (pas de 4G, 01/11 21 h 55), proposés en PAR, FLT et TER
export const COFFRETS_TD = ['INFRA-TD-TRI-2D22-H10', 'INFRA-TD-TRI-3D22-H10'];
export const SEGMENTS_TD: Segment[] = ['PAR', 'FLT', 'TER'];
export const estCoffretTd = (ref: unknown) => COFFRETS_TD.includes(String(ref ?? ''));
export const ligneBorne = (ref: unknown): LigneBorne | undefined => BORNES.find((b) => b.ref === String(ref ?? ''));

// Gestionnaire de grappe : demande plafonnée à 36 kVA (décision de Mathieu du 03/11, 10 h 02, écarts 2 et 8)
export const PLAFOND_GESTION_KVA = 36;
// Branchement monophasé Enedis : 12 kVA au plus (écart 27)
export const MONO_MAX_KVA = 12;
// Taille du HUB selon les points de charge (T6, capacité stricte, 03/11 à 21 h 22)
export function hubSuggere(points: number): '10' | '20' | '150' {
  if (points <= 10) return '10';
  if (points <= 20) return '20';
  return '150';
}
// Points de charge desservis par une boîte de dérivation COP (borniers + switch, 4 points)
export const POINTS_PAR_BOITE = 4;

const menu = (cle: string, libelle: string, options: [string, string][]): Saisie =>
  ({ cle, libelle, type: 'menu', options: options.map(([c, l]) => ({ cle: c, libelle: l })) });
const nombre = (cle: string, libelle: string): Saisie => ({ cle, libelle, type: 'nombre' });
const caseACocher = (cle: string, libelle: string): Saisie => ({ cle, libelle, type: 'case' });

// Ordre d'affichage des options = ordre des lignes ci-dessous (l'index écrit dans ClickUp vient de OPTIONS, jamais d'ici)
export const SAISIES: Record<string, Saisie> = {
  // Raccordement
  sourceRaccordement: menu('sourceRaccordement', 'Source de raccordement', [
    ['tableauIndividuel', 'Tableau individuel existant'], ['tgbtServicesGeneraux', 'TGBT services généraux'],
    ['pdlDedie', 'PDL dédié'], ['infraCollective', 'Infra collective CHARGéO'], ['colonneEnedis', 'Colonne Enedis'],
  ]),
  typeRaccordement: menu('typeRaccordement', 'Mono ou tri', [['mono', 'Monophasé'], ['tri', 'Triphasé']]),
  puissanceDispo: menu('puissanceDispo', 'Puissance dispo', [
    ['3', '3 kVA'], ['6', '6 kVA'], ['9', '9 kVA'], ['12', '12 kVA'], ['18+', '18 kVA et plus'], ['24', '24 kVA'], ['30', '30 kVA'], ['36', '36 kVA'],
  ]),
  etatTableau: menu('etatTableau', 'État du tableau', [['ok', 'OK (conforme)'], ['aRemanier', 'À remanier'], ['aRemplacer', 'À remplacer']]),
  raccordementCible: menu('raccordementCible', 'Raccordement cible', [
    ['inchange', 'Inchangé'], ['augmentation', 'Augmentation de puissance'], ['passageTri', 'Passage en triphasé'], ['monoRenforce', 'Mono renforcé'],
  ]),
  pointeReelle: nombre('pointeReelle', 'Pointe réelle des communs (kVA)'),
  terre: nombre('terre', 'Terre (ohms)'),
  // Cheminement
  typeCheminement: menu('typeCheminement', 'Type de cheminement', [['alimentation', 'Alimentation'], ['artere', 'Artère'], ['liaisonData', 'Liaison data']]),
  distTubeApparent: nombre('distTubeApparent', 'Tube apparent (m)'),
  distGoulotte: nombre('distGoulotte', 'Goulotte (m)'),
  distEncastre: nombre('distEncastre', 'Encastré (m)'),
  distVideSanitaire: nombre('distVideSanitaire', 'Vide sanitaire (m)'),
  distCheminCables: nombre('distCheminCables', 'Chemin de câbles (m)'),
  distTirageExistant: nombre('distTirageExistant', 'Tirage existant (m)'),
  distTranchee: nombre('distTranchee', 'Tranchée (m)'),
  percementsPlaco: nombre('percementsPlaco', 'Percements placo / bois'),
  percementsBrique: nombre('percementsBrique', 'Percements brique / parpaing'),
  percementsBeton: nombre('percementsBeton', 'Percements béton / pierre'),
  percementsDalle: nombre('percementsDalle', 'Percements dalle / sol'),
  sectionForcee: menu('sectionForcee', 'Section forcée (si l’existant l’impose)', [
    ['2.5', '2,5 mm²'], ['4', '4 mm²'], ['6', '6 mm²'], ['10', '10 mm²'], ['16', '16 mm²'], ['25', '25 mm²'], ['35', '35 mm²'],
  ]),
  passageFacade: caseACocher('passageFacade', '🏢 Passage en façade (autorisation de la copropriété)'),
  // TD IRVE / coffret
  coffretIrve: menu('coffretIrve', 'Référence du coffret', [
    ['COFF-MONO-3K', 'COFF-MONO-3K'], ['COFF-MONO-7K', 'COFF-MONO-7K'], ['COFF-MONO-7K-MOD', 'COFF-MONO-7K-MOD'],
    ['COFF-TRI-11K', 'COFF-TRI-11K'], ['COFF-TRI-11K-MOD', 'COFF-TRI-11K-MOD'], ['COFF-TRI-22K', 'COFF-TRI-22K'], ['COFF-TRI-22K-MOD', 'COFF-TRI-22K-MOD'],
    ['INFRA-TD-TRI-2D22-H10', 'INFRA-TD-TRI-2D22-H10 (TD 2 points de charge)'], ['INFRA-TD-TRI-3D22-H10', 'INFRA-TD-TRI-3D22-H10 (TD 3 points de charge)'],
  ]),
  gestionCharge: menu('gestionCharge', 'Gestion de charge', [['aucune', 'Aucune'], ['delesteur', 'Délesteur'], ['gestionnaireGrappe', 'Gestionnaire de grappe']]),
  mesurePuissance: menu('mesurePuissance', 'Mesure de puissance', [['ticLinky', 'TIC Linky'], ['compteurModbus', 'Compteur Modbus']]),
  emplacement: menu('emplacement', 'Emplacement du TD IRVE', [['localTechnique', 'Local technique'], ['parking', 'Parking'], ['gainePaliere', 'Gaine palière']]),
  // Borne / prise renforcée
  puissanceVisee: menu('puissanceVisee', 'Puissance visée', [['3.7', '3,7 kW'], ['7.4', '7,4 kW'], ['11', '11 kW'], ['22', '22 kW']]),
  marqueBorne: menu('marqueBorne', 'Marque', [['hager', 'Hager'], ['schneider', 'Schneider'], ['abb', 'ABB'], ['legrand', 'Legrand'], ['peblar', 'Peblar']]),
  modeleBorne: menu('modeleBorne', 'Modèle de borne', BORNES.map((b) => [b.ref, b.gamme] as [string, string])),
  supportBorne: menu('supportBorne', 'Support', [['murBetonParpaing', 'Mur béton / parpaing'], ['murPlaco', 'Mur placo'], ['murBois', 'Mur bois'], ['surPied', 'Sur pied']]),
  emplacementBorne: { cle: 'emplacementBorne', libelle: '📌 Emplacement (ex. places 12 et 14 du sous-sol)', type: 'texte' },
  // Communication
  connectivite: menu('connectivite', 'Accès Internet', [
    ['simIntegree', 'Intégrée à la borne (SIM 4G)'], ['modemDeporte', 'Modem déporté'], ['integreeTdIrve', 'Intégrée au TD IRVE'], ['switchBoiteDerivation', 'Switch de la boîte de dérivation'],
  ]),
  reseau: menu('reseau', 'Réseau sur place', [
    ['wifi', 'Box ou WiFi du client'], ['4g', '4G OK'], ['cableRequis', 'Câble requis (zone blanche)'], ['sansObjet', 'Sans objet'],
  ]),
  tailleHub: menu('tailleHub', 'Taille HUB', [['10', 'HUB 10'], ['20', 'HUB 20'], ['150', 'HUB 150']]),
  // Autre et Boîte de dérivation
  quantite: nombre('quantite', 'Quantité'),
  // Tous
  notesCheminement: { cle: 'notesCheminement', libelle: 'Notes', type: 'texte' },
};

export const DISTANCES = ['distTubeApparent', 'distGoulotte', 'distEncastre', 'distVideSanitaire', 'distCheminCables', 'distTirageExistant', 'distTranchee'];
// Artère : 4 modes de pose seulement, jamais de tube apparent, de goulotte ni d'encastré (écart 47)
export const DISTANCES_ARTERE = ['distCheminCables', 'distTranchee', 'distVideSanitaire', 'distTirageExistant'];
export const PERCEMENTS = ['percementsPlaco', 'percementsBrique', 'percementsBeton', 'percementsDalle'];

// Champs qu'une nature peut porter (contrôle côté serveur)
export const SAISIES_NATURE: Record<Nature, string[]> = {
  raccordement: ['sourceRaccordement', 'typeRaccordement', 'puissanceDispo', 'etatTableau', 'raccordementCible', 'pointeReelle', 'terre', 'notesCheminement'],
  cheminement: ['typeCheminement', ...DISTANCES, ...PERCEMENTS, 'sectionForcee', 'passageFacade', 'notesCheminement'],
  tdIrveCoffret: ['coffretIrve', 'gestionCharge', 'mesurePuissance', 'emplacement', 'notesCheminement'],
  borne: ['puissanceVisee', 'marqueBorne', 'modeleBorne', 'supportBorne', 'emplacementBorne', 'notesCheminement'],
  priseRenforcee: ['puissanceVisee', 'marqueBorne', 'supportBorne', 'notesCheminement'],
  communication: ['gestionCharge', 'mesurePuissance', 'tailleHub', 'connectivite', 'reseau', 'notesCheminement'],
  boiteDerivation: ['quantite', 'notesCheminement'],
  autre: ['quantite', 'notesCheminement'],
};

const texte = (v: unknown) => (v === null || v === undefined ? '' : String(v));

// Source du raccordement du scénario (vide si pas encore relevée)
const sourceDe = (elements: ElementReleve[]) => texte(elements.find((e) => e.nature === 'raccordement')?.valeurs.sourceRaccordement);

// RIC raccordé sur l'infra CHARGéO (source vide = infra, la source par défaut du segment)
const ricSurInfra = (segment: Segment | null | undefined, source: string | null | undefined) =>
  segment === 'RIC' && texte(source) !== 'colonneEnedis';

// Points de charge desservis par les boîtes de dérivation (COP) : quantité de chaque élément Boîte, 1 si vide
export function nombreBoites(elements: ElementReleve[]): number {
  return elements.filter((e) => e.nature === 'boiteDerivation').reduce((n, e) => n + (Number(e.valeurs.quantite) > 0 ? Number(e.valeurs.quantite) : 1), 0);
}

// 01/11/2026, 21 h 35 (Mathieu : « toutes les questions concernant le gestionnaire de charge devraient être dans l'élément
// communication ») : gestion de charge, mesure de puissance et taille du HUB se relèvent dans l'élément Communication.
// Un relevé fait avant les avait sur le TD IRVE / coffret : il reste lu (Communication d'abord, sinon TD).
// TD de borne partagée : gestionnaire de grappe d'office (D15), quoi qu'en dise la saisie.
// 03/11 (décision de Mathieu, 15 h 45) : COP = gestionnaire de grappe d'office, mesure Modbus d'office sur les services
// généraux et aucune sur un PDL dédié ; RIC sur l'infra = gestionnaire de l'infra, pas de mesure ; PDL dédié = jamais de
// mesure (D5, D6). Le segment n'est pas connu d'un ancien appel : sans lui, la règle d'avant s'applique.
export function gestionDuSite(elements: ElementReleve[], segment: Segment | null = null): { gestion: string; mesure: string } {
  const source = sourceDe(elements);
  if (segment === 'COP') return { gestion: 'gestionnaireGrappe', mesure: source === 'tgbtServicesGeneraux' ? 'compteurModbus' : '' };
  if (ricSurInfra(segment, source)) return { gestion: 'gestionnaireGrappe', mesure: '' };
  const porteur = elements.find((e) => e.nature === 'communication' && texte(e.valeurs.gestionCharge))
    ?? elements.find((e) => e.nature === 'tdIrveCoffret' && texte(e.valeurs.gestionCharge));
  const tdPartage = elements.some((e) => e.nature === 'tdIrveCoffret' && estCoffretTd(e.valeurs.coffretIrve));
  const gestion = tdPartage ? 'gestionnaireGrappe' : texte(porteur?.valeurs.gestionCharge);
  const mesure = texte(porteur?.valeurs.mesurePuissance)
    || texte(elements.find((e) => e.nature === 'communication' && texte(e.valeurs.mesurePuissance))?.valeurs.mesurePuissance);
  return { gestion, mesure: gestion && gestion !== 'aucune' && source !== 'pdlDedie' ? mesure : '' };
}

export function contexteReleve(segment: Segment | null, elements: ElementReleve[]): ContexteReleve {
  const racc = elements.find((e) => e.nature === 'raccordement');
  const site = gestionDuSite(elements, segment);
  return {
    segment,
    grappe: site.gestion === 'gestionnaireGrappe',
    gestion: site.gestion,
    mesure: site.mesure,
    tdPartage: elements.some((e) => e.nature === 'tdIrveCoffret' && estCoffretTd(e.valeurs.coffretIrve)),
    bornes: elements.filter((e) => e.nature === 'borne').length,
    prise: elements.some((e) => e.nature === 'priseRenforcee') && !elements.some((e) => e.nature === 'borne'),
    mono: texte(racc?.valeurs.typeRaccordement) === 'mono',
    source: texte(racc?.valeurs.sourceRaccordement) || null,
  };
}

// Options d'un menu proposées à l'écran (01/11) : seulement ce qui a un ouvrage ou ce que le segment autorise.
// La valeur déjà saisie reste toujours dans la liste, même si elle n'est plus proposée.
export function optionsVisibles(cle: string, v: Valeurs, ctx: ContexteReleve, nature: Nature | null): { cle: string; libelle: string }[] {
  const toutes = SAISIES[cle]?.options || [];
  const puissance = texte(v.puissanceVisee);
  const marque = texte(v.marqueBorne);
  const mono = nature === 'raccordement' ? texte(v.typeRaccordement) === 'mono' : !!ctx.mono;
  const colonne = ctx.segment === 'RIC' && ctx.source === 'colonneEnedis';
  let garder: (c: string) => boolean = () => true;
  switch (cle) {
    case 'sourceRaccordement':
      garder = (c) => c !== 'colonneEnedis' || ctx.segment === 'RIC';
      break;
    case 'puissanceDispo':
      // « 18 kVA et plus » remplacé par les paliers 24, 30 et 36 kVA ; en monophasé, 12 kVA au plus (écarts 27 et 45)
      garder = (c) => c !== '18+' && (!mono || Number(c) <= MONO_MAX_KVA);
      break;
    case 'raccordementCible':
      // 3 choix : Inchangé, Augmentation de puissance, Passage en triphasé (« Mono renforcé » gardé dans ClickUp, écart 28)
      garder = (c) => c !== 'monoRenforce';
      break;
    case 'coffretIrve':
      garder = (c) => !COFFRETS_TD.includes(c) || (!!ctx.segment && SEGMENTS_TD.includes(ctx.segment));
      break;
    case 'sectionForcee':
      garder = (c) => c !== '35' || !ctx.mono;
      break;
    case 'gestionCharge':
      // Linky du résident (colonne Enedis) : pas de grappe, délesteur TIC ou rien (écart 71)
      garder = (c) => !colonne || c !== 'gestionnaireGrappe';
      break;
    case 'mesurePuissance':
      garder = (c) => !colonne || c === 'ticLinky';
      break;
    case 'connectivite':
      // Pas de 4G dans le TD IRVE ; SIM de la borne pour une borne seule (hors COP) ; switch de la boîte de dérivation en RIC
      // sur l'infra seulement (pas sur la colonne Enedis, écart 71)
      garder = (c) => c !== 'integreeTdIrve'
        && (c !== 'simIntegree' || (ctx.segment !== 'COP' && (ctx.bornes ?? 0) <= 1))
        && (c !== 'switchBoiteDerivation' || ricSurInfra(ctx.segment, ctx.source));
      break;
    case 'marqueBorne':
      garder = nature === 'priseRenforcee'
        ? (c) => c in PRISES
        : (c) => BORNES.some((b) => b.marque === c && (!puissance || b.puissances.includes(puissance)));
      break;
    case 'modeleBorne':
      garder = (c) => BORNES.some((b) => b.ref === c && (!marque || b.marque === marque) && (!puissance || b.puissances.includes(puissance)));
      break;
    default:
      break;
  }
  const actuel = texte(v[cle]);
  return toutes.filter((o) => garder(o.cle) || o.cle === actuel);
}

// Champs affichés selon la nature et les valeurs déjà saisies (matrice de la synthèse, section 4)
export function champsVisibles(nature: Nature | null, v: Valeurs, ctx: ContexteReleve): string[] {
  const cop = ctx.segment === 'COP';
  switch (nature) {
    case 'raccordement': {
      const source = texte(v.sourceRaccordement);
      // PDL dédié, infra collective CHARGéO et colonne Enedis : pas de tableau existant à relever
      const sansTableau = source === 'pdlDedie' || source === 'infraCollective' || source === 'colonneEnedis';
      return [
        'sourceRaccordement', 'typeRaccordement',
        ...(sansTableau ? [] : ['puissanceDispo', 'etatTableau', 'raccordementCible']),
        // COP sur services généraux : pointe réelle des communs (puissance cible = pointe + réserve IRVE, écart 51)
        ...(cop && source === 'tgbtServicesGeneraux' ? ['pointeReelle'] : []),
        ...(source === 'infraCollective' ? [] : ['terre']),
        'notesCheminement',
      ];
    }
    case 'cheminement': {
      const type = texte(v.typeCheminement);
      // Artère : 4 modes (écart 47). Liaison data : pas de section ni de façade (écart 49), longueur et mode de pose
      // recopiés de la liaison de puissance du même tronçon quand il y en a une (écart 48)
      const distances = type === 'artere' ? DISTANCES_ARTERE : DISTANCES;
      return [
        'typeCheminement', ...distances, ...PERCEMENTS,
        ...(type === 'liaisonData' ? [] : ['sectionForcee', 'passageFacade']),
        'notesCheminement',
      ];
    }
    case 'tdIrveCoffret':
      // Gestion de charge et mesure de puissance : dans l'élément Communication (01/11, 21 h 35)
      return [...(cop ? [] : ['coffretIrve']), ...(cop ? ['emplacement'] : []), 'notesCheminement'];
    case 'borne':
      // 📌 Emplacement de la borne : en PAR, FLT et TER, pour le crochet [emplacements] de l'en-tête (02/11)
      return [
        'puissanceVisee', 'marqueBorne', 'modeleBorne', 'supportBorne',
        ...(ctx.segment && SEGMENTS_TD.includes(ctx.segment) ? ['emplacementBorne'] : []),
        'notesCheminement',
      ];
    case 'priseRenforcee':
      return ['marqueBorne', 'supportBorne', 'notesCheminement'];
    case 'communication': {
      // COP : gestionnaire et mesure posés d'office, il reste le HUB, l'accès Internet et le réseau (03/11, 15 h 45)
      if (cop) return ['tailleHub', 'connectivite', 'reseau', 'notesCheminement'];
      // RIC sur l'infra : gestion de l'infra, rien à demander sur la charge (écart 67)
      if (ricSurInfra(ctx.segment, ctx.source)) return ['connectivite', 'reseau', 'notesCheminement'];
      // Questions du gestionnaire de charge d'abord (01/11, 21 h 35) : gestion, mesure si gestion, HUB si grappe.
      // Prise renforcée seule : pas de gestion de charge. TD de borne partagée : gestionnaire de grappe et HUB 10 compris,
      // rien à demander. PDL dédié : pas de mesure de puissance (D5, D6).
      const gestion = ctx.tdPartage ? 'gestionnaireGrappe' : texte(v.gestionCharge) || (ctx.prise ? '' : texte(ctx.gestion));
      return [
        ...(ctx.prise || ctx.tdPartage ? [] : ['gestionCharge']),
        ...(gestion && gestion !== 'aucune' && ctx.source !== 'pdlDedie' ? ['mesurePuissance'] : []),
        ...(gestion === 'gestionnaireGrappe' && !ctx.tdPartage ? ['tailleHub'] : []),
        ...(ctx.tdPartage ? [] : ['connectivite']), 'reseau', 'notesCheminement',
      ];
    }
    case 'boiteDerivation':
      return ['quantite', 'notesCheminement'];
    case 'autre':
      return ['quantite', 'notesCheminement'];
    default:
      return [];
  }
}

export const longueurTotale = (v: Valeurs) => DISTANCES.reduce((s, k) => s + (Number(v[k]) || 0), 0);

// Règle des 3 m : cheminement d'alimentation Raccordement → coffret de plus de 3 m (hors COP et RIC, où l'infra protège)
export function alerteTroisMetres(ch: ElementReleve, elements: ElementReleve[], segment: Segment | null, v: Valeurs = ch.valeurs, depart = ch.depart, arrivee = ch.arrivee): boolean {
  if (segment === 'COP' || segment === 'RIC' || ch.nature !== 'cheminement') return false;
  if (texte(v.typeCheminement) === 'liaisonData') return false;
  const dep = elements.find((e) => e.id === depart);
  const arr = elements.find((e) => e.id === arrivee);
  return dep?.nature === 'raccordement' && arr?.nature === 'tdIrveCoffret' && longueurTotale(v) > 3;
}

// Coffret présélectionné selon la puissance de la borne, variante -MOD si compteur Modbus
export function coffretSuggere(puissance: unknown, mesure: unknown): string | null {
  const base: Record<string, string> = { '3.7': 'COFF-MONO-3K', '7.4': 'COFF-MONO-7K', '11': 'COFF-TRI-11K', '22': 'COFF-TRI-22K' };
  const ref = base[texte(puissance)];
  if (!ref) return null;
  return texte(mesure) === 'compteurModbus' && ref !== 'COFF-MONO-3K' ? `${ref}-MOD` : ref;
}

// Modèle de borne cohérent avec la marque et la puissance saisies
export function modeleCoherent(v: Valeurs): boolean {
  const b = ligneBorne(v.modeleBorne);
  if (!b) return false;
  const marque = texte(v.marqueBorne);
  const puissance = texte(v.puissanceVisee);
  return (!marque || b.marque === marque) && (!puissance || b.puissances.includes(puissance));
}

// Ce qui manque pour chiffrer (bouton « Prêt à chiffrer »)
export function manquants(e: ElementReleve, ctx: ContexteReleve): string[] {
  const v = e.valeurs;
  const m: string[] = [];
  switch (e.nature) {
    case 'raccordement': {
      const source = texte(v.sourceRaccordement);
      if (!source) m.push('source');
      if (!v.typeRaccordement) m.push('mono ou tri');
      if (source && !['pdlDedie', 'infraCollective', 'colonneEnedis'].includes(source) && !v.puissanceDispo) m.push('puissance dispo');
      else if (texte(v.puissanceDispo) === '18+') m.push('puissance dispo (« 18 kVA et plus » : choisir 24, 30 ou 36 kVA)');
      break;
    }
    case 'cheminement':
      if (!e.depart) m.push('départ');
      if (!e.arrivee && texte(v.typeCheminement) !== 'artere') m.push('arrivée');
      if (longueurTotale(v) <= 0) m.push('distances');
      break;
    case 'tdIrveCoffret':
      if (ctx.segment !== 'COP' && !v.coffretIrve) m.push('référence du coffret');
      break;
    case 'borne':
      if (!v.puissanceVisee) m.push('puissance visée');
      if (!v.modeleBorne) m.push('modèle de borne');
      else if (!modeleCoherent(v)) m.push('modèle de borne (ne correspond pas à la marque ou à la puissance)');
      break;
    case 'communication': {
      const surInfra = ctx.segment === 'COP' || ricSurInfra(ctx.segment, ctx.source);
      const gestion = texte(v.gestionCharge) || texte(ctx.gestion);
      if (!surInfra && !ctx.prise && !ctx.tdPartage && !gestion) m.push('gestion de charge');
      // Services généraux : la mesure de puissance est obligatoire dès qu'il y a une gestion de charge (écart 62)
      if (!surInfra && ctx.source === 'tgbtServicesGeneraux' && gestion && gestion !== 'aucune' && !texte(v.mesurePuissance) && !texte(ctx.mesure)) {
        m.push('mesure de puissance (obligatoire sur les services généraux)');
      }
      if (ctx.tdPartage && v.connectivite !== 'modemDeporte') m.push('à enregistrer (modem déporté posé d\'office avec le TD de borne partagée)');
      else if (!v.connectivite) m.push('accès Internet');
      else if (v.connectivite === 'integreeTdIrve') m.push('accès Internet (rien dans le TD IRVE : modem déporté)');
      else if (v.connectivite === 'simIntegree' && (ctx.bornes ?? 0) > 1) m.push('accès Internet (SIM de la borne pour une borne seule : modem déporté)');
      else if (v.connectivite === 'switchBoiteDerivation' && !ricSurInfra(ctx.segment, ctx.source)) m.push('accès Internet (pas de switch de boîte sur la colonne Enedis)');
      break;
    }
    case 'autre':
      if (!v.quantite) m.push('quantité');
      break;
    case 'priseRenforcee':
      if (texte(v.marqueBorne) && !(texte(v.marqueBorne) in PRISES)) m.push('marque de prise (Legrand, Hager ou Schneider)');
      break;
    case 'boiteDerivation':
      break;
    default:
      m.push('nature');
  }
  return m;
}
