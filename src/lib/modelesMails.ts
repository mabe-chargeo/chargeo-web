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
// 06/11/2026 (Phase 9, lot 3 ; décisions de Mathieu à 18 h 30, 18 h 34 et 21 h 16) : texte « Devis · envoi », ouvert par
// le bouton « ✉️ Envoyer le devis » de la fiche. Il reprend les modèles 9 à 16 du 02/11 (un par segment, plus l'AMO
// seul) en un seul texte qui suit le segment de la fiche, réécrit au « nous » sur le même ton. Chaque devis finalisé
// est lu dans Costructor (src/lib/devisScenarios.ts) : n°, HT, TTC, TVA, lien de signature en ligne et date de
// validité. La brochure projet déposée sur la fiche part en pièce jointe et le texte l'annonce (« il faut également que
// le modèle de mail annonce la présence de la brochure », 21 h 16). Prime ADVENIR : jamais de montant ici, le montant
// estimé et le reste à charge sont dans la brochure et le devis. Crochets restants : la recommandation entre plusieurs
// scénarios (seul le commercial la connaît) et une donnée que Costructor ne donne pas.
// 06/11/2026 (suite du lot 3) : texte « Devis · validé », écrit au passage en 🏆 gagné (Suite de la vente). Il remplace
// les 6 modèles 25 a à 25 f du 03/11 (« un modèle par cas », décision de Mathieu à 9 h 27) par un seul texte : le cas
// suit le segment et le devis du scénario retenu. Acompte = 50 % du TTC lu dans Costructor (conditions de paiement
// standard). Réponse dans le fil du mail d'envoi des devis. En PAR, toujours Advenir (Mathieu, 06/11 à 22 h 17 : pas de
// prise renforcée partagée).
// 06/11/2026 (lot 4, accord de Mathieu à 22 h 20) : « Devis · relance » et « Devis · dernière relance » (modèles 17 et
// 18 du 02/11), posés à la date de relance par le contrôle quotidien (src/lib/relancesDevis.ts). Lien et validité des
// devis lus dans Costructor ; la relance garde un crochet pour la phrase utile, que seul le commercial peut écrire
// (jamais une relance « pour relancer »).
// 06/11/2026 (lot 4, accord de Mathieu à 22 h 34) : « Refus du client » (modèle 21 du 02/11), écrit au passage en
// ❌ perdu (Suite de la vente), avec une phrase selon le ⛔ Motif Refus choisi. Le motif est toujours donné au perdu :
// la ligne qui le demandait au client n'a plus lieu d'être.
// Fichier pur (aucun accès réseau) : lu par l'écriture des mails (EcrireMail), la route /api/interne/mail, Caler et
// l'agenda Google (villeDe).

export type Personne = { nom: string; tel: string; email: string };
// Créneau proposé : jour AAAA-MM-JJ (Paris) et minutes depuis minuit
export type Creneau = { jour: string; minutes: number };
// Devis finalisé lu dans Costructor pour le mail d'envoi (src/lib/devisScenarios.ts, devisPourMail)
export type DevisMail = {
  scenario: string; // nom du scénario ClickUp
  numero: string;
  nom: string; // nom du devis dans Costructor (« … · Scénario A · SG · Borne 7,4 kW », donné par le brief)
  ht: number;
  ttc: number | null;
  tva: string; // « 5,5 % », « 10 % », « 20 % » ou '' si inconnue
  lien: string; // page client Costructor (consultation et signature en ligne), '' si introuvable
  expire: string; // AAAA-MM-JJ, '' si inconnue
  amo: boolean;
  tarifType: boolean;
};
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
  // Lot 3 (06/11) : segment de la fiche (RES, DAP, COP, PAR, RIC, FLT, TER), devis finalisés, brochure projet sur la fiche
  segment?: string;
  devis?: DevisMail[];
  brochure?: boolean;
  // Nom du scénario retenu au gagné (mail « Devis · validé »), donné par l'écran
  retenu?: string;
  // ⛔ Motif Refus choisi au perdu (mail « Refus du client »), donné par l'écran
  motif?: string;
};
export type Etape = 'Nouvelle demande' | 'Visite technique' | 'Devis';
// Étapes proposées sur la page blanche du bloc Contact. Les mails de devis s'écrivent depuis la Suite de la vente, avec
// leurs données Costructor : ils ne sont pas dans cette liste.
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
const minuscule1 = (s: string) => (s && !/^[A-ZÀ-Ý]{2}/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const sansPoint = (s: string) => String(s || '').trim().replace(/[\s.;,!]+$/, '');
const sansAccents = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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

// ── Envoi du devis (lot 3, 06/11) ──
const euros = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
// « 2026-12-06 » → « 6 décembre 2026 »
function dateLongue(jour: string): string {
  const [a, mo, j] = String(jour || '').slice(0, 10).split('-').map(Number);
  if (!a || !mo || !j) return '';
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(a, mo - 1, j, 12)));
}
// Nom donné par le brief (src/lib/briefSaisie.ts, nomDevis) : « [fiche ·] Scénario A · SG · Borne 7,4 kW »
function morceauxDevis(x: DevisMail): { lettre: string; source: string; materiel: string } {
  const parts = String(x.nom || '').split('·').map((s) => s.trim()).filter(Boolean);
  const i = parts.findIndex((p) => /^sc[ée]nario\s+[a-z0-9]+$/i.test(p));
  const lettre = i >= 0 ? parts[i] : (String(x.scenario || '').match(/Sc[ée]nario\s+[A-Za-z0-9]+/)?.[0] || '');
  return { lettre, source: i >= 0 ? parts[i + 1] || '' : '', materiel: i >= 0 ? parts.slice(i + 2).join(' · ') : '' };
}
const SOURCES: Record<string, string> = {
  SG: 'sur les services généraux de la copropriété',
  Tableau: 'sur votre tableau électrique',
  'PDL dédié': 'sur un point de livraison dédié',
  'Colonne Enedis': 'au compteur Linky de votre place',
  'Infra CHARGéO': "sur l'infrastructure collective de la résidence",
};
const estPrise = (x: DevisMail) => /prise/i.test(morceauxDevis(x).materiel);
// « Infra 30 places » → « infrastructure collective de 30 places » ; « 2 bornes 22 kW » → accord au pluriel
function descriptionDevis(x: DevisMail): string {
  const m = morceauxDevis(x);
  const infra = m.materiel.match(/^infra\s+(.+)$/i);
  const quoi = infra ? `infrastructure collective de ${infra[1]}` : minuscule1(m.materiel);
  const pluriel = /^\d+\s/.test(m.materiel) && !/^1\s/.test(m.materiel) && !infra;
  const ou = SOURCES[m.source] ? `, raccordée${pluriel ? 's' : ''} ${SOURCES[m.source]}` : '';
  return quoi ? `${quoi}${ou}` : String(x.scenario || '').replace(/^Sc[ée]nario\s+[A-Za-z0-9]+\s*:\s*/, '');
}
function blocDevis(x: DevisMail): string[] {
  const montant = `${euros(x.ht)} HT, soit ${x.ttc !== null ? euros(x.ttc) : '[montant TTC]'} TTC${x.tva ? ` (TVA ${x.tva})` : ''}`;
  const num = x.numero ? `, devis n° ${x.numero}` : '';
  const lien = x.lien || `[lien de signature en ligne du devis${x.numero ? ` ${x.numero}` : ''}, à copier depuis Costructor]`;
  if (x.amo) {
    const colonne = /colonne/i.test(x.nom);
    return [
      `• Assistance Enedis pour ${colonne ? 'la colonne électrique horizontale' : 'la création du point de livraison dédié'} : ${montant}${num}`,
      colonne
        ? "  Enedis réalise ensuite la colonne ; chaque résident recevra son propre devis pour sa borne, raccordée au compteur Linky de sa place."
        : "  La contribution de raccordement fera l'objet d'un devis séparé, émis directement par Enedis.",
      `  À consulter et à signer en ligne : ${lien}`,
    ];
  }
  if (x.tarifType) {
    return [
      `• Tarif type de raccordement d'un résident, pour l'assemblée générale : ${montant}${num}`,
      "  Ce tarif n'est pas une commande : chaque résident recevra son propre devis, ajusté à sa place.",
      `  À consulter en ligne : ${lien}`,
    ];
  }
  const m = morceauxDevis(x);
  return [
    `• ${m.lettre ? `${m.lettre} : ` : ''}${descriptionDevis(x)}`,
    `  ${montant}${num}`,
    `  À consulter et à signer en ligne : ${lien}`,
  ];
}
// Destinataires : le gestionnaire en COP et PAR (copie au contact sur place), le client sinon
function destinatairesDevis(d: Donnees): { a: string[]; cc: string[] } {
  if (d.segment === 'COP' || d.segment === 'PAR') {
    const a = liste(d.gestionnaire?.email || d.email || d.contactSurPlace?.email);
    return { a, cc: liste(d.contactSurPlace?.email).filter((x) => !a.includes(x)) };
  }
  return { a: liste(d.email || contact(d)?.email), cc: [] };
}
function salutDevis(d: Donnees): string {
  if (d.segment === 'COP' || d.segment === 'PAR') return vous(d.gestionnaire?.nom || '') || salutContact(d);
  return salutContact(d);
}
function objetDevis(d: Donnees): string {
  const l = d.devis || [];
  const combien = l.length > 1 ? `nos ${l.length} devis` : 'notre devis';
  const res = residence(d);
  if (l.length && l.every((x) => x.amo)) return `Votre raccordement Enedis${aCommune(d)} : notre devis d'assistance`;
  if (d.segment === 'COP') return `${res ? `${res} : ` : ''}${combien} pour l'infrastructure de recharge`;
  if (d.segment === 'PAR') return `${res ? `${res} : ` : ''}${combien} pour les bornes de recharge partagées`;
  if (d.segment === 'FLT') return `La recharge de votre flotte : ${combien}`;
  if (d.segment === 'TER') return `La recharge pour vos clients : ${combien}`;
  return `Votre projet de recharge${aCommune(d)} : ${combien}`;
}
function corpsDevis(d: Donnees): string {
  const seg = d.segment || '';
  const l = d.devis || [];
  const amo = l.filter((x) => x.amo);
  const types = l.filter((x) => x.tarifType && !x.amo);
  const travaux = l.filter((x) => !x.amo && !x.tarifType);
  const plusieurs = l.length > 1;
  const copro = seg === 'COP' || seg === 'PAR';
  const v = visite(d);
  const res = residence(d);
  const prises = travaux.filter(estPrise);
  const bornes = travaux.filter((x) => !estPrise(x));
  const surSg = (x: DevisMail) => morceauxDevis(x).source === 'SG';

  const quoi = l.length && l.every((x) => x.amo)
    ? "notre devis d'assistance pour vos démarches auprès d'Enedis"
    : seg === 'RES' ? `${plusieurs ? 'nos propositions' : 'notre proposition'} pour recharger votre véhicule chez vous`
      : seg === 'DAP' ? `${plusieurs ? 'nos propositions' : 'notre proposition'} pour recharger votre véhicule sur votre place, dans votre copropriété`
        : seg === 'RIC' ? `notre devis pour votre point de recharge${aCommune(d)}`
          : seg === 'COP' ? `notre dossier pour équiper ${res || 'la copropriété'} d'une infrastructure collective de recharge`
            : seg === 'PAR' ? `notre proposition pour équiper ${res || 'la résidence'} de bornes de recharge partagées`
              : seg === 'FLT' ? 'notre proposition pour la recharge des véhicules de votre flotte'
                : seg === 'TER' ? 'notre proposition pour offrir la recharge à vos clients et visiteurs'
                  : plusieurs ? 'nos devis' : 'notre devis';
  const blocs = l.length
    ? [...amo, ...travaux, ...types].flatMap((x, i) => [...(i ? [''] : []), ...blocDevis(x)])
    : ['[Aucun devis finalisé trouvé dans Costructor pour cette fiche : finalise le devis dans Costructor, puis rouvre ce mail]'];

  // Prime ADVENIR : jamais acquise, jamais chiffrée ici (montant estimé et reste à charge dans la brochure et le devis)
  const eligible = seg === 'COP'
    ? "L'infrastructure est éligible à la prime Advenir « infrastructure collective », sous réserve d'acceptation du dossier et selon la date du permis de construire de la résidence."
    : seg === 'PAR' && bornes.length
      ? 'Les bornes partagées sont éligibles à la prime Advenir « point de recharge partagé », sous réserve d’acceptation du dossier.'
      : seg === 'RIC' && bornes.length
        ? 'Votre borne est éligible à la prime Advenir « point de recharge individuel », jusqu’à 1 000 € par point de recharge, sous réserve d’acceptation du dossier.'
        : seg === 'DAP' && bornes.some(surSg)
          ? 'La solution avec borne sur les services généraux est éligible à la prime Advenir « point de recharge individuel », jusqu’à 1 000 € par point de recharge, sous réserve d’acceptation du dossier.'
          : '';
  const advenir = eligible
    ? `${eligible} La facture est réglée en totalité, puis la prime est versée si le dossier est accepté : le montant estimé et le reste à charge figurent ${d.brochure ? 'dans la brochure jointe' : 'dans le devis'}. Les travaux ne démarrent qu'après la validation du dossier, sinon ils ne pourraient pas être subventionnés.`
    : null;

  const signer = l.filter((x) => !x.tarifType);
  const expires = l.map((x) => x.expire).filter(Boolean).sort();
  const validite = expires.length
    ? ` ${signer.length > 1 || l.length > 1 ? 'Les devis sont valables' : 'Il est valable'} jusqu'au ${dateLongue(expires[0])}.`
    : ` ${l.length > 1 ? 'Les devis sont valables' : 'Il est valable'} 30 jours.`;
  const noteAmo = amo.length && travaux.length ? " Le devis d'assistance Enedis, à signer en premier pour lancer la demande, se règle à 100 % à la signature." : '';
  const conditions = amo.length && !travaux.length && !types.length
    ? `Le devis se signe en ligne, avec un règlement de 100 % à la signature, par virement.${validite}`
    : copro
      ? `${signer.length > 1 ? 'Chaque devis' : 'Le devis'} se signe en ligne. L'acompte de 50 % n'est exigible qu'après l'autorisation des travaux par l'assemblée générale ; le solde est réglé à réception de la facture, par virement.${noteAmo}${validite}`
      : `${signer.length > 1 ? 'Chaque devis' : 'Le devis'} se signe en ligne : acompte de 50 % à la signature, solde à réception de la facture, par virement.${noteAmo}${validite}`;

  return texteDe(
    bonjour(salutDevis(d)),
    '',
    `Merci encore pour l'accueil que vous nous avez réservé lors de la visite technique${v ? ` du ${v.date}` : ''}.`,
    '',
    `Comme promis, voici ${quoi} :`,
    '',
    ...blocs,
    '',
    travaux.length > 1 ? 'Notre recommandation : [scénario conseillé et raison concrète vue à la visite].' : null,
    travaux.length > 1 ? '' : null,
    seg === 'DAP' && travaux.some(surSg)
      ? "La solution sur les services généraux relève du droit à la prise : une simple notification au syndic suffit, sans vote en assemblée générale, et nous nous occupons de ce dossier pour vous. Un sous-compteur certifié MID mesure votre seule consommation, pour un remboursement transparent à la copropriété."
      : null,
    seg === 'DAP' && travaux.some(surSg) ? '' : null,
    advenir,
    advenir ? '' : null,
    prises.length && ['RES', 'DAP', 'RIC'].includes(seg) ? `${prises.length > 1 ? 'Les prises renforcées bénéficient' : 'La prise renforcée bénéficie'} d'une TVA à 10 % ; elle n'ouvre pas droit à la prime Advenir.` : null,
    prises.length && ['RES', 'DAP', 'RIC'].includes(seg) ? '' : null,
    seg === 'PAR' ? "Chaque utilisateur recharge avec son badge et règle directement sa consommation : la copropriété n'avance rien et n'a aucune facture de recharge à émettre." : null,
    seg === 'COP' ? "Une convention d'exploitation sera établie dès la validation du devis ; elle précisera les engagements de CHARGéO : accès de tous les utilisateurs à des conditions non discriminatoires, portabilité des données et durée d'engagement." : null,
    seg === 'FLT' ? 'La supervision relève les consommations, pour suivre et refacturer la recharge de chaque véhicule ou salarié.' : null,
    seg === 'TER' ? "Vos clients règlent leur recharge par carte bancaire ou par application, et l'électricité consommée vous est reversée : vous n'avez rien à encaisser ni à facturer." : null,
    ['PAR', 'COP', 'FLT', 'TER'].includes(seg) ? '' : null,
    d.brochure
      ? `Vous trouverez en pièce jointe la brochure de votre projet, avec les photos de la visite${copro ? ' : elle peut être transmise telle quelle au conseil syndical' : ''}.`
      : null,
    d.brochure ? '' : null,
    conditions,
    '',
    copro
      ? 'Nous serions ravis de venir présenter le dossier en conseil syndical ou en assemblée générale.'
      : seg === 'FLT'
        ? 'Nous pouvons volontiers venir le présenter à votre équipe.'
        : 'Nous restons à votre entière disposition pour en parler, par téléphone ou par simple retour de mail.',
    '',
    'Bien cordialement,',
  );
}

// ── Devis validé (suite du lot 3, 06/11) ──
// Devis du scénario retenu au gagné (et l'AMO de la fiche, qui l'accompagne) ; tous les devis si l'écran n'en donne pas
function devisRetenus(d: Donnees): DevisMail[] {
  const l = d.devis || [];
  if (!d.retenu) return l;
  const nom = String(d.retenu).trim();
  const du = l.filter((x) => x.amo || String(x.scenario || '').trim() === nom);
  return du.length ? du : l;
}
const sommeTtc = (l: DevisMail[]): number | null => l.reduce<number | null>((s, x) => (s === null || x.ttc === null ? null : s + x.ttc), 0);
function numerosValides(d: Donnees): string[] {
  return devisRetenus(d).filter((x) => !x.tarifType).map((x) => x.numero).filter(Boolean);
}
function objetValide(d: Donnees): string {
  const n = numerosValides(d);
  return `${n.length === 1 ? `Votre devis ${n[0]}` : n.length > 1 ? 'Vos devis' : 'Votre devis'} : merci pour votre confiance`;
}
function corpsValide(d: Donnees): string {
  const seg = d.segment || '';
  const l = devisRetenus(d);
  const amo = l.filter((x) => x.amo);
  const travaux = l.filter((x) => !x.amo && !x.tarifType);
  const copro = seg === 'COP' || seg === 'PAR';
  const res = residence(d);
  const n = numerosValides(d);
  const lesDevis = n.length > 1 ? `les devis ${n.slice(0, -1).join(', ')} et ${n[n.length - 1]}` : n.length ? `le devis ${n[0]}` : 'votre devis';
  const ttcTravaux = sommeTtc(travaux);
  const acompte = ttcTravaux !== null ? euros(Math.round(ttcTravaux * 50) / 100) : "[montant de l'acompte]";
  const ttcAmo = sommeTtc(amo);
  const factureAmo = ttcAmo !== null ? euros(ttcAmo) : '[montant]';
  const prises = travaux.length > 0 && travaux.every(estPrise);
  const surSg = travaux.some((x) => morceauxDevis(x).source === 'SG');
  // COP et PAR : toujours Advenir (pas de prise renforcée partagée) ; RIC et DAP sur SG : sauf prise renforcée
  const advenir = seg === 'COP' || seg === 'PAR' || (!prises && (seg === 'RIC' || (seg === 'DAP' && surSg)));
  const merci = copro
    ? `Merci beaucoup pour votre confiance : nous avons bien reçu la validation de ${lesDevis}${res ? ` pour ${res}` : ''}.`
    : `Merci beaucoup pour votre confiance : nous avons bien reçu ${lesDevis} signé${n.length > 1 ? 's' : ''}.`;
  const ligneAmo = amo.length && travaux.length
    ? `Pour l'assistance Enedis, la facture de ${factureAmo} TTC est réglable à la signature, par virement : nous lançons la demande auprès d'Enedis sans attendre.`
    : null;
  const sansAttente = "Les travaux ne démarreront qu'après sa validation, sinon ils ne pourraient pas être subventionnés.";

  if (!l.length) {
    return texteDe(
      bonjour(salutDevis(d)),
      '',
      merci,
      '',
      '[Aucun devis trouvé dans Costructor pour le scénario retenu : vérifie qu’il est finalisé, puis rouvre ce mail]',
      '',
      'Bien cordialement,',
    );
  }
  // AMO seul : facture de 100 % à la signature (25 f)
  if (!travaux.length && amo.length) {
    return texteDe(
      bonjour(salutDevis(d)),
      '',
      merci,
      '',
      `Vous allez recevoir la facture de ${factureAmo} TTC, réglable à la signature, par virement.`,
      '',
      "Nous lançons dès maintenant la demande auprès d'Enedis, et nous vous tiendrons au courant de chaque étape.",
      '',
      'Bien cordialement,',
    );
  }
  // COP et PAR : acompte après le vote de l'AG, Advenir, convention en COP (25 d, 25 e)
  if (copro) {
    return texteDe(
      bonjour(salutDevis(d)),
      '',
      merci,
      '',
      "L'acompte de 50 % devient exigible dès que l'assemblée générale a autorisé les travaux : pourriez-vous nous transmettre le procès-verbal dès qu'il sera disponible ? La facture d'acompte suivra aussitôt.",
      ligneAmo ? '' : null,
      ligneAmo,
      '',
      `Nous déposerons ensuite le dossier de prime Advenir${seg === 'COP' ? ' « infrastructure collective »' : ''}. ${sansAttente}`,
      '',
      seg === 'COP' ? "La convention d'exploitation vous sera transmise très prochainement ; elle précise les engagements de CHARGéO." : null,
      seg === 'COP' ? '' : null,
      `Nous reviendrons vers vous dès la validation du dossier Advenir pour fixer la date ${seg === 'COP' ? 'des travaux' : 'de pose'}.`,
      '',
      'Bien cordialement,',
    );
  }
  // RES, FLT, TER, DAP hors SG et prises (25 a) ; DAP sur les services généraux (25 b) ; RIC (25 c)
  const dapSg = seg === 'DAP' && surSg;
  return texteDe(
    bonjour(salutDevis(d)),
    '',
    merci,
    '',
    `Vous allez recevoir la facture d'acompte de 50 %, soit ${acompte} TTC, à régler par virement. Le solde sera facturé à la fin des travaux.`,
    ligneAmo ? '' : null,
    ligneAmo,
    '',
    dapSg
      ? `Nous préparons la notification au syndic au titre du droit à la prise${advenir ? ` et nous déposons le dossier de prime Advenir. ${sansAttente}` : '.'}`
      : advenir ? `Nous déposons le dossier de prime Advenir. ${sansAttente}` : null,
    dapSg || advenir ? '' : null,
    advenir
      ? 'Nous reviendrons vers vous dès la validation du dossier Advenir pour fixer la date de pose.'
      : "Nous reviendrons vers vous dès réception de l'acompte pour fixer ensemble la date de pose.",
    '',
    'Bien cordialement,',
  );
}

// ── Relances du devis (lot 4, accord de Mathieu du 06/11 à 22 h 20) ──
// Aujourd'hui à Paris, AAAA-MM-JJ
const aujourdhuiIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
// Devis à signer rappelés dans une relance : travaux et AMO, sans le tarif type
const devisARelancer = (d: Donnees) => (d.devis || []).filter((x) => !x.tarifType);
const estExpire = (x: DevisMail) => !!x.expire && x.expire.slice(0, 10) < aujourdhuiIso();
function validiteRelance(x: DevisMail): string {
  if (!x.expire) return '';
  return estExpire(x) ? `arrivé à échéance le ${dateLongue(x.expire)}, nous l'actualiserons volontiers` : `valable jusqu'au ${dateLongue(x.expire)}`;
}
const lienOuCrochet = (x: DevisMail) => x.lien || `[lien de signature en ligne du devis${x.numero ? ` ${x.numero}` : ''}, à copier depuis Costructor]`;
function rappelDevis(d: Donnees): string[] {
  const l = devisARelancer(d);
  if (!l.length) return ['[Aucun devis finalisé trouvé dans Costructor pour cette fiche : vérifie-le, puis rouvre ce mail]'];
  if (l.length === 1) {
    const x = l[0];
    const v = validiteRelance(x);
    return [`Pour mémoire, ${x.numero ? `notre devis n° ${x.numero}` : 'notre devis'} se consulte et se signe en ligne : ${lienOuCrochet(x)}${v ? ` (${v})` : ''}.`];
  }
  return [
    'Pour mémoire, nos devis se consultent et se signent en ligne :',
    ...l.map((x) => {
      const v = validiteRelance(x);
      const quoi = x.amo ? 'Assistance Enedis' : morceauxDevis(x).lettre || x.scenario;
      return `• ${quoi}${x.numero ? `, devis n° ${x.numero}` : ''} : ${lienOuCrochet(x)}${v ? ` (${v})` : ''}`;
    }),
  ];
}
// Tentatives 1 et 2 (modèle 17) : toujours un apport utile, écrit par le commercial
function corpsRelance(d: Donnees): string {
  const copro = d.segment === 'COP' || d.segment === 'PAR';
  return texteDe(
    bonjour(salutDevis(d)),
    '',
    'Nous espérons que vous allez bien.',
    '',
    '[Ta phrase utile : réponse à une question restée ouverte, conseil, délai Advenir ou préparation de l’AG]',
    '',
    ...rappelDevis(d),
    '',
    copro
      ? 'Si un point fait hésiter le conseil syndical, ou si vous souhaitez que nous venions présenter le dossier, dites-le-nous simplement : nous en parlerons volontiers.'
      : 'Si quelque chose vous fait hésiter, que ce soit le prix, le matériel ou le calendrier, dites-le-nous simplement : nous en parlerons volontiers.',
    '',
    'Bien cordialement,',
  );
}
// Tentative 3 (modèle 18), juste avant la suspension des relances
function corpsDerniereRelance(d: Donnees): string {
  const copro = d.segment === 'COP' || d.segment === 'PAR';
  const res = residence(d);
  const projet = copro ? `l'équipement de ${res || 'la résidence'}` : `votre projet de recharge${aCommune(d)}`;
  const l = devisARelancer(d);
  const valides = l.filter((x) => !!x.expire && !estExpire(x)).map((x) => x.expire).sort();
  const suite = valides.length
    ? `${l.length > 1 ? 'les devis restent valables' : 'le devis reste valable'} jusqu'au ${dateLongue(valides[0])}`
    : 'nous actualiserons alors le devis si besoin';
  return texteDe(
    bonjour(salutDevis(d)),
    '',
    `Nous revenons une dernière fois vers vous au sujet de ${projet}.`,
    '',
    `Sans nouvelles de votre part, nous mettons le dossier en attente de notre côté. Il vous suffira de répondre à ce mail pour le reprendre : ${suite}.`,
    '',
    "Merci encore pour l'intérêt que vous portez à CHARGéO.",
    '',
    'Bien cordialement,',
  );
}

// ── Refus du client (lot 4, accord de Mathieu du 06/11 à 22 h 34) ──
// Une phrase selon le ⛔ Motif Refus : 💸 Trop cher / Budget, 🏃 Concurrence, ❌ Projet abandonné, 🧱 Faisabilité Technique
function corpsRefus(d: Donnees): string {
  const m = sansAccents(d.motif);
  const copro = d.segment === 'COP' || d.segment === 'PAR';
  const res = residence(d);
  const projet = copro ? `l'équipement de ${res || 'la résidence'}` : `votre projet de recharge${aCommune(d)}`;
  const faisabilite = m.includes('faisabilit');
  const phrase = m.includes('cher') || m.includes('budget')
    ? 'Nous comprenons tout à fait que le budget soit déterminant. Si votre projet évolue, nous reverrons volontiers notre proposition avec vous.'
    : m.includes('concurren')
      ? 'Nous respectons pleinement votre choix, et nous vous souhaitons une très belle réussite dans votre projet.'
      : m.includes('abandon')
        ? 'Nous le comprenons tout à fait : si le projet revient un jour sur la table, nous serons heureux de le reprendre avec vous.'
        : faisabilite
          ? 'Nous regrettons sincèrement de ne pas pouvoir mener ce projet à bien dans de bonnes conditions techniques, et nous préférons vous le dire en toute transparence.'
          : '[Motif du refus : choisis-le au clic sur « Perdu », puis rouvre ce mail]';
  return texteDe(
    bonjour(salutDevis(d)),
    '',
    faisabilite
      ? `Merci beaucoup pour le temps que vous nous avez accordé au sujet de ${projet}.`
      : `Merci beaucoup de nous avoir tenus informés au sujet de ${projet}.`,
    '',
    phrase,
    '',
    faisabilite
      ? 'Nous restons bien sûr à votre disposition pour toute question.'
      : 'Nous restons joignables à tout moment, et notre devis pourra être actualisé si besoin.',
    '',
    'Bien cordialement,',
  );
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
  {
    // Lot 3 (06/11) : ouvert par « ✉️ Envoyer le devis » (Suite de la vente) ; la fiche passe en 📩 devis envoyé quand il part
    cle: 'devis-envoi',
    nom: 'Devis · envoi',
    court: 'Envoi du devis',
    etape: 'Devis',
    reponse: false,
    a: (d) => destinatairesDevis(d).a,
    cc: (d) => destinatairesDevis(d).cc,
    objet: objetDevis,
    corps: corpsDevis,
  },
  {
    // Suite du lot 3 (06/11) : écrit au gagné (Suite de la vente) ; la fiche passe en 🏆 gagné quand il part
    cle: 'devis-valide',
    nom: 'Devis · validé',
    court: 'Devis validé',
    etape: 'Devis',
    reponse: true,
    a: (d) => destinatairesDevis(d).a,
    cc: (d) => destinatairesDevis(d).cc,
    objet: objetValide,
    corps: corpsValide,
  },
  {
    // Lot 4 (06/11) : posé à la date de relance (tentatives 1 et 2) ; parti, il compte comme la relance
    cle: 'devis-relance',
    nom: 'Devis · relance',
    court: 'Relance',
    etape: 'Devis',
    reponse: true,
    a: (d) => destinatairesDevis(d).a,
    cc: (d) => destinatairesDevis(d).cc,
    objet: objetDevis,
    corps: corpsRelance,
  },
  {
    // Lot 4 (06/11) : 3e tentative, juste avant la suspension des relances
    cle: 'devis-derniere-relance',
    nom: 'Devis · dernière relance',
    court: 'Dernière relance',
    etape: 'Devis',
    reponse: true,
    a: (d) => destinatairesDevis(d).a,
    cc: (d) => destinatairesDevis(d).cc,
    objet: objetDevis,
    corps: corpsDerniereRelance,
  },
  {
    // Lot 4 (06/11) : écrit au perdu (Suite de la vente) ; la fiche passe en ❌ perdu quand il part
    cle: 'devis-refus',
    nom: 'Refus du client',
    court: 'Refus',
    etape: 'Devis',
    reponse: true,
    a: (d) => destinatairesDevis(d).a,
    cc: (d) => destinatairesDevis(d).cc,
    objet: objetDevis,
    corps: corpsRefus,
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
