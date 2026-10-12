import crypto from 'crypto';
import { alerter } from '@/lib/alerteSite';

// Abonnement du site aux changements ClickUp (webhook API, décision Matthieu du 12/10/2026).
// Un seul abonnement pour tout l'espace de travail : ClickUp prévient /api/webhooks/clickup à chaque tâche créée,
// statut modifié ou champ modifié, et l'aiguillage (src/lib/aiguillage.ts) choisit quoi faire.
// - Signature : chaque envoi est signé par ClickUp (en-tête X-Signature = HMAC SHA-256 du corps avec le secret de
//   l'abonnement). Le secret est relu dans ClickUp (liste des webhooks de l'espace), ou pris dans la variable
//   Vercel CLICKUP_WEBHOOK_SECRET si elle existe. Un envoi mal signé est refusé.
// - Adresse : production = domaine de production (CHARGEO_SITE_URL ou VERCEL_PROJECT_PRODUCTION_URL, sinon chargeo.fr).
//   Preview = adresse fixe de la branche (VERCEL_BRANCH_URL), avec le jeton Vercel « Protection Bypass for Automation »
//   (VERCEL_AUTOMATION_BYPASS_SECRET), sans quoi ClickUp serait bloqué par la protection des previews.
// - Santé : ClickUp suspend un abonnement après trop d'échecs. Le contrôle quotidien le réactive et prévient
//   (tâche CLICKUP_TACHE_ALERTES_ID si elle est renseignée).

const TEAM_ID = process.env.CLICKUP_TEAM_ID || '90151325642';
const CHEMIN = '/api/webhooks/clickup';
export const EVENEMENTS_WEBHOOK = ['taskCreated', 'taskUpdated', 'taskStatusUpdated'];
const secrets = new Map<string, string>();

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

export async function listerWebhooks(token: string): Promise<any[] | null> {
  const res = await api(token, `/team/${TEAM_ID}/webhook`);
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json?.webhooks) ? json.webhooks : [];
}

export function adresseWebhook(): { url: string; erreur?: string } {
  if (process.env.VERCEL_ENV === 'production') {
    const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '';
    const base = (process.env.CHARGEO_SITE_URL || prod || 'https://chargeo.fr').replace(/\/$/, '');
    return { url: `${base}${CHEMIN}` };
  }
  const branche = process.env.VERCEL_BRANCH_URL;
  if (!branche) return { url: '', erreur: "Adresse de la branche introuvable (VERCEL_BRANCH_URL)" };
  const jeton = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!jeton) {
    return { url: `https://${branche}${CHEMIN}`, erreur: "Active « Protection Bypass for Automation » dans Vercel (Settings > Deployment Protection), puis redéploie : sans ce jeton, ClickUp est bloqué par la protection des previews." };
  }
  return { url: `https://${branche}${CHEMIN}?x-vercel-protection-bypass=${encodeURIComponent(jeton)}` };
}

const sansRequete = (u: string) => String(u || '').split('?')[0];
export const estNotreAdresse = (w: any, url: string) => !!url && sansRequete(w?.endpoint) === sansRequete(url);
// Résumé sans secret ni jeton
export const resumeWebhook = (w: any) => ({
  id: w?.id,
  adresse: sansRequete(w?.endpoint) + (String(w?.endpoint || '').includes('?') ? ' (+ jeton Vercel)' : ''),
  evenements: w?.events,
  sante: w?.health?.status,
  echecs: w?.health?.fail_count,
});

export async function secretDuWebhook(token: string, webhookId: string): Promise<string | null> {
  if (process.env.CLICKUP_WEBHOOK_SECRET) return process.env.CLICKUP_WEBHOOK_SECRET;
  if (!webhookId) return null;
  if (secrets.has(webhookId)) return secrets.get(webhookId) as string;
  const liste = await listerWebhooks(token);
  const w = (liste || []).find((x: any) => String(x?.id) === webhookId);
  if (!w?.secret) return null;
  secrets.set(webhookId, String(w.secret));
  return String(w.secret);
}

export function signatureValide(brut: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const attendu = crypto.createHmac('sha256', secret).update(brut).digest('hex');
  const a = Buffer.from(attendu, 'utf8');
  const b = Buffer.from(String(signature).trim().toLowerCase(), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function installerWebhook(token: string) {
  const { url, erreur } = adresseWebhook();
  if (erreur) return { success: false, error: erreur };
  const liste = await listerWebhooks(token);
  if (!liste) return { success: false, error: 'Lecture des webhooks ClickUp impossible' };
  const existant = liste.find((w) => estNotreAdresse(w, url));
  if (existant) return { success: true, action: 'deja_installe', webhook: resumeWebhook(existant) };
  const res = await api(token, `/team/${TEAM_ID}/webhook`, 'POST', { endpoint: url, events: EVENEMENTS_WEBHOOK });
  const texte = await res.text();
  if (!res.ok) return { success: false, error: `Création refusée par ClickUp (${res.status})`, detail: texte.slice(0, 200) };
  const json = (() => { try { return JSON.parse(texte); } catch { return {}; } })();
  const id = String(json?.id || json?.webhook?.id || '');
  if (id && json?.webhook?.secret) secrets.set(id, String(json.webhook.secret));
  return { success: true, action: 'installe', webhook: resumeWebhook({ ...(json?.webhook || {}), id, endpoint: url, events: EVENEMENTS_WEBHOOK }) };
}

export async function supprimerWebhook(token: string, id: string) {
  const liste = await listerWebhooks(token);
  if (!liste) return { success: false, error: 'Lecture des webhooks ClickUp impossible' };
  const w = liste.find((x) => String(x?.id) === id);
  if (!w) return { success: false, error: 'Webhook introuvable dans cet espace de travail' };
  if (!sansRequete(w.endpoint).endsWith(CHEMIN)) return { success: false, error: "Ce webhook n'appartient pas au site" };
  const res = await api(token, `/webhook/${id}`, 'DELETE');
  secrets.delete(id);
  return { success: res.ok, action: res.ok ? 'supprime' : 'erreur_suppression', webhook: resumeWebhook(w) };
}

// Contrôle quotidien : abonnement présent et actif, réactivé sinon (reparer = true)
export async function verifierWebhooks(token: string, reparer: boolean) {
  const { url, erreur } = adresseWebhook();
  const liste = await listerWebhooks(token);
  if (!liste) return { success: false, error: 'Lecture des webhooks ClickUp impossible' };
  const nos = liste.filter((w) => estNotreAdresse(w, url));
  const autres = liste.filter((w) => !estNotreAdresse(w, url) && sansRequete(w?.endpoint).endsWith(CHEMIN)).map(resumeWebhook);
  const problemes: string[] = [];
  const resultats: any[] = [];
  if (!nos.length) problemes.push(`aucun abonnement ClickUp vers ${sansRequete(url) || 'le site'}${erreur ? ` (${erreur})` : ''}`);
  for (const w of nos) {
    const etat = String(w?.health?.status || '');
    if (etat === 'active') { resultats.push({ ...resumeWebhook(w), action: 'ok' }); continue; }
    if (!reparer) { resultats.push({ ...resumeWebhook(w), action: 'reactiverait' }); continue; }
    const res = await api(token, `/webhook/${w.id}`, 'PUT', { endpoint: w.endpoint, events: w.events, status: 'active' });
    resultats.push({ ...resumeWebhook(w), action: res.ok ? 'reactive' : 'erreur_reactivation' });
    problemes.push(res.ok ? `abonnement ClickUp ${etat}, réactivé` : `abonnement ClickUp ${etat}, réactivation impossible`);
  }
  const tache = process.env.CLICKUP_TACHE_ALERTES_ID;
  if (problemes.length && reparer && tache) {
    await alerter(token, tache, `⚠️ Site : ${problemes.join(' ; ')}. Tant que ce n'est pas réglé, le site ne réagit plus aux changements faits dans ClickUp.`);
  }
  if (problemes.length) console.error('Webhook ClickUp :', problemes.join(' ; '));
  return { success: !problemes.length || resultats.some((r) => r.action === 'reactive'), adresse: sansRequete(url), problemes, webhooks: resultats, autres };
}
