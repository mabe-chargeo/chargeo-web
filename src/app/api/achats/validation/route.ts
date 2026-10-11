import { NextResponse } from 'next/server';
import { aujourdhuiParis, libelleJour } from '@/lib/joursOuvres';

// Validation des achats (Phase 4, décision Matthieu du 11/10/2026 : Matthieu valide au démarrage, puis le chef de chantier).
// Appelé par l'automatisation « statut modifié » de Commandes Matériel et d'Achats Fournisseurs : POST ?taskId=...
// 1. Passage en « commandé » sans 👤 Validé par : la tâche revient à l'étape d'avant (📝 à commander ou 🖊️ à valider)
//    et un commentaire explique quoi faire.
// 2. Statuts suivants (en livraison, reçu, soldé) sans validation : simple alerte en commentaire, pas de retour en arrière
//    (le matériel est peut-être déjà là, on ne casse pas la réception).
// 3. Achats : une facture reliée à une commande (🔗 Commande liée) hérite de la validation de cette commande.
// ClickUp ne sait pas qui a rempli le champ : l'historique de la tâche en garde la trace.
// Preview : GET ?taskId=...&simulation=1 (rien n'est écrit) ou &executer=1 (tâches « Test » uniquement).

const COMMANDES_ID = '901520038249';
const ACHATS_ID = process.env.CLICKUP_ACHATS_LIST_ID || '1200630000003864';
const CHAMP_VALIDE_PAR = '85d92954-e954-451c-bb14-405ba83de4f4';
const CHAMP_COMMANDE_LIEE = 'f97572b7-28b7-4ff4-81c7-d06c14b75a6d';

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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

const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c.id === id);

function validateurs(t: any): string[] {
  const v = champ(t, CHAMP_VALIDE_PAR)?.value;
  return (Array.isArray(v) ? v : []).map((u: any) => String(u?.username || u?.email || u?.id || '')).filter(Boolean);
}

function commandesLiees(t: any): string[] {
  const v = champ(t, CHAMP_COMMANDE_LIEE)?.value;
  return (Array.isArray(v) ? v : []).map((x: any) => String(x?.id ?? x)).filter(Boolean);
}

// Étape du statut : avant (rien d'engagé), commande (premier statut engagé), apres (livraison, reçu, soldé), fin (annulé)
function etape(statut: any): 'avant' | 'commande' | 'apres' | 'fin' {
  const s = normal(statut?.status || '');
  if (s.includes('annul') || statut?.type === 'closed') return 'fin';
  if (s.includes('a commander') || s.includes('demande') || s.includes('a valider')) return 'avant';
  if (s.includes('commande')) return 'commande';
  return 'apres';
}

async function statutRetour(listeId: string, token: string, achats: boolean): Promise<string | null> {
  const res = await api(token, `/list/${listeId}`);
  if (!res.ok) return null;
  const l = await res.json();
  const mot = achats ? 'a valider' : 'a commander';
  const s = (l?.statuses || []).find((x: any) => normal(x?.status).includes(mot));
  return s ? String(s.status) : null;
}

async function traiter(taskId: string, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { status: 500, body: { success: false, error: 'Configuration serveur incomplète' } };

  const t = await lireTache(taskId, token);
  if (!t) return { status: 404, body: { success: false, error: 'Tâche introuvable' } };
  if (t.parent) return { status: 200, body: { success: true, action: 'ignore_sous_tache', simulation } };
  const listeId = String(t?.list?.id ?? '');
  const achats = listeId === String(ACHATS_ID);
  if (!achats && listeId !== COMMANDES_ID) return { status: 200, body: { success: true, action: 'ignore_hors_liste', simulation } };
  if (process.env.VERCEL_ENV !== 'production' && !simulation && !normal(t.name).startsWith('test')) {
    return { status: 403, body: { success: false, error: 'En preview : exécution sur une tâche « Test » uniquement, simulation partout' } };
  }

  const id = String(t.id);
  const statut = String(t?.status?.status || '');
  const e = etape(t?.status);
  if (e === 'avant' || e === 'fin') return { status: 200, body: { success: true, action: 'ignore_statut', statut, simulation } };

  // Validation directe, ou héritée de la commande liée (Achats)
  let par = validateurs(t);
  let source = 'tache';
  if (!par.length && achats) {
    for (const cid of commandesLiees(t).slice(0, 5)) {
      const c = await lireTache(cid, token);
      const v = c ? validateurs(c) : [];
      if (v.length) { par = v; source = `commande ${c.name}`; break; }
    }
  }
  if (par.length) return { status: 200, body: { success: true, action: 'valide', statut, validePar: par, source, simulation } };

  const jour = libelleJour(aujourdhuiParis());
  if (e === 'apres') {
    const texte = `⚠️ Achat passé en « ${statut} » le ${jour} sans 👤 Validé par. Remplis le champ pour garder la trace de qui a autorisé cet achat.`;
    if (!simulation) await commenter(id, token, texte, true);
    return { status: 200, body: { success: true, action: 'alerte_sans_validation', statut, commentaire: texte, simulation } };
  }

  // e === 'commande' : retour à l'étape d'avant
  const retour = await statutRetour(listeId, token, achats);
  const texte = `⛔ Commande bloquée le ${jour} : 👤 Validé par est vide. La tâche revient en « ${retour || 'étape précédente'} ». Fais valider l'achat (Matthieu pour l'instant), remplis le champ, puis repasse en commandé.`;
  if (simulation) return { status: 200, body: { success: true, action: 'bloquerait', statut, retour, commentaire: texte, simulation } };
  if (!retour) {
    await commenter(id, token, `⚠️ Commande passée en commandé sans 👤 Validé par, et je n'ai pas trouvé le statut de retour. Remets-la à la main.`, true);
    return { status: 502, body: { success: false, error: 'Statut de retour introuvable', statut } };
  }
  const r = await api(token, `/task/${id}`, 'PUT', { status: retour });
  if (!r.ok) {
    await commenter(id, token, `⚠️ Commande passée en commandé sans 👤 Validé par : je n'ai pas pu la remettre en « ${retour} ». Fais-le à la main.`, true);
    return { status: 502, body: { success: false, error: 'Retour de statut impossible', statut, retour } };
  }
  await commenter(id, token, texte, true);
  return { status: 200, body: { success: true, action: 'bloque', statut, retour, commentaire: texte } };
}

export async function POST(request: Request) {
  try {
    const taskId = new URL(request.url).searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ success: false, error: 'Aucun taskId reçu' }, { status: 400 });
    const r = await traiter(taskId, false);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur validation achat :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Preview uniquement : ?taskId=...&simulation=1 ou &executer=1
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
    console.error('Erreur validation achat (preview) :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
