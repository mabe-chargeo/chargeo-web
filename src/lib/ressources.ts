// Ressources de l'application, par rôle (17/10/2026, 17 h 03, Matthieu : « chaque rôle a besoin de ses propres
// ressources, le commercial ses propres ressources, l'installateur a besoin des manuels et des notices des bornes que l'on
// installe et des normes »). Chaque ressource ouvre un dossier des drives partagés CHARGéO (arborescence v12 du
// 01/10/2026, skill Archiviste Drive) dans Google Drive. Les droits restent ceux du Drive : qui lit quoi est réglé dans
// Google Drive (les poseurs lisent 02_CHANTIERS_SAV, jamais les prix d'achat de 03_BACK_OFFICE).
// Identifiants des dossiers relus le 17/10/2026 dans Google Drive.
// 17/10/2026, 17 h 14 (Matthieu : « une carte par marque, ce serait génial ») : Notices et manuels montre un bouton par
// dossier marque de 01_FABRICANTS (34 dossiers relus le 17/10), rangés en Bornes / Supervision et logiciels / Matériel,
// mesure et outillage. YES55 n'est pas repris (doublon probable de YESSS, à vérifier). Une marque créée plus tard
// depuis 00_MODELE_MARQUE est ajoutée ici ; en attendant, « Toutes les marques » ouvre le dossier entier.
// Fichier pur : utilisable côté téléphone comme côté serveur.
import type { RoleAppli } from '@/lib/menusAppli';

export type Marque = { nom: string; dossier: string };
export type GroupeMarques = { libelle: string; marques: Marque[] };
export type Ressource = { cle: string; emoji: string; libelle: string; description: string; dossier: string; drive: string; marques?: GroupeMarques[] };

// Drives partagés (racines)
export const DRIVES = {
  commercial: { id: '0AObbtiDGAa-1Uk9PVA', nom: '01_COMMERCIAL' },
  chantiers: { id: '0ACtgzthufNxiUk9PVA', nom: '02_CHANTIERS_SAV' },
  backOffice: { id: '0AAgXtEPWqtRyUk9PVA', nom: '03_BACK_OFFICE' },
  direction: { id: '0AIrCCwDenOgSUk9PVA', nom: '04_DIRECTION' },
};

export const lienDossier = (id: string) => `https://drive.google.com/drive/folders/${id}`;

const COM = DRIVES.commercial.nom;
const CHA = DRIVES.chantiers.nom;
const BO = DRIVES.backOffice.nom;
const DIR = DRIVES.direction.nom;

// Dossiers marque de 02_CHANTIERS_SAV/01_FABRICANTS (chacun : notices d'installation, manuels d'utilisation, fiches
// techniques, plans)
export const GROUPES_MARQUES: GroupeMarques[] = [
  {
    libelle: 'Bornes',
    marques: [
      { nom: 'Alfen', dossier: '1oy1rU7jqVNdBqOYmxsijR-ehHZGR_MA1' },
      { nom: 'Autel', dossier: '1-cdPYI0E72PewoN9GewAj93VeYQ1Qj_m' },
      { nom: 'Circontrol', dossier: '1lDiiRXStK0ffu-5KVicYoEObaBV0sYab' },
      { nom: 'Circutor', dossier: '1Mjkt_crUDt5g9NM31YN2L52z0O_3B3Ve' },
      { nom: 'Daze', dossier: '1EYT14OgO8jCUTK_NxU8TAW2m8zmwNTvY' },
      { nom: 'Hager', dossier: '1DA3XA_RPcl0esKnWybyCQPbvc20lDskO' },
      { nom: 'Legrand', dossier: '11y9apS8EeD7sFqRIMuthfjxhRkUYTgWd' },
      { nom: 'Peblar', dossier: '1Z5trlPxWjgfKM9C4wk5mp4RhJKu8KSWc' },
      { nom: 'Schneider', dossier: '1NwEUkNIKb0e0_O_LSfzf2RgUX2A9CTeN' },
      { nom: 'Smappee', dossier: '1cNUZjld8MP5zEbBSRKss0kALtpxYA9NK' },
      { nom: 'V2C', dossier: '1EqUt1FyZNjGUCbSjFx89T4-CzfrYgZ2x' },
      { nom: 'Wallbox', dossier: '11WJ3CPp8vuqMwaQepw4Qey5TcXhnFyJa' },
    ],
  },
  {
    libelle: 'Supervision et logiciels',
    marques: [
      { nom: 'Charge Unix', dossier: '12gTCqDCBd20blB4cg8lK3U08qoImhjtC' },
      { nom: 'ChargeAngels', dossier: '1UXOBFr_1K-uH3ZzVI6qmLAe6JS-Xyelc' },
      { nom: 'Chargekeeper', dossier: '1dSgAe0CRrvFMX-lzOK2V1E6q02BVhvOO' },
      { nom: 'Chargemap', dossier: '1_bwgD_89Ef1yehkNrdKoRwTnPGqrTPGv' },
      { nom: 'eTotem', dossier: '1lTZc-JZK_cOmhsaruxz2AiZ0_pO8lSDS' },
      { nom: 'Freshmile', dossier: '1tmUIMYKcuh3yjYY577fQCoNPEi3IJ8GL' },
      { nom: 'MobilyGreen', dossier: '1ulU_x9Tt6G4RmHSPnxE3kFtFvyIMtj2G' },
      { nom: 'Monta', dossier: '1SgMDEGPppoJmCKlDeLr3DgB7rJe1SYhi' },
      { nom: 'Sharvy', dossier: '1VL93cDyEr6V4VnTKGlOVQdaTRW6b0jBo' },
      { nom: 'Trace Software', dossier: '1ai0cAKaRSgqKeqRIw83TcJTlHdp2z4gL' },
      { nom: 'Virta', dossier: '1TbwQ5wph1AFq2rqhq72GFXQjF7zP6h7W' },
      { nom: 'WattzHub', dossier: '1txeuPq-xgQ-_pe6Hun5Zbnz78HouzEzF' },
    ],
  },
  {
    libelle: 'Matériel, mesure et outillage',
    marques: [
      { nom: 'Digital Electric', dossier: '1Qslk7f2SVe6MPeUpx4JGf5noYNOlBolK' },
      { nom: 'Eastron', dossier: '1f2EFpt9xj9er1fvEmR-oS9PmTTBQ-0X9' },
      { nom: 'Gewiss', dossier: '1okF2n9JOWJpiBjrse8toXke9GxQyDXyk' },
      { nom: 'Michaud', dossier: '1dP_gVN1nQSaua13FXJQRYESMcQqBmsgs' },
      { nom: 'Milwaukee', dossier: '1Txr9Xe_oqvGoFLA9zdz4MnwnWPEwKPw8' },
      { nom: 'Sefram', dossier: '1YDiWmiIK0BUSMqT_8hu6S0EjHLoFxlk4' },
      { nom: 'Teltonika', dossier: '1aAE5rgQafFLf-HM0Iqoh4mUP_HtuHSKB' },
      { nom: 'Wago', dossier: '1XpYp60hHc2IWS6BnGrqrNBUu0LoCclY6' },
      { nom: 'Yesss', dossier: '1SHmpRjRWXnz0HG_34ziCKKdrUx6Ee6iv' },
    ],
  },
];

// Dossiers partagés par plusieurs rôles
const FABRICANTS: Ressource = { cle: 'fabricants', emoji: '🔌', libelle: 'Notices et manuels', description: 'Une marque par dossier : notices d’installation, manuels d’utilisation, fiches techniques, plans', dossier: '1-K7l8LJVLhy28FLc-B-tBgOjRBsYaLOR', drive: CHA, marques: GROUPES_MARQUES };
const NORMES: Ressource = { cle: 'normes', emoji: '📐', libelle: 'Normes et réglementation', description: 'NF C 15-100, guide UTE C 15-722, Consuel, Qualifelec, Enedis, bureaux de contrôle', dossier: '1MSlnVv9IQ-F3H3P_S_rXZsqmkxeYwnZ7', drive: CHA };
const MODELES_CHANTIER: Ressource = { cle: 'modeles-chantier', emoji: '📋', libelle: 'Modèles de chantier', description: 'PV de réception, autocontrôle avant mise en service, plan de prévention (vierges)', dossier: '1Qi5ciPHIhogrfsYhJuHICMUp-gbHFLHp', drive: CHA };
const MAINTENANCE: Ressource = { cle: 'maintenance', emoji: '🔧', libelle: 'Maintenance et SAV', description: 'Gammes de maintenance par type de borne, modèle de rapport d’intervention', dossier: '1ehnntFZrm4f8WJcMyduaylikoXkdXML-', drive: CHA };
const SECURITE: Ressource = { cle: 'securite', emoji: '🦺', libelle: 'Sécurité et outillage', description: 'Consignes (consignation, hauteur), EPI, listing d’outillage, vérifications périodiques', dossier: '1BRuHe4rzERcr0GPt3SBoNEEGmpq0Uuwl', drive: CHA };
const AIDES: Ressource = { cle: 'aides', emoji: '📄', libelle: 'Règles des aides (ADVENIR)', description: 'Guides et barèmes officiels des programmes d’aide', dossier: '1imsqJeHIiXkyR-oIz8RMiDmlYI4DTA_S', drive: CHA };

export const RESSOURCES: Record<RoleAppli, Ressource[]> = {
  // Ce que le commercial remet au client et ce qui l'aide à vendre (01_COMMERCIAL)
  commercial: [
    { cle: 'supports', emoji: '📕', libelle: 'Supports de vente', description: 'Brochures et fiches produits par segment (RES, DAP, COP, PAR, FLT, TER), offres maintenance et supervision, présentations', dossier: '1y7lbLvJfVBNxkigQtQfk5olbBQFBOxWA', drive: COM },
    { cle: 'fiches-advenir', emoji: '💶', libelle: 'Fiches ADVENIR client', description: 'Fiches qui expliquent les aides et le reste à charge au client', dossier: '1kfCgfUmKYs1y1f7R7XNtadbRyPQqg_rZ', drive: COM },
    { cle: 'simulateurs', emoji: '🧮', libelle: 'Simulateurs', description: 'Rentabilité IRVE, calcul des aides (ADVENIR, réserve IRVE)', dossier: '1uBIYwEJQE5j4zYAwqMKF0Naxu4BpWg0J', drive: COM },
    { cle: 'documents-types', emoji: '📝', libelle: 'Documents types', description: 'Conventions copro, mandats et résolutions d’AG, mails types (rendez-vous, envoi de devis, relance)', dossier: '1b4_dCDji6dzFyyhfyJrksTKYQTrgXAcV', drive: COM },
    { cle: 'bases-contacts', emoji: '👥', libelle: 'Bases de contacts', description: 'Listes de prospection actives et exports', dossier: '1B_sSB7rkbt6KORppNCVk1fc6kp4XyJXk', drive: COM },
    { cle: 'references', emoji: '🏆', libelle: 'Références', description: 'Photos de réalisations sélectionnées et témoignages clients', dossier: '1KnsqwIkdWVAr0nEi1rvAyZgkellklzlh', drive: COM },
    { cle: 'veille', emoji: '🔎', libelle: 'Veille et marché', description: 'Concurrents (devis, brochures, tarifs publics), personas, études de marché', dossier: '1CoqNDvliwoXB9BQHZI0yJA605Tx61feW', drive: COM },
  ],
  // Le chef de chantier prépare, pose et fait valider (02_CHANTIERS_SAV)
  chargeOperation: [
    FABRICANTS,
    NORMES,
    AIDES,
    { cle: 'modeles-operations', emoji: '🗂️', libelle: 'Modèles d’opérations', description: 'Dossiers ADVENIR (formulaires, listes de pièces), chantier, maintenance et SAV', dossier: '1AblqXGpf5qbOg_QtnPj0MoUZ5WlVnNnh', drive: CHA },
    MODELES_CHANTIER,
    MAINTENANCE,
    SECURITE,
  ],
  // L'installateur sur le terrain : notices des bornes et normes d'abord (02_CHANTIERS_SAV)
  poseur: [FABRICANTS, NORMES, MODELES_CHANTIER, MAINTENANCE, SECURITE],
  // Le back-office : administratif, achats, comptabilité (03_BACK_OFFICE)
  backOffice: [
    { cle: 'dossier-entreprise', emoji: '🏢', libelle: 'Dossier entreprise', description: 'Kbis, attestations URSSAF, fiscale et assurance, qualification Qualifelec, RIB', dossier: '1-yUaM686LlYTuUuSuCUiLfQYRJ3fiWtP', drive: BO },
    { cle: 'achats', emoji: '🛒', libelle: 'Achats', description: 'Tarifs, devis fournisseurs, conditions commerciales, mercuriales', dossier: '14bsY58hoojKeJCpI-GY-aoACcvLbTbyJ', drive: BO },
    { cle: 'comptabilite', emoji: '🧾', libelle: 'Comptabilité', description: 'Factures fournisseurs par année, banque, fiscal et social, expert-comptable', dossier: '1B8CAGFM1FL1QWWy2hAMqoZi9lblOK9rv', drive: BO },
    { cle: 'contrats', emoji: '📜', libelle: 'Contrats', description: 'Assurances, bail et domiciliation, partenaires et prestataires, abonnements logiciels', dossier: '1bt0fpPopirkGA9eySqWcuTAHoqtUzVfZ', drive: BO },
    AIDES,
    { cle: 'vehicules', emoji: '🚐', libelle: 'Véhicules', description: 'Cartes grises, leasing, entretien, amendes', dossier: '1QSKA15lJN0C0Z1F7CYwbMw9yQR5xqkzw', drive: BO },
    { cle: 'rh', emoji: '👔', libelle: 'Ressources humaines', description: 'Dossiers salariés, fiches de poste, règlement intérieur, livret d’accueil, DUERP', dossier: '1Z78KTYfViJQVZiubUk0iOVjCPP3bgl1y', drive: BO },
    { cle: 'marque', emoji: '🎨', libelle: 'Marque et papeterie', description: 'Logos, en-têtes, cartes de visite, signatures mail prêts à l’emploi', dossier: '1yrVx6dA2grtdqqrCzYAlVzaZb90lelVY', drive: BO },
  ],
  // La direction (04_DIRECTION)
  direction: [
    { cle: 'juridique', emoji: '⚖️', libelle: 'Juridique', description: 'Statuts, décisions d’AG, marques et noms de domaine, litiges', dossier: '1PPmnYFM4CtVItFgMrmFuv-ahrUBusCFh', drive: DIR },
    { cle: 'finance', emoji: '📈', libelle: 'Finance et stratégie', description: 'Business plan, prévisionnels, prêts, prêts d’honneur, subventions', dossier: '1fBvX_mVSoSlvCIjeqkJdyi5mVxsCR6Dr', drive: DIR },
    { cle: 'marketing', emoji: '📣', libelle: 'Marketing', description: 'Sources de la marque, charte graphique, campagnes et salons', dossier: '1IfP_xf526iHvygm0LA_U72LBOlX7l0QC', drive: DIR },
    { cle: 'projets', emoji: '🚀', libelle: 'Projets', description: 'ERP ClickUp, Costructor, site web, coffrets IRVE, franchise, véhicules, Drive', dossier: '1cfoRviW3pTSLR0mb-Ijd83A2cde6IFz6', drive: DIR },
  ],
};

// Ordre des rangées pour la direction (même ordre que son espace)
export const ORDRE_RESSOURCES: RoleAppli[] = ['commercial', 'chargeOperation', 'poseur', 'backOffice', 'direction'];
