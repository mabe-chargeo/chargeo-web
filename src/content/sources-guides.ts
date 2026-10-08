// src/content/sources-guides.ts
// Sources officielles affichées en fin de guide (encadré « Sources officielles »).
// Une entrée par slug de src/content/blog.ts. Liens vérifiés le 07/10/2026 (guides Entreprises : 08/10/2026).
// Règle : uniquement des sites officiels (Légifrance, Service-Public, ADVENIR, Enedis,
// DGCCRF, BOFiP, Urssaf, EUR-Lex). Si un lien casse ou si un texte change, corriger ici.

export type Source = { label: string; href: string };

const LOI_1965: Source = {
  label: "Loi n° 65-557 du 10 juillet 1965 sur la copropriété (articles 24, 24-5, 24-5-1, 25 et 25-1), Légifrance",
  href: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000880200",
};
const ADVENIR: Source = {
  label: "Programme ADVENIR : qui peut bénéficier des primes",
  href: "https://advenir.mobi/beneficier-dadvenir/",
};
const ENEDIS_DEMARCHES: Source = {
  label: "Enedis : les démarches pour faire installer une borne de recharge en copropriété",
  href: "https://www.enedis.fr/demarches-borne-recharge-electrique-copropriete",
};
const ENEDIS_COPRO: Source = {
  label: "Enedis : infrastructure collective ou droit à la prise, les solutions en copropriété",
  href: "https://www.enedis.fr/installation-borne-recharge-electrique-copropriete",
};
const CREDIT_IMPOT: Source = {
  label: "Service-Public.fr : crédit d'impôt borne de recharge, supprimé pour les dépenses payées depuis le 1er janvier 2026",
  href: "https://www.service-public.gouv.fr/particuliers/vosdroits/F35578",
};
const DGCCRF: Source = {
  label: "DGCCRF : ce qu'il faut vérifier avant de signer un contrat d'installation de borne",
  href: "https://www.economie.gouv.fr/dgccrf/laction-de-la-dgccrf/les-enquetes-et-les-controles/voitures-electriques-attention-aux-contrats-dinstallation-de-bornes-electriques",
};
const TAI_LOI: Source = {
  label: "Code des impositions sur les biens et services, art. L421-132-4 : objectifs de la taxe annuelle incitative, Légifrance",
  href: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053545030/2026-08-02",
};
const TAI_BOFIP: Source = {
  label: "BOFiP : taxe annuelle incitative relative à l'acquisition de véhicules légers à faibles émissions",
  href: "https://bofip.impots.gouv.fr/bofip/14720-PGP.html/identifiant=BOI-AIS-MOB-10-30-40-20260225",
};
const URSSAF_AVANTAGES: Source = {
  label: "Urssaf : avantages en nature, véhicule électrique et borne de recharge",
  href: "https://www.urssaf.fr/accueil/employeur/cotisations/avantages-en-nature.html",
};
const FMD: Source = {
  label: "Entreprendre.Service-Public.fr : forfait mobilités durables",
  href: "https://entreprendre.service-public.fr/vosdroits/F33808",
};
const PARKINGS_NON_RESIDENTIELS: Source = {
  label: "Entreprendre.Service-Public.fr : bornes de recharge dans les parkings des bâtiments non résidentiels",
  href: "https://entreprendre.service-public.fr/vosdroits/F38491",
};
const CCH_L113_13: Source = {
  label: "Code de la construction et de l'habitation, art. L113-13 : parkings non résidentiels existants, Légifrance",
  href: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041563731/2021-07-01",
};
const AFIR: Source = {
  label: "Règlement (UE) 2023/1804 (AFIR), article 5 : paiement et prix des bornes ouvertes au public, EUR-Lex",
  href: "https://eur-lex.europa.eu/eli/reg/2023/1804/oj",
};

export const SOURCES_GUIDES: Record<string, Source[]> = {
  "vote-borne-recharge-assemblee-generale-copropriete": [LOI_1965, ENEDIS_DEMARCHES, ADVENIR],
  "prix-borne-recharge-maison-haute-savoie": [CREDIT_IMPOT, ADVENIR, DGCCRF],
  "droit-a-la-prise-copropriete-borne-recharge": [ENEDIS_DEMARCHES, ENEDIS_COPRO, ADVENIR],
  "prise-renforcee-ou-wallbox-que-choisir": [CREDIT_IMPOT, DGCCRF],
  "prime-advenir-copropriete-infrastructure-collective": [ADVENIR, LOI_1965, ENEDIS_COPRO],
  "flotte-entreprise-vehicules-electriques-taxe-incitative-2026": [TAI_LOI, TAI_BOFIP, URSSAF_AVANTAGES, ADVENIR],
  "recharge-salaries-borne-domicile-travail-urssaf": [URSSAF_AVANTAGES, FMD],
  "borne-recharge-parking-hotel-commerce-obligations": [PARKINGS_NON_RESIDENTIELS, CCH_L113_13, AFIR],
};
