// Éléments d'un scénario côté serveur (étapes 3 et 4 du plan du 15/10/2026, PR #51).
// Un élément est une sous-tâche du scénario (sous-tâches imbriquées), de type Élément, avec sa 🧩 Nature.
// Les cheminements portent 🔌 Départ et 🏁 Arrivée (champs relation vers des éléments du même scénario).
// Règles (synthèse finale du 14/10, sections 3, 4, 5 et 9) :
// - éléments par défaut selon le segment (src/lib/elementsModele.ts) ;
// - noms : nature + numéro ; un cheminement s'appelle « Cheminement · départ → arrivée » et suit les renommages tant que
//   son nom commence par « Cheminement · » ;
// - archiver, jamais supprimer : un scénario emporte ses éléments, un élément emporte les cheminements qui le relient ;
//   Restaurer remet l'ensemble ;
// - garde-fou devis : avertissement si 🔗 Lien devis rempli, blocage dès 📩 devis envoyé (et en négociation, gagné) ;
// - dupliquer : matériel recopié, valeurs mesurées vidées (distances, percements, terre, section forcée, notes, photos).
// Étape 4 : relevé élément par élément (src/lib/releveElements.ts), avec les automatismes de la synthèse :
// - borne : coffret présélectionné selon la puissance (s'il est vide), -MOD si le coffret mesure en Modbus ;
// - coffret : Modbus → variante -MOD ; mesure de puissance → Liaison data Raccordement → Coffret créée d'office ;
//   mesure retirée → l'écran propose d'archiver cette liaison ;
// - communication : modem déporté ou câble requis → Liaison data Communication → TD IRVE / coffret créée d'office ;
// - « Prêt à chiffrer » : contrôle de complétude, puis scénario en 📝 devis à faire (et la fiche quand tous sont prêts).
// Les menus sont écrits avec l'identifiant de l'option, retrouvé dans les champs de la liste. Un champ absent de la liste
// (prod avant l'ajout des champs) est ignoré sans bloquer la création.
import { CHAMPS, OPTIONS, cleOption, indexMenu, type Nature, type Segment } from '@/lib/champsClickUp';
import { chargerTypes, champType, estDuType, estScenario, type CarteTypes } from '@/lib/typesTaches';
import { sousTachesArchivees } from '@/lib/scenarioRetenu';
import { estNomCheminementAuto, nomCheminement, prochainNom, specsParDefaut, type Materiel, type SpecElement } from '@/lib/elementsModele';
import { SAISIES, SAISIES_NATURE, coffretSuggere, contexteReleve, manquants, type Saisie, type Valeurs } from '@/lib/releveElements';

const LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const PREFIXES_GAGNE = ['✅ Retenu · ', 'Non retenu · ', 'Projet séparé · ', 'Tarif type · '];

// Recopiés à la duplication : matériel et constats du site. Jamais : distances, percements, terre, section forcée, notes.
const COPIES = [
  CHAMPS.sourceRaccordement, CHAMPS.typeRaccordement, CHAMPS.puissanceDispo, CHAMPS.etatTableau, CHAMPS.raccordementCible,
  CHAMPS.typeCheminement, CHAMPS.coffretIrve, CHAMPS.gestionCharge, CHAMPS.mesurePuissance, CHAMPS.emplacement,
  CHAMPS.puissanceVisee, CHAMPS.marqueBorne, CHAMPS.supportBorne, CHAMPS.connectivite, CHAMPS.reseau, CHAMPS.tailleHub,
  CHAMPS.quantite,
];
const COPIES_SCENARIO = [CHAMPS.segment, CHAMPS.zoneDeplacement, CHAMPS.nbPlacesParking];

export type ElementVue = {
  id: string;
  nom: string;
  nature: Nature | null;
  archive: boolean;
  depart: string | null;
  arrivee: string | null;
  typeCheminement: string | null;
  valeurs: Valeurs;
  photos: number;
};

export type Resultat = {
  ok: boolean;
  erreur?: string;
  crees: string[];
  erreurs: string[];
  id?: string;
  messages?: string[];
  propositions?: { id: string; nom: string; raison: string }[];
};

type DefChamp = { type: string; options: Map<number, string> };

export type Contexte = {
  token: string;
  scenario: any;
  listId: string;
  carte: CarteTypes;
  actifs: any[];
  archives: any[];
  defs: Map<string, DefChamp>;
};

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const champs = (t: any): any[] => (Array.isArray(t?.custom_fields) ? t.custom_fields : []);
const idChamp = (cle: string): string | undefined => (CHAMPS as Record<string, string>)[cle];
const menuOptions = (cle: string): Record<string, number> | undefined => (OPTIONS as unknown as Record<string, Record<string, number>>)[cle];

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

export async function lireTache(token: string, id: string, sousTaches = false): Promise<any | null> {
  const res = await api(token, `/task/${encodeURIComponent(id)}${sousTaches ? '?include_subtasks=true' : ''}`);
  return res.ok ? res.json() : null;
}

async function modifier(token: string, id: string, corps: any): Promise<boolean> {
  const res = await api(token, `/task/${encodeURIComponent(id)}`, 'PUT', corps);
  if (!res.ok) console.error(`Modification refusée (${res.status}) sur ${id}`, await res.text().catch(() => ''));
  return res.ok;
}

// Champs de la liste avec leurs options (index → identifiant), gardés 10 minutes
const cacheChamps = new Map<string, { lu: number; defs: Map<string, DefChamp> }>();
async function champsDeListe(token: string, listId: string): Promise<Map<string, DefChamp>> {
  const c = cacheChamps.get(listId);
  if (c && Date.now() - c.lu < 10 * 60 * 1000) return c.defs;
  const defs = new Map<string, DefChamp>();
  const res = await api(token, `/list/${listId}/field`);
  if (res.ok) {
    const j = await res.json().catch(() => ({}));
    for (const f of Array.isArray(j?.fields) ? j.fields : []) {
      const options = new Map<number, string>();
      for (const o of Array.isArray(f?.type_config?.options) ? f.type_config.options : []) options.set(Number(o.orderindex), String(o.id));
      defs.set(String(f.id), { type: String(f.type), options });
    }
    cacheChamps.set(listId, { lu: Date.now(), defs });
  } else {
    console.error(`Champs de la liste ${listId} illisibles (${res.status})`);
  }
  return defs;
}

// Valeur prête à écrire : identifiant de l'option pour un menu, nombre sinon. undefined = champ absent de la liste
function ecrite(defs: Map<string, DefChamp>, id: string, v: number): any {
  const d = defs.get(id);
  if (!d) return undefined;
  if (d.type === 'drop_down') return d.options.get(v);
  return v;
}

function relation(t: any, champId: string): string | null {
  const f = champs(t).find((c) => c?.id === champId);
  const v: any[] = Array.isArray(f?.value) ? f.value : [];
  const p = v.find((x) => x?.id);
  return p ? String(p.id) : null;
}

// Valeurs à recopier (index pour un menu, nombre sinon)
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

// Valeurs du relevé d'un élément, par clé de saisie (option pour un menu, nombre, texte), null si vide
function valeursActuelles(t: any): Valeurs {
  const v: Valeurs = {};
  for (const [cle, s] of Object.entries(SAISIES)) {
    const id = idChamp(cle);
    const f = id ? champs(t).find((c) => c?.id === id) : null;
    if (!id || !f || f.value === undefined || f.value === null || f.value === '') { v[cle] = null; continue; }
    if (s.type === 'menu') {
      const options = menuOptions(cle);
      v[cle] = options ? ((cleOption(options, indexMenu(t, id)) as string | null) ?? null) : null;
    } else if (s.type === 'nombre') {
      v[cle] = Number.isFinite(Number(f.value)) ? Number(f.value) : null;
    } else {
      v[cle] = String(f.value);
    }
  }
  return v;
}

export function vue(t: any): ElementVue {
  return {
    id: String(t.id),
    nom: String(t.name || ''),
    nature: cleOption(OPTIONS.nature, indexMenu(t, CHAMPS.nature)) as Nature | null,
    archive: !!t.archived,
    depart: relation(t, CHAMPS.depart),
    arrivee: relation(t, CHAMPS.arrivee),
    typeCheminement: (cleOption(OPTIONS.typeCheminement, indexMenu(t, CHAMPS.typeCheminement)) as string | null) ?? null,
    valeurs: valeursActuelles(t),
    photos: Array.isArray(t?.attachments) ? t.attachments.length : 0,
  };
}

export const segmentDe = (t: any): Segment | null => cleOption(OPTIONS.segment, indexMenu(t, CHAMPS.segment)) as Segment | null;

export function aUnLienDevis(t: any): boolean {
  const f = champs(t).find((c) => c?.id === CHAMPS.lienDevis);
  return !!String(f?.value ?? '').trim();
}

// Garde-fou devis (Q30) : blocage dès l'envoi, avertissement si un devis est déjà lié
export function gardeDevis(scenario: any): { bloque?: string; avertissement?: string } {
  const statut = normal(scenario?.status?.status);
  if (['envoy', 'negociation', 'gagn'].some((m) => statut.includes(m))) {
    return { bloque: 'Devis déjà envoyé : on ne retire plus rien de ce scénario.' };
  }
  if (aUnLienDevis(scenario)) {
    return { avertissement: 'Ce scénario a un devis Costructor : il ne sera pas annulé. Continuer ?' };
  }
  return {};
}

// Éléments actifs et archivés d'un scénario (lu avec include_subtasks)
export async function contexteScenario(token: string, scenario: any): Promise<Contexte> {
  const { carte } = await chargerTypes(token);
  const listId = String(scenario?.list?.id || '');
  const id = String(scenario?.id || '');
  const ids = (Array.isArray(scenario?.subtasks) ? scenario.subtasks : [])
    .filter((s: any) => !s?.parent || String(s.parent) === id)
    .map((s: any) => String(s.id));
  const lus = (await Promise.all(ids.map((x: string) => lireTache(token, x)))).filter(Boolean);
  const actifs = lus.filter((t: any) => estDuType(t, 'element', carte) && !t.archived);
  const brutes = listId && id ? await sousTachesArchivees(token, listId, id) : [];
  const archives = (await Promise.all(brutes.map((t: any) => lireTache(token, String(t.id)))))
    .filter((t: any) => t && estDuType(t, 'element', carte));
  const defs = await champsDeListe(token, listId);
  return { token, scenario, listId, carte, actifs, archives, defs };
}

const nomsDe = (ctx: Contexte) => [...ctx.actifs, ...ctx.archives].map((t) => String(t?.name || ''));

async function creer(ctx: Contexte, nom: string, nature: Nature, valeurs: Record<string, number>, description: string): Promise<string | null> {
  const custom_fields: { id: string; value: any }[] = [];
  for (const [id, v] of Object.entries({ [CHAMPS.nature]: OPTIONS.nature[nature], ...valeurs })) {
    const w = ecrite(ctx.defs, id, v);
    if (w !== undefined) custom_fields.push({ id, value: w });
  }
  const res = await api(ctx.token, `/list/${ctx.listId}/task`, 'POST', {
    name: nom,
    parent: String(ctx.scenario.id),
    description,
    ...(await champType(ctx.token, 'element')),
    custom_fields,
  });
  if (!res.ok) {
    console.error(`Création de l'élément « ${nom} » refusée (${res.status})`, await res.text().catch(() => ''));
    return null;
  }
  const j = await res.json().catch(() => ({}));
  return j?.id ? String(j.id) : null;
}

async function relier(ctx: Contexte, id: string, champId: string, cible: string): Promise<boolean> {
  if (!ctx.defs.has(champId)) return false;
  const res = await api(ctx.token, `/task/${id}/field/${champId}`, 'POST', { value: { add: [cible], rem: [] } });
  if (!res.ok) console.error(`Lien ${champId} refusé (${res.status}) sur ${id}`);
  return res.ok;
}

// Crée une liste d'éléments : d'abord les équipements, puis les cheminements reliés
async function creerSpecs(ctx: Contexte, specs: SpecElement[], description: string): Promise<Resultat> {
  const ids: Record<string, string> = {};
  const crees: string[] = [];
  const erreurs: string[] = [];
  for (const s of specs.filter((x) => x.nature !== 'cheminement')) {
    const id = await creer(ctx, s.nom, s.nature, s.valeurs, description);
    if (id) { ids[s.cle] = id; crees.push(s.nom); } else erreurs.push(s.nom);
  }
  for (const s of specs.filter((x) => x.nature === 'cheminement')) {
    const id = await creer(ctx, s.nom, s.nature, s.valeurs, description);
    if (!id) { erreurs.push(s.nom); continue; }
    ids[s.cle] = id;
    crees.push(s.nom);
    if (s.depart && ids[s.depart] && !(await relier(ctx, id, CHAMPS.depart, ids[s.depart]))) erreurs.push(`${s.nom} (départ)`);
    if (s.arrivee && ids[s.arrivee] && !(await relier(ctx, id, CHAMPS.arrivee, ids[s.arrivee]))) erreurs.push(`${s.nom} (arrivée)`);
  }
  return { ok: erreurs.length === 0, crees, erreurs };
}

// Éléments par défaut (le segment choisi est aussi écrit sur le scénario)
export async function creerParDefaut(ctx: Contexte, segment: Segment, materiel: Materiel, places: number): Promise<Resultat> {
  if (ctx.actifs.length) return { ok: false, erreur: 'Ce scénario a déjà des éléments', crees: [], erreurs: [] };
  const erreurs: string[] = [];
  const seg = ecrite(ctx.defs, CHAMPS.segment, OPTIONS.segment[segment]);
  if (seg !== undefined) {
    const r = await api(ctx.token, `/task/${ctx.scenario.id}/field/${CHAMPS.segment}`, 'POST', { value: seg });
    if (!r.ok) erreurs.push('segment du scénario');
  } else erreurs.push('segment du scénario (option absente)');
  if (segment === 'COP' && places > 0) {
    const nb = ecrite(ctx.defs, CHAMPS.nbPlacesParking, places);
    if (nb !== undefined) await api(ctx.token, `/task/${ctx.scenario.id}/field/${CHAMPS.nbPlacesParking}`, 'POST', { value: nb });
  }
  const r = await creerSpecs(ctx, specsParDefaut(segment, materiel, places), `Élément créé d'office par l'application (segment ${segment}).`);
  return { ...r, ok: r.ok && erreurs.length === 0, erreurs: [...erreurs, ...r.erreurs] };
}

// Ajout d'un élément ; un cheminement peut recevoir son départ et son arrivée (éléments actifs du même scénario)
export async function ajouterElement(
  ctx: Contexte, nature: Nature, depart?: string, arrivee?: string, typeCh?: keyof typeof OPTIONS.typeCheminement,
): Promise<Resultat> {
  const actifs = ctx.actifs.map(vue);
  const cop = segmentDe(ctx.scenario) === 'COP';
  const description = "Élément ajouté depuis l'application.";
  if (nature !== 'cheminement') {
    const nom = prochainNom(nature, nomsDe(ctx), cop);
    const valeurs: Record<string, number> = nature === 'priseRenforcee' ? { [CHAMPS.puissanceVisee]: OPTIONS.puissanceVisee['3.7'] } : {};
    const id = await creer(ctx, nom, nature, valeurs, description);
    return id ? { ok: true, crees: [nom], erreurs: [], id } : { ok: false, erreur: `${nom} n'a pas pu être créé`, crees: [], erreurs: [] };
  }
  const dep = depart ? actifs.find((e) => e.id === depart && e.nature !== 'cheminement') : undefined;
  const arr = arrivee ? actifs.find((e) => e.id === arrivee && e.nature !== 'cheminement') : undefined;
  if ((depart && !dep) || (arrivee && !arr)) return { ok: false, erreur: 'Départ ou arrivée hors de ce scénario', crees: [], erreurs: [] };
  if (dep && arr && dep.id === arr.id) return { ok: false, erreur: 'Le départ et l’arrivée doivent être différents', crees: [], erreurs: [] };
  const nom = nomCheminement(dep?.nom ?? null, arr?.nom ?? null, typeCh === 'artere');
  const valeurs: Record<string, number> = typeCh ? { [CHAMPS.typeCheminement]: OPTIONS.typeCheminement[typeCh] } : {};
  const id = await creer(ctx, nom, 'cheminement', valeurs, description);
  if (!id) return { ok: false, erreur: "Le cheminement n'a pas pu être créé", crees: [], erreurs: [] };
  const erreurs: string[] = [];
  if (dep && !(await relier(ctx, id, CHAMPS.depart, dep.id))) erreurs.push(`${nom} (départ)`);
  if (arr && !(await relier(ctx, id, CHAMPS.arrivee, arr.id))) erreurs.push(`${nom} (arrivée)`);
  return { ok: erreurs.length === 0, crees: [nom], erreurs, id };
}

// Renommage libre ; les cheminements reliés (nom automatique) suivent
export async function renommerElement(ctx: Contexte, id: string, nom: string): Promise<Resultat> {
  const el = ctx.actifs.find((t) => String(t.id) === id);
  if (!el) return { ok: false, erreur: 'Élément introuvable dans ce scénario', crees: [], erreurs: [] };
  if (!(await modifier(ctx.token, id, { name: nom }))) return { ok: false, erreur: "Le nom n'a pas pu être changé", crees: [], erreurs: [] };
  const erreurs: string[] = [];
  if (vue(el).nature !== 'cheminement') {
    const noms = new Map<string, string>(ctx.actifs.map((t) => [String(t.id), String(t.name || '')]));
    noms.set(id, nom);
    const lies = ctx.actifs.map(vue).filter((c) => c.nature === 'cheminement' && (c.depart === id || c.arrivee === id) && estNomCheminementAuto(c.nom));
    for (const c of lies) {
      const n = nomCheminement(c.depart ? noms.get(c.depart) ?? null : null, c.arrivee ? noms.get(c.arrivee) ?? null : null, c.typeCheminement === 'artere');
      if (n !== c.nom && !(await modifier(ctx.token, c.id, { name: n }))) erreurs.push(c.nom);
    }
  }
  return { ok: erreurs.length === 0, crees: [], erreurs };
}

// Archive l'élément et les cheminements qui le relient
export async function archiverElement(ctx: Contexte, id: string): Promise<Resultat> {
  const actifs = ctx.actifs.map(vue);
  const el = actifs.find((e) => e.id === id);
  if (!el) return { ok: false, erreur: 'Élément introuvable dans ce scénario', crees: [], erreurs: [] };
  const lies = el.nature === 'cheminement' ? [] : actifs.filter((c) => c.nature === 'cheminement' && (c.depart === id || c.arrivee === id));
  const faits: string[] = [];
  const erreurs: string[] = [];
  for (const e of [el, ...lies]) {
    if (await modifier(ctx.token, e.id, { archived: true })) faits.push(e.nom); else erreurs.push(e.nom);
  }
  return { ok: erreurs.length === 0, crees: faits, erreurs };
}

// Restaure l'élément et ses cheminements archivés dont l'autre bout est actif
export async function restaurerElement(ctx: Contexte, id: string): Promise<Resultat> {
  const archives = ctx.archives.map(vue);
  const el = archives.find((e) => e.id === id);
  if (!el) return { ok: false, erreur: 'Élément archivé introuvable dans ce scénario', crees: [], erreurs: [] };
  const actifs = new Set<string>(ctx.actifs.map((t) => String(t.id)));
  actifs.add(id);
  const lies = el.nature === 'cheminement' ? [] : archives.filter((c) =>
    c.nature === 'cheminement' && (c.depart === id || c.arrivee === id) && [c.depart, c.arrivee].every((x) => !x || actifs.has(x)));
  const faits: string[] = [];
  const erreurs: string[] = [];
  for (const e of [el, ...lies]) {
    if (await modifier(ctx.token, e.id, { archived: false })) faits.push(e.nom); else erreurs.push(e.nom);
  }
  return { ok: erreurs.length === 0, crees: faits, erreurs };
}

const descriptionCopie = (source: any) => `Copie de « ${String(source?.name || '')} » : matériel recopié, mesures à refaire.`;

// Duplication d'un équipement (coffret ou borne) avec ses cheminements
async function dupliquer(ctx: Contexte, sourceId: string, mode: 'branche' | 'borne'): Promise<Resultat> {
  const actifs = ctx.actifs.map(vue);
  const parId = new Map<string, any>(ctx.actifs.map((t) => [String(t.id), t]));
  const source = parId.get(sourceId);
  const sv = source ? vue(source) : null;
  if (!source || !sv?.nature) return { ok: false, erreur: 'Élément introuvable dans ce scénario', crees: [], erreurs: [] };
  if (mode === 'branche' && sv.nature !== 'tdIrveCoffret') return { ok: false, erreur: 'Choisis un coffret pour dupliquer une branche', crees: [], erreurs: [] };
  if (mode === 'borne' && sv.nature !== 'borne' && sv.nature !== 'priseRenforcee') return { ok: false, erreur: 'Choisis une borne ou une prise renforcée', crees: [], erreurs: [] };

  const cop = segmentDe(ctx.scenario) === 'COP';
  const noms = nomsDe(ctx);
  const nomsParId = new Map<string, string>(ctx.actifs.map((t) => [String(t.id), String(t.name || '')]));
  const crees: string[] = [];
  const erreurs: string[] = [];

  const copierEquipement = async (t: any, nature: Nature): Promise<string | null> => {
    const nom = prochainNom(nature, noms, cop);
    noms.push(nom);
    const id = await creer(ctx, nom, nature, valeursDe(t, COPIES), descriptionCopie(t));
    if (id) { crees.push(nom); nomsParId.set(id, nom); } else erreurs.push(nom);
    return id;
  };
  const copierCheminement = async (ch: ElementVue, dep: string | null, arr: string | null) => {
    const nom = nomCheminement(dep ? nomsParId.get(dep) ?? null : null, arr ? nomsParId.get(arr) ?? null : null, ch.typeCheminement === 'artere');
    const id = await creer(ctx, nom, 'cheminement', valeursDe(parId.get(ch.id), COPIES), descriptionCopie(parId.get(ch.id)));
    if (!id) { erreurs.push(nom); return; }
    crees.push(nom);
    if (dep && !(await relier(ctx, id, CHAMPS.depart, dep))) erreurs.push(`${nom} (départ)`);
    if (arr && !(await relier(ctx, id, CHAMPS.arrivee, arr))) erreurs.push(`${nom} (arrivée)`);
  };

  const nouveau = await copierEquipement(source, sv.nature);
  if (!nouveau) return { ok: false, erreur: `${sv.nom} n'a pas pu être dupliqué`, crees, erreurs };
  const chemins = actifs.filter((c) => c.nature === 'cheminement');
  // Cheminements d'arrivée : même départ, arrivée sur la copie
  for (const ch of chemins.filter((c) => c.arrivee === sourceId)) await copierCheminement(ch, ch.depart, nouveau);
  // Branche : chaque cheminement qui part du coffret est recopié, avec sa borne si elle est au bout
  if (mode === 'branche') {
    for (const ch of chemins.filter((c) => c.depart === sourceId)) {
      let arr = ch.arrivee;
      const cible = arr ? parId.get(arr) : null;
      const cv = cible ? vue(cible) : null;
      if (cible && cv?.nature && (cv.nature === 'borne' || cv.nature === 'priseRenforcee')) {
        const b = await copierEquipement(cible, cv.nature);
        if (!b) continue;
        arr = b;
      }
      await copierCheminement(ch, nouveau, arr);
    }
  }
  return { ok: erreurs.length === 0, crees, erreurs, id: nouveau };
}

export const dupliquerBranche = (ctx: Contexte, coffretId: string) => dupliquer(ctx, coffretId, 'branche');
export const dupliquerBorne = (ctx: Contexte, borneId: string) => dupliquer(ctx, borneId, 'borne');

// ---- Relevé d'un élément (étape 4) ----

// Saisie rendue dans le format stocké. undefined = valeur invalide
function normaliserSaisie(s: Saisie, brut: unknown): string | number | null | undefined {
  if (brut === null || brut === undefined || String(brut).trim() === '') return null;
  if (s.type === 'menu') {
    const cle = String(brut);
    return s.options?.some((o) => o.cle === cle) ? cle : undefined;
  }
  if (s.type === 'nombre') {
    const n = Number(String(brut).replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  }
  return String(brut).slice(0, 2000);
}

async function ecrireValeur(ctx: Contexte, taskId: string, cle: string, valeur: string | number | null): Promise<boolean> {
  const s = SAISIES[cle];
  const champId = idChamp(cle);
  if (!s || !champId || !ctx.defs.has(champId)) return false;
  if (valeur === null) return (await api(ctx.token, `/task/${taskId}/field/${champId}`, 'DELETE')).ok;
  let w: any;
  if (s.type === 'menu') {
    const index = menuOptions(cle)?.[String(valeur)];
    if (index === undefined) return false;
    w = ecrite(ctx.defs, champId, index);
  } else if (s.type === 'nombre') {
    w = Number(valeur);
  } else {
    w = String(valeur);
  }
  if (w === undefined) return false;
  const res = await api(ctx.token, `/task/${taskId}/field/${champId}`, 'POST', { value: w });
  if (!res.ok) console.error(`Champ ${cle} refusé (${res.status}) sur ${taskId}`);
  return res.ok;
}

// Enregistre le relevé d'un élément (seules les valeurs qui changent sont écrites), puis les automatismes
export async function enregistrerReleve(
  ctx: Contexte, id: string, saisies: Record<string, unknown>, liens?: { depart?: string | null; arrivee?: string | null },
): Promise<Resultat> {
  const t = ctx.actifs.find((x) => String(x.id) === id);
  if (!t) return { ok: false, erreur: 'Élément introuvable dans ce scénario', crees: [], erreurs: [] };
  const v = vue(t);
  if (!v.nature) return { ok: false, erreur: 'Cet élément n’a pas de nature', crees: [], erreurs: [] };
  const permis = new Set(SAISIES_NATURE[v.nature]);
  const entree: Record<string, unknown> = { ...(saisies || {}) };
  if (v.nature === 'priseRenforcee') entree.puissanceVisee = '3.7'; // prise renforcée : 3,7 kW verrouillé

  const nouvelles: Valeurs = { ...v.valeurs };
  const changees = new Set<string>();
  const faits: string[] = [];
  const erreurs: string[] = [];
  const messages: string[] = [];
  const propositions: { id: string; nom: string; raison: string }[] = [];

  for (const [cle, brut] of Object.entries(entree)) {
    if (!permis.has(cle)) continue;
    const s = SAISIES[cle];
    const val = normaliserSaisie(s, brut);
    if (val === undefined) { erreurs.push(s.libelle); continue; }
    if (val === (v.valeurs[cle] ?? null)) continue;
    if (await ecrireValeur(ctx, id, cle, val)) { nouvelles[cle] = val; changees.add(cle); faits.push(s.libelle); } else erreurs.push(s.libelle);
  }

  const tous = ctx.actifs.map(vue);
  const segment = segmentDe(ctx.scenario);

  // Cheminement : départ et arrivée (équipements du même scénario), nom recalculé s'il est automatique
  if (v.nature === 'cheminement') {
    const equipements = tous.filter((e) => e.nature !== 'cheminement' && e.id !== id);
    let depart = v.depart;
    let arrivee = v.arrivee;
    for (const [cle, champ] of [['depart', CHAMPS.depart], ['arrivee', CHAMPS.arrivee]] as const) {
      if (!liens || !(cle in liens)) continue;
      const cible = liens[cle] || null;
      const ancien = cle === 'depart' ? v.depart : v.arrivee;
      if (cible === ancien) continue;
      if (cible && !equipements.some((e) => e.id === cible)) { erreurs.push(cle === 'depart' ? 'départ' : 'arrivée'); continue; }
      const res = await api(ctx.token, `/task/${id}/field/${champ}`, 'POST', { value: { add: cible ? [cible] : [], rem: ancien ? [ancien] : [] } });
      if (res.ok) {
        if (cle === 'depart') depart = cible; else arrivee = cible;
        changees.add(cle);
        faits.push(cle === 'depart' ? 'départ' : 'arrivée');
      } else erreurs.push(cle === 'depart' ? 'départ' : 'arrivée');
    }
    if ((changees.has('depart') || changees.has('arrivee') || changees.has('typeCheminement')) && estNomCheminementAuto(v.nom)) {
      const nomDe = (x: string | null) => (x ? tous.find((e) => e.id === x)?.nom ?? null : null);
      const n = nomCheminement(nomDe(depart), nomDe(arrivee), nouvelles.typeCheminement === 'artere');
      if (n !== v.nom && (await modifier(ctx.token, id, { name: n }))) messages.push(`Renommé en « ${n} »`);
    }
  }

  // Borne ou prise : coffret présélectionné selon la puissance, s'il est encore vide (hors COP)
  if ((v.nature === 'borne' || v.nature === 'priseRenforcee') && nouvelles.puissanceVisee && segment !== 'COP') {
    for (const ch of tous.filter((c) => c.nature === 'cheminement' && c.arrivee === id)) {
      const coffret = tous.find((e) => e.id === ch.depart && e.nature === 'tdIrveCoffret');
      if (!coffret || coffret.valeurs.coffretIrve) continue;
      const ref = coffretSuggere(nouvelles.puissanceVisee, coffret.valeurs.mesurePuissance);
      if (ref && (await ecrireValeur(ctx, coffret.id, 'coffretIrve', ref))) messages.push(`${coffret.nom} : ${ref} présélectionné`);
    }
  }

  // Coffret ou TD IRVE : variante -MOD en Modbus, liaison data de la mesure de puissance
  if (v.nature === 'tdIrveCoffret') {
    const mesure = nouvelles.gestionCharge && nouvelles.gestionCharge !== 'aucune' ? nouvelles.mesurePuissance : null;
    const ref = typeof nouvelles.coffretIrve === 'string' ? nouvelles.coffretIrve : '';
    if (mesure === 'compteurModbus' && ref && !ref.endsWith('-MOD') && ref !== 'COFF-MONO-3K' && !changees.has('coffretIrve')) {
      if (await ecrireValeur(ctx, id, 'coffretIrve', `${ref}-MOD`)) messages.push(`Coffret passé en ${ref}-MOD (compteur Modbus)`);
    }
    const raccordement = tous.find((e) => e.nature === 'raccordement');
    const liaison = tous.find((c) => c.nature === 'cheminement' && c.typeCheminement === 'liaisonData' && c.arrivee === id
      && (!raccordement || c.depart === raccordement.id));
    if (mesure && !liaison && raccordement) {
      const r = await ajouterElement(ctx, 'cheminement', raccordement.id, id, 'liaisonData');
      if (r.crees.length) messages.push(`Liaison data créée d'office : ${r.crees.join(', ')}`);
      erreurs.push(...r.erreurs);
    }
    if (!mesure && liaison) propositions.push({ id: liaison.id, nom: liaison.nom, raison: 'la mesure de puissance est retirée' });
  }

  // Communication : modem déporté ou câble requis → liaison data vers le TD IRVE ou le coffret
  if (v.nature === 'communication' && (nouvelles.connectivite === 'modemDeporte' || nouvelles.reseau === 'cableRequis')) {
    const td = tous.find((e) => e.nature === 'tdIrveCoffret');
    const existe = tous.some((c) => c.nature === 'cheminement' && c.typeCheminement === 'liaisonData' && c.depart === id);
    if (td && !existe) {
      const r = await ajouterElement(ctx, 'cheminement', id, td.id, 'liaisonData');
      if (r.crees.length) messages.push(`Liaison data créée d'office : ${r.crees.join(', ')}`);
      erreurs.push(...r.erreurs);
    }
  }

  return { ok: erreurs.length === 0, crees: faits, erreurs, messages, propositions };
}

async function statutNomme(token: string, listeId: string, mot: string): Promise<string | null> {
  const res = await api(token, `/list/${listeId}`);
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  const s = (Array.isArray(json?.statuses) ? json.statuses : []).find((x: any) => normal(x.status).includes(mot));
  return s ? String(s.status) : null;
}

// « Prêt à chiffrer » : contrôle de complétude, scénario en 📝 devis à faire, fiche aussi quand tous ses scénarios sont prêts.
// Le brief de chiffrage (étape 5) sera posté ici.
export async function pretAChiffrer(ctx: Contexte): Promise<Resultat & { manquants?: { nom: string; quoi: string[] }[] }> {
  const elements = ctx.actifs.map(vue);
  if (!elements.length) return { ok: false, erreur: "Crée d'abord les éléments du scénario", crees: [], erreurs: [] };
  const cr = contexteReleve(segmentDe(ctx.scenario), elements);
  const manque = elements.map((e) => ({ nom: e.nom, quoi: manquants(e, cr) })).filter((x) => x.quoi.length);
  if (manque.length) {
    return {
      ok: false,
      erreur: `Il manque encore : ${manque.map((x) => `${x.nom} (${x.quoi.join(', ')})`).join(' ; ')}`,
      crees: [], erreurs: [], manquants: manque,
    };
  }
  const messages: string[] = [];
  const erreurs: string[] = [];
  const aFaire = await statutNomme(ctx.token, ctx.listId, 'devis a faire');
  const statutScenario = normal(ctx.scenario?.status?.status);
  if (!aFaire) erreurs.push('statut « devis à faire » introuvable');
  else if (statutScenario.includes('visiter')) {
    if (await modifier(ctx.token, String(ctx.scenario.id), { status: aFaire })) messages.push(`Scénario passé en ${aFaire}`);
    else erreurs.push('statut du scénario');
  } else messages.push(`Scénario déjà en ${String(ctx.scenario?.status?.status || '')}`);

  // La fiche avance quand tous ses scénarios ont quitté « à visiter »
  const projetId = String(ctx.scenario?.parent || '');
  const projet = projetId ? await lireTache(ctx.token, projetId, true) : null;
  if (projet && aFaire) {
    const freres = (Array.isArray(projet.subtasks) ? projet.subtasks : []).filter((s: any) => !s?.parent || String(s.parent) === projetId);
    const tousPrets = freres.every((s: any) => String(s.id) === String(ctx.scenario.id) || !normal(s?.status?.status).includes('visiter'));
    if (tousPrets && normal(projet?.status?.status).includes('visiter')) {
      if (await modifier(ctx.token, projetId, { status: aFaire })) messages.push(`Fiche passée en ${aFaire}`);
      else erreurs.push('statut de la fiche');
    }
  }
  messages.push('Le brief de chiffrage sera posté automatiquement à partir de l’étape 5.');
  return { ok: erreurs.length === 0, crees: [], erreurs, messages };
}

// ---- Scénarios ----

// Lettre suivant la plus haute déjà utilisée (même règle que src/app/api/scenarios/route.ts)
export function lettreSuivante(sousTaches: any[]): string {
  let plusHaut = -1;
  for (const s of sousTaches) {
    const nom = String(s?.name || '');
    const sans = PREFIXES_GAGNE.reduce((n, p) => (n.startsWith(p) ? n.slice(p.length) : n), nom);
    const m = sans.match(/^\s*Sc[ée]nario\s+([A-Za-z]|\d+)\b/i);
    if (!m) continue;
    const rang = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) - 1 : LETTRES.indexOf(m[1].toUpperCase());
    if (rang > plusHaut) plusHaut = rang;
  }
  const rang = Math.max(plusHaut + 1, sousTaches.length);
  return rang < LETTRES.length ? LETTRES[rang] : String(rang + 1);
}

// « ✅ Retenu · Scénario B : » → préfixe gardé au renommage, seul le libellé change
const PREFIXE_SCENARIO = /^((?:✅ Retenu · |Non retenu · |Projet séparé · |Tarif type · )?\s*Sc[ée]nario\s+[A-Za-z0-9]+\s*:\s*)/;
export const libelleScenario = (nom: string) => nom.replace(PREFIXE_SCENARIO, '').trim();

export async function renommerScenario(token: string, scenario: any, libelle: string): Promise<Resultat> {
  const nom = String(scenario?.name || '');
  const m = nom.match(PREFIXE_SCENARIO);
  const nouveau = `${m ? m[1] : ''}${libelle}`;
  return (await modifier(token, String(scenario.id), { name: nouveau }))
    ? { ok: true, crees: [nouveau], erreurs: [] }
    : { ok: false, erreur: "Le nom n'a pas pu être changé", crees: [], erreurs: [] };
}

// Archive les éléments puis le scénario (le garde-fou devis est vérifié par la route)
export async function archiverScenario(token: string, scenario: any): Promise<Resultat> {
  const ctx = await contexteScenario(token, scenario);
  const faits: string[] = [];
  const erreurs: string[] = [];
  for (const t of ctx.actifs) {
    if (await modifier(token, String(t.id), { archived: true })) faits.push(String(t.name || '')); else erreurs.push(String(t.name || ''));
  }
  if (await modifier(token, String(scenario.id), { archived: true })) faits.push(String(scenario.name || ''));
  else return { ok: false, erreur: "Le scénario n'a pas pu être archivé", crees: faits, erreurs };
  return { ok: erreurs.length === 0, crees: faits, erreurs };
}

// Restaure le scénario puis ses éléments archivés
export async function restaurerScenario(token: string, scenario: any): Promise<Resultat> {
  if (!(await modifier(token, String(scenario.id), { archived: false }))) {
    return { ok: false, erreur: "Le scénario n'a pas pu être restauré", crees: [], erreurs: [] };
  }
  const ctx = await contexteScenario(token, scenario);
  const faits: string[] = [String(scenario.name || '')];
  const erreurs: string[] = [];
  for (const t of ctx.archives) {
    if (await modifier(token, String(t.id), { archived: false })) faits.push(String(t.name || '')); else erreurs.push(String(t.name || ''));
  }
  return { ok: erreurs.length === 0, crees: faits, erreurs };
}

// Scénarios archivés depuis l'application (les non retenus, projets séparés et tarifs types du gagné sont exclus)
export async function scenariosArchives(token: string, projet: any): Promise<{ id: string; nom: string }[]> {
  const { carte } = await chargerTypes(token);
  const brutes = await sousTachesArchivees(token, String(projet?.list?.id || ''), String(projet?.id || ''));
  return brutes
    .filter((t: any) => estScenario(t, carte) && !PREFIXES_GAGNE.some((p) => String(t?.name || '').startsWith(p)))
    .map((t: any) => ({ id: String(t.id), nom: String(t.name || '') }));
}

// « Dupliquer le scénario » : lettre suivante, éléments recopiés et reliés, matériel recopié, mesures vidées
export async function dupliquerScenario(token: string, scenario: any, projet: any): Promise<Resultat> {
  const ctx = await contexteScenario(token, scenario);
  const freres = (Array.isArray(projet?.subtasks) ? projet.subtasks : []).filter((s: any) => !s?.parent || String(s.parent) === String(projet.id));
  const archivesProjet = await sousTachesArchivees(token, ctx.listId, String(projet.id));
  const lettre = lettreSuivante([...freres, ...archivesProjet]);
  const nom = `Scénario ${lettre} : ${libelleScenario(String(scenario?.name || '')) || 'copie'} (copie)`;

  const custom_fields: { id: string; value: any }[] = [];
  for (const [id, v] of Object.entries(valeursDe(scenario, [...COPIES_SCENARIO, ...COPIES]))) {
    const w = ecrite(ctx.defs, id, v);
    if (w !== undefined) custom_fields.push({ id, value: w });
  }
  const res = await api(token, `/list/${ctx.listId}/task`, 'POST', {
    name: nom,
    parent: String(projet.id),
    description: `${descriptionCopie(scenario)} Créé avec « Dupliquer le scénario ».`,
    ...(await champType(token, 'scenario')),
    custom_fields,
  });
  if (!res.ok) {
    console.error(`Duplication du scénario refusée (${res.status})`, await res.text().catch(() => ''));
    return { ok: false, erreur: "Le scénario n'a pas pu être dupliqué", crees: [], erreurs: [] };
  }
  const j = await res.json().catch(() => ({}));
  const nouveauId = String(j?.id || '');
  const cible: Contexte = { ...ctx, scenario: { id: nouveauId, list: { id: ctx.listId } }, actifs: [], archives: [] };

  const correspondance = new Map<string, string>();
  const crees: string[] = [nom];
  const erreurs: string[] = [];
  const vues = ctx.actifs.map((t) => ({ t, v: vue(t) }));
  for (const { t, v } of vues.filter((x) => x.v.nature && x.v.nature !== 'cheminement')) {
    const id = await creer(cible, v.nom, v.nature as Nature, valeursDe(t, COPIES), descriptionCopie(t));
    if (id) { correspondance.set(v.id, id); crees.push(v.nom); } else erreurs.push(v.nom);
  }
  for (const { t, v } of vues.filter((x) => x.v.nature === 'cheminement')) {
    const id = await creer(cible, v.nom, 'cheminement', valeursDe(t, COPIES), descriptionCopie(t));
    if (!id) { erreurs.push(v.nom); continue; }
    crees.push(v.nom);
    const dep = v.depart ? correspondance.get(v.depart) : undefined;
    const arr = v.arrivee ? correspondance.get(v.arrivee) : undefined;
    if (dep && !(await relier(cible, id, CHAMPS.depart, dep))) erreurs.push(`${v.nom} (départ)`);
    if (arr && !(await relier(cible, id, CHAMPS.arrivee, arr))) erreurs.push(`${v.nom} (arrivée)`);
  }
  return { ok: erreurs.length === 0, crees, erreurs, id: nouveauId };
}
