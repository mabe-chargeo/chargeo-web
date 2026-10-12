import { NextResponse, after } from 'next/server';
import { executer, listeSuivie, planifier, sansDoublon, traiterEvenement, type Changement } from '@/lib/aiguillage';
import { diagnostiquerAdresses, installerWebhook, secretDuWebhook, signatureValide, supprimerWebhook, verifierWebhooks, listerWebhooks, resumeWebhook } from '@/lib/webhookClickUp';

// Point d'entrée unique des changements ClickUp (bascule du 12/10/2026, décision Matthieu).
// POST (ClickUp) : signature vérifiée, réponse immédiate, puis traitement en arrière-plan (after) par l'aiguillage
// (src/lib/aiguillage.ts). ClickUp n'attend donc jamais, et ne renvoie pas le même changement faute de réponse.
// Doublons : si ClickUp renvoie quand même un changement, chaque route vérifie « déjà fait » avant d'agir.
// GET, outils (production : ?cle=CRON_SECRET obligatoire) :
//   ?action=etat : abonnements ClickUp du site et leur santé.
//   ?action=installer : abonne le site (adresse de production, ou adresse fixe de la branche en preview).
//   ?action=supprimer&id=... : supprime un abonnement du site (celui de la preview, le jour de la bascule).
//   ?action=sante : contrôle et réactivation (aussi fait chaque matin par /api/cron/quotidien).
// GET preview uniquement : ?action=simuler&taskId=... (option &champ=<id> ou &creation=1, sinon le statut actuel de
//   la tâche) : montre les règles choisies et les lance en simulation ; &executer=1 pour un vrai passage (fiches Test).
//   ?action=diagnostic : teste les adresses acceptées par ClickUp (abonnements d'essai supprimés aussitôt).

export const maxDuration = 60;

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  const brut = await request.text();
  let data: any;
  try { data = JSON.parse(brut); } catch { return NextResponse.json({ error: 'Corps illisible' }, { status: 400 }); }

  const secret = await secretDuWebhook(token, String(data?.webhook_id || ''));
  if (!secret || !signatureValide(brut, request.headers.get('x-signature'), secret)) {
    console.error('Webhook ClickUp refusé : signature invalide', data?.webhook_id, data?.event);
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
  }

  after(async () => {
    try {
      const r = await traiterEvenement(data);
      if (!String((r as any)?.action || '').startsWith('ignore')) console.log('Aiguillage ClickUp', JSON.stringify(r));
    } catch (erreur) {
      console.error('Aiguillage ClickUp en erreur', data?.event, data?.task_id, erreur);
    }
  });
  return NextResponse.json({ ok: true });
}

function autorise(request: Request, p: URLSearchParams): boolean {
  if (process.env.VERCEL_ENV !== 'production') return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return p.get('cle') === secret || request.headers.get('authorization') === `Bearer ${secret}`;
}

async function simuler(p: URLSearchParams) {
  const token = process.env.CLICKUP_API_KEY as string;
  const taskId = p.get('taskId') || '';
  if (!/^[a-z0-9]+$/i.test(taskId)) return { status: 400, body: { error: 'Ajoute &taskId=...' } };
  const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, { headers: { Authorization: token }, cache: 'no-store' });
  if (!res.ok) return { status: 404, body: { error: 'Tâche introuvable' } };
  const t = await res.json();
  const listeId = String(t?.list?.id || '');
  const champ = p.get('champ');
  const changement: Changement = champ ? { type: 'champ', champId: champ }
    : p.get('creation') === '1' ? { type: 'creation' }
    : { type: 'statut', statut: String(t?.status?.status || ''), typeStatut: String(t?.status?.type || '') };
  const reel = p.get('executer') === '1';
  const etapes = sansDoublon(planifier(listeId, changement));
  const base = { tache: t.name, liste: t?.list?.name, listeSuivie: listeSuivie(listeId), changement, regles: etapes.map((e) => e.cle), simulation: !reel };
  if (!etapes.length) return { status: 200, body: { ...base, action: 'aucune_regle' } };
  return { status: 200, body: { ...base, resultats: await executer(taskId, etapes, !reel, true) } };
}

export async function GET(request: Request) {
  try {
    const token = process.env.CLICKUP_API_KEY;
    if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
    const p = new URL(request.url).searchParams;
    const action = p.get('action') || '';
    if (!autorise(request, p)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    if (action === 'etat') {
      const liste = await listerWebhooks(token);
      if (!liste) return NextResponse.json({ error: 'Lecture des webhooks ClickUp impossible' }, { status: 502 });
      return NextResponse.json({ webhooks: liste.map(resumeWebhook) });
    }
    if (action === 'installer') {
      const r = await installerWebhook(token);
      return NextResponse.json(r, { status: r.success ? 200 : 400 });
    }
    if (action === 'supprimer') {
      const r = await supprimerWebhook(token, p.get('id') || '');
      return NextResponse.json(r, { status: r.success ? 200 : 400 });
    }
    if (action === 'sante') {
      return NextResponse.json(await verifierWebhooks(token, p.get('reparer') !== '0'));
    }
    if (action === 'diagnostic') {
      if (process.env.VERCEL_ENV === 'production') return NextResponse.json({ error: 'Non disponible' }, { status: 404 });
      return NextResponse.json(await diagnostiquerAdresses(token));
    }
    if (action === 'simuler') {
      if (process.env.VERCEL_ENV === 'production') return NextResponse.json({ error: 'Non disponible' }, { status: 404 });
      const r = await simuler(p);
      return NextResponse.json(r.body, { status: r.status });
    }
    return NextResponse.json({ error: 'Ajoute ?action=etat | installer | supprimer&id=... | sante | simuler&taskId=...' }, { status: 400 });
  } catch (erreur) {
    console.error('Webhook ClickUp (GET) en erreur', erreur);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
