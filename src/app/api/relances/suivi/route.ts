import { NextResponse } from 'next/server';
import { getQualificationListId, QUALIFICATION_PROD_ID } from '@/lib/listesClickUp';
import {
  aujourdhuiParis, ajouterJoursOuvres, ajouterJours, prochainOuvre, comparer, echeanceClickUp, libelleJour, type Jour,
} from '@/lib/joursOuvres';

// Suivi des relances commerciales internes (Phase 4, champs validés par Matthieu le 11/10/2026).
// Appelé par l'automatisation ClickUp « champ 🔁 Suivi relance ou 📅 Date AG ou RDV modifié » : POST ?taskId=...
// Ce sont des rappels au commercial dans l'échéance de la fiche : aucun email n'est envoyé au client.
// - « Relancé, pas de réponse » : tentative n° n notée, prochaine relance à J+3 ouvrés. Au bout de 3 tentatives
//   sans réponse : suspension, on demande au commercial de poursuivre, reprogrammer ou mettre en pause
//   (jamais de classement automatique en perdu). Le menu est remis à vide pour pouvoir noter la suivante.
// - « En attente d'AG » : date connue = relance le premier jour ouvré après l'AG ; date inconnue = rappel dans
//   30 jours pour demander la date (menu remis à vide, à reprendre au rappel suivant).
// - « Date convenue avec le client » : relance à cette date (jour ouvré suivant si elle tombe un jour chômé).
// Une nouvelle date remplace l'ancienne échéance, sans doublon. Les tentatives sont comptées dans les
// commentaires « 🔁 Relance n° » depuis le dernier envoi (📩) ou la dernière pause (📅).
// Arrêt : fiche gagnée, perdue ou archivée. Sous-tâche : ignorée.
// Preview : GET ?taskId=...&simulation=1 (rien n'est écrit) ou &executer=1 (fiches TEST uniquement).

const CHAMP_SUIVI = '840aecae-652d-40e4-b39e-525d5d56cec1';
const CHAMP_DATE = '482cfe42-351f-4030-8789-d2010e1605ca';
const DELAI_OUVRES = 3;
const MAX_TENTATIVES = 3;
const DELAI_AG_INCONNUE = 30;

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function lireChamp(tache: any, id: string): any {
  const f = (Array.isArray(tache?.custom_fields) ? tache.custom_fields : []).find((c: any) => c.id === id);
  if (!f || f.value === undefined || f.value === null || f.value === '') return undefined;
  if (f.type === 'drop_down' && f.type_config?.options) {
    const o = f.type_config.options.find((x: any) => x.orderindex === Number(f.value) || x.id === f.value);
    return o ? o.name : undefined;
  }
  return f.value;
}

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

async function lireTache(taskId: string, token: string): Promise<any | null> {
  const res = await api(token, `/task/${encodeURIComponent(taskId)}?custom_task_ids=true`);
  return res.ok ? res.json() : null;
}

async function commenter(taskId: string, token: string, texte: string, notifier = false): Promise<boolean> {
  const res = await api(token, `/task/${taskId}/comment`, 'POST', { comment_text: texte, notify_all: notifier });
  if (!res.ok) console.error(`Commentaire refusé (${res.status}) sur ${taskId}`);
  return res.ok;
}

// Tentatives depuis le dernier envoi ou la dernière pause (les commentaires arrivent du plus récent au plus ancien)
async function compterTentatives(taskId: string, token: string): Promise<number | null> {
  const res = await api(token, `/task/${taskId}/comment`);
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  const liste: any[] = Array.isArray(json?.comments) ? json.comments : [];
  let n = 0;
  for (const c of liste) {
    const t = String(c?.comment_text || '').trim();
    if (t.startsWith('📩') || t.startsWith('📅')) break;
    if (t.startsWith('🔁 Relance n°')) n++;
  }
  return n;
}

// Écriture de l'échéance, vérifiée par relecture (même jour à Paris)
async function ecrireEcheance(taskId: string, token: string, jour: Jour): Promise<boolean> {
  const ms = echeanceClickUp(jour);
  const res = await api(token, `/task/${taskId}`, 'PUT', { due_date: ms, due_date_time: false });
  if (!res.ok) return false;
  const relue = await lireTache(taskId, token);
  if (!relue?.due_date) return false;
  return comparer(aujourdhuiParis(new Date(Number(relue.due_date))), jour) === 0;
}

async function viderSuivi(taskId: string, token: string): Promise<boolean> {
  const res = await api(token, `/task/${taskId}/field/${CHAMP_SUIVI}`, 'DELETE');
  return res.ok;
}

async function traiter(taskId: string, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { status: 500, body: { success: false, error: 'Configuration serveur incomplète' } };

  const tache = await lireTache(taskId, token);
  if (!tache) return { status: 404, body: { success: false, error: 'Fiche introuvable' } };
  if (tache.parent) return { status: 200, body: { success: true, action: 'ignore_sous_tache', simulation } };

  if (process.env.VERCEL_ENV !== 'production') {
    const listeTest = getQualificationListId();
    const liste = String(tache?.list?.id ?? '');
    const estTest = !!listeTest && liste === String(listeTest);
    if (!estTest && !(simulation && liste === QUALIFICATION_PROD_ID)) {
      return { status: 403, body: { success: false, error: 'En preview : fiches TEST, ou simulation seule sur une vraie fiche Qualification' } };
    }
  }
  const id = String(tache.id);

  // Affaire terminée (gagnée, perdue, archivée) : plus de relance
  const typeStatut = String(tache?.status?.type || '');
  if (typeStatut === 'done' || typeStatut === 'closed') {
    return { status: 200, body: { success: true, action: 'ignore_affaire_terminee', statut: tache?.status?.status, simulation } };
  }

  const suivi = normal(lireChamp(tache, CHAMP_SUIVI) || '');
  const brutDate = lireChamp(tache, CHAMP_DATE);
  const date: Jour | null = brutDate ? aujourdhuiParis(new Date(Number(brutDate))) : null;
  const aujourdhui = aujourdhuiParis();
  if (!suivi) return { status: 200, body: { success: true, action: 'ignore_vide', simulation } };

  // Une date déjà passée ne doit jamais donner une échéance dans le passé
  const auPlusTot = (j: Jour) => (comparer(j, aujourdhui) < 0 ? prochainOuvre(ajouterJours(aujourdhui, 1)) : j);

  let plan: { action: string; echeance?: Jour; commentaire: string; vider: boolean; notifier?: boolean; tentative?: number };

  if (suivi.includes('relanc')) {
    const deja = await compterTentatives(id, token);
    if (deja === null) return { status: 502, body: { success: false, error: 'Lecture des commentaires impossible' } };
    const n = deja + 1;
    if (n >= MAX_TENTATIVES) {
      plan = {
        action: 'suspend', tentative: n, vider: true, notifier: true,
        commentaire: `🔁 Relance n°${n} notée, toujours sans réponse. ⏸️ ${MAX_TENTATIVES} relances sans réponse : les relances automatiques sont suspendues. À toi de choisir : poursuivre, reprogrammer (« Date convenue ») ou mettre en pause. La fiche n'est pas classée en perdu.`,
      };
    } else {
      const prochaine = ajouterJoursOuvres(aujourdhui, DELAI_OUVRES);
      plan = {
        action: 'relance_notee', tentative: n, echeance: prochaine, vider: true,
        commentaire: `🔁 Relance n°${n} notée le ${libelleJour(aujourdhui)}, sans réponse. Prochaine relance le ${libelleJour(prochaine)} (J+${DELAI_OUVRES} ouvrés).`,
      };
    }
  } else if (suivi.includes('ag')) {
    if (date) {
      const r = auPlusTot(ajouterJoursOuvres(date, 1));
      plan = {
        action: 'pause_ag', echeance: r, vider: false,
        commentaire: `📅 En attente de l'AG du ${libelleJour(date)} : relances en pause. Relance le ${libelleJour(r)}, premier jour ouvré après l'AG.`,
      };
    } else {
      const r = prochainOuvre(ajouterJours(aujourdhui, DELAI_AG_INCONNUE));
      plan = {
        action: 'pause_ag_sans_date', echeance: r, vider: true,
        commentaire: `📅 En attente d'une AG sans date connue : relances en pause. Rappel le ${libelleJour(r)} pour demander la date. Dès qu'elle est connue, remplis « 📅 Date AG ou RDV » et choisis « En attente d'AG ».`,
      };
    }
  } else if (suivi.includes('convenue')) {
    if (!date) {
      plan = {
        action: 'date_manquante', vider: false,
        commentaire: '⚠️ Relance : « Date convenue avec le client » est choisi, mais « 📅 Date AG ou RDV » est vide. Remplis la date, la relance se cale dessus.',
      };
    } else {
      const r = auPlusTot(prochainOuvre(date));
      plan = {
        action: 'date_convenue', echeance: r, vider: false,
        commentaire: `📅 Date convenue avec le client : relance le ${libelleJour(r)}.`,
      };
    }
  } else {
    return { status: 200, body: { success: true, action: 'ignore_valeur_inconnue', suivi, simulation } };
  }

  const resume = { action: plan.action, tentative: plan.tentative, relance: plan.echeance ? libelleJour(plan.echeance) : null, commentaire: plan.commentaire };
  if (simulation) return { status: 200, body: { success: true, ...resume, simulation } };

  if (plan.echeance && !(await ecrireEcheance(id, token, plan.echeance))) {
    await commenter(id, token, `⚠️ Relance : l'échéance du ${libelleJour(plan.echeance)} n'a pas pu être enregistrée. Mets-la à la main sur la fiche.`);
    return { status: 502, body: { success: false, error: 'Écriture de l’échéance impossible', ...resume } };
  }
  await commenter(id, token, plan.commentaire, !!plan.notifier);
  const vide = plan.vider ? await viderSuivi(id, token) : true;
  return { status: 200, body: { success: true, ...resume, menuVide: plan.vider ? vide : undefined } };
}

export async function POST(request: Request) {
  try {
    const taskId = new URL(request.url).searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ success: false, error: 'Aucun taskId reçu' }, { status: 400 });
    const r = await traiter(taskId, false);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur suivi relance :', error);
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
    console.error('Erreur suivi relance (preview) :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
