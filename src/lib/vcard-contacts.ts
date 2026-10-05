/**
 * Fiches contact (vCard) servies sur chargeo.fr/vcard/<identifiant>
 * ------------------------------------------------------------------
 * Pour modifier une fiche : change simplement les valeurs entre guillemets,
 * puis valide la modification. Le QR code des cartes de visite n'a pas
 * besoin d'être réimprimé : il pointe toujours vers la même adresse.
 *
 * Pour ajouter une personne (ex : un poseur), copie le bloc "mathieu",
 * change l'identifiant (ex : "julien") et ses infos. Sa fiche sera alors
 * disponible sur chargeo.fr/vcard/julien.
 */

export type VCardContact = {
  prenom: string;
  nom: string;
  fonction: string;
  entreprise: string;
  mobile?: string; // format international : +33...
  fixe?: string;
  email?: string;
  site?: string;
  adresse?: { rue: string; codePostal: string; ville: string; pays: string };
  note?: string;
};

const MATHIEU: VCardContact = {
  prenom: "Mathieu",
  nom: "BELENGRI",
  fonction: "Fondateur",
  entreprise: "CHARGéO",
  mobile: "+33669253839",
  fixe: "+33485692204",
  email: "mabe@chargeo.fr",
  site: "https://chargeo.fr",
  adresse: {
    rue: "89 chemin de la Ballastière",
    codePostal: "74200",
    ville: "Thonon-les-Bains",
    pays: "France",
  },
  note: "Installateur de bornes de recharge · Chablais · Haute-Savoie",
};

export const VCARD_CONTACTS: Record<string, VCardContact> = {
  mathieu: MATHIEU,
  // Ancienne adresse (orthographe erronee « Matthieu », en ligne le 05/10/2026
  // au matin) : conservee pour qu'un lien deja partage ne tombe pas en 404.
  matthieu: MATHIEU,
};
