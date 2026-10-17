// Wikis ClickUp lisibles dans l'application (17/10/2026, 19 h 25, Matthieu : « j'aimerais bien aussi que depuis l'appli
// on puisse voir tous les wiki qu'on a mis en place dans ClickUp, le wiki de chaque liste, un petit lien quelque part qui
// amène vers le wiki »). Comme ClickUp est inutilisable au téléphone (18 h 34), le wiki n'ouvre pas ClickUp : la page
// est lue par /api/interne/wiki et affichée dans l'application (/interne/wiki/<clé>).
// Identifiants relus le 17/10/2026 : doc = le Doc « 📖 Wiki - <liste> » rattaché à la liste, page = sa page principale.
// roles = qui le voit dans l'index (la direction voit tout) ; absent = toute l'équipe.
// Fichier pur (aucun accès réseau).

export type RoleWiki = 'direction' | 'commercial' | 'chargeOperation' | 'backOffice' | 'poseur';
export type Wiki = { cle: string; titre: string; groupe: string; doc: string; page: string; roles?: RoleWiki[] };

const GUIDE = 'Guide de l’entreprise';
const VENTE = 'Vente';
const CHANTIER = 'Chantiers et SAV';
const BACK = 'Back-office';
const RH = 'Ressources humaines';
const DIR = 'Direction';
const PORTAIL = '2kyq03ya-9835';

export const WIKIS: Wiki[] = [
  // Portail de l'ERP (toute l'équipe)
  { cle: 'portail', titre: '📚 Portail de l’ERP', groupe: GUIDE, doc: PORTAIL, page: '2kyq03ya-3295' },
  { cle: 'premiers-jours', titre: '🚀 Tes premiers jours', groupe: GUIDE, doc: PORTAIL, page: '2kyq03ya-3935' },
  { cle: 'entreprise', titre: '🏢 L’entreprise', groupe: GUIDE, doc: PORTAIL, page: '2kyq03ya-3375' },
  { cle: 'mission', titre: '🎯 Mission, vision et valeurs', groupe: GUIDE, doc: PORTAIL, page: '2kyq03ya-3335' },
  { cle: 'qui-fait-quoi', titre: '👥 Qui fait quoi', groupe: GUIDE, doc: PORTAIL, page: '2kyq03ya-3395' },
  { cle: 'regles', titre: '📋 Règles internes', groupe: GUIDE, doc: PORTAIL, page: '2kyq03ya-3435' },
  { cle: 'epi', titre: '🎒 Équipement, EPI et avantages', groupe: GUIDE, doc: PORTAIL, page: '2kyq03ya-3415' },
  { cle: 'conges', titre: '🌴 Congés et absences', groupe: GUIDE, doc: PORTAIL, page: '2kyq03ya-3315' },
  { cle: 'deplacements', titre: '🚚 Déplacements et véhicules', groupe: GUIDE, doc: PORTAIL, page: '2kyq03ya-3355' },
  { cle: 'outils-acces', titre: '🔐 Outils et accès', groupe: GUIDE, doc: PORTAIL, page: '2kyq03ya-3955' },
  { cle: 'automatismes', titre: '⚙️ Automatismes', groupe: GUIDE, doc: PORTAIL, page: '2kyq03ya-4635', roles: ['backOffice', 'chargeOperation', 'commercial'] },
  // Vente
  { cle: 'prospection', titre: '❄️ Prospection (Chasse)', groupe: VENTE, doc: '2kyq03ya-9435', page: '2kyq03ya-2895', roles: ['commercial'] },
  { cle: 'qualification', titre: '🔥 Qualification (Études)', groupe: VENTE, doc: '2kyq03ya-9415', page: '2kyq03ya-2875', roles: ['commercial', 'chargeOperation'] },
  { cle: 'copropriete', titre: '🏛️ Copropriété : faire voter un devis en AG', groupe: VENTE, doc: '2kyq03ya-9415', page: '2kyq03ya-4335', roles: ['commercial'] },
  { cle: 'outils-vente', titre: '📚 Outils & Wiki (ressources de vente)', groupe: VENTE, doc: '2kyq03ya-9575', page: '2kyq03ya-3035', roles: ['commercial'] },
  // Chantiers et SAV
  { cle: 'planning', titre: '🚧 Planning Chantiers', groupe: CHANTIER, doc: '2kyq03ya-9455', page: '2kyq03ya-2915', roles: ['chargeOperation', 'poseur', 'backOffice'] },
  { cle: 'commandes', titre: '🚚 Commandes Matériel', groupe: CHANTIER, doc: '2kyq03ya-9495', page: '2kyq03ya-2955', roles: ['chargeOperation', 'backOffice'] },
  { cle: 'advenir', titre: '📄 Dossiers Advenir', groupe: CHANTIER, doc: '2kyq03ya-9475', page: '2kyq03ya-2935', roles: ['chargeOperation', 'backOffice', 'commercial'] },
  { cle: 'sav', titre: '🔧 Tickets SAV', groupe: CHANTIER, doc: '2kyq03ya-9515', page: '2kyq03ya-2975', roles: ['chargeOperation', 'poseur', 'backOffice'] },
  { cle: 'parc', titre: '🔄 Parc Installé (Maintenance)', groupe: CHANTIER, doc: '2kyq03ya-9535', page: '2kyq03ya-2995', roles: ['chargeOperation', 'backOffice', 'commercial'] },
  // Back-office
  { cle: 'factures', titre: '💰 Factures Clients', groupe: BACK, doc: '2kyq03ya-9595', page: '2kyq03ya-3055', roles: ['backOffice'] },
  { cle: 'achats', titre: '🧾 Achats Fournisseurs', groupe: BACK, doc: '2kyq03ya-9615', page: '2kyq03ya-4595', roles: ['backOffice', 'chargeOperation'] },
  // Ressources humaines (les demandes RH concernent toute l'équipe)
  { cle: 'rh', titre: '☕ Gestion RH Quotidienne', groupe: RH, doc: '2kyq03ya-9695', page: '2kyq03ya-3155' },
  { cle: 'salaries', titre: '👥 Vie des Salariés', groupe: RH, doc: '2kyq03ya-9675', page: '2kyq03ya-3135', roles: ['backOffice'] },
  { cle: 'recrutement', titre: '👷 Recrutement Installateurs', groupe: RH, doc: '2kyq03ya-9635', page: '2kyq03ya-3095', roles: ['backOffice'] },
  { cle: 'recrutement-sales', titre: '💼 Recrutement Sales/Freelance', groupe: RH, doc: '2kyq03ya-9655', page: '2kyq03ya-3115', roles: ['backOffice'] },
  // Direction (Kaizen : toute l'équipe peut proposer)
  { cle: 'kaizen', titre: '💡 Kaizen (Amélioration)', groupe: DIR, doc: '2kyq03ya-9775', page: '2kyq03ya-3235' },
  { cle: 'codir', titre: '🗣️ Réunions CODIR', groupe: DIR, doc: '2kyq03ya-9735', page: '2kyq03ya-3195', roles: [] },
  { cle: 'okr', titre: '🎯 Stratégie & OKR', groupe: DIR, doc: '2kyq03ya-9715', page: '2kyq03ya-3175', roles: [] },
  { cle: 'todo', titre: '📝 To-Do', groupe: DIR, doc: '2kyq03ya-9795', page: '2kyq03ya-3255', roles: [] },
  { cle: 'vues-globales', titre: '🔭 Vues Globales', groupe: DIR, doc: '2kyq03ya-9755', page: '2kyq03ya-3215', roles: [] },
  { cle: 'sourcing', titre: '🤝 Pipeline de sourcing prestataires', groupe: DIR, doc: '2kyq03ya-9815', page: '2kyq03ya-3275', roles: [] },
];

export const GROUPES_WIKI = [GUIDE, VENTE, CHANTIER, BACK, RH, DIR];

export const wikiDe = (cle: string): Wiki | null => WIKIS.find((w) => w.cle === cle) || null;

export function wikiVisible(w: Wiki, roles: string[]): boolean {
  if (roles.includes('direction')) return true;
  if (!w.roles) return true;
  return w.roles.some((r) => roles.includes(r));
}

// Wiki de l'écran de liste (source de src/lib/listesAppli.ts) ; pas de wiki pour Maintenance ni Contacts
const PAR_SOURCE: Record<string, string> = {
  commandes: 'commandes', sav: 'sav', factures: 'factures', achats: 'achats', advenir: 'advenir', parc: 'parc',
  rh: 'rh', salaries: 'salaries', recrutement: 'recrutement', codir: 'codir', okr: 'okr', kaizen: 'kaizen', todo: 'todo',
  prospection: 'prospection', qualification: 'qualification', planning: 'planning',
};
export const wikiDeSource = (source: string): string | null => PAR_SOURCE[source] || null;
