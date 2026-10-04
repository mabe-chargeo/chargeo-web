// src/content/blog.ts
// Contenu du blog "Guides & conseils".
// Pour ajouter un article : copier un bloc { ... } dans la liste `articles`, changer le slug (adresse), le titre, la date et le contenu.
// Images : couverture = une photo de /public ; schémas = fichiers SVG dans /public/blog.
// Chiffres ADVENIR vérifiés le 04/10/2026 sur advenir.mobi (barème résidentiel collectif du 1er avril 2026).
// Droit à la prise : art. L.113-16, L.113-17 et R.113-8 s. du CCH (décret n° 2020-1720). TVA 5,5 % : art. 278-0 bis N du CGI et art. 30-0 H ann. IV.
// Majorités en AG (vérifiées sur Légifrance le 04/10/2026, version du 18/06/2025) : étude et décision d'équiper = art. 24 II i ;
// travaux d'infrastructure = art. 25 j, passerelle art. 25-1 ; convention opérateur ou Enedis sans frais = art. 24-5-1 ; obligation d'inscription = art. 24-5.
// Crédit d'impôt borne (art. 200 quater C CGI) : supprimé pour les dépenses payées depuis le 01/01/2026 (service-public.gouv.fr).

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
    slug: "vote-borne-recharge-assemblee-generale-copropriete",
    title: "Bornes de recharge en copropriété : vote en AG, majorités et calendrier",
    description:
      "Syndics, conseils syndicaux et copropriétaires du Chablais : quelle majorité pour voter l'infrastructure de recharge, comment l'inscrire à l'ordre du jour et quel calendrier prévoir avant les travaux.",
    date: "2026-10-04",
    readingMinutes: 6,
    category: "Copropriété",
    cover: { src: "/hero-copro.webp", alt: "Immeuble en copropriété avec parking" },
    cta: { label: "Préparer mon assemblée générale", href: "/copropriete" },
    blocks: [
      {
        type: "p",
        text: "Une copropriété qui veut équiper son parking passe forcément par l'assemblée générale. La loi a simplifié les choses, mais selon ce que l'on vote, la majorité n'est pas la même, et un dossier mal préparé peut faire perdre un an. Voici comment s'y retrouver.",
      },
      { type: "h2", text: "Droit à la prise ou projet collectif : deux chemins différents" },
      {
        type: "p",
        text: "Un résident qui veut sa borne n'a pas besoin de vote : il utilise le droit à la prise et notifie son projet au syndic (voir notre guide dédié). Dès que la copropriété veut équiper le parking pour tout le monde, avec une infrastructure collective sur laquelle chacun se raccordera ensuite, c'est l'assemblée générale qui décide.",
      },
      { type: "h2", text: "Quelle majorité pour quelle décision ?" },
      {
        type: "ul",
        items: [
          "L'étude préalable (vérifier que l'installation électrique de l'immeuble peut accueillir la recharge) et la décision de principe d'équiper les places de bornes : majorité simple de l'article 24, c'est-à-dire la majorité des voix exprimées des copropriétaires présents, représentés ou ayant voté par correspondance.",
          "Les travaux d'infrastructure financés par la copropriété (alimentation, tableau, câble principal dans le parking, comptage individuel) : majorité de l'article 25 j, soit la majorité des voix de tous les copropriétaires, absents compris.",
          "Si cette majorité n'est pas atteinte mais que le projet a recueilli au moins un tiers des voix de tous les copropriétaires, l'assemblée peut revoter immédiatement à la majorité simple de l'article 24 : c'est la passerelle de l'article 25-1.",
          "Une convention avec un opérateur ou avec Enedis pour une infrastructure installée sans frais pour la copropriété se vote à la majorité simple (article 24-5-1). En contrepartie, ce sont les utilisateurs qui financent l'infrastructure, au fil de leurs raccordements et de leur recharge.",
        ],
      },
      {
        type: "callout",
        text: "Concrètement : pour un vote à l'article 25, un copropriétaire absent qui n'a pas donné de pouvoir pèse comme une voix qui manque. Faites circuler les pouvoirs et le formulaire de vote par correspondance avant l'assemblée : c'est souvent ce qui fait la différence.",
      },
      { type: "h2", text: "Le syndic doit mettre la question à l'ordre du jour" },
      {
        type: "p",
        text: "Quand l'immeuble a des places de stationnement privatives et pas encore d'installation pour la recharge, la loi oblige le syndic à inscrire à l'ordre du jour la question de l'étude, puis celle des travaux, avec les devis élaborés à cet effet (article 24-5 de la loi de 1965). Et à tout moment, un copropriétaire ou le conseil syndical peut demander au syndic, par lettre recommandée, d'inscrire une question à la prochaine assemblée.",
      },
      { type: "h2", text: "Le calendrier type, de l'étude aux travaux" },
      {
        type: "figure",
        src: "/blog/ag-copro-calendrier.svg",
        alt: "Les 6 étapes d'un projet de recharge en copropriété : étude technique, inscription à l'ordre du jour, convocation au moins 21 jours avant, vote en assemblée générale, 2 mois de délai de recours, dossier ADVENIR puis travaux",
        width: 720,
        height: 980,
      },
      {
        type: "ol",
        items: [
          "Étude technique : nombre de places, puissance disponible au compteur des services généraux, cheminement dans le parking. Comptez quelques semaines entre la visite et le devis.",
          "Inscription à l'ordre du jour : le conseil syndical ou un copropriétaire transmet la demande et les devis au syndic, idéalement deux mois avant l'assemblée, avant l'envoi des convocations.",
          "Convocation : elle part au moins 21 jours avant l'assemblée, avec les devis et les conditions essentielles des contrats proposés. Une question absente de l'ordre du jour ne peut pas être votée.",
          "Vote en assemblée générale, avec la passerelle de l'article 25-1 si nécessaire.",
          "Délai de recours : le procès-verbal est notifié aux copropriétaires opposants ou absents, qui disposent de deux mois pour contester la décision en justice. La plupart des copropriétés attendent la fin de ce délai avant de lancer les commandes.",
          "Dossier ADVENIR et travaux : la demande de prime est déposée avec le devis et le procès-verbal, et l'offre de prime doit être signée avant le démarrage du chantier.",
        ],
      },
      {
        type: "callout",
        text: "Le piège à éviter : arriver avec un devis la veille de l'envoi des convocations. Sans devis joint, pas de vote, et beaucoup de copropriétés ne tiennent qu'une assemblée par an.",
      },
      { type: "h2", text: "Qui paie, et comment ?" },
      {
        type: "p",
        text: "L'infrastructure collective est une dépense de la copropriété : elle est répartie entre les copropriétaires selon les règles de répartition des charges de l'immeuble, et appelée par le syndic. La prime ADVENIR vient en déduction : 50 % des coûts, jusqu'à 12 500 € HT pour un parking jusqu'à 100 places selon le barème en vigueur. Chaque résident paie ensuite sa propre borne quand il se raccorde, avec une aide possible de 1 000 € HT.",
      },
      {
        type: "p",
        text: "CHARGéO prépare pour vos assemblées un dossier complet : étude, devis standardisés avec la part collective et la part individuelle, estimation de l'aide ADVENIR, et présence en assemblée pour répondre aux questions techniques.",
      },
    ],
  },
  {
    slug: "prix-borne-recharge-maison-haute-savoie",
    title: "Prix d'une borne de recharge à la maison en Haute-Savoie : ce qui fait varier la facture",
    description:
      "Prise renforcée ou borne 7,4 kW posée : les fourchettes de prix, les 5 postes qui font varier un devis, les aides qui restent en 2026 et les pièges à éviter dans le Chablais.",
    date: "2026-10-04",
    readingMinutes: 5,
    category: "Particuliers",
    cover: { src: "/hero-particulier.webp", alt: "Recharge d'une voiture électrique à domicile" },
    cta: { label: "Simuler mon installation", href: "/particuliers" },
    blocks: [
      {
        type: "p",
        text: "Combien coûte une borne posée ? La question est simple, la réponse moins : deux maisons voisines peuvent recevoir des devis du simple au double. Ce n'est pas la borne qui fait la différence, c'est tout ce qu'il y a autour. Voici comment lire un devis et éviter les mauvaises surprises.",
      },
      { type: "h2", text: "Les fourchettes de prix, pose comprise" },
      {
        type: "ul",
        items: [
          "Prise renforcée (3,7 kW) sur circuit dédié : environ 650 à 1 000 € TTC pour une installation standard.",
          "Borne murale 7,4 kW pilotable : environ 1 500 à 2 800 € TTC selon la marque et la configuration.",
          "Borne 11 kW triphasée : un peu plus, à condition que la maison soit déjà raccordée en triphasé.",
        ],
      },
      {
        type: "p",
        text: "Ces montants s'entendent avec la TVA à 5,5 % et pour une installation standard : borne à quelques mètres du tableau, câble apparent ou sous goulotte, tableau en bon état. Au-delà, ce sont les travaux annexes qui font monter la note.",
      },
      { type: "h2", text: "Les 5 postes qui font varier un devis" },
      {
        type: "figure",
        src: "/blog/prix-borne-postes.svg",
        alt: "Les 5 postes qui font varier le prix d'une borne : distance et passage du câble, choix de la borne, tableau électrique, gestion de la puissance, percements et finitions",
        width: 720,
        height: 780,
      },
      {
        type: "ol",
        items: [
          "La distance et le passage du câble. C'est le premier poste. Un câble apparent le long d'un mur de garage coûte peu ; un passage encastré, en vide sanitaire ou en tranchée jusqu'à une place extérieure demande plus de matériel et de main-d'œuvre.",
          "Le choix de la borne. Entre une borne pilotable d'entrée de gamme et un modèle connecté haut de gamme, l'écart peut dépasser 1 000 €. La bonne borne est celle qui correspond à votre usage, pas la plus chère.",
          "Le tableau électrique. Une borne a besoin de protections dédiées. Si le tableau est saturé ou ancien, il faut le réorganiser, voire le remplacer, et vérifier la terre.",
          "La gestion de la puissance. Avec un abonnement de 6 ou 9 kVA, un délesteur évite les coupures en baissant la recharge quand la maison consomme beaucoup. Parfois, augmenter la puissance de l'abonnement auprès de votre fournisseur est la meilleure option.",
          "Les percements et finitions. Traverser un mur en béton ou en pierre, une dalle, poser une goulotte propre : chaque détail compte dans le temps passé.",
        ],
      },
      { type: "h2", text: "Les aides qui restent en 2026" },
      {
        type: "ul",
        items: [
          "La TVA à 5,5 % sur l'installation de la borne dans votre logement, quand elle respecte les exigences techniques prévues par la loi et qu'elle est réalisée par un professionnel répondant aux exigences de qualification (qualification IRVE au-delà de 3,7 kW).",
          "Le crédit d'impôt pour l'achat et la pose d'une borne a pris fin : il ne s'applique plus aux dépenses payées depuis le 1er janvier 2026.",
          "La prime ADVENIR ne concerne pas les maisons individuelles : elle est réservée notamment aux copropriétés et aux entreprises.",
        ],
      },
      { type: "h2", text: "Les pièges à éviter" },
      {
        type: "ul",
        items: [
          "Un devis sans visite technique : sans mesurer les distances ni ouvrir le tableau, un prix n'est qu'une estimation, et le supplément arrive le jour de la pose.",
          "Un installateur non qualifié IRVE : au-delà de 3,7 kW, c'est obligatoire, et c'est aussi une condition de la TVA réduite.",
          "Une borne non pilotable : vous perdez la programmation en heures creuses et la gestion de la puissance.",
          "Une borne surdimensionnée : une 22 kW ne rechargera pas plus vite une voiture limitée à 7,4 ou 11 kW (voir notre guide sur la puissance).",
        ],
      },
      {
        type: "callout",
        text: "Chez CHARGéO, le devis est établi après une visite : distances mesurées, tableau vérifié, abonnement contrôlé. Le prix annoncé après la visite est ferme, sans supplément le jour de la pose.",
      },
      {
        type: "p",
        text: "Vous êtes à Thonon, Évian, Douvaine ou ailleurs dans le Chablais ? L'étude est gratuite.",
      },
    ],
  },
  {
    slug: "monophase-ou-triphase-quelle-puissance-de-borne",
    title: "Monophasé ou triphasé : quelle puissance de borne choisir, 7,4, 11 ou 22 kW ?",
    description:
      "La vitesse de recharge dépend de votre raccordement, de votre abonnement et du chargeur de votre voiture. Le piège du 3,7 kW et le bon choix pour un frontalier du Chablais.",
    date: "2026-10-04",
    readingMinutes: 5,
    category: "Particuliers",
    cover: { src: "/tech-chargeo.webp", alt: "Intervention sur une installation électrique" },
    cta: { label: "Simuler mon installation", href: "/particuliers" },
    blocks: [
      {
        type: "p",
        text: "7,4, 11 ou 22 kW : sur le papier, plus c'est puissant, plus ça recharge vite. Dans la réalité, la vitesse dépend de trois choses : le raccordement de votre maison, votre abonnement et le chargeur intégré à votre voiture. Le moins puissant des trois fixe la limite.",
      },
      { type: "h2", text: "Monophasé ou triphasé : comment savoir ?" },
      {
        type: "p",
        text: "La plupart des maisons sont raccordées en monophasé : une phase et un neutre. Le triphasé amène trois phases ; on le trouve dans certaines maisons, souvent équipées de gros appareils. Pour le savoir, regardez votre facture d'électricité ou votre disjoncteur d'abonnement : deux câbles en entrée pour le monophasé, quatre pour le triphasé.",
      },
      { type: "h2", text: "Ce que chaque raccordement permet" },
      {
        type: "ul",
        items: [
          "Monophasé : jusqu'à 7,4 kW (32 A sur une seule phase). C'est le maximum d'une borne en monophasé, quelle que soit la marque.",
          "Triphasé : 11 kW (16 A sur chacune des trois phases) ou 22 kW (32 A par phase).",
          "L'abonnement compte aussi : en monophasé, il va jusqu'à 12 kVA ; en triphasé, la puissance souscrite est répartie sur les trois phases, si bien qu'un abonnement triphasé de 12 kVA laisse moins de 20 A par phase.",
        ],
      },
      { type: "h2", text: "Le chargeur de la voiture a le dernier mot" },
      {
        type: "p",
        text: "À la maison, la voiture recharge en courant alternatif : c'est son chargeur embarqué qui convertit le courant pour la batterie. Sa puissance figure dans la fiche technique, à la ligne charge AC : souvent 7,4 kW en monophasé et 11 kW en triphasé sur les modèles récents, plus rarement 22 kW.",
      },
      {
        type: "figure",
        src: "/blog/puissance-borne-voiture.svg",
        alt: "Tableau de la puissance réelle de recharge selon la borne et le chargeur de la voiture : une voiture monophasée branchée sur une borne 11 kW triphasée ne recharge qu'à 3,7 kW",
        caption: "La puissance réelle est toujours la plus faible entre celle de la borne et celle de la voiture.",
        width: 720,
        height: 640,
      },
      {
        type: "callout",
        text: "Le piège classique : une voiture dont le chargeur est monophasé, branchée sur une borne 11 kW triphasée, ne recharge qu'à 3,7 kW. La borne ne délivre que 16 A par phase et la voiture n'en utilise qu'une. Sur une borne 7,4 kW monophasée, la même voiture recharge deux fois plus vite.",
      },
      {
        type: "p",
        text: "Pensez aussi au câble si votre borne n'en a pas d'intégré : un câble 3 x 16 A limite la recharge à 3,7 kW sur une borne monophasée, alors qu'un câble 3 x 32 A fonctionne partout.",
      },
      { type: "h2", text: "Le cas du frontalier : Thonon–Genève tous les jours" },
      {
        type: "p",
        text: "Prenons 100 km par jour et une consommation de 18 kWh aux 100 km : il faut remettre environ 18 kWh chaque soir. Une borne 7,4 kW le fait en 2 h 30 à 3 h, une prise renforcée en 5 à 6 h, une borne 11 kW en moins de 2 h. Toutes tiennent largement dans une nuit en heures creuses.",
      },
      {
        type: "p",
        text: "Pour la plupart des frontaliers, une borne 7,4 kW monophasée suffit donc. Le triphasé devient intéressant si la maison l'est déjà, si deux voitures électriques se partagent la borne, ou pour un très gros rouleur.",
      },
      { type: "h2", text: "Faut-il passer en triphasé ?" },
      {
        type: "p",
        text: "Rarement pour la seule recharge. Le passage du monophasé au triphasé se demande à votre fournisseur d'électricité, il est réalisé par Enedis et peut entraîner des travaux sur le branchement et sur le tableau. À l'inverse, si votre maison est déjà en triphasé, une borne 11 kW est souvent le meilleur choix : elle répartit la charge sur les trois phases au lieu de tout faire peser sur une seule.",
      },
      {
        type: "callout",
        text: "Chez CHARGéO, on vérifie votre raccordement, votre abonnement et la fiche technique de votre voiture avant de vous conseiller une puissance. Pas de borne surdimensionnée, pas de coupure le soir.",
      },
    ],
  },
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
          "Le projet est inscrit à l'ordre du jour de l'assemblée générale. Les travaux d'infrastructure se votent à la majorité des voix de tous les copropriétaires (article 25 j de la loi de 1965) ; si le projet a recueilli au moins un tiers des voix, un second vote immédiat à la majorité simple est possible (article 25-1).",
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
