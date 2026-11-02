import { getQualificationListId, QUALIFICATION_PROD_ID } from '@/lib/listesClickUp';
import { alerter } from '@/lib/alerteSite';
import { chargerTypes, estDuType, estScenario } from '@/lib/typesTaches';

// Statuts des sous-tâches de Qualification (Phase 8, étape 7, PR #59).
// Mathieu, 02/11/2026, 20 h 54 : « quand on passe une fiche en devis à faire toutes les sous-tâches ne changent pas de
// statut » (fiche 1 : Scénario A en 📝 devis à faire, ses éléments restés en 📍 à visiter). Règles proposées le 02/11 à
// 20 h 58, intégrées à la PR #59 sur son choix (21 h 05) :
// - élément : prend toujours le statut de son scénario (il n'a pas de vie propre) ;
// - scénario : suit la fiche à partir de 📩 devis envoyé (devis envoyé, en négociation, perdu, archivé), ses éléments
//   avec lui ;
// - 📝 devis à faire reste scénario par scénario, par « Prêt à chiffrer » dans l'appli (relevé complet obligatoire) :
//   une fiche passée à la main en devis à faire avec un scénario encore « à visiter » reçoit une alerte, rien n'est forcé ;
// - 🏆 gagné de la fiche : règle actuelle inchangée (scénario retenu, puis départ au Planning, src/lib/scenarioRetenu.ts
//   et src/lib/passageGagne.ts) ;
// - scénarios archivés (non retenus, tarifs types) et leurs éléments : jamais touchés.
// Appelé par l'aiguillage à chaque changement de statut dans Qualification (src/lib/aiguillage.ts). Chaque statut posé
// renvoie un changement à la sonnette : rien n'est réécrit quand le statut est déjà le bon, donc pas de boucle.
// Preview : écritures sur la liste TEST seulement, simulation partout.

const SUIVIS = ['devis envoy', 'negociation', 'perdu', 'archiv'];
const PAR_LOT = 5;

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

async function lireTache(token: string, id: string): Promise<any | null> {
  const res = await api(token, `/task/${encodeURIComponent(id)}?include_subtasks=true`);
  return res.ok ? res.json() : null;
}

// Sous-tâches directes non archivées
const directes = (t: any): any[] => (Array.isArray(t?.subtasks) ? t.subtasks : [])
  .filter((s: any) => !s?.archived && (!s?.parent || String(s.parent) === String(t?.id)));
const aChanger = (taches: any[], statut: string) => taches.filter((t) => normal(t?.status?.status) !== normal(statut));
const noms = (taches: any[]) => taches.map((t) => String(t?.name || t?.id));

// Pose un statut, 5 tâches à la fois
async function poser(token: string, taches: any[], statut: string): Promise<{ faits: string[]; refus: string[] }> {
  const faits: string[] = [];
  const refus: string[] = [];
  for (let i = 0; i < taches.length; i += PAR_LOT) {
    const lot = taches.slice(i, i + PAR_LOT);
    const oks = await Promise.all(lot.map((t) => api(token, `/task/${encodeURIComponent(String(t.id))}`, 'PUT', { status: statut })
      .then((r) => r.ok).catch(() => false)));
    lot.forEach((t, k) => (oks[k] ? faits : refus).push(String(t?.name || t?.id)));
  }
  if (refus.length) console.error(`Statut « ${statut} » refusé sur : ${refus.join(', ')}`);
  return { faits, refus };
}

// Liste Qualification de cet environnement (TEST en preview) ; simulation aussi sur la vraie liste en preview
function garde(t: any, simulation: boolean): string | null {
  const liste = String(t?.list?.id ?? '');
  const qualif = String(getQualificationListId() || '');
  if (qualif && liste === qualif) return null;
  if (process.env.VERCEL_ENV !== 'production' && simulation && liste === QUALIFICATION_PROD_ID) return null;
  return 'ignore_hors_liste';
}

export async function suivreStatut(taskId: string, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { success: false, error: 'Configuration serveur incomplète' };
  const t = await lireTache(token, taskId);
  if (!t) return { success: false, error: 'Tâche introuvable' };
  const refus = garde(t, simulation);
  if (refus) return { success: true, action: refus, simulation };
  const { carte } = await chargerTypes(token);
  const statut = String(t?.status?.status || '');
  const s = normal(statut);
  const id = String(t.id);
  if (!statut) return { success: true, action: 'ignore_sans_statut', simulation };
  if (estDuType(t, 'element', carte)) return { success: true, action: 'ignore_element', simulation };

  // Scénario : ses éléments prennent son statut
  if (t.parent) {
    if (!estScenario(t, carte) || t.archived) return { success: true, action: 'ignore_sous_tache', simulation };
    const elements = aChanger(directes(t).filter((e) => estDuType(e, 'element', carte)), statut);
    if (!elements.length) return { success: true, action: 'elements_a_jour', statut, simulation };
    if (simulation) return { success: true, action: 'poserait', statut, elements: noms(elements), simulation };
    const r = await poser(token, elements, statut);
    if (r.refus.length) {
      await alerter(token, id, `⚠️ Statuts : ${r.refus.length} élément(s) de ce scénario n'ont pas pu passer en « ${statut} » : ${r.refus.join(', ')}. Change-les à la main.`);
    }
    return { success: !r.refus.length, action: 'elements', statut, faits: r.faits.length, refus: r.refus };
  }

  // Fiche
  if (s.includes('gagn')) return { success: true, action: 'ignore_gagne', simulation };
  const scenarios = directes(t).filter((x) => estScenario(x, carte));
  if (!scenarios.length) return { success: true, action: 'sans_scenario', simulation };

  if (s.includes('devis a faire')) {
    const pasPrets = scenarios.filter((x) => normal(x?.status?.status).includes('visiter'));
    if (!pasPrets.length) return { success: true, action: 'scenarios_prets', simulation };
    const plusieurs = pasPrets.length > 1;
    const texte = `⚠️ Fiche en 📝 devis à faire, mais ${noms(pasPrets).join(', ')} ${plusieurs ? 'ne sont pas passés' : "n'est pas passé"} par « Prêt à chiffrer » dans l'appli : relevé à terminer, pas de brief. ${plusieurs ? 'Termine-les' : 'Termine-le'} dans l'appli, ou ${plusieurs ? "archive-les s'ils ne servent" : "archive-le s'il ne sert"} plus.`;
    if (!simulation) await alerter(token, id, texte);
    return { success: true, action: 'alerte_pas_prets', pasPrets: noms(pasPrets), commentaire: texte, simulation };
  }
  if (!SUIVIS.some((m) => s.includes(m))) return { success: true, action: 'ignore_statut', statut, simulation };

  // Scénarios, puis leurs éléments (posés ici aussi, sans attendre le changement renvoyé par ClickUp)
  const aPoser = aChanger(scenarios, statut);
  const elements: any[] = [];
  for (const x of scenarios) {
    const lu = await lireTache(token, String(x.id));
    if (lu) elements.push(...aChanger(directes(lu).filter((e) => estDuType(e, 'element', carte)), statut));
  }
  if (!aPoser.length && !elements.length) return { success: true, action: 'a_jour', statut, simulation };
  if (simulation) return { success: true, action: 'poserait', statut, scenarios: noms(aPoser), elements: elements.length, simulation };
  const r1 = await poser(token, aPoser, statut);
  const r2 = await poser(token, elements, statut);
  const rates = [...r1.refus, ...r2.refus];
  if (rates.length) {
    await alerter(token, id, `⚠️ Statuts : ${rates.length} sous-tâche(s) de cette fiche n'ont pas pu passer en « ${statut} » : ${rates.join(', ')}. Change-les à la main.`);
  }
  return { success: !rates.length, action: 'suivi', statut, scenarios: r1.faits, elements: r2.faits.length, refus: rates };
}
