// Un espace par rôle (page « Un espace par rôle (proposition du 17/10/2026, 10 h 30) » du Doc de la carte des menus).
// Principe validé par Matthieu le 17/10/2026 : 3 niveaux seulement. Mon espace = les vues du rôle dans l'ordre de son
// travail, chacune avec son compteur ; une vue = la liste des fiches ; la fiche, toujours la même, avec le bloc 📇 Contact.
// Espace Commercial validé le 17/10 à 10 h 44, corrigé à 11 h 01 (Matthieu : « ce n'est pas le commercial qui fait les
// relevés techniques ») : il ne fait pas le relevé, il reçoit le relevé finalisé (Devis à chiffrer), chiffre, envoie et
// relance. Corrigé à 13 h 13 (Matthieu : « c'est le commercial qui planifie le relevé technique pour le chef de
// chantier ») : Visites à caler revient au commercial et sort de l'espace du chef de chantier.
// 17/10, 13 h 13 aussi : Contacts montre tous les contacts, clients compris (pas seulement syndics, conseils syndicaux
// et gestionnaires) ; son compteur additionne la liste Contacts et les fiches clients (Prospection à Parc).
// Espace Chef de chantier validé le 17/10 à 11 h 06.
// Espace Installateur validé le 17/10 à 11 h 18 (3 vues) : il ne voit que son travail (« moi » = la personne connectée,
// comme la vue ClickUp 📱 MODE TECH), lisible hors ligne.
// Espace Back-office validé le 17/10 à 11 h 28 (8 vues). Costructor reste la référence des factures et règlements :
// les vues lisent ce que ClickUp en reçoit.
// Espace Direction validé le 17/10 à 11 h 37 (6 vues) ; Plus ouvre l'espace de chaque rôle (/interne/espace?role=…).
// 17/10, 14 h 28 (lot « écrans qui manquent ») : les vues qui ouvraient ClickUp ouvrent l'écran de liste de
// l'application (/interne/liste/<source>?vue=<clé>, src/lib/listesAppli.ts), avec la fiche générique. Le bouton de
// création du commercial ouvre Nouveau projet. Planning construit (/interne/planning, compteur = chantiers en travaux)
// et Agenda des visites ajouté au commercial (/interne/agenda, compteur = relevés planifiés).
// 17/10, 15 h 22 : Décomptes construit depuis le Parc, sans nouvelle liste (/interne/decomptes, src/lib/decomptes.ts) ;
// compteur = bornes suivies en relevé.
// 17/10, 16 h 11 (Matthieu : « en mode direction, je ne veux pas avoir des boutons ou des raccourcis espace commercial,
// espace chef de chantier etc., je veux voir directement leurs écrans dans l'ordre du workflow ») : l'espace Direction
// contient les écrans de tous les rôles. Les compteurs « moi » de l'installateur sont remplacés par ceux de l'équipe.
// 17/10, 16 h 49 (Matthieu : « je préfère que tu découpes ça par rôle, c'est-à-dire par espace, et à l'intérieur dans
// l'ordre du workflow ; les contacts vont plutôt dans l'espace commercial ») : rangées Commercial, Chef de chantier,
// Installateur, Back-office, Direction (fin des étapes Vente, Chantier, Facturation et aides…). Chaque écran n'apparaît
// qu'une fois : Contacts dans Commercial, Achats dans Back-office, SAV dans Chef de chantier.
// 17/10, 18 h 02 (Matthieu : « il faut créer tous les écrans qui manquent », liste des écrans validée le 11/10) : vues
// ajoutées aux listes : Suivi logistique et Réceptions sous 7 jours (Commandes), Achats à valider et Achats en cours,
// Planning dépannage (SAV), Suivi des dossiers et Primes à encaisser (ADVENIR), Abonnements de supervision (Parc).
// 17/10, 18 h 48 (choix de Matthieu : la date de livraison seulement dans Commandes Matériel) : Commande = la
// logistique (chef de chantier), Achat = la dépense (back-office). « Livraisons en retard » lit 📅 Date Livraison
// Prévue des Commandes (plus la date des Achats, champ à supprimer dans ClickUp) ; le back-office garde « Achats à
// valider ». Le champ est cherché par « livraison prevue » (« livraison » seul attrapait aussi 📎 Bon de Livraison).
// 17/10, 19 h 10 (choix de Matthieu : créer une fiche salarié et une fiche candidat depuis l'application) : listes
// Vie des Salariés 👥 (salaries) et Recrutement Installateurs 👷 (recrutement, alimentée par chargeo.fr/recrutement)
// lues par le back-office et la direction : Candidatures à traiter, Salariés (arrivées et départs en cours,
// habilitations qui expirent dans les 60 jours).
// 17/10, 19 h 38 et 19 h 42 (choix de Matthieu) : « Factures non réglées » (à émettre, émises, partiellement payées, en
// litige) et « Factures à relancer » (émises ou partiellement payées dont le rappel de relance, échéance de la tâche,
// est arrivé ; la date limite de paiement est le champ 📅 Date d'échéance).
// Clé de vue : « cle » dans la source de la vue, ou « source:cle » pour additionner une autre liste.
// Fichier pur (aucun accès réseau) : utilisable côté téléphone comme côté serveur. L'affichage ne donne aucun droit.
import type { Jour } from '@/lib/joursOuvres';
import { aujourdhuiParis, ajouterJours, comparer } from '@/lib/joursOuvres';
import { champ, nomOption } from '@/lib/vuesFiches';
import { suivieEnReleve } from '@/lib/decomptes';

export type SourceVue =
  | 'qualification' | 'prospection' | 'contacts' | 'planning' | 'commandes' | 'sav' | 'maintenance'
  | 'factures' | 'achats' | 'advenir' | 'parc' | 'rh' | 'salaries' | 'recrutement' | 'codir' | 'okr' | 'kaizen' | 'todo' | 'aucune';
export type Filtre = (t: any, a: Jour, moi: number) => boolean;

export type VueEspace = {
  cle: string;
  emoji: string;
  libelle: string;
  description: string;
  href: string;
  source: SourceVue;
  // Clés des filtres additionnés pour le compteur (vuesFiches pour Qualification, FILTRES pour les autres sources)
  vues?: string[];
  // Compteur en orange quand il n'est pas à zéro (travail en retard ou du jour)
  urgent?: boolean;
  // Ouvre ClickUp en attendant l'écran de l'application
  externe?: boolean;
  // Écran pas encore construit (pas de compteur)
  aConstruire?: boolean;
  // Intitulé de rangée (espace Direction : le rôle dont c'est l'écran)
  etape?: string;
};

export type Espace = { titre: string; creer?: { libelle: string; href: string }; vues: VueEspace[] };

// Listes ClickUp lues par les espaces (identifiants relus le 17/10/2026)
export const LISTES: Record<Exclude<SourceVue, 'qualification' | 'aucune'>, string> = {
  prospection: '901519675281', // Prospection (Chasse) ❄️
  contacts: '1200630000008493', // Contacts 👥
  planning: '901520038258', // Planning Chantiers 🚧
  commandes: '901520038249', // Commandes Matériel 🚚
  sav: '901520038282', // Tickets SAV 🔧
  maintenance: '1200630000008492', // Maintenance 🛠️ (visites)
  factures: '1200630000003863', // Factures Clients 💰 (v2)
  achats: '1200630000003864', // Achats Fournisseurs 🧾 (v2)
  advenir: '901520038271', // Dossiers Advenir 📄
  parc: '901520038290', // Parc Installé (Maintenance) 🔄
  rh: '1200630000003868', // Gestion RH Quotidienne ☕ (v2)
  salaries: '1200630000003867', // Vie des Salariés 👥 (v2)
  recrutement: '1200630000003865', // Recrutement Installateurs 👷‍♂️ (v2), formulaire chargeo.fr/recrutement
  codir: '1200630000003872', // Réunions CODIR 🗣️
  okr: '1200630000003869', // Stratégie & OKR 🎯
  kaizen: '1200630000003873', // Kaizen (Amélioration) 💡
  todo: '901525143427', // To-Do 📝
};

// Champs des interventions (relus le 17/10/2026)
export const CHAMPS_INTERVENTION = {
  dateChantier: '8ded0ef0-cdbc-43b8-9d20-5806e2fc119f', // 📅 Date Intervention (Planning Chantiers)
  technicienChantier: 'b400c953-ae06-4336-b471-405296f9ff1c', // 👷 Technicien (Planning Chantiers)
  dateVisite: '0d983f33-ec42-4a5d-b4c6-7ebc6aacc971', // 📆 Date de RDV (Maintenance)
  technicienVisite: 'a851257d-140b-4e2d-9aca-273b49b55179', // 👷 Technicien (Maintenance)
  borneVisitee: 'bf8c35b7-65e1-4bcf-afe3-5740e1acc9fa', // 🔋 Borne visitée (Maintenance → Parc)
  installationTicket: '3804df6e-a2e1-4058-913c-447189c73d35', // 🔗 Fiche Installation (Tickets SAV → Parc)
  severite: 'c2ae4e08-6903-4698-af96-a40082c11b39', // 🔥 Sévérité (Tickets SAV)
};

// Écran de liste de l'application (src/app/interne/liste/[source])
const ecran = (source: string, vue: string) => `/interne/liste/${source}?vue=${vue}`;
// Contacts : la liste Contacts + les fiches clients, de la Prospection au Parc (même périmètre que /api/interne/contacts)
const VUES_CONTACTS = ['tous', 'prospection:chasse', 'qualification:toutes', 'planning:tous', 'parc:tous'];
const CONTACTS_DESCRIPTION = 'Clients, syndics, conseils syndicaux, gestionnaires';
// Livraisons en retard (Commandes Matériel) et Achats à valider (Achats Fournisseurs), 18 h 48
const LIVRAISONS_DESCRIPTION = 'Commandes commandées ou en livraison dont la livraison prévue est dépassée';
const ACHATS_DESCRIPTION = 'Demandes d’achat et achats à valider. Aussi : commandés et reçus';
// RH (19 h 10) : candidatures et salariés
const RECRUTEMENT_DESCRIPTION = 'Candidatures reçues (site et saisies dans l’application). Aussi : pipeline, + Candidat';
const SALARIES_DESCRIPTION = 'Arrivées et départs en cours, habilitations qui expirent sous 60 jours. Aussi : + Salarié';
// Factures (19 h 42)
const RELANCER_DESCRIPTION = 'Émises ou partiellement payées dont la date de relance (J+3, J+10, J+15) est arrivée ; règlement revérifié dans Costructor chaque matin';
const NON_REGLEES_DESCRIPTION = 'À émettre, émises, partiellement payées, en litige (Costructor fait référence)';

// Rangées de l'espace Direction : un rôle chacune, dans l'ordre du parcours de l'affaire (16 h 49)
const COMMERCIAL = 'Commercial';
const CHEF = 'Chef de chantier';
const INSTALLATEUR = 'Installateur';
const BACK_OFFICE = 'Back-office';
const DIRECTION = 'Direction';

export const ESPACES: Partial<Record<'commercial' | 'chargeOperation' | 'poseur' | 'backOffice' | 'direction', Espace>> = {
  commercial: {
    titre: 'Espace commercial',
    creer: { libelle: 'Nouveau projet', href: '/interne/projet/nouveau' },
    vues: [
      { cle: 'a-appeler', emoji: '📞', libelle: "À appeler aujourd'hui", description: 'Prospects dont la date de rappel est aujourd’hui ou passée', href: '/interne/prospection?vue=a-appeler', source: 'prospection', vues: ['a-appeler'], urgent: true },
      { cle: 'chasse', emoji: '🚀', libelle: 'Pipeline chasse', description: 'Tous les prospects par étape, filtre LinkedIn', href: '/interne/prospection?vue=chasse', source: 'prospection', vues: ['chasse'] },
      { cle: 'a-caler', emoji: '📅', libelle: 'Visites à caler', description: 'Appeler le client et fixer la date du relevé technique du chef de chantier', href: '/interne/fiches?vue=a-caler', source: 'qualification', vues: ['a-caler'], urgent: true },
      { cle: 'agenda', emoji: '🗓️', libelle: 'Agenda des visites', description: 'Relevés calés : jour, semaine, carte et itinéraire', href: '/interne/agenda', source: 'qualification', vues: ['planifies'] },
      { cle: 'devis-a-chiffrer', emoji: '📝', libelle: 'Devis à chiffrer', description: 'Relevé finalisé par le chef de chantier, devis à faire dans Costructor', href: '/interne/fiches?vue=devis-a-chiffrer', source: 'qualification', vues: ['devis-a-chiffrer'] },
      { cle: 'relances-echues', emoji: '📩', libelle: 'Relances devis', description: 'Relance du jour ou en retard', href: '/interne/fiches?vue=relances-echues', source: 'qualification', vues: ['relances-echues'], urgent: true },
      { cle: 'en-negociation', emoji: '🔥', libelle: 'En négociation', description: 'Devis discutés avec le client', href: '/interne/fiches?vue=en-negociation', source: 'qualification', vues: ['en-negociation'] },
      { cle: 'toutes', emoji: '💰', libelle: 'Pipeline vente', description: 'Toutes les affaires, rangées par étape', href: '/interne/fiches?vue=toutes', source: 'qualification', vues: ['toutes'] },
      { cle: 'contacts', emoji: '👥', libelle: 'Contacts', description: CONTACTS_DESCRIPTION, href: '/interne/contacts', source: 'contacts', vues: VUES_CONTACTS },
    ],
  },
  chargeOperation: {
    titre: 'Espace chef de chantier',
    vues: [
      { cle: 'releves', emoji: '📋', libelle: 'Relevés à faire', description: 'Visites calées par le commercial : du jour, en retard et à venir, utilisables hors ligne', href: '/interne', source: 'qualification', vues: ['planifies', 'en-retard'], urgent: true },
      { cle: 'feu-vert', emoji: '🚦', libelle: 'Feu vert à donner', description: 'Chantiers dont les 5 prérequis sont OK', href: '/interne/feu-vert', source: 'planning', vues: ['feu-vert'] },
      { cle: 'planning', emoji: '📅', libelle: 'Master planning et Planning techs', description: 'Poses, dépannages, visites et relevés par jour et par technicien', href: '/interne/planning', source: 'planning', vues: ['en-cours'] },
      { cle: 'chantiers', emoji: '🏗️', libelle: 'Chantiers en cours', description: 'Suivi travaux, prêts, en cours, réserves à lever, avancement, carte', href: '/interne/chantiers', source: 'planning', vues: ['en-cours'] },
      { cle: 'receptions', emoji: '✅', libelle: 'Réceptions à valider', description: 'PV, rapport de mesures et photos déposés par le poseur', href: '/interne/validation', source: 'planning', vues: ['receptions'], urgent: true },
      { cle: 'a-commander', emoji: '📦', libelle: 'Matériel à commander', description: 'Commandes en « à commander », suivi logistique, réceptions sous 7 jours, livraisons en retard', href: ecran('commandes', 'a-commander'), source: 'commandes', vues: ['a-commander'] },
      { cle: 'sav', emoji: '🚨', libelle: 'SAV urgences et tri', description: 'Tickets pas encore résolus, planning dépannage', href: ecran('sav', 'a-traiter'), source: 'sav', vues: ['a-traiter'], urgent: true },
      { cle: 'maintenance', emoji: '🔧', libelle: 'Visites de maintenance (J-30)', description: 'À planifier, échéance dans les 30 jours ou dépassée', href: ecran('maintenance', 'j-30'), source: 'maintenance', vues: ['j-30'] },
    ],
  },
  poseur: {
    titre: 'Mon travail',
    vues: [
      { cle: 'interventions', emoji: '📱', libelle: 'Mes interventions', description: 'Poses et visites de maintenance : aujourd’hui, demain, la semaine, avec l’itinéraire du jour', href: '/interne/interventions', source: 'planning', vues: ['mes-interventions', 'maintenance:mes-visites'] },
      { cle: 'reception', emoji: '📸', libelle: 'Réception sur place', description: 'PV signé, rapport de mesures, photos et réserves', href: '/interne/reception', source: 'planning', vues: ['mes-receptions'], urgent: true },
      { cle: 'sav', emoji: '🔧', libelle: 'Mes tickets SAV', description: 'Tickets qui me sont affectés, pas encore résolus', href: '/interne/interventions?vue=sav', source: 'sav', vues: ['mes-tickets'], urgent: true },
    ],
  },
  backOffice: {
    titre: 'Espace back-office',
    vues: [
      { cle: 'factures-retard', emoji: '⏰', libelle: 'Factures à relancer', description: RELANCER_DESCRIPTION, href: ecran('factures', 'retard'), source: 'factures', vues: ['retard'], urgent: true },
      { cle: 'factures', emoji: '💰', libelle: 'Factures non réglées', description: NON_REGLEES_DESCRIPTION, href: ecran('factures', 'ouvertes'), source: 'factures', vues: ['ouvertes'] },
      { cle: 'achats', emoji: '🧾', libelle: 'Achats à valider', description: ACHATS_DESCRIPTION, href: ecran('achats', 'a-valider'), source: 'achats', vues: ['a-valider'], urgent: true },
      { cle: 'livraisons', emoji: '🚚', libelle: 'Livraisons en retard', description: LIVRAISONS_DESCRIPTION, href: ecran('commandes', 'livraisons-retard'), source: 'commandes', vues: ['livraisons-retard'], urgent: true },
      { cle: 'advenir', emoji: '📄', libelle: 'Aides ADVENIR', description: 'Compteur : dossiers en cours dont la date limite tombe dans les 30 jours. Aussi : suivi, primes à encaisser', href: ecran('advenir', 'alertes'), source: 'advenir', vues: ['alertes'], urgent: true },
      { cle: 'contrats', emoji: '📜', libelle: 'Contrats à renouveler', description: 'Échéance annuelle dans les 30 jours ou dépassée. Aussi : base du Parc, abonnements de supervision', href: ecran('parc', 'contrats'), source: 'parc', vues: ['contrats'] },
      { cle: 'decomptes', emoji: '⚡', libelle: 'Décomptes énergétiques', description: 'Bornes en relevé : à préparer, à valider, envoyés au gestionnaire (compteur : bornes suivies)', href: '/interne/decomptes', source: 'parc', vues: ['releve'] },
      { cle: 'contacts', emoji: '👥', libelle: 'Contacts', description: CONTACTS_DESCRIPTION, href: '/interne/contacts', source: 'contacts', vues: VUES_CONTACTS },
      { cle: 'rh', emoji: '👔', libelle: 'Demandes RH', description: 'Compteur : demandes RH nouvelles ou en examen', href: ecran('rh', 'demandes'), source: 'rh', vues: ['demandes'] },
      { cle: 'recrutement', emoji: '👷', libelle: 'Candidatures à traiter', description: RECRUTEMENT_DESCRIPTION, href: ecran('recrutement', 'a-traiter'), source: 'recrutement', vues: ['a-traiter'], urgent: true },
      { cle: 'salaries', emoji: '👥', libelle: 'Salariés', description: SALARIES_DESCRIPTION, href: ecran('salaries', 'a-suivre'), source: 'salaries', vues: ['a-suivre'], urgent: true },
    ],
  },
  // Direction : les écrans de tous les rôles, une rangée par rôle, chacune dans l'ordre du workflow (16 h 49)
  direction: {
    titre: 'Espace direction',
    creer: { libelle: 'Nouveau projet', href: '/interne/projet/nouveau' },
    vues: [
      // Commercial : prospection, visite à caler, devis, relance, négociation, contacts
      { etape: COMMERCIAL, cle: 'a-appeler', emoji: '📞', libelle: "À appeler aujourd'hui", description: 'Prospects dont la date de rappel est aujourd’hui ou passée', href: '/interne/prospection?vue=a-appeler', source: 'prospection', vues: ['a-appeler'], urgent: true },
      { etape: COMMERCIAL, cle: 'chasse', emoji: '🚀', libelle: 'Pipeline chasse', description: 'Tous les prospects par étape, filtre LinkedIn', href: '/interne/prospection?vue=chasse', source: 'prospection', vues: ['chasse'] },
      { etape: COMMERCIAL, cle: 'a-caler', emoji: '📅', libelle: 'Visites à caler', description: 'Le commercial fixe la date du relevé technique', href: '/interne/fiches?vue=a-caler', source: 'qualification', vues: ['a-caler'], urgent: true },
      { etape: COMMERCIAL, cle: 'agenda', emoji: '🗓️', libelle: 'Agenda des visites', description: 'Relevés calés : jour, semaine, carte et itinéraire', href: '/interne/agenda', source: 'qualification', vues: ['planifies'] },
      { etape: COMMERCIAL, cle: 'devis-a-chiffrer', emoji: '📝', libelle: 'Devis à chiffrer', description: 'Relevé finalisé, devis à faire dans Costructor', href: '/interne/fiches?vue=devis-a-chiffrer', source: 'qualification', vues: ['devis-a-chiffrer'] },
      { etape: COMMERCIAL, cle: 'relances-echues', emoji: '📩', libelle: 'Relances devis', description: 'Relance du jour ou en retard', href: '/interne/fiches?vue=relances-echues', source: 'qualification', vues: ['relances-echues'], urgent: true },
      { etape: COMMERCIAL, cle: 'en-negociation', emoji: '🔥', libelle: 'En négociation', description: 'Devis discutés avec le client', href: '/interne/fiches?vue=en-negociation', source: 'qualification', vues: ['en-negociation'] },
      { etape: COMMERCIAL, cle: 'toutes', emoji: '💰', libelle: 'Pipeline vente', description: 'Toutes les affaires, rangées par étape', href: '/interne/fiches?vue=toutes', source: 'qualification', vues: ['toutes'] },
      { etape: COMMERCIAL, cle: 'contacts', emoji: '👥', libelle: 'Contacts', description: CONTACTS_DESCRIPTION, href: '/interne/contacts', source: 'contacts', vues: VUES_CONTACTS },
      // Chef de chantier : relevé, feu vert, matériel, planning, travaux, réception, SAV, maintenance
      { etape: CHEF, cle: 'releves', emoji: '📋', libelle: 'Relevés à faire', description: 'Visites du chef de chantier : du jour, en retard et à venir', href: '/interne', source: 'qualification', vues: ['planifies', 'en-retard'], urgent: true },
      { etape: CHEF, cle: 'feu-vert', emoji: '🚦', libelle: 'Feu vert à donner', description: 'Chantiers dont les 5 prérequis sont OK', href: '/interne/feu-vert', source: 'planning', vues: ['feu-vert'] },
      { etape: CHEF, cle: 'a-commander', emoji: '📦', libelle: 'Matériel à commander', description: 'Commandes en « à commander », suivi logistique, réceptions sous 7 jours', href: ecran('commandes', 'a-commander'), source: 'commandes', vues: ['a-commander'] },
      { etape: CHEF, cle: 'livraisons', emoji: '🚚', libelle: 'Livraisons en retard', description: LIVRAISONS_DESCRIPTION, href: ecran('commandes', 'livraisons-retard'), source: 'commandes', vues: ['livraisons-retard'], urgent: true },
      { etape: CHEF, cle: 'planning', emoji: '📅', libelle: 'Master planning et Planning techs', description: 'Poses, dépannages, visites et relevés par jour et par technicien', href: '/interne/planning', source: 'planning', vues: ['en-cours'] },
      { etape: CHEF, cle: 'chantiers', emoji: '🏗️', libelle: 'Chantiers en cours', description: 'Suivi travaux, prêts, en cours, réserves à lever, avancement, carte', href: '/interne/chantiers', source: 'planning', vues: ['en-cours'] },
      { etape: CHEF, cle: 'receptions', emoji: '✅', libelle: 'Réceptions à valider', description: 'PV, rapport de mesures et photos déposés par le poseur', href: '/interne/validation', source: 'planning', vues: ['receptions'], urgent: true },
      { etape: CHEF, cle: 'sav', emoji: '🚨', libelle: 'SAV urgences et tri', description: 'Tickets pas encore résolus, planning dépannage', href: ecran('sav', 'a-traiter'), source: 'sav', vues: ['a-traiter'], urgent: true },
      { etape: CHEF, cle: 'maintenance', emoji: '🔧', libelle: 'Visites de maintenance (J-30)', description: 'À planifier, échéance dans les 30 jours ou dépassée', href: ecran('maintenance', 'j-30'), source: 'maintenance', vues: ['j-30'] },
      // Installateur : interventions puis réception sur place (compteurs de toute l'équipe)
      { etape: INSTALLATEUR, cle: 'interventions', emoji: '📱', libelle: 'Interventions de l’équipe', description: 'Poses et visites de maintenance des installateurs, par jour, avec l’itinéraire', href: '/interne/interventions', source: 'planning', vues: ['interventions-equipe', 'maintenance:visites-equipe'] },
      { etape: INSTALLATEUR, cle: 'reception', emoji: '📸', libelle: 'Réception sur place', description: 'Chantiers en cours : PV signé, rapport de mesures, photos et réserves du poseur', href: '/interne/reception', source: 'planning', vues: ['en-chantier'] },
      // Back-office : achats, aides, facturation, contrats, décomptes, RH
      { etape: BACK_OFFICE, cle: 'achats', emoji: '🧾', libelle: 'Achats à valider', description: ACHATS_DESCRIPTION, href: ecran('achats', 'a-valider'), source: 'achats', vues: ['a-valider'], urgent: true },
      { etape: BACK_OFFICE, cle: 'advenir', emoji: '📄', libelle: 'Aides ADVENIR', description: 'Compteur : dossiers en cours dont la date limite tombe dans les 30 jours. Aussi : suivi, primes à encaisser', href: ecran('advenir', 'alertes'), source: 'advenir', vues: ['alertes'], urgent: true },
      { etape: BACK_OFFICE, cle: 'factures', emoji: '💰', libelle: 'Factures non réglées', description: NON_REGLEES_DESCRIPTION, href: ecran('factures', 'ouvertes'), source: 'factures', vues: ['ouvertes'] },
      { etape: BACK_OFFICE, cle: 'factures-retard', emoji: '⏰', libelle: 'Factures à relancer', description: RELANCER_DESCRIPTION, href: ecran('factures', 'retard'), source: 'factures', vues: ['retard'], urgent: true },
      { etape: BACK_OFFICE, cle: 'contrats', emoji: '📜', libelle: 'Contrats à renouveler', description: 'Échéance annuelle dans les 30 jours ou dépassée. Aussi : base du Parc, abonnements de supervision', href: ecran('parc', 'contrats'), source: 'parc', vues: ['contrats'] },
      { etape: BACK_OFFICE, cle: 'decomptes', emoji: '⚡', libelle: 'Décomptes énergétiques', description: 'Bornes en relevé : à préparer, à valider, envoyés (compteur : bornes suivies)', href: '/interne/decomptes', source: 'parc', vues: ['releve'] },
      { etape: BACK_OFFICE, cle: 'rh', emoji: '👔', libelle: 'Demandes RH', description: 'Compteur : demandes RH nouvelles ou en examen', href: ecran('rh', 'demandes'), source: 'rh', vues: ['demandes'] },
      { etape: BACK_OFFICE, cle: 'recrutement', emoji: '👷', libelle: 'Candidatures à traiter', description: RECRUTEMENT_DESCRIPTION, href: ecran('recrutement', 'a-traiter'), source: 'recrutement', vues: ['a-traiter'], urgent: true },
      { etape: BACK_OFFICE, cle: 'salaries', emoji: '👥', libelle: 'Salariés', description: SALARIES_DESCRIPTION, href: ecran('salaries', 'a-suivre'), source: 'salaries', vues: ['a-suivre'], urgent: true },
      // Direction : pilotage
      { etape: DIRECTION, cle: 'codir', emoji: '🗣️', libelle: 'Réunions CODIR', description: 'Réunions planifiées ou en rédaction', href: ecran('codir', 'a-venir'), source: 'codir', vues: ['a-venir'] },
      { etape: DIRECTION, cle: 'okr', emoji: '🎯', libelle: 'Stratégie et OKR', description: 'Objectifs à définir ou en cours', href: ecran('okr', 'en-cours'), source: 'okr', vues: ['en-cours'] },
      { etape: DIRECTION, cle: 'kaizen', emoji: '💡', libelle: 'Kaizen', description: 'Idées proposées ou en étude, à trier', href: ecran('kaizen', 'a-trier'), source: 'kaizen', vues: ['a-trier'] },
      { etape: DIRECTION, cle: 'todo', emoji: '📝', libelle: 'To-Do', description: 'Tâches à faire ou en cours ; compteur orange s’il y a du retard', href: ecran('todo', 'en-retard'), source: 'todo', vues: ['en-retard'], urgent: true },
    ],
  },
};

// Espaces des autres rôles (lien ?role=, plus affiché en raccourci depuis le 17/10, 16 h 11)
export const ESPACES_DES_ROLES = ['commercial', 'chargeOperation', 'poseur', 'backOffice'] as const;

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const jourDe = (ms: unknown): Jour | null => {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? aujourdhuiParis(new Date(n)) : null;
};
const statut = (t: any) => normal(t?.status?.status);
const champNomme = (t: any, mot: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => normal(c?.name).includes(mot));
const avant = (ms: unknown, limite: Jour) => { const j = jourDe(ms); return !!j && comparer(j, limite) <= 0; };
const statutParmi = (t: any, mots: string[]) => { const s = statut(t); return mots.some((m) => s.includes(m)); };
// Option choisie d'un menu déroulant trouvé par un mot de son nom (sans accents), en minuscules sans accents
const optionNommee = (t: any, mot: string): string => {
  const c = champNomme(t, mot);
  const v = c?.value;
  if (v === undefined || v === null || v === '') return '';
  const options: any[] = Array.isArray(c?.type_config?.options) ? c.type_config.options : [];
  const o = options.find((x: any) => Number(x?.orderindex) === Number(v) || String(x?.id) === String(v));
  return normal(o?.name);
};
// La personne fait partie d'un champ Personnes (ou des assignés si champId est vide)
export const estAMoi = (t: any, champId: string | null, moi: number): boolean => {
  const v = champId ? champ(t, champId)?.value : t?.assignees;
  return Array.isArray(v) && v.some((u: any) => Number(u?.id) === Number(moi));
};

// ── Planning Chantiers 🚧 : feu vert (mêmes règles que Ma journée et l'écran Feu vert) ──
export const CHAMP_FEU_VERT = 'c27f8084-e2f2-4eaf-83bd-d75e082e0d0a';
export const PREREQUIS_FEU_VERT = [
  '348cc59d-5adc-4ed4-b07d-5da40a9e6abc', // 📝 Devis signé
  'ba4a2025-43ec-44a0-8938-1cbc497f7bbf', // 💶 Acompte
  '8074d071-24d4-4711-8726-4c20098321fd', // 📜 Autorisations et aides
  '7ac103cd-7b52-40ca-a2d4-939e59427f56', // 📦 Matériel reçu conforme
  '24f63f50-0839-416b-8f07-9c60ee56e308', // 👷 Équipe, date et accès
];
export const feuVertADonner = (t: any): boolean => {
  const coche = champ(t, CHAMP_FEU_VERT)?.value;
  if (coche === true || coche === 'true') return false;
  return PREREQUIS_FEU_VERT.every((id) => { const n = normal(nomOption(t, id)); return n.includes('confirme') || n.includes('non applicable'); });
};
// Ordre des étapes du Planning (lu le 17/10/2026)
export const ETAPES_PLANNING = ['a planifier', 'preparation', 'planifie', 'en cours', 'realise', 'annule'];
export const etapePlanning = (s: string): number => {
  const n = normal(s);
  const i = ETAPES_PLANNING.findIndex((e) => n.includes(e));
  return i < 0 ? ETAPES_PLANNING.length : i;
};
const enTravaux = (t: any) => etapePlanning(String(t?.status?.status || '')) <= 3;
// Intervention de l'installateur : chantier en préparation, planifié ou en cours ; visite à planifier ou RDV confirmé
const interventionOuverte = (t: any) => { const e = etapePlanning(String(t?.status?.status || '')); return e >= 1 && e <= 3; };
const visiteOuverte = (t: any) => statut(t).includes('a planifier') || statut(t).includes('rdv confirme');
export const chantierAMoi = (t: any, moi: number) => interventionOuverte(t) && estAMoi(t, CHAMPS_INTERVENTION.technicienChantier, moi);
export const visiteAMoi = (t: any, moi: number) => visiteOuverte(t) && estAMoi(t, CHAMPS_INTERVENTION.technicienVisite, moi);
export const ticketAMoi = (t: any, moi: number) =>
  !statut(t).includes('resolu') && !statut(t).includes('archive') && estAMoi(t, null, moi);

// ── Prospection (Chasse) ❄️ ──
export const PROSPECTION_ID = LISTES.prospection;
export const SOURCE_PROSPECT_ID = '473aa581-a6b1-43c7-8c2e-efd683954a6c';
// Ordre des étapes de la liste (lu le 17/10/2026)
export const ETAPES_PROSPECTION = ['a traiter', 'en traitement', 'contacte', 'nurturing', 'rdv fixe', 'pas interesse'];
const termine = (t: any) => { const s = statut(t); return s.includes('rdv fixe') || s.includes('pas interesse') || s.includes('archive'); };

export const VUES_PROSPECTION: Record<string, { libelle: string; filtre: (t: any, a: Jour) => boolean }> = {
  // Vue ClickUp 📞 À APPELER AUJOURD'HUI : échéance du jour ou passée, prospects encore en cours
  'a-appeler': { libelle: "À appeler aujourd'hui", filtre: (t, a) => { const j = jourDe(t?.due_date); return !termine(t) && !!j && comparer(j, a) <= 0; } },
  // Vue ClickUp 🚀 PIPELINE CHASSE : tous les prospects ouverts, par étape
  chasse: { libelle: 'Pipeline chasse', filtre: () => true },
};

// Dossier ADVENIR encore en cours (ni validé, ni prime payée, ni annulé / expiré, ni archivé)
const advenirEnCours = (t: any) => !statutParmi(t, ['valide', 'prime payee', 'annule', 'archive']);
// Commande passée chez le fournisseur, pas encore reçue (commandé ou en livraison)
const commandeEnRoute = (t: any) => statutParmi(t, ['commande', 'en livraison']) && !statut(t).includes('a commander');
// 📅 Date Livraison Prévue des Commandes Matériel (seule date de livraison depuis le 17/10, 18 h 48)
const livraisonPrevue = (t: any) => champNomme(t, 'livraison prevue')?.value;
// RH (statuts relus le 17/10, 19 h 10). Vie des Salariés : nouvel arrivant, onboarding, offboarding, intégré, archivé.
// Recrutement Installateurs : candidature reçue, entretien 1, test technique, offre proposée, embauché, refusé, archivé.
const salariePresent = (t: any) => !statut(t).includes('archive');
const mouvementEnCours = (t: any) => statutParmi(t, ['nouvel arrivant', 'onboarding', 'offboarding']);
const habilitationAExpirer = (t: any, a: Jour) => salariePresent(t) && avant(champNomme(t, 'expiration habilitation')?.value, ajouterJours(a, 60));
const candidatEnCours = (t: any) => statutParmi(t, ['candidature recue', 'entretien', 'test technique', 'mise en situation', 'offre proposee']);

// Filtres des sources autres que Qualification, par clé de vue
export const FILTRES: Partial<Record<SourceVue, Record<string, Filtre>>> = {
  prospection: {
    'a-appeler': VUES_PROSPECTION['a-appeler'].filtre,
    chasse: VUES_PROSPECTION.chasse.filtre,
  },
  contacts: { tous: () => true },
  planning: {
    tous: () => true,
    'feu-vert': (t) => feuVertADonner(t),
    'en-cours': (t) => enTravaux(t),
    receptions: (t) => statut(t).includes('realise'),
    'mes-interventions': (t, _a, moi) => chantierAMoi(t, moi),
    'mes-receptions': (t, _a, moi) => statut(t).includes('en cours') && estAMoi(t, CHAMPS_INTERVENTION.technicienChantier, moi),
    // Direction : les mêmes vues pour toute l'équipe
    'interventions-equipe': (t) => interventionOuverte(t),
    'en-chantier': (t) => statut(t).includes('en cours'),
  },
  // Commandes Matériel (statuts relus le 17/10, 18 h : à commander, commandé, en livraison, reçu / vérifié, annulé)
  commandes: {
    'a-commander': (t) => statut(t).includes('a commander'),
    // Suivi logistique : commandé ou en livraison
    'suivi-logistique': (t) => commandeEnRoute(t),
    // Réceptions : livraison prévue dans les 7 jours (ou dépassée), pas encore reçue
    'receptions-7j': (t, a) => commandeEnRoute(t) && avant(livraisonPrevue(t), ajouterJours(a, 7)),
    // Livraisons en retard : livraison prévue avant aujourd'hui, pas encore reçue
    'livraisons-retard': (t, a) => commandeEnRoute(t) && avant(livraisonPrevue(t), ajouterJours(a, -1)),
  },
  sav: {
    'a-traiter': (t) => !statut(t).includes('resolu') && !statut(t).includes('archive'),
    'mes-tickets': (t, _a, moi) => ticketAMoi(t, moi),
    // Planning dépannage : interventions SAV planifiées
    'planning-depannage': (t) => statut(t).includes('intervention planifiee'),
  },
  maintenance: {
    'j-30': (t, a) => statut(t).includes('a planifier') && avant(champNomme(t, 'echeance')?.value, ajouterJours(a, 30)),
    'mes-visites': (t, _a, moi) => visiteAMoi(t, moi),
    'visites-equipe': (t) => visiteOuverte(t),
  },
  // Factures Clients : mêmes règles que la carte « Factures à relancer » de Ma journée. retard = À relancer : l'échéance
  // de la tâche est la date du rappel de relance (src/lib/controleReglements.ts). ouvertes = Non réglées.
  factures: {
    retard: (t, a) => { const s = statut(t); return !s.includes('litige') && (s.includes('emise') || s.includes('partiel')) && avant(t?.due_date, a); },
    ouvertes: (t) => statutParmi(t, ['a emettre', 'emise', 'partiel', 'litige']),
  },
  // Achats Fournisseurs (statuts relus le 17/10, 18 h : demande d'achat, à valider, commandé, reçu, soldé, annulé).
  // La dépense seulement : plus de date de livraison ici (18 h 48)
  achats: {
    'a-valider': (t) => statutParmi(t, ['demande d', 'a valider']),
    'en-cours': (t) => statutParmi(t, ['commande', 'recu']),
  },
  advenir: {
    alertes: (t, a) => advenirEnCours(t) && avant(champNomme(t, 'date limite')?.value, ajouterJours(a, 30)),
    // Suivi quotidien : tous les dossiers en cours
    suivi: (t) => advenirEnCours(t),
    // Cash-flow des aides : primes validées pas encore payées
    'a-encaisser': (t) => statut(t).includes('valide') && !statut(t).includes('payee'),
  },
  // Parc : mêmes règles que la carte « Contrats à renouveler » de Ma journée ; releve = bornes suivies en relevé
  // (Décomptes, mêmes règles que src/lib/decomptes.ts)
  parc: {
    tous: () => true,
    contrats: (t, a) => !statut(t).includes('hors service') && avant(champNomme(t, 'echeance annuelle')?.value, ajouterJours(a, 30)),
    releve: (t, a) => !t?.parent && suivieEnReleve(t, a),
    // 📡 Abonnement supervision à activer, actif ou suspendu (ni vide, ni aucun, ni résilié)
    supervision: (t) => { const o = optionNommee(t, 'abonnement supervision'); return !!o && !o.includes('aucun') && !o.includes('resilie'); },
  },
  rh: { demandes: (t) => statutParmi(t, ['nouvelle demande', 'en examen']) },
  // Vie des Salariés : à suivre = arrivée ou départ en cours, ou habilitation qui expire sous 60 jours
  salaries: {
    'a-suivre': (t, a) => mouvementEnCours(t) || habilitationAExpirer(t, a),
    mouvements: (t) => mouvementEnCours(t),
    habilitations: (t, a) => habilitationAExpirer(t, a),
    presents: (t) => salariePresent(t),
  },
  // Recrutement Installateurs : à traiter = candidature reçue ; pipeline = pas encore embauché, refusé ni archivé
  recrutement: {
    'a-traiter': (t) => statut(t).includes('candidature recue'),
    pipeline: (t) => candidatEnCours(t),
  },
  // Direction (statuts relus le 17/10/2026)
  codir: { 'a-venir': (t) => statutParmi(t, ['planifiee', 'en redaction']) },
  okr: { 'en-cours': (t) => statutParmi(t, ['a definir', 'en cours']) },
  kaizen: { 'a-trier': (t) => statutParmi(t, ['propose', 'en etude']) },
  // To-Do : tâches à faire ou en cours dont l'échéance est passée
  todo: { 'en-retard': (t, a) => statutParmi(t, ['to do', 'in progress']) && avant(t?.due_date, ajouterJours(a, -1)) },
};

export const etapeProspect = (t: any): number => {
  const s = statut(t);
  const i = ETAPES_PROSPECTION.findIndex((e) => s.includes(e));
  return i < 0 ? ETAPES_PROSPECTION.length : i;
};

// Ordre des étapes de Qualification (« Pipeline vente » en colonnes, empilées sur téléphone)
export const ETAPES_QUALIFICATION = ['a visiter', 'devis a faire', 'devis envoy', 'negociation', 'gagn', 'perdu'];
export const etapeQualification = (s: string): number => {
  const n = normal(s);
  const i = ETAPES_QUALIFICATION.findIndex((e) => n.includes(e));
  return i < 0 ? ETAPES_QUALIFICATION.length : i;
};
