import { NextResponse } from 'next/server';
import { getQualificationListId } from '@/lib/listesClickUp';

// Webhook ClickUp -> Costructor (lot 3.4, 11/10/2026). Appelé par une automatisation ClickUp : POST ?taskId=...
// Décisions : point 5 (échec propre, sans doublon, alerte au commercial), point 15 (client payeur,
// gestionnaire et contact sur place), plan du lot 3.4 validé par Matthieu le 11/10.
// 1. « Lien Costructor » rempli et contact existant : rien n'est créé.
// 2. Sinon recherche dans Costructor : SIRET d'abord, puis email ou téléphone.
//    Un seul résultat : on le relie. Plusieurs : rien n'est créé, un commentaire demande de choisir.
// 3. Rien trouvé : création du client payeur (nom de la fiche, SIRET), avec comme personnes de contact
//    le Gestionnaire et le Contact sur place (liste Contacts). Le nom n'est plus découpé au hasard.
// 4. Le lien n'est écrit que s'il est vide ou mort. Chaque écriture est vérifiée ; un échec pose un commentaire d'alerte.
// Preview : fiches TEST uniquement, et GET ?taskId=...&simulation=1 (rien n'est écrit) ou &executer=1 (vrai passage).
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
  const mots = String(nom || '').trim().split(/\s+/).filter(Boolean);
  const enMajuscules = mots.filter((m) => m.length > 1 && m === m.toUpperCase() && /[A-ZÀ-Ý]/.test(m));
  if (enMajuscules.length > 0 && enMajuscules.length < mots.length) {
    return { firstName: mots.filter((m) => !enMajuscules.includes(m)).join(' '), lastName: enMajuscules.join(' ') };
  }
  if (mots.length >= 2) return { firstName: mots[0], lastName: mots.slice(1).join(' ') };
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

function objetAdresse(texte: string) {
  const cp = texte.match(/\b\d{5}\b/);
  if (!cp) return undefined;
  const [avant, apres = ''] = texte.split(cp[0]);
  const street = avant.trim().replace(/,$/, '').trim();
  const city = apres.trim().replace(/^,/, '').trim().replace(/,?\s*France$/i, '').trim();
  if (!street || !city) return undefined;
  return { street, postal_code: cp[0], city, country: 'France' };
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

// Tous les contacts Costructor (l'API pagine avec _limit/_page, comme pour les devis). null = lecture impossible.
async function listerContacts(token: string): Promise<any[] | null> {
  const tous: any[] = [];
  const vus = new Set<string>();
  for (let page = 1; page <= 30; page++) {
    const res = await fetch(`${COSTRUCTOR}/contacts?_limit=100&limit=100&_page=${page}&page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return page === 1 ? null : tous;
    const json = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(json?.data) ? json.data : [];
    const nouveaux = lot.filter((c) => c?.id && !vus.has(c.id));
    if (nouveaux.length === 0) break;
    for (const c of nouveaux) { vus.add(c.id); tous.push(c); }
  }
  return tous;
}

const nomContact = (c: any) => String(c?.fullName || c?.companyName || [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.name || c?.id);
const emailsDe = (c: any): string[] => [c?.email, ...(Array.isArray(c?.emails) ? c.emails.map((e: any) => e?.email) : [])].map(emailNormal).filter(Boolean);
const telsDe = (c: any): string[] => [c?.phone, ...(Array.isArray(c?.phones) ? c.phones.map((p: any) => p?.phone) : [])].map(telNormal).filter(Boolean);

// Personnes liées par une relation vers la liste Contacts
async function personnesLiees(tache: any, token: string): Promise<{ firstName?: string; lastName: string; email?: string; phone?: string }[]> {
  const ids = new Set<string>();
  for (const champ of [CHAMPS.gestionnaire, CHAMPS.contactSurPlace]) {
    const v = lireChamp(tache, champ);
    if (Array.isArray(v)) for (const t of v) if (t?.id) ids.add(String(t.id));
  }
  const personnes: { firstName?: string; lastName: string; email?: string; phone?: string }[] = [];
  for (const id of ids) {
    const c = await lireTache(id, token);
    if (!c) continue;
    const email = emailNormal(lireChamp(c, { id: CONTACT_EMAIL_ID, nom: 'Email contact' })) || undefined;
    const phone = telNormal(lireChamp(c, { id: CONTACT_TEL_ID, nom: 'Tél. contact' })) || undefined;
    personnes.push({ ...decouperNom(c.name), email, phone });
  }
  return personnes;
}

async function traiter(taskId: string, simulation: boolean) {
  const clickUpToken = process.env.CLICKUP_API_KEY;
  const costructorToken = process.env.COSTRUCTOR_API_KEY;
  if (!clickUpToken || !costructorToken) {
    return { status: 500, body: { success: false, error: 'Configuration serveur incomplète' } };
  }

  const tache = await lireTache(taskId, clickUpToken);
  if (!tache) return { status: 404, body: { success: false, error: 'Fiche introuvable' } };

  // Preview : jamais une vraie fiche client
  if (process.env.VERCEL_ENV !== 'production') {
    const listeTest = getQualificationListId();
    if (!listeTest || String(tache?.list?.id) !== String(listeTest)) {
      return { status: 403, body: { success: false, error: 'En preview, seules les fiches de la liste TEST sont acceptées' } };
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
    candidats = [...parEmail, ...parTel].filter((c) => (vus.has(c.id) ? false : (vus.add(c.id), true)));
    raison = parEmail.length > 0 && parTel.length > 0 ? 'email et téléphone' : parEmail.length > 0 ? 'email' : 'téléphone';
  }
  const resume = candidats.map((c) => ({ id: c.id, nom: nomContact(c), url: URL_CONTACT(c.id) }));

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
  const personnes = estSociete ? await personnesLiees(tache, clickUpToken) : [];
  if (estSociete && personnes.length === 0 && (email || telephone)) {
    personnes.push({ lastName: 'Contact', email: email || undefined, phone: telephone || undefined });
  }
  const adresseObj = objetAdresse(adresse);
  const nom = decouperNom(nomFiche);
  const payload: any = {
    type: 'client',
    legalStatus: estSociete ? 'company' : 'individual',
    name: nomFiche,
    companyName: estSociete ? nomFiche : undefined,
    firstName: estSociete ? undefined : nom.firstName,
    lastName: estSociete ? undefined : nom.lastName,
    taxId: estSociete && siret ? siret : undefined,
    emails: !estSociete && email ? [{ email, primary: true }] : undefined,
    phones: !estSociete && telephone ? [{ phone: telephone, primary: true }] : undefined,
    contacts: estSociete && personnes.length > 0 ? personnes : undefined,
    addresses: adresseObj ? [{ address: adresseObj, primary: true }] : [],
  };

  if (simulation) {
    return { status: 200, body: { success: true, action: 'creerait', lienMort, payload, simulation } };
  }

  const res = await fetch(`${COSTRUCTOR}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${costructorToken}` },
    body: JSON.stringify(payload),
  });
  const texte = await res.text();
  if (!res.ok) {
    console.error(`Création Costructor refusée (${res.status})`, texte);
    await alerter("la création du client a été refusée par Costructor. Vérifiez le nom, l'email et l'adresse de la fiche.");
    return { status: 502, body: { success: false, error: 'Création Costructor refusée' } };
  }
  let creeId = '';
  try { creeId = String(JSON.parse(texte)?.data?.id || ''); } catch { /* réponse illisible */ }
  if (!creeId) {
    await alerter("client créé mais son identifiant n'a pas été renvoyé. Retrouvez-le dans Costructor et collez son lien dans la fiche.");
    return { status: 502, body: { success: false, error: 'Identifiant Costructor absent' } };
  }
  const url = URL_CONTACT(creeId);
  if (!(await ecrireLien(id, clickUpToken, url))) {
    await alerter(`client créé mais le lien n'a pas pu être écrit dans la fiche : ${url}`);
    return { status: 502, body: { success: false, error: 'Écriture du lien impossible' } };
  }
  return { status: 200, body: { success: true, action: 'cree', client: { id: creeId, url }, lienMort } };
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

// Preview uniquement : ?taskId=...&simulation=1 (rien n'est écrit) ou ?taskId=...&executer=1 (vrai passage)
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
