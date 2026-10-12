import { NextResponse } from 'next/server';
import { aujourdhuiParis, echeanceClickUp, libelleJour, type Jour } from '@/lib/joursOuvres';
import { alerter } from '@/lib/alerteSite';

// Alertes d'échéance des dossiers ADVENIR (Phase 4, plan validé par Matthieu le 12/10/2026).
// Contrôle quotidien de la liste Dossiers Advenir (cron Vercel en production, lien de test en preview).
// - Dossiers surveillés : ✅ prime réservée, 🏗️ chantier en cours, 📂 collecte pièces (travaux ou justificatifs pas finis).
//   Dès 📤 dossier final soumis, la surveillance s'arrête.
// - Paliers J-14, J-7, J-1 puis « date dépassée », chacun une seule fois par date : priorité urgente, échéance de la
//   tâche calée sur 📅 Date Limite Réalisation, commentaire notifié qui dit ce qui manque. Une prolongation (nouvelle
//   date) relance les paliers. Un premier passage tardif ne donne que le palier en cours (pas de rattrapage en rafale).
// - Date Limite vide sur un dossier surveillé : une alerte « date à remplir ».
// - 🧐 en révision : priorité urgente (règle d'or n°2), une fois.
// Alertes (12/10) : écrites dans 📣 Alerte site, relayées par ClickBot à @charge-doperation (src/lib/alerteSite.ts).
//   Le relais commence par la mention : l'anti-doublon cherche la marque dans le texte (includes), pas en début.
// Production : GET appelé par le cron Vercel avec l'en-tête Authorization: Bearer CRON_SECRET.
// Preview : GET ?simulation=1 (rien n'est écrit) ou &executer=1 (dossiers dont le nom commence par « Test »), option &taskId=.

const ADVENIR_ID = process.env.CLICKUP_ADVENIR_LIST_ID || '901520038271';
const CHAMP_DATE_LIMITE = 'b7be95a5-2869-46a8-ad73-c08a3d318ff8';
const PALIERS: { cle: string; jours: number }[] = [
  { cle: 'J-1', jours: 1 },
  { cle: 'J-7', jours: 7 },
  { cle: 'J-14', jours: 14 },
];

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const ecartJours = (de: Jour, a: Jour) => Math.round((Date.UTC(a.a, a.m - 1, a.j) - Date.UTC(de.a, de.m - 1, de.j)) / 86400000);

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

async function listerDossiers(token: string): Promise<any[] | null> {
  const tous: any[] = [];
  for (let page = 0; page < 20; page++) {
    const res = await api(token, `/list/${ADVENIR_ID}/task?archived=false&page=${page}`);
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const taches: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    tous.push(...taches);
    if (json?.last_page !== false || taches.length === 0) break;
  }
  return tous.filter((t) => !t.parent);
}

async function commentaires(token: string, id: string): Promise<string[] | null> {
  const res = await api(token, `/task/${id}/comment`);
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  return (Array.isArray(json?.comments) ? json.comments : []).map((c: any) => String(c?.comment_text || ''));
}

type Etape = 'surveille_travaux' | 'surveille_pieces' | 'revision' | 'hors';
function etape(statut: string): Etape {
  const s = normal(statut);
  if (s.includes('revision')) return 'revision';
  if (s.includes('collecte')) return 'surveille_pieces';
  if (s.includes('prime reserv') || s.includes('chantier en cours')) return 'surveille_travaux';
  return 'hors';
}

const estUrgente = (t: any) => String(t?.priority?.priority || '').toLowerCase() === 'urgent' || String(t?.priority?.id || '') === '1';

type Plan = { id: string; nom: string; statut: string; action: string; commentaire?: string; urgente?: boolean; echeance?: number };

async function planifier(token: string, t: any, aujourdhui: Jour): Promise<Plan | null> {
  const id = String(t.id);
  const nom = String(t.name || '');
  const statut = String(t?.status?.status || '');
  const e = etape(statut);
  const base = { id, nom, statut };
  if (e === 'hors') return null;

  if (e === 'revision') {
    if (estUrgente(t)) return null;
    return { ...base, action: 'revision_urgente', urgente: true,
      commentaire: '🧐 ADVENIR en révision : l\'instructeur demande un complément. Priorité passée en urgente, à traiter avant tout le reste (réponds sur la plateforme ADVENIR, puis note ici ce qui a été envoyé).' };
  }

  const champ = (t.custom_fields || []).find((c: any) => c?.id === CHAMP_DATE_LIMITE);
  const brut = champ?.value;
  const deja = await commentaires(token, id);
  if (deja === null) return { ...base, action: 'erreur_lecture_commentaires' };

  if (!brut) {
    const marque = '⚠️ ADVENIR : 📅 Date Limite Réalisation vide';
    if (deja.some((c) => c.includes(marque))) return null;
    return { ...base, action: 'date_manquante',
      commentaire: `${marque}. Sans elle, aucune alerte d'expiration. Reprends la date exacte indiquée dans le dossier ADVENIR (6 mois, ou 9 mois en infrastructure collective, à compter de la signature de l'offre, prolongations comprises).` };
  }

  const limite = aujourdhuiParis(new Date(Number(brut)));
  const restant = ecartJours(aujourdhui, limite);
  const palier = restant < 0 ? 'dépassée' : PALIERS.find((p) => restant <= p.jours)?.cle;
  if (!palier) return null;

  const quand = `échéance ${libelleJour(limite)}`;
  const marque = `⏰ ADVENIR ${palier} (${quand})`;
  if (deja.some((c) => c.includes(marque))) return null;

  const manque = e === 'surveille_pieces'
    ? 'transmettre tous les justificatifs et soumettre le dossier final'
    : 'terminer les travaux, puis transmettre tous les justificatifs';
  const texte = palier === 'dépassée'
    ? `${marque} : la date limite est dépassée et le dossier n'est pas soumis. Demande une prolongation sur la plateforme ADVENIR si ce n'est pas déjà fait (et mets la nouvelle date ici), sinon passe en ❌ annulé / expiré en notant la cause.`
    : `${marque} : il reste ${restant} jour${restant > 1 ? 's' : ''} pour ${manque}. Si ce n'est pas tenable, demande une prolongation avant la date et mets la nouvelle date dans 📅 Date Limite Réalisation.`;
  return { ...base, action: `alerte_${palier}`, urgente: true, echeance: echeanceClickUp(limite), commentaire: texte };
}

async function appliquer(token: string, p: Plan): Promise<boolean> {
  const maj: any = {};
  if (p.urgente) maj.priority = 1;
  if (p.echeance) { maj.due_date = p.echeance; maj.due_date_time = false; }
  if (Object.keys(maj).length) {
    const res = await api(token, `/task/${p.id}`, 'PUT', maj);
    if (!res.ok) console.error(`Mise à jour ADVENIR refusée (${res.status}) sur ${p.id}`);
  }
  if (!p.commentaire) return true;
  return alerter(token, p.id, p.commentaire);
}

async function controler(simulation: boolean, testSeulement: boolean, taskId?: string | null) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { status: 500, body: { success: false, error: 'Configuration serveur incomplète' } };
  const dossiers = await listerDossiers(token);
  if (!dossiers) return { status: 502, body: { success: false, error: 'Lecture de la liste Dossiers Advenir impossible' } };

  const aujourdhui = aujourdhuiParis();
  const cibles = dossiers.filter((t) => (!taskId || String(t.id) === taskId) && (!testSeulement || normal(t.name).startsWith('test')));
  const plans: Plan[] = [];
  for (const t of cibles) {
    const p = await planifier(token, t, aujourdhui);
    if (p) plans.push(p);
  }
  if (simulation) return { status: 200, body: { success: true, simulation, jour: libelleJour(aujourdhui), dossiers: cibles.length, actions: plans } };

  const resultats = [];
  for (const p of plans) {
    if (p.action.startsWith('erreur')) { resultats.push({ ...p, ok: false }); continue; }
    resultats.push({ id: p.id, nom: p.nom, action: p.action, ok: await appliquer(token, p) });
  }
  return { status: 200, body: { success: resultats.every((r) => r.ok), jour: libelleJour(aujourdhui), dossiers: cibles.length, actions: resultats } };
}

export async function GET(request: Request) {
  try {
    if (process.env.VERCEL_ENV === 'production') {
      const secret = process.env.CRON_SECRET;
      if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
      }
      const r = await controler(false, false);
      return NextResponse.json(r.body, { status: r.status });
    }
    // Preview : ?simulation=1 ou &executer=1 (dossiers « Test »), option &taskId=
    const p = new URL(request.url).searchParams;
    const executer = p.get('executer') === '1';
    const simulation = p.get('simulation') === '1';
    if (!executer && !simulation) return NextResponse.json({ error: 'Ajoute ?simulation=1 ou ?executer=1 (option &taskId=...)' }, { status: 400 });
    const r = await controler(!executer, executer, p.get('taskId'));
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur alertes ADVENIR :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
