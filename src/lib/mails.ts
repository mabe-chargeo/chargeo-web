import { createSign } from 'crypto';

// Envoi des mails depuis l'appli CHARGéO (Phase 9, lot 1, 05/11/2026).
// Décisions de Mathieu : les mails sont envoyés par l'appli, relus puis envoyés d'un clic, jamais automatiquement
// (04/11, 21 h 58) ; tous les mails partent de l'appli (05/11, 18 h 03) ; adresse d'envoi contact@chargeo.fr (05/11,
// 18 h 07).
// Compte de service Google « chargeo-mails », séparé de celui des agendas (src/lib/googleAgenda.ts), avec délégation au
// niveau du domaine limitée à https://www.googleapis.com/auth/gmail.send (réglage fait par Mathieu le 05/11 à 18 h 31).
// Configuration Vercel : GMAIL_SERVICE_ACCOUNT_JSON = contenu entier du fichier de clé JSON. Sans elle : « non branché ».
// L'expéditeur est imposé ici (EXPEDITEUR) : la clé pourrait en théorie envoyer au nom d'une autre adresse chargeo.fr,
// le code ne le fait jamais.
// Préversion (tout sauf la production Vercel) : le mail part seulement à la personne connectée (src/app/api/interne/
// mail/route.ts), jamais à un client.
// Gratuit (quotas Gmail API, envoi : 2 000 messages par jour et par compte Workspace).

export const EXPEDITEUR = 'contact@chargeo.fr';
const NOM_EXPEDITEUR = 'CHARGéO';
const SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const ENVOI = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
export const MAX_DESTINATAIRES = 10;

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
let jetonEnCache: { jeton: string; expire: number } | null = null;

// Jeton d'accès « au nom de » contact@chargeo.fr (délégation au niveau du domaine)
async function jeton(): Promise<string> {
  const c = compte();
  if (!c) throw new Error('envoi des mails non branché');
  if (jetonEnCache && jetonEnCache.expire > Date.now() + 60000) return jetonEnCache.jeton;
  const maintenant = Math.floor(Date.now() / 1000);
  const entete = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const charge = b64url(JSON.stringify({ iss: c.email, sub: EXPEDITEUR, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: maintenant, exp: maintenant + 3600 }));
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
  if (!r.ok || !j?.access_token) throw new Error(`accès refusé par Google (${j?.error_description || j?.error || r.status})`);
  jetonEnCache = { jeton: String(j.access_token), expire: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return jetonEnCache.jeton;
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
const lignes76 = (b64: string) => b64.replace(/(.{76})/g, '$1\r\n');

export type Mail = { a: string[]; cc: string[]; objet: string; texte: string };

// Message au format des mails (texte brut UTF-8)
export function messageBrut(m: Mail): string {
  const entetes = [
    `From: ${enteteEncode(NOM_EXPEDITEUR)} <${EXPEDITEUR}>`,
    `To: ${m.a.join(', ')}`,
    ...(m.cc.length ? [`Cc: ${m.cc.join(', ')}`] : []),
    `Subject: ${enteteEncode(m.objet)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  const corps = lignes76(Buffer.from(String(m.texte || '').replace(/\r?\n/g, '\r\n'), 'utf8').toString('base64'));
  return `${entetes.join('\r\n')}\r\n\r\n${corps}`;
}

// Envoie le mail depuis contact@chargeo.fr ; une erreur = rien n'est parti
export async function envoyerMail(m: Mail): Promise<{ id: string }> {
  if (!m.a.length) throw new Error('aucun destinataire');
  const r = await fetch(ENVOI, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await jeton()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: b64url(messageBrut(m)) }),
    cache: 'no-store',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.id) throw new Error(`envoi refusé par Google (${j?.error?.message || r.status})`);
  return { id: String(j.id) };
}
