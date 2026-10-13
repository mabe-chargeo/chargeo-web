import { aujourdhuiParis, libelleJour } from '@/lib/joursOuvres';

// Acompte et chantier (décision Matthieu du 12/10/2026 : pas d'achat de matériel ni de démarrage sans acompte encaissé).
// - confirmerAcompte : facture d'acompte passée en ✅ payée (route factures/relances) → 💶 Acompte = ✅ Confirmé sur le
//   chantier relié par 🔗 Affaire, avec un commentaire sur le chantier. Déjà confirmé : rien.
// - chantiersSansAcompte : chantiers de Planning Chantiers reliés à une commande (🏗️ Chantier ou lien de tâche) dont
//   💶 Acompte n'est ni ✅ Confirmé ni ➖ Non applicable (route achats/validation). Commande sans chantier (stock) :
//   pas de contrôle.
// Retesté sur Preview le 12/10/2026 avec TEST · Blanc 2 (commande bloquée, acompte confirmé, commande validée).

const PLANNING_CHANTIERS_ID = '901520038258';
const CHAMP_ACOMPTE = 'ba4a2025-43ec-44a0-8938-1cbc497f7bbf';
const CHAMP_RELATION_COMMANDE = '9b561ce2-719c-4cc0-9bb6-392959f9206e'; // 🏗️ Chantier côté commande
const FACTURE_TYPE = '2885d2af-84ee-4c56-aa4d-3be5e2efd671';
const FACTURE_AFFAIRE = '70f095a0-d0ec-413a-9ed9-fbc763306869';

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

async function commenter(taskId: string, token: string, texte: string): Promise<boolean> {
  const res = await api(token, `/task/${taskId}/comment`, 'POST', { comment_text: texte, notify_all: false });
  if (!res.ok) console.error(`Commentaire refusé (${res.status}) sur ${taskId}`);
  return res.ok;
}

const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c.id === id);

// Nom normalisé de l'option choisie d'un menu, '' si vide
function option(t: any, id: string): string {
  const f = champ(t, id);
  if (!f || f.value === undefined || f.value === null || f.value === '') return '';
  const o = (f.type_config?.options || []).find((x: any) => x.orderindex === Number(f.value) || x.id === f.value);
  return normal(o?.name || '');
}

const acompteOk = (t: any) => { const v = option(t, CHAMP_ACOMPTE); return v.includes('confirme') || v.includes('non applicable'); };

function idsRelies(t: any, champId: string): string[] {
  const v = champ(t, champId)?.value;
  return (Array.isArray(v) ? v : []).map((x: any) => String(x?.id ?? x)).filter(Boolean);
}

export function estFactureAcompte(facture: any): boolean {
  return option(facture, FACTURE_TYPE).includes('acompte');
}

// Facture d'acompte payée : 💶 Acompte → ✅ Confirmé sur le ou les chantiers reliés
export async function confirmerAcompte(token: string, facture: any, simulation: boolean) {
  if (!estFactureAcompte(facture)) return { action: 'pas_une_facture_acompte', chantiers: [] as any[] };
  const ids = idsRelies(facture, FACTURE_AFFAIRE);
  if (!ids.length) return { action: 'sans_affaire', chantiers: [] as any[] };
  const jour = libelleJour(aujourdhuiParis());
  const chantiers: any[] = [];
  for (const cid of ids.slice(0, 5)) {
    const c = await lireTache(cid, token);
    if (!c) { chantiers.push({ id: cid, action: 'introuvable' }); continue; }
    if (String(c?.list?.id ?? '') !== PLANNING_CHANTIERS_ID) { chantiers.push({ chantier: c.name, action: 'ignore_hors_planning' }); continue; }
    if (option(c, CHAMP_ACOMPTE).includes('confirme')) { chantiers.push({ chantier: c.name, action: 'deja_confirme' }); continue; }
    const o = (champ(c, CHAMP_ACOMPTE)?.type_config?.options || []).find((x: any) => normal(x.name).includes('confirme'));
    if (!o) { chantiers.push({ chantier: c.name, action: 'option_introuvable' }); continue; }
    if (simulation) { chantiers.push({ chantier: c.name, action: 'confirmerait' }); continue; }
    if (process.env.VERCEL_ENV !== 'production' && !normal(c.name).startsWith('test')) {
      chantiers.push({ chantier: c.name, action: 'refuse_preview_chantier_reel' });
      continue;
    }
    const r = await api(token, `/task/${c.id}/field/${CHAMP_ACOMPTE}`, 'POST', { value: o.id });
    if (!r.ok) { chantiers.push({ chantier: c.name, action: 'erreur_ecriture' }); continue; }
    await commenter(String(c.id), token, `💶 Acompte encaissé : « ${facture.name} » payée le ${jour}. Prérequis 💶 Acompte passé à ✅ Confirmé.`);
    chantiers.push({ chantier: c.name, action: 'confirme' });
  }
  return { action: 'traite', chantiers };
}

// Chantiers d'une commande dont l'acompte n'est pas encaissé (noms), et nombre de chantiers vérifiés
export async function chantiersSansAcompte(token: string, commande: any): Promise<{ verifies: number; sansAcompte: string[] }> {
  const moi = String(commande?.id);
  const liens = (Array.isArray(commande?.linked_tasks) ? commande.linked_tasks : [])
    .map((l: any) => (String(l?.task_id) === moi ? String(l?.link_id) : String(l?.task_id)))
    .filter((x: string) => x && x !== 'undefined' && x !== moi);
  const ids = Array.from(new Set([...idsRelies(commande, CHAMP_RELATION_COMMANDE), ...liens])).slice(0, 10);
  let verifies = 0;
  const sansAcompte: string[] = [];
  for (const id of ids) {
    const c = await lireTache(id, token);
    if (!c || c.parent || String(c?.list?.id ?? '') !== PLANNING_CHANTIERS_ID) continue;
    verifies++;
    if (!acompteOk(c)) sansAcompte.push(String(c.name));
  }
  return { verifies, sansAcompte };
}
