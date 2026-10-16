// Relevé élément par élément (étape 4 du plan du 15/10/2026, PR #51).
// Matrice des champs par nature : synthèse finale du 14/10, section 4. Fichier neutre (serveur et écran).
// Les clés sont celles de CHAMPS (identifiant du champ) et de OPTIONS (options des menus) dans src/lib/champsClickUp.ts.
// Notes : un seul champ ClickUp « 📝 Notes Cheminement », utilisé comme notes de tout élément.
// 15/10, 16 h 31 (retour de Matthieu) : scénario à prise renforcée seule (aucune borne), le coffret ne demande plus la
// gestion de charge ni la mesure de puissance, et « Prêt à chiffrer » ne les exige plus.
import type { Nature, Segment } from '@/lib/champsClickUp';

export type TypeSaisie = 'menu' | 'nombre' | 'texte';
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
export type ContexteReleve = { segment: Segment | null; grappe: boolean; prise?: boolean };

const menu = (cle: string, libelle: string, options: [string, string][]): Saisie =>
  ({ cle, libelle, type: 'menu', options: options.map(([c, l]) => ({ cle: c, libelle: l })) });
const nombre = (cle: string, libelle: string): Saisie => ({ cle, libelle, type: 'nombre' });

export const SAISIES: Record<string, Saisie> = {
  // Raccordement
  sourceRaccordement: menu('sourceRaccordement', 'Source de raccordement', [
    ['tableauIndividuel', 'Tableau individuel existant'], ['tgbtServicesGeneraux', 'TGBT services généraux'],
    ['pdlDedie', 'PDL dédié'], ['infraCollective', 'Infra collective CHARGéO'],
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
  // TD IRVE / coffret
  coffretIrve: menu('coffretIrve', 'Référence du coffret', [
    ['COFF-MONO-3K', 'COFF-MONO-3K'], ['COFF-MONO-7K', 'COFF-MONO-7K'], ['COFF-MONO-7K-MOD', 'COFF-MONO-7K-MOD'],
    ['COFF-TRI-11K', 'COFF-TRI-11K'], ['COFF-TRI-11K-MOD', 'COFF-TRI-11K-MOD'], ['COFF-TRI-22K', 'COFF-TRI-22K'], ['COFF-TRI-22K-MOD', 'COFF-TRI-22K-MOD'],
  ]),
  gestionCharge: menu('gestionCharge', 'Gestion de charge', [['aucune', 'Aucune'], ['delesteur', 'Délesteur'], ['gestionnaireGrappe', 'Gestionnaire de grappe']]),
  mesurePuissance: menu('mesurePuissance', 'Mesure de puissance', [['ticLinky', 'TIC Linky'], ['compteurModbus', 'Compteur Modbus']]),
  emplacement: menu('emplacement', 'Emplacement du TD IRVE', [['localTechnique', 'Local technique'], ['parking', 'Parking'], ['gainePaliere', 'Gaine palière']]),
  // Borne / prise renforcée
  puissanceVisee: menu('puissanceVisee', 'Puissance visée', [['3.7', '3,7 kW'], ['7.4', '7,4 kW'], ['11', '11 kW'], ['22', '22 kW']]),
  marqueBorne: menu('marqueBorne', 'Marque', [['hager', 'Hager'], ['schneider', 'Schneider'], ['abb', 'ABB'], ['legrand', 'Legrand'], ['peblar', 'Peblar']]),
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
  cheminement: ['typeCheminement', ...DISTANCES, ...PERCEMENTS, 'sectionForcee', 'notesCheminement'],
  tdIrveCoffret: ['coffretIrve', 'gestionCharge', 'mesurePuissance', 'emplacement', 'notesCheminement'],
  borne: ['puissanceVisee', 'marqueBorne', 'supportBorne', 'notesCheminement'],
  priseRenforcee: ['puissanceVisee', 'marqueBorne', 'supportBorne', 'notesCheminement'],
  communication: ['connectivite', 'reseau', 'tailleHub', 'notesCheminement'],
  boiteDerivation: ['notesCheminement'],
  autre: ['quantite', 'notesCheminement'],
};

const texte = (v: unknown) => (v === null || v === undefined ? '' : String(v));

export function contexteReleve(segment: Segment | null, elements: ElementReleve[]): ContexteReleve {
  return {
    segment,
    grappe: elements.some((e) => e.nature === 'tdIrveCoffret' && e.valeurs.gestionCharge === 'gestionnaireGrappe'),
    prise: elements.some((e) => e.nature === 'priseRenforcee') && !elements.some((e) => e.nature === 'borne'),
  };
}

// Champs affichés selon la nature et les valeurs déjà saisies (matrice de la synthèse, section 4)
export function champsVisibles(nature: Nature | null, v: Valeurs, ctx: ContexteReleve): string[] {
  const cop = ctx.segment === 'COP';
  switch (nature) {
    case 'raccordement': {
      const source = texte(v.sourceRaccordement);
      const sansTableau = source === 'pdlDedie' || source === 'infraCollective';
      return [
        'sourceRaccordement', 'typeRaccordement',
        ...(sansTableau ? [] : ['puissanceDispo', 'etatTableau', 'raccordementCible']),
        ...(source === 'infraCollective' ? [] : ['terre']),
        'notesCheminement',
      ];
    }
    case 'cheminement':
      return ['typeCheminement', ...DISTANCES, ...PERCEMENTS, 'sectionForcee', 'notesCheminement'];
    case 'tdIrveCoffret': {
      const gestion = texte(v.gestionCharge);
      // Prise renforcée seule : pas de gestion de charge, donc pas de mesure de puissance
      if (ctx.prise) return [...(cop ? [] : ['coffretIrve']), ...(cop ? ['emplacement'] : []), 'notesCheminement'];
      return [
        ...(cop ? [] : ['coffretIrve']),
        'gestionCharge',
        ...(gestion && gestion !== 'aucune' ? ['mesurePuissance'] : []),
        ...(cop ? ['emplacement'] : []),
        'notesCheminement',
      ];
    }
    case 'borne':
      return ['puissanceVisee', 'marqueBorne', 'supportBorne', 'notesCheminement'];
    case 'priseRenforcee':
      return ['marqueBorne', 'supportBorne', 'notesCheminement'];
    case 'communication':
      return ['connectivite', 'reseau', ...(cop || ctx.grappe ? ['tailleHub'] : []), 'notesCheminement'];
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

// Ce qui manque pour chiffrer (bouton « Prêt à chiffrer »)
export function manquants(e: ElementReleve, ctx: ContexteReleve): string[] {
  const v = e.valeurs;
  const m: string[] = [];
  switch (e.nature) {
    case 'raccordement': {
      const source = texte(v.sourceRaccordement);
      if (!source) m.push('source');
      if (!v.typeRaccordement) m.push('mono ou tri');
      if (source && source !== 'pdlDedie' && source !== 'infraCollective' && !v.puissanceDispo) m.push('puissance dispo');
      break;
    }
    case 'cheminement':
      if (!e.depart) m.push('départ');
      if (!e.arrivee && texte(v.typeCheminement) !== 'artere') m.push('arrivée');
      if (longueurTotale(v) <= 0) m.push('distances');
      break;
    case 'tdIrveCoffret':
      if (ctx.segment !== 'COP' && !v.coffretIrve) m.push('référence du coffret');
      if (!ctx.prise && !v.gestionCharge) m.push('gestion de charge');
      break;
    case 'borne':
      if (!v.puissanceVisee) m.push('puissance visée');
      break;
    case 'communication':
      if (!v.connectivite) m.push('connectivité');
      break;
    case 'autre':
      if (!v.quantite) m.push('quantité');
      break;
    case 'priseRenforcee':
    case 'boiteDerivation':
      break;
    default:
      m.push('nature');
  }
  return m;
}
