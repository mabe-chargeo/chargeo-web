// Textes des mails de l'appli (Phase 9, lot 2, 05/11/2026). SEULE SOURCE des textes depuis la décision de Mathieu du
// 05/11/2026 à 20 h 57 (« Oui, les textes passent dans l'appli ») : modèles 1 à 8 de la sous-tâche « Créer les modèles
// d'e-mails clients par étape » (rédigés le 02/11, collés dans l'onglet Email, qui reste en secours jusqu'à la fin du
// lot 5, puis sera supprimé avec l'accord de Mathieu).
// 05/11/2026, de 22 h 28 à 22 h 36 (Mathieu : « tu pourrais très bien faire la phrase », « un ton très chaleureux, très
// courtois et poli », texte de la confirmation validé à 22 h 36) : les 8 textes sont réécrits au « nous », puisque le
// mail part au nom de L'équipe CHARGéO. Chaque phrase se construit avec les champs de la fiche ; un champ vide fait
// disparaître ou reformuler la phrase, sans crochet. Il ne reste des [crochets] que là où seule la personne sait quoi
// écrire (créneaux d'un mail « Créneaux » ouvert hors de Caler, date d'une visite pas encore calée). L'envoi reste
// bloqué tant qu'il en reste un. Chaque texte a son vrai objet ; en réponse dans un fil, l'objet devient « RE: » + l'objet
// du fil. Pas de signature ici : celle de Gmail (contact@chargeo.fr) s'ajoute à l'envoi.
// Fichier pur (aucun accès réseau) : lu par l'écriture des mails (EcrireMail), la route /api/interne/mail, Caler et
// l'agenda Google (villeDe).

export type Personne = { nom: string; tel: string; email: string };
// Créneau proposé : jour AAAA-MM-JJ (Paris) et minutes depuis minuit
export type Creneau = { jour: string; minutes: number };
export type Donnees = {
  nomFiche: string;
  commune: string;
  adresse: string;
  email: string;
  telephone: string;
  duree: string;
  dateVisite: number | null;
  acces: string;
  copro: boolean;
  particulier: boolean;
  gestionnaire: Personne | null;
  contactSurPlace: Personne | null;
  // Créneaux choisis dans Caler (mail « Créneaux », relais gestionnaire)
  creneaux?: Creneau[];
};
export type Etape = 'Nouvelle demande' | 'Visite technique';
export const ETAPES: Etape[] = ['Nouvelle demande', 'Visite technique'];
export type Modele = {
  cle: string;
  nom: string;
  court: string;
  etape: Etape;
  // Réponse dans le fil du dernier échange avec la fiche (objet « RE: … ») quand il existe
  reponse: boolean;
  a: (d: Donnees) => string[];
  cc: (d: Donnees) => string[];
  objet: (d: Donnees) => string;
  corps: (d: Donnees) => string;
};

const liste = (...l: (string | null | undefined)[]) => l.map((x) => String(x ?? '').trim()).filter(Boolean);
const majuscule1 = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const sansPoint = (s: string) => String(s || '').trim().replace(/[\s.;,!]+$/, '');
// Lignes du mail : null ou false = ligne retirée ; jamais plus d'une ligne vide de suite
const texteDe = (...l: (string | null | undefined | false)[]) =>
  l.filter((x): x is string => typeof x === 'string').join('\n').replace(/\n{3,}/g, '\n\n').trim();
// Liste à puces : virgule en fin de ligne, point à la dernière
const puces = (l: string[]) => l.map((x, i) => `• ${x}${i === l.length - 1 ? '.' : ','}`);
const bonjour = (qui: string) => (qui ? `Bonjour ${qui},` : 'Bonjour,');

// Adresse sans « , France », et sa commune (« 41 Av. Anna de Noailles, 74500 Évian-les-Bains » → « Évian-les-Bains »)
export const nettoyerAdresse = (a: string) => String(a || '').replace(/,\s*France\s*$/i, '').trim();
export function villeDe(adresse: string): string {
  const m = adresse.match(/\b\d{5}\s+([^,]+)/);
  if (m) return m[1].trim();
  const morceaux = adresse.split(',').map((s) => s.trim()).filter(Boolean);
  return morceaux.length > 1 ? morceaux[morceaux.length - 2] : morceaux[0] || '';
}
const aCommune = (d: Donnees) => (d.commune ? ` à ${d.commune}` : '');

// « +33612345678 » → « 06 12 34 56 78 »
function telLisible(t: string): string {
  const brut = String(t || '').trim();
  const c = brut.replace(/[^\d+]/g, '');
  const n = c.startsWith('+33') ? `0${c.slice(3)}` : c;
  return /^0\d{9}$/.test(n) ? n.replace(/(\d{2})(?=\d)/g, '$1 ') : brut;
}

// « M. Olivier LANÇON » → prénom Olivier, nom LANÇON, Monsieur ; « Florian PIERRU » → civilité inconnue
const CIVILITE = /^(m\.|mr\.?|monsieur|mme\.?|madame|mlle\.?|mademoiselle)\s+/i;
function decouper(nom: string): { prenom: string; famille: string; madame: boolean | null } {
  const t = String(nom || '').trim().replace(/\s+/g, ' ');
  const c = t.match(CIVILITE);
  const reste = c ? t.slice(c[0].length) : t;
  const mots = reste.split(' ').filter(Boolean);
  const enCapitales = (m: string) => m.length > 1 && m === m.toUpperCase() && m !== m.toLowerCase();
  const familles = mots.filter(enCapitales);
  const famille = familles.length ? familles.join(' ') : mots.length > 1 ? mots.slice(1).join(' ') : reste;
  const prenom = familles.length ? mots.filter((m) => !enCapitales(m)).join(' ') : mots.length > 1 ? mots[0] : '';
  return { prenom, famille, madame: c ? /^(mme|madame|mlle|mademoiselle)/i.test(c[1]) : null };
}
// « LANÇON » → « Lançon », « LE BRIS-DUPONT » → « Le Bris-Dupont »
const enNomPropre = (s: string) =>
  String(s || '').toLowerCase().replace(/(^|[\s\-'’])([a-zà-öø-ÿ])/g, (_m: string, avant: string, lettre: string) => avant + lettre.toUpperCase());
// Sigles qui ne sont pas des noms de famille
const SIGLES = /^(TEST|SDC|SCI|ASL|AFUL|SARL|SAS|SASU|EURL|SA|SNC)$/;
// Nom de fiche ou de contact sans « Test · » ni « Lead Site Web : »
const nomPersonne = (s: string) => String(s || '').replace(/^\s*test\s*[·:\-–]\s*/i, '').replace(/^\s*lead site web\s*:\s*/i, '').trim();
// Après « Bonjour » : « Monsieur Lançon » si la civilité est connue, « Olivier Lançon » si le nom suit la règle
// « Prénom NOM » des contacts, sinon rien (le mail commence par « Bonjour, »)
export function vous(nom: string): string {
  const t = nomPersonne(nom).replace(/\s+/g, ' ');
  if (!t || /\d/.test(t)) return '';
  const n = decouper(t);
  if (n.madame !== null) return `${n.madame ? 'Madame' : 'Monsieur'} ${enNomPropre(n.famille)}`;
  const prenomNom = t.split(' ').some((m) => m.length > 1 && m === m.toUpperCase() && m !== m.toLowerCase() && !SIGLES.test(m));
  if (!prenomNom) return '';
  return [n.prenom, enNomPropre(n.famille)].filter(Boolean).join(' ');
}

// Personne à joindre : le contact sur place en copropriété, le client lui-même pour un particulier
function contact(d: Donnees): Personne | null {
  if (d.copro) return d.contactSurPlace;
  if (d.particulier) return { nom: d.nomFiche, tel: d.telephone, email: d.email };
  if (d.contactSurPlace) return { ...d.contactSurPlace, email: d.contactSurPlace.email || d.email, tel: d.contactSurPlace.tel || d.telephone };
  return { nom: '', tel: d.telephone, email: d.email };
}
const salutContact = (d: Donnees) => vous(contact(d)?.nom || '');
const residence = (d: Donnees) => nomPersonne(d.nomFiche).replace(/^\s*(sdc|syndicat des copropriétaires|copropriété|copro)\s+/i, '').trim();
const ccGestionnaire = (d: Donnees) => (d.copro ? liste(d.gestionnaire?.email) : []);
const equipement = (d: Donnees) => (d.copro ? 'au local des compteurs' : 'au tableau électrique');

// Date de visite : « lundi », « lundi 9 novembre », « 15 h » (vide si la date n'a pas d'heure : 0 h ou 4 h)
function visite(d: Donnees): { jour: string; date: string; heure: string; complet: string } | null {
  if (!d.dateVisite) return null;
  const x = new Date(d.dateVisite);
  const jour = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long' }).format(x);
  const date = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' }).format(x);
  const p = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(x);
  const h = p.find((y) => y.type === 'hour')?.value || '00';
  const mi = p.find((y) => y.type === 'minute')?.value || '00';
  const heure = mi === '00' && (h === '00' || h === '04') ? '' : `${Number(h)} h${mi === '00' ? '' : ` ${mi}`}`;
  return { jour, date, heure, complet: heure ? `${date} à ${heure}` : date };
}

// « 1 h » → « une heure », « 1 h 30 » → « une heure trente », « 30 min » → « 30 minutes » ; vide si inconnu
function dureeEnLettres(libelle: string): string {
  const n = String(libelle || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
  const h = n.match(/(\d+)h(\d+)?/);
  const m = n.match(/(\d+)min/);
  const total = h ? Number(h[1]) * 60 + (h[2] ? Number(h[2]) : 0) : m ? Number(m[1]) : 0;
  if (!total) return '';
  if (total < 60) return `${total} minutes`;
  const heures = Math.floor(total / 60);
  const reste = total % 60;
  const MOTS = ['', 'une', 'deux', 'trois', 'quatre'];
  const libelleHeures = heures < MOTS.length ? `${MOTS[heures]} heure${heures > 1 ? 's' : ''}` : `${heures} heures`;
  return reste === 0 ? libelleHeures : reste === 30 ? `${libelleHeures} trente` : `${libelleHeures} ${reste}`;
}

// Créneau proposé en clair : « lundi 9 novembre à 15 h » (« à 14 h 30 »)
function creneauEnClair(c: Creneau): string {
  const [a, mo, j] = String(c.jour).split('-').map(Number);
  const date = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(Date.UTC(a, mo - 1, j, 12)));
  const h = Math.floor(c.minutes / 60);
  const mi = c.minutes % 60;
  return `${date} à ${h} h${mi ? ` ${String(mi).padStart(2, '0')}` : ''}`;
}

export const MODELES: Modele[] = [
  {
    cle: 'prise-en-charge',
    nom: 'Prise en charge',
    court: 'Prise en charge',
    etape: 'Nouvelle demande',
    reponse: false,
    a: (d) => liste(d.email),
    cc: () => [],
    objet: (d) => `Votre projet de recharge${aCommune(d)} : demande bien reçue`,
    corps: (d) => {
      const tel = telLisible(contact(d)?.tel || d.telephone);
      const duree = dureeEnLettres(d.duree);
      return texteDe(
        bonjour(salutContact(d)),
        '',
        'Merci beaucoup pour votre demande et pour la confiance que vous accordez à CHARGéO.',
        '',
        `Nous l'avons bien reçue et nous nous occupons avec plaisir de votre projet de recharge${aCommune(d)}. ${tel ? `Nous vous appellerons très prochainement au ${tel}` : 'Nous reviendrons très prochainement vers vous'} pour convenir ensemble d'une visite technique. Gratuite, elle ${duree ? `dure environ ${duree} et ` : ''}nous permet de vous remettre un prix ferme, adapté à votre installation.`,
        '',
        "D'ici là, nous restons bien sûr à votre entière disposition, par simple retour de mail.",
        '',
        'Bien cordialement,',
      );
    },
  },
  {
    cle: 'prise-en-charge-gestionnaire',
    nom: 'Prise en charge · gestionnaire',
    court: 'Gestionnaire',
    etape: 'Nouvelle demande',
    reponse: true,
    a: (d) => liste(d.gestionnaire?.email),
    cc: () => [],
    objet: (d) => (residence(d) ? `${residence(d)} : votre demande de bornes de recharge` : 'Votre demande de bornes de recharge'),
    corps: (d) => {
      const res = residence(d);
      const surPlace = vous(d.contactSurPlace?.nom || '');
      return texteDe(
        bonjour(vous(d.gestionnaire?.nom || '')),
        '',
        `Merci beaucoup pour votre message et pour votre confiance${res ? ` concernant ${res}` : ''}.`,
        '',
        `Nous prenons le dossier en main avec plaisir : nous allons prendre contact très prochainement avec ${surPlace || 'la personne référente sur place'} pour organiser la visite technique, puis nous reviendrons vers vous avec notre proposition.`,
        '',
        'Si vous avez sous la main le nombre de places et la date du permis de construire de la résidence, ils nous seront précieux pour préparer la visite.',
        '',
        'Nous restons à votre entière disposition.',
        '',
        'Bien cordialement,',
      );
    },
  },
  {
    cle: 'hors-zone',
    nom: 'Hors zone',
    court: 'Hors zone',
    etape: 'Nouvelle demande',
    reponse: true,
    a: (d) => liste(d.email || contact(d)?.email),
    cc: () => [],
    objet: (d) => `Votre projet de recharge${aCommune(d)}`,
    corps: (d) =>
      texteDe(
        bonjour(salutContact(d)),
        '',
        "Merci beaucoup pour votre demande et pour l'intérêt que vous portez à CHARGéO.",
        '',
        `${d.commune ? `${majuscule1(d.commune)} se situe` : 'Votre adresse se situe'} malheureusement en dehors de notre zone d'intervention : nous ne pourrions pas vous garantir un suivi à la hauteur de vos attentes, de la visite jusqu'au service après-vente, et nous préférons vous le dire en toute transparence.`,
        '',
        "Vous trouverez des installateurs qualifiés IRVE près de chez vous sur l'annuaire du programme Advenir (advenir.mobi).",
        '',
        'Nous vous souhaitons une très belle réussite dans votre projet.',
        '',
        'Bien cordialement,',
      ),
  },
  {
    cle: 'visite-creneaux',
    nom: 'Visite · créneaux',
    court: 'Créneaux',
    etape: 'Visite technique',
    reponse: false,
    a: (d) => liste(contact(d)?.email),
    cc: ccGestionnaire,
    objet: (d) => `Votre visite technique${aCommune(d)} : nos créneaux disponibles`,
    corps: (d) => {
      const res = residence(d);
      const gestionnaire = vous(d.gestionnaire?.nom || '');
      const duree = dureeEnLettres(d.duree);
      const creneaux = (d.creneaux || []).slice(0, 5);
      const intro = d.copro && gestionnaire ? `${gestionnaire} nous a transmis votre projet de bornes de recharge${res ? ` pour ${res}` : ''}, et nous l'en remercions.` : null;
      return texteDe(
        bonjour(salutContact(d)),
        '',
        intro,
        intro ? '' : null,
        'Nous avons essayé de vous joindre par téléphone, sans succès : nous nous permettons donc de vous écrire.',
        '',
        `Nous serions ravis de venir réaliser la visite technique${d.adresse ? ` au ${d.adresse}` : ''}${duree ? `, pour une durée d'environ ${duree}` : ''}. Voici les créneaux que nous pouvons vous proposer :`,
        ...(creneaux.length ? creneaux.map((c) => `• ${creneauEnClair(c)}`) : ['• [jour, date et heure]', '• [jour, date et heure]', '• [jour, date et heure]']),
        '',
        `Lors de la visite, nous aurons besoin d'accéder ${d.copro ? 'au parking et au local des compteurs' : "au tableau électrique et à l'emplacement prévu pour la borne"}.${d.copro ? " Si vous l'avez, la date du permis de construire de la résidence nous sera également très utile : elle conditionne la prime Advenir." : ''}`,
        '',
        'Il vous suffit de nous indiquer le créneau qui vous convient le mieux, par retour de mail ou par téléphone. Si aucun ne vous arrange, nous trouverons volontiers une autre date ensemble.',
        '',
        'Bien cordialement,',
      );
    },
  },
  {
    cle: 'visite-relais-gestionnaire',
    nom: 'Visite · relais gestionnaire',
    court: 'Relais gestionnaire',
    etape: 'Visite technique',
    reponse: true,
    a: (d) => liste(d.gestionnaire?.email),
    cc: () => [],
    objet: (d) => (residence(d) ? `${residence(d)} : organisation de la visite technique` : 'Organisation de la visite technique'),
    corps: (d) => {
      const res = residence(d);
      const surPlace = vous(d.contactSurPlace?.nom || '');
      const creneaux = (d.creneaux || []).slice(0, 5);
      return texteDe(
        bonjour(vous(d.gestionnaire?.nom || '')),
        '',
        'Nous espérons que vous allez bien.',
        '',
        `Malgré plusieurs tentatives par téléphone et par mail, nous ne parvenons pas à joindre ${surPlace || 'la personne référente sur place'} pour organiser la visite technique${res ? ` de ${res}` : ''}.`,
        '',
        'Pourriez-vous avoir la gentillesse de lui transmettre notre message, ou de nous indiquer avec qui organiser cette visite ?',
        '',
        ...(creneaux.length ? ["Nous pouvons venir sur l'un de ces créneaux :", ...creneaux.map((c) => `• ${creneauEnClair(c)}`)] : ['Nous restons très souples sur les dates et les horaires.']),
        '',
        'Merci beaucoup pour votre aide.',
        '',
        'Bien cordialement,',
      );
    },
  },
  {
    cle: 'visite-confirmation',
    nom: 'Visite · confirmation',
    court: 'Confirmation',
    etape: 'Visite technique',
    reponse: true,
    a: (d) => liste(contact(d)?.email),
    cc: ccGestionnaire,
    objet: (d) => {
      const v = visite(d);
      return v ? `Votre visite technique du ${v.complet}` : 'Confirmation de votre visite technique';
    },
    corps: (d) => {
      const v = visite(d);
      const duree = dureeEnLettres(d.duree);
      const acces = sansPoint(d.acces);
      return texteDe(
        bonjour(salutContact(d)),
        '',
        'Merci beaucoup pour votre confiance et pour le temps que vous nous avez accordé au téléphone.',
        '',
        'Nous avons le plaisir de vous confirmer notre visite technique :',
        ...puces(liste(v ? `le ${v.complet}` : '[jour, date et heure de la visite]', d.adresse ? `au ${d.adresse}` : '', duree ? `pour une durée d'environ ${duree}` : '')),
        '',
        `Pour que tout se passe au mieux, pourriez-vous prévoir l'accès ${equipement(d)}, ainsi que la présence d'une personne sur place ?${acces ? ` Nous avons bien noté pour l'accès : ${acces}.` : ''}`,
        '',
        "Si un imprévu survenait, n'hésitez surtout pas à nous le dire par simple retour de mail : nous trouverons volontiers une autre date.",
        '',
        v ? `Au plaisir de vous rencontrer ${v.jour},` : 'Au plaisir de vous rencontrer très prochainement,',
      );
    },
  },
  {
    cle: 'visite-rappel-veille',
    nom: 'Visite · rappel de la veille',
    court: 'Rappel de la veille',
    etape: 'Visite technique',
    reponse: true,
    a: (d) => liste(contact(d)?.email),
    cc: ccGestionnaire,
    objet: (d) => {
      const v = visite(d);
      return `Petit rappel : votre visite technique de demain${v?.heure ? ` à ${v.heure}` : ''}`;
    },
    corps: (d) => {
      const v = visite(d);
      const duree = dureeEnLettres(d.duree);
      const acces = sansPoint(d.acces);
      const details = liste(v ? v.complet : '', d.adresse ? `au ${d.adresse}` : '', duree ? `pour une durée d'environ ${duree}` : '').join(', ');
      return texteDe(
        bonjour(salutContact(d)),
        '',
        'Nous espérons que vous allez bien.',
        '',
        `Nous nous permettons de vous rappeler notre visite technique de demain${details ? `, ${details}` : ''}.`,
        '',
        `${acces ? `Nous avons bien noté pour l'accès : ${acces}. ` : ''}Pourriez-vous simplement prévoir l'accès ${equipement(d)}, ainsi que la présence d'une personne sur place ?`,
        '',
        "Si un imprévu survenait, n'hésitez surtout pas à nous prévenir par simple retour de mail.",
        '',
        'Au plaisir de vous rencontrer demain,',
      );
    },
  },
  {
    cle: 'visite-deplacee',
    nom: 'Visite · déplacée',
    court: 'Visite déplacée',
    etape: 'Visite technique',
    reponse: true,
    a: (d) => liste(contact(d)?.email),
    cc: ccGestionnaire,
    objet: (d) => {
      const v = visite(d);
      return v ? `Nouvelle date pour votre visite technique : ${v.complet}` : 'Nouvelle date pour votre visite technique';
    },
    corps: (d) => {
      const v = visite(d);
      const duree = dureeEnLettres(d.duree);
      const acces = sansPoint(d.acces);
      return texteDe(
        bonjour(salutContact(d)),
        '',
        'Merci beaucoup pour votre compréhension.',
        '',
        'Comme convenu, nous avons le plaisir de vous confirmer la nouvelle date de notre visite technique :',
        ...puces(liste(v ? `le ${v.complet}` : '[nouvelle date et heure de la visite]', d.adresse ? `au ${d.adresse}` : '', duree ? `pour une durée d'environ ${duree}` : '')),
        '',
        acces
          ? `Rien ne change pour l'accès : ${acces}.`
          : `Pourriez-vous prévoir l'accès ${equipement(d)}, ainsi que la présence d'une personne sur place ?`,
        '',
        "Si un nouvel imprévu survenait, n'hésitez surtout pas à nous le dire : nous trouverons volontiers une autre solution.",
        '',
        v ? `Au plaisir de vous rencontrer ${v.jour},` : 'Au plaisir de vous rencontrer très prochainement,',
      );
    },
  },
];

export const modeleDe = (cle: string | null | undefined) => MODELES.find((m) => m.cle === cle);

// Mail rempli avec la fiche : destinataires (la copie sans ceux déjà en « À »), objet, texte
export function remplir(m: Modele, d: Donnees): { a: string[]; cc: string[]; objet: string; corps: string } {
  const a = m.a(d);
  return { a, cc: m.cc(d).filter((x) => !a.includes(x)), objet: m.objet(d), corps: m.corps(d) };
}

// Page blanche : « Bonjour » suivi du nom quand la fiche le donne
export function pageBlanche(d: Donnees): string {
  return `${bonjour(vous(contact(d)?.nom || ''))}\n\n\nBien cordialement,`;
}

// Objet d'une réponse : « RE: » + l'objet du fil, sans les RE:/TR: déjà présents ni le [TEST] des mails de préversion.
// Fil sans objet : l'objet de repli (celui du texte).
export function objetReponse(objetFil: string, repli = ''): string {
  let t = String(objetFil || '').trim();
  for (let i = 0; i < 6; i++) {
    const n = t.replace(/^(re|tr|fwd?|aw)\s*:\s*/i, '').replace(/^\[test\]\s*/i, '');
    if (n === t) break;
    t = n;
  }
  return t ? `RE: ${t}` : repli;
}
