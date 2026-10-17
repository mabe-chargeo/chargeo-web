// Ressources de l'application, par rôle (17/10/2026, 17 h 03, Matthieu : « chaque rôle a besoin de ses propres
// ressources, le commercial ses propres ressources, l'installateur a besoin des manuels et des notices des bornes que l'on
// installe et des normes »). Chaque ressource ouvre un dossier des drives partagés CHARGéO (arborescence v12 du
// 01/10/2026, skill Archiviste Drive) dans Google Drive. Les droits restent ceux du Drive : qui lit quoi est réglé dans
// Google Drive (les poseurs lisent 02_CHANTIERS_SAV, jamais les prix d'achat de 03_BACK_OFFICE).
// Identifiants des dossiers relus le 17/10/2026 dans Google Drive.
// Fichier pur : utilisable côté téléphone comme côté serveur.
import type { RoleAppli } from '@/lib/menusAppli';

export type Ressource = { cle: string; emoji: string; libelle: string; description: string; dossier: string; drive: string };

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

// Dossiers partagés par plusieurs rôles
const FABRICANTS: Ressource = { cle: 'fabricants', emoji: '🔌', libelle: 'Notices et manuels des bornes', description: 'Une marque par dossier : notices d’installation, manuels d’utilisation, fiches techniques, plans', dossier: '1-K7l8LJVLhy28FLc-B-tBgOjRBsYaLOR', drive: CHA };
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
