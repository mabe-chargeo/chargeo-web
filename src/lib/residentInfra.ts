import { getQualificationListId, QUALIFICATION_PROD_ID } from '@/lib/listesClickUp';
import { alerter } from '@/lib/alerteSite';

// Bornes des résidents et infrastructure collective (Phase 2, tâche voyageuse, décision Matthieu du 13/10/2026).
// Au stade de l'infra, aucune fiche par résident : la fiche infra porte le nombre de places, le devis résident type
// reste informatif. Une fiche résident n'existe que lorsqu'un vrai résident se manifeste. Elle est distincte (son payeur
// est le résident), jamais en sous-tâche (les sous-tâches sont les emplacements), et liée à la fiche infra par un lien de
// tâche ClickUp, qui suit les deux fiches jusqu'au Parc.
// Fiche résident = 🏷️ Segment COP et 🏢 Type Client Particulier. Fiche infra = fiche principale liée, de Qualification,
// Planning Chantiers ou Parc, qui n'est pas une fiche résident.
// Règles :
// 1. Suggestion (création d'une fiche en Qualification) : adresse identique (rue et code postal) à une fiche infra COP
//    existante, sans lien : commentaire qui propose le lien. Rien n'est lié automatiquement.
// 2. Contrôle (📝 devis à faire) : fiche résident sans infra liée : alerte, avec les infras de même adresse s'il y en a.
// 3. Feu vert (Planning Chantiers) : borne résident refusée tant que son infra n'est pas au Parc (en service).
// 4. Parc : à la mise en service d'une borne résident, commentaire sur la fiche infra (les liens de tâche de la fiche
//    infra listent déjà toutes les bornes raccordées).

const PLANNING_CHANTIERS_ID = '901520038258';
const PARC_ID = '901520038290';
const CHAMP_SEGMENT = 'dbdacf18-1d26-4c58-9bbb-b4a9e443daa2';
const CHAMP_TYPE_CLIENT = 'f6b45107-9ba0-406b-8fd7-d678e6ad11dc';
const CHAMP_ADRESSE = '990a7f3b-989f-416d-9a80-eba5654b228d';
const CHAMP_LIEU = '5b9cbfd6-535c-4416-b530-776f949ce432';
const PAGES_MAX = 10;

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

export async function lireTache(id: string, token: string): Promise<any | null> {
  const res = await api(token, `/task/${encodeURIComponent(id)}?custom_task_ids=true`);
  return res.ok ? res.json() : null;
}

async function commenter(token: string, id: string, texte: string): Promise<boolean> {
  const res = await api(token, `/task/${id}/comment`, 'POST', { comment_text: texte, notify_all: false });
  if (!res.ok) console.error(`Commentaire refusé (${res.status}) sur ${id}`);
  return res.ok;
}

const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c.id === id);
function option(t: any, id: string): string {
  const f = champ(t, id);
  if (!f || f.value === undefined || f.value === null || f.value === '') return '';
  const o = (f.type_config?.options || []).find((x: any) => x.orderindex === Number(f.value) || x.id === f.value);
  return String(o?.name || '');
}

export const estResident = (t: any) => normal(option(t, CHAMP_SEGMENT)) === 'cop' && normal(option(t, CHAMP_TYPE_CLIENT)).includes('particulier');
const estCop = (t: any) => normal(option(t, CHAMP_SEGMENT)) === 'cop';

function listesSuivies(): string[] {
  return Array.from(new Set([QUALIFICATION_PROD_ID, String(getQualificationListId() || ''), PLANNING_CHANTIERS_ID, PARC_ID].filter(Boolean)));
}

// Adresse comparable : rue sans numéro + code postal (deux bâtiments d'une même copro gardent la même clé)
const ABREVIATIONS: [RegExp, string][] = [
  [/\bavenue\b/g, 'av'], [/\bboulevard\b/g, 'bd'], [/\bchemin\b/g, 'ch'], [/\broute\b/g, 'rte'], [/\brue\b/g, 'r'],
  [/\bplace\b/g, 'pl'], [/\ballee\b/g, 'all'], [/\bimpasse\b/g, 'imp'], [/\bsaint\b/g, 'st'],
];
export function cleAdresse(brute: string): string {
  const texte = String(brute || '');
  const cp = (texte.match(/\b\d{5}\b/) || [])[0] || '';
  const premier = texte.split(',')[0] || '';
  let rue = normal(cp ? premier.split(cp)[0] : premier);
  for (const [re, abr] of ABREVIATIONS) rue = rue.replace(re, abr);
  rue = rue.replace(/^\d+\s*(bis|ter|quater)?\s*/, '').replace(/\s+/g, ' ').trim();
  return cp && rue ? `${rue}|${cp}` : '';
}
function adresseDe(t: any): string {
  for (const id of [CHAMP_LIEU, CHAMP_ADRESSE]) {
    const v = champ(t, id)?.value;
    const a = v?.formatted_address || (typeof v === 'string' ? v : '');
    if (a) return String(a);
  }
  return '';
}

// Fiches liées (lien de tâche), principales, dans Qualification / Planning / Parc, qui ne sont pas des fiches résident
export async function infrasLiees(fiche: any, token: string): Promise<any[]> {
  const moi = String(fiche.id);
  const ids = (Array.isArray(fiche?.linked_tasks) ? fiche.linked_tasks : [])
    .map((l: any) => (String(l?.task_id) === moi ? String(l?.link_id) : String(l?.task_id)))
    .filter((x: string) => x && x !== 'undefined' && x !== moi);
  const listes = listesSuivies();
  const trouvees: any[] = [];
  for (const id of Array.from(new Set<string>(ids)).slice(0, 20)) {
    const t = await lireTache(id, token);
    if (t && !t.parent && listes.includes(String(t?.list?.id ?? '')) && !estResident(t)) trouvees.push(t);
  }
  return trouvees;
}

// Fiches infra COP de même adresse (Qualification, Planning, Parc). Au Parc, Segment peut manquer : l'adresse suffit.
async function infrasMemeAdresse(fiche: any, token: string): Promise<any[]> {
  const cle = cleAdresse(adresseDe(fiche));
  if (!cle) return [];
  const resultats: any[] = [];
  for (const liste of listesSuivies()) {
    for (let page = 0; page < PAGES_MAX; page++) {
      const res = await api(token, `/list/${liste}/task?archived=false&include_closed=true&page=${page}`);
      if (!res.ok) break;
      const json = await res.json().catch(() => ({}));
      const taches: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
      for (const t of taches) {
        if (t.parent || String(t.id) === String(fiche.id) || estResident(t)) continue;
        const parc = String(t?.list?.id ?? liste) === PARC_ID;
        if (!(estCop(t) || parc)) continue;
        if (cleAdresse(adresseDe(t)) === cle) resultats.push(t);
      }
      if (json?.last_page !== false || taches.length === 0) break;
    }
  }
  return resultats;
}

const lienFiche = (t: any) => `${t.name} : https://app.clickup.com/t/${t.id}`;

// Règle 1 : suggestion à la création d'une fiche en Qualification
export async function suggererInfra(taskId: string, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { success: false, error: 'Configuration serveur incomplète' };
  const fiche = await lireTache(taskId, token);
  if (!fiche) return { success: false, error: 'Fiche introuvable' };
  if (fiche.parent) return { success: true, action: 'ignore_sous_tache', simulation };
  if (estCop(fiche) && !estResident(fiche)) return { success: true, action: 'ignore_fiche_infra', simulation };
  if ((await infrasLiees(fiche, token)).length) return { success: true, action: 'deja_liee', simulation };
  // Création signalée deux fois par ClickUp (taskCreated puis statut initial) : une seule suggestion
  const deja = await api(token, `/task/${fiche.id}/comment`);
  const jsonDeja = deja.ok ? await deja.json().catch(() => ({})) : {};
  if ((Array.isArray(jsonDeja?.comments) ? jsonDeja.comments : []).some((c: any) => String(c?.comment_text || '').startsWith('🏢 Cette demande semble'))) {
    return { success: true, action: 'deja_suggere', simulation };
  }
  const candidates = await infrasMemeAdresse(fiche, token);
  if (!candidates.length) return { success: true, action: 'aucune_infra_meme_adresse', simulation };
  const texte = `🏢 Cette demande semble dépendre d'une infrastructure collective déjà connue (même adresse) :\n${candidates.map((c) => `• ${lienFiche(c)}`).join('\n')}\nSi c'est un résident de cette copropriété : passe 🏷️ Segment à COP, 🏢 Type Client à Particulier, et lie cette fiche à l'infra (Lier une tâche). Rien n'a été lié automatiquement.`;
  if (!simulation) await commenter(token, String(fiche.id), texte);
  return { success: true, action: 'suggestion', candidates: candidates.map((c) => c.name), commentaire: texte, simulation };
}

// Règle 2 : contrôle au passage en 📝 devis à faire
export async function controlerResident(taskId: string, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { success: false, error: 'Configuration serveur incomplète' };
  const fiche = await lireTache(taskId, token);
  if (!fiche) return { success: false, error: 'Fiche introuvable' };
  if (fiche.parent) return { success: true, action: 'ignore_sous_tache', simulation };
  if (!estResident(fiche)) return { success: true, action: 'ignore_pas_resident', simulation };
  const liees = await infrasLiees(fiche, token);
  if (liees.length) return { success: true, action: 'infra_liee', infra: liees.map((t) => t.name), simulation };
  const candidates = await infrasMemeAdresse(fiche, token);
  const propositions = candidates.length ? ` Infra de même adresse : ${candidates.map(lienFiche).join(' ; ')}.` : ' Aucune infra de même adresse trouvée : vérifie que l\'infra de la copropriété a bien sa fiche.';
  const texte = `⚠️ Borne résident sans infrastructure liée : lie cette fiche à la fiche de l'infra collective de la copropriété (Lier une tâche) avant de chiffrer.${propositions}`;
  if (!simulation) await alerter(token, String(fiche.id), texte);
  return { success: true, action: 'alerte_sans_infra', candidates: candidates.map((c) => c.name), commentaire: texte, simulation };
}

// Règle 3 : motif de refus du feu vert pour une borne résident, null si rien ne bloque
export async function blocageResident(tache: any, token: string): Promise<string | null> {
  if (!estResident(tache)) return null;
  const liees = await infrasLiees(tache, token);
  if (!liees.length) return '🏢 borne résident sans infrastructure liée (lie la fiche à l\'infra de la copropriété)';
  const enService = liees.filter((t) => String(t?.list?.id ?? '') === PARC_ID);
  if (enService.length) return null;
  return `🏢 l'infrastructure de la copropriété n'est pas encore en service (${liees.map((t) => `${t.name} : ${t?.status?.status || '?'}`).join(', ')})`;
}

// Règle 4, en deux temps autour de la réception (🏁 terminé), dans le même envoi de l'aiguillage :
// - avantReceptionResident : fiche encore dans Planning Chantiers, 🏢 Type Client encore présent (le champ n'existe pas
//   au Parc) : on retient si c'est une borne résident et ses infras liées ;
// - apresReceptionResident : si la fiche est bien arrivée au Parc, commentaire sur chaque fiche infra retenue.
const retenues = new Map<string, { id: string; name: string }[]>();

export async function avantReceptionResident(taskId: string, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { success: false, error: 'Configuration serveur incomplète' };
  const tache = await lireTache(taskId, token);
  if (!tache) return { success: false, error: 'Fiche introuvable' };
  if (tache.parent || !estResident(tache)) return { success: true, action: 'ignore_pas_resident', simulation };
  const liees = await infrasLiees(tache, token);
  retenues.set(String(tache.id), liees.map((t) => ({ id: String(t.id), name: String(t.name || '') })));
  return { success: true, action: 'resident_retenu', infras: liees.map((t) => t.name), simulation };
}

export async function apresReceptionResident(taskId: string, simulation: boolean, jour: string) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { success: false, error: 'Configuration serveur incomplète' };
  const tache = await lireTache(taskId, token);
  if (!tache) return { success: false, error: 'Fiche introuvable' };
  const infras = retenues.get(String(tache.id));
  retenues.delete(String(tache.id));
  if (!infras) return { success: true, action: 'ignore_pas_resident', simulation };
  if (String(tache?.list?.id ?? '') !== PARC_ID) return { success: true, action: simulation ? 'signalerait_apres_passage_au_parc' : 'ignore_pas_au_parc', infras: infras.map((t) => t.name), simulation };
  if (simulation) return { success: true, action: 'signalerait', infras: infras.map((t) => t.name), simulation };
  for (const infra of infras) {
    // Déjà signalée (envoi répété de ClickUp) : pas de second commentaire
    const res = await api(token, `/task/${infra.id}/comment`);
    const json = res.ok ? await res.json().catch(() => ({})) : {};
    const deja = (Array.isArray(json?.comments) ? json.comments : []).some((c: any) => String(c?.comment_text || '').includes('Borne résident mise en service') && String(c?.comment_text || '').includes(String(tache.id)));
    if (!deja) await commenter(token, infra.id, `🔌 Borne résident mise en service le ${jour} sur cette infrastructure : ${lienFiche(tache)}`);
  }
  return { success: true, action: 'signale', infras: infras.map((t) => t.name) };
}
