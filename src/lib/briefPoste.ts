// Brief de chiffrage : envoi sur le scénario et lecture depuis l'appli (Phase 8, passe 2 de la recette, 03/11/2026).
// - Le brief est calculé par src/lib/briefChiffrage.ts (genererBrief) et posté en commentaire sur le scénario.
// - Un nouveau brief marque les précédents « ⛔ BRIEF PÉRIMÉ » (écart 41) : un seul brief valable sur le scénario.
// - L'appli lit le dernier brief valable (dernierBrief) pour l'afficher sous le relevé (idée de Mathieu, écart 24).
// - Places de parking et date du permis : données du site, lues sur la fiche d'abord, puis sur le scénario (ancien relevé).
// - Les alertes et les lignes à faire à la main sont comptées à part (écart 35).
// - Lot 3 (03/11) : prix de vente de la bibliothèque Costructor (pour les 3 valeurs ADVENIR, écarts 4, 9, 34), lus une
//   fois et gardés 10 minutes ; une lecture impossible laisse la formule dans le brief, rien n'est inventé. RIC sur l'infra
//   CHARGéO : artère de l'infra liée (🔗 Infrastructure liée, sinon tâche liée en COP), pour la section de la dérivation
//   (écarts 66 et 70).
// - 04/11 (préparation de la passe 3) : l'artère est d'abord cherchée sur la fiche du scénario RIC elle-même (Tarif type
//   chiffré sur la fiche de la copropriété, cas 9 de la recette), puis sur l'infra liée ; fiches, scénarios et éléments
//   archivés écartés (case archivée ou statut 🏁 archivé).
import { CHAMPS, OPTIONS, cleOption, indexMenu, type Segment } from '@/lib/champsClickUp';
import { BUDGET_ARTERE, chute, genererBrief, type ArtereInfra } from '@/lib/briefChiffrage';
import { longueurTotale, type ElementReleve } from '@/lib/releveElements';
import { lireTache, segmentDe, vue } from '@/lib/elements';
import { CHAMP_INFRA_LIEE } from '@/lib/infraLiee';

export const ENTETE_BRIEF = '📋 Brief de chiffrage';
const PERIME = '⛔ BRIEF PÉRIMÉ';
const COSTRUCTOR = 'https://api.costructor.co/external/v1';
// Prix de référence pour reconnaître des montants en centimes (BORNE-HAG-WONE-7 : 897,92 € HT, bibliothèque du 03/11)
const ETALON = { ref: 'BORNE-HAG-WONE-7', prix: 897.92 };

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// Archivé : case « archivé » de ClickUp ou statut 🏁 archivé (le résumé des sous-tâches ne porte pas toujours la case)
const estArchive = (t: any) => !!t?.archived || normal(t?.status?.status).includes('archiv');

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

type CommentaireBrief = { id: string; texte: string; date: number };

// Commentaires de brief du scénario, du plus récent au plus ancien
async function commentairesBrief(token: string, scenarioId: string): Promise<CommentaireBrief[]> {
  const res = await api(token, `/task/${encodeURIComponent(scenarioId)}/comment`);
  if (!res.ok) return [];
  const j = await res.json().catch(() => ({}));
  return (Array.isArray(j?.comments) ? j.comments : [])
    .map((c: any) => ({ id: String(c?.id || ''), texte: String(c?.comment_text || ''), date: Number(c?.date) || 0 }))
    .filter((c: CommentaireBrief) => c.id && (c.texte.startsWith(ENTETE_BRIEF) || c.texte.startsWith(PERIME)))
    .sort((a: CommentaireBrief, b: CommentaireBrief) => b.date - a.date);
}

// Dernier brief valable du scénario (null s'il n'y en a pas encore)
export async function dernierBrief(token: string, scenarioId: string): Promise<{ texte: string; date: number } | null> {
  const d = (await commentairesBrief(token, scenarioId)).find((c) => c.texte.startsWith(ENTETE_BRIEF));
  return d ? { texte: d.texte, date: d.date } : null;
}

// Prix de vente HT de la bibliothèque, par référence (null = lecture impossible). Gardés 10 minutes.
let cachePrix: { lu: number; prix: Map<string, number> } | null = null;
const prixDe = (p: any): number | null => {
  for (const v of [p?.sellPrice, p?.sell_price, p?.unitSellPrice, p?.salePrice, p?.unitPrice, p?.price]) {
    const n = typeof v === 'object' && v !== null ? Number(v?.amount) : Number(v);
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(n)) return n;
  }
  return null;
};
export async function prixBibliotheque(): Promise<Map<string, number> | null> {
  if (cachePrix && Date.now() - cachePrix.lu < 10 * 60 * 1000) return cachePrix.prix;
  const token = process.env.COSTRUCTOR_API_KEY;
  if (!token) return null;
  const prix = new Map<string, number>();
  const vus = new Set<string>();
  try {
    for (let page = 1; page <= 30; page++) {
      const res = await fetch(`${COSTRUCTOR}/products?_limit=100&limit=100&_page=${page}&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) { if (page === 1) return null; break; }
      const j = await res.json().catch(() => ({}));
      const lot: any[] = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      const nouveaux = lot.filter((p) => p?.id && !vus.has(String(p.id)));
      if (!nouveaux.length) break;
      for (const p of nouveaux) {
        vus.add(String(p.id));
        const ref = String(p?.reference ?? p?.ref ?? '').trim();
        const v = prixDe(p);
        if (ref && v !== null && !prix.has(ref)) prix.set(ref, v);
      }
    }
  } catch (e) {
    console.error('Prix de la bibliothèque illisibles :', e);
    return null;
  }
  if (!prix.size) return null;
  // Montants en centimes : ramenés en euros (étalon BORNE-HAG-WONE-7)
  const etalon = prix.get(ETALON.ref);
  if (etalon !== undefined && etalon > ETALON.prix * 20) for (const [k, v] of Array.from(prix)) prix.set(k, v / 100);
  cachePrix = { lu: Date.now(), prix };
  return prix;
}

// Artère de l'infra CHARGéO d'un scénario RIC (écarts 66 et 70) : section forcée, sinon 16 mm² ou 25 mm² selon la chute
// (même calcul que le brief de l'infra). Cherchée d'abord sur la fiche du scénario elle-même (Tarif type chiffré sur la
// fiche de la copropriété, cas 9), puis sur l'infra liée (🔗 Infrastructure liée, ou tâche liée sur la liste TEST qui n'a
// pas le champ). Scénario retenu d'abord, sinon le premier scénario COP qui a une artère.
async function artereInfra(token: string, fiche: any): Promise<ArtereInfra | null> {
  if (!fiche?.id) return null;
  const ficheId = String(fiche.id);
  const ids: string[] = [ficheId];
  const champ = (Array.isArray(fiche?.custom_fields) ? fiche.custom_fields : []).find((c: any) => c?.id === CHAMP_INFRA_LIEE);
  for (const x of Array.isArray(champ?.value) ? champ.value : []) if (x?.id && !ids.includes(String(x.id))) ids.push(String(x.id));
  for (const l of Array.isArray(fiche?.linked_tasks) ? fiche.linked_tasks : []) {
    const autre = String(l?.task_id || '') === ficheId ? String(l?.link_id || '') : String(l?.task_id || '');
    if (autre && !ids.includes(autre)) ids.push(autre);
  }
  for (const id of ids.slice(0, 6)) {
    const infra = await lireTache(token, id, true);
    if (!infra || infra.parent || estArchive(infra)) continue;
    const scenarios = (Array.isArray(infra.subtasks) ? infra.subtasks : [])
      .filter((s: any) => String(s?.parent || '') === id && !estArchive(s))
      .sort((a: any, b: any) => Number(String(b?.name || '').startsWith('✅ Retenu')) - Number(String(a?.name || '').startsWith('✅ Retenu')));
    for (const s of scenarios) {
      const sc = await lireTache(token, String(s.id), true);
      if (!sc || estArchive(sc) || segmentDe(sc) !== 'COP') continue;
      const sous = (Array.isArray(sc.subtasks) ? sc.subtasks : []).filter((e: any) => String(e?.parent || '') === String(sc.id) && !estArchive(e));
      const els = (await Promise.all(sous.map((e: any) => lireTache(token, String(e.id))))).filter((t: any) => t && !estArchive(t)).map(vue);
      const artere = els.find((e) => e.nature === 'cheminement' && e.typeCheminement === 'artere');
      if (!artere) continue;
      const racc = els.find((e) => e.nature === 'raccordement');
      const tri = String(racc?.valeurs.typeRaccordement ?? '') !== 'mono';
      const forcee = Number(String(artere.valeurs.sectionForcee ?? '').replace(',', '.')) || null;
      const section = forcee ?? (chute(true, longueurTotale(artere.valeurs), 63, 16) <= BUDGET_ARTERE ? 16 : 25);
      const nom = id === ficheId ? `${String(sc.name || '')} (même fiche)` : `${String(infra.name || '')} · ${String(sc.name || '')}`;
      return { section, tri, nom };
    }
  }
  return null;
}

// Calcule le brief d'un scénario, le poste en commentaire et marque les anciens périmés
export async function posterBrief(token: string, scenario: any, elements: ElementReleve[]): Promise<{ ok: boolean; alertes: number; aFaire: number; texte: string; perimes: number }> {
  const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c?.id === id);
  let fiche: any = null;
  if (scenario?.parent) {
    const r = await api(token, `/task/${encodeURIComponent(String(scenario.parent))}`);
    if (r.ok) fiche = await r.json().catch(() => null);
  }
  const places = (t: any): number | null => {
    const v = Number(champ(t, CHAMPS.nbPlacesParking)?.value);
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const zone = (t: any): string | null => (t ? ((cleOption(OPTIONS.zoneDeplacement, indexMenu(t, CHAMPS.zoneDeplacement)) as string | null) ?? null) : null);
  // 📅 Date Visite Technique (horodatage ClickUp en millisecondes) → JJ/MM/AAAA, heure de Paris (02/11)
  const dateVisite = (t: any): string | null => {
    const v = Number(champ(t, CHAMPS.dateVisiteTechnique)?.value);
    return Number.isFinite(v) && v > 0 ? new Date(v).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) : null;
  };
  // 🏛️ Date dépôt permis (ms), assiette ADVENIR infra
  const datePermis = (t: any): number | null => {
    const v = Number(champ(t, CHAMPS.datePermis)?.value);
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const segment = cleOption(OPTIONS.segment, indexMenu(scenario, CHAMPS.segment)) as Segment | null;
  const typeClient = fiche ? ((cleOption(OPTIONS.typeClient, indexMenu(fiche, CHAMPS.typeClient)) as string | null) ?? null) : null;
  const source = String(elements.find((e) => e.nature === 'raccordement')?.valeurs.sourceRaccordement ?? '');
  const surInfra = segment === 'RIC' && source !== 'colonneEnedis';
  const [prix, infra] = await Promise.all([
    prixBibliotheque().catch(() => null),
    surInfra ? artereInfra(token, fiche).catch(() => null) : Promise.resolve(null),
  ]);
  const brief = genererBrief({
    scenarioNom: String(scenario?.name || ''),
    segment,
    nbPlaces: places(fiche) ?? places(scenario),
    zone: zone(scenario) ?? zone(fiche),
    elements,
    typeClient,
    ficheNom: fiche?.name ? String(fiche.name) : null,
    dateVisite: dateVisite(fiche) ?? dateVisite(scenario),
    datePermis: datePermis(fiche) ?? datePermis(scenario),
    infra,
    prix,
  });
  const id = String(scenario?.id || '');
  const anciens = (await commentairesBrief(token, id)).filter((c) => c.texte.startsWith(ENTETE_BRIEF));
  const res = await api(token, `/task/${encodeURIComponent(id)}/comment`, 'POST', { comment_text: brief.texte, notify_all: false });
  if (!res.ok) console.error(`Brief de chiffrage refusé (${res.status}) sur ${id}`, await res.text().catch(() => ''));
  let perimes = 0;
  if (res.ok) {
    const quand = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });
    for (const a of anciens) {
      const r = await api(token, `/comment/${encodeURIComponent(a.id)}`, 'PUT', {
        comment_text: `${PERIME} : remplacé par le brief du ${quand}, ne plus l'utiliser.\n\n${a.texte}`,
      });
      if (r.ok) perimes += 1;
      else console.error(`Ancien brief ${a.id} non marqué périmé (${r.status})`);
    }
  }
  return { ok: res.ok, alertes: brief.alertes.length, aFaire: brief.aFaire.length, texte: brief.texte, perimes };
}
