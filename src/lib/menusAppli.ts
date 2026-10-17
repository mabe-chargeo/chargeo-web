// Menus de l'application équipe par rôle, selon la « Carte des menus de l'application CHARGéO (proposition du
// 17/10/2026) », validée par Matthieu le 17/10/2026 (10 h 12) avec 2 correctifs :
//   1. le SAV de l'installateur ne montre que ses tickets, sans Urgences et tri (retiré le 11/10) ;
//   2. Carte du jour est aussi une pastille d'Interventions.
// Principe : ClickUp est rangé par service, l'application par travail à faire. Barre du bas : 3 ou 4 menus par rôle,
// puis « Plus ». Un menu = une liste à traiter, avec ses pastilles (vues ClickUp existantes et leurs compteurs).
// Les 5 changements de la carte : Feu vert et Réception sont des pastilles de Chantiers ; Saisie à la pose, Rapport et
// Visite de maintenance sont des actions de la fiche intervention (ACTIONS_INTERVENTION) ; Matériel et Achats
// fusionnent ; barre du chef de chantier Ma journée · Relevés · Chantiers · Planning ; Nouveau lead passe dans le
// bouton + (CREER).
// court = libellé de barre (1 ou 2 mots) pour ne pas être tronqué en 12 px.
// pret = écran déjà construit ; sinon l'onglet ouvre /interne/bientot/<clé>, qui affiche ce qui a été validé.
// Pastille sans href = à brancher quand l'écran du menu sera construit.
// Fichier pur (aucun accès réseau) : utilisable côté téléphone comme côté serveur. L'affichage ne donne aucun droit :
// chaque route contrôle les rôles elle-même.
// 17/10/2026, 10 h 44 : « un espace par rôle » validé pour le Commercial (src/lib/espaces.ts, écran /interne/espace).
// Barre du commercial : Ma journée · Mon espace · Plus. Les autres rôles gardent leur barre en attendant leur validation.
// 17/10/2026, 11 h 06 : espace Chef de chantier validé, même barre Ma journée · Mon espace · Plus (remplace la barre
// Ma journée · Relevés · Chantiers · Planning de la carte des menus).
// 17/10/2026, 11 h 18 : espace Installateur validé, même barre (l'espace s'intitule « Mon travail ») ; Mes interventions
// construit (/interne/interventions).
// 17/10/2026, 11 h 28 : espace Back-office validé, même barre Ma journée · Mon espace · Plus.

export type RoleAppli = 'direction' | 'commercial' | 'chargeOperation' | 'backOffice' | 'poseur';

export type CleIcone =
  | 'journee' | 'pipeline' | 'agenda' | 'contacts' | 'lead' | 'ressources'
  | 'planning' | 'releves' | 'chantiers' | 'materiel' | 'feuVert' | 'reception' | 'validation' | 'sav'
  | 'interventions' | 'carte' | 'maintenance'
  | 'facturation' | 'achats' | 'parc' | 'advenir' | 'decomptes' | 'rh' | 'pilotage';

// Pastille d'un menu : un filtre ou une vue de la liste. groupe = intitulé de la rangée (Prospection, Visites, Devis…).
// roles absent = visible par tous les rôles qui ont le menu.
export type Pastille = { cle: string; libelle: string; groupe?: string; href?: string; roles?: RoleAppli[] };

export type Ecran = {
  cle: string;
  libelle: string;
  court?: string;
  href: string;
  icone: CleIcone;
  pret: boolean;
  // Chemins où l'onglet est considéré comme actif
  actif: string[];
  // Contenu validé (affiché sur l'écran « à construire » et dans Plus)
  description: string;
  pastilles?: Pastille[];
  // Pastille ouverte par défaut selon le rôle (Matériel et achats : À commander pour le chef, Livraisons en retard
  // pour le back-office)
  parDefaut?: Partial<Record<RoleAppli, string>>;
};

const bientot = (cle: string, libelle: string, icone: CleIcone, description: string, plus: Partial<Ecran> = {}): Ecran => ({
  cle, libelle, icone, description, pret: false, href: `/interne/bientot/${cle}`, actif: [`/interne/bientot/${cle}`], ...plus,
});

const fiches = (vue: string) => `/interne/fiches?vue=${vue}`;

export const ECRANS: Record<string, Ecran> = {
  // ── Écrans construits ──
  journee: {
    cle: 'journee', libelle: 'Ma journée', href: '/interne/journee', icone: 'journee', pret: true, actif: ['/interne/journee'],
    description: "À faire aujourd'hui (une carte = une action) et à débloquer (retards, urgences), selon le rôle",
  },
  pipeline: {
    cle: 'pipeline', libelle: 'Pipeline', href: '/interne/fiches', icone: 'pipeline', pret: true, actif: ['/interne/fiches'],
    description: 'Prospection (Chasse) et Qualification (Études) : appels, visites, devis, gagnées et perdues',
    pastilles: [
      { cle: 'a-appeler', libelle: "À appeler aujourd'hui", groupe: 'Prospection' },
      { cle: 'chasse', libelle: 'Pipeline chasse', groupe: 'Prospection' },
      { cle: 'linkedin', libelle: 'LinkedIn', groupe: 'Prospection' },
      { cle: 'a-caler', libelle: 'À caler', groupe: 'Visites', href: fiches('a-caler') },
      { cle: 'planifies', libelle: 'Relevés planifiés', groupe: 'Visites', href: fiches('planifies') },
      { cle: 'en-retard', libelle: 'En retard', groupe: 'Visites', href: fiches('en-retard') },
      { cle: 'devis-a-chiffrer', libelle: 'À chiffrer', groupe: 'Devis', href: fiches('devis-a-chiffrer') },
      { cle: 'devis-envoyes', libelle: 'Envoyés', groupe: 'Devis', href: fiches('devis-envoyes') },
      { cle: 'relances-echues', libelle: 'Relances échues', groupe: 'Devis', href: fiches('relances-echues') },
      { cle: 'en-negociation', libelle: 'En négociation', groupe: 'Devis', href: fiches('en-negociation') },
      { cle: 'gagnees', libelle: 'Gagnées', groupe: 'Issue', href: fiches('gagnees') },
      { cle: 'perdues', libelle: 'Perdues', groupe: 'Issue' },
      { cle: 'toutes', libelle: 'Toutes', groupe: 'Issue', href: fiches('toutes') },
    ],
  },
  espace: {
    cle: 'espace', libelle: 'Mon espace', href: '/interne/espace', icone: 'pipeline', pret: true,
    actif: ['/interne/espace', '/interne/fiches', '/interne/prospection', '/interne/contacts', '/interne/chantiers', '/interne/feu-vert', '/interne/validation', '/interne/interventions', '/interne/reception', '/interne'],
    description: 'Les vues du rôle, dans l’ordre de son travail, avec leurs compteurs',
  },
  releves: {
    cle: 'releves', libelle: 'Relevés', href: '/interne', icone: 'releves', pret: true, actif: ['/interne', '/interne/metre'],
    description: 'Outil terrain : fiches 📍 à visiter, relevé (mètre, scénarios, photos) utilisable hors ligne',
    pastilles: [
      { cle: 'aujourdhui', libelle: "Aujourd'hui" },
      { cle: 'a-venir', libelle: 'À venir' },
      { cle: 'carte', libelle: 'Carte des audits' },
    ],
  },
  chantiers: {
    cle: 'chantiers', libelle: 'Chantiers', href: '/interne/chantiers', icone: 'chantiers', pret: true,
    actif: ['/interne/chantiers', '/interne/feu-vert', '/interne/validation'],
    description: 'Planning Chantiers : chantiers en cours par étape, avec feu vert et réception',
    pastilles: [
      { cle: 'feu-vert', libelle: 'Feu vert à donner', href: '/interne/feu-vert' },
      { cle: 'prets', libelle: 'Prêts' },
      { cle: 'en-cours', libelle: 'En cours' },
      { cle: 'a-receptionner', libelle: 'À réceptionner', href: '/interne/validation' },
      { cle: 'reserves', libelle: 'Réserves à lever' },
      { cle: 'avancement', libelle: 'Avancement' },
      { cle: 'carte', libelle: 'Carte des chantiers' },
    ],
  },
  interventions: {
    cle: 'interventions', libelle: 'Mes interventions', court: 'Interventions', href: '/interne/interventions', icone: 'interventions', pret: true,
    actif: ['/interne/interventions', '/interne/reception'],
    description: 'Poses et visites de maintenance affectées à l’installateur, par jour, avec l’itinéraire du jour, lisibles hors ligne',
  },

  // Étapes et actions construites, ouvertes depuis une pastille ou une fiche (plus dans la barre ni dans Plus)
  feuVert: { cle: 'feuVert', libelle: 'Feu vert', href: '/interne/feu-vert', icone: 'feuVert', pret: true, actif: ['/interne/feu-vert'], description: 'Pastille de Chantiers : prérequis par chantier et ce qui manque' },
  validation: { cle: 'validation', libelle: 'Réception', href: '/interne/validation', icone: 'validation', pret: true, actif: ['/interne/validation'], description: 'Pastille de Chantiers : fin de travaux, réserves bloquantes ou mineures, passage au Parc' },
  reception: { cle: 'reception', libelle: 'Rapport et signature', href: '/interne/reception', icone: 'reception', pret: true, actif: ['/interne/reception'], description: "Action de la fiche intervention : PV signé, rapport de mesures, photos et réserves, validé par le chef de chantier" },

  // ── Commercial ──
  agenda: bientot('agenda', 'Agenda', 'agenda', 'AGENDA VISITES et CARTE DES AUDITS de Qualification : jour, semaine, carte des visites.', {
    pastilles: [{ cle: 'jour', libelle: 'Jour' }, { cle: 'semaine', libelle: 'Semaine' }, { cle: 'carte', libelle: 'Carte des visites' }],
  }),
  contacts: {
    cle: 'contacts', libelle: 'Contacts', href: '/interne/contacts', icone: 'contacts', pret: true, actif: ['/interne/contacts'],
    description: 'Annuaire de la liste Contacts, partagé entre le commercial et le back-office : recherche, rôle, Appeler, Google Voice, SMS, Gmail.',
  },
  ressources: bientot('ressources', 'Ressources', 'ressources', 'Le Google Drive partagé de l’espace Commercial (remplace « Outils & Wiki » de ClickUp).'),

  // ── Chef de chantier ──
  planning: bientot('planning', 'Planning', 'planning', 'Planning Chantiers, Tickets SAV et Maintenance : Master planning (chantiers) et Planning techs (par installateur), filtres poses, dépannages, visites de maintenance.', {
    pastilles: [
      { cle: 'master', libelle: 'Master planning' },
      { cle: 'techs', libelle: 'Planning techs' },
      { cle: 'poses', libelle: 'Poses', groupe: 'Filtres' },
      { cle: 'depannages', libelle: 'Dépannages', groupe: 'Filtres' },
      { cle: 'visites', libelle: 'Visites de maintenance', groupe: 'Filtres' },
    ],
  }),
  sav: bientot('sav', 'SAV et maintenance', 'sav', 'Tickets SAV et Maintenance : urgences et tri, dépannages planifiés, visites à préparer (J-30), suivi des visites. Fiche ticket avec l’historique de la borne. Les SAV urgents remontent aussi dans Ma journée.', {
    court: 'SAV',
    pastilles: [
      { cle: 'urgences', libelle: 'Urgences et tri' },
      { cle: 'depannages', libelle: 'Dépannages planifiés' },
      { cle: 'j-30', libelle: 'Visites à préparer (J-30)' },
      { cle: 'suivi-visites', libelle: 'Suivi des visites' },
    ],
  }),
  materielAchats: bientot('materielAchats', 'Matériel et achats', 'materiel', 'Commandes Matériel et Achats Fournisseurs : à commander, en livraison, réceptions prévues, livraisons en retard. Fiche commande : attendu, reçu, conforme.', {
    court: 'Matériel',
    pastilles: [
      { cle: 'a-commander', libelle: 'À commander' },
      { cle: 'en-livraison', libelle: 'En livraison' },
      { cle: 'receptions', libelle: 'Réceptions prévues' },
      { cle: 'retards', libelle: 'Livraisons en retard' },
    ],
    parDefaut: { chargeOperation: 'a-commander', backOffice: 'retards' },
  }),
  parc: bientot('parc', 'Parc', 'parc', 'Parc Installé : base globale, renouvellements et contrats, supervision, carte des bornes. Fiche installation ou borne : mesures, SAV, contrat, documents, visites. Installateur : historique d’une borne seulement.', {
    pastilles: [
      { cle: 'base', libelle: 'Base globale', roles: ['direction', 'chargeOperation', 'backOffice'] },
      { cle: 'contrats', libelle: 'Renouvellements et contrats', roles: ['direction', 'chargeOperation', 'backOffice'] },
      { cle: 'supervision', libelle: 'Supervision', roles: ['direction', 'chargeOperation', 'backOffice'] },
      { cle: 'carte', libelle: 'Carte des bornes' },
    ],
  }),

  // ── Installateur ──
  carteDuJour: bientot('carteDuJour', 'Carte du jour', 'carte', 'Itinéraire des interventions du jour (aussi en pastille d’Interventions).', { court: 'Carte' }),
  savSite: { cle: 'savSite', libelle: 'Mes tickets SAV', court: 'SAV', href: '/interne/interventions?vue=sav', icone: 'sav', pret: true, actif: [], description: 'Ses tickets SAV pas encore résolus, avec l’historique de la borne. Pas d’accès à Urgences et tri (chef de chantier).' },
  saisiePose: bientot('saisiePose', 'Saisie à la pose', 'reception', 'Action de la fiche intervention : matériel posé, n° de série, puissance configurée, mesures (terre, protections), photos, hors ligne.'),
  maintenance: bientot('maintenance', 'Visite de maintenance', 'maintenance', 'Action de la fiche intervention : mesures par point de charge (point 18).'),

  // ── Back-office ──
  facturation: bientot('facturation', 'Facturation', 'facturation', 'Factures Clients (Costructor fait référence) : à émettre, envoyées, en retard J+3 / J+10 / J+15, réglées. Fiche facture : lien Costructor, reste dû.', {
    pastilles: [
      { cle: 'a-emettre', libelle: 'À émettre' },
      { cle: 'envoyees', libelle: 'Envoyées' },
      { cle: 'retard', libelle: 'En retard J+3 / J+10 / J+15' },
      { cle: 'reglees', libelle: 'Réglées' },
    ],
  }),
  advenir: bientot('advenir', 'Aides ADVENIR', 'advenir', 'Dossiers Advenir : suivi quotidien, alertes délais, cash-flow des aides. Fiche dossier : pièces, échéances.', {
    court: 'ADVENIR',
    pastilles: [{ cle: 'suivi', libelle: 'Suivi quotidien' }, { cle: 'alertes', libelle: 'Alertes délais' }, { cle: 'cash-flow', libelle: 'Cash-flow des aides' }],
  }),
  decomptes: bientot('decomptes', 'Décomptes', 'decomptes', 'Décomptes énergétiques : à préparer, à valider, envoyés au gestionnaire (points 6 et 9). Liste ClickUp à créer avant de construire ce menu.', {
    pastilles: [{ cle: 'a-preparer', libelle: 'À préparer' }, { cle: 'a-valider', libelle: 'À valider' }, { cle: 'envoyes', libelle: 'Envoyés' }],
  }),
  rh: bientot('rh', 'RH et recrutement', 'rh', 'Gestion RH, Vie des salariés et les 2 listes Recrutement : demandes, salariés, recrutement installateurs et commerciaux.', {
    court: 'RH',
    pastilles: [{ cle: 'demandes', libelle: 'Demandes' }, { cle: 'salaries', libelle: 'Salariés' }, { cle: 'installateurs', libelle: 'Recrutement installateurs' }, { cle: 'commerciaux', libelle: 'Recrutement commerciaux' }],
  }),

  // ── Direction ──
  pilotage: bientot('pilotage', 'Pilotage', 'pilotage', 'Réunions CODIR, Stratégie & OKR, Vues globales, Kaizen, To-Do. Tableaux de bord prévus en Phase 7.', {
    pastilles: [{ cle: 'codir', libelle: 'CODIR' }, { cle: 'okr', libelle: 'OKR' }, { cle: 'kaizen', libelle: 'Kaizen' }, { cle: 'todo', libelle: 'To-Do' }],
  }),

  // ── Bouton + (créations, pas des destinations) ──
  lead: bientot('lead', 'Nouveau lead', 'lead', 'Écran de l’application qui écrit dans Qualification, comme les formulaires du site.'),
  ticketSav: bientot('ticketSav', 'Ticket SAV', 'sav', 'Créer un ticket SAV, rattaché à la borne concernée.'),
  kaizen: bientot('kaizen', 'Idée Kaizen', 'pilotage', 'Proposer une idée d’amélioration (liste Kaizen).'),
};

// Barre du bas (4 onglets au plus, « Plus » est ajouté après) et contenu de « Plus », par rôle (section 4 de la carte)
export const MENUS: Record<RoleAppli, { barre: string[]; plus: string[] }> = {
  commercial: { barre: ['journee', 'espace'], plus: ['ressources'] },
  chargeOperation: { barre: ['journee', 'espace'], plus: ['parc'] },
  poseur: { barre: ['journee', 'espace'], plus: ['releves', 'parc'] },
  backOffice: { barre: ['journee', 'espace'], plus: ['parc'] },
  direction: {
    barre: ['journee', 'pipeline', 'chantiers', 'pilotage'],
    plus: ['releves', 'planning', 'agenda', 'contacts', 'sav', 'materielAchats', 'parc', 'facturation', 'advenir', 'decomptes', 'rh', 'ressources', 'interventions'],
  },
};

// Bouton + du cadre : créations possibles par rôle (nouveau lead, ticket SAV, idée Kaizen)
export const CREER: Record<RoleAppli, string[]> = {
  commercial: ['lead', 'kaizen'],
  chargeOperation: ['ticketSav', 'kaizen'],
  poseur: ['ticketSav', 'kaizen'],
  backOffice: ['ticketSav', 'kaizen'],
  direction: ['lead', 'ticketSav', 'kaizen'],
};

// Actions de la fiche intervention (installateur), dans l'ordre du parcours
export const ACTIONS_INTERVENTION: string[] = ['saisiePose', 'reception', 'maintenance'];

export const LIBELLE_ROLE: Record<RoleAppli, string> = {
  direction: 'Direction',
  commercial: 'Commercial',
  chargeOperation: 'Chef de chantier',
  backOffice: 'Back-office',
  poseur: 'Installateur',
};

// Ordre de préférence quand une personne a plusieurs rôles et n'a rien choisi
export const ORDRE_ROLES: RoleAppli[] = ['direction', 'chargeOperation', 'commercial', 'backOffice', 'poseur'];

// Libellé affiché dans la barre du bas
export const libelleBarre = (ecran: Ecran): string => ecran.court || ecran.libelle;

// Pastilles d'un menu visibles pour un rôle
export function pastillesDe(ecran: Ecran, role: RoleAppli | null): Pastille[] {
  return (ecran.pastilles || []).filter((p) => !p.roles || role === 'direction' || (!!role && p.roles.includes(role)));
}

// Onglet actif : chemin exact pour /interne (planning terrain), sinon préfixe
export function estActif(ecran: Ecran, chemin: string): boolean {
  return ecran.actif.some((p) => (p === '/interne' ? chemin === '/interne' : chemin === p || chemin.startsWith(`${p}/`) || chemin.startsWith(`${p}?`)));
}
