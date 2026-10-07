// src/content/sources-guides.ts
// Sources officielles affichées en fin de guide (encadré « Sources officielles »).
// Une entrée par slug de src/content/blog.ts. Liens vérifiés le 07/10/2026.
// Règle : uniquement des sites officiels (Légifrance, Service-Public, ADVENIR, Enedis,
// DGCCRF). Si un lien casse ou si un texte change, corriger ici.

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

export const SOURCES_GUIDES: Record<string, Source[]> = {
  "vote-borne-recharge-assemblee-generale-copropriete": [LOI_1965, ENEDIS_DEMARCHES, ADVENIR],
  "prix-borne-recharge-maison-haute-savoie": [CREDIT_IMPOT, ADVENIR, DGCCRF],
  "droit-a-la-prise-copropriete-borne-recharge": [ENEDIS_DEMARCHES, ENEDIS_COPRO, ADVENIR],
  "prise-renforcee-ou-wallbox-que-choisir": [CREDIT_IMPOT, DGCCRF],
  "prime-advenir-copropriete-infrastructure-collective": [ADVENIR, LOI_1965, ENEDIS_COPRO],
};
