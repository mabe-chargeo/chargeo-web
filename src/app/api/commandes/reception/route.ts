import { NextResponse } from 'next/server';
import { aujourdhuiParis, libelleJour } from '@/lib/joursOuvres';

// Réception matériel (Phase 4, bloc 1 validé par Matthieu le 11/10/2026).
// Appelé par les automatisations de Commandes Matériel (statut modifié, tâche créée) : POST ?taskId=<commande>
// - Retrouve le ou les chantiers liés (champ 🏗️ Chantier ou lien de tâche) et remplit 🏗️ Chantier s'il est vide.
// - Pour chaque chantier : si toutes ses commandes non annulées sont 📦 reçu / vérifié, le prérequis
//   📦 Matériel reçu conforme passe à ✅ Confirmé (commentaire « 📦 MATÉRIEL OK »). Sinon il repasse à ❌ Manquant
//   s'il était confirmé, et le feu vert est retiré s'il était donné. Une livraison partielle reste en 🚚 en livraison.
// - Commande sans chantier : commentaire d'alerte sur la commande.
// Preview : GET ?taskId=...&simulation=1 (rien n'est écrit) ou &executer=1 (commande et chantier « Test » uniquement).

const COMMANDES_ID = '901520038249';
const PLANNING_CHANTIERS_ID = '901520038258';
const CHAMP_RELATION = '9b561ce2-719c-4cc0-9bb6-392959f9206e'; // 🏗️ Chantier côté commande, 📦 Commande Liée côté chantier
const CHAMP_MATERIEL = '7ac103cd-7b52-40ca-a2d4-939e59427f56';
const CHAMP_FEU_VERT = 'c27f8084-e2f2-4eaf-83bd-d75e082e0d0a';

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

function champ(tache: any, id: string): any {
  return (Array.isArray(tache?.custom_fields) ? tache.custom_fields : []).find((c: any) => c.id === id);
}

const liste = (t: any) => String(t?.list?.id ?? '');

// Ids reliés par le champ relation et par les liens de tâche
function idsLies(tache: any): { relation: string[]; liens: string[] } {
  const v = champ(tache, CHAMP_RELATION)?.value;
  const relation = (Array.isArray(v) ? v : []).map((x: any) => String(x?.id ?? x)).filter(Boolean);
  const moi = String(tache?.id);
  const liens = (Array.isArray(tache?.linked_tasks) ? tache.linked_tasks : [])
    .map((l: any) => (String(l?.task_id) === moi ? String(l?.link_id) : String(l?.task_id)))
    .filter((x: string) => x && x !== 'undefined' && x !== moi);
  return { relation, liens };
}

function etatCommande(c: any): 'annulee' | 'recue' | 'attente' {
  const s = normal(c?.status?.status || '');
  const type = String(c?.status?.type || '');
  if (type === 'closed' || s.includes('annul')) return 'annulee';
  if (type === 'done' || s.includes('recu')) return 'recue';
  return 'attente';
}

function optionMateriel(chantier: any, mot: string): { id: string; name: string } | undefined {
  const f = champ(chantier, CHAMP_MATERIEL);
  return (f?.type_config?.options || []).find((o: any) => normal(o.name).includes(mot));
}

function valeurMateriel(chantier: any): string {
  const f = champ(chantier, CHAMP_MATERIEL);
  if (!f || f.value === undefined || f.value === null || f.value === '') return '';
  const o = (f.type_config?.options || []).find((x: any) => x.orderindex === Number(f.value) || x.id === f.value);
  return normal(o?.name || '');
}

const feuVertCoche = (t: any) => { const v = champ(t, CHAMP_FEU_VERT)?.value; return v === true || v === 'true'; };

async function traiterChantier(chantier: any, token: string, simulation: boolean) {
  const id = String(chantier.id);
  const { relation, liens } = idsLies(chantier);
  const commandes: any[] = [];
  for (const cid of Array.from(new Set([...relation, ...liens])).slice(0, 20)) {
    const c = await lireTache(cid, token);
    if (c && liste(c) === COMMANDES_ID && !c.parent) commandes.push(c);
  }
  const actives = commandes.filter((c) => etatCommande(c) !== 'annulee');
  const enAttente = actives.filter((c) => etatCommande(c) === 'attente');
  const actuel = valeurMateriel(chantier);
  const base = { chantier: chantier.name, commandes: actives.length, enAttente: enAttente.map((c) => c.name), actuel: actuel || 'vide' };

  if (!actives.length) return { ...base, action: 'ignore_aucune_commande_active' };

  const jour = libelleJour(aujourdhuiParis());
  let cible: 'confirme' | 'manquant' | null = null;
  let commentaire = '';
  let retirerFeuVert = false;

  if (!enAttente.length) {
    if (!actuel.includes('confirme')) {
      cible = 'confirme';
      commentaire = `📦 MATÉRIEL OK : reçu et vérifié au dépôt le ${jour} (${actives.length} commande${actives.length > 1 ? 's' : ''}). Prérequis 📦 Matériel reçu conforme passé à ✅ Confirmé.`;
    }
  } else if (actuel.includes('confirme') || actuel.includes('non applicable')) {
    cible = 'manquant';
    retirerFeuVert = feuVertCoche(chantier);
    commentaire = `📦 Matériel : commande en attente (${enAttente.map((c) => c.name).join(', ')}). Prérequis 📦 Matériel reçu conforme repassé à ❌ Manquant.${retirerFeuVert ? ' 🔴 Le feu vert est retiré et la case décochée.' : ''}`;
  }

  if (!cible) return { ...base, action: 'ignore_deja_a_jour' };
  const resume = { ...base, action: cible === 'confirme' ? 'materiel_confirme' : 'materiel_manquant', feuVertRetire: retirerFeuVert, commentaire };
  if (simulation) return resume;

  if (process.env.VERCEL_ENV !== 'production' && !normal(chantier.name).startsWith('test')) {
    return { ...resume, action: 'refuse_preview_chantier_reel' };
  }
  const option = optionMateriel(chantier, cible === 'confirme' ? 'confirme' : 'manquant');
  if (!option) return { ...resume, action: 'erreur_option_introuvable' };
  const ecrit = await api(token, `/task/${id}/field/${CHAMP_MATERIEL}`, 'POST', { value: option.id });
  if (!ecrit.ok) {
    await commenter(id, token, `⚠️ Matériel : je n'ai pas pu mettre à jour 📦 Matériel reçu conforme (${option.name}). Fais-le à la main.`, true);
    return { ...resume, action: 'erreur_ecriture' };
  }
  if (retirerFeuVert) await api(token, `/task/${id}/field/${CHAMP_FEU_VERT}`, 'POST', { value: false });
  await commenter(id, token, commentaire, cible === 'manquant');
  return resume;
}

async function traiter(taskId: string, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { status: 500, body: { success: false, error: 'Configuration serveur incomplète' } };

  const commande = await lireTache(taskId, token);
  if (!commande) return { status: 404, body: { success: false, error: 'Commande introuvable' } };
  if (commande.parent) return { status: 200, body: { success: true, action: 'ignore_sous_tache', simulation } };
  if (liste(commande) !== COMMANDES_ID) return { status: 200, body: { success: true, action: 'ignore_hors_commandes', simulation } };
  if (process.env.VERCEL_ENV !== 'production' && !simulation && !normal(commande.name).startsWith('test')) {
    return { status: 403, body: { success: false, error: 'En preview : exécution sur une commande « Test » uniquement, simulation partout' } };
  }

  const cid = String(commande.id);
  const { relation, liens } = idsLies(commande);
  const chantiers: any[] = [];
  for (const id of Array.from(new Set([...relation, ...liens])).slice(0, 10)) {
    const t = await lireTache(id, token);
    if (t && liste(t) === PLANNING_CHANTIERS_ID && !t.parent) chantiers.push(t);
  }

  if (!chantiers.length) {
    const texte = '⚠️ Commande sans chantier lié : remplis 🏗️ Chantier pour que le matériel soit suivi sur le bon chantier.';
    if (!simulation) await commenter(cid, token, texte, true);
    return { status: 200, body: { success: true, action: 'alerte_sans_chantier', commentaire: texte, simulation } };
  }

  // Remplit 🏗️ Chantier quand le chantier n'est relié que par un lien de tâche
  const aRelier = chantiers.map((c) => String(c.id)).filter((id) => !relation.includes(id));
  let relationRemplie = false;
  if (aRelier.length && !simulation) {
    const r = await api(token, `/task/${cid}/field/${CHAMP_RELATION}`, 'POST', { value: { add: aRelier, rem: [] } });
    relationRemplie = r.ok;
    if (r.ok) {
      for (let i = 0; i < chantiers.length; i++) {
        const relu = await lireTache(String(chantiers[i].id), token);
        if (relu) chantiers[i] = relu;
      }
    }
  }

  const resultats = [];
  for (const ch of chantiers) resultats.push(await traiterChantier(ch, token, simulation));
  return {
    status: 200,
    body: { success: true, commande: commande.name, etat: etatCommande(commande), relationARemplir: aRelier.length > 0, relationRemplie: simulation ? undefined : relationRemplie, chantiers: resultats, simulation },
  };
}

export async function POST(request: Request) {
  try {
    const taskId = new URL(request.url).searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ success: false, error: 'Aucun taskId reçu' }, { status: 400 });
    const r = await traiter(taskId, false);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur réception matériel :', error);
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
    console.error('Erreur réception matériel (preview) :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
