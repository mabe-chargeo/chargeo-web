import { NextResponse } from 'next/server';
import { aujourdhuiParis, libelleJour } from '@/lib/joursOuvres';
import { alerter } from '@/lib/alerteSite';

// Feu vert chantier (Phase 4, champs validés par Matthieu le 11/10/2026), liste Planning Chantiers.
// Appelé par les automatisations ClickUp : POST ?taskId=...&evenement=feu_vert | en_cours | prerequis
// - feu_vert : la case 🟢 Feu vert vient d'être cochée. Si un prérequis est ❌ Manquant (ou vide), ou si 👤 Validé par
//   est vide (décision Matthieu du 12/10 : on trace qui autorise), la case est décochée et un commentaire dit ce qui
//   manque. Sinon, commentaire « 🟢 Feu vert donné le ... par ... ».
// - en_cours : le chantier passe en 🚧 en cours. Sans feu vert, alerte notifiée (ClickUp ne peut pas bloquer).
// - prerequis : un prérequis a changé. Si le feu vert était donné et qu'un prérequis repasse à Manquant,
//   la case est décochée avec un commentaire.
// ✅ Confirmé et ➖ Non applicable comptent comme OK. Sous-tâche : ignorée.
// 👤 Validé par : même champ que Commandes Matériel et Achats (85d92954), ajouté à Planning Chantiers le 12/10.
// 📝 Devis signé (348cc59d) : anciennement « Périmètre signé », renommé par Matthieu le 12/10 (lu par identifiant).
// Alertes notifiées (12/10) : écrites dans 📣 Alerte site, relayées par ClickBot à @charge-doperation (src/lib/alerteSite.ts).
// Preview : GET ?taskId=...&evenement=...&simulation=1 (rien n'est écrit) ou &executer=1 (fiches « Test » uniquement).

const PLANNING_CHANTIERS_ID = '901520038258';
const CHAMP_FEU_VERT = 'c27f8084-e2f2-4eaf-83bd-d75e082e0d0a';
const CHAMP_VALIDE_PAR = '85d92954-e954-451c-bb14-405ba83de4f4';
const PREREQUIS: { id: string; libelle: string }[] = [
  { id: '348cc59d-5adc-4ed4-b07d-5da40a9e6abc', libelle: '📝 Devis signé' },
  { id: 'ba4a2025-43ec-44a0-8938-1cbc497f7bbf', libelle: '💶 Acompte' },
  { id: '8074d071-24d4-4711-8726-4c20098321fd', libelle: '📜 Autorisations et aides' },
  { id: '7ac103cd-7b52-40ca-a2d4-939e59427f56', libelle: '📦 Matériel reçu conforme' },
  { id: '24f63f50-0839-416b-8f07-9c60ee56e308', libelle: '👷 Équipe, date et accès' },
];
const EVENEMENTS = ['feu_vert', 'en_cours', 'prerequis'] as const;
type Evenement = (typeof EVENEMENTS)[number];

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function champ(tache: any, id: string): any {
  return (Array.isArray(tache?.custom_fields) ? tache.custom_fields : []).find((c: any) => c.id === id);
}

function lireOption(tache: any, id: string): string | undefined {
  const f = champ(tache, id);
  if (!f || f.value === undefined || f.value === null || f.value === '') return undefined;
  const o = (f.type_config?.options || []).find((x: any) => x.orderindex === Number(f.value) || x.id === f.value);
  return o ? o.name : undefined;
}

function feuVertCoche(tache: any): boolean {
  const v = champ(tache, CHAMP_FEU_VERT)?.value;
  return v === true || v === 'true';
}

// Personnes de 👤 Validé par (noms), liste vide si le champ est vide ou absent de la liste
function validePar(tache: any): string[] {
  const v = champ(tache, CHAMP_VALIDE_PAR)?.value;
  return (Array.isArray(v) ? v : []).map((u: any) => String(u?.username || u?.email || '')).filter(Boolean);
}

// Prérequis manquants : ❌ Manquant, vide, ou valeur inconnue
function manquants(tache: any): string[] {
  return PREREQUIS.filter((p) => {
    const v = normal(lireOption(tache, p.id) || '');
    return !(v.includes('confirme') || v.includes('non applicable'));
  }).map((p) => p.libelle);
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

// notifier = true : alerte relayée par ClickBot (src/lib/alerteSite.ts), sinon simple commentaire
async function commenter(taskId: string, token: string, texte: string, notifier = false): Promise<boolean> {
  if (notifier) return alerter(token, taskId, texte);
  const res = await api(token, `/task/${taskId}/comment`, 'POST', { comment_text: texte, notify_all: false });
  if (!res.ok) console.error(`Commentaire refusé (${res.status}) sur ${taskId}`);
  return res.ok;
}

// Décoche la case, vérifié par relecture
async function decocher(taskId: string, token: string): Promise<boolean> {
  const res = await api(token, `/task/${taskId}/field/${CHAMP_FEU_VERT}`, 'POST', { value: false });
  if (!res.ok) return false;
  const relue = await lireTache(taskId, token);
  return !!relue && !feuVertCoche(relue);
}

const liste = (l: string[]) => l.join(', ');

async function traiter(taskId: string, evenement: Evenement, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { status: 500, body: { success: false, error: 'Configuration serveur incomplète' } };

  const tache = await lireTache(taskId, token);
  if (!tache) return { status: 404, body: { success: false, error: 'Fiche introuvable' } };
  if (tache.parent) return { status: 200, body: { success: true, action: 'ignore_sous_tache', simulation } };
  if (String(tache?.list?.id ?? '') !== PLANNING_CHANTIERS_ID) {
    return { status: 200, body: { success: true, action: 'ignore_hors_planning_chantiers', simulation } };
  }
  // Preview : vraie écriture seulement sur une fiche dont le nom commence par « Test »
  if (process.env.VERCEL_ENV !== 'production' && !simulation && !normal(tache.name).startsWith('test')) {
    return { status: 403, body: { success: false, error: 'En preview : exécution sur une fiche « Test » uniquement, simulation partout' } };
  }

  const id = String(tache.id);
  const coche = feuVertCoche(tache);
  const manque = manquants(tache);
  const valideurs = validePar(tache);
  const jour = libelleJour(aujourdhuiParis());

  let plan: { action: string; commentaire?: string; decocher?: boolean; notifier?: boolean };

  if (evenement === 'feu_vert') {
    if (!coche) plan = { action: 'ignore_case_decochee' };
    else if (manque.length || !valideurs.length) {
      const raisons = [
        manque.length ? `il manque ${liste(manque)}` : '',
        !valideurs.length ? '👤 Validé par est vide (qui donne le feu vert ?)' : '',
      ].filter(Boolean).join(' ; ');
      const quoi = [
        manque.length ? 'passe chaque prérequis à ✅ Confirmé ou ➖ Non applicable' : '',
        !valideurs.length ? 'mets ton nom dans 👤 Validé par' : '',
      ].filter(Boolean).join(', ');
      plan = {
        action: 'feu_vert_refuse', decocher: true, notifier: true,
        commentaire: `🔴 Feu vert refusé : ${raisons}. La case a été décochée. ${quoi.charAt(0).toUpperCase()}${quoi.slice(1)}, puis recoche 🟢 Feu vert.`,
      };
    } else {
      plan = { action: 'feu_vert_donne', commentaire: `🟢 Feu vert donné le ${jour} par ${liste(valideurs)} : les 5 prérequis sont OK, le chantier peut démarrer.` };
    }
  } else if (evenement === 'en_cours') {
    if (coche && !manque.length) plan = { action: 'ignore_feu_vert_ok' };
    else {
      plan = {
        action: 'alerte_sans_feu_vert', notifier: true,
        commentaire: `⚠️ Chantier passé en cours sans feu vert${manque.length ? ` (manque : ${liste(manque)})` : ''}. Vérifie avec le chargé d'opération avant d'intervenir.`,
      };
    }
  } else {
    if (!coche || !manque.length) plan = { action: 'ignore_rien_a_faire' };
    else {
      plan = {
        action: 'feu_vert_retire', decocher: true, notifier: true,
        commentaire: `🔴 Feu vert retiré : ${liste(manque)} est repassé à Manquant. La case a été décochée.`,
      };
    }
  }

  const resume = { action: plan.action, evenement, feuVert: coche, manquants: manque, validePar: valideurs, commentaire: plan.commentaire ?? null };
  if (simulation || !plan.commentaire) return { status: 200, body: { success: true, ...resume, simulation } };

  if (plan.decocher && !(await decocher(id, token))) {
    await commenter(id, token, `⚠️ Feu vert : ${manque.length ? `il manque ${liste(manque)}` : '👤 Validé par est vide'}, mais la case n'a pas pu être décochée. Décoche-la à la main.`, true);
    return { status: 502, body: { success: false, error: 'Décochage impossible', ...resume } };
  }
  await commenter(id, token, plan.commentaire, !!plan.notifier);
  return { status: 200, body: { success: true, ...resume, decochee: plan.decocher ? true : undefined } };
}

function lireEvenement(p: URLSearchParams): Evenement | null {
  const e = p.get('evenement') as Evenement;
  return EVENEMENTS.includes(e) ? e : null;
}

export async function POST(request: Request) {
  try {
    const p = new URL(request.url).searchParams;
    const taskId = p.get('taskId');
    const evenement = lireEvenement(p);
    if (!taskId || !evenement) {
      return NextResponse.json({ success: false, error: 'Il faut ?taskId=...&evenement=feu_vert|en_cours|prerequis' }, { status: 400 });
    }
    const r = await traiter(taskId, evenement, false);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur feu vert :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Preview uniquement : ?taskId=...&evenement=...&simulation=1 ou &executer=1
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ error: 'Non disponible' }, { status: 404 });
  }
  try {
    const p = new URL(request.url).searchParams;
    const taskId = p.get('taskId');
    const evenement = lireEvenement(p);
    const executer = p.get('executer') === '1';
    const simulation = p.get('simulation') === '1';
    if (!taskId || !evenement || (!executer && !simulation)) {
      return NextResponse.json({ error: 'Ajoute ?taskId=...&evenement=feu_vert|en_cours|prerequis&simulation=1 ou &executer=1' }, { status: 400 });
    }
    const r = await traiter(taskId, evenement, !executer);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur feu vert (preview) :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
