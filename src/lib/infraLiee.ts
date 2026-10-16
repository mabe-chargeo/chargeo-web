// Étape 8 du plan du 15/10/2026 (PR #51), synthèse finale du 14/10 section 7 et Q15 :
// « Résident qui demande plus tard : suggestion par adresse, segment RIC mis d'office, lien 🔗 Infrastructure liée,
// éléments du Tarif type recopiés. »
// - Suggestion : projets COP (Qualification, Planning Chantiers, Parc installé) à la même adresse que la fiche, ou à
//   moins de 80 m (point GPS de 📍 Adresse). Le commercial choisit : rien n'est rattaché tout seul.
// - Rattacher : 🏷️ Segment = RIC sur la fiche, 🔗 Infrastructure liée = l'infra (champ de Qualification, Planning et
//   Parc, même ID), plus une liaison de tâches visible des deux côtés (seul lien possible sur 🧪 TEST, qui n'a pas
//   le champ). Au Parc, l'Installation du résident pointe donc vers l'Installation infra (deux contrats séparés).
// - Tarif type : le scénario RIC archivé « Tarif type · » de l'infra (étape 6) est recopié en nouveau scénario de la
//   fiche, segment RIC, avec ses éléments reliés. Matériel ET forfait (distances) recopiés : c'est un modèle, pas le
//   relevé d'un autre site. État du tableau, terre, percements, notes et photos ne sont jamais recopiés.
// - Commentaires sur la fiche et sur l'infra. Preview : hors liste TEST, seules les fiches « Test… » sont proposées.
import { CHAMPS, OPTIONS, indexMenu, type Nature } from '@/lib/champsClickUp';
import { getQualificationListId } from '@/lib/listesClickUp';
import { PREFIXE_TARIF, sousTachesArchivees } from '@/lib/scenarioRetenu';
import { lettreSuivante, libelleScenario, lireTache, segmentDe, vue } from '@/lib/elements';
import { champType, chargerTypes, estDuType, type CarteTypes } from '@/lib/typesTaches';

export const CHAMP_INFRA_LIEE = 'f9b02e8a-b3ec-4fb6-b4fe-6be11e3b63ad';
const PLANNING_CHANTIERS_ID = '901520038258';
const PARC_ID = '901520038290';
const RAYON_M = 80;
const LIBELLES_LISTE: Record<string, string> = { [PLANNING_CHANTIERS_ID]: 'Planning Chantiers', [PARC_ID]: 'Parc installé' };

// Recopiés depuis le Tarif type : matériel et forfait
const COPIES_TARIF = [
  CHAMPS.sourceRaccordement, CHAMPS.typeRaccordement, CHAMPS.puissanceDispo, CHAMPS.raccordementCible, CHAMPS.typeCheminement,
  CHAMPS.coffretIrve, CHAMPS.gestionCharge, CHAMPS.mesurePuissance, CHAMPS.emplacement, CHAMPS.puissanceVisee, CHAMPS.marqueBorne,
  CHAMPS.supportBorne, CHAMPS.connectivite, CHAMPS.reseau, CHAMPS.tailleHub, CHAMPS.quantite,
  CHAMPS.distTubeApparent, CHAMPS.distGoulotte, CHAMPS.distEncastre, CHAMPS.distVideSanitaire, CHAMPS.distCheminCables,
  CHAMPS.distTirageExistant, CHAMPS.distTranchee,
];

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const champs = (t: any): any[] => (Array.isArray(t?.custom_fields) ? t.custom_fields : []);

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

async function commenter(token: string, id: string, texte: string) {
  const res = await api(token, `/task/${id}/comment`, 'POST', { comment_text: texte, notify_all: false });
  if (!res.ok) console.error(`Commentaire refusé (${res.status}) sur ${id}`);
}

// Champs d'une liste : type et options (index → identifiant)
type Def = { type: string; options: Map<number, string> };
async function defsDe(token: string, listId: string): Promise<Map<string, Def>> {
  const defs = new Map<string, Def>();
  const res = await api(token, `/list/${listId}/field`);
  if (!res.ok) return defs;
  const j = await res.json().catch(() => ({}));
  for (const f of Array.isArray(j?.fields) ? j.fields : []) {
    const options = new Map<number, string>();
    for (const o of Array.isArray(f?.type_config?.options) ? f.type_config.options : []) options.set(Number(o.orderindex), String(o.id));
    defs.set(String(f.id), { type: String(f.type), options });
  }
  return defs;
}

function ecrite(defs: Map<string, Def>, id: string, v: number): any {
  const d = defs.get(id);
  if (!d) return undefined;
  return d.type === 'drop_down' ? d.options.get(v) : v;
}

function versChamps(defs: Map<string, Def>, valeurs: Record<string, number>): { id: string; value: any }[] {
  const sortie: { id: string; value: any }[] = [];
  for (const [id, v] of Object.entries(valeurs)) {
    const w = ecrite(defs, id, v);
    if (w !== undefined) sortie.push({ id, value: w });
  }
  return sortie;
}

// Index pour un menu, nombre sinon (champs vides ignorés)
function valeursDe(t: any, ids: string[]): Record<string, number> {
  const sortie: Record<string, number> = {};
  for (const id of ids) {
    const f = champs(t).find((c) => c?.id === id);
    if (!f) continue;
    if (f.type === 'drop_down') {
      const i = indexMenu(t, id);
      if (i !== null) sortie[id] = i;
    } else if (f.value !== undefined && f.value !== null && f.value !== '' && Number.isFinite(Number(f.value))) {
      sortie[id] = Number(f.value);
    }
  }
  return sortie;
}

export type Adresse = { texte: string; lat: number | null; lng: number | null };

export function adresseDe(t: any): Adresse | null {
  const v = champs(t).find((c) => c?.id === CHAMPS.adresse)?.value;
  if (!v?.formatted_address) return null;
  const lat = v?.location?.lat;
  const lng = v?.location?.lng;
  const ok = (x: unknown) => x !== undefined && x !== null && x !== '' && Number.isFinite(Number(x));
  return { texte: String(v.formatted_address), lat: ok(lat) ? Number(lat) : null, lng: ok(lng) ? Number(lng) : null };
}

const cleAdresse = (s: string) => normal(s).replace(/\bfrance\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

function metres(a: Adresse, b: Adresse): number | null {
  if (a.lat === null || a.lng === null || b.lat === null || b.lng === null) return null;
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(h)));
}

// Infra liée : le champ 🔗 Infrastructure liée, sinon une tâche liée parmi les ids donnés (liste TEST, sans le champ)
export function infraLieeDe(t: any, candidats: { id: string; nom: string }[] = []): { id: string; nom: string } | null {
  const v = champs(t).find((c) => c?.id === CHAMP_INFRA_LIEE)?.value;
  const p = (Array.isArray(v) ? v : []).find((x: any) => x?.id);
  if (p) return { id: String(p.id), nom: String(p.name || '') };
  const lies = new Set<string>((Array.isArray(t?.linked_tasks) ? t.linked_tasks : []).flatMap((l: any) => [String(l?.task_id || ''), String(l?.link_id || '')]));
  const c = candidats.find((x) => lies.has(x.id));
  return c ? { id: c.id, nom: c.nom } : null;
}

async function tachesDe(token: string, listeId: string): Promise<any[]> {
  const sortie: any[] = [];
  for (let page = 0; page < 10; page++) {
    const res = await api(token, `/list/${listeId}/task?include_closed=true&page=${page}`);
    if (!res.ok) break;
    const j = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(j?.tasks) ? j.tasks : [];
    sortie.push(...lot);
    if (j?.last_page !== false || !lot.length) break;
  }
  return sortie;
}

export type Candidat = { id: string; nom: string; liste: string; memeAdresse: boolean; distance: number | null; tarifs: { id: string; nom: string }[] };

// Projets COP à la même adresse (ou à moins de 80 m), avec leurs Tarifs types RIC
export async function chercherInfras(token: string, fiche: any): Promise<Candidat[]> {
  const a = adresseDe(fiche);
  if (!a) return [];
  const qualif = getQualificationListId();
  const preview = process.env.VERCEL_ENV !== 'production';
  const listes = Array.from(new Set([qualif, PLANNING_CHANTIERS_ID, PARC_ID].filter(Boolean) as string[]));
  const cle = cleAdresse(a.texte);
  const trouves: Candidat[] = [];
  for (const listeId of listes) {
    for (const t of await tachesDe(token, listeId)) {
      if (String(t?.id) === String(fiche?.id) || t?.parent) continue;
      if (segmentDe(t) !== 'COP') continue;
      if (preview && listeId !== qualif && !normal(t?.name).startsWith('test')) continue;
      const b = adresseDe(t);
      if (!b) continue;
      const memeAdresse = cleAdresse(b.texte) === cle;
      const distance = metres(a, b);
      if (!memeAdresse && (distance === null || distance > RAYON_M)) continue;
      const tarifs = (await sousTachesArchivees(token, listeId, String(t.id)))
        .filter((s: any) => String(s?.name || '').startsWith(PREFIXE_TARIF))
        .map((s: any) => ({ id: String(s.id), nom: String(s.name || '') }));
      trouves.push({
        id: String(t.id), nom: String(t.name || ''), liste: listeId === qualif ? 'Qualification' : LIBELLES_LISTE[listeId] || listeId,
        memeAdresse, distance, tarifs,
      });
    }
  }
  return trouves
    .sort((x, y) => Number(y.memeAdresse) - Number(x.memeAdresse) || (x.distance ?? 1e9) - (y.distance ?? 1e9))
    .slice(0, 5);
}

// Recopie d'un Tarif type en nouveau scénario RIC de la fiche (éléments reliés comme dans le modèle)
async function recopierTarif(
  token: string, tarifId: string, fiche: any, defs: Map<string, Def>, carte: CarteTypes,
): Promise<{ id: string; nom: string; crees: string[]; erreurs: string[] } | null> {
  const tarif = await lireTache(token, tarifId, true);
  if (!tarif) return null;
  const listeSource = String(tarif?.list?.id || '');
  const listeCible = String(fiche?.list?.id || '');
  const ficheId = String(fiche.id);
  const actifs = (Array.isArray(tarif?.subtasks) ? tarif.subtasks : [])
    .filter((s: any) => String(s?.parent || '') === tarifId && !s?.archived).map((s: any) => String(s.id));
  const archives = (await sousTachesArchivees(token, listeSource, tarifId)).map((s: any) => String(s.id));
  const ids = Array.from(new Set([...actifs, ...archives]));
  const elements = (await Promise.all(ids.map((x) => lireTache(token, x)))).filter((t: any) => t && estDuType(t, 'element', carte));

  const freres = (Array.isArray(fiche?.subtasks) ? fiche.subtasks : []).filter((s: any) => !s?.parent || String(s.parent) === ficheId);
  const lettre = lettreSuivante([...freres, ...(await sousTachesArchivees(token, listeCible, ficheId))]);
  const libelle = libelleScenario(String(tarif?.name || '').replace(PREFIXE_TARIF, '')) || 'Borne parking';
  const nom = `Scénario ${lettre} : ${libelle}`;
  const res = await api(token, `/list/${listeCible}/task`, 'POST', {
    name: nom,
    parent: ficheId,
    description: `Recopié du « ${String(tarif?.name || '')} » de l'infra (modèle RIC) : matériel et forfait recopiés, à vérifier sur place.`,
    ...(await champType(token, 'scenario')),
    custom_fields: versChamps(defs, { ...valeursDe(tarif, [CHAMPS.zoneDeplacement]), [CHAMPS.segment]: OPTIONS.segment.RIC }),
  });
  if (!res.ok) {
    console.error(`Recopie du Tarif type refusée (${res.status})`, await res.text().catch(() => ''));
    return null;
  }
  const sc = await res.json().catch(() => ({}));
  const scId = String(sc?.id || '');
  const typeElement = await champType(token, 'element');
  const crees: string[] = [];
  const erreurs: string[] = [];
  const correspondance = new Map<string, string>();
  const creer = async (t: any, nature: Nature): Promise<string | null> => {
    const r = await api(token, `/list/${listeCible}/task`, 'POST', {
      name: String(t?.name || ''),
      parent: scId,
      description: 'Recopié du Tarif type de l\'infra : matériel et forfait à vérifier sur place.',
      ...typeElement,
      custom_fields: versChamps(defs, { [CHAMPS.nature]: OPTIONS.nature[nature], ...valeursDe(t, COPIES_TARIF) }),
    });
    if (!r.ok) return null;
    const j = await r.json().catch(() => ({}));
    return j?.id ? String(j.id) : null;
  };
  const relier = async (id: string, champId: string, cible: string): Promise<boolean> => {
    if (!defs.has(champId)) return false;
    return (await api(token, `/task/${id}/field/${champId}`, 'POST', { value: { add: [cible], rem: [] } })).ok;
  };
  const vues = elements.map((t: any) => ({ t, v: vue(t) }));
  for (const { t, v } of vues.filter((x) => x.v.nature && x.v.nature !== 'cheminement')) {
    const id = await creer(t, v.nature as Nature);
    if (id) { correspondance.set(v.id, id); crees.push(v.nom); } else erreurs.push(v.nom);
  }
  for (const { t, v } of vues.filter((x) => x.v.nature === 'cheminement')) {
    const id = await creer(t, 'cheminement');
    if (!id) { erreurs.push(v.nom); continue; }
    crees.push(v.nom);
    const dep = v.depart ? correspondance.get(v.depart) : undefined;
    const arr = v.arrivee ? correspondance.get(v.arrivee) : undefined;
    if (dep && !(await relier(id, CHAMPS.depart, dep))) erreurs.push(`${v.nom} (départ)`);
    if (arr && !(await relier(id, CHAMPS.arrivee, arr))) erreurs.push(`${v.nom} (arrivée)`);
  }
  const sansNature = vues.filter((x) => !x.v.nature).map((x) => x.v.nom);
  if (sansNature.length) erreurs.push(`sans nature, non recopiés : ${sansNature.join(', ')}`);
  return { id: scId, nom, crees, erreurs };
}

export type ResultatRattachement = { ok: boolean; erreur?: string; messages: string[]; erreurs: string[]; scenarioId?: string };

// Rattache la fiche (résident) à l'infra choisie, avec recopie éventuelle d'un Tarif type
export async function rattacher(token: string, fiche: any, infraId: string, tarifId: string | null): Promise<ResultatRattachement> {
  const candidats = await chercherInfras(token, fiche);
  if (infraLieeDe(fiche, candidats)) return { ok: false, erreur: 'Cette fiche est déjà rattachée à une infra', messages: [], erreurs: [] };
  const c = candidats.find((x) => x.id === infraId);
  if (!c) return { ok: false, erreur: "Infra introuvable à l'adresse de cette fiche", messages: [], erreurs: [] };
  if (tarifId && !c.tarifs.some((t) => t.id === tarifId)) return { ok: false, erreur: "Ce Tarif type n'appartient pas à cette infra", messages: [], erreurs: [] };

  const { carte } = await chargerTypes(token);
  const ficheId = String(fiche.id);
  const defs = await defsDe(token, String(fiche?.list?.id || ''));
  const messages: string[] = [];
  const erreurs: string[] = [];

  // 1. Segment RIC
  const seg = ecrite(defs, CHAMPS.segment, OPTIONS.segment.RIC);
  if (seg !== undefined && (await api(token, `/task/${ficheId}/field/${CHAMPS.segment}`, 'POST', { value: seg })).ok) messages.push('segment RIC posé');
  else erreurs.push('segment RIC');

  // 2. 🔗 Infrastructure liée, et liaison de tâches (seul lien sur la liste TEST)
  if (defs.has(CHAMP_INFRA_LIEE)) {
    if ((await api(token, `/task/${ficheId}/field/${CHAMP_INFRA_LIEE}`, 'POST', { value: { add: [infraId], rem: [] } })).ok) messages.push('🔗 Infrastructure liée remplie');
    else erreurs.push('🔗 Infrastructure liée');
  }
  const lienTache = (await api(token, `/task/${ficheId}/link/${infraId}`, 'POST')).ok;
  if (!defs.has(CHAMP_INFRA_LIEE)) {
    if (lienTache) messages.push('fiches liées (champ 🔗 Infrastructure liée absent de cette liste)');
    else erreurs.push("liaison avec l'infra");
  }

  // 3. Tarif type recopié en scénario RIC
  let scenarioId: string | undefined;
  if (tarifId) {
    const r = await recopierTarif(token, tarifId, fiche, defs, carte);
    if (r) {
      scenarioId = r.id;
      messages.push(`${r.nom} recopié du Tarif type (${r.crees.length} élément${r.crees.length > 1 ? 's' : ''})`);
      erreurs.push(...r.erreurs);
    } else erreurs.push('recopie du Tarif type');
  }

  // 4. Commentaires sur la fiche et sur l'infra
  const ou = c.memeAdresse ? 'même adresse' : `à ${c.distance} m`;
  await commenter(token, ficheId,
    `🔗 Résident rattaché à l'infra ${c.nom} (${ou}, ${c.liste}) : https://app.clickup.com/t/${infraId}. ${messages.join(' ; ')}.`
    + `${erreurs.length ? ` ⚠️ À reprendre à la main : ${erreurs.join(', ')}.` : ''} Devis RIC au résident, contrat de maintenance séparé de celui de la copropriété.`);
  await commenter(token, infraId, `🔗 Résident rattaché à cette infra : ${String(fiche?.name || '')} https://app.clickup.com/t/${ficheId}`);
  return { ok: erreurs.length === 0, messages, erreurs, scenarioId };
}
