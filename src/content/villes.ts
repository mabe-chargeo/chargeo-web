// src/content/villes.ts
// Pages « Zone d'intervention » (07/10/2026, SEO local). Une fiche par commune.
//
// REGLE (politique Google contre les pages satellites) : chaque page doit rester
// vraiment utile et differente des autres. On n'ajoute pas une ville en copiant une
// fiche et en changeant le nom : il faut de vrais chiffres locaux, des conseils
// propres a la commune et des sources. Chiffres verifies le 07/10/2026 sur l'Insee,
// le Syane et les sites des intercommunalites. Si une donnee change, corriger ici.
// Aucune aide locale dediee a la borne n'a ete trouvee : on le dit, on n'invente rien.

export type Source = { label: string; href: string };
export type Offre = "particuliers" | "copropriete" | "pro";

export type Ville = {
  slug: string;
  nom: string; // nom affiché dans le titre
  intercommunalite: string;
  population: number;
  anneePopulation: number;
  appartements: number; // % des logements
  maisons: number;
  secondaires: number; // % de résidences secondaires
  anneeLogements: number;
  km: number; // depuis notre base de Thonon, ordre de grandeur
  minutes: number;
  image: string;
  metaTitre: string;
  metaDescription: string;
  accroche: string; // sous-titre du haut de page
  enjeux: { titre: string; texte: string }[];
  rechargePublique: string;
  aidesLocales: string;
  offres: Offre[]; // dans l'ordre le plus utile pour la commune
  guides: string[]; // slugs de src/content/blog.ts
  deplacement?: string; // à préciser quand la commune est loin de Thonon
  sources: Source[];
};

const insee = (code: string, nom: string): Source[] => [
  { label: `Insee : populations légales, ${nom}`, href: `https://www.insee.fr/fr/statistiques/1405599?geo=COM-${code}` },
  { label: `Insee : dossier complet (logements), ${nom}`, href: `https://www.insee.fr/fr/statistiques/2011101?geo=COM-${code}` },
];
const FRONTALIERS_2018: Source = {
  label: "Insee : les actifs frontaliers travaillant en Suisse, par intercommunalité (2018)",
  href: "https://www.insee.fr/fr/statistiques/6444379",
};
const TRANSFRONTALIERS_2021: Source = {
  label: "Insee Analyses Auvergne-Rhône-Alpes : les transfrontaliers vers la Suisse (2021)",
  href: "https://www.insee.fr/fr/statistiques/8290738",
};
const SYANE: Source = {
  label: "Syane : la mobilité électrique et le réseau public eborn en Haute-Savoie",
  href: "https://syane.fr/energies/mobilite-electrique/",
};
const ADVENIR: Source = {
  label: "Programme ADVENIR : qui peut bénéficier des primes",
  href: "https://advenir.mobi/beneficier-dadvenir/",
};

const PAS_D_AIDE_LOCALE =
  "Nous n'avons trouvé aucune aide locale dédiée à l'installation d'une borne (vérification d'octobre 2026). En copropriété, la prime nationale ADVENIR peut financer une partie de l'infrastructure collective ; votre devis indique toujours ce qui s'applique à votre projet.";

export const villes: Ville[] = [
  {
    slug: "thonon-les-bains",
    nom: "Thonon-les-Bains",
    intercommunalite: "Thonon Agglomération",
    population: 37928,
    anneePopulation: 2023,
    appartements: 79.9,
    maisons: 19.7,
    secondaires: 8.0,
    anneeLogements: 2022,
    km: 0,
    minutes: 0,
    image: "/hero-copro.webp",
    metaTitre: "Borne de recharge à Thonon-les-Bains : maison, copropriété, entreprise | CHARGÉO",
    metaDescription:
      "À Thonon, 8 logements sur 10 sont des appartements. Droit à la prise, infrastructure de copropriété, borne à la maison : l'équipe CHARGéO, basée à Thonon, vous conseille.",
    accroche:
      "Notre équipe est basée à Thonon. Ici, 8 logements sur 10 sont des appartements : la recharge se joue le plus souvent dans un parking de copropriété.",
    enjeux: [
      {
        titre: "En appartement, le droit à la prise",
        texte:
          "79,9 % des logements de Thonon sont des appartements (Insee, 2022). Si votre immeuble a un parking, vous pouvez faire installer une borne sur votre place : c'est le droit à la prise. La copropriété ne peut s'y opposer que devant le tribunal, pour un motif sérieux et légitime. Si plusieurs résidents sont intéressés, une infrastructure collective votée en assemblée générale permet de mutualiser les travaux et peut être aidée par la prime ADVENIR.",
      },
      {
        titre: "Frontaliers : repartir chargé chaque matin",
        texte:
          "Thonon Agglomération compte 13 652 actifs qui travaillent en Suisse, soit 34,3 % des actifs (Insee, 2018). Dans le Chablais, le trajet domicile-travail des transfrontaliers fait en moyenne 43,2 km (Insee, 2021). Une borne à domicile recharge la voiture pendant la nuit, sans détour par une borne publique.",
      },
      {
        titre: "Une équipe à deux pas",
        texte:
          "Visite technique, pose, mise en service et SAV : à Thonon, tout se fait sans long déplacement. Pour une borne de copropriété ou d'entreprise, qui demande un suivi dans la durée, c'est un vrai avantage.",
      },
    ],
    rechargePublique:
      "Le réseau public de Thonon est celui du Syane, intégré au réseau eborn : Thonon Agglomération cite Thonon parmi les communes équipées. Le Syane compte 280 bornes sur le domaine public en Haute-Savoie.",
    aidesLocales: PAS_D_AIDE_LOCALE,
    offres: ["copropriete", "particuliers", "pro"],
    guides: [
      "droit-a-la-prise-copropriete-borne-recharge",
      "vote-borne-recharge-assemblee-generale-copropriete",
      "prix-borne-recharge-maison-haute-savoie",
    ],
    sources: [
      ...insee("74281", "Thonon-les-Bains"),
      FRONTALIERS_2018,
      TRANSFRONTALIERS_2021,
      SYANE,
      { label: "Thonon Agglomération : véhicules électriques et bornes publiques", href: "https://www.thononagglo.fr/89-vehicules-electriques.htm" },
    ],
  },
  {
    slug: "evian-les-bains",
    nom: "Évian-les-Bains",
    intercommunalite: "Pays d'Évian Vallée d'Abondance",
    population: 9267,
    anneePopulation: 2023,
    appartements: 84.4,
    maisons: 14.7,
    secondaires: 28.2,
    anneeLogements: 2022,
    km: 11,
    minutes: 16,
    image: "/hero-chargeo.webp",
    metaTitre: "Borne de recharge à Évian-les-Bains : installateur IRVE | CHARGÉO",
    metaDescription:
      "Résidence principale ou secondaire, appartement ou maison : CHARGéO installe votre borne de recharge à Évian-les-Bains, à 15 minutes de Thonon. Étude gratuite.",
    accroche:
      "À Évian, plus d'un logement sur quatre est une résidence secondaire. Votre borne doit fonctionner que vous soyez là ou non.",
    enjeux: [
      {
        titre: "Résidence secondaire : une borne qui se gère à distance",
        texte:
          "28,2 % des logements d'Évian sont des résidences secondaires (Insee, 2022), contre 8 % à Thonon. Si vous venez le week-end ou en saison, choisissez une borne pilotable depuis une application et protégée par badge : vous lancez la charge avant d'arriver, et personne ne s'y branche en votre absence.",
      },
      {
        titre: "En résidence, ne payer que ce qu'on consomme",
        texte:
          "84,4 % des logements sont des appartements. Dans une résidence occupée en partie seulement à l'année, l'infrastructure collective est la solution la plus juste : elle est votée une fois en assemblée générale, puis chaque copropriétaire raccorde sa borne quand il le souhaite et paie sa propre consommation.",
      },
      {
        titre: "Voiture, bateau ou Léman Express",
        texte:
          "Le Pays d'Évian compte 5 714 actifs qui travaillent en Suisse, soit 29,1 % des actifs (Insee, 2018). Que vous preniez la voiture, le bateau pour Lausanne ou le Léman Express, une borne à domicile vous permet de partir chaque matin avec une voiture chargée pour tous les autres trajets.",
      },
    ],
    rechargePublique:
      "Les bornes publiques d'Évian font partie du réseau eborn, géré par le Syane, qui compte 280 bornes sur le domaine public en Haute-Savoie. Pratique en appoint, mais en saison elles sont aussi utilisées par les visiteurs.",
    aidesLocales: PAS_D_AIDE_LOCALE,
    offres: ["copropriete", "particuliers", "pro"],
    guides: [
      "droit-a-la-prise-copropriete-borne-recharge",
      "prime-advenir-copropriete-infrastructure-collective",
      "prise-renforcee-ou-wallbox-que-choisir",
    ],
    sources: [...insee("74119", "Évian-les-Bains"), FRONTALIERS_2018, TRANSFRONTALIERS_2021, SYANE],
  },
  {
    slug: "publier",
    nom: "Publier et Amphion",
    intercommunalite: "Pays d'Évian Vallée d'Abondance",
    population: 7864,
    anneePopulation: 2023,
    appartements: 48.8,
    maisons: 50.8,
    secondaires: 14.5,
    anneeLogements: 2022,
    km: 10,
    minutes: 15,
    image: "/hero-particulier.webp",
    metaTitre: "Borne de recharge à Publier et Amphion : installation à domicile | CHARGÉO",
    metaDescription:
      "À Publier, un logement sur deux est une maison. Wallbox ou prise renforcée, monophasé ou triphasé : CHARGéO installe votre borne à Publier et Amphion. Étude gratuite.",
    accroche:
      "À Publier, un logement sur deux est une maison : la borne murale au garage est souvent la solution la plus simple.",
    enjeux: [
      {
        titre: "En maison : prise renforcée ou wallbox",
        texte:
          "50,8 % des logements de Publier sont des maisons (Insee, 2022), deux fois et demie plus qu'à Thonon. Au garage ou sous l'abri voiture, on choisit entre prise renforcée et borne murale selon vos kilomètres, votre véhicule et ce que votre installation électrique peut fournir.",
      },
      {
        titre: "Vérifier le compteur avant de choisir",
        texte:
          "La plupart des maisons sont en monophasé : une borne de 7,4 kW y fonctionne très bien. Avant de parler de 11 ou 22 kW, nous vérifions votre abonnement, votre tableau électrique et la distance jusqu'à la place de stationnement. C'est ce qui fait le vrai prix d'une installation.",
      },
      {
        titre: "Appartements à Amphion",
        texte:
          "48,8 % d'appartements et 14,5 % de résidences secondaires : en résidence, au bord du lac comme dans le centre, le droit à la prise et l'infrastructure collective de copropriété s'appliquent comme partout ailleurs.",
      },
    ],
    rechargePublique:
      "Publier dépend du réseau public eborn, géré par le Syane (280 bornes sur le domaine public en Haute-Savoie). Pour une maison, la recharge à domicile reste la plus économique et la plus pratique.",
    aidesLocales: PAS_D_AIDE_LOCALE,
    offres: ["particuliers", "copropriete", "pro"],
    guides: [
      "prise-renforcee-ou-wallbox-que-choisir",
      "monophase-ou-triphase-quelle-puissance-de-borne",
      "prix-borne-recharge-maison-haute-savoie",
    ],
    sources: [
      ...insee("74218", "Publier"),
      FRONTALIERS_2018,
      SYANE,
    ],
  },
  {
    slug: "douvaine",
    nom: "Douvaine",
    intercommunalite: "Thonon Agglomération",
    population: 6796,
    anneePopulation: 2023,
    appartements: 59.3,
    maisons: 39.1,
    secondaires: 4.6,
    anneeLogements: 2022,
    km: 17,
    minutes: 20,
    image: "/hero-copro.webp",
    metaTitre: "Borne de recharge à Douvaine : copropriété et maison | CHARGÉO",
    metaDescription:
      "Résidence récente ou maison à Douvaine : CHARGéO installe votre borne de recharge, vérifie l'éligibilité ADVENIR de votre copropriété et prépare le dossier d'AG.",
    accroche:
      "Entre Thonon et Genève, Douvaine compte désormais 59,3 % d'appartements. Dans une résidence, tout commence par une bonne question : qu'est-ce qui est déjà prévu ?",
    enjeux: [
      {
        titre: "Résidence récente : vérifier ce qui existe déjà",
        texte:
          "Dans une copropriété, l'aide ADVENIR dépend surtout de la date du permis de construire. Permis déposé avant 2017 : l'ensemble de l'infrastructure est éligible (50 % des coûts éligibles, dans la limite des plafonds). Entre le 1er janvier 2017 et le 10 mars 2021 : l'aide ne porte que sur le pilotage et les chemins de câbles. Plus récent : le parking doit déjà être pré-équipé par le promoteur et l'infrastructure n'est pas éligible. Nous vérifions ce point avant de chiffrer quoi que ce soit.",
      },
      {
        titre: "Direction Genève, tous les jours",
        texte:
          "Douvaine fait partie de l'aire d'attraction de Genève-Annemasse (Insee), et Thonon Agglomération compte 34,3 % d'actifs qui travaillent en Suisse (Insee, 2018). Pour ces allers-retours quotidiens, recharger chez soi la nuit reste le plus simple.",
      },
      {
        titre: "Maisons : 39 % des logements",
        texte:
          "Si vous êtes en maison, une prise renforcée ou une borne murale suffit dans la grande majorité des cas. La visite technique sert à choisir la bonne puissance et le bon emplacement, pas à vous vendre la borne la plus chère.",
      },
    ],
    rechargePublique:
      "Douvaine a été équipée de bornes publiques par le Syane, dans le réseau eborn (source : Thonon Agglomération). Le Syane a mis à jour en 2025 son schéma de déploiement pour 2026-2028.",
    aidesLocales: PAS_D_AIDE_LOCALE,
    offres: ["copropriete", "particuliers", "pro"],
    guides: [
      "prime-advenir-copropriete-infrastructure-collective",
      "vote-borne-recharge-assemblee-generale-copropriete",
      "prise-renforcee-ou-wallbox-que-choisir",
    ],
    sources: [
      ...insee("74105", "Douvaine"),
      FRONTALIERS_2018,
      ADVENIR,
      { label: "Thonon Agglomération : véhicules électriques et bornes publiques", href: "https://www.thononagglo.fr/89-vehicules-electriques.htm" },
      { label: "Syane : nouvelle estimation du besoin en bornes de recharge (2025)", href: "https://syane.fr/2025/12/11/nouvelle-estimation-du-besoin-en-bornes-de-recharge/" },
    ],
  },
  {
    slug: "annemasse",
    nom: "Annemasse",
    intercommunalite: "Annemasse Agglo",
    population: 37628,
    anneePopulation: 2023,
    appartements: 93.9,
    maisons: 5.0,
    secondaires: 4.8,
    anneeLogements: 2022,
    km: 34,
    minutes: 40,
    image: "/hero-copro.webp",
    metaTitre: "Borne de recharge à Annemasse : copropriété et droit à la prise | CHARGÉO",
    metaDescription:
      "À Annemasse, 94 % des logements sont des appartements. Droit à la prise, infrastructure collective, ZFE : CHARGéO installe les bornes de recharge en copropriété.",
    accroche:
      "94 % d'appartements : à Annemasse, la borne se pose presque toujours dans un parking de copropriété.",
    enjeux: [
      {
        titre: "Le droit à la prise, votre premier levier",
        texte:
          "93,9 % des logements d'Annemasse sont des appartements et 5 % seulement des maisons (Insee, 2022). Locataire ou propriétaire, vous pouvez demander une borne sur votre place de parking : le syndic a 3 mois pour s'y opposer devant le tribunal, et seulement pour un motif sérieux et légitime.",
      },
      {
        titre: "ZFE : anticiper 2030",
        texte:
          "La zone à faibles émissions d'Annemasse Agglo prévoit de restreindre progressivement la circulation, jusqu'aux véhicules Crit'Air 3 en 2030. Si votre copropriété doit s'équiper, mieux vaut voter l'infrastructure tôt que de gérer dix demandes individuelles dans l'urgence.",
      },
      {
        titre: "Une agglomération de frontaliers",
        texte:
          "Annemasse Agglo compte 19 958 actifs qui travaillent en Suisse, soit 49,8 % des actifs (Insee, 2018). Le tram et le Léman Express mènent à Genève, mais pour tous ceux qui prennent la voiture, recharger la nuit dans son parking change la vie.",
      },
    ],
    rechargePublique:
      "Le schéma directeur de l'énergie d'Annemasse Agglo vise 300 bornes publiques et prévoit des bornes privées dans les copropriétés rénovées. Le réseau public départemental eborn est géré par le Syane.",
    aidesLocales:
      "Annemasse Agglo aide la rénovation énergétique des copropriétés (500 € par logement, 1 000 € pour les petites copropriétés), mais cette aide est liée aux travaux de rénovation : elle ne finance pas une borne seule. Pour l'infrastructure collective, la prime nationale ADVENIR reste la principale aide.",
    offres: ["copropriete", "pro", "particuliers"],
    guides: [
      "droit-a-la-prise-copropriete-borne-recharge",
      "vote-borne-recharge-assemblee-generale-copropriete",
      "prime-advenir-copropriete-infrastructure-collective",
    ],
    sources: [
      ...insee("74012", "Annemasse"),
      FRONTALIERS_2018,
      { label: "Annemasse Agglo : délibération sur la zone à faibles émissions (2024)", href: "https://www.annemasse-agglo.fr/sites/default/files/actes-administratifs/CC_2024_0160_0.pdf" },
      { label: "Annemasse Agglo : programme d'actions du schéma directeur de l'énergie", href: "https://www.annemasse-agglo.fr/sites/default/files/2025-01/Programme%20Actions_SDE_VF.pdf" },
      { label: "Annemasse Agglo : aides à la rénovation énergétique (2025)", href: "https://www.annemasse-agglo.fr/sites/default/files/2025-08/Dispositif_renovation_energetique.pdf" },
      ADVENIR,
    ],
  },
  {
    slug: "annecy",
    nom: "Annecy",
    intercommunalite: "Grand Annecy",
    population: 132117,
    anneePopulation: 2023,
    appartements: 86.7,
    maisons: 11.9,
    secondaires: 7.4,
    anneeLogements: 2023,
    km: 76,
    minutes: 75,
    image: "/hero-pro.webp",
    metaTitre: "Borne de recharge à Annecy : copropriété et entreprise | CHARGÉO",
    metaDescription:
      "Copropriété, entreprise ou maison à Annecy : CHARGéO, installateur IRVE haut-savoyard, étudie et installe votre borne de recharge. Conditions de déplacement annoncées dès le premier appel.",
    accroche:
      "Nous sommes basés à Thonon, à environ 1 h 15 d'Annecy. Nous y intervenons pour les copropriétés, les entreprises et les particuliers, avec des conditions de déplacement annoncées dès le premier appel.",
    enjeux: [
      {
        titre: "Une ville d'appartements",
        texte:
          "86,7 % des logements d'Annecy sont des appartements (Insee, 2023). Dans les résidences, la question n'est plus de savoir s'il faut équiper le parking, mais comment : droit à la prise au cas par cas, ou infrastructure collective votée en assemblée générale et aidée par la prime ADVENIR.",
      },
      {
        titre: "Transfrontaliers : 94 % en voiture",
        texte:
          "La zone d'emploi d'Annecy compte 15 500 transfrontaliers, qui parcourent en moyenne 45,6 km pour aller travailler, à 94 % en voiture (Insee, 2021). Pour eux, une borne à domicile ou au bureau est vite rentabilisée.",
      },
      {
        titre: "Entreprises : flotte et salariés",
        texte:
          "Parking d'entreprise, véhicules de service, recharge des salariés : nous dimensionnons l'installation avec du Load Balancing pour ne pas augmenter inutilement l'abonnement électrique, et nous gérons le dossier d'aide quand il y en a une.",
      },
    ],
    rechargePublique:
      "Le Grand Annecy annonce 715 points de charge publics et 145 de plus d'ici 2030, dont 50 en charge rapide (communiqué du 14 septembre 2026). Utile en appoint, mais rien ne remplace la recharge à domicile ou au travail pour un usage quotidien.",
    aidesLocales:
      "Le dispositif J'éco-rénove mon logement du Grand Annecy aide la rénovation énergétique des maisons et des copropriétés, pas l'installation d'une borne. Pour l'infrastructure collective en copropriété, la prime nationale ADVENIR reste la principale aide.",
    offres: ["copropriete", "pro", "particuliers"],
    guides: [
      "vote-borne-recharge-assemblee-generale-copropriete",
      "prime-advenir-copropriete-infrastructure-collective",
      "droit-a-la-prise-copropriete-borne-recharge",
    ],
    deplacement:
      "Annecy est à environ 76 km de notre base de Thonon. Les conditions de déplacement (visite, pose, SAV) sont précisées dès le premier appel, avant tout engagement.",
    sources: [
      ...insee("74010", "Annecy"),
      FRONTALIERS_2018,
      TRANSFRONTALIERS_2021,
      { label: "Grand Annecy : communiqué sur l'électrification des usages (14/09/2026)", href: "https://www.grandannecy.fr/fileadmin/mediatheque/kiosque/Espace_presse/Communique_de_presse-electrification-14-09-2026.pdf" },
      { label: "Grand Annecy : J'éco-rénove mon logement", href: "https://www.grandannecy.fr/mon-quotidien/ameliore-mon-cadre-de-vie/habitat/jecorenove-mon-logement" },
      ADVENIR,
    ],
  },
];

export function getVille(slug: string): Ville | undefined {
  return villes.find((v) => v.slug === slug);
}

// 79.9 -> « 79,9 % » ; 37928 -> « 37 928 » (espaces insécables, sans dépendre de la langue du serveur)
export const pct = (n: number) => `${n.toFixed(1).replace(".", ",")}\u00a0%`;
export const nombre = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
