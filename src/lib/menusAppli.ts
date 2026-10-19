// Menus de l'application équipe par rôle, selon la « Carte des menus de l'application CHARGéO (proposition du
// 17/10/2026) », validée par Matthieu le 17/10/2026 (10 h 12) avec 2 correctifs :
//   1. le SAV de l'installateur ne montre que ses tickets, sans Urgences et tri (retiré le 11/10) ;
//   2. Carte du jour est aussi une pastille d'Interventions.
// Principe : ClickUp est rangé par service, l'application par travail à faire. Un menu = une liste à traiter, avec ses
// pastilles (vues ClickUp existantes et leurs compteurs).
// court = libellé de barre (1 ou 2 mots) pour ne pas être tronqué en 12 px.
// pret = écran déjà construit ; sinon l'onglet ouvre /bientot/<clé>, qui affiche ce qui a été validé.
// Pastille sans href = à brancher quand l'écran du menu sera construit.
// Fichier pur (aucun accès réseau) : utilisable côté téléphone comme côté serveur. L'affichage ne donne aucun droit :
// chaque route contrôle les rôles elle-même.
// Historique du 17/10/2026 : un espace par rôle validé (Commercial 10 h 44, Chef de chantier 11 h 06, Installateur
// 11 h 18, Back-office 11 h 28, Direction 11 h 37) ; Nouveau projet (14 h 08) ; écrans qui manquent (14 h 28) ; Visite
// de maintenance (14 h 50) ; Décomptes (15 h 22) ; en direction plus de raccourcis vers les espaces des rôles
// (16 h 11) ; Ressources par rôle (17 h 03, /ressources, src/lib/ressources.ts).
// 17 h 24 (choix de Matthieu : « Mon espace en deux parties ») : « À traiter » (les vues avec compteur,
// src/lib/espaces.ts) puis « À consulter » (MENUS[rôle].consulter) ; Plus = les créations (CREER) et la déconnexion.
// 17 h 32 : Relevés retiré de l'installateur. 18 h 02 : Parc installé retiré aussi de l'installateur (décision du
// 11/10 « pas d'accès à la Base de données globale du Parc »). Pastilles de Chantiers branchées.
// 18 h 27 : Carte du SAV dans À consulter du chef de chantier et de la direction.
// 18 h 34 : plus de livraisons dans le Planning (elles restent dans Matériel et achats) ; pastille Relevés techniques.
// 18 h 48 : Livraisons en retard lue dans Commandes Matériel ; pastille « Achats à valider » pour la dépense.
// 19 h 10 : + Salarié et + Candidat pour le back-office et la direction. 19 h 25 : Wikis pour tous.
// 17/10/2026, 20 h 17 (choix de Matthieu : « Oui, ces 4 onglets ») : la barre du bas a 4 onglets pour tous les rôles,
// Ma journée · À traiter (l'ancien Mon espace, sans sa partie À consulter) · Consulter (MENUS[rôle].consulter) · Créer
// (CREER[rôle]). La déconnexion passe sous la pastille du rôle de l'en-tête (src/components/charte/RoleActif.tsx).
// + Prospect (19 h 53) et + Tâche (20 h 14) ajoutés à Créer.
// 18/10/2026, 9 h 50 : pastilles Perdues (Pipeline), Aujourd'hui et À venir (Relevés) branchées.
// 19/10/2026, 18 h 43 (adresses propres, src/lib/adresses.ts) : toutes les adresses viennent de src/lib/adresses.ts ;
// « actif » liste les débuts d'adresse de chaque onglet (plus de /interne).

import { adresses, ADRESSES_LISTES } from '@/lib/adresses';

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
  // Débuts d'adresse où l'onglet est considéré comme actif
  actif: string[];
  // Contenu validé (affiché sur l'écran « à construire », dans Consulter et dans Créer)
  description: string;
  pastilles?: Pastille[];
  // Pastille ouverte par défaut selon le rôle (Matériel et achats : À commander pour le chef, Livraisons en retard
  // pour le back-office)
  parDefaut?: Partial<Record<RoleAppli, string>>;
};

// Écran construit (lot du 17/10, 14 h 28)
const pret = (cle: string, libelle: string, icone: CleIcone, href: string, description: string, plus: Partial<Ecran> = {}): Ecran => ({
  cle, libelle, icone, description, pret: true, href, actif: [href.split('?')[0]], ...plus,
});

const fiches = (vue: string) => `${adresses.pipeline}?vue=${vue}`;
const liste = (source: string, vue?: string) => `${adresses.liste(source)}${vue ? `?vue=${vue}` : ''}`;
const decomptes = (vue: string) => `${adresses.decomptes}?vue=${vue}`;
const chantiersVue = (vue: string) => `${adresses.chantiers}?vue=${vue}`;
// Toutes les listes (Commandes, SAV, Factures…) et leurs fiches sont rangées dans À traiter
const LISTES_A_TRAITER = Object.values(ADRESSES_LISTES);

// Espace d'un autre rôle (ouvert par l'adresse ?role= ; plus proposé depuis le 17/10, 16 h 11)
const espaceDe = (cle: string, role: RoleAppli, libelle: string, icone: CleIcone, description: string): Ecran => ({
  cle, libelle, icone, description, pret: true, href: `${adresses.aTraiter}?role=${role}`, actif: [],
});

export const ECRANS: Record<string, Ecran> = {
  // ── Onglets de la barre du bas (20 h 17) ──
  journee: {
    cle: 'journee', libelle: 'Ma journée', href: adresses.journee, icone: 'journee', pret: true, actif: [adresses.journee],
    description: "Ce qui est en retard, puis ce qui est à faire aujourd'hui, selon le rôle",
  },
  espace: {
    cle: 'espace', libelle: 'À traiter', href: adresses.aTraiter, icone: 'pipeline', pret: true,
    actif: [adresses.aTraiter, adresses.pipeline, '/affaires', adresses.prospection, adresses.contacts, adresses.chantiers, adresses.interventions, ...LISTES_A_TRAITER, '/fiche', adresses.planning, adresses.agenda, adresses.decomptes, adresses.releves],
    description: 'Les vues du rôle avec leurs compteurs, dans l’ordre du travail.',
  },
  consulter: {
    cle: 'consulter', libelle: 'À consulter', court: 'Consulter', href: adresses.consulter, icone: 'ressources', pret: true,
    actif: [adresses.consulter, adresses.ressources, adresses.wikis, adresses.carteSav],
    description: 'Ce qu’on consulte sans compteur : Parc, Ressources, Wikis, cartes et plannings selon le rôle.',
  },
  creer: {
    cle: 'creer', libelle: 'Créer', href: adresses.creer, icone: 'lead', pret: true,
    actif: [adresses.creer],
    description: 'Tous les boutons + du rôle : projet, prospect, tâche, ticket SAV, salarié, candidat, idée Kaizen.',
  },

  // ── Écrans construits ──
  pipeline: {
    cle: 'pipeline', libelle: 'Pipeline', href: adresses.pipeline, icone: 'pipeline', pret: true, actif: [adresses.pipeline],
    description: 'Prospection (Chasse) et Qualification (Études) : appels, visites, devis, gagnées et perdues',
    pastilles: [
      { cle: 'a-appeler', libelle: "À appeler aujourd'hui", groupe: 'Prospection', href: `${adresses.prospection}?vue=a-appeler` },
      { cle: 'chasse', libelle: 'Pipeline chasse', groupe: 'Prospection', href: `${adresses.prospection}?vue=chasse` },
      { cle: 'linkedin', libelle: 'LinkedIn', groupe: 'Prospection', href: `${adresses.prospection}?vue=chasse&linkedin=1` },
      { cle: 'a-caler', libelle: 'À caler', groupe: 'Visites', href: fiches('a-caler') },
      { cle: 'planifies', libelle: 'Relevés planifiés', groupe: 'Visites', href: fiches('planifies') },
      { cle: 'en-retard', libelle: 'En retard', groupe: 'Visites', href: fiches('en-retard') },
      { cle: 'devis-a-chiffrer', libelle: 'À chiffrer', groupe: 'Devis', href: fiches('devis-a-chiffrer') },
      { cle: 'devis-envoyes', libelle: 'Envoyés', groupe: 'Devis', href: fiches('devis-envoyes') },
      { cle: 'relances-echues', libelle: 'Relances échues', groupe: 'Devis', href: fiches('relances-echues') },
      { cle: 'en-negociation', libelle: 'En négociation', groupe: 'Devis', href: fiches('en-negociation') },
      { cle: 'gagnees', libelle: 'Gagnées', groupe: 'Issue', href: fiches('gagnees') },
      { cle: 'perdues', libelle: 'Perdues', groupe: 'Issue', href: fiches('perdues') },
      { cle: 'toutes', libelle: 'Toutes', groupe: 'Issue', href: fiches('toutes') },
    ],
  },
  releves: {
    cle: 'releves', libelle: 'Relevés', href: adresses.releves, icone: 'releves', pret: true, actif: [adresses.releves],
    description: 'Outil terrain : fiches 📍 à visiter, relevé (mètre, scénarios, photos) utilisable hors ligne',
    pastilles: [
      { cle: 'aujourdhui', libelle: "Aujourd'hui", href: `${adresses.releves}?vue=aujourdhui` },
      { cle: 'a-venir', libelle: 'À venir', href: `${adresses.releves}?vue=a-venir` },
      { cle: 'carte', libelle: 'Carte des audits', href: `${adresses.agenda}?vue=carte` },
    ],
  },
  chantiers: {
    cle: 'chantiers', libelle: 'Chantiers', href: adresses.chantiers, icone: 'chantiers', pret: true,
    actif: [adresses.chantiers],
    description: 'Planning Chantiers : suivi travaux, prêts, en cours, réserves à lever, avancement, carte',
    pastilles: [
      { cle: 'feu-vert', libelle: 'Feu vert à donner', href: adresses.feuVert },
      { cle: 'prets', libelle: 'Prêts', href: chantiersVue('prets') },
      { cle: 'en-cours', libelle: 'En cours', href: chantiersVue('en-cours') },
      { cle: 'a-receptionner', libelle: 'À réceptionner', href: adresses.receptionChantiers },
      { cle: 'reserves', libelle: 'Réserves à lever', href: chantiersVue('reserves') },
      { cle: 'avancement', libelle: 'Avancement', href: chantiersVue('avancement') },
      { cle: 'carte', libelle: 'Carte des chantiers', href: chantiersVue('carte') },
    ],
  },
  interventions: {
    cle: 'interventions', libelle: 'Mes interventions', court: 'Interventions', href: adresses.interventions, icone: 'interventions', pret: true,
    actif: [adresses.interventions],
    description: 'Poses et visites de maintenance affectées à l’installateur, par jour, avec l’itinéraire du jour, lisibles hors ligne',
  },

  // Espaces des rôles (ouverts par l'adresse ?role=)
  espaceCommercial: espaceDe('espaceCommercial', 'commercial', 'Espace commercial', 'pipeline', 'Prospection, devis à chiffrer, relances, négociation, pipeline vente, contacts'),
  espaceChef: espaceDe('espaceChef', 'chargeOperation', 'Espace chef de chantier', 'chantiers', 'Visites et relevés, feu vert, chantiers, réceptions, matériel, SAV, maintenance'),
  espacePoseur: espaceDe('espacePoseur', 'poseur', 'Espace installateur', 'interventions', 'Interventions, réception sur place, tickets SAV'),
  espaceBackOffice: espaceDe('espaceBackOffice', 'backOffice', 'Espace back-office', 'facturation', 'Factures, achats, ADVENIR, contrats, décomptes, contacts, RH'),

  // Étapes et actions construites, ouvertes depuis une pastille ou une fiche (plus dans la barre)
  feuVert: { cle: 'feuVert', libelle: 'Feu vert', href: adresses.feuVert, icone: 'feuVert', pret: true, actif: [adresses.feuVert], description: 'Pastille de Chantiers : prérequis par chantier et ce qui manque' },
  validation: { cle: 'validation', libelle: 'Réception', href: adresses.receptionChantiers, icone: 'validation', pret: true, actif: [adresses.receptionChantiers], description: 'Pastille de Chantiers : fin de travaux, réserves bloquantes ou mineures, passage au Parc' },
  reception: { cle: 'reception', libelle: 'Rapport et signature', href: adresses.rapportSignature, icone: 'reception', pret: true, actif: [adresses.rapportSignature], description: "Action de la fiche intervention : PV signé, rapport de mesures, photos et réserves, validé par le chef de chantier" },

  // ── Commercial ──
  agenda: pret('agenda', 'Agenda des visites', 'agenda', adresses.agenda, 'Relevés techniques calés par le commercial : jour (avec itinéraire), semaine, carte des visites (carte des audits).', {
    court: 'Agenda',
    pastilles: [{ cle: 'jour', libelle: 'Jour', href: adresses.agenda }, { cle: 'semaine', libelle: 'Semaine', href: `${adresses.agenda}?vue=semaine` }, { cle: 'carte', libelle: 'Carte des visites', href: `${adresses.agenda}?vue=carte` }],
  }),
  contacts: {
    cle: 'contacts', libelle: 'Contacts', href: adresses.contacts, icone: 'contacts', pret: true, actif: [adresses.contacts],
    description: 'Annuaire de la liste Contacts, partagé entre le commercial et le back-office : recherche, rôle, Appeler, Google Voice, SMS, Gmail.',
  },
  ressources: pret('ressources', 'Ressources', 'ressources', adresses.ressources, 'Les dossiers Drive de ton rôle : supports de vente, notices des bornes par marque, normes, modèles, administratif.'),
  wikis: pret('wikis', 'Wikis', 'ressources', adresses.wikis, 'Le mode d’emploi de chaque liste et le guide de l’entreprise (premiers jours, règles internes, congés…), lisibles ici sans ouvrir ClickUp.'),

  // ── Chef de chantier ──
  planning: pret('planning', 'Planning', 'planning', adresses.planning, 'Master planning (par jour) et Planning techs (par installateur) : poses, dépannages, visites de maintenance et relevés techniques, tout ce qui se planifie avec le client.', {
    pastilles: [
      { cle: 'master', libelle: 'Master planning', href: adresses.planning },
      { cle: 'techs', libelle: 'Planning techs', href: `${adresses.planning}?vue=techs` },
      { cle: 'depannages', libelle: 'Planning dépannage', href: `${adresses.planning}?types=depannage` },
      { cle: 'releves', libelle: 'Relevés techniques', href: `${adresses.planning}?types=releve` },
    ],
  }),
  carteSav: pret('carteSav', 'Carte du SAV', 'carte', adresses.carteSav, 'Tickets SAV ouverts sur la carte, à l’adresse de l’installation du Parc, avec tous les dépannages dans Google Maps.'),
  sav: pret('sav', 'SAV et maintenance', 'sav', liste('sav', 'a-traiter'), 'Tickets SAV (urgences et tri, planning dépannage) et visites de maintenance (J-30), avec la fiche du ticket.', {
    court: 'SAV',
    pastilles: [
      { cle: 'urgences', libelle: 'Urgences et tri', href: liste('sav', 'a-traiter') },
      { cle: 'depannage', libelle: 'Planning dépannage', href: liste('sav', 'planning-depannage') },
      { cle: 'carte', libelle: 'Carte du SAV', href: adresses.carteSav },
      { cle: 'j-30', libelle: 'Visites à préparer (J-30)', href: liste('maintenance', 'j-30') },
    ],
  }),
  materielAchats: pret('materielAchats', 'Matériel et achats', 'materiel', liste('commandes', 'a-commander'), 'Commandes Matériel (la logistique : à commander, suivi, réceptions sous 7 jours, livraisons en retard) et Achats Fournisseurs (la dépense : à valider).', {
    court: 'Matériel',
    pastilles: [
      { cle: 'a-commander', libelle: 'À commander', href: liste('commandes', 'a-commander') },
      { cle: 'logistique', libelle: 'Suivi logistique', href: liste('commandes', 'suivi-logistique') },
      { cle: 'receptions', libelle: 'Réceptions sous 7 jours', href: liste('commandes', 'receptions-7j') },
      { cle: 'retards', libelle: 'Livraisons en retard', href: liste('commandes', 'livraisons-retard') },
      { cle: 'achats', libelle: 'Achats à valider', href: liste('achats', 'a-valider') },
    ],
  }),
  parc: pret('parc', 'Parc installé', 'parc', liste('parc', 'tous'), 'Toutes les bornes posées. La fiche d’une installation garde tout son historique (pose, SAV, maintenance, contrat).', {
    court: 'Parc',
    pastilles: [
      { cle: 'tous', libelle: 'Base du Parc', href: liste('parc', 'tous') },
      { cle: 'contrats', libelle: 'Renouvellements et contrats', href: liste('parc', 'contrats') },
      { cle: 'supervision', libelle: 'Abonnements de supervision', href: liste('parc', 'supervision') },
    ],
  }),

  // ── Installateur ──
  carteDuJour: pret('carteDuJour', 'Carte du jour', 'carte', adresses.interventions, 'Itinéraire des interventions du jour (dans Mes interventions).', { court: 'Carte' }),
  savSite: { cle: 'savSite', libelle: 'Mes tickets SAV', court: 'SAV', href: `${adresses.interventions}?vue=sav`, icone: 'sav', pret: true, actif: [], description: 'Ses tickets SAV pas encore résolus, avec l’historique de la borne. Pas d’accès à Urgences et tri (chef de chantier).' },
  // Actions de la fiche intervention (/interventions/<id>/pose, /interventions/<id>/maintenance) : rangées par
  // src/lib/filAriane.ts, pas d'onglet propre
  saisiePose: { cle: 'saisiePose', libelle: 'Saisie à la pose', icone: 'reception', pret: true, href: adresses.interventions, actif: [], description: 'Action de la fiche intervention : ce qui est prévu, n° de série, puissance configurée, photos, hors ligne.' },
  maintenance: {
    cle: 'maintenance', libelle: 'Visite de maintenance', icone: 'maintenance', pret: true, href: adresses.interventions, actif: [],
    description: 'Action de la fiche intervention : protocole Sefram MW9665 (adaptateur A1532-XA) point de charge par point de charge, 10 étapes, photos, hors ligne. Résultats en commentaire sur la visite.',
  },

  // ── Back-office ──
  facturation: pret('facturation', 'Facturation', 'facturation', liste('factures', 'ouvertes'), 'Factures Clients (Costructor fait référence) : à relancer, non réglées, pipeline par statut.', {
    pastilles: [{ cle: 'retard', libelle: 'À relancer (J+3 / J+10 / J+15)', href: liste('factures', 'retard') }, { cle: 'ouvertes', libelle: 'Non réglées', href: liste('factures', 'ouvertes') }],
  }),
  advenir: pret('advenir', 'Aides ADVENIR', 'advenir', liste('advenir'), 'Dossiers Advenir : alertes délais, suivi des dossiers, primes à encaisser.', {
    court: 'ADVENIR',
    pastilles: [
      { cle: 'alertes', libelle: 'Alertes délais', href: liste('advenir', 'alertes') },
      { cle: 'suivi', libelle: 'Suivi des dossiers', href: liste('advenir', 'suivi') },
      { cle: 'a-encaisser', libelle: 'Primes à encaisser', href: liste('advenir', 'a-encaisser') },
    ],
  }),
  decomptes: pret('decomptes', 'Décomptes', 'decomptes', adresses.decomptes, 'Décomptes énergétiques des bornes du Parc suivies en relevé : à préparer (PDF), à valider, envoyés au gestionnaire. Jamais en refacturation (Charge Unix).', {
    pastilles: [
      { cle: 'a-preparer', libelle: 'À préparer', href: decomptes('a-preparer') },
      { cle: 'a-valider', libelle: 'À valider', href: decomptes('a-valider') },
      { cle: 'envoyes', libelle: 'Envoyés', href: decomptes('envoyes') },
      { cle: 'a-completer', libelle: 'Fiches à compléter', href: decomptes('a-completer') },
    ],
  }),
  rh: pret('rh', 'RH et recrutement', 'rh', liste('rh'), 'Demandes RH, salariés (arrivées, départs, habilitations) et candidatures (dont chargeo.fr/recrutement).', {
    court: 'RH',
    pastilles: [
      { cle: 'demandes', libelle: 'Demandes à traiter', href: liste('rh', 'demandes') },
      { cle: 'salaries', libelle: 'Salariés à suivre', href: liste('salaries', 'a-suivre') },
      { cle: 'habilitations', libelle: 'Habilitations à recycler', href: liste('salaries', 'habilitations') },
      { cle: 'candidatures', libelle: 'Candidatures reçues', href: liste('recrutement', 'a-traiter') },
      { cle: 'pipeline', libelle: 'Pipeline recrutement', href: liste('recrutement', 'pipeline') },
    ],
  }),

  // ── Direction ──
  pilotage: pret('pilotage', 'Pilotage', 'pilotage', `${adresses.aTraiter}?role=direction`, 'Réunions CODIR, Stratégie & OKR, Kaizen, To-Do. Tableaux de bord prévus en Phase 7.', {
    pastilles: [{ cle: 'codir', libelle: 'CODIR', href: liste('codir') }, { cle: 'okr', libelle: 'OKR', href: liste('okr') }, { cle: 'kaizen', libelle: 'Kaizen', href: liste('kaizen') }, { cle: 'todo', libelle: 'To-Do', href: liste('todo') }],
  }),

  // ── Créations (onglet Créer) ──
  lead: {
    cle: 'lead', libelle: 'Nouveau projet', href: adresses.creerProjet, icone: 'lead', pret: true, actif: [adresses.creerProjet],
    description: 'Un client avec un RDV ou une demande ferme : qui appelle, adresse du chantier, contrôle des doublons. Crée la fiche Projet en Qualification.',
  },
  prospect: pret('prospect', 'Prospect', 'contacts', adresses.creerProspect, 'Un contact à chasser (LinkedIn, apporteur, appel entrant, salon) : type Prospect en Prospection, avec sa source et sa date de rappel. Il devient un projet au RDV.'),
  tache: pret('tache', 'Tâche', 'pilotage', adresses.creerTache, 'Une tâche dans la To-Do : quoi faire, échéance, priorité, pour qui.'),
  ticketSav: pret('ticketSav', 'Ticket SAV', 'sav', adresses.creerTicketSav, 'Créer un ticket SAV rattaché à l’installation du Parc : sévérité, type de panne, symptôme.'),
  kaizen: pret('kaizen', 'Idée Kaizen', 'pilotage', adresses.creerKaizen, 'Proposer une idée d’amélioration (liste Kaizen).'),
  salarie: pret('salarie', 'Salarié', 'rh', adresses.creerSalarie, 'Créer la fiche d’un arrivant dans Vie des Salariés : poste, contrat, date d’entrée, habilitations, avec la checklist d’onboarding.'),
  candidat: pret('candidat', 'Candidat', 'rh', adresses.creerCandidat, 'Saisir un candidat installateur (bouche-à-oreille, salon…) : mêmes champs que le formulaire du site.'),
};

// Barre du bas (4 onglets pour tous depuis 20 h 17), onglet Consulter et créations, par rôle.
// consulter = ce qu'on consulte sans compteur (le référentiel Parc, les Ressources, les Wikis, l'outil d'un autre rôle).
// 17 h 32 : plus de Relevés pour l'installateur. 18 h 02 : plus de Parc installé pour l'installateur (décision du 11/10).
// 18 h 27 : Carte du SAV pour le chef de chantier et la direction. 19 h 25 : Wikis pour tous.
const BARRE = ['journee', 'espace', 'consulter', 'creer'];
export const MENUS: Record<RoleAppli, { barre: string[]; consulter: string[]; plus: string[] }> = {
  commercial: { barre: BARRE, consulter: ['ressources', 'wikis'], plus: [] },
  chargeOperation: { barre: BARRE, consulter: ['agenda', 'carteSav', 'parc', 'ressources', 'wikis'], plus: [] },
  poseur: { barre: BARRE, consulter: ['ressources', 'wikis'], plus: [] },
  backOffice: { barre: BARRE, consulter: ['planning', 'parc', 'ressources', 'wikis'], plus: [] },
  direction: { barre: BARRE, consulter: ['carteSav', 'parc', 'ressources', 'wikis'], plus: [] },
};

// Créations possibles par rôle, dans l'onglet Créer.
// 19 h 10 : + Salarié et + Candidat pour le back-office et la direction (données RH sensibles).
// 20 h 14 : + Prospect (commercial, direction) et + Tâche (direction, la To-Do est dans l'espace DIRECTION).
export const CREER: Record<RoleAppli, string[]> = {
  commercial: ['lead', 'prospect', 'kaizen'],
  chargeOperation: ['ticketSav', 'kaizen'],
  poseur: ['ticketSav', 'kaizen'],
  backOffice: ['ticketSav', 'salarie', 'candidat', 'kaizen'],
  direction: ['tache', 'lead', 'prospect', 'ticketSav', 'salarie', 'candidat', 'kaizen'],
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

// Chemin correspondant : le début d'adresse lui-même, ou une page en dessous (19/10, 18 h 43 : plus de cas /interne)
const correspond = (p: string, chemin: string) => chemin === p || chemin.startsWith(`${p}/`) || chemin.startsWith(`${p}?`);

// Onglet actif : un de ses chemins correspond
export function estActif(ecran: Ecran, chemin: string): boolean {
  return ecran.actif.some((p) => correspond(p, chemin));
}

// Longueur du chemin le plus précis qui correspond (0 si aucun) : quand deux onglets correspondent
// (/sav/carte est dans À traiter par /sav et dans Consulter par /sav/carte), le plus précis gagne
export function precisionActif(ecran: Ecran, chemin: string): number {
  return ecran.actif.filter((p) => correspond(p, chemin)).reduce((m, p) => Math.max(m, p.length), 0);
}
