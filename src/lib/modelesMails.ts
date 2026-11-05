// Textes des mails de l'appli (Phase 9, lot 2, 05/11/2026). SEULE SOURCE des textes depuis la décision de Mathieu du
// 05/11/2026 à 20 h 57 (« Oui, les textes passent dans l'appli ») : modèles 1 à 8 de la sous-tâche « Créer les modèles
// d'e-mails clients par étape » (rédigés le 02/11, collés dans l'onglet Email, qui reste en secours jusqu'à la fin du
// lot 5, puis sera supprimé avec l'accord de Mathieu).
// L'appli remplit ce que la fiche contient déjà. Le reste reste entre [crochets], et l'envoi est bloqué tant qu'il reste
// un « [ » (règle commune des modèles). Pas de signature ici : celle de Gmail (contact@chargeo.fr) s'ajoute à l'envoi.
// Fichier pur (aucun accès réseau) : lu par l'écran /mail, par la route /api/interne/mail et par Caler (villeDe).

export type Personne = { nom: string; tel: string; email: string };
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

const OBJET_FIL = 'RE: [objet exact du fil]';
const ou = (v: string | null | undefined, repli: string) => {
  const t = String(v ?? '').trim();
  return t || `[${repli}]`;
};
const liste = (...l: (string | null | undefined)[]) => l.map((x) => String(x ?? '').trim()).filter(Boolean);
const majuscule1 = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Adresse sans « , France », et sa commune (« 41 Av. Anna de Noailles, 74500 Évian-les-Bains » → « Évian-les-Bains »)
export const nettoyerAdresse = (a: string) => String(a || '').replace(/,\s*France\s*$/i, '').trim();
export function villeDe(adresse: string): string {
  const m = adresse.match(/\b\d{5}\s+([^,]+)/);
  if (m) return m[1].trim();
  const morceaux = adresse.split(',').map((s) => s.trim()).filter(Boolean);
  return morceaux.length > 1 ? morceaux[morceaux.length - 2] : morceaux[0] || '';
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
// Vouvoiement : « Monsieur LANÇON » si la civilité est connue, sinon « [Madame / Monsieur] PIERRU » à trancher
export function vous(nom: string): string {
  if (!String(nom || '').trim()) return '[Madame / Monsieur Nom]';
  const n = decouper(nom);
  return n.madame === null ? `[Madame / Monsieur] ${n.famille}` : `${n.madame ? 'Madame' : 'Monsieur'} ${n.famille}`;
}
// Gestionnaire : prénom (s'il tutoie) ou civilité et nom, à trancher
function salutGestionnaire(p: Personne | null): string {
  if (!p?.nom) return '[Prénom ou Madame / Monsieur Nom]';
  const n = decouper(p.nom);
  const civ = n.madame === null ? 'Madame / Monsieur' : n.madame ? 'Madame' : 'Monsieur';
  if (!n.prenom) return n.madame === null ? `[${civ}] ${n.famille}` : `${civ} ${n.famille}`;
  return `[${n.prenom} ou ${civ} ${n.famille}]`;
}

// Personne à joindre : le contact sur place en copropriété, le client lui-même pour un particulier
function contact(d: Donnees): Personne | null {
  if (d.copro) return d.contactSurPlace;
  if (d.particulier) return { nom: d.nomFiche, tel: d.telephone, email: d.email };
  if (d.contactSurPlace) return { ...d.contactSurPlace, email: d.contactSurPlace.email || d.email, tel: d.contactSurPlace.tel || d.telephone };
  return { nom: '', tel: d.telephone, email: d.email };
}
const salutContact = (d: Donnees) => vous(contact(d)?.nom || '');
const residence = (d: Donnees) => d.nomFiche.replace(/^\s*(sdc|syndicat des copropriétaires|copropriété|copro)\s+/i, '').trim();
const ccGestionnaire = (d: Donnees) => (d.copro ? liste(d.gestionnaire?.email) : []);

// Date de visite : « jeudi », « jeudi 12 novembre », « 14 h 30 » (vide si la date n'a pas d'heure : 0 h ou 4 h)
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

export const MODELES: Modele[] = [
  {
    cle: 'prise-en-charge',
    nom: 'Prise en charge',
    court: 'Prise en charge',
    etape: 'Nouvelle demande',
    reponse: false,
    a: (d) => liste(d.email),
    cc: () => [],
    objet: (d) => `Votre projet de recharge à ${ou(d.commune, 'commune')} : prise en charge`,
    corps: (d) =>
      [
        `Bonjour ${salutContact(d)},`,
        '',
        "J'ai bien lu votre demande pour [le besoin en une phrase, avec ses mots : la borne de votre maison, votre place n° x…].",
        '',
        '[Réponse courte à la question posée dans la demande. Sinon, supprimer la ligne.]',
        '',
        `Je vous appelle [jour] au ${ou(contact(d)?.tel || d.telephone, '📞 Telephone')} pour fixer la visite technique. Elle est gratuite, dure environ ${ou(d.duree, '⏳ Durée relevé')} et nous permet de vous remettre un prix ferme.`,
        '',
        'Bonne journée,',
      ].join('\n'),
  },
  {
    cle: 'prise-en-charge-gestionnaire',
    nom: 'Prise en charge · gestionnaire',
    court: 'Gestionnaire',
    etape: 'Nouvelle demande',
    reponse: true,
    a: (d) => liste(d.gestionnaire?.email),
    cc: () => [],
    objet: () => OBJET_FIL,
    corps: (d) =>
      [
        `Bonjour ${salutGestionnaire(d.gestionnaire)},`,
        '',
        `Bien reçu pour ${ou(residence(d), 'nom de la résidence')}, merci.`,
        '',
        `J'appelle ${ou(d.contactSurPlace?.nom, '📍 Contact sur place')} [jour] pour organiser la visite technique, puis je reviens vers vous avec notre proposition.`,
        '',
        "[Optionnel : Pour préparer la visite, il me manque [nombre de places / date du permis de construire / accès au local électrique] : si vous l'avez sous la main, ça m'aidera.]",
        '',
        'Bonne journée,',
      ].join('\n'),
  },
  {
    cle: 'hors-zone',
    nom: 'Hors zone',
    court: 'Hors zone',
    etape: 'Nouvelle demande',
    reponse: true,
    a: (d) => liste(d.email || contact(d)?.email),
    cc: () => [],
    objet: (d) => `Votre projet de recharge à ${ou(d.commune, 'commune')}`,
    corps: (d) =>
      [
        `Bonjour ${salutContact(d)},`,
        '',
        `Merci pour votre demande pour [le besoin]. ${ou(d.commune, 'Commune')} est en dehors de notre zone d'intervention : nous ne pourrions pas vous assurer un suivi correct, de la visite au SAV, et je préfère vous le dire tout de suite.`,
        '',
        "[Optionnel : Vous trouverez des installateurs qualifiés IRVE près de chez vous sur l'annuaire du programme Advenir.]",
        '',
        'Bonne continuation dans votre projet,',
      ].join('\n'),
  },
  {
    cle: 'visite-creneaux',
    nom: 'Visite · créneaux',
    court: 'Créneaux',
    etape: 'Visite technique',
    reponse: false,
    a: (d) => liste(contact(d)?.email),
    cc: ccGestionnaire,
    objet: (d) => `${ou(d.nomFiche, 'nom de la fiche')} : visite technique pour votre projet de recharge`,
    corps: (d) => {
      const intro = !d.copro
        ? ''
        : d.gestionnaire?.nom
          ? `${d.gestionnaire.nom} m'a transmis votre projet de bornes de recharge pour ${ou(residence(d), 'nom de la résidence')}. `
          : "[Si le contact vient d'un gestionnaire : [👔 Gestionnaire] m'a transmis votre projet de bornes de recharge pour [nom de la résidence].] ";
      return [
        `Bonjour ${salutContact(d)},`,
        '',
        `${intro}J'ai essayé de vous joindre [aujourd'hui / ce matin], sans succès.`,
        '',
        `Je vous propose une visite technique d'environ ${ou(d.duree, '⏳ Durée relevé')} au ${ou(d.adresse, '📍 Adresse')}, sur l'un de ces créneaux :`,
        '[jour date, heure ou fenêtre de 30 min]',
        '[jour date, heure ou fenêtre de 30 min]',
        '[jour date, heure ou fenêtre de 30 min]',
        '',
        "Il me faudra l'accès [à votre place / au parking] et au [tableau électrique / local des compteurs].",
        "[Optionnel : Si vous l'avez, [nombre de places / date du permis de construire, qui conditionne la prime Advenir] me sera utile.]",
        '',
        'Dites-moi le créneau qui vous convient, par retour de mail ou en me rappelant.',
        '',
        'Bonne journée,',
      ].join('\n');
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
    objet: () => OBJET_FIL,
    corps: (d) =>
      [
        `Bonjour ${salutGestionnaire(d.gestionnaire)},`,
        '',
        `Je n'arrive pas à joindre ${ou(d.contactSurPlace?.nom, '📍 Contact sur place')} pour la visite de ${ou(residence(d), 'nom de la résidence')} : appels le [date] et le [date], mail le [date], sans réponse.`,
        '',
        'Pourriez-vous le prévenir, ou me dire avec qui organiser la visite ? Je peux venir [2 ou 3 créneaux].',
        '',
        'Bonne journée,',
      ].join('\n'),
  },
  {
    cle: 'visite-confirmation',
    nom: 'Visite · confirmation',
    court: 'Confirmation',
    etape: 'Visite technique',
    reponse: true,
    a: (d) => liste(contact(d)?.email),
    cc: ccGestionnaire,
    objet: () => OBJET_FIL,
    corps: (d) => {
      const v = visite(d);
      return [
        `Bonjour ${salutContact(d)},`,
        '',
        'Je vous confirme la visite technique :',
        ou(v ? majuscule1(v.complet) : '', '📅 Date Visite Technique : jour, date et heure'),
        ou(d.adresse, '📍 Adresse ou 🏗️ Lieu du chantier'),
        `Durée : environ ${ou(d.duree, '⏳ Durée relevé')}`,
        '',
        `Merci de prévoir ${ou(d.acces, '🔑 Accès site : clé, badge, code')}, l'accès au [tableau électrique / local des compteurs] et quelqu'un sur place.`,
        "[Optionnel : Si vous l'avez d'ici là : [information encore manquante].]",
        '',
        "En cas d'empêchement, prévenez-moi par retour de mail et nous fixerons une autre date.",
        '',
        `À ${ou(v?.jour, 'jour')},`,
      ].join('\n');
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
    objet: () => OBJET_FIL,
    corps: (d) => {
      const v = visite(d);
      return [
        `Bonjour ${salutContact(d)},`,
        '',
        `Petit rappel : je passe demain ${ou(v?.date, 'jour')} à ${ou(v?.heure, 'heure')} au ${ou(d.adresse, '📍 Adresse')} pour la visite technique, pour environ ${ou(d.duree, '⏳ Durée relevé')}.`,
        '',
        d.acces ? `Pour l'accès : ${d.acces}.` : "[Rappel de l'accès : badge, clé, local électrique, personne sur place.]",
        '',
        'À demain,',
      ].join('\n');
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
    objet: () => OBJET_FIL,
    corps: (d) => {
      const v = visite(d);
      return [
        `Bonjour ${salutContact(d)},`,
        '',
        `Comme convenu, la visite technique est déplacée au ${ou(v?.complet, 'nouvelle 📅 Date Visite Technique : jour, date et heure')}, au ${ou(d.adresse, '📍 Adresse')}, pour environ ${ou(d.duree, '⏳ Durée relevé')}.`,
        '',
        `Le reste ne change pas : ${ou(d.acces, 'accès à prévoir')}.`,
        '',
        `À ${ou(v?.jour, 'jour')},`,
      ].join('\n');
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
  const nom = contact(d)?.nom || '';
  return `Bonjour${nom ? ` ${vous(nom)}` : ''},\n\n\nÀ bientôt,`;
}

// Objet d'une réponse : « RE: » + l'objet du fil, sans les RE:/TR: déjà présents ni le [TEST] des mails de préversion
export function objetReponse(objetFil: string): string {
  let t = String(objetFil || '').trim();
  for (let i = 0; i < 6; i++) {
    const n = t.replace(/^(re|tr|fwd?|aw)\s*:\s*/i, '').replace(/^\[test\]\s*/i, '');
    if (n === t) break;
    t = n;
  }
  return t ? `RE: ${t}` : OBJET_FIL;
}
