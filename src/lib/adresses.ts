// Adresses des écrans de l'application équipe (app.chargeo.fr), en un seul endroit.
// 19/10/2026, 18 h 43 (Matthieu : « fais-le proprement sur la branche de test avec un maximum de garde-fous ») : les
// dossiers de src/app/(appli) portent les adresses (le dossier = l'adresse, sans /interne), et TOUS les liens de
// l'application passent par ce fichier. Renommer un écran = déplacer son dossier et changer une ligne ici.
// Les anciennes adresses /interne/… (liens déjà partis dans ClickUp, les emails, les agendas Google, Costructor) sont
// renvoyées vers les nouvelles par src/proxy.ts (adresseDepuisAncienne, redirection temporaire 307). À garder pour toujours.
// Suivi : sous-tâche « Ranger les adresses de l'application » de « Construire l'application équipe CHARGéO ».
// Fichier pur (aucun accès réseau) : utilisable côté téléphone, côté serveur et dans src/proxy.ts.

// Écran de liste par source (src/lib/listesAppli.ts). Recrutement s'affiche sur /candidatures : chargeo.fr/recrutement
// est la page publique des candidats.
export const ADRESSES_LISTES: Record<string, string> = {
  commandes: '/commandes',
  sav: '/sav',
  maintenance: '/maintenance',
  factures: '/factures',
  achats: '/achats',
  advenir: '/advenir',
  parc: '/parc',
  rh: '/rh',
  salaries: '/salaries',
  recrutement: '/candidatures',
  codir: '/codir',
  okr: '/okr',
  kaizen: '/kaizen',
  todo: '/todo',
};

export const adresses = {
  // Onglets de la barre du bas
  journee: '/journee',
  aTraiter: '/a-traiter',
  consulter: '/consulter',
  creer: '/creer',
  // Créations (onglet Créer) ; /creer/ticket-sav et /creer/kaizen sont le même écran (src/app/(appli)/creer/[type])
  creerProjet: '/creer/projet',
  creerProspect: '/creer/prospect',
  creerTache: '/creer/tache',
  creerSalarie: '/creer/salarie',
  creerCandidat: '/creer/candidat',
  creerTicketSav: '/creer/ticket-sav',
  creerKaizen: '/creer/kaizen',
  // Vente
  pipeline: '/pipeline',
  affaire: (id: string) => `/affaires/${id}`,
  calerReleve: (id: string) => `/affaires/${id}/caler`,
  prospection: '/prospection',
  agenda: '/agenda',
  contacts: '/contacts',
  // Relevés techniques
  releves: '/releves',
  releve: (id: string) => `/releves/${id}`,
  // Chantiers
  chantiers: '/chantiers',
  feuVert: '/chantiers/feu-vert',
  receptionChantiers: '/chantiers/reception',
  planifierPose: (id: string) => `/chantiers/${id}/planifier`,
  demarrerChantier: (id: string) => `/chantiers/${id}/demarrer`,
  planning: '/planning',
  // Interventions de l'installateur
  interventions: '/interventions',
  rapportSignature: '/interventions/rapport',
  avisGoogle: '/interventions/avis-google',
  pose: (id: string) => `/interventions/${id}/pose`,
  miseEnService: (id: string) => `/interventions/${id}/mise-en-service`,
  visiteMaintenance: (id: string) => `/interventions/${id}/maintenance`,
  pv: (id: string) => `/interventions/${id}/pv`,
  // SAV et maintenance
  carteSav: '/sav/carte',
  rapportSav: (id: string) => `/sav/${id}/rapport`,
  calerDepannage: (id: string) => `/sav/${id}/caler`,
  calerVisite: (id: string) => `/maintenance/${id}/caler`,
  // Rendez-vous de maintenance (visite) ou de dépannage SAV
  calerRdv: (type: string, id: string) => (type === 'visite' ? `/maintenance/${id}/caler` : `/sav/${id}/caler`),
  // Listes et fiche générique
  liste: (source: string) => ADRESSES_LISTES[source] || `/${source}`,
  fiche: (id: string) => `/fiche/${id}`,
  // Consulter
  ressources: '/ressources',
  wikis: '/wikis',
  wiki: (cle: string) => `/wikis/${cle}`,
  decomptes: '/decomptes',
  bientot: (cle: string) => `/bientot/${cle}`,
};

// Premier segment de chaque écran de l'application : protégé par la connexion (src/proxy.ts), servi par app.chargeo.fr,
// renvoyé de chargeo.fr vers app.chargeo.fr. Aucun ne correspond à une page du site public (vérifié le 19/10/2026 :
// avis, blog, connexion, copropriete, espace-client, mentions-legales, particuliers, pro, recrutement, signature, suivi,
// vcard, zone-intervention).
export const SEGMENTS_APPLI: string[] = [
  'journee', 'a-traiter', 'consulter', 'creer', 'pipeline', 'affaires', 'prospection', 'agenda', 'contacts', 'releves',
  'chantiers', 'planning', 'interventions', 'fiche', 'ressources', 'wikis', 'decomptes', 'bientot',
  ...Object.values(ADRESSES_LISTES).map((a) => a.slice(1)),
];

export function estPageAppli(chemin: string): boolean {
  const premier = chemin.split('/')[1] || '';
  return SEGMENTS_APPLI.includes(premier);
}

// Ancienne adresse /interne/… → nouvelle adresse (sans la partie ?…, que src/proxy.ts recopie). null si ce n'est pas une
// ancienne adresse de l'application.
// Exception voulue : /interne seul (ancienne adresse d'entrée : favoris, historique, anciens messages) ouvre Ma journée
// (Matthieu, 19/10/2026, 14 h 20) ; avec un filtre (?vue=…, pastilles Aujourd'hui et À venir) il ouvre les Relevés.
const ANCIENNES: [RegExp, string][] = [
  [/^\/interne\/journee$/, '/journee'],
  [/^\/interne\/espace$/, '/a-traiter'],
  [/^\/interne\/consulter$/, '/consulter'],
  [/^\/interne\/plus$/, '/creer'],
  [/^\/interne\/projet\/nouveau$/, '/creer/projet'],
  [/^\/interne\/prospection\/nouveau$/, '/creer/prospect'],
  [/^\/interne\/creer\/sav$/, '/creer/ticket-sav'],
  [/^\/interne\/creer\/([^/]+)$/, '/creer/$1'],
  [/^\/interne\/fiches$/, '/pipeline'],
  [/^\/interne\/fiches\/([^/]+)$/, '/affaires/$1'],
  [/^\/interne\/caler\/([^/]+)$/, '/affaires/$1/caler'],
  [/^\/interne\/(prospection|agenda|contacts|chantiers|planning|interventions|ressources|decomptes)$/, '/$1'],
  [/^\/interne\/metre\/([^/]+)$/, '/releves/$1'],
  [/^\/interne\/feu-vert$/, '/chantiers/feu-vert'],
  [/^\/interne\/validation$/, '/chantiers/reception'],
  [/^\/interne\/planifier\/([^/]+)$/, '/chantiers/$1/planifier'],
  [/^\/interne\/demarrer\/([^/]+)$/, '/chantiers/$1/demarrer'],
  [/^\/interne\/(pose|mise-en-service|maintenance|pv)\/([^/]+)$/, '/interventions/$2/$1'],
  [/^\/interne\/reception$/, '/interventions/rapport'],
  [/^\/interne\/avis$/, '/interventions/avis-google'],
  [/^\/interne\/rdv\/visite\/([^/]+)$/, '/maintenance/$1/caler'],
  [/^\/interne\/rdv\/[^/]+\/([^/]+)$/, '/sav/$1/caler'],
  [/^\/interne\/rapport-sav\/([^/]+)$/, '/sav/$1/rapport'],
  [/^\/interne\/carte-sav$/, '/sav/carte'],
  [/^\/interne\/element\/([^/]+)$/, '/fiche/$1'],
  [/^\/interne\/wiki$/, '/wikis'],
  [/^\/interne\/wiki\/([^/]+)$/, '/wikis/$1'],
  [/^\/interne\/bientot\/([^/]+)$/, '/bientot/$1'],
];

export function adresseDepuisAncienne(chemin: string, avecFiltre = false): string | null {
  const c = chemin.length > 1 ? chemin.replace(/\/+$/, '') : chemin;
  if (c !== '/interne' && !c.startsWith('/interne/')) return null;
  if (c === '/interne') return avecFiltre ? adresses.releves : adresses.journee;
  const liste = c.match(/^\/interne\/liste\/([^/]+)$/);
  if (liste) return adresses.liste(liste[1]);
  for (const [motif, cible] of ANCIENNES) if (motif.test(c)) return c.replace(motif, cible);
  // Ancienne adresse inconnue : Ma journée plutôt qu'une page introuvable
  return adresses.journee;
}
