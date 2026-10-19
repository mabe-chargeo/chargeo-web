// Suivi des commandes de matériel et des dossiers ADVENIR depuis l'application (19/10/2026, 11 h 03, maquette
// MAQUETTE_SUIVI-COMMANDE-ADVENIR_2026-10-19_v2.png validée par Matthieu : « OK pour la maquette, mais dans l'idée il
// faut au maximum que tu réutilises des composants existants »). Demandé à 10 h 46 : « l'appli CHARGéO ne me permet pas
// de mettre à jour quoi que ce soit […] il faut que je puisse agir depuis l'application ».
// Mêmes deux cartes que la fiche affaire en vente (src/components/ui/Vente.tsx) : « La commande » / « Le dossier »
// (champs + Enregistrer, comme « Le projet ») et « Suite de la commande » / « Suite du dossier » (statut actuel + bouton
// de l'étape, comme « Suite de la vente »). Ce fichier décrit les champs, les étapes et leurs boutons ; la route
// /api/interne/suivi lit et écrit, src/components/ui/Suivi.tsx affiche.
// Fichier pur (aucun accès réseau) : utilisable côté téléphone comme côté serveur.

export type SourceSuivi = 'commandes' | 'advenir';
export type GenreChamp = 'texte' | 'date' | 'nombre' | 'url' | 'choix';
export type DefChamp = { cle: string; id: string; mot: string; libelle: string; genre: GenreChamp; exemple?: string; etats?: string[] };
export type DefAction = { cible: string; libelle: string; principal?: boolean; confirmer?: string; exige?: string[]; valide?: boolean };
export type DefSuivi = {
  source: SourceSuivi;
  titre: string;
  titreSuite: string;
  enregistrer: string;
  enregistre: string;
  close: string;
  roles: string[];
  champs: DefChamp[];
  etat: (statutSansAccent: string) => string;
  actions: Record<string, DefAction[]>;
  fermes: string[];
};

// 👤 Validé par (Commandes Matériel) : l'achat validé par la direction avant « commandé » (même règle que le garde-fou
// de la liste, qui renvoie la commande en « à commander » sans validation)
export const VALIDE_PAR = { id: '85d92954-e954-451c-bb14-405ba83de4f4', mot: 'valide par' };
// 📎 Bon de livraison (Commandes Matériel) : photo jointe depuis la confirmation « Reçu / vérifié » (maquette v2), une fois
// la commande passée ; montrée ensuite dans la carte Documents de la fiche (src/lib/ficheGabarit.ts)
export const BON_LIVRAISON = { id: '1606d8d7-265a-477a-800c-387c6bf611c9', mot: 'bon de livraison' };
export const ETATS_BON_LIVRAISON = ['commande', 'en-livraison', 'recu'];

// Commandes Matériel (statuts relus le 17/10 : à commander, commandé, en livraison, reçu / vérifié, annulé)
const etatCommande = (s: string) =>
  s.includes('a commander') ? 'a-commander'
    : s.includes('livraison') ? 'en-livraison'
      : s.includes('recu') ? 'recu'
        : s.includes('annul') ? 'annule'
          : s.includes('command') ? 'commande' : '';
const ANNULER_COMMANDE: DefAction = { cible: 'annule', libelle: 'Annuler la commande', confirmer: 'Annuler cette commande ? Elle sort du suivi logistique.' };
const RECU: Omit<DefAction, 'principal'> = { cible: 'recu', libelle: '📦 Reçu / vérifié', confirmer: 'Matériel reçu et vérifié ? La commande sort des Livraisons en retard. Photo du bon de livraison si tu l’as.' };

// Dossiers Advenir (statuts relus le 18/10 : à réserver, offre émise, prime réservée, chantier en cours, collecte pièces,
// dossier final soumis, en révision, validé, prime payée, annulé / expiré, dossier archivé)
const etatAdvenir = (s: string) =>
  s.includes('a reserver') ? 'a-reserver'
    : s.includes('offre') ? 'offre'
      : s.includes('reserv') ? 'reservee'
        : s.includes('chantier') ? 'chantier'
          : s.includes('collecte') ? 'collecte'
            : s.includes('soumis') ? 'soumis'
              : s.includes('revision') ? 'revision'
                : s.includes('payee') ? 'payee'
                  : s.includes('valide') ? 'valide'
                    : s.includes('annul') || s.includes('expire') ? 'annule'
                      : s.includes('archiv') ? 'archive' : '';
const ANNULER_DOSSIER: DefAction = { cible: 'annule', libelle: '❌ Annulé / expiré', confirmer: 'Dossier annulé ou expiré ? Il sort du suivi des aides.' };
const APRES_SOUMISSION = ['soumis', 'revision', 'valide', 'payee'];

export const SUIVIS: Record<SourceSuivi, DefSuivi> = {
  commandes: {
    source: 'commandes',
    titre: 'La commande',
    titreSuite: 'Suite de la commande',
    enregistrer: 'Enregistrer la commande',
    enregistre: 'Commande enregistrée.',
    close: 'Commande close.',
    // Chef de chantier (logistique), back-office et direction ; la validation de l'achat : direction
    roles: ['direction', 'chargeOperation', 'backOffice'],
    champs: [
      { cle: 'fournisseur', id: '351b2b1d-e512-422f-b4b8-19549646f80e', mot: 'fournisseur', libelle: 'Fournisseur', genre: 'choix' },
      { cle: 'ref', id: '8cdc86e0-071e-4e97-be58-285790d431d8', mot: 'ref. commande', libelle: 'Réf. commande', genre: 'texte', exemple: 'Ex : CDE-2026-0412' },
      { cle: 'livraison', id: '9ae59be1-e0c3-4a1c-93de-d3a66838b5d8', mot: 'livraison prevue', libelle: 'Date de livraison prévue', genre: 'date' },
      { cle: 'suivi', id: '492cc31e-a9c1-42d0-a42c-60944144e263', mot: 'lien suivi', libelle: 'Lien de suivi', genre: 'url', exemple: 'https://…' },
    ],
    etat: etatCommande,
    actions: {
      'a-commander': [{ cible: 'commande', libelle: '🛒 Commandé', principal: true, exige: ['livraison'], valide: true }, ANNULER_COMMANDE],
      commande: [{ cible: 'en-livraison', libelle: '🚚 En livraison', principal: true }, RECU, ANNULER_COMMANDE],
      'en-livraison': [{ ...RECU, principal: true }, ANNULER_COMMANDE],
    },
    fermes: ['recu', 'annule'],
  },
  advenir: {
    source: 'advenir',
    titre: 'Le dossier',
    titreSuite: 'Suite du dossier',
    enregistrer: 'Enregistrer le dossier',
    enregistre: 'Dossier enregistré.',
    close: 'Dossier clos.',
    roles: ['direction', 'backOffice'],
    champs: [
      { cle: 'offre', id: '42407a5b-d4e3-4a2e-bf0e-17f51993d816', mot: 'offre advenir', libelle: 'N° offre ADVENIR', genre: 'texte' },
      { cle: 'estimee', id: 'aab83c62-b44f-4796-9582-e6332c026e51', mot: 'prime estim', libelle: 'Prime estimée (€)', genre: 'nombre' },
      { cle: 'limite', id: 'b7be95a5-2869-46a8-ad73-c08a3d318ff8', mot: 'date limite', libelle: 'Date limite de réalisation', genre: 'date' },
      { cle: 'final', id: 'dfb3d496-edf2-4091-94e8-4208e559f837', mot: 'dossier final', libelle: 'N° dossier final', genre: 'texte', etats: ['collecte', ...APRES_SOUMISSION] },
      { cle: 'reelle', id: '4d27b6ba-1240-48b2-9478-72f78ffccf3b', mot: 'prime reel', libelle: 'Prime réelle (€)', genre: 'nombre', etats: APRES_SOUMISSION },
    ],
    etat: etatAdvenir,
    actions: {
      'a-reserver': [{ cible: 'offre', libelle: '⏳ Offre émise', principal: true, exige: ['offre', 'limite'] }, ANNULER_DOSSIER],
      offre: [{ cible: 'reservee', libelle: '✅ Prime réservée', principal: true }, ANNULER_DOSSIER],
      reservee: [{ cible: 'chantier', libelle: '🏗️ Chantier en cours', principal: true }, ANNULER_DOSSIER],
      chantier: [{ cible: 'collecte', libelle: '📂 Collecte des pièces', principal: true }, ANNULER_DOSSIER],
      collecte: [{ cible: 'soumis', libelle: '📤 Dossier final soumis', principal: true, exige: ['final'] }, ANNULER_DOSSIER],
      soumis: [
        { cible: 'valide', libelle: '🎉 Validé', principal: true, confirmer: 'Dossier validé par ADVENIR ? La prime passe dans « Primes à encaisser ».' },
        { cible: 'revision', libelle: '🧐 En révision' },
        ANNULER_DOSSIER,
      ],
      revision: [{ cible: 'soumis', libelle: '📤 Dossier renvoyé', principal: true }, ANNULER_DOSSIER],
      valide: [{ cible: 'payee', libelle: '💰 Prime payée', principal: true, exige: ['reelle'], confirmer: 'Prime reçue sur le compte ?' }],
    },
    fermes: ['payee', 'annule', 'archive'],
  },
};

export const suiviDe = (source: string | undefined): DefSuivi | null => (source && source in SUIVIS ? SUIVIS[source as SourceSuivi] : null);
export const rolesSuivi = (source: string | undefined): string[] => suiviDe(source)?.roles || [];
// Champs repris dans les cartes de suivi : retirés de la carte Détails de la fiche
export const CHAMPS_SUIVI: string[] = [...SUIVIS.commandes.champs, ...SUIVIS.advenir.champs].map((c) => c.id).concat(VALIDE_PAR.id);
