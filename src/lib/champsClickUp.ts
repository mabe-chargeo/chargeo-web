// Fichier central des champs ClickUp (étape 1 du plan du 15/10/2026, tâche Phase 6).
// Un seul endroit pour les identifiants de champs et les index des menus déroulants.
// RÈGLE D'OR : les menus sont écrits PAR INDEX. Ne jamais réordonner ni insérer une option au milieu dans ClickUp :
// une nouvelle option se met TOUJOURS à la fin, puis on l'ajoute ici.
// Les champs existants ont les mêmes ID sur Qualification et sur 🧪 Qualification TEST.
// Les champs du 15/10 (Nature, Départ, Arrivée…) existent pour l'instant sur TEST seulement : en prod, Matthieu les
// AJOUTE (« ajouter un champ existant ») à Qualification, Planning et Parc, sans les recréer, pour garder ces ID.
// Les routes existantes gardent leurs ID en dur pour l'instant ; elles basculent sur ce fichier aux étapes suivantes.

export const CHAMPS = {
  // Passeport (le webhook Costructor les lit PAR NOM : ne pas les renommer)
  telephone: '6a120794-23be-4c50-8d25-75993f0aece4',
  email: '66aee5d1-7159-46a7-b986-3dd6c314fd80',
  adresse: '990a7f3b-989f-416d-9a80-eba5654b228d',
  typeClient: 'f6b45107-9ba0-406b-8fd7-d678e6ad11dc',
  lienCostructor: 'd9f88e8f-4e20-4a98-aee8-3ded30fef5fc',
  alerteSite: '42019c42-0af8-49de-a33d-8af0ddde3357',

  // Scénario
  segment: 'dbdacf18-1d26-4c58-9bbb-b4a9e443daa2',
  zoneDeplacement: '0f9043bf-ec87-4534-b8ea-af41734bdfed',
  nbPlacesParking: 'dd19d42f-8d9f-4657-bac5-942de6822468',
  lienDevis: 'ae80f202-2ef3-4302-b778-f36075ee398f',
  montantDevisHT: '58a159c7-edbc-4d53-a81a-5ec48337c7eb',
  numeroDevis: '4423a27f-ecc1-4107-9488-4784360178c0',

  // Élément : nature
  nature: '29e0a72d-8e75-411a-8315-ef120551273e',

  // Raccordement
  sourceRaccordement: '2db3f8ea-8fae-4f9f-80ca-3ea9a512ebbb',
  typeRaccordement: 'f122fe49-8a32-4fbd-a374-f27eeb4e25c1',
  puissanceDispo: '6a592626-ac8f-4a28-99a0-f1c6bdde09ea',
  etatTableau: '965fbd93-9c39-4dc4-9d3e-17aa63f667df',
  raccordementCible: '7f8283e6-ff3a-440e-90e0-72ab50d6354d',
  terre: '586b30e6-c225-4ee1-a9cb-2f2dc332fab9',

  // Cheminement
  depart: '0a18a483-b21e-47a6-9ade-404ace8831f6',
  arrivee: '239b3826-43d5-4e29-bad2-8bc5807c91c7',
  typeCheminement: 'c6b363bc-9c73-4025-9cbe-0f081e47f60f',
  sectionForcee: '94b82c08-6ef4-416d-863e-c7b4759ec6c6',
  distTubeApparent: '5370ee5e-8bed-435f-a924-70fa117ed78a',
  distGoulotte: 'cccfa938-5bec-459c-85b8-6574a32ef89d',
  distEncastre: 'c0c89b35-f1a2-41a8-8602-81391b421715',
  distVideSanitaire: 'd938dd22-2f04-4aba-a6db-f8fa8b62d1ee',
  distCheminCables: 'b89814c1-e0e9-4997-886e-d8637006afc0',
  distTirageExistant: 'ae081f1f-0a23-4a3d-918e-a8396e091214',
  distTranchee: '47a7156e-0852-4690-b747-e583f2b560a7',
  percementsPlaco: '8c57869c-447f-4350-b6d3-a02bc738bddd',
  percementsBrique: 'e6ec48b2-77c7-45ff-bcfa-6de603dc731b',
  percementsBeton: '77120088-4d88-4675-a7ac-d34f8eb5ffa7',
  percementsDalle: 'bda05bcd-b5f1-424f-bda4-ad435f06e32f',
  notesCheminement: '1442f71a-830e-4a77-8d78-0c30f45c4b23',

  // TD IRVE / coffret
  coffretIrve: 'ff4fad69-1a4a-4207-bcfa-7d63630256da',
  gestionCharge: 'ab8199a1-5bf7-4852-b214-d288f18182c5',
  mesurePuissance: '9310919e-298b-450f-896c-5cd17eaa84de',
  emplacement: '40b93216-c049-4d72-a18e-1bdc4a89013c',

  // Borne / Prise renforcée
  puissanceVisee: 'ddadfb52-ea48-4aca-9e85-86a4eca6615b',
  marqueBorne: 'c4511794-3887-4451-af87-38fbad94b42d',
  supportBorne: '02d61a39-eb1d-417c-953a-c1504dbfae50',

  // Communication
  connectivite: 'e8dcf83c-5dc1-4ea4-b72f-f179500fb893',
  reseau: 'fe5e2142-8191-4e61-86ee-d1e88ed4dc44',
  tailleHub: '85f237d4-792e-4851-89f9-675ae1144a73',

  // Autre
  quantite: '7939e585-1167-4052-97a2-806e0cdb1ec0',

  // Anciens champs (remplacés par les éléments, gardés le temps de la conversion)
  besoinDelesteur: 'bbef17d5-bdb2-4c25-bacc-00accdcdcbbf', // → ⚖️ Gestion de charge
  materielsAChiffrer: '784191c5-4252-47a4-af57-a7c5a54ca16b', // → un scénario par variante
  nbPointsDeCharge: 'ecd920d1-dff2-4bc3-9f15-25893eadae93', // → un élément Borne par borne
  longueurArtere: 'dc5878d3-dac5-4426-bfae-43c3ba3eaacc', // → Cheminement Artère
  distTgbtTdIrve: 'c555210d-1b5e-4ab8-ba7f-ffc7811ebc14', // → Cheminement Alimentation
  distRouteurTdIrve: '0ebc0cc5-97ae-4525-bc8d-ab98c3a3bd81', // → Cheminement Liaison data
} as const;

// Index des options, dans l'ordre exact de ClickUp (contrôlé le 15/10/2026).
export const OPTIONS = {
  typeClient: { particulier: 0, pro: 1, syndic: 2 },
  segment: { RES: 0, DAP: 1, COP: 2, PAR: 3, FLT: 4, TER: 5, RIC: 6 },
  sourceRaccordement: { tableauIndividuel: 0, tgbtServicesGeneraux: 1, pdlDedie: 2, infraCollective: 3 },
  typeRaccordement: { mono: 0, tri: 1 },
  puissanceDispo: { '3': 0, '6': 1, '9': 2, '12': 3, '18+': 4 },
  etatTableau: { ok: 0, aRemanier: 1, aRemplacer: 2 },
  raccordementCible: { inchange: 0, monoRenforce: 1, passageTri: 2, augmentation: 3 },
  nature: {
    borne: 0, priseRenforcee: 1, cheminement: 2, tdIrveCoffret: 3, raccordement: 4, communication: 5, autre: 6, boiteDerivation: 7,
  },
  typeCheminement: { alimentation: 0, artere: 1, liaisonData: 2 },
  sectionForcee: { '2.5': 0, '4': 1, '6': 2, '10': 3, '16': 4, '25': 5, '35': 6 },
  coffretIrve: {
    'COFF-MONO-3K': 0, 'COFF-MONO-7K': 1, 'COFF-MONO-7K-MOD': 2, 'COFF-TRI-11K': 3, 'COFF-TRI-11K-MOD': 4, 'COFF-TRI-22K': 5, 'COFF-TRI-22K-MOD': 6,
  },
  gestionCharge: { aucune: 0, delesteur: 1, gestionnaireGrappe: 2 },
  mesurePuissance: { ticLinky: 0, compteurModbus: 1 },
  emplacement: { localTechnique: 0, parking: 1, gainePaliere: 2 },
  puissanceVisee: { '3.7': 0, '7.4': 1, '11': 2, '22': 3 },
  marqueBorne: { hager: 0, schneider: 1, abb: 2, legrand: 3, peblar: 4 },
  supportBorne: { murBetonParpaing: 0, murPlaco: 1, murBois: 2, surPied: 3 },
  connectivite: { simIntegree: 0, modemDeporte: 1, integreeTdIrve: 2, switchBoiteDerivation: 3 },
  reseau: { wifi: 0, '4g': 1, cableRequis: 2 },
  tailleHub: { '10': 0, '20': 1, '150': 2 },
  zoneDeplacement: { Z1: 0, Z2: 1, Z3: 2 },
} as const;

export type Segment = keyof typeof OPTIONS.segment;
export type Nature = keyof typeof OPTIONS.nature;

// Libellés affichés (noms d'éléments : « Borne 1 », « Coffret 1 »…)
export const LIBELLE_NATURE: Record<Nature, string> = {
  borne: 'Borne',
  priseRenforcee: 'Prise renforcée',
  cheminement: 'Cheminement',
  tdIrveCoffret: 'Coffret',
  raccordement: 'Raccordement',
  communication: 'Communication',
  autre: 'Autre',
  boiteDerivation: 'Boîte de dérivation',
};

// Valeur d'un menu déroulant d'une tâche ClickUp, rendue en index (null si vide ou champ absent)
export function indexMenu(tache: any, champId: string): number | null {
  const f = (Array.isArray(tache?.custom_fields) ? tache.custom_fields : []).find((c: any) => c?.id === champId);
  if (!f || f.value === undefined || f.value === null || f.value === '') return null;
  const options: any[] = f.type_config?.options || [];
  const o = options.find((x: any) => x.orderindex === Number(f.value) || x.id === f.value);
  return o ? Number(o.orderindex) : null;
}

// Clé d'option (ex. 'COP', 'borne') à partir d'un index, pour un menu de OPTIONS
export function cleOption<M extends Record<string, number>>(menu: M, index: number | null): keyof M | null {
  if (index === null) return null;
  const trouve = Object.entries(menu).find(([, i]) => i === index);
  return trouve ? (trouve[0] as keyof M) : null;
}
