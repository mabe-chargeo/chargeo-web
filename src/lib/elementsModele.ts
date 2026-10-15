// Modèle des éléments d'un scénario (étape 3 du plan du 15/10/2026, PR #51).
// Source : synthèse finale du 14/10/2026 dans la tâche Phase 6, sections 3 (natures et noms) et 5 (éléments par défaut).
// Fichier neutre : utilisé par le serveur (src/lib/elements.ts) et par l'écran (src/components/ui/Elements.tsx).
// 15/10, 12 h 36 (demande de Matthieu) : dans le nom d'un cheminement, le raccordement s'écrit « Raccordement » tout court.
import { CHAMPS, OPTIONS, LIBELLE_NATURE, type Nature, type Segment } from '@/lib/champsClickUp';

export type Materiel = 'borne' | 'prise';
export type CleSource = keyof typeof OPTIONS.sourceRaccordement;
export type SpecElement = {
  cle: string;
  nature: Nature;
  nom: string;
  valeurs: Record<string, number>; // champ → index du menu (ou nombre)
  depart?: string; // clé d'un autre élément de la même liste
  arrivee?: string;
};

// Segments « une borne » : Raccordement + 2 cheminements + coffret + borne + communication
export const SEGMENTS_BORNE: Segment[] = ['RES', 'DAP', 'PAR', 'FLT', 'TER'];

export const LIBELLE_SEGMENT: Record<Segment, string> = {
  RES: 'RES · Résidentiel (compteur du résident)',
  DAP: 'DAP · Services généraux de la copro',
  COP: 'COP · Infra collective',
  PAR: 'PAR · Borne partagée',
  FLT: 'FLT · Flotte',
  TER: 'TER · Tertiaire',
  RIC: 'RIC · Résident sur infra collective',
};

export const LIBELLE_NATURE_LONG: Record<Nature, string> = {
  borne: 'Borne',
  priseRenforcee: 'Prise renforcée',
  cheminement: 'Cheminement',
  tdIrveCoffret: 'TD IRVE / coffret',
  raccordement: 'Raccordement',
  communication: 'Communication',
  autre: 'Autre',
  boiteDerivation: 'Boîte de dérivation',
};

// Ordre d'affichage : du réseau vers la borne
export const ORDRE_NATURE: Record<Nature, number> = {
  raccordement: 0, tdIrveCoffret: 1, boiteDerivation: 2, borne: 3, priseRenforcee: 3, communication: 4, autre: 5, cheminement: 6,
};

// Source préremplie selon le segment (modifiable au relevé)
export const SOURCE_PAR_SEGMENT: Partial<Record<Segment, CleSource>> = {
  RES: 'tableauIndividuel',
  DAP: 'tgbtServicesGeneraux',
  RIC: 'infraCollective',
};

const NOM_SOURCE: Record<CleSource, string> = {
  tableauIndividuel: 'Tableau individuel',
  tgbtServicesGeneraux: 'TGBT SG',
  pdlDedie: 'PDL dédié',
  infraCollective: 'Infra collective',
};

export const nomRaccordement = (source?: CleSource | null) => (source ? `Raccordement · ${NOM_SOURCE[source]}` : 'Raccordement');

// Nom d'un bout de cheminement : « Raccordement · Tableau individuel » devient « Raccordement »
const bout = (nom: string | null) => (nom && nom.startsWith('Raccordement · ') ? 'Raccordement' : nom);

// « Cheminement · Coffret 1 → Borne 1 » ; artère sans arrivée : « … → fin d'artère »
export const nomCheminement = (depart: string | null, arrivee: string | null, artere = false) =>
  `Cheminement · ${bout(depart) || '…'} → ${bout(arrivee) || (artere ? "fin d'artère" : '…')}`;

// Un nom de cheminement est recalculé tant qu'il commence par « Cheminement · » (un nom saisi à la main n'est plus touché)
export const estNomCheminementAuto = (nom: string) => nom.startsWith('Cheminement · ');

// COP : une boîte de dérivation par tranche de 4 places, arrondi au-dessus
export const boitesPourPlaces = (places: number) => (places > 0 ? Math.ceil(places / 4) : 0);

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Nom du prochain élément d'une nature : « Borne 2 », « Coffret 3 ». Raccordement, Communication et TD IRVE (COP) sont
// uniques par défaut, numérotés seulement à partir du deuxième.
export function prochainNom(nature: Nature, existants: string[], cop = false): string {
  if (nature === 'cheminement') return nomCheminement(null, null);
  const tdIrve = nature === 'tdIrveCoffret' && cop;
  const base = tdIrve ? 'TD IRVE' : LIBELLE_NATURE[nature];
  const unique = tdIrve || nature === 'raccordement' || nature === 'communication';
  const motif = new RegExp(`^${echapper(base)}(?:\\s+(\\d+))?(?:\\s|$)`);
  let present = false;
  let plusHaut = 0;
  for (const nom of existants) {
    const m = nom.match(motif);
    if (!m) continue;
    present = true;
    plusHaut = Math.max(plusHaut, m[1] ? parseInt(m[1], 10) : 1);
  }
  if (unique) return present ? `${base} ${plusHaut + 1}` : base;
  return `${base} ${plusHaut + 1}`;
}

// Éléments créés d'office (synthèse du 14/10, section 5)
export function specsParDefaut(segment: Segment, materiel: Materiel = 'borne', places = 0): SpecElement[] {
  const typeCh = (t: keyof typeof OPTIONS.typeCheminement): Record<string, number> => ({ [CHAMPS.typeCheminement]: OPTIONS.typeCheminement[t] });

  if (segment === 'COP') {
    const specs: SpecElement[] = [
      { cle: 'R', nature: 'raccordement', nom: 'Raccordement', valeurs: {} },
      { cle: 'TD', nature: 'tdIrveCoffret', nom: 'TD IRVE', valeurs: { [CHAMPS.gestionCharge]: OPTIONS.gestionCharge.gestionnaireGrappe } },
      { cle: 'COM', nature: 'communication', nom: 'Communication', valeurs: {} },
    ];
    for (let i = 1; i <= boitesPourPlaces(places); i++) {
      specs.push({ cle: `BD${i}`, nature: 'boiteDerivation', nom: `Boîte de dérivation ${i}`, valeurs: {} });
    }
    specs.push(
      { cle: 'CH1', nature: 'cheminement', nom: nomCheminement('Raccordement', 'TD IRVE'), valeurs: typeCh('alimentation'), depart: 'R', arrivee: 'TD' },
      { cle: 'CH2', nature: 'cheminement', nom: nomCheminement('TD IRVE', null, true), valeurs: typeCh('artere'), depart: 'TD' },
      { cle: 'CH3', nature: 'cheminement', nom: nomCheminement('Communication', 'TD IRVE'), valeurs: typeCh('liaisonData'), depart: 'COM', arrivee: 'TD' },
    );
    return specs;
  }

  const source = SOURCE_PAR_SEGMENT[segment];
  const raccordement: SpecElement = {
    cle: 'R',
    nature: 'raccordement',
    nom: nomRaccordement(source),
    valeurs: source ? { [CHAMPS.sourceRaccordement]: OPTIONS.sourceRaccordement[source] } : {},
  };

  // Prise renforcée : coffret COFF-MONO-3K, 3,7 kW, jamais pilotée donc pas de Communication
  if (materiel === 'prise' && segment !== 'RIC') {
    return [
      raccordement,
      { cle: 'C1', nature: 'tdIrveCoffret', nom: 'Coffret 1', valeurs: { [CHAMPS.coffretIrve]: OPTIONS.coffretIrve['COFF-MONO-3K'] } },
      { cle: 'P1', nature: 'priseRenforcee', nom: 'Prise renforcée 1', valeurs: { [CHAMPS.puissanceVisee]: OPTIONS.puissanceVisee['3.7'] } },
      { cle: 'CH1', nature: 'cheminement', nom: nomCheminement(raccordement.nom, 'Coffret 1'), valeurs: typeCh('alimentation'), depart: 'R', arrivee: 'C1' },
      { cle: 'CH2', nature: 'cheminement', nom: nomCheminement('Coffret 1', 'Prise renforcée 1'), valeurs: typeCh('alimentation'), depart: 'C1', arrivee: 'P1' },
    ];
  }

  // Borne seule : SIM intégrée par défaut (RES, DAP, PAR) ; RIC : switch de la boîte de dérivation
  const communication: Record<string, number> = segment === 'RIC'
    ? { [CHAMPS.connectivite]: OPTIONS.connectivite.switchBoiteDerivation }
    : ['RES', 'DAP', 'PAR'].includes(segment)
      ? { [CHAMPS.connectivite]: OPTIONS.connectivite.simIntegree }
      : {};
  return [
    raccordement,
    { cle: 'C1', nature: 'tdIrveCoffret', nom: 'Coffret 1', valeurs: {} },
    { cle: 'B1', nature: 'borne', nom: 'Borne 1', valeurs: {} },
    { cle: 'COM', nature: 'communication', nom: 'Communication', valeurs: communication },
    { cle: 'CH1', nature: 'cheminement', nom: nomCheminement(raccordement.nom, 'Coffret 1'), valeurs: typeCh('alimentation'), depart: 'R', arrivee: 'C1' },
    { cle: 'CH2', nature: 'cheminement', nom: nomCheminement('Coffret 1', 'Borne 1'), valeurs: typeCh('alimentation'), depart: 'C1', arrivee: 'B1' },
  ];
}
