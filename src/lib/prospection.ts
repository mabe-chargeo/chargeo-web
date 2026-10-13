import { getQualificationListId } from '@/lib/listesClickUp';
import { aujourdhuiParis, ajouterJours, ajouterJoursOuvres, prochainOuvre, echeanceClickUp, libelleJour, type Jour } from '@/lib/joursOuvres';
import { alerter } from '@/lib/alerteSite';

// Prospection (Chasse) : relances internes et passage en Qualification (Phase 2, tache voyageuse, 13/10/2026).
// Appelé par l'aiguillage (src/lib/aiguillage.ts) pour la liste Prospection, selon le wiki de la liste :
// - création : échéance = aujourd'hui (ou le prochain jour ouvré) si la fiche n'en a pas. Aucun lead sans date.
// - 🏃 en traitement : échéance +2 jours ouvrés. 📞 contacté : +1 jour ouvré. 💤 nurturing : +90 jours.
// - 📢 Résultat Appel = Pas de réponse ou Message vocal : échéance +2 jours ouvrés et tentative tracée en commentaire.
//   À rappeler plus tard : rappel en commentaire de mettre la date convenue en échéance (rien n'est inventé).
// - ⛔ pas intéressé, 🏁 archivé : échéance effacée.
// - 📅 rdv fixé : échéance effacée, puis la même fiche part en Qualification, statut 📍 à visiter, avec son historique.
//   Source et 🔗 Profil LinkedIn partent avec elle (champs propres à Prospection, ajoutés à Qualification par le
//   déplacement). Le Passeport (téléphone, email, adresse, type client, budget) est commun aux deux listes : il est relu
//   après le déplacement, un champ vidé est signalé.
// Rien n'est envoyé au prospect : ce sont des rappels internes au commercial.
// Preview : vrai passage sur une fiche « Test… » uniquement (vers la liste Qualification TEST), simulation partout.

const WORKSPACE_ID = process.env.CLICKUP_TEAM_ID || '90151325642';
export const PROSPECTION_ID = process.env.CLICKUP_PROSPECTION_LIST_ID || '901519675281';
export const CHAMP_RESULTAT_APPEL = '54bb5a3e-7605-477e-87df-16a858cac760';
const CHAMP_SOURCE = '473aa581-a6b1-43c7-8c2e-efd683954a6c';
const CHAMP_LINKEDIN = '5341e128-7fea-4eb2-a3d2-4606e96e4c7a';
const A_DEPLACER = [CHAMP_SOURCE, CHAMP_LINKEDIN];
const A_CONTROLER: { id: string; nom: string }[] = [
  { id: '6a120794-23be-4c50-8d25-75993f0aece4', nom: '📞 Telephone' },
  { id: '66aee5d1-7159-46a7-b986-3dd6c314fd80', nom: '📧 Email' },
  { id: '990a7f3b-989f-416d-9a80-eba5654b228d', nom: '📍 Adresse' },
  { id: 'f6b45107-9ba0-406b-8fd7-d678e6ad11dc', nom: '🏢 Type Client' },
  { id: '67b206e6-7794-406a-bdc8-d9f87c4e87c0', nom: '💰 Budget Estimé' },
  { id: CHAMP_SOURCE, nom: 'Source' },
  { id: CHAMP_LINKEDIN, nom: '🔗 Profil LinkedIn' },
];

export type DeclencheurProspection = 'creation' | 'statut' | 'resultat';

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

async function api(token: string, chemin: string, methode = 'GET', corps?: any, version = 'v2'): Promise<Response> {
  return fetch(`https://api.clickup.com/api/${version}${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

async function lireTache(id: string, token: string): Promise<any | null> {
  const res = await api(token, `/task/${encodeURIComponent(id)}?custom_task_ids=true&include_subtasks=true`);
  return res.ok ? res.json() : null;
}

async function commenter(token: string, id: string, texte: string): Promise<boolean> {
  const res = await api(token, `/task/${id}/comment`, 'POST', { comment_text: texte, notify_all: false });
  if (!res.ok) console.error(`Commentaire refusé (${res.status}) sur ${id}`);
  return res.ok;
}

async function statutsListe(listId: string, token: string): Promise<any[]> {
  const res = await api(token, `/list/${listId}`);
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json?.statuses) ? json.statuses : [];
}

const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c.id === id);
const rempli = (t: any, id: string) => {
  const v = champ(t, id)?.value;
  return !(v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0));
};
function option(t: any, id: string): string {
  const f = champ(t, id);
  if (!f || f.value === undefined || f.value === null || f.value === '') return '';
  const o = (f.type_config?.options || []).find((x: any) => x.orderindex === Number(f.value) || x.id === f.value);
  return String(o?.name || '');
}

async function ecrireEcheance(token: string, id: string, jour: Jour | null): Promise<boolean> {
  const res = await api(token, `/task/${id}`, 'PUT', jour ? { due_date: echeanceClickUp(jour), due_date_time: false } : { due_date: null });
  if (!res.ok) console.error(`Échéance refusée (${res.status}) sur ${id}`);
  return res.ok;
}

// Même fiche déplacée en Qualification, statuts utilisés (fiche et sous-tâches) vers 📍 à visiter
async function basculer(fiche: any, token: string): Promise<{ ok: boolean; detail?: string; essai?: string; relue?: any }> {
  const dest = getQualificationListId();
  if (!dest) return { ok: false, detail: 'liste Qualification introuvable (configuration)' };
  const [source, arrivee] = await Promise.all([statutsListe(PROSPECTION_ID, token), statutsListe(dest, token)]);
  const cible = arrivee.find((s: any) => normal(s.status).includes('visiter')) || arrivee.find((s: any) => s.type === 'open');
  if (!cible || !source.length) return { ok: false, detail: 'statuts introuvables' };
  const trouver = (s: any) => source.find((x: any) => x.id === s?.id) || source.find((x: any) => normal(x.status) === normal(s?.status));
  const actuel = trouver(fiche.status);
  if (!actuel) return { ok: false, detail: 'statut actuel introuvable' };
  const utilises: any[] = [actuel];
  for (const st of Array.isArray(fiche?.subtasks) ? fiche.subtasks : []) {
    const s = trouver(st.status);
    if (s && !utilises.some((u) => u.id === s.id)) utilises.push(s);
  }
  const champs = { move_custom_fields: true, custom_fields_to_move: A_DEPLACER };
  const essais: { nom: string; corps: any }[] = [
    { nom: 'utilises_id', corps: { ...champs, status_mappings: utilises.map((s) => ({ source_status_id: s.id, destination_status_id: cible.id })) } },
    { nom: 'utilises', corps: { ...champs, status_mappings: utilises.map((s) => ({ source_status: s.id, destination_status: cible.id })) } },
    { nom: 'actuel_id', corps: { ...champs, status_mappings: [{ source_status_id: actuel.id, destination_status_id: cible.id }] } },
  ];
  const erreurs: string[] = [];
  for (const e of essais) {
    const res = await api(token, `/workspaces/${WORKSPACE_ID}/tasks/${fiche.id}/home_list/${dest}`, 'PUT', e.corps, 'v3');
    if (res.ok) {
      const relue = await lireTache(String(fiche.id), token);
      return { ok: String(relue?.list?.id ?? '') === String(dest), detail: relue?.status?.status, essai: e.nom, relue };
    }
    erreurs.push(`${e.nom}: HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 120)}`);
    if (res.status !== 400) break;
  }
  return { ok: false, detail: erreurs.join(' | ') };
}

type Plan =
  | { action: 'echeance'; jour: Jour; motif: string; trace?: string }
  | { action: 'effacer'; motif: string }
  | { action: 'bascule' }
  | { action: 'commentaire'; texte: string }
  | { action: 'rien'; motif: string };

function planifier(fiche: any, declencheur: DeclencheurProspection, aujourdhui: Jour): Plan {
  const s = normal(fiche?.status?.status);
  const type = String(fiche?.status?.type || '');
  const termine = s.includes('rdv') || s.includes('pas interesse') || s.includes('archive') || type === 'closed' || type === 'done';

  if (declencheur === 'resultat') {
    if (termine) return { action: 'rien', motif: 'fiche sortie de la chasse' };
    const r = normal(option(fiche, CHAMP_RESULTAT_APPEL));
    if (r.includes('pas de reponse') || r.includes('message vocal')) {
      const jour = ajouterJoursOuvres(aujourdhui, 2);
      const quoi = r.includes('message vocal') ? 'message vocal laissé' : 'pas de réponse';
      return { action: 'echeance', jour, motif: 'tentative sans réponse', trace: `📞 Tentative du ${libelleJour(aujourdhui)} : ${quoi}. Prochain appel le ${libelleJour(jour)}.` };
    }
    if (r.includes('rappeler')) return { action: 'commentaire', texte: '💬 À rappeler plus tard : mets la date convenue avec le prospect en échéance, sinon le lead sort de la vue « À appeler aujourd\'hui ».' };
    return { action: 'rien', motif: 'résultat vide' };
  }

  if (declencheur === 'creation' || s.includes('a traiter')) {
    if (fiche?.due_date) return { action: 'rien', motif: 'échéance déjà posée' };
    return { action: 'echeance', jour: prochainOuvre(aujourdhui), motif: 'nouveau lead' };
  }
  if (s.includes('rdv')) return { action: 'bascule' };
  if (s.includes('pas interesse') || s.includes('archive') || type === 'closed') return { action: 'effacer', motif: 'sorti de la chasse' };
  if (s.includes('traitement')) return { action: 'echeance', jour: ajouterJoursOuvres(aujourdhui, 2), motif: 'lead pris' };
  if (s.includes('contacte')) return { action: 'echeance', jour: ajouterJoursOuvres(aujourdhui, 1), motif: 'filet de sécurité après échange' };
  if (s.includes('nurturing')) return { action: 'echeance', jour: prochainOuvre(ajouterJours(aujourdhui, 90)), motif: 'nurturing, rappel à 90 jours' };
  return { action: 'rien', motif: 'statut sans règle' };
}

export async function traiterProspection(taskId: string, declencheur: DeclencheurProspection, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { success: false, error: 'Configuration serveur incomplète' };
  const fiche = await lireTache(taskId, token);
  if (!fiche) return { success: false, error: 'Fiche introuvable' };
  if (fiche.parent) return { success: true, action: 'ignore_sous_tache', simulation };
  if (String(fiche?.list?.id ?? '') !== String(PROSPECTION_ID)) return { success: true, action: 'ignore_hors_prospection', simulation };
  if (process.env.VERCEL_ENV !== 'production' && !simulation && !normal(fiche.name).startsWith('test')) {
    return { success: false, action: 'refuse_preview_fiche_reelle', error: 'En preview : exécution sur une fiche « Test » uniquement, simulation partout' };
  }

  const id = String(fiche.id);
  const aujourdhui = aujourdhuiParis();
  const plan = planifier(fiche, declencheur, aujourdhui);
  const base = { declencheur, statut: fiche?.status?.status, simulation };

  if (plan.action === 'rien') return { success: true, ...base, action: 'rien', motif: plan.motif };
  if (plan.action === 'commentaire') {
    if (!simulation) await commenter(token, id, plan.texte);
    return { success: true, ...base, action: 'commentaire', commentaire: plan.texte };
  }
  if (plan.action === 'echeance') {
    const resume = { success: true, ...base, action: 'echeance', echeance: libelleJour(plan.jour), motif: plan.motif, commentaire: plan.trace };
    if (simulation) return resume;
    const ok = await ecrireEcheance(token, id, plan.jour);
    if (plan.trace) await commenter(token, id, plan.trace);
    return { ...resume, success: ok };
  }
  if (plan.action === 'effacer') {
    if (simulation) return { success: true, ...base, action: 'echeance_effacee', motif: plan.motif };
    return { success: await ecrireEcheance(token, id, null), ...base, action: 'echeance_effacee', motif: plan.motif };
  }

  // 📅 rdv fixé : passage en Qualification
  if (simulation) {
    return { success: true, ...base, action: 'bascule', destination: getQualificationListId() || 'introuvable', statutArrivee: '📍 à visiter', champsDeplaces: ['Source', '🔗 Profil LinkedIn'] };
  }
  await ecrireEcheance(token, id, null);
  const d = await basculer(fiche, token);
  if (!d.ok) {
    await alerter(token, id, "⚠️ RDV fixé : la fiche n'a pas pu passer en Qualification. Déplace-la à la main (statut 📍 à visiter), en gardant les champs Source et Profil LinkedIn.");
    return { success: false, ...base, action: 'bascule_echec', detail: d.detail };
  }
  const perdus = A_CONTROLER.filter((c) => rempli(fiche, c.id) && !rempli(d.relue, c.id)).map((c) => c.nom);
  const source = option(fiche, CHAMP_SOURCE);
  await commenter(token, id, `📅 RDV fixé : fiche passée de Prospection en Qualification (${d.detail || '📍 à visiter'}), avec son historique.${source ? ` Source : ${source}.` : ' ⚠️ Source non renseignée.'} Renseigne 📅 Date Visite Technique.`);
  if (perdus.length) {
    await alerter(token, id, `⚠️ RDV fixé : fiche arrivée en Qualification, mais ${perdus.join(', ')} ${perdus.length > 1 ? 'sont vides' : 'est vide'} après le déplacement. Recopie la valeur depuis l'historique de la fiche.`);
  }
  return { success: !perdus.length, ...base, action: 'bascule', statutArrivee: d.detail, essai: d.essai, champsVides: perdus };
}
