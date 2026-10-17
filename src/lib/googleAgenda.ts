import { createSign } from 'crypto';

// Google Agenda des chefs de chantier et des installateurs (17/10/2026, 21 h 16, Matthieu : « il va falloir caler avec
// le Google agenda de toute façon pour être sûr de ne pas avoir de conflit »). Compte de service Google Workspace
// (Business Standard) avec délégation au niveau du domaine : le site agit au nom de la personne.
// Configuration Vercel : GOOGLE_SERVICE_ACCOUNT_JSON = contenu entier du fichier de clé JSON du compte de service.
// Délégation (admin.google.com, client 115771874577305581781) :
// - https://www.googleapis.com/auth/calendar.events : lire les événements, créer et déplacer les rendez-vous ;
// - https://www.googleapis.com/auth/calendar.calendarlist.readonly : liste des agendas affichés (17/10, 22 h 01, choix de
//   Matthieu « lis tous ses agendas affichés »). Sans cette autorisation, repli sur l'agenda principal seul, signalé.
// Sans la variable : « non branché », les écrans montrent seulement le planning de l'ERP.
// Lecture : horaires des événements seulement (ni titre ni lieu : l'agenda perso reste privé). Ignorés : annulés,
// « disponible », refusés, lieux de travail, nos propres rendez-vous (« releve… », « pose… », déjà dans le planning ERP),
// agendas de jours fériés, anniversaires et météo. Un agenda secondaire illisible est sauté (signalé).
// Écriture : dans l'agenda principal, identifiant fixe (préfixe + id de la fiche en hexadécimal, + « j<n> » par jour
// pour une pose sur plusieurs jours) : créé, déplacé au décalage, retiré de l'agenda d'une personne qui n'y est plus.
// 17/10, 22 h 49 : poserEvenement / retirerEvenement génériques pour les poses (src/app/api/interne/planifier).
// Gratuit (doc Google « Usage limits », 11/09/2026) : 10 000 requêtes par minute par projet, 600 par utilisateur.

const SCOPE_EVENEMENTS = 'https://www.googleapis.com/auth/calendar.events';
const SCOPE_LISTE = 'https://www.googleapis.com/auth/calendar.calendarlist.readonly';
const RACINE = 'https://www.googleapis.com/calendar/v3';
const API = `${RACINE}/calendars/primary/events`;
const PAGES_MAX = 4;
const AGENDAS_MAX = 12;
const NOS_PREFIXES = ['releve', 'pose'];

function compte(): { email: string; cle: string } | null {
  const brut = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
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
export const agendaBranche = () => compte() !== null;

const b64url = (s: string | Buffer) => Buffer.from(s).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jetons = new Map<string, { jeton: string; expire: number }>();

// Jeton d'accès « au nom de » la personne (délégation au niveau du domaine)
async function jetonPour(sujet: string, scopes: string[] = [SCOPE_EVENEMENTS]): Promise<string> {
  const c = compte();
  if (!c) throw new Error('Google Agenda non branché');
  const scope = scopes.join(' ');
  const cleCache = `${sujet}|${scope}`;
  const deja = jetons.get(cleCache);
  if (deja && deja.expire > Date.now() + 60000) return deja.jeton;
  const maintenant = Math.floor(Date.now() / 1000);
  const entete = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const charge = b64url(JSON.stringify({ iss: c.email, sub: sujet, scope, aud: 'https://oauth2.googleapis.com/token', iat: maintenant, exp: maintenant + 3600 }));
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
  jetons.set(cleCache, { jeton: String(j.access_token), expire: Date.now() + (Number(j.expires_in) || 3600) * 1000 });
  return String(j.access_token);
}

// Identifiant d'événement (caractères a à v et 0 à 9 seulement, exigés par Google)
export const idEvenement = (prefixe: string, ficheId: string, n = 0) => `${prefixe}${Buffer.from(String(ficheId)).toString('hex')}${n ? `j${n}` : ''}`;
export const idEvenementReleve = (ficheId: string) => idEvenement('releve', ficheId);

// Jour (AAAA-MM-JJ) et minutes depuis minuit, heure de Paris
function paris(ms: number): { jour: string; minutes: number } {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms));
  const v = (t: string) => p.find((x) => x.type === t)?.value || '00';
  return { jour: `${v('year')}-${v('month')}-${v('day')}`, minutes: Number(v('hour')) * 60 + Number(v('minute')) };
}
const lendemain = (iso: string) => {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j + 1, 12)).toISOString().slice(0, 10);
};
// Agendas sans rendez-vous réels : jours fériés, anniversaires des contacts, météo
const agendaIgnore = (id: string) => /#holiday@|#contacts@|#weather@|#daynum@/i.test(id);

// Agendas affichés de la personne (principal en premier). complet = false si la liste n'est pas autorisée.
async function agendasAffiches(email: string): Promise<{ ids: string[]; complet: boolean }> {
  let jeton = '';
  try {
    jeton = await jetonPour(email, [SCOPE_EVENEMENTS, SCOPE_LISTE]);
  } catch {
    return { ids: ['primary'], complet: false };
  }
  const r = await fetch(`${RACINE}/users/me/calendarList?maxResults=250&fields=items(id,primary,selected,hidden,deleted)`, { headers: { Authorization: `Bearer ${jeton}` }, cache: 'no-store' });
  if (!r.ok) return { ids: ['primary'], complet: false };
  const j = await r.json().catch(() => ({}));
  const autres = (Array.isArray(j?.items) ? j.items : [])
    .filter((c: any) => !c?.primary && c?.selected && !c?.hidden && !c?.deleted && c?.id && !agendaIgnore(String(c.id)))
    .map((c: any) => String(c.id));
  return { ids: ['primary'].concat(autres).slice(0, AGENDAS_MAX), complet: true };
}

export type CreneauAgenda = { jour: string; debut: number; fin: number; journee: boolean };
export type LectureAgenda = { creneaux: CreneauAgenda[]; agendas: number; listeComplete: boolean; sautes: number };

// Créneaux occupés d'un agenda, découpés par jour
async function lireUnAgenda(jeton: string, agendaId: string, depuis: Date, jusque: Date): Promise<CreneauAgenda[]> {
  const creneaux: CreneauAgenda[] = [];
  let page = '';
  for (let n = 0; n < PAGES_MAX; n++) {
    const q = new URLSearchParams({
      timeMin: depuis.toISOString(),
      timeMax: jusque.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
      fields: 'items(id,status,transparency,eventType,start,end,attendees(self,responseStatus)),nextPageToken',
    });
    if (page) q.set('pageToken', page);
    const r = await fetch(`${RACINE}/calendars/${encodeURIComponent(agendaId)}/events?${q.toString()}`, { headers: { Authorization: `Bearer ${jeton}` }, cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`lecture refusée par Google (${j?.error?.message || r.status})`);
    for (const e of Array.isArray(j?.items) ? j.items : []) {
      if (e?.status === 'cancelled' || e?.transparency === 'transparent' || e?.eventType === 'workingLocation') continue;
      const id = String(e?.id || '');
      if (NOS_PREFIXES.some((p) => id.startsWith(p))) continue;
      const moi = (Array.isArray(e?.attendees) ? e.attendees : []).find((a: any) => a?.self);
      if (moi?.responseStatus === 'declined') continue;
      if (e?.start?.date) {
        // Toute la journée : de start.date à end.date (exclu)
        let jour = String(e.start.date);
        const fin = String(e?.end?.date || lendemain(jour));
        for (let k = 0; jour < fin && k < 40; k++, jour = lendemain(jour)) creneaux.push({ jour, debut: 0, fin: 1440, journee: true });
        continue;
      }
      const debutMs = Date.parse(String(e?.start?.dateTime || ''));
      const finMs = Date.parse(String(e?.end?.dateTime || ''));
      if (!Number.isFinite(debutMs) || !Number.isFinite(finMs) || finMs <= debutMs) continue;
      let cur = debutMs;
      for (let k = 0; cur < finMs && k < 40; k++) {
        const p = paris(cur);
        const finJour = cur + (1440 - p.minutes) * 60000;
        const bout = Math.min(finMs, finJour);
        creneaux.push({ jour: p.jour, debut: p.minutes, fin: Math.min(1440, p.minutes + Math.round((bout - cur) / 60000)), journee: false });
        cur = bout;
      }
    }
    page = String(j?.nextPageToken || '');
    if (!page) break;
  }
  return creneaux;
}

// Créneaux occupés de tous les agendas affichés de la personne (sans doublon)
export async function occupationsAgenda(email: string, depuis: Date, jusque: Date): Promise<LectureAgenda> {
  const jeton = await jetonPour(email);
  const { ids, complet } = await agendasAffiches(email);
  const lus = await Promise.allSettled(ids.map((id) => lireUnAgenda(jeton, id, depuis, jusque)));
  if (lus[0].status !== 'fulfilled') throw (lus[0] as PromiseRejectedResult).reason;
  const vus = new Set<string>();
  const creneaux: CreneauAgenda[] = [];
  let sautes = 0;
  for (const r of lus) {
    if (r.status !== 'fulfilled') { sautes++; continue; }
    for (const c of r.value) {
      const cle = `${c.jour}|${c.debut}|${c.fin}`;
      if (vus.has(cle)) continue;
      vus.add(cle);
      creneaux.push(c);
    }
  }
  return { creneaux, agendas: ids.length - sautes, listeComplete: complet, sautes };
}

// Crée (ou déplace et réactive) un événement d'identifiant fixe dans l'agenda principal de la personne
export async function poserEvenement(email: string, id: string, e: { debutMs: number; finMs: number; titre: string; lieu: string; description: string }): Promise<'cree' | 'deplace'> {
  const jeton = await jetonPour(email);
  const corps = {
    summary: e.titre,
    location: e.lieu || undefined,
    description: e.description,
    start: { dateTime: new Date(e.debutMs).toISOString(), timeZone: 'Europe/Paris' },
    end: { dateTime: new Date(e.finMs).toISOString(), timeZone: 'Europe/Paris' },
    status: 'confirmed',
  };
  const entetes = { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' };
  const r = await fetch(API, { method: 'POST', headers: entetes, body: JSON.stringify(Object.assign({ id }, corps)), cache: 'no-store' });
  if (r.ok) return 'cree';
  if (r.status !== 409) {
    const j = await r.json().catch(() => ({}));
    throw new Error(`événement refusé par Google (${j?.error?.message || r.status})`);
  }
  const p = await fetch(`${API}/${id}`, { method: 'PATCH', headers: entetes, body: JSON.stringify(corps), cache: 'no-store' });
  if (!p.ok) {
    const j = await p.json().catch(() => ({}));
    throw new Error(`déplacement refusé par Google (${j?.error?.message || p.status})`);
  }
  return 'deplace';
}

// Retire un événement de l'agenda d'une personne (absent : rien à faire)
export async function retirerEvenement(email: string, id: string): Promise<void> {
  const jeton = await jetonPour(email);
  const r = await fetch(`${API}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${jeton}` }, cache: 'no-store' });
  if (!r.ok && r.status !== 404 && r.status !== 410) throw new Error(`suppression refusée par Google (${r.status})`);
}

// Relevé technique (écran Caler) : 1 événement par fiche
export async function poserReleve(email: string, ficheId: string, e: { debutMs: number; dureeMin: number; titre: string; lieu: string; description: string }): Promise<'cree' | 'deplace'> {
  return poserEvenement(email, idEvenementReleve(ficheId), { debutMs: e.debutMs, finMs: e.debutMs + e.dureeMin * 60000, titre: e.titre, lieu: e.lieu, description: e.description });
}
export async function retirerReleve(email: string, ficheId: string): Promise<void> {
  return retirerEvenement(email, idEvenementReleve(ficheId));
}
