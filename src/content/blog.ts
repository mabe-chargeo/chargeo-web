// src/content/blog.ts
// Contenu du blog "Guides & conseils".
// Pour ajouter un article : copier un bloc { ... } dans la liste `articles`, changer le slug (adresse), le titre, la date et le contenu.
// Images : couverture = une photo de /public ; schémas = fichiers SVG dans /public/blog.
// Chiffres ADVENIR vérifiés le 04/10/2026 sur advenir.mobi (barème résidentiel collectif du 1er avril 2026).
// Droit à la prise : art. L.113-16, L.113-17 et R.113-8 s. du CCH (décret n° 2020-1720). TVA 5,5 % : art. 278-0 bis N du CGI et art. 30-0 H ann. IV.

export type Block =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; text: string }
  | { type: "figure"; src: string; alt: string; caption?: string; width: number; height: number };

export interface Article {
  slug: string;
  title: string;
  description: string;
  date: string; // AAAA-MM-JJ
  readingMinutes: number;
  category: string;
  cover: { src: string; alt: string };
  cta: { label: string; href: string };
  blocks: Block[];
}

export const articles: Article[] = [
  {
    slug: "droit-a-la-prise-copropriete-borne-recharge",
    title: "Droit à la prise en copropriété : installer sa borne de recharge, mode d'emploi",
    description:
      "Copropriétaire ou locataire à Thonon, Évian ou dans le Chablais ? Le droit à la prise vous permet d'installer une borne sur votre place de parking. Démarches, délais et pièges à éviter.",
    date: "2026-10-04",
    readingMinutes: 5,
    category: "Copropriété",
    cover: { src: "/tech-chargeo.webp", alt: "Intervention sur une installation de recharge" },
    cta: { label: "Étudier mon projet", href: "/particuliers" },
    blocks: [
      {
        type: "p",
        text: "Vous habitez en appartement à Thonon, Évian ou ailleurs dans le Chablais, vous avez une place de parking et vous venez de passer à l'électrique ? Bonne nouvelle : la loi vous permet d'installer une borne de recharge sur votre place, même si la copropriété n'a rien prévu. C'est ce qu'on appelle le droit à la prise.",
      },
      { type: "h2", text: "Le droit à la prise, c'est quoi ?" },
      {
        type: "p",
        text: "Inscrit dans le Code de la construction et de l'habitation et renforcé par la loi d'orientation des mobilités (LOM) de 2019, le droit à la prise permet à tout copropriétaire, mais aussi à un locataire ou à un occupant de bonne foi, d'installer à ses frais un point de recharge sur sa place de stationnement dans le parking de l'immeuble, avec un comptage individuel de sa consommation. La copropriété ne peut pas simplement refuser : pour s'y opposer, le syndic doit saisir le tribunal judiciaire, et seulement pour un motif sérieux et légitime.",
      },
      { type: "h2", text: "Les démarches, étape par étape" },
      {
        type: "figure",
        src: "/blog/droit-a-la-prise-etapes.svg",
        alt: "Les 5 étapes du droit à la prise : étude technique, courrier au syndic, assemblée générale pour information, 3 mois de délai, travaux et mise en service",
        width: 720,
        height: 880,
      },
      {
        type: "ol",
        items: [
          "Faire réaliser une étude technique par un installateur qualifié IRVE : d'où partir (votre compteur, le tableau des services généraux ou un nouveau point de livraison), par où passer le câble, quelle puissance est disponible.",
          "Notifier votre projet au syndic par lettre recommandée avec accusé de réception, avec un descriptif détaillé des travaux, un plan technique et un schéma de raccordement électrique. L'installateur vous prépare ces documents.",
          "Le syndic inscrit une information sur votre projet à l'ordre du jour de la prochaine assemblée générale. Il n'y a pas de vote : vous n'avez pas besoin de l'accord des autres copropriétaires.",
          "À compter de la réception de votre courrier, le syndic dispose de 3 mois pour saisir le tribunal s'il veut s'opposer. Sans saisine dans ce délai, vous pouvez lancer les travaux, même si l'assemblée générale n'a pas encore eu lieu.",
          "Le syndic signe avec l'installateur une convention qui fixe les conditions d'accès aux parties communes (sans vote de l'assemblée), puis viennent la pose, la mise en service et la remise de l'attestation de conformité.",
        ],
      },
      { type: "h2", text: "Vous êtes locataire ?" },
      {
        type: "p",
        text: "Le principe est le même, avec une étape en plus : vous notifiez votre projet à votre propriétaire par lettre recommandée, avec copie au syndic. Votre propriétaire a un mois pour transmettre le dossier au syndic, et c'est ensuite le syndic qui dispose des 3 mois pour s'opposer devant le tribunal, pour un motif sérieux et légitime.",
      },
      { type: "h2", text: "Quels motifs peuvent bloquer le projet ?" },
      {
        type: "p",
        text: "Ils sont rares. Le cas le plus fréquent : la copropriété a décidé d'équiper elle-même le parking avec une infrastructure collective. Dans ce cas, elle doit tenir ses engagements : si les travaux ne sont pas lancés dans les 3 mois suivant la saisine du tribunal, ou pas terminés dans les 6 mois, vous reprenez la main. Un problème technique avéré ou un projet non conforme peut aussi justifier une opposition, d'où l'intérêt d'un dossier technique propre dès le départ.",
      },
      { type: "h2", text: "Qui paie quoi ?" },
      {
        type: "p",
        text: "Les travaux sont à votre charge : le câble, les protections, la borne et la pose. Si la borne est raccordée sur l'électricité des parties communes, votre consommation doit être comptée à part (sous-comptage) pour que la copropriété vous la refacture au juste prix. Au-delà de 3,7 kW, la pose doit obligatoirement être réalisée par un professionnel qualifié IRVE.",
      },
      {
        type: "callout",
        text: "Bon à savoir : en copropriété, la prime ADVENIR finance 50 % de votre borne individuelle, jusqu'à 1 000 € HT, sous conditions techniques (borne pilotable notamment). Le dossier est monté par un installateur dont l'offre est labellisée ADVENIR, avant le début des travaux, et la prime est déduite de votre facture.",
      },
      {
        type: "callout",
        text: "Notre conseil : avant d'envoyer votre courrier, demandez au syndic si un projet d'infrastructure collective est à l'étude. Si ce n'est pas le cas, proposer ce projet en assemblée générale peut coûter moins cher à tout le monde, grâce aux aides du programme ADVENIR.",
      },
      {
        type: "p",
        text: "Chez CHARGéO, on prépare le dossier technique à joindre à votre courrier (descriptif, plan, schéma) et on réalise l'installation dans tout le Chablais, avec un prix ferme annoncé avant les travaux.",
      },
    ],
  },
  {
    slug: "prise-renforcee-ou-wallbox-que-choisir",
    title: "Prise renforcée ou borne murale : que choisir pour recharger à la maison ?",
    description:
      "Prise classique, prise renforcée ou wallbox 7,4 kW : combien de kilomètres récupérés par heure, ce qu'il faut vérifier, et quelle solution pour un trajet Chablais–Genève.",
    date: "2026-10-04",
    readingMinutes: 4,
    category: "Particuliers",
    cover: { src: "/hero-particulier.webp", alt: "Recharge d'une voiture électrique à domicile" },
    cta: { label: "Simuler mon installation", href: "/particuliers" },
    blocks: [
      {
        type: "p",
        text: "C'est la première question qu'on nous pose : faut-il vraiment une borne, ou une simple prise suffit-elle ? La réponse dépend surtout de vos kilomètres quotidiens. Petit tour d'horizon pour choisir sans se tromper.",
      },
      { type: "h2", text: "Les 3 solutions et leur vitesse de recharge" },
      {
        type: "ul",
        items: [
          "Prise domestique classique (environ 2,3 kW) : à réserver au dépannage. Elle récupère environ 10 à 15 km d'autonomie par heure et n'est pas conçue pour débiter fort pendant des heures, chaque nuit.",
          "Prise renforcée (environ 3,2 à 3,7 kW) : une prise spéciale sur un circuit dédié. Environ 15 à 20 km par heure, soit 120 à 160 km sur une nuit de 8 heures.",
          "Borne murale ou wallbox (7,4 kW en monophasé) : environ 35 à 45 km par heure. La batterie se recharge en une nuit, même après une grosse journée.",
        ],
      },
      {
        type: "figure",
        src: "/blog/vitesse-recharge.svg",
        alt: "Comparatif des kilomètres récupérés par heure : prise classique 10 à 15 km, prise renforcée 15 à 20 km, wallbox 7,4 kW 35 à 45 km, wallbox 11 kW 55 à 65 km",
        width: 720,
        height: 580,
      },
      {
        type: "p",
        text: "Ces chiffres sont indicatifs : ils dépendent de la consommation de votre véhicule (souvent 15 à 20 kWh aux 100 km) et de la température. En hiver en Haute-Savoie, comptez un peu moins.",
      },
      { type: "h2", text: "Et le 11 ou le 22 kW ?" },
      {
        type: "p",
        text: "Une borne 11 kW demande un abonnement triphasé et un véhicule capable de charger à 11 kW en courant alternatif. C'est pertinent pour un gros rouleur ou pour plusieurs véhicules. Le 22 kW, à la maison, est rarement utile : peu de voitures en profitent et il impose souvent de revoir l'abonnement.",
      },
      { type: "h2", text: "Comment choisir selon vos trajets" },
      {
        type: "ul",
        items: [
          "Moins de 50 km par jour (trajets en ville, Thonon–Évian) : une prise renforcée peut suffire.",
          "Frontalier ou gros rouleur (un aller-retour Thonon–Genève fait souvent 70 à 100 km) : la wallbox 7,4 kW devient vite indispensable, surtout l'hiver.",
          "Deux voitures électriques ou un véhicule professionnel : wallbox, avec pilotage de la puissance.",
        ],
      },
      { type: "h2", text: "Ce qu'il faut vérifier avant d'installer" },
      {
        type: "ul",
        items: [
          "La puissance de votre abonnement : avec 6 ou 9 kVA, une borne 7,4 kW peut faire disjoncter si le four et le chauffage tournent en même temps. La solution : un délesteur, qui baisse automatiquement la recharge quand la maison consomme beaucoup.",
          "L'état du tableau électrique et la qualité de la terre : la borne a besoin de protections dédiées (disjoncteur et différentiel adaptés).",
          "La distance entre le tableau et l'emplacement de la borne : c'est elle qui fait varier le prix, avec le mode de passage du câble (apparent, encastré, enterré, vide sanitaire).",
          "Les heures creuses : une borne pilotée recharge la nuit, au tarif le plus bas.",
        ],
      },
      {
        type: "callout",
        text: "À savoir : au-delà de 3,7 kW, l'installation doit obligatoirement être réalisée par un électricien qualifié IRVE. C'est une question de sécurité et d'assurance. Côté aides en maison individuelle, le crédit d'impôt a disparu au 1er janvier 2026 et la prime ADVENIR est réservée au logement collectif : il reste la TVA réduite à 5,5 % sur l'installation de la borne par un installateur qualifié IRVE.",
      },
      {
        type: "p",
        text: "Chez CHARGéO, l'étude est gratuite : on mesure les distances, on vérifie votre tableau et votre abonnement, et vous recevez un prix ferme. Pas de surprise le jour de la pose.",
      },
    ],
  },
  {
    slug: "prime-advenir-copropriete-infrastructure-collective",
    title: "Prime ADVENIR en copropriété : financer l'infrastructure de recharge collective",
    description:
      "Syndics et conseils syndicaux du Chablais : barème ADVENIR 2026 (jusqu'à 12 500 € HT), éligibilité de votre immeuble et étapes jusqu'au vote en assemblée générale.",
    date: "2026-10-04",
    readingMinutes: 5,
    category: "Copropriété",
    cover: { src: "/hero-copro.webp", alt: "Immeuble en copropriété avec parking" },
    cta: { label: "Découvrir l'offre copropriété", href: "/copropriete" },
    blocks: [
      {
        type: "p",
        text: "De plus en plus de copropriétaires roulent à l'électrique, et les demandes de droit à la prise se multiplient. Plutôt que de laisser chaque résident tirer son propre câble, beaucoup de copropriétés choisissent d'installer une infrastructure collective : un réseau commun dans le parking, sur lequel chacun raccorde ensuite sa borne. Le programme ADVENIR finance une bonne partie de ces travaux.",
      },
      { type: "h2", text: "Infrastructure collective : de quoi parle-t-on ?" },
      {
        type: "p",
        text: "On installe une fois pour toutes l'ossature électrique du parking : une alimentation dédiée, un tableau pour la recharge et un câble principal qui longe les places. Chaque résident qui le souhaite fait ensuite poser sa borne et la raccorde sur ce câble, sans nouveaux gros travaux. L'immeuble est prêt pour tout le monde, et il prend de la valeur.",
      },
      {
        type: "figure",
        src: "/blog/infrastructure-collective.svg",
        alt: "Schéma d'une infrastructure collective : compteur des services généraux, tableau de recharge, câble principal le long des places, bornes raccordées au fil des demandes",
        caption: "Le câble principal est posé une fois : chaque résident s'y raccorde quand il passe à l'électrique.",
        width: 720,
        height: 560,
      },
      { type: "h2", text: "Ce que finance ADVENIR en 2026" },
      {
        type: "ul",
        items: [
          "L'infrastructure collective : 50 % des coûts HT, jusqu'à 12 500 € HT pour un parking jusqu'à 100 places, plus 125 € HT par place au-delà.",
          "Les travaux en extérieur (voirie, cheminement de câbles dehors) : 50 % en plus, jusqu'à 8 000 € HT pour 100 places extérieures, plus 80 € HT par place extérieure au-delà.",
          "Les bornes individuelles raccordées ensuite : 50 % du coût, jusqu'à 1 000 € HT par borne, cumulable avec l'aide à l'infrastructure.",
        ],
      },
      {
        type: "callout",
        text: "Ce barème s'applique depuis le 1er avril 2026 : pour l'infrastructure collective, à condition que le vote en assemblée générale ait eu lieu à partir de cette date (le procès-verbal fait foi) ; pour les bornes individuelles, aux dossiers signés depuis cette date. Le programme est prolongé jusqu'au 31 décembre 2027. Montants indicatifs à la date de publication : on vérifie toujours le barème en vigueur avant de chiffrer votre projet.",
      },
      { type: "h2", text: "Votre immeuble est-il éligible ?" },
      {
        type: "p",
        text: "L'éligibilité dépend surtout de la date de dépôt du permis de construire. Avant 2017, l'ensemble de l'infrastructure est pris en compte. Entre le 1er janvier 2017 et le 10 mars 2021, l'aide ne porte que sur le pilotage et les chemins de câbles (à 50 % pour les parkings de moins de 40 places, à 25 % au-delà). Les immeubles plus récents doivent déjà être pré-équipés par le promoteur et ne sont pas éligibles.",
      },
      { type: "h2", text: "Les étapes jusqu'aux travaux" },
      {
        type: "ol",
        items: [
          "Le conseil syndical ou le syndic demande une étude : nombre de places, puissance disponible au compteur des services généraux, cheminement dans le parking.",
          "L'installateur remet un devis détaillé, avec le montant d'aide ADVENIR estimé et la puissance à réserver pour la recharge.",
          "Le projet est inscrit à l'ordre du jour de l'assemblée générale. Ces travaux se votent à la majorité simple des copropriétaires présents ou représentés (article 24 de la loi de 1965).",
          "La demande de prime est déposée sur la plateforme ADVENIR, avec le devis et le procès-verbal d'assemblée générale, par un porteur dont l'offre est labellisée ADVENIR. L'offre de prime doit être signée avant tout démarrage des travaux.",
          "Travaux et mise en service, contrôle de conformité par un organisme d'inspection, puis versement de la prime sur présentation de la facture.",
        ],
      },
      { type: "h2", text: "Quelle puissance faut-il prévoir ?" },
      {
        type: "p",
        text: "C'est souvent le point qui inquiète le plus les syndics. La réglementation fixe une réserve de puissance minimale selon le nombre de places, par exemple 22 kVA pour un parking de 21 à 40 places. Grâce au pilotage intelligent de la recharge, cette puissance est partagée entre les véhicules branchés, sans augmenter inutilement l'abonnement de l'immeuble.",
      },
      {
        type: "callout",
        text: "Notre engagement : vous restez propriétaires de votre infrastructure. Pas de contrat d'opérateur sur 10 ou 15 ans, pas d'abonnement imposé aux résidents.",
      },
      {
        type: "p",
        text: "CHARGéO accompagne les syndics et les conseils syndicaux de Thonon, Évian, Douvaine et de tout le Chablais : étude, devis avec le calcul de l'aide, puis travaux.",
      },
    ],
  },
];

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
}
