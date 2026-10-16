// Conversion d'un ancien relevé vers le modèle Projet → Scénarios → Éléments (plan de conversion du 16/10/2026, Phase 6).
// Correspondance validée par Matthieu le 16/10/2026 (18 h 13, « Oui, code la conversion ») :
// - fiche sans scénario : « Scénario A : <segment> » créé sous la fiche (segment, zone, places et statut de la fiche) ;
//   scénario existant : converti sur place (segment, zone, places repris de la fiche s'ils manquent) ;
// - éléments par défaut du segment (src/lib/elementsModele.ts), remplis avec les anciennes valeurs :
//   Raccordement ← source, mono/tri, puissance dispo, état du tableau, raccordement cible, terre ;
//   Coffret (hors COP) ← coffret IRVE ; Besoin délesteur coché → gestion de charge « délesteur » ;
//   Borne ← puissance visée, marque, support ; Communication ← réseau, taille HUB ;
//   hors COP : toutes les distances et percements sur « Coffret → Borne », « Raccordement → Coffret » reste à mesurer ;
//   COP : Dist. TGBT → TD IRVE = tube apparent du cheminement Raccordement → TD IRVE ; longueur d'artère = chemin de câbles
//   de l'artère, avec les anciennes distances et percements ; Dist. routeur → TD IRVE = tube apparent de la liaison data ;
// - les notes, les photos et les anciens champs restent sur l'ancienne tâche (rien n'est effacé).
// 16/10, 18 h 49 (décision de Matthieu) : coffret vide sur l'ancien relevé → présélectionné selon la puissance de la borne,
// même règle que le relevé (coffretSuggere, src/lib/releveElements.ts), signalé dans les alertes, modifiable au relevé.
// 16/10, 19 h 00 (décision de Matthieu) : alerte si la borne est à 11 ou 22 kW sur un raccordement mono (aucune valeur changée).
// simulation : rien n'est écrit, la réponse montre ce qui serait créé. Une tâche qui a déjà des éléments est refusée.
import { CHAMPS, OPTIONS, cleOption, indexMenu, type Segment } from '@/lib/champsClickUp';
import { champType, chargerTypes, estScenario } from '@/lib/typesTaches';
import { contexteScenario, lettreSuivante, lireTache, segmentDe, type Contexte } from '@/lib/elements';
import { nomRaccordement, specsParDefaut, type CleSource, type SpecElement } from '@/lib/elementsModele';
import { coffretSuggere } from '@/lib/releveElements';

export type Ligne = { champ: string; valeur: string };
export type ElementPrevu = { nom: string; nature: string; depart?: string; arrivee?: string; valeurs: Ligne[] };
export type Plan = {
  source: { id: string; nom: string; genre: 'fiche' | 'scenario' };
  scenario: { id: string | null; nom: string; cree: boolean; segment: Segment; zone: string | null; places: number; statut: string | null };
  elements: ElementPrevu[];
  nonRepris: Ligne[];
  alertes: string[];
};
export type Preparation =
  | { ok: false; erreur: string; details?: string[] }
  | {
    ok: true;
    plan: Plan;
    specs: SpecElement[];
    ctx: Contexte;
    fiche: any;
    source: any;
    ecrireScenario: Record<string, number>; // champs à écrire sur le scénario (index pour un menu)
  };
export type Execution = { ok: boolean; scenarioId: string | null; crees: string[]; erreurs: string[] };

const champs = (t: any): any[] => (Array.isArray(t?.custom_fields) ? t.custom_fields : []);
const CLE_DE = new Map<string, string>(Object.entries(CHAMPS).map(([k, v]) => [v as string, k]));
const MENUS = OPTIONS as unknown as Record<string, Record<string, number>>;

const LIBELLES: Record<string, string> = {
  nature: 'Nature', segment: 'Segment', zoneDeplacement: 'Zone', nbPlacesParking: 'Places', sourceRaccordement: 'Source',
  typeRaccordement: 'Mono / tri', puissanceDispo: 'Puissance dispo (kVA)', etatTableau: 'État du tableau',
  raccordementCible: 'Raccordement cible', terre: 'Terre (ohms)', coffretIrve: 'Coffret', gestionCharge: 'Gestion de charge',
  puissanceVisee: 'Puissance visée (kW)', marqueBorne: 'Marque', supportBorne: 'Support', reseau: 'Réseau',
  tailleHub: 'Taille HUB', connectivite: 'Connectivité', typeCheminement: 'Type de cheminement',
  distTubeApparent: 'Tube apparent (m)', distGoulotte: 'Goulotte (m)', distEncastre: 'Encastré (m)',
  distVideSanitaire: 'Vide sanitaire (m)', distCheminCables: 'Chemin de câbles (m)', distTirageExistant: 'Tirage existant (m)',
  distTranchee: 'Tranchée (m)', percementsPlaco: 'Percements placo / bois', percementsBrique: 'Percements brique / parpaing',
  percementsBeton: 'Percements béton / pierre', percementsDalle: 'Percements dalle / sol', longueurArtere: 'Longueur artère (m)',
  distTgbtTdIrve: 'Dist. TGBT → TD IRVE (m)', distRouteurTdIrve: 'Dist. routeur → TD IRVE (m)', besoinDelesteur: 'Besoin délesteur',
  nbPointsDeCharge: 'Nb points de charge', materielsAChiffrer: 'Matériels à chiffrer', notesCheminement: 'Notes',
};
const libelle = (id: string) => LIBELLES[CLE_DE.get(id) || ''] || id;

const RACCORDEMENT = [CHAMPS.sourceRaccordement, CHAMPS.typeRaccordement, CHAMPS.puissanceDispo, CHAMPS.etatTableau, CHAMPS.raccordementCible, CHAMPS.terre];
const BORNE = [CHAMPS.puissanceVisee, CHAMPS.marqueBorne, CHAMPS.supportBorne];
const COMMUNICATION = [CHAMPS.reseau, CHAMPS.tailleHub];
const DISTANCES = [CHAMPS.distTubeApparent, CHAMPS.distGoulotte, CHAMPS.distEncastre, CHAMPS.distVideSanitaire, CHAMPS.distCheminCables, CHAMPS.distTirageExistant, CHAMPS.distTranchee];
const PERCEMENTS = [CHAMPS.percementsPlaco, CHAMPS.percementsBrique, CHAMPS.percementsBeton, CHAMPS.percementsDalle];
const ANCIENS = [...RACCORDEMENT, CHAMPS.coffretIrve, CHAMPS.besoinDelesteur, ...BORNE, ...COMMUNICATION, ...DISTANCES, ...PERCEMENTS,
  CHAMPS.longueurArtere, CHAMPS.distTgbtTdIrve, CHAMPS.distRouteurTdIrve, CHAMPS.nbPointsDeCharge];

type Lu = { v: number; type: string };

// Ancienne valeur : index pour un menu, 1 pour une case cochée, nombre > 0 sinon. null si vide
function lire(t: any, id: string): Lu | null {
  const f = champs(t).find((c) => c?.id === id);
  if (!f || f.value === undefined || f.value === null || f.value === '') return null;
  const type = String(f.type || '');
  if (type === 'drop_down') {
    const i = indexMenu(t, id);
    return i === null ? null : { v: i, type };
  }
  if (type === 'checkbox') return f.value === true || f.value === 'true' ? { v: 1, type } : null;
  const n = Number(f.value);
  return Number.isFinite(n) && n > 0 ? { v: n, type } : null;
}

// Valeur affichée d'un champ de la tâche (nom de l'option, étiquettes, texte court)
function texte(t: any, id: string): string | null {
  const f = champs(t).find((c) => c?.id === id);
  if (!f || f.value === undefined || f.value === null || f.value === '' || (Array.isArray(f.value) && !f.value.length)) return null;
  const opts: any[] = Array.isArray(f.type_config?.options) ? f.type_config.options : [];
  const nomOpt = (x: any) => {
    const o = opts.find((p) => p?.id === x || Number(p?.orderindex) === Number(x));
    return o ? String(o.name ?? o.label ?? x) : String(x);
  };
  if (Array.isArray(f.value)) return f.value.map((x: any) => nomOpt(x?.id ?? x)).join(', ');
  if (f.type === 'drop_down' || f.type === 'labels') return nomOpt(f.value);
  if (f.type === 'checkbox') return f.value === true || f.value === 'true' ? 'oui' : null;
  const s = String(f.value).trim();
  if (!s) return null;
  return s.length > 200 ? `${s.slice(0, 200)}…` : s;
}

// Valeur lisible d'une valeur de spec (clé d'option pour un menu). La terre est un nombre (ohms)
function lisible(id: string, v: number): string {
  const cle = CLE_DE.get(id) || '';
  const menu = MENUS[cle];
  if (menu) return String(cleOption(menu, v) ?? `option ${v}`);
  if (cle === 'besoinDelesteur') return v ? 'oui' : 'non';
  return String(v);
}

// Valeur prête à écrire : identifiant de l'option pour un menu, true pour une case, nombre sinon
function ecrite(defs: Contexte['defs'], id: string, v: number): any {
  const d = defs.get(id);
  if (!d) return undefined;
  if (d.type === 'drop_down') return d.options.get(v);
  if (d.type === 'checkbox') return v ? true : undefined;
  return v;
}

const directes = (t: any): any[] =>
  (Array.isArray(t?.subtasks) ? t.subtasks : []).filter((s: any) => !s?.parent || String(s.parent) === String(t.id));

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

// Prépare la conversion d'une fiche ou d'un scénario (lu avec ses sous-tâches). Rien n'est écrit.
export async function preparer(token: string, tache: any, segmentForce: Segment | null): Promise<Preparation> {
  const { carte } = await chargerTypes(token);
  const genre: 'fiche' | 'scenario' = tache?.parent ? 'scenario' : 'fiche';
  let fiche: any = tache;
  if (genre === 'scenario') {
    if (!estScenario(tache, carte)) return { ok: false, erreur: "Cette tâche n'est ni une fiche ni un scénario" };
    fiche = await lireTache(token, String(tache.parent));
    if (!fiche) return { ok: false, erreur: 'Fiche du scénario illisible' };
  } else {
    const sous = directes(tache);
    const scenarios = sous.filter((s: any) => estScenario(s, carte) || /^\s*Sc[ée]nario\s/i.test(String(s?.name || '')));
    if (scenarios.length) {
      return {
        ok: false,
        erreur: `Cette fiche a déjà ${scenarios.length} scénario${scenarios.length > 1 ? 's' : ''} : convertis-les un par un`,
        details: scenarios.map((s: any) => `${String(s.name || '')} (${String(s.id)})`),
      };
    }
    if (sous.length) {
      return {
        ok: false,
        erreur: 'Cette fiche a des sous-tâches qui ne sont pas des scénarios (emplacements ?) : conversion à faire à part',
        details: sous.map((s: any) => `${String(s.name || '')} (${String(s.id)})`),
      };
    }
  }

  const ctx = await contexteScenario(token, tache);
  if (genre === 'scenario' && ctx.actifs.length) {
    return { ok: false, erreur: `Ce scénario a déjà ${ctx.actifs.length} élément${ctx.actifs.length > 1 ? 's' : ''} : déjà converti` };
  }

  const segment = segmentForce ?? segmentDe(tache) ?? (genre === 'scenario' ? segmentDe(fiche) : null);
  if (!segment) {
    return { ok: false, erreur: "Segment vide : remplis-le dans ClickUp, ou ajoute &segment=RES (DAP, COP, PAR, FLT, TER, RIC) à l'adresse" };
  }
  const zone = lire(tache, CHAMPS.zoneDeplacement) ?? lire(fiche, CHAMPS.zoneDeplacement);
  const placesLu = lire(tache, CHAMPS.nbPlacesParking) ?? lire(fiche, CHAMPS.nbPlacesParking);
  const places = placesLu ? Math.round(placesLu.v) : 0;
  const cop = segment === 'COP';

  const specs = specsParDefaut(segment, 'borne', places);
  const parCle = new Map<string, SpecElement>(specs.map((s) => [s.cle, s]));
  const utilises = new Set<string>();
  const alertes: string[] = [];

  const prendre = (cle: string, ids: string[]) => {
    const s = parCle.get(cle);
    if (!s) return;
    for (const id of ids) {
      const lu = lire(tache, id);
      if (!lu) continue;
      s.valeurs[id] = lu.v;
      utilises.add(id);
    }
  };
  // Ancien champ vers un autre champ de l'élément (ex. longueur d'artère → chemin de câbles)
  const reporter = (cle: string, ancien: string, cible: string) => {
    const s = parCle.get(cle);
    const lu = lire(tache, ancien);
    if (!s || !lu) return;
    if (s.valeurs[cible] !== undefined) {
      alertes.push(`${libelle(ancien)} = ${lu.v} non reporté sur « ${s.nom} » : ${libelle(cible)} déjà rempli (${s.valeurs[cible]}). À trancher à la main.`);
      return;
    }
    s.valeurs[cible] = lu.v;
    utilises.add(ancien);
  };

  prendre('R', RACCORDEMENT);
  prendre('COM', COMMUNICATION);
  if (cop) {
    reporter('CH1', CHAMPS.distTgbtTdIrve, CHAMPS.distTubeApparent);
    prendre('CH2', [...DISTANCES, ...PERCEMENTS]);
    reporter('CH2', CHAMPS.longueurArtere, CHAMPS.distCheminCables);
    reporter('CH3', CHAMPS.distRouteurTdIrve, CHAMPS.distTubeApparent);
    if (!places) alertes.push('Nb places vide : aucune boîte de dérivation créée (à ajouter au relevé).');
  } else {
    prendre('C1', [CHAMPS.coffretIrve]);
    if (lire(tache, CHAMPS.besoinDelesteur)) {
      const c1 = parCle.get('C1');
      if (c1) { c1.valeurs[CHAMPS.gestionCharge] = OPTIONS.gestionCharge.delesteur; utilises.add(CHAMPS.besoinDelesteur); }
    }
    prendre('B1', BORNE);
    // Coffret vide : présélectionné selon la puissance de la borne (règle du relevé, décision du 16/10, 18 h 49)
    const coffret = parCle.get('C1');
    const puissance = parCle.get('B1')?.valeurs[CHAMPS.puissanceVisee];
    if (coffret && coffret.valeurs[CHAMPS.coffretIrve] === undefined && puissance !== undefined) {
      const ref = coffretSuggere(cleOption(OPTIONS.puissanceVisee, puissance), null);
      if (ref && ref in OPTIONS.coffretIrve) {
        coffret.valeurs[CHAMPS.coffretIrve] = OPTIONS.coffretIrve[ref as keyof typeof OPTIONS.coffretIrve];
        alertes.push(`Coffret 1 présélectionné en ${ref} (borne ${lisible(CHAMPS.puissanceVisee, puissance)} kW) : à confirmer au relevé.`);
      }
    }
    // Cohérence mono / tri (décision du 16/10, 19 h 00) : borne 11 ou 22 kW sur un raccordement mono, rien n'est changé
    const mono = parCle.get('R')?.valeurs[CHAMPS.typeRaccordement] === OPTIONS.typeRaccordement.mono;
    const kw = puissance !== undefined ? cleOption(OPTIONS.puissanceVisee, puissance) : null;
    if (mono && (kw === '11' || kw === '22')) {
      alertes.push(`Borne ${kw} kW sur un raccordement mono : vérifier le mono / tri (ou la puissance visée).`);
    }
    const forfait = parCle.get('CH2')?.valeurs[CHAMPS.distTubeApparent];
    prendre('CH2', [...DISTANCES, ...PERCEMENTS]);
    if (segment === 'RIC' && utilises.has(CHAMPS.distTubeApparent)) {
      alertes.push(`RIC : le forfait de ${forfait ?? 5} m de tube apparent de « Coffret 1 → Borne 1 » est remplacé par la valeur relevée. Le forfait ne demande que le dépassement : à vérifier.`);
    }
    const pdc = lire(tache, CHAMPS.nbPointsDeCharge);
    if (pdc && pdc.v > 1) {
      alertes.push(`${pdc.v} points de charge sur l'ancien relevé : une seule borne est créée, duplique la branche ${pdc.v - 1} fois.`);
      utilises.add(CHAMPS.nbPointsDeCharge);
    }
  }
  // Le nom du raccordement suit la source relevée
  const r = parCle.get('R');
  const src = r?.valeurs[CHAMPS.sourceRaccordement];
  if (r && src !== undefined) {
    const cleSrc = cleOption(OPTIONS.sourceRaccordement, src) as CleSource | null;
    if (cleSrc) r.nom = nomRaccordement(cleSrc);
  }

  // Champs absents de la liste : ils ne seraient pas écrits
  const absents = new Set<string>();
  for (const s of specs) for (const id of [CHAMPS.nature, ...Object.keys(s.valeurs)]) if (!ctx.defs.has(id)) absents.add(libelle(id) || id);
  if (!ctx.defs.has(CHAMPS.depart) || !ctx.defs.has(CHAMPS.arrivee)) absents.add('Départ / Arrivée');
  if (absents.size) alertes.push(`Champs absents de la liste, non écrits : ${[...absents].join(', ')}`);

  const nonRepris: Ligne[] = [];
  for (const id of ANCIENS) {
    if (utilises.has(id)) continue;
    const t = texte(tache, id);
    if (t && t !== '0') nonRepris.push({ champ: libelle(id), valeur: t });
  }
  const materiels = texte(tache, CHAMPS.materielsAChiffrer);
  if (materiels) nonRepris.push({ champ: libelle(CHAMPS.materielsAChiffrer), valeur: `${materiels} (une variante = un scénario)` });
  const notes = texte(tache, CHAMPS.notesCheminement);
  if (notes) nonRepris.push({ champ: 'Notes (restent sur l’ancienne tâche)', valeur: notes });
  const photos = Array.isArray(tache?.attachments) ? tache.attachments.length : 0;
  if (photos) nonRepris.push({ champ: 'Pièces jointes (restent sur l’ancienne tâche)', valeur: String(photos) });

  // Champs du scénario
  const ecrireScenario: Record<string, number> = {};
  if (genre === 'fiche' || segmentForce || !segmentDe(tache)) ecrireScenario[CHAMPS.segment] = OPTIONS.segment[segment];
  if (zone && (genre === 'fiche' || !lire(tache, CHAMPS.zoneDeplacement))) ecrireScenario[CHAMPS.zoneDeplacement] = zone.v;
  if (places && (genre === 'fiche' || !lire(tache, CHAMPS.nbPlacesParking))) ecrireScenario[CHAMPS.nbPlacesParking] = places;
  if (genre === 'fiche' && String(champs(fiche).find((c) => c?.id === CHAMPS.lienDevis)?.value ?? '').trim()) {
    alertes.push('Un devis est lié sur la fiche : il y reste, il n’est pas recopié sur le scénario.');
  }

  const nomsParCle = new Map<string, string>(specs.map((s) => [s.cle, s.nom]));
  const plan: Plan = {
    source: { id: String(tache.id), nom: String(tache.name || ''), genre },
    scenario: {
      id: genre === 'scenario' ? String(tache.id) : null,
      nom: genre === 'scenario' ? String(tache.name || '') : `Scénario ${lettreSuivante(directes(fiche))} : ${segment}`,
      cree: genre === 'fiche',
      segment,
      zone: zone ? String(cleOption(OPTIONS.zoneDeplacement, zone.v) ?? '') || null : null,
      places,
      statut: genre === 'fiche' ? String(fiche?.status?.status || '') || null : String(tache?.status?.status || '') || null,
    },
    elements: specs.map((s) => ({
      nom: s.nom,
      nature: s.nature,
      ...(s.depart ? { depart: nomsParCle.get(s.depart) } : {}),
      ...(s.arrivee ? { arrivee: nomsParCle.get(s.arrivee) } : {}),
      valeurs: Object.entries(s.valeurs).map(([id, v]) => ({ champ: libelle(id), valeur: lisible(id, v) })),
    })),
    nonRepris,
    alertes,
  };
  return { ok: true, plan, specs, ctx, fiche, source: tache, ecrireScenario };
}

// Applique une préparation : scénario créé (fiche) ou complété (scénario existant), puis éléments créés et reliés
export async function executer(token: string, p: Extract<Preparation, { ok: true }>): Promise<Execution> {
  const { plan, specs, ctx, fiche, ecrireScenario } = p;
  const crees: string[] = [];
  const erreurs: string[] = [];
  const listId = String(fiche?.list?.id || ctx.listId);
  const date = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
  const champsScenario: { id: string; value: any }[] = [];
  for (const [id, v] of Object.entries(ecrireScenario)) {
    const w = ecrite(ctx.defs, id, v);
    if (w !== undefined) champsScenario.push({ id, value: w });
  }

  let scenarioId = plan.scenario.id;
  if (plan.scenario.cree) {
    const res = await api(token, `/list/${listId}/task`, 'POST', {
      name: plan.scenario.nom,
      parent: String(fiche.id),
      description: `Scénario créé le ${date} par la conversion de l'ancien relevé de la fiche. Les notes et les photos sont restées sur la fiche.`,
      ...(plan.scenario.statut ? { status: plan.scenario.statut } : {}),
      ...(await champType(token, 'scenario')),
      custom_fields: champsScenario,
    });
    if (!res.ok) {
      console.error(`Création du scénario refusée (${res.status})`, await res.text().catch(() => ''));
      return { ok: false, scenarioId: null, crees, erreurs: ['scénario non créé'] };
    }
    const j = await res.json().catch(() => ({}));
    scenarioId = j?.id ? String(j.id) : null;
    if (!scenarioId) return { ok: false, scenarioId: null, crees, erreurs: ['scénario non créé'] };
    crees.push(plan.scenario.nom);
  } else if (scenarioId) {
    for (const c of champsScenario) {
      const r = await api(token, `/task/${scenarioId}/field/${c.id}`, 'POST', { value: c.value });
      if (!r.ok) erreurs.push(`${libelle(c.id)} du scénario`);
    }
  }

  const description = `Élément créé le ${date} par la conversion de l'ancien relevé « ${plan.source.nom} ».`;
  const ids: Record<string, string> = {};
  const creer = async (s: SpecElement): Promise<string | null> => {
    const custom_fields: { id: string; value: any }[] = [];
    for (const [id, v] of Object.entries({ [CHAMPS.nature]: OPTIONS.nature[s.nature], ...s.valeurs })) {
      const w = ecrite(ctx.defs, id, v);
      if (w !== undefined) custom_fields.push({ id, value: w });
    }
    const res = await api(token, `/list/${listId}/task`, 'POST', {
      name: s.nom,
      parent: scenarioId,
      description,
      ...(await champType(token, 'element')),
      custom_fields,
    });
    if (!res.ok) {
      console.error(`Création de l'élément « ${s.nom} » refusée (${res.status})`, await res.text().catch(() => ''));
      return null;
    }
    const j = await res.json().catch(() => ({}));
    return j?.id ? String(j.id) : null;
  };
  const relier = async (id: string, champId: string, cible: string) => {
    if (!ctx.defs.has(champId)) return false;
    return (await api(token, `/task/${id}/field/${champId}`, 'POST', { value: { add: [cible], rem: [] } })).ok;
  };

  for (const s of specs.filter((x) => x.nature !== 'cheminement')) {
    const id = await creer(s);
    if (id) { ids[s.cle] = id; crees.push(s.nom); } else erreurs.push(s.nom);
  }
  for (const s of specs.filter((x) => x.nature === 'cheminement')) {
    const id = await creer(s);
    if (!id) { erreurs.push(s.nom); continue; }
    crees.push(s.nom);
    if (s.depart && ids[s.depart] && !(await relier(id, CHAMPS.depart, ids[s.depart]))) erreurs.push(`${s.nom} (départ)`);
    if (s.arrivee && ids[s.arrivee] && !(await relier(id, CHAMPS.arrivee, ids[s.arrivee]))) erreurs.push(`${s.nom} (arrivée)`);
  }
  return { ok: erreurs.length === 0, scenarioId, crees, erreurs };
}
