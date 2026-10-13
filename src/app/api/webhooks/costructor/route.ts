import { NextResponse } from 'next/server';
import { getQualificationListId, QUALIFICATION_PROD_ID } from '@/lib/listesClickUp';

// Webhook ClickUp -> Costructor (lot 3.4, 11/10/2026). Appelé par une automatisation ClickUp : POST ?taskId=...
// Décisions : point 5 (échec propre, sans doublon, alerte au commercial), point 15 (client payeur,
// gestionnaire et contact sur place), plan du lot 3.4 validé par Matthieu le 11/10.
// 0. Une sous-tâche (scénario, emplacement) n'est jamais un client : elle est ignorée. L'automatisation de la liste
//    se déclenche aussi sur les sous-tâches quand elles passent en « devis à faire ».
// 1. « Lien Costructor » rempli et contact existant : rien n'est créé.
// 2. Sinon recherche du client dans Costructor : SIRET d'abord, puis email ou téléphone.
//    Pour une société, l'email ou le téléphone ne suffit pas : le nom doit correspondre aussi
//    (un gestionnaire de syndic porte le même email sur plusieurs copros). Sinon on crée, avec un avertissement.
//    Un seul résultat : on le relie. Plusieurs : rien n'est créé, un commentaire demande de choisir.
// 3. Rien trouvé : création du client payeur (nom de la fiche, SIRET). Le contact principal (Gestionnaire,
//    sinon Contact sur place) est mis sur le client (nom, email, téléphone), tous les contacts vont dans les notes.
//    Interlocuteurs : l'API sait créer une fiche interlocuteur (type « contact ») mais pas la rattacher (test du 11/10).
//    Chaque personne est retrouvée dans Costructor (email, téléphone, nom) ou créée, puis un commentaire
//    sur la fiche liste qui rattacher à la main, ⭐ = principal (Gestionnaire d'abord).
//    Après création, on relit le client pour vérifier que l'email et le téléphone sont bien enregistrés.
// 4. Le lien n'est écrit que s'il est vide ou mort. Chaque écriture est vérifiée ; un échec pose un commentaire d'alerte.
// Preview : GET ?taskId=...&simulation=1 (rien n'est écrit) ou &executer=1 (vrai passage, fiches TEST uniquement).
// La simulation est aussi acceptée sur une vraie fiche Qualification (lecture seule, décision Matthieu 11/10),
// pour vérifier la lecture du Gestionnaire et du Contact sur place, impossibles à ajouter à la liste TEST.
// Les champs sont lus par identifiant, puis par nom en secours (les noms lus avant : Email, Telephone,
// Type Client, Adresse, Lien Costructor, ne doivent toujours pas être renommés).

const CHAMPS = {
  lien: { id: 'd9f88e8f-4e20-4a98-aee8-3ded30fef5fc', nom: 'Lien Costructor' },
  email: { id: '66aee5d1-7159-46a7-b986-3dd6c314fd80', nom: 'Email' },
  telephone: { id: '6a120794-23be-4c50-8d25-75993f0aece4', nom: 'Telephone' },
  typeClient: { id: 'f6b45107-9ba0-406b-8fd7-d678e6ad11dc', nom: 'Type Client' },
  adresse: { id: '990a7f3b-989f-416d-9a80-eba5654b228d', nom: 'Adresse' },
  siret: { id: 'f840aa7d-0a85-4618-9e13-620c156355ed', nom: 'SIRET / N° RNIC' },
  gestionnaire: { id: '0a6a88d4-1d1a-4034-8e7b-bf6213b1d9c3', nom: 'Gestionnaire' },
  contactSurPlace: { id: '7d20a03c-f9b5-4395-9114-362e194a9a85', nom: 'Contact sur place' },
};
// Liste Contacts
const CONTACT_EMAIL_ID = 'fe270c78-ce53-427c-ad4f-73090f7c3252';
const CONTACT_TEL_ID = '9f8e22e3-656d-4d9b-b923-cfff21366e8f';

const COSTRUCTOR = 'https://api.costructor.co/external/v1';
const URL_CONTACT = (id: string) => `https://app.costructor.co/contacts/${id}`;

const nettoyer = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const chiffres = (s: any) => String(s || '').replace(/\D/g, '');
const emailNormal = (s: any) => String(s || '').trim().toLowerCase();
function telNormal(s: any): string {
  let t = String(s || '').replace(/[\s.()-]/g, '');
  if (t.startsWith('00')) t = '+' + t.slice(2);
  if (t.startsWith('0')) t = '+33' + t.slice(1);
  return t;
}
const mots = (s: string): string[] =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(Boolean);

// Comparaison de noms de société : on ignore les mots génériques, et tous les mots du nom le plus court
// doivent se retrouver dans l'autre (« TEST · CCPEVA » = « CCPEVA COMMUNAUTE DE COMMUNES… », « SDC Le Relax » ≠ « COPR LES ROUSSY »)
const MOTS_GENERIQUES = new Set(['test', 'sdc', 'copr', 'copro', 'copropriete', 'synd', 'syndic', 'syndicat', 'residence', 'res',
  'le', 'la', 'les', 'l', 'du', 'de', 'des', 'd', 'et', 'sarl', 'sas', 'sasu', 'eurl', 'sa', 'sci']);
function memeNomSociete(a: string, b: string): boolean {
  const ma = mots(a).filter((m) => !MOTS_GENERIQUES.has(m));
  const mb = mots(b).filter((m) => !MOTS_GENERIQUES.has(m));
  if (ma.length === 0 || mb.length === 0) return false;
  const [court, long] = ma.length <= mb.length ? [ma, mb] : [mb, ma];
  const dansLong = new Set(long);
  return court.every((m) => dansLong.has(m));
}
// Comparaison de noms de personne, dans n'importe quel ordre (« Magali DUCRET PEILLEX » = « Ducret-Peillex Magali »)
const clePersonne = (s: string) => mots(s).sort().join(' ');

function lireChamp(tache: any, champ: { id: string; nom: string }): any {
  const champs: any[] = Array.isArray(tache?.custom_fields) ? tache.custom_fields : [];
  const f = champs.find((c) => c.id === champ.id) || champs.find((c) => c.name && nettoyer(c.name) === nettoyer(champ.nom));
  if (!f || f.value === undefined || f.value === null || f.value === '') return undefined;
  if (f.type === 'drop_down' && f.type_config?.options) {
    const o = f.type_config.options.find((x: any) => x.orderindex === f.value || x.id === f.value);
    return o ? o.name : f.value;
  }
  return f.value;
}

// « Florian PIERRU » -> prénom Florian, nom PIERRU ; sinon premier mot = prénom
function decouperNom(nom: string): { firstName?: string; lastName: string } {
  const liste = String(nom || '').trim().split(/\s+/).filter(Boolean);
  const enMajuscules = liste.filter((m) => m.length > 1 && m === m.toUpperCase() && /[A-ZÀ-Ý]/.test(m));
  if (enMajuscules.length > 0 && enMajuscules.length < liste.length) {
    return { firstName: liste.filter((m) => !enMajuscules.includes(m)).join(' '), lastName: enMajuscules.join(' ') };
  }
  if (liste.length >= 2) return { firstName: liste[0], lastName: liste.slice(1).join(' ') };
  return { lastName: String(nom || '').trim() };
}

function texteAdresse(v: any): string {
  if (!v) return '';
  if (typeof v === 'object') return v.formatted_address || v.text || v.address || '';
  const t = String(v).trim();
  if (t.startsWith('{')) {
    try { const p = JSON.parse(t); return p.formatted_address || p.text || p.address || t; } catch { return t; }
  }
  return t;
}

// Pays en code ISO minuscule, comme demandé par l'API Costructor
function objetAdresse(texte: string) {
  const cp = texte.match(/\b\d{5}\b/);
  if (!cp) return undefined;
  const [avant, apres = ''] = texte.split(cp[0]);
  const street = avant.trim().replace(/,$/, '').trim();
  const city = apres.trim().replace(/^,/, '').trim().replace(/,?\s*France$/i, '').trim();
  if (!street || !city) return undefined;
  return { street, postal_code: cp[0], city, country: 'fr' };
}

async function lireTache(taskId: string, token: string): Promise<any | null> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}?custom_task_ids=true`, {
    headers: { Authorization: token },
    cache: 'no-store',
  });
  return res.ok ? res.json() : null;
}

async function commenter(taskId: string, token: string, texte: string): Promise<boolean> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/comment`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment_text: texte, notify_all: true }),
  });
  if (!res.ok) console.error(`Commentaire refusé (${res.status}) sur ${taskId}`);
  return res.ok;
}

async function ecrireLien(taskId: string, token: string, url: string): Promise<boolean> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/field/${CHAMPS.lien.id}`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: url }),
  });
  if (!res.ok) console.error(`Écriture du lien Costructor refusée (${res.status}) sur ${taskId}`, await res.text().catch(() => ''));
  return res.ok;
}

// Appel Costructor avec nouvel essai si trop de requêtes (429 vu pendant le test du 11/10)
async function costructor(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  let res: Response | null = null;
  for (let essai = 0; essai < 3; essai++) {
    res = await fetch(`${COSTRUCTOR}${chemin}`, {
      method: methode,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: corps ? JSON.stringify(corps) : undefined,
      cache: 'no-store',
    });
    if (res.status !== 429) return res;
    await new Promise((r) => setTimeout(r, 1500 * (essai + 1)));
  }
  return res as Response;
}

// Tous les contacts Costructor (l'API pagine avec _limit/_page, comme pour les devis). null = lecture impossible.
async function listerContacts(token: string): Promise<any[] | null> {
  const tous: any[] = [];
  const vus = new Set<string>();
  for (let page = 1; page <= 30; page++) {
    const res = await costructor(token, `/contacts?_limit=100&limit=100&_page=${page}&page=${page}`);
    if (!res.ok) return page === 1 ? null : tous;
    const json = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(json?.data) ? json.data : [];
    const nouveaux = lot.filter((c) => c?.id && !vus.has(c.id));
    if (nouveaux.length === 0) break;
    for (const c of nouveaux) { vus.add(c.id); tous.push(c); }
  }
  return tous;
}

// Relecture d'un contact après création. null = lecture impossible.
async function lireContact(id: string, token: string): Promise<any | null> {
  const res = await costructor(token, `/contacts/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return json?.data ?? json;
}

// Création d'un contact. Renvoie son identifiant, ou '' si refusé.
async function creerContact(token: string, corps: any): Promise<string> {
  const res = await costructor(token, '/contacts', 'POST', corps);
  const texte = await res.text();
  if (!res.ok) { console.error(`Création Costructor refusée (${res.status})`, texte); return ''; }
  try { return String(JSON.parse(texte)?.data?.id || ''); } catch { return ''; }
}

const nomContact = (c: any) => String(c?.fullName || c?.companyName || [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.name || c?.id);
const emailsDe = (c: any): string[] => [c?.email, ...(Array.isArray(c?.emails) ? c.emails.map((e: any) => e?.email) : [])].map(emailNormal).filter(Boolean);
const telsDe = (c: any): string[] => [c?.phone, ...(Array.isArray(c?.phones) ? c.phones.map((p: any) => p?.phone) : [])].map(telNormal).filter(Boolean);

type Personne = { role: string; firstName?: string; lastName: string; email?: string; phone?: string };
const nomPersonne = (p: Personne) => [p.firstName, p.lastName].filter(Boolean).join(' ');

// Personnes liées par une relation vers la liste Contacts, Gestionnaire d'abord
// (valeur ClickUp : liste de tâches ou d'identifiants)
async function personnesLiees(tache: any, token: string): Promise<Personne[]> {
  const sources: { champ: { id: string; nom: string }; role: string }[] = [
    { champ: CHAMPS.gestionnaire, role: 'Gestionnaire' },
    { champ: CHAMPS.contactSurPlace, role: 'Contact sur place' },
  ];
  const vus = new Set<string>();
  const personnes: Personne[] = [];
  for (const { champ, role } of sources) {
    const v = lireChamp(tache, champ);
    const liste = Array.isArray(v) ? v : v ? [v] : [];
    for (const t of liste) {
      const tid = String(typeof t === 'string' ? t : t?.id || '');
      if (!tid || vus.has(tid)) continue;
      vus.add(tid);
      const c = await lireTache(tid, token);
      if (!c) continue;
      const email = emailNormal(lireChamp(c, { id: CONTACT_EMAIL_ID, nom: 'Email contact' })) || undefined;
      const phone = telNormal(lireChamp(c, { id: CONTACT_TEL_ID, nom: 'Tél. contact' })) || undefined;
      personnes.push({ role, ...decouperNom(c.name), email, phone });
    }
  }
  return personnes;
}

// « Gestionnaire : Magali DUCRET PEILLEX, mducretpeillex@citya.com »
const ligneNote = (p: Personne) =>
  `${p.role} : ${[nomPersonne(p), p.email, p.phone].filter(Boolean).join(', ')}`;

async function traiter(taskId: string, simulation: boolean) {
  const clickUpToken = process.env.CLICKUP_API_KEY;
  const costructorToken = process.env.COSTRUCTOR_API_KEY;
  if (!clickUpToken || !costructorToken) {
    return { status: 500, body: { success: false, error: 'Configuration serveur incomplète' } };
  }

  const tache = await lireTache(taskId, clickUpToken);
  if (!tache) return { status: 404, body: { success: false, error: 'Fiche introuvable' } };

  // 0. Sous-tâche (scénario, emplacement) : jamais de client Costructor, rien n'est fait ni commenté
  if (tache.parent) {
    return { status: 200, body: { success: true, action: 'ignore_sous_tache', parent: String(tache.parent), simulation } };
  }

  // Preview : vrai passage sur les fiches TEST seulement ; simulation (lecture seule) aussi sur une vraie fiche Qualification
  if (process.env.VERCEL_ENV !== 'production') {
    const listeTest = getQualificationListId();
    const liste = String(tache?.list?.id ?? '');
    const estTest = !!listeTest && liste === String(listeTest);
    const simulationVraieFiche = simulation && liste === QUALIFICATION_PROD_ID;
    if (!estTest && !simulationVraieFiche) {
      return { status: 403, body: { success: false, error: 'En preview : fiches TEST, ou simulation seule sur une vraie fiche Qualification' } };
    }
  }
  const id = String(tache.id);
  const nomFiche = String(tache.name || '').trim();

  const alerter = async (texte: string) => {
    if (!simulation) await commenter(id, clickUpToken, `⚠️ Costructor : ${texte}`);
  };

  // Données de la fiche
  const lien = String(lireChamp(tache, CHAMPS.lien) || '').trim();
  const lienId = (lien.match(/cnt_[a-z0-9]+/i) || [])[0] || '';
  const email = emailNormal(lireChamp(tache, CHAMPS.email));
  const telephone = telNormal(lireChamp(tache, CHAMPS.telephone));
  const typeClient = String(lireChamp(tache, CHAMPS.typeClient) || '');
  const siret = chiffres(lireChamp(tache, CHAMPS.siret));
  const adresse = texteAdresse(lireChamp(tache, CHAMPS.adresse));
  const t = typeClient.toLowerCase();
  const estSociete = !!siret || ['pro', 'b2b', 'professionnel', 'syndic', 'sdc', 'copro'].some((m) => t.includes(m));

  // Lecture de Costructor : sans elle, on ne crée rien (sinon risque de doublon)
  const contacts = await listerContacts(costructorToken);
  if (!contacts) {
    await alerter("lecture des contacts impossible, aucun client n'a été créé. Relancez plus tard ou créez-le à la main.");
    return { status: 502, body: { success: false, error: 'Lecture Costructor impossible' } };
  }

  // 1. Lien déjà rempli et contact existant
  if (lienId && contacts.some((c) => c.id === lienId)) {
    return { status: 200, body: { success: true, action: 'deja_lie', lien, simulation } };
  }
  const lienMort = !!lienId;

  // 2. Recherche : SIRET, puis email ou téléphone (clients et prospects seulement)
  const clients = contacts.filter((c) => ['client', 'lead'].includes(String(c?.type || 'client')));
  let raison = '';
  let candidats: any[] = [];
  let homonymes: any[] = []; // même email ou téléphone mais autre nom (sociétés seulement)
  if (siret.length >= 9) {
    const exacts = clients.filter((c) => chiffres(c.taxId) === siret);
    const memeSiren = clients.filter((c) => chiffres(c.taxId).slice(0, 9) === siret.slice(0, 9));
    candidats = exacts.length > 0 ? exacts : memeSiren;
    raison = 'SIRET';
  }
  if (candidats.length === 0) {
    const parEmail = email ? clients.filter((c) => emailsDe(c).includes(email)) : [];
    const parTel = telephone ? clients.filter((c) => telsDe(c).includes(telephone)) : [];
    const vus = new Set<string>();
    let trouves = [...parEmail, ...parTel].filter((c) => (vus.has(c.id) ? false : (vus.add(c.id), true)));
    if (estSociete) {
      homonymes = trouves.filter((c) => !memeNomSociete(nomContact(c), nomFiche));
      trouves = trouves.filter((c) => memeNomSociete(nomContact(c), nomFiche));
    }
    candidats = trouves;
    const viaEmail = candidats.some((c) => parEmail.includes(c));
    const viaTel = candidats.some((c) => parTel.includes(c));
    raison = viaEmail && viaTel ? 'email et téléphone' : viaEmail ? 'email' : 'téléphone';
  }
  const resume = candidats.map((c) => ({ id: c.id, nom: nomContact(c), url: URL_CONTACT(c.id) }));
  const resumeHomonymes = homonymes.map((c) => ({ id: c.id, nom: nomContact(c), url: URL_CONTACT(c.id) }));

  // Plusieurs clients possibles : on ne choisit pas à la place du commercial
  if (candidats.length > 1) {
    if (!simulation) {
      await commenter(id, clickUpToken,
        `⚠️ Costructor : plusieurs clients correspondent (${raison}), aucun n'a été créé ni relié. Collez le bon lien dans « 🔗 Lien Costructor » :\n` +
        resume.map((r) => `• ${r.nom} : ${r.url}`).join('\n'));
    }
    return { status: 200, body: { success: true, action: 'plusieurs_candidats', raison, candidats: resume, lienMort, simulation } };
  }

  // Un seul client : on le relie
  if (candidats.length === 1) {
    const url = URL_CONTACT(candidats[0].id);
    if (!simulation && !(await ecrireLien(id, clickUpToken, url))) {
      await alerter(`client trouvé (${resume[0].nom}) mais le lien n'a pas pu être écrit dans la fiche : ${url}`);
      return { status: 502, body: { success: false, error: 'Écriture du lien impossible' } };
    }
    return { status: 200, body: { success: true, action: 'relie', raison, client: resume[0], lienMort, simulation } };
  }

  // 3. Création du client payeur
  const personnes: Personne[] = estSociete ? await personnesLiees(tache, clickUpToken) : [];
  if (estSociete && personnes.length === 0 && (email || telephone)) {
    // Pas de relation remplie : on garde l'email et le téléphone de la fiche, sans inventer de nom
    personnes.push({ role: 'Contact de la fiche', lastName: '', email: email || undefined, phone: telephone || undefined });
  }
  const principal = personnes.find((p) => p.lastName) || personnes[0];
  // Email et téléphone du client : ceux du contact principal, complétés par les autres contacts, puis par la fiche
  const emailClient = estSociete ? (principal?.email || personnes.find((p) => p.email)?.email || email) : email;
  const telClient = estSociete ? (principal?.phone || personnes.find((p) => p.phone)?.phone || telephone) : telephone;
  const notes = estSociete && personnes.length > 0
    ? ['Interlocuteurs (depuis ClickUp) :', ...personnes.map(ligneNote)].join('\n')
    : undefined;
  const adresseObj = objetAdresse(adresse);
  const nom = decouperNom(nomFiche);
  const payload: any = {
    type: 'client',
    legalStatus: estSociete ? 'company' : 'individual',
    companyName: estSociete ? nomFiche : undefined,
    firstName: estSociete ? (principal?.lastName ? principal.firstName : undefined) : nom.firstName,
    lastName: estSociete ? (principal?.lastName || undefined) : nom.lastName,
    taxId: estSociete && siret ? siret : undefined,
    emails: emailClient ? [{ email: emailClient, primary: true }] : undefined,
    phones: telClient ? [{ phone: telClient, primary: true }] : undefined,
    notes,
    addresses: adresseObj ? [{ address: adresseObj, primary: true }] : [],
  };

  // Interlocuteurs : seulement les personnes nommées (Costructor exige un nom). Retrouvées ou à créer.
  const fichesPersonnes = contacts.filter((c) => String(c?.type) === 'contact');
  const trouverPersonne = (p: Personne): any | undefined => {
    if (p.email) { const r = fichesPersonnes.find((c) => emailsDe(c).includes(p.email as string)); if (r) return r; }
    if (p.phone) { const r = fichesPersonnes.find((c) => telsDe(c).includes(p.phone as string)); if (r) return r; }
    const cle = clePersonne(nomPersonne(p));
    return cle ? fichesPersonnes.find((c) => clePersonne(nomContact(c)) === cle) : undefined;
  };
  const plan = personnes.filter((p) => p.lastName).map((p) => ({ personne: p, existant: trouverPersonne(p) }));

  if (simulation) {
    const interlocuteurs = plan.map(({ personne, existant }) => ({
      nom: nomPersonne(personne),
      role: personne.role,
      action: existant ? 'reutiliserait' : 'creerait',
      url: existant ? URL_CONTACT(existant.id) : undefined,
    }));
    return { status: 200, body: { success: true, action: 'creerait', lienMort, payload, interlocuteurs, homonymes: resumeHomonymes, simulation } };
  }

  const creeId = await creerContact(costructorToken, payload);
  if (!creeId) {
    await alerter("la création du client a été refusée par Costructor (ou son identifiant n'a pas été renvoyé). Vérifiez dans Costructor avant de le créer à la main.");
    return { status: 502, body: { success: false, error: 'Création Costructor refusée' } };
  }
  const url = URL_CONTACT(creeId);
  if (!(await ecrireLien(id, clickUpToken, url))) {
    await alerter(`client créé mais le lien n'a pas pu être écrit dans la fiche : ${url}`);
    return { status: 502, body: { success: false, error: 'Écriture du lien impossible' } };
  }

  // Vérification : Costructor peut ignorer un champ sans prévenir (test du 11/10)
  const relu = await lireContact(creeId, costructorToken);
  const verif = {
    email: !emailClient || (!!relu && emailsDe(relu).includes(emailNormal(emailClient))),
    telephone: !telClient || (!!relu && telsDe(relu).includes(telNormal(telClient))),
  };
  const manques = [!verif.email ? "l'email" : '', !verif.telephone ? 'le téléphone' : ''].filter(Boolean);
  if (!relu) {
    await alerter(`client créé (${url}) mais impossible de le relire pour vérifier l'email et le téléphone. Vérifiez-le dans Costructor.`);
  } else if (manques.length > 0) {
    await alerter(`client créé (${url}) mais ${manques.join(' et ')} n'a pas été enregistré. Complétez-le à la main dans Costructor.`);
  }

  // Fiches interlocuteurs : réutilisées ou créées (le rattachement reste manuel)
  const interlocuteurs: { nom: string; role: string; action: string; url?: string }[] = [];
  for (const { personne, existant } of plan) {
    const base = { nom: nomPersonne(personne), role: personne.role };
    if (existant) { interlocuteurs.push({ ...base, action: 'reutilise', url: URL_CONTACT(existant.id) }); continue; }
    const pid = await creerContact(costructorToken, {
      type: 'contact',
      legalStatus: 'individual',
      firstName: personne.firstName,
      lastName: personne.lastName,
      emails: personne.email ? [{ email: personne.email, primary: true }] : undefined,
      phones: personne.phone ? [{ phone: personne.phone, primary: true }] : undefined,
    });
    interlocuteurs.push(pid ? { ...base, action: 'cree', url: URL_CONTACT(pid) } : { ...base, action: 'echec' });
  }

  // Commentaire sur la fiche : client créé, interlocuteurs à rattacher, doublons possibles
  const lignes = [`✅ Costructor : client créé : ${url}`];
  if (interlocuteurs.length > 0) {
    lignes.push('', 'À rattacher comme interlocuteurs (Modifier → Interlocuteurs, ⭐ = principal) :');
    interlocuteurs.forEach((i, n) => {
      const puce = n === 0 ? '⭐' : '•';
      const etat = i.action === 'reutilise' ? 'déjà dans Costructor' : i.action === 'cree' ? 'fiche créée' : 'création impossible, à ajouter à la main';
      lignes.push(`${puce} ${i.nom} (${i.role}${n === 0 ? ', principal' : ''}, ${etat})${i.url ? ` : ${i.url}` : ''}`);
    });
  }
  if (resumeHomonymes.length > 0) {
    lignes.push('', `⚠️ Attention : ${resumeHomonymes.length > 1 ? 'des clients existants ont' : 'un client existant a'} le même email ou téléphone mais un autre nom. Vérifiez que ce n'est pas un doublon :`);
    resumeHomonymes.forEach((h) => lignes.push(`• ${h.nom} : ${h.url}`));
  }
  await commenter(id, clickUpToken, lignes.join('\n'));

  return { status: 200, body: { success: true, action: 'cree', client: { id: creeId, url }, verif, interlocuteurs, homonymes: resumeHomonymes, lienMort } };
}

export async function POST(request: Request) {
  try {
    const taskId = new URL(request.url).searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ success: false, error: 'Aucun taskId reçu' }, { status: 400 });
    const r = await traiter(taskId, false);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur webhook Costructor :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Preview uniquement : ?taskId=...&simulation=1 (rien n'est écrit) ou ?taskId=...&executer=1 (vrai passage, TEST)
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ error: 'Non disponible' }, { status: 404 });
  }
  try {
    const p = new URL(request.url).searchParams;
    const taskId = p.get('taskId');
    const executer = p.get('executer') === '1';
    const simulation = p.get('simulation') === '1';
    if (!taskId || (!executer && !simulation)) {
      return NextResponse.json({ error: 'Ajoute ?taskId=...&simulation=1 ou &executer=1' }, { status: 400 });
    }
    const r = await traiter(taskId, !executer);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur webhook Costructor (preview) :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
