// Un espace par rôle (page « Un espace par rôle (proposition du 17/10/2026, 10 h 30) » du Doc de la carte des menus).
// Principe validé par Matthieu le 17/10/2026 : 3 niveaux seulement. Mon espace = les vues du rôle dans l'ordre de son
// travail, chacune avec son compteur ; une vue = la liste des fiches ; la fiche, toujours la même, avec le bloc 📇 Contact.
// Espace Commercial validé le 17/10 à 10 h 44, corrigé à 11 h 01 (Matthieu : « ce n'est pas le commercial qui fait les
// relevés techniques ») : Visites à caler et Agenda des visites retirées, elles vont au chef de chantier. Le commercial
// reçoit le relevé finalisé (Devis à chiffrer), chiffre, envoie et relance.
// Espace Chef de chantier validé le 17/10 à 11 h 06 (9 vues). Les vues dont l'écran n'existe pas encore ouvrent la
// liste ClickUp (externe) ou l'écran « à construire », avec leur compteur réel quand il est calculable.
// Espace Installateur validé le 17/10 à 11 h 18 (3 vues) : il ne voit que son travail (« moi » = la personne connectée,
// comme la vue ClickUp 📱 MODE TECH), lisible hors ligne.
// Espace Back-office validé le 17/10 à 11 h 28 (8 vues). Costructor reste la référence des factures et règlements :
// les vues lisent ce que ClickUp en reçoit. Écrans de l'application à construire : en attendant, ouverture de ClickUp.
// Clé de vue : « cle » dans la source de la vue, ou « source:cle » pour additionner une autre liste.
// Fichier pur (aucun accès réseau) : utilisable côté téléphone comme côté serveur. L'affichage ne donne aucun droit.
import type { Jour } from '@/lib/joursOuvres';
import { aujourdhuiParis, ajouterJours, comparer } from '@/lib/joursOuvres';
import { champ, nomOption } from '@/lib/vuesFiches';

export type SourceVue =
  | 'qualification' | 'prospection' | 'contacts' | 'planning' | 'commandes' | 'sav' | 'maintenance'
  | 'factures' | 'achats' | 'advenir' | 'parc' | 'rh' | 'aucune';
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
};

export type Espace = { titre: string; creer?: { libelle: string; href: string }; vues: VueEspace[] };

const EQUIPE = '90151325642';
const liste = (id: string) => `https://app.clickup.com/${EQUIPE}/v/li/${id}`;

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

const CLICKUP = ' (ouvre ClickUp en attendant l’écran)';

export const ESPACES: Partial<Record<'commercial' | 'chargeOperation' | 'poseur' | 'backOffice' | 'direction', Espace>> = {
  commercial: {
    titre: 'Espace commercial',
    creer: { libelle: 'Nouveau lead', href: '/interne/bientot/lead' },
    vues: [
      { cle: 'a-appeler', emoji: '📞', libelle: "À appeler aujourd'hui", description: 'Prospects dont la date de rappel est aujourd’hui ou passée', href: '/interne/prospection?vue=a-appeler', source: 'prospection', vues: ['a-appeler'], urgent: true },
      { cle: 'chasse', emoji: '🚀', libelle: 'Pipeline chasse', description: 'Tous les prospects par étape, filtre LinkedIn', href: '/interne/prospection?vue=chasse', source: 'prospection', vues: ['chasse'] },
      { cle: 'devis-a-chiffrer', emoji: '📝', libelle: 'Devis à chiffrer', description: 'Relevé finalisé par le chef de chantier, devis à faire dans Costructor', href: '/interne/fiches?vue=devis-a-chiffrer', source: 'qualification', vues: ['devis-a-chiffrer'] },
      { cle: 'relances-echues', emoji: '📩', libelle: 'Relances devis', description: 'Relance du jour ou en retard', href: '/interne/fiches?vue=relances-echues', source: 'qualification', vues: ['relances-echues'], urgent: true },
      { cle: 'en-negociation', emoji: '🔥', libelle: 'En négociation', description: 'Devis discutés avec le client', href: '/interne/fiches?vue=en-negociation', source: 'qualification', vues: ['en-negociation'] },
      { cle: 'toutes', emoji: '💰', libelle: 'Pipeline vente', description: 'Toutes les affaires, rangées par étape', href: '/interne/fiches?vue=toutes', source: 'qualification', vues: ['toutes'] },
      { cle: 'contacts', emoji: '👥', libelle: 'Contacts', description: 'Syndics, conseils syndicaux, gestionnaires', href: '/interne/contacts', source: 'contacts', vues: ['tous'] },
    ],
  },
  chargeOperation: {
    titre: 'Espace chef de chantier',
    vues: [
      { cle: 'a-caler', emoji: '📅', libelle: 'Visites à caler', description: 'Fiches à visiter sans date : appeler le client', href: '/interne/fiches?vue=a-caler', source: 'qualification', vues: ['a-caler'] },
      { cle: 'releves', emoji: '📋', libelle: 'Relevés à faire', description: 'Du jour, en retard et à venir, utilisables hors ligne (agenda et carte des audits à venir)', href: '/interne', source: 'qualification', vues: ['planifies', 'en-retard'], urgent: true },
      { cle: 'feu-vert', emoji: '🚦', libelle: 'Feu vert à donner', description: 'Chantiers dont les 5 prérequis sont OK', href: '/interne/feu-vert', source: 'planning', vues: ['feu-vert'] },
      { cle: 'planning', emoji: '📅', libelle: 'Master planning et Planning techs', description: 'Chantiers par date et répartition des techniciens', href: '/interne/bientot/planning', source: 'aucune', aConstruire: true },
      { cle: 'chantiers', emoji: '🏗️', libelle: 'Chantiers en cours', description: 'Suivi travaux : à planifier, préparation, planifié, en cours', href: '/interne/chantiers', source: 'planning', vues: ['en-cours'] },
      { cle: 'receptions', emoji: '✅', libelle: 'Réceptions à valider', description: 'PV, rapport de mesures et photos déposés par le poseur', href: '/interne/validation', source: 'planning', vues: ['receptions'], urgent: true },
      { cle: 'a-commander', emoji: '📦', libelle: 'Matériel à commander', description: `Commandes en « à commander »${CLICKUP}`, href: liste(LISTES.commandes), source: 'commandes', vues: ['a-commander'], externe: true },
      { cle: 'sav', emoji: '🚨', libelle: 'SAV urgences et tri', description: `Tickets pas encore résolus${CLICKUP}`, href: liste(LISTES.sav), source: 'sav', vues: ['a-traiter'], urgent: true, externe: true },
      { cle: 'maintenance', emoji: '🔧', libelle: 'Visites de maintenance (J-30)', description: `À planifier, échéance dans les 30 jours ou dépassée${CLICKUP}`, href: liste(LISTES.maintenance), source: 'maintenance', vues: ['j-30'], externe: true },
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
      { cle: 'factures-retard', emoji: '⏰', libelle: 'Factures en retard', description: `Émises ou partiellement payées, échéance passée (relances J+3, J+10, J+15)${CLICKUP}`, href: liste(LISTES.factures), source: 'factures', vues: ['retard'], urgent: true, externe: true },
      { cle: 'factures', emoji: '💰', libelle: 'Suivi des factures', description: `À émettre, émises, partiellement payées, en litige (Costructor fait référence)${CLICKUP}`, href: liste(LISTES.factures), source: 'factures', vues: ['ouvertes'], externe: true },
      { cle: 'achats', emoji: '🚚', libelle: 'Achats et livraisons', description: `Compteur : commandés dont la livraison prévue est dépassée${CLICKUP}`, href: liste(LISTES.achats), source: 'achats', vues: ['livraisons-retard'], urgent: true, externe: true },
      { cle: 'advenir', emoji: '📄', libelle: 'Aides ADVENIR', description: `Compteur : dossiers en cours dont la date limite de réalisation tombe dans les 30 jours${CLICKUP}`, href: liste(LISTES.advenir), source: 'advenir', vues: ['alertes'], urgent: true, externe: true },
      { cle: 'contrats', emoji: '📜', libelle: 'Contrats à renouveler', description: `Échéance annuelle dans les 30 jours ou dépassée${CLICKUP}`, href: liste(LISTES.parc), source: 'parc', vues: ['contrats'], externe: true },
      { cle: 'decomptes', emoji: '⚡', libelle: 'Décomptes énergétiques', description: 'Préparation, validation, envoi au gestionnaire. Liste ClickUp à créer d’abord', href: '/interne/bientot/decomptes', source: 'aucune', aConstruire: true },
      { cle: 'contacts', emoji: '👥', libelle: 'Contacts', description: 'Syndics, conseils syndicaux, gestionnaires', href: '/interne/contacts', source: 'contacts', vues: ['tous'] },
      { cle: 'rh', emoji: '👔', libelle: 'RH et recrutement', description: `Compteur : demandes RH nouvelles ou en examen${CLICKUP}`, href: liste(LISTES.rh), source: 'rh', vues: ['demandes'], externe: true },
    ],
  },
};

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const jourDe = (ms: unknown): Jour | null => {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? aujourdhuiParis(new Date(n)) : null;
};
const statut = (t: any) => normal(t?.status?.status);
const champNomme = (t: any, mot: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => normal(c?.name).includes(mot));
const avant = (ms: unknown, limite: Jour) => { const j = jourDe(ms); return !!j && comparer(j, limite) <= 0; };
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
export const chantierAMoi = (t: any, moi: number) => {
  const e = etapePlanning(String(t?.status?.status || ''));
  return e >= 1 && e <= 3 && estAMoi(t, CHAMPS_INTERVENTION.technicienChantier, moi);
};
export const visiteAMoi = (t: any, moi: number) =>
  (statut(t).includes('a planifier') || statut(t).includes('rdv confirme')) && estAMoi(t, CHAMPS_INTERVENTION.technicienVisite, moi);
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
const advenirEnCours = (t: any) => { const s = statut(t); return !['valide', 'prime payee', 'annule', 'archive'].some((m) => s.includes(m)); };

// Filtres des sources autres que Qualification, par clé de vue
export const FILTRES: Partial<Record<SourceVue, Record<string, Filtre>>> = {
  prospection: {
    'a-appeler': VUES_PROSPECTION['a-appeler'].filtre,
    chasse: VUES_PROSPECTION.chasse.filtre,
  },
  contacts: { tous: () => true },
  planning: {
    'feu-vert': (t) => feuVertADonner(t),
    'en-cours': (t) => enTravaux(t),
    receptions: (t) => statut(t).includes('realise'),
    'mes-interventions': (t, _a, moi) => chantierAMoi(t, moi),
    'mes-receptions': (t, _a, moi) => statut(t).includes('en cours') && estAMoi(t, CHAMPS_INTERVENTION.technicienChantier, moi),
  },
  commandes: { 'a-commander': (t) => statut(t).includes('a commander') },
  sav: {
    'a-traiter': (t) => !statut(t).includes('resolu') && !statut(t).includes('archive'),
    'mes-tickets': (t, _a, moi) => ticketAMoi(t, moi),
  },
  maintenance: {
    'j-30': (t, a) => statut(t).includes('a planifier') && avant(champNomme(t, 'echeance')?.value, ajouterJours(a, 30)),
    'mes-visites': (t, _a, moi) => visiteAMoi(t, moi),
  },
  // Factures Clients : mêmes règles que la carte « Factures en retard » de Ma journée
  factures: {
    retard: (t, a) => { const s = statut(t); return !s.includes('litige') && (s.includes('emise') || s.includes('partiel')) && avant(t?.due_date, a); },
    ouvertes: (t) => { const s = statut(t); return ['a emettre', 'emise', 'partiel', 'litige'].some((m) => s.includes(m)); },
  },
  achats: { 'livraisons-retard': (t, a) => statut(t).includes('commande') && avant(champNomme(t, 'livraison prevue')?.value, a) },
  advenir: { alertes: (t, a) => advenirEnCours(t) && avant(champNomme(t, 'date limite')?.value, ajouterJours(a, 30)) },
  // Parc : mêmes règles que la carte « Contrats à renouveler » de Ma journée
  parc: { contrats: (t, a) => !statut(t).includes('hors service') && avant(champNomme(t, 'echeance annuelle')?.value, ajouterJours(a, 30)) },
  rh: { demandes: (t) => statut(t).includes('nouvelle demande') || statut(t).includes('en examen') },
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
