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

const menu = (cle: string, libelle: string, options: [string, string][]): Saisie =>
  ({ cle, libelle, type: 'menu', options: options.map(([c, l]) => ({ cle: c, libelle: l })) });
const nombre = (cle: string, libelle: string): Saisie => ({ cle, libelle, type: 'nombre' });
const caseACocher = (cle: string, libelle: string): Saisie => ({ cle, libelle, type: 'case' });

export const SAISIES: Record<string, Saisie> = {
  // Raccordement
  sourceRaccordement: menu('sourceRaccordement', 'Source de raccordement', [
    ['tableauIndividuel', 'Tableau individuel existant'], ['tgbtServicesGeneraux', 'TGBT services généraux'],
    ['pdlDedie', 'PDL dédié'], ['infraCollective', 'Infra collective CHARGéO'], ['colonneEnedis', 'Colonne Enedis'],
  ]),
  typeRaccordement: menu('typeRaccordement', 'Mono ou tri', [['mono', 'Monophasé'], ['tri', 'Triphasé']]),
  puissanceDispo: menu('puissanceDispo', 'Puissance dispo', [['3', '3 kVA'], ['6', '6 kVA'], ['9', '9 kVA'], ['12', '12 kVA'], ['18+', '18 kVA et plus']]),
  etatTableau: menu('etatTableau', 'État du tableau', [['ok', 'OK (conforme)'], ['aRemanier', 'À remanier'], ['aRemplacer', 'À remplacer']]),
  raccordementCible: menu('raccordementCible', 'Raccordement cible', [
    ['inchange', 'Inchangé'], ['monoRenforce', 'Mono renforcé'], ['passageTri', 'Passage en tri'], ['augmentation', 'Augmentation de puissance'],
  ]),
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
  // Communication
  connectivite: menu('connectivite', 'Connectivité', [
    ['simIntegree', 'Intégrée à la borne (SIM 4G)'], ['modemDeporte', 'Modem déporté'], ['integreeTdIrve', 'Intégrée au TD IRVE'], ['switchBoiteDerivation', 'Switch de la boîte de dérivation'],
  ]),
  reseau: menu('reseau', 'Réseau sur place', [['wifi', 'WiFi OK'], ['4g', '4G OK'], ['cableRequis', 'Câble requis (zone blanche)']]),
  tailleHub: menu('tailleHub', 'Taille HUB', [['10', 'HUB 10'], ['20', 'HUB 20'], ['150', 'HUB 150']]),
  // Autre
  quantite: nombre('quantite', 'Quantité'),
  // Tous
  notesCheminement: { cle: 'notesCheminement', libelle: 'Notes', type: 'texte' },
};

export const DISTANCES = ['distTubeApparent', 'distGoulotte', 'distEncastre', 'distVideSanitaire', 'distCheminCables', 'distTirageExistant', 'distTranchee'];
export const PERCEMENTS = ['percementsPlaco', 'percementsBrique', 'percementsBeton', 'percementsDalle'];

// Champs qu'une nature peut porter (contrôle côté serveur)
export const SAISIES_NATURE: Record<Nature, string[]> = {
  raccordement: ['sourceRaccordement', 'typeRaccordement', 'puissanceDispo', 'etatTableau', 'raccordementCible', 'terre', 'notesCheminement'],
  cheminement: ['typeCheminement', ...DISTANCES, ...PERCEMENTS, 'sectionForcee', 'passageFacade', 'notesCheminement'],
  tdIrveCoffret: ['coffretIrve', 'gestionCharge', 'mesurePuissance', 'emplacement', 'notesCheminement'],
  borne: ['puissanceVisee', 'marqueBorne', 'modeleBorne', 'supportBorne', 'notesCheminement'],
  priseRenforcee: ['puissanceVisee', 'marqueBorne', 'supportBorne', 'notesCheminement'],
  communication: ['gestionCharge', 'mesurePuissance', 'tailleHub', 'connectivite', 'reseau', 'notesCheminement'],
  boiteDerivation: ['notesCheminement'],
  autre: ['quantite', 'notesCheminement'],
};

const texte = (v: unknown) => (v === null || v === undefined ? '' : String(v));

// 01/11/2026, 21 h 35 (Mathieu : « toutes les questions concernant le gestionnaire de charge devraient être dans l'élément
// communication ») : gestion de charge, mesure de puissance et taille du HUB se relèvent dans l'élément Communication.
// Un relevé fait avant les avait sur le TD IRVE / coffret : il reste lu (Communication d'abord, sinon TD).
// TD de borne partagée : gestionnaire de grappe d'office (D15), quoi qu'en dise la saisie.
export function gestionDuSite(elements: ElementReleve[]): { gestion: string; mesure: string } {
  const porteur = elements.find((e) => e.nature === 'communication' && texte(e.valeurs.gestionCharge))
    ?? elements.find((e) => e.nature === 'tdIrveCoffret' && texte(e.valeurs.gestionCharge));
  const tdPartage = elements.some((e) => e.nature === 'tdIrveCoffret' && estCoffretTd(e.valeurs.coffretIrve));
  const gestion = tdPartage ? 'gestionnaireGrappe' : texte(porteur?.valeurs.gestionCharge);
  const mesure = texte(porteur?.valeurs.mesurePuissance)
    || texte(elements.find((e) => e.nature === 'communication' && texte(e.valeurs.mesurePuissance))?.valeurs.mesurePuissance);
  return { gestion, mesure: gestion && gestion !== 'aucune' ? mesure : '' };
}

export function contexteReleve(segment: Segment | null, elements: ElementReleve[]): ContexteReleve {
  const racc = elements.find((e) => e.nature === 'raccordement');
  const site = gestionDuSite(elements);
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
  let garder: (c: string) => boolean = () => true;
  switch (cle) {
    case 'sourceRaccordement':
      garder = (c) => c !== 'colonneEnedis' || ctx.segment === 'RIC';
      break;
    case 'coffretIrve':
      garder = (c) => !COFFRETS_TD.includes(c) || (!!ctx.segment && SEGMENTS_TD.includes(ctx.segment));
      break;
    case 'sectionForcee':
      garder = (c) => c !== '35' || !ctx.mono;
      break;
    case 'connectivite':
      // Pas de 4G dans le TD IRVE ; SIM de la borne pour une borne seule (hors COP)
      garder = (c) => c !== 'integreeTdIrve' && (c !== 'simIntegree' || (ctx.segment !== 'COP' && (ctx.bornes ?? 0) <= 1));
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
        ...(source === 'infraCollective' ? [] : ['terre']),
        'notesCheminement',
      ];
    }
    case 'cheminement':
      return [
        'typeCheminement', ...DISTANCES, ...PERCEMENTS, 'sectionForcee',
        ...(texte(v.typeCheminement) === 'liaisonData' ? [] : ['passageFacade']),
        'notesCheminement',
      ];
    case 'tdIrveCoffret':
      // Gestion de charge et mesure de puissance : dans l'élément Communication (01/11, 21 h 35)
      return [...(cop ? [] : ['coffretIrve']), ...(cop ? ['emplacement'] : []), 'notesCheminement'];
    case 'borne':
      return ['puissanceVisee', 'marqueBorne', 'modeleBorne', 'supportBorne', 'notesCheminement'];
    case 'priseRenforcee':
      return ['marqueBorne', 'supportBorne', 'notesCheminement'];
    case 'communication': {
      // Questions du gestionnaire de charge d'abord (01/11, 21 h 35) : gestion, mesure si gestion, HUB si grappe ou COP.
      // Prise renforcée seule : pas de gestion de charge. TD de borne partagée : gestionnaire de grappe et HUB 10 compris,
      // rien à demander. PDL dédié : pas de mesure de puissance (D5, D6).
      const gestion = ctx.tdPartage ? 'gestionnaireGrappe' : texte(v.gestionCharge) || (ctx.prise ? '' : texte(ctx.gestion));
      return [
        ...(ctx.prise || ctx.tdPartage ? [] : ['gestionCharge']),
        ...(gestion && gestion !== 'aucune' && ctx.source !== 'pdlDedie' ? ['mesurePuissance'] : []),
        ...(cop || (gestion === 'gestionnaireGrappe' && !ctx.tdPartage) ? ['tailleHub'] : []),
        'connectivite', 'reseau', 'notesCheminement',
      ];
    }
    case 'boiteDerivation':
      return ['notesCheminement'];
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
    case 'communication':
      if (!ctx.prise && !ctx.tdPartage && !v.gestionCharge && !ctx.gestion) m.push('gestion de charge');
      if (!v.connectivite) m.push('connectivité');
      else if (v.connectivite === 'integreeTdIrve') m.push('connectivité (pas de 4G dans le TD IRVE : modem déporté)');
      else if (v.connectivite === 'simIntegree' && (ctx.bornes ?? 0) > 1) m.push('connectivité (SIM de la borne pour une borne seule : modem déporté)');
      break;
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
