// Menus de l'application équipe par rôle. Source : section « Écrans par rôle (revue du 11/10/2026 avec Matthieu) » de la
// tâche Phase 6. Barre du bas par rôle validée par Matthieu le 17/10/2026 (9 h 05) : les écrans les plus utilisés dans
// la barre, le reste dans « Plus » ; la direction choisit le rôle affiché et a un onglet Pilotage.
// Libellés de barre courts (1 ou 2 mots) pour ne pas être tronqués : « Mes interventions » devient « Interventions » (17/10).
// pret = écran déjà construit ; sinon l'onglet ouvre /interne/bientot/<clé>, qui affiche ce qui a été validé le 11/10.
// Fichier pur (aucun accès réseau) : utilisable côté téléphone comme côté serveur. L'affichage ne donne aucun droit :
// chaque route contrôle les rôles elle-même.

export type RoleAppli = 'direction' | 'commercial' | 'chargeOperation' | 'backOffice' | 'poseur';

export type CleIcone =
  | 'journee' | 'pipeline' | 'agenda' | 'contacts' | 'lead' | 'ressources'
  | 'planning' | 'releves' | 'chantiers' | 'materiel' | 'feuVert' | 'reception' | 'validation' | 'sav'
  | 'interventions' | 'carte' | 'maintenance'
  | 'facturation' | 'achats' | 'parc' | 'advenir' | 'decomptes' | 'rh' | 'pilotage';

export type Ecran = {
  cle: string;
  libelle: string;
  href: string;
  icone: CleIcone;
  pret: boolean;
  // Chemins où l'onglet est considéré comme actif
  actif: string[];
  // Contenu validé le 11/10 (affiché sur l'écran « à construire » et dans Plus)
  description: string;
};

const bientot = (cle: string, libelle: string, icone: CleIcone, description: string): Ecran => ({
  cle, libelle, icone, description, pret: false, href: `/interne/bientot/${cle}`, actif: [`/interne/bientot/${cle}`],
});

export const ECRANS: Record<string, Ecran> = {
  // Écrans construits
  journee: { cle: 'journee', libelle: 'Ma journée', href: '/interne/journee', icone: 'journee', pret: true, actif: ['/interne/journee'], description: "À faire aujourd'hui et à débloquer" },
  pipeline: { cle: 'pipeline', libelle: 'Pipeline', href: '/interne/fiches', icone: 'pipeline', pret: true, actif: ['/interne/fiches'], description: 'Prospection et qualification, avec les vues (à caler, devis à chiffrer, relances…)' },
  releves: { cle: 'releves', libelle: 'Relevés', href: '/interne', icone: 'releves', pret: true, actif: ['/interne', '/interne/metre'], description: 'Outil terrain : relevés à faire, utilisable hors ligne' },
  chantiers: { cle: 'chantiers', libelle: 'Chantiers', href: '/interne/chantiers', icone: 'chantiers', pret: true, actif: ['/interne/chantiers'], description: 'Suivi travaux, avancement, carte des chantiers' },
  feuVert: { cle: 'feuVert', libelle: 'Feu vert', href: '/interne/feu-vert', icone: 'feuVert', pret: true, actif: ['/interne/feu-vert'], description: 'Prérequis par chantier et ce qui manque' },
  validation: { cle: 'validation', libelle: 'Réception', href: '/interne/validation', icone: 'validation', pret: true, actif: ['/interne/validation'], description: 'Fin de travaux, réserves bloquantes ou mineures, passage au Parc' },
  reception: { cle: 'reception', libelle: 'Saisie à la pose', href: '/interne/reception', icone: 'reception', pret: true, actif: ['/interne/reception'], description: 'PV signé, rapport de mesures, photos et réserves' },

  // Commercial
  agenda: bientot('agenda', 'Agenda', 'agenda', 'Agenda et carte des visites.'),
  contacts: bientot('contacts', 'Contacts', 'contacts', 'Annuaire de la liste Contacts, partagé entre le commercial et le back-office.'),
  lead: bientot('lead', 'Nouveau lead', 'lead', 'Écran de l’application qui écrit dans Qualification, comme les formulaires du site.'),
  ressources: bientot('ressources', 'Ressources', 'ressources', 'Le Google Drive partagé de l’espace Commercial (remplace « Outils & Wiki » de ClickUp).'),

  // Chef de chantier
  planning: bientot('planning', 'Planning', 'planning', 'Master planning (chantiers) et Planning techs (répartition des techniciens). Calendrier pose fusionné avec le Master planning.'),
  materiel: bientot('materiel', 'Matériel', 'materiel', 'À commander, Suivi logistique, Planning réceptions.'),
  sav: bientot('sav', 'SAV', 'sav', 'Urgences et tri, Planning dépannage, Suivi des visites de maintenance.'),

  // Installateur
  interventions: bientot('interventions', 'Interventions', 'interventions', 'Mes interventions, une liste par jour : poses, dépannages, visites de maintenance. Fiche intervention : adresse, contact sur place, relevé et photos, matériel prévu. Saisie à la pose et rapport de pose, hors ligne.'),
  carteDuJour: bientot('carteDuJour', 'Carte du jour', 'carte', 'Itinéraire des chantiers du jour.'),
  savSite: bientot('savSite', 'SAV', 'sav', 'Ses tickets SAV sur site, avec l’historique de la borne.'),
  maintenance: bientot('maintenance', 'Visite de maintenance', 'maintenance', 'Mesures par point de charge (point 18).'),

  // Back-office
  facturation: bientot('facturation', 'Facturation', 'facturation', 'Suivi des factures et Pipeline de facturation (Costructor reste la référence). Factures en retard J+3, J+10, J+15.'),
  achats: bientot('achats', 'Achats', 'achats', 'Suivi des achats et Planning logistique. À commander, partagé avec le chef de chantier.'),
  parc: bientot('parc', 'Parc', 'parc', 'Base de données globale du Parc, Renouvellements et contrats, abonnements de supervision.'),
  advenir: bientot('advenir', 'Aides ADVENIR', 'advenir', 'Suivi quotidien des dossiers et Cash-flow des aides.'),
  decomptes: bientot('decomptes', 'Décomptes', 'decomptes', 'Décomptes énergétiques : préparation, validation, envoi au gestionnaire (points 6 et 9).'),
  rh: bientot('rh', 'RH et recrutement', 'rh', 'Demandes RH, suivi des salariés, recrutement installateurs et commerciaux.'),

  // Direction
  pilotage: bientot('pilotage', 'Pilotage', 'pilotage', 'Réunions CODIR, stratégie et OKR, Kaizen, To-Do. Tableaux de bord prévus en Phase 7.'),
};

// Barre du bas (4 onglets au plus, « Plus » est ajouté après) et contenu de « Plus », par rôle
export const MENUS: Record<RoleAppli, { barre: string[]; plus: string[] }> = {
  commercial: { barre: ['journee', 'pipeline', 'agenda', 'contacts'], plus: ['lead', 'ressources'] },
  chargeOperation: { barre: ['planning', 'releves', 'chantiers', 'materiel'], plus: ['journee', 'feuVert', 'validation', 'sav'] },
  poseur: { barre: ['interventions', 'carteDuJour', 'savSite'], plus: ['reception', 'maintenance', 'releves'] },
  backOffice: { barre: ['journee', 'facturation', 'achats', 'parc'], plus: ['advenir', 'decomptes', 'contacts', 'rh'] },
  direction: { barre: ['journee', 'pipeline', 'chantiers', 'pilotage'], plus: ['releves', 'feuVert', 'validation', 'facturation', 'parc', 'contacts'] },
};

export const LIBELLE_ROLE: Record<RoleAppli, string> = {
  direction: 'Direction',
  commercial: 'Commercial',
  chargeOperation: 'Chef de chantier',
  backOffice: 'Back-office',
  poseur: 'Installateur',
};

// Ordre de préférence quand une personne a plusieurs rôles et n'a rien choisi
export const ORDRE_ROLES: RoleAppli[] = ['direction', 'chargeOperation', 'commercial', 'backOffice', 'poseur'];

// Onglet actif : chemin exact pour /interne (planning terrain), sinon préfixe
export function estActif(ecran: Ecran, chemin: string): boolean {
  return ecran.actif.some((p) => (p === '/interne' ? chemin === '/interne' : chemin === p || chemin.startsWith(`${p}/`) || chemin.startsWith(`${p}?`)));
}
