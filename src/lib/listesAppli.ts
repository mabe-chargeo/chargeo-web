// Écrans de liste de l'application (lot « écrans qui manquent », lancé par Matthieu le 17/10/2026 à 14 h 28 : « on crée
// tout d'un coup au fur et à mesure »). Un seul moteur pour toutes les listes ClickUp qui s'ouvraient encore dans ClickUp :
// Commandes, SAV, Maintenance, Factures, Achats, ADVENIR, Parc, RH, Salariés, Recrutement, CODIR, OKR, Kaizen, To-Do.
// Écran /interne/liste/<source>?vue=<clé> : pastilles (vues de l'espace + une par statut), cartes avec les champs clés,
// et la fiche générique /interne/element/<id> (tous les champs remplis, description, commentaires, liens).
// Les vues et leurs compteurs sont ceux de src/lib/espaces.ts (FILTRES) : mêmes chiffres que Mon espace.
// 17/10/2026, 18 h 02 (Matthieu : « il faut créer tous les écrans qui manquent ») : vues de la liste du 11/10 ajoutées,
// Suivi logistique et Réceptions sous 7 jours (Matériel), Planning dépannage (SAV), À valider et En cours (Achats),
// Suivi des dossiers et Primes à encaisser (ADVENIR), Base du Parc et Abonnements de supervision (Parc). Le pipeline de
// facturation est donné par les pastilles de statut de Factures.
// 18 h 02 aussi : l'installateur ne lit plus le Parc en entier (décision du 11/10 : « pas d'accès à la Base de données
// globale du Parc »). Il garde l'historique de la borne par ses tickets et ses visites.
// 18 h 48 (choix de Matthieu : la date de livraison seulement dans Commandes) : Livraisons en retard passe dans
// Matériel et commandes ; Achats fournisseurs = la dépense (à valider, commandés et reçus, montants, échéance).
// 19 h 00 (écrans qui restent) : totaux de la vue affichée (totaux : champs monétaires additionnés), pour la
// trésorerie des aides ADVENIR (primes estimées et réelles, « Primes à encaisser »), des factures et des achats.
// Champs ADVENIR corrigés : les mots sont comparés sans accents, « prime estimee » ne trouvait pas « Prime Estimé ».
// 19 h 10 (choix de Matthieu : salarié et candidat créés depuis l'application) : Salariés (Vie des Salariés) et
// Recrutement (Recrutement Installateurs, alimentée par chargeo.fr/recrutement), lus par le back-office et la
// direction (données RH sensibles) ; creer = bouton de création en tête de l'écran.
// 19 h 38 (choix de Matthieu) : la vue « ouvertes » des Factures s'appelle « Non réglées » (à émettre, émise,
// partiellement payée, en litige) ; « Tous » y ajoute les payées et les annulées.
// 19 h 42 (choix de Matthieu) : « En retard » des Factures devient « À relancer ». L'échéance de la tâche est la date
// du rappel de relance (J+3, J+10, J+15, src/lib/controleReglements.ts), le champ 📅 Date d'échéance la date limite de
// paiement : la carte les étiquette (libelleEcheance = « Relance le », etiquettes = « Paiement dû le »).
// Fichier pur : utilisable côté téléphone comme côté serveur. L'affichage ne donne aucun droit : les routes
// /api/interne/listes et /api/interne/elements contrôlent les rôles.
import { LISTES, FILTRES, type Filtre, type SourceVue } from '@/lib/espaces';

export type RoleListe = 'direction' | 'commercial' | 'chargeOperation' | 'backOffice' | 'poseur';
export type SourceListe = Exclude<SourceVue, 'qualification' | 'aucune' | 'prospection' | 'contacts' | 'planning'>;

export type ConfigListe = {
  titre: string;
  emoji: string;
  // Rôles qui lisent la liste ; la direction lit tout
  roles: RoleListe[];
  // Rôles qui ne voient que leurs tâches (assignées ou champ Technicien) : l'installateur
  seulementMoi?: RoleListe[];
  // Vues propres (clés de FILTRES), dans l'ordre des pastilles
  vues: { cle: string; libelle: string }[];
  // Mots des champs montrés sur la carte (comparés au nom du champ, sans accents)
  champs: string[];
  // Libellé affiché à la place du nom d'un champ sur la carte (clé = mot de champs)
  etiquettes?: Record<string, string>;
  // Libellé devant l'échéance de la tâche sur la carte (Factures : « Relance le »)
  libelleEcheance?: string;
  // Champs monétaires additionnés en tête de la vue (mot du nom du champ, sans accents)
  totaux?: { mot: string; libelle: string }[];
  // Bouton de création en tête de l'écran
  creer?: { libelle: string; href: string };
  // Phrase de rappel en tête d'écran
  note?: string;
};

export const CONFIG_LISTES: Record<SourceListe, ConfigListe> = {
  commandes: {
    titre: 'Matériel et commandes', emoji: '📦', roles: ['chargeOperation', 'backOffice'],
    vues: [
      { cle: 'a-commander', libelle: 'À commander' },
      { cle: 'suivi-logistique', libelle: 'Suivi logistique' },
      { cle: 'receptions-7j', libelle: 'Réceptions sous 7 jours' },
      { cle: 'livraisons-retard', libelle: 'Livraisons en retard' },
    ],
    champs: ['fournisseur', 'chantier', 'livraison prevue', 'ref. commande'],
  },
  sav: {
    titre: 'Tickets SAV', emoji: '🚨', roles: ['chargeOperation', 'backOffice', 'poseur'], seulementMoi: ['poseur'],
    vues: [
      { cle: 'a-traiter', libelle: 'Urgences et tri' },
      { cle: 'planning-depannage', libelle: 'Planning dépannage' },
      { cle: 'mes-tickets', libelle: 'Mes tickets' },
    ],
    champs: ['severite', 'installation', 'borne', 'symptome'],
  },
  maintenance: {
    titre: 'Visites de maintenance', emoji: '🔧', roles: ['chargeOperation', 'backOffice', 'poseur'], seulementMoi: ['poseur'],
    vues: [{ cle: 'j-30', libelle: 'À préparer (J-30)' }, { cle: 'mes-visites', libelle: 'Mes visites' }], champs: ['date de rdv', 'echeance', 'technicien', 'borne'],
  },
  factures: {
    titre: 'Factures clients', emoji: '💰', roles: ['backOffice'],
    vues: [{ cle: 'retard', libelle: 'À relancer' }, { cle: 'ouvertes', libelle: 'Non réglées' }],
    champs: ['type de piece', 'montant ht', "date d'echeance", 'facture costructor'],
    etiquettes: { "date d'echeance": 'Paiement dû le' },
    libelleEcheance: 'Relance le',
    totaux: [{ mot: 'montant ht', libelle: 'Montant HT' }],
    note: 'Costructor fait référence pour les montants et les règlements. À relancer : la date de relance (J+3, J+10, J+15) est arrivée, le règlement est revérifié dans Costructor chaque matin. Non réglées : à émettre, émises, partiellement payées ou en litige ; Tous ajoute les payées et les annulées.',
  },
  achats: {
    titre: 'Achats fournisseurs', emoji: '🧾', roles: ['backOffice', 'chargeOperation'],
    vues: [
      { cle: 'a-valider', libelle: 'À valider' },
      { cle: 'en-cours', libelle: 'Commandés et reçus' },
    ],
    champs: ['fournisseur', 'montant ht', 'echeance de paiement', 'chantier'],
    totaux: [
      { mot: 'montant ht', libelle: 'Engagé HT' },
      { mot: 'ttc a payer', libelle: 'TTC à payer' },
      { mot: 'deja paye', libelle: 'Déjà payé TTC' },
    ],
    note: 'La dépense : montant engagé, facture fournisseur, paiement. La livraison se suit dans Matériel et commandes.',
  },
  advenir: {
    titre: 'Aides ADVENIR', emoji: '📄', roles: ['backOffice', 'commercial'],
    vues: [
      { cle: 'alertes', libelle: 'Alertes délais (30 j)' },
      { cle: 'suivi', libelle: 'Suivi des dossiers' },
      { cle: 'a-encaisser', libelle: 'Primes à encaisser' },
    ],
    champs: ['date limite', 'prime estime', 'prime reel', 'offre advenir'],
    totaux: [
      { mot: 'prime estime', libelle: 'Primes estimées' },
      { mot: 'prime reel', libelle: 'Primes réelles' },
    ],
  },
  parc: {
    titre: 'Parc installé', emoji: '🔋', roles: ['chargeOperation', 'backOffice', 'commercial'],
    vues: [
      { cle: 'tous', libelle: 'Base du Parc' },
      { cle: 'contrats', libelle: 'Contrats à renouveler' },
      { cle: 'supervision', libelle: 'Abonnements de supervision' },
    ],
    champs: ['type de contrat', 'echeance annuelle', 'modele', 'nb points', 'abonnement supervision'],
  },
  rh: {
    titre: 'Demandes RH', emoji: '☕', roles: ['backOffice'],
    vues: [{ cle: 'demandes', libelle: 'Demandes à traiter' }], champs: ['type', 'salarie', 'date'],
  },
  salaries: {
    titre: 'Salariés', emoji: '👥', roles: ['backOffice'],
    vues: [
      { cle: 'a-suivre', libelle: 'À suivre' },
      { cle: 'mouvements', libelle: 'Arrivées et départs' },
      { cle: 'habilitations', libelle: 'Habilitations à recycler (60 j)' },
      { cle: 'presents', libelle: 'Effectif' },
    ],
    champs: ['poste', 'type de contrat', "date d'entree", 'expiration habilitation'],
    creer: { libelle: '+ Salarié', href: '/interne/creer/salarie' },
    note: 'Une personne = une fiche, de son arrivée à son départ. Données RH : visibles du back-office et de la direction seulement.',
  },
  recrutement: {
    titre: 'Recrutement installateurs', emoji: '👷', roles: ['backOffice'],
    vues: [
      { cle: 'a-traiter', libelle: 'Candidatures reçues' },
      { cle: 'pipeline', libelle: 'Pipeline' },
    ],
    champs: ['poste', 'disponibilite', 'telephone', 'habilitation'],
    creer: { libelle: '+ Candidat', href: '/interne/creer/candidat' },
    note: 'Les candidatures de chargeo.fr/recrutement arrivent ici. Un candidat répond sous 48 h ou il est perdu.',
  },
  codir: { titre: 'Réunions CODIR', emoji: '🗣️', roles: [], vues: [{ cle: 'a-venir', libelle: 'À venir' }], champs: ['date', 'participants'] },
  okr: { titre: 'Stratégie et OKR', emoji: '🎯', roles: [], vues: [{ cle: 'en-cours', libelle: 'En cours' }], champs: ['objectif', 'progres', 'trimestre'] },
  kaizen: {
    titre: 'Kaizen', emoji: '💡', roles: ['commercial', 'chargeOperation', 'backOffice', 'poseur'],
    vues: [{ cle: 'a-trier', libelle: 'À trier' }], champs: ['impact', 'service', 'auteur'],
  },
  todo: { titre: 'To-Do', emoji: '📝', roles: [], vues: [{ cle: 'en-retard', libelle: 'En retard' }], champs: [] },
};

export const SOURCES_LISTE = Object.keys(CONFIG_LISTES) as SourceListe[];
export const estSourceListe = (s: unknown): s is SourceListe => SOURCES_LISTE.includes(s as SourceListe);
export const idListe = (s: SourceListe): string => LISTES[s];
export const filtreDe = (s: SourceListe, vue: string): Filtre | null => FILTRES[s]?.[vue] || null;

export function peutLire(s: SourceListe, roles: string[]): boolean {
  if (roles.includes('direction')) return true;
  return CONFIG_LISTES[s].roles.some((r) => roles.includes(r));
}

// L'installateur (sans autre rôle qui lit la liste) ne voit que ses tâches
export function seulementMoi(s: SourceListe, roles: string[]): boolean {
  if (roles.includes('direction')) return false;
  const c = CONFIG_LISTES[s];
  const autres = c.roles.filter((r) => !(c.seulementMoi || []).includes(r));
  return !autres.some((r) => roles.includes(r)) && (c.seulementMoi || []).some((r) => roles.includes(r));
}

// Source d'une liste ClickUp par son identifiant (fiche générique)
export const sourceDeListe = (listId: string): SourceListe | null => SOURCES_LISTE.find((s) => LISTES[s] === String(listId)) || null;

export const lienListe = (s: SourceListe, vue?: string) => `/interne/liste/${s}${vue ? `?vue=${encodeURIComponent(vue)}` : ''}`;
