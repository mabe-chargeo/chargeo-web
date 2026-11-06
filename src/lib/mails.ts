import { createSign, randomBytes } from 'crypto';

// Envoi des mails depuis l'appli CHARGéO (Phase 9, lot 1, 05/11/2026).
// Décisions de Mathieu : les mails sont envoyés par l'appli, relus puis envoyés d'un clic, jamais automatiquement
// (04/11, 21 h 58) ; tous les mails partent de l'appli (05/11, 18 h 03) ; adresse d'envoi contact@chargeo.fr (05/11,
// 18 h 07).
// Compte de service Google « chargeo-mails », séparé de celui des agendas (src/lib/googleAgenda.ts), avec délégation au
// niveau du domaine (réglage fait par Mathieu le 05/11 à 18 h 31, droits ajoutés ensuite) :
//   - https://www.googleapis.com/auth/gmail.send : envoyer ;
//   - https://www.googleapis.com/auth/gmail.settings.basic : lire le nom d'envoi et la signature de contact@chargeo.fr
//     (droit donné le 05/11 à 19 h pour la signature ; le code ne modifie jamais les réglages Gmail) ;
//   - https://www.googleapis.com/auth/gmail.readonly : retrouver les derniers échanges avec les adresses d'une fiche,
//     pour répondre dans le fil (décision de Mathieu du 05/11 à 21 h 22, droit donné à 21 h 28). Le code ne lit que les
//     en-têtes (objet, expéditeur, date, identifiants), jamais le contenu des mails.
// Configuration Vercel : GMAIL_SERVICE_ACCOUNT_JSON = contenu entier du fichier de clé JSON. Sans elle : « non branché ».
// L'expéditeur est imposé ici (EXPEDITEUR) : la clé pourrait en théorie envoyer au nom d'une autre adresse chargeo.fr,
// le code ne le fait jamais.
// Nom et signature (retour de Mathieu du 05/11, 19 h 00 : « il n'y a pas de signature de mail et le mail est envoyé au
// nom de CHARGéO au lieu de L'équipe CHARGéO ») : repris des réglages Gmail de contact@chargeo.fr, seule source. On
// change la signature dans Gmail, l'appli suit en 10 minutes au plus. Droit de lecture absent ou signature vide : nom
// « L'équipe CHARGéO », mail sans signature, et l'écran le dit avant l'envoi. L'envoi ne dépend jamais des droits de
// lecture (un jeton par droit).
// Le mail part en HTML (texte saisi puis signature Gmail telle quelle), avec la même chose en texte brut à côté.
// Préversion (tout sauf la production Vercel) : le mail part seulement à la personne connectée (src/app/api/interne/
// mail/route.ts), jamais à un client.
// Gratuit (quotas Gmail API, envoi : 2 000 messages par jour et par compte Workspace).
// 06/11/2026, 21 h 16 (Phase 9, lot 3, accord de Mathieu : la brochure projet part avec le devis) : pièces jointes
// (fichiers de la fiche ClickUp, lus par la route). Le message passe alors en multipart/mixed et part par le point
// d'envoi « upload » de Gmail, qui accepte jusqu'à 35 Mo.

export const EXPEDITEUR = 'contact@chargeo.fr';
export const NOM_PAR_DEFAUT = "L'équipe CHARGéO";
const SCOPE_ENVOI = 'https://www.googleapis.com/auth/gmail.send';
const SCOPE_REGLAGES = 'https://www.googleapis.com/auth/gmail.settings.basic';
const SCOPE_LECTURE = 'https://www.googleapis.com/auth/gmail.readonly';
const MESSAGES = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';
const ENVOI = `${MESSAGES}/send`;
const ENVOI_UPLOAD = 'https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=multipart';
const REGLAGES = `https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs/${encodeURIComponent(EXPEDITEUR)}`;
const CACHE_REGLAGES = 10 * 60 * 1000;
export const MAX_DESTINATAIRES = 10;
// Pièces jointes : 20 Mo au total (le mail encodé reste sous les 35 Mo de Gmail)
export const MAX_PIECES_OCTETS = 20 * 1024 * 1024;

function compte(): { email: string; cle: string } | null {
  const brut = process.env.GMAIL_SERVICE_ACCOUNT_JSON;
  if (!brut) return null;
  try {
    const j = JSON.parse(brut);
    const email = String(j?.client_email || '').trim();
    const cle = String(j?.private_key || '').replace(/\\n/g, '\n');
    return email && cle.includes('PRIVATE KEY') ? { email, cle } : null;
  } catch {
    return null;
  }
}
export const mailBranche = () => compte() !== null;
export const enPreversion = () => process.env.VERCEL_ENV !== 'production';

const b64url = (s: string | Buffer) => Buffer.from(s).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jetons = new Map<string, { jeton: string; expire: number }>();

// Jeton d'accès « au nom de » contact@chargeo.fr (délégation au niveau du domaine), un par droit
async function jeton(scope: string): Promise<string> {
  const c = compte();
  if (!c) throw new Error('envoi des mails non branché');
  const enCache = jetons.get(scope);
  if (enCache && enCache.expire > Date.now() + 60000) return enCache.jeton;
  const maintenant = Math.floor(Date.now() / 1000);
  const entete = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const charge = b64url(JSON.stringify({ iss: c.email, sub: EXPEDITEUR, scope, aud: 'https://oauth2.googleapis.com/token', iat: maintenant, exp: maintenant + 3600 }));
  const signe = createSign('RSA-SHA256');
  signe.update(`${entete}.${charge}`);
  const signature = b64url(signe.sign(c.cle));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${entete}.${charge}.${signature}` }).toString(),
    cache: 'no-store',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.access_token) throw new Error(`accès refusé par Google (${j?.error || r.status}${j?.error_description ? ` : ${j.error_description}` : ''})`);
  const valeur = String(j.access_token);
  jetons.set(scope, { jeton: valeur, expire: Date.now() + (Number(j.expires_in) || 3600) * 1000 });
  return valeur;
}

// Adresses saisies (virgules, points-virgules ou espaces), en minuscules, sans doublon ; les mal formées à part
const EMAIL = /^[^\s@<>,;:"()[\]\\]+@[^\s@<>,;:"()[\]\\]+\.[a-z]{2,}$/i;
export const estEmail = (s: string) => EMAIL.test(String(s || '').trim());
export function adressesValides(brut: unknown): { ok: string[]; refusees: string[] } {
  const liste = (Array.isArray(brut) ? brut.join(',') : String(brut ?? '')).split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
  const ok: string[] = [];
  const refusees: string[] = [];
  for (const a of liste) {
    const m = a.toLowerCase();
    if (EMAIL.test(m)) { if (!ok.includes(m)) ok.push(m); } else refusees.push(a);
  }
  return { ok, refusees };
}

const sansSaut = (s: string) => String(s || '').replace(/[\r\n]+/g, ' ').trim();
// En-tête avec accents : mots encodés UTF-8 (RFC 2047), découpés pour rester courts
function enteteEncode(s: string): string {
  const t = sansSaut(s);
  if (/^[\x20-\x7e]*$/.test(t)) return t;
  const morceaux: string[] = [];
  let cour = '';
  for (const ch of Array.from(t)) {
    if (cour && Buffer.byteLength(cour + ch) > 45) { morceaux.push(cour); cour = ''; }
    cour += ch;
  }
  if (cour) morceaux.push(cour);
  return morceaux.map((m) => `=?UTF-8?B?${Buffer.from(m).toString('base64')}?=`).join('\r\n ');
}
// Nom d'expéditeur : mots encodés s'il a des accents, sinon entre guillemets (virgule, apostrophe… sans risque)
function nomEnTete(nom: string): string {
  const t = sansSaut(nom);
  return /^[\x20-\x7e]*$/.test(t) ? `"${t.replace(/["\\]/g, '\\$&')}"` : enteteEncode(t);
}
const lignes76 = (b64: string) => b64.replace(/(.{76})/g, '$1\r\n');

// Signature HTML de Gmail en texte brut (version texte du mail, copie sur la fiche)
const ENTITES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë',
  agrave: 'à', acirc: 'â', ccedil: 'ç', ugrave: 'ù', ucirc: 'û', ocirc: 'ô', icirc: 'î', iuml: 'ï', Eacute: 'É',
  Egrave: 'È', Agrave: 'À', Ccedil: 'Ç', middot: '·', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', laquo: '«',
  raquo: '»', euro: '€', hellip: '…', ndash: '–', mdash: '—', bull: '•', copy: '©', reg: '®',
};
const caractere = (n: number) => (Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '');
function decodeEntites(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (tout: string, e: string) => {
    if (e[0] === '#') return caractere(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) || tout;
    return ENTITES[e] ?? ENTITES[e.toLowerCase()] ?? tout;
  });
}
export function htmlEnTexte(html: string): string {
  const t = String(html || '')
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|tr|li|table|h[1-6])\s*>/gi, '\n')
    .replace(/<\/t[dh]\s*>/gi, ' ')
    .replace(/<[^>]*>/g, '');
  return decodeEntites(t)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Corps HTML : le texte saisi tel quel (sauts de ligne gardés), puis la signature Gmail telle quelle
const echappe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function corpsHtml(texte: string, signatureHtml: string): string {
  const corps = echappe(String(texte || '')).replace(/\r?\n/g, '<br>');
  const sig = signatureHtml ? `<br><br><div dir="ltr" class="gmail_signature" data-smartmail="gmail_signature">${signatureHtml}</div>` : '';
  return `<div dir="ltr">${corps}${sig}</div>`;
}

// Réponse dans un fil : identifiant du fil Gmail, Message-ID du mail auquel on répond et ses References
export type Reponse = { threadId: string; messageId: string; references: string };
// Pièce jointe : nom du fichier, type (application/pdf…), contenu
export type Piece = { nom: string; type: string; contenu: Buffer };
export type Mail = { a: string[]; cc: string[]; objet: string; texte: string; reponse?: Reponse; pieces?: Piece[] };
export type Expediteur = { nom: string; signatureHtml: string; signatureTexte: string; probleme?: string };

let reglagesEnCache: { v: Expediteur; expire: number } | null = null;

// Nom d'envoi et signature de contact@chargeo.fr, lus dans Gmail. Jamais d'erreur : repli sur « L'équipe CHARGéO »
// sans signature, avec la raison (affichée à l'écran avant l'envoi)
export async function expediteur(): Promise<Expediteur> {
  if (reglagesEnCache && reglagesEnCache.expire > Date.now()) return reglagesEnCache.v;
  try {
    const r = await fetch(REGLAGES, { headers: { Authorization: `Bearer ${await jeton(SCOPE_REGLAGES)}` }, cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`lecture refusée par Google (${j?.error?.message || r.status})`);
    const nom = String(j?.displayName || '').trim() || NOM_PAR_DEFAUT;
    const html = String(j?.signature || '').trim();
    const v: Expediteur = html
      ? { nom, signatureHtml: html, signatureTexte: htmlEnTexte(html) }
      : { nom, signatureHtml: '', signatureTexte: '', probleme: 'aucune signature réglée dans Gmail pour contact@chargeo.fr' };
    reglagesEnCache = { v, expire: Date.now() + CACHE_REGLAGES };
    return v;
  } catch (e: any) {
    const raison = String(e?.message || 'erreur Google');
    return {
      nom: NOM_PAR_DEFAUT,
      signatureHtml: '',
      signatureTexte: '',
      probleme: /unauthorized_client/.test(raison) ? 'droit de lecture des réglages Gmail pas encore donné au compte chargeo-mails' : raison,
    };
  }
}

// ── Fils de la boîte contact@chargeo.fr (en-têtes seulement) ──
export type Fil = { id: string; threadId: string; objet: string; de: string; date: number; messageId: string; references: string };
const enTeteDe = (m: any, nom: string) =>
  String((Array.isArray(m?.payload?.headers) ? m.payload.headers : []).find((h: any) => String(h?.name || '').toLowerCase() === nom.toLowerCase())?.value || '');

async function lireEnTetes(id: string, acces: string): Promise<Fil | null> {
  const p = new URLSearchParams({ format: 'metadata' });
  for (const h of ['Subject', 'From', 'Date', 'Message-ID', 'References']) p.append('metadataHeaders', h);
  const r = await fetch(`${MESSAGES}/${encodeURIComponent(id)}?${p.toString()}`, { headers: { Authorization: `Bearer ${acces}` }, cache: 'no-store' });
  if (!r.ok) return null;
  const m = await r.json().catch(() => null);
  if (!m?.id) return null;
  return {
    id: String(m.id),
    threadId: String(m.threadId || ''),
    objet: enTeteDe(m, 'Subject'),
    de: enTeteDe(m, 'From'),
    date: Number(m.internalDate) || 0,
    messageId: enTeteDe(m, 'Message-ID'),
    references: enTeteDe(m, 'References'),
  };
}

// Derniers fils échangés avec ces adresses (5 au plus, le plus récent d'abord, dernier message de chaque fil). Jamais
// d'erreur : liste vide avec la raison
export async function filsAvec(adresses: string[]): Promise<{ fils: Fil[]; probleme?: string }> {
  const liste = Array.from(new Set(adresses.map((a) => String(a || '').trim().toLowerCase()).filter(estEmail))).slice(0, 6);
  if (!liste.length) return { fils: [] };
  try {
    const acces = await jeton(SCOPE_LECTURE);
    const q = `{${liste.map((a) => `from:${a} to:${a} cc:${a}`).join(' ')}} -in:chats -in:spam -in:trash newer_than:2y`;
    const r = await fetch(`${MESSAGES}?${new URLSearchParams({ q, maxResults: '20' }).toString()}`, { headers: { Authorization: `Bearer ${acces}` }, cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`lecture refusée par Google (${d?.error?.message || r.status})`);
    const ids: string[] = (Array.isArray(d?.messages) ? d.messages : []).map((x: any) => String(x?.id || '')).filter(Boolean);
    const lus = (await Promise.all(ids.map((id) => lireEnTetes(id, acces)))).filter((x): x is Fil => !!x && !!x.threadId);
    const parFil = new Map<string, Fil>();
    for (const f of lus) {
      const deja = parFil.get(f.threadId);
      if (!deja || f.date > deja.date) parFil.set(f.threadId, f);
    }
    return { fils: Array.from(parFil.values()).sort((a, b) => b.date - a.date).slice(0, 5) };
  } catch (e: any) {
    const raison = String(e?.message || 'erreur Google');
    return { fils: [], probleme: /unauthorized_client/.test(raison) ? 'droit de lecture de la boîte contact@chargeo.fr pas encore donné au compte chargeo-mails' : raison };
  }
}

// Mail de la boîte contact@chargeo.fr auquel on répond (relu côté serveur avant l'envoi), null s'il est introuvable
export async function mailPourReponse(id: string): Promise<Fil | null> {
  if (!/^[a-z0-9]+$/i.test(String(id || ''))) return null;
  try {
    return await lireEnTetes(id, await jeton(SCOPE_LECTURE));
  } catch {
    return null;
  }
}

// References d'une réponse : celles du mail reçu (10 dernières au plus) puis son Message-ID
const referencesDe = (r: Reponse) => sansSaut([...r.references.split(/\s+/).filter(Boolean).slice(-10), r.messageId].join(' '));

// Nom d'une pièce jointe dans les en-têtes : tel quel en ASCII, sinon encodé en UTF-8 (RFC 2231)
function nomPiece(nom: string): { name: string; filename: string } {
  const t = sansSaut(nom).replace(/["\\]/g, '') || 'piece-jointe';
  if (/^[\x20-\x7e]*$/.test(t)) return { name: `name="${t}"`, filename: `filename="${t}"` };
  const code = encodeURIComponent(t).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return { name: `name="${enteteEncode(t)}"`, filename: `filename*=UTF-8''${code}` };
}

// Message au format des mails : texte brut et HTML (même contenu), signature Gmail comprise, puis les pièces jointes
const partie = (type: string, contenu: string) =>
  [`Content-Type: ${type}; charset=UTF-8`, 'Content-Transfer-Encoding: base64', '', lignes76(Buffer.from(contenu.replace(/\r?\n/g, '\r\n'), 'utf8').toString('base64'))].join('\r\n');
export function messageBrut(m: Mail, exp: Expediteur): string {
  const limite = `chargeo-${randomBytes(12).toString('hex')}`;
  const texte = String(m.texte || '');
  const reponse = m.reponse?.messageId ? m.reponse : null;
  const pieces = m.pieces || [];
  const alternative = [
    `Content-Type: multipart/alternative; boundary="${limite}"`,
    '',
    `--${limite}`,
    partie('text/plain', exp.signatureTexte ? `${texte}\n\n${exp.signatureTexte}` : texte),
    `--${limite}`,
    partie('text/html', corpsHtml(texte, exp.signatureHtml)),
    `--${limite}--`,
  ];
  const mixte = `chargeo-pj-${randomBytes(12).toString('hex')}`;
  const corps = pieces.length
    ? [
      `Content-Type: multipart/mixed; boundary="${mixte}"`,
      '',
      `--${mixte}`,
      ...alternative,
      ...pieces.flatMap((p) => {
        const n = nomPiece(p.nom);
        return [
          `--${mixte}`,
          `Content-Type: ${p.type || 'application/octet-stream'}; ${n.name}`,
          `Content-Disposition: attachment; ${n.filename}`,
          'Content-Transfer-Encoding: base64',
          '',
          lignes76(p.contenu.toString('base64')),
        ];
      }),
      `--${mixte}--`,
    ]
    : alternative;
  return [
    `From: ${nomEnTete(exp.nom || NOM_PAR_DEFAUT)} <${EXPEDITEUR}>`,
    `To: ${m.a.join(', ')}`,
    ...(m.cc.length ? [`Cc: ${m.cc.join(', ')}`] : []),
    `Subject: ${enteteEncode(m.objet)}`,
    ...(reponse ? [`In-Reply-To: ${sansSaut(reponse.messageId)}`, `References: ${referencesDe(reponse)}`] : []),
    'MIME-Version: 1.0',
    ...corps,
    '',
  ].join('\r\n');
}

// Envoie le mail depuis contact@chargeo.fr, avec le nom et la signature de Gmail, dans le fil si c'est une réponse ;
// une erreur = rien n'est parti. Avec des pièces jointes : point d'envoi « upload » (message entier, jusqu'à 35 Mo)
export async function envoyerMail(m: Mail): Promise<{ id: string; exp: Expediteur }> {
  if (!m.a.length) throw new Error('aucun destinataire');
  const exp = await expediteur();
  const acces = await jeton(SCOPE_ENVOI);
  const brut = messageBrut(m, exp);
  let r: Response;
  if (m.pieces?.length) {
    const lim = `chargeo-up-${randomBytes(12).toString('hex')}`;
    const meta = JSON.stringify(m.reponse?.threadId ? { threadId: m.reponse.threadId } : {});
    const corps = Buffer.concat([
      Buffer.from(`--${lim}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${lim}\r\nContent-Type: message/rfc822\r\n\r\n`, 'utf8'),
      Buffer.from(brut, 'utf8'),
      Buffer.from(`\r\n--${lim}--`, 'utf8'),
    ]);
    r = await fetch(ENVOI_UPLOAD, {
      method: 'POST',
      headers: { Authorization: `Bearer ${acces}`, 'Content-Type': `multipart/related; boundary=${lim}` },
      body: corps as unknown as BodyInit,
      cache: 'no-store',
    });
  } else {
    r = await fetch(ENVOI, {
      method: 'POST',
      headers: { Authorization: `Bearer ${acces}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: b64url(brut), ...(m.reponse?.threadId ? { threadId: m.reponse.threadId } : {}) }),
      cache: 'no-store',
    });
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.id) throw new Error(`envoi refusé par Google (${j?.error?.message || r.status})`);
  return { id: String(j.id), exp };
}
