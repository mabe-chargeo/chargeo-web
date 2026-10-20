// Session de l'application équipe (Phase 6, décision du 10/10/2026 : compte nominatif relié au compte ClickUp par OAuth).
// Cookie signé (HMAC SHA-256) : identifiant, nom et email ClickUp de la personne, expiration 30 jours.
// Clé : SESSION_SECRET, sinon CLICKUP_OAUTH_CLIENT_SECRET (une variable de moins à créer dans Vercel).
// Web Crypto uniquement : utilisable dans src/proxy.ts comme dans les routes.
import { adresses } from '@/lib/adresses';
export const COOKIE_SESSION = 'chargeo_session';
export const DUREE_SESSION_S = 30 * 24 * 3600;

export type Session = { id: number; nom: string; email: string; exp: number };

const encodeur = new TextEncoder();
const cleSecrete = () => process.env.SESSION_SECRET?.trim() || process.env.CLICKUP_OAUTH_CLIENT_SECRET?.trim() || '';

function versBase64Url(octets: Uint8Array): string {
  let binaire = '';
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function depuisBase64Url(texte: string): Uint8Array {
  const b64 = texte.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((texte.length + 3) % 4);
  const binaire = atob(b64);
  return Uint8Array.from(binaire, (c) => c.charCodeAt(0));
}

async function signer(donnees: string, secret: string): Promise<string> {
  const cle = await crypto.subtle.importKey('raw', encodeur.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return versBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', cle, encodeur.encode(donnees))));
}

function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function creerSession(personne: Omit<Session, 'exp'>): Promise<string | null> {
  const secret = cleSecrete();
  if (!secret) return null;
  const session: Session = { ...personne, exp: Math.floor(Date.now() / 1000) + DUREE_SESSION_S };
  const corps = versBase64Url(encodeur.encode(JSON.stringify(session)));
  return `${corps}.${await signer(corps, secret)}`;
}

export async function lireSession(valeur: string | undefined | null): Promise<Session | null> {
  const secret = cleSecrete();
  if (!secret || !valeur) return null;
  const [corps, signature] = valeur.split('.');
  if (!corps || !signature || !egal(signature, await signer(corps, secret))) return null;
  try {
    const session = JSON.parse(new TextDecoder().decode(depuisBase64Url(corps))) as Session;
    if (!session?.id || !session.exp || session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

// Session d'une requête de route (en-tête Cookie)
export async function sessionDeRequete(request: Request): Promise<Session | null> {
  const cookies = request.headers.get('cookie') || '';
  const trouve = cookies.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE_SESSION}=`));
  return lireSession(trouve ? decodeURIComponent(trouve.slice(COOKIE_SESSION.length + 1)) : null);
}

// Adresse de retour après connexion : chemin interne uniquement (pas de redirection vers un autre site).
// Sans page demandée : Ma journée, la page d'accueil de l'application (Matthieu, 19/10/2026, 13 h 24).
// 19/10/2026, 18 h 43 : adresse lue dans src/lib/adresses.ts.
export function cheminSur(suivant: string | null | undefined): string {
  const s = String(suivant || '');
  return s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\') ? s : adresses.journee;
}
