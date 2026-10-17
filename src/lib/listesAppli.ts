// Écrans de liste de l'application (lot « écrans qui manquent », lancé par Matthieu le 17/10/2026 à 14 h 28 : « on crée
// tout d'un coup au fur et à mesure »). Un seul moteur pour toutes les listes ClickUp qui s'ouvraient encore dans ClickUp :
// Commandes, SAV, Maintenance, Factures, Achats, ADVENIR, Parc, RH, CODIR, OKR, Kaizen, To-Do.
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
    vues: [{ cle: 'retard', libelle: 'En retard' }, { cle: 'ouvertes', libelle: 'À suivre' }], champs: ['type de piece', 'montant ht', 'echeance', 'n costructor'],
    note: 'Costructor fait référence pour les montants et les règlements. Les pastilles de statut donnent le pipeline de facturation.',
  },
  achats: {
    titre: 'Achats fournisseurs', emoji: '🧾', roles: ['backOffice', 'chargeOperation'],
    vues: [
      { cle: 'a-valider', libelle: 'À valider' },
      { cle: 'en-cours', libelle: 'Commandés et reçus' },
    ],
    champs: ['fournisseur', 'montant ht', 'echeance de paiement', 'chantier'],
    note: 'La dépense : montant engagé, facture fournisseur, paiement. La livraison se suit dans Matériel et commandes.',
  },
  advenir: {
    titre: 'Aides ADVENIR', emoji: '📄', roles: ['backOffice', 'commercial'],
    vues: [
      { cle: 'alertes', libelle: 'Alertes délais (30 j)' },
      { cle: 'suivi', libelle: 'Suivi des dossiers' },
      { cle: 'a-encaisser', libelle: 'Primes à encaisser' },
    ],
    champs: ['date limite', 'prime estimee', 'prime reelle', 'numero'],
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
    titre: 'RH et recrutement', emoji: '👔', roles: ['backOffice'],
    vues: [{ cle: 'demandes', libelle: 'Demandes à traiter' }], champs: ['type', 'salarie', 'date'],
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
