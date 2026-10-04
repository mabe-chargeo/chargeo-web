// src/content/blog.ts
// Contenu du blog "Guides & conseils".
// Pour ajouter un article : copier un bloc { ... } dans la liste `articles`, changer le slug (adresse), le titre, la date et le contenu.

export type Block =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; text: string };

export interface Article {
  slug: string;
  title: string;
  description: string;
  date: string; // AAAA-MM-JJ
  readingMinutes: number;
  category: string;
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
    cta: { label: "Étudier mon projet", href: "/particuliers" },
    blocks: [
      {
        type: "p",
        text: "Vous habitez en appartement à Thonon, Évian ou ailleurs dans le Chablais, vous avez une place de parking et vous venez de passer à l'électrique ? Bonne nouvelle : la loi vous permet d'installer une borne de recharge sur votre place, même si la copropriété n'a rien prévu. C'est ce qu'on appelle le droit à la prise.",
      },
      { type: "h2", text: "Le droit à la prise, c'est quoi ?" },
      {
        type: "p",
        text: "Créé en 2011 et renforcé par la loi d'orientation des mobilités (LOM) de 2019, le droit à la prise permet à tout copropriétaire, mais aussi à un locataire ou à un occupant de bonne foi, d'installer à ses frais un point de recharge sur sa place de stationnement dans le parking de l'immeuble. La copropriété ne peut pas simplement refuser : pour s'y opposer, elle doit saisir le tribunal, et seulement pour un motif sérieux et légitime.",
      },
      { type: "h2", text: "Les démarches, étape par étape" },
      {
        type: "ol",
        items: [
          "Faire réaliser une étude technique par un installateur qualifié IRVE : d'où partir (votre compteur, le tableau des services généraux ou un nouveau point de livraison), par où passer le câble, quelle puissance est disponible.",
          "Envoyer au syndic une lettre recommandée avec accusé de réception, avec un descriptif détaillé des travaux, un plan et un schéma de l'installation. L'installateur vous fournit ces documents.",
          "Le syndic inscrit le projet à l'ordre du jour de la prochaine assemblée générale, pour information. Il n'y a pas de vote : vous n'avez pas besoin de l'accord des autres copropriétaires.",
          "À compter de la réception de votre courrier, la copropriété dispose de 3 mois pour saisir le tribunal si elle veut s'opposer. Passé ce délai, vous pouvez lancer les travaux.",
          "Installation, mise en service et remise de l'attestation de conformité par l'installateur.",
        ],
      },
      { type: "h2", text: "Vous êtes locataire ?" },
      {
        type: "p",
        text: "Le principe est le même, avec une étape en plus : vous informez d'abord votre propriétaire par lettre recommandée, avec le descriptif des travaux. Il dispose lui aussi de 3 mois pour s'y opposer devant le tribunal, pour un motif sérieux et légitime, puis il transmet le dossier au syndic.",
      },
      { type: "h2", text: "Quels motifs peuvent bloquer le projet ?" },
      {
        type: "p",
        text: "Ils sont rares. Le cas le plus fréquent : la copropriété a déjà décidé d'installer une infrastructure collective de recharge dans un délai raisonnable. Dans ce cas, mieux vaut s'y raccorder. Un problème technique avéré ou un projet non conforme peut aussi justifier une opposition, d'où l'intérêt d'un dossier technique propre dès le départ.",
      },
      { type: "h2", text: "Qui paie quoi ?" },
      {
        type: "p",
        text: "Les travaux sont à votre charge : le câble, les protections, la borne et la pose. Si la borne est raccordée sur l'électricité des parties communes, votre consommation doit être comptée à part (sous-comptage) pour que la copropriété vous la refacture au juste prix. Au-delà de 3,7 kW, la pose doit obligatoirement être réalisée par un professionnel qualifié IRVE, c'est aussi une condition pour bénéficier des aides.",
      },
      {
        type: "callout",
        text: "Notre conseil : avant d'envoyer votre courrier, demandez au syndic si un projet d'infrastructure collective est à l'étude. Si ce n'est pas le cas, proposer ce projet en assemblée générale peut coûter moins cher à tout le monde, grâce aux aides du programme ADVENIR.",
      },
      {
        type: "p",
        text: "Chez CHARGéO, on prépare le dossier technique à envoyer au syndic (descriptif, plan, schéma) et on réalise l'installation dans tout le Chablais, avec un prix ferme annoncé avant les travaux.",
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
          "Prise renforcée (environ 3,2 à 3,7 kW) : une prise spéciale sur un circuit dédié. Environ 15 à 20 km par heure, soit 120 à 150 km sur une nuit de 8 heures.",
          "Borne murale ou wallbox (7,4 kW en monophasé) : environ 35 à 45 km par heure. La batterie se recharge en une nuit, même après une grosse journée.",
        ],
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
          "Frontalier ou gros rouleur (un aller-retour Thonon–Genève fait souvent 80 à 100 km) : la wallbox 7,4 kW devient vite indispensable, surtout l'hiver.",
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
        text: "À savoir : au-delà de 3,7 kW, l'installation doit obligatoirement être réalisée par un électricien qualifié IRVE. C'est une question de sécurité, et une condition pour bénéficier des aides. Dans un logement achevé depuis plus de 2 ans, la pose peut bénéficier d'une TVA réduite à 5,5 %.",
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
      "Syndics et conseils syndicaux du Chablais : comment fonctionne la prime ADVENIR pour équiper le parking de votre immeuble, qui est éligible, et les étapes jusqu'au vote en assemblée générale.",
    date: "2026-10-04",
    readingMinutes: 5,
    category: "Copropriété",
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
      { type: "h2", text: "Ce que finance ADVENIR" },
      {
        type: "ul",
        items: [
          "L'infrastructure collective : jusqu'à 50 % des coûts, avec un plafond de 12 500 € HT pour une copropriété jusqu'à 100 places, majoré au-delà.",
          "Les chemins de câbles : pris en charge à 50 % pour les parkings de moins de 40 places, à 25 % au-delà.",
          "Les bornes individuelles raccordées ensuite : une prime par point de charge, cumulable avec l'aide à l'infrastructure.",
        ],
      },
      {
        type: "callout",
        text: "Les montants et les conditions du programme évoluent régulièrement. Ceux indiqués ici le sont à titre indicatif, à la date de publication : on vérifie toujours le barème en vigueur avant de chiffrer votre projet.",
      },
      { type: "h2", text: "Votre immeuble est-il éligible ?" },
      {
        type: "p",
        text: "L'éligibilité dépend surtout de la date du permis de construire. Les immeubles les plus anciens (permis déposé avant 2017) sont les mieux couverts. Pour un permis déposé entre 2017 et mars 2021, l'aide porte sur une partie réduite des travaux. Les immeubles plus récents doivent normalement déjà être pré-équipés par le promoteur et ne sont, en principe, plus éligibles.",
      },
      { type: "h2", text: "Les étapes jusqu'aux travaux" },
      {
        type: "ol",
        items: [
          "Le conseil syndical ou le syndic demande une étude : nombre de places, puissance disponible au compteur des services généraux, cheminement dans le parking.",
          "L'installateur remet un devis détaillé, avec le montant d'aide ADVENIR estimé et la puissance à réserver pour la recharge.",
          "Le projet est inscrit à l'ordre du jour de l'assemblée générale. Depuis la loi LOM, ces travaux se votent à la majorité simple des copropriétaires présents ou représentés.",
          "Le dossier ADVENIR est déposé avant le démarrage des travaux, par un installateur labellisé ADVENIR.",
          "Travaux et mise en service, puis versement de la prime une fois le chantier terminé et les justificatifs transmis.",
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
