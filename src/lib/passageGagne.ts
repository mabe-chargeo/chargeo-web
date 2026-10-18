import { getQualificationListId, QUALIFICATION_PROD_ID } from '@/lib/listesClickUp';
import { alerter } from '@/lib/alerteSite';
import { scenariosActifs, sousTachesArchivees } from '@/lib/scenarioRetenu';
import { champType, poserType, type CleType } from '@/lib/typesTaches';

// Passage en 🏆 gagné : reprise par le site des automatisations ClickUp #3, #5 et #6 de Qualification
// (décision Matthieu du 12/10/2026 : la bascule passe par les webhooks du site).
// Appelé par l'aiguillage (src/lib/aiguillage.ts), après la facture d'acompte (devis/montant) et l'arrêt des relances
// (relances/devis-envoye). Ordre :
// 1. #3 : la même fiche part dans Planning Chantiers, en 📥 à planifier (sous-tâches comprises). Fait AVANT la
//    commande : la réception matériel ne cherche le chantier que dans Planning Chantiers.
//    Les champs communs aux deux listes (Lien Costructor, N° devis, Montant, Lien devis, Segment, Adresse...) sont relus
//    après le déplacement : un champ vidé est signalé.
// 2. #5 : tâche dans Commandes Matériel (même nom, 📝 à commander, « Matériel pour … Vérifier d'abord le stock… »),
//    liée à la fiche, 🏗️ Chantier rempli. Jamais en double : une commande déjà liée à la fiche est réutilisée.
// 3. #6 : si 🏷️ Segment ≠ RES (vide compris), dossier dans Dossiers ADVENIR (même nom, à réserver, première étape
//    « vérifier l'éligibilité »), lié à la fiche. Jamais en double.
// Scénarios (14/10/2026) : le scénario retenu est désigné juste avant (src/lib/scenarioRetenu.ts), les autres sont
// archivés. S'il reste des scénarios à trancher, rien ne part. Le déplacement fait aussi correspondre les statuts des
// sous-fiches archivées : elles suivent la fiche sans figurer dans sa lecture.
// Étape 2 (15/10/2026) : la commande naît en type Commande, le dossier ADVENIR en type Dossier aide ; arrivée dans
// Planning, la fiche passe en type Projet si elle ne l'est pas déjà (anciennes fiches Prospect ou Tâche).
// 18/10/2026, 12 h 45 (parcours test : le dossier ADVENIR naissait vide) : 🅿️ Nb Places Parking et 🏛️ Date dépôt permis
// ont été ajoutés par Matthieu (champs existants, mêmes identifiants) à Planning Chantiers et à Dossiers Advenir.
// Ils suivent donc la fiche dans Planning (contrôlés comme champs communs) et sont recopiés sur le dossier ADVENIR,
// avec le passeport (Email, Téléphone, Adresse, Lien Costructor). La description du dossier donne l'assiette selon la
// date du permis (avant 2017 complète, 2017 au 10/03/2021 réduite, après non éligible). Un dossier déjà lié est
// complété sur ses champs vides seulement.
// 18/10/2026, 13 h 30 (parcours test : « Aucun matériel prévu » à la saisie à la pose) : la lecture de la fiche ne donne
// que ses sous-tâches directes (les scénarios). Les éléments des scénarios gardaient « 📍 à visiter », statut absent
// de Planning : arrivés sans statut, ils disparaissaient des lectures. Les statuts des éléments (actifs et archivés) de
// chaque scénario sont maintenant ajoutés à la correspondance.
// Garde : fiche principale de Qualification, encore en gagné. En preview : vrai passage sur la liste TEST ou une fiche
// « Test… », simulation partout.

const WORKSPACE_ID = process.env.CLICKUP_TEAM_ID || '90151325642';
const PLANNING_CHANTIERS_ID = '901520038258';
const COMMANDES_ID = '901520038249';
const ADVENIR_ID = process.env.CLICKUP_ADVENIR_LIST_ID || '901520038271';
const CHAMP_SEGMENT = 'dbdacf18-1d26-4c58-9bbb-b4a9e443daa2';
const CHAMP_CHANTIER = '9b561ce2-719c-4cc0-9bb6-392959f9206e'; // 🏗️ Chantier côté commande, 📦 Commande Liée côté chantier
const CHAMP_PLACES = 'dd19d42f-8d9f-4657-bac5-942de6822468';
const CHAMP_PERMIS = '39fa76fa-544d-4e0e-81ab-94822296cf85';
const CHAMPS_COMMUNS: { id: string; nom: string }[] = [
  { id: 'd9f88e8f-4e20-4a98-aee8-3ded30fef5fc', nom: '🔗 Lien Costructor' },
  { id: '66aee5d1-7159-46a7-b986-3dd6c314fd80', nom: '📧 Email' },
  { id: '6a120794-23be-4c50-8d25-75993f0aece4', nom: '📞 Telephone' },
  { id: 'f6b45107-9ba0-406b-8fd7-d678e6ad11dc', nom: '🏢 Type Client' },
  { id: '990a7f3b-989f-416d-9a80-eba5654b228d', nom: '📍 Adresse' },
  { id: CHAMP_SEGMENT, nom: '🏷️ Segment' },
  { id: '4423a27f-ecc1-4107-9488-4784360178c0', nom: '📝 N° devis' },
  { id: '58a159c7-edbc-4d53-a81a-5ec48337c7eb', nom: '💶 Montant devis HT' },
  { id: 'ae80f202-2ef3-4302-b778-f36075ee398f', nom: '🔗 Lien devis' },
  { id: CHAMP_PLACES, nom: '🅿️ Nb Places Parking' },
  { id: CHAMP_PERMIS, nom: '🏛️ Date dépôt permis' },
];
// Recopiés de la fiche vers le dossier ADVENIR (champs présents dans Dossiers Advenir)
const CHAMPS_ADVENIR = [
  CHAMP_PLACES,
  CHAMP_PERMIS,
  'd9f88e8f-4e20-4a98-aee8-3ded30fef5fc', // 🔗 Lien Costructor
  '66aee5d1-7159-46a7-b986-3dd6c314fd80', // 📧 Email
  '6a120794-23be-4c50-8d25-75993f0aece4', // 📞 Telephone
  '990a7f3b-989f-416d-9a80-eba5654b228d', // 📍 Adresse
];

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function api(token: string, chemin: string, methode = 'GET', corps?: any, version = 'v2'): Promise<Response> {
  return fetch(`https://api.clickup.com/api/${version}${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

async function lireTache(id: string, token: string, sousTaches = false): Promise<any | null> {
  const suffixe = sousTaches ? '&include_subtasks=true' : '';
  const res = await api(token, `/task/${encodeURIComponent(id)}?custom_task_ids=true${suffixe}`);
  return res.ok ? res.json() : null;
}

async function commenter(token: string, id: string, texte: string): Promise<boolean> {
  const res = await api(token, `/task/${id}/comment`, 'POST', { comment_text: texte, notify_all: false });
  if (!res.ok) console.error(`Commentaire refusé (${res.status}) sur ${id}`);
  return res.ok;
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

// Valeur d'un champ de la fiche, prête à être écrite sur une autre tâche. undefined = rien à recopier
function valeurAEcrire(f: any): any {
  const v = f?.value;
  if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return undefined;
  if (f.type === 'location') {
    const loc = v?.location || {};
    return v?.formatted_address ? { location: { lat: loc.lat, lng: loc.lng }, formatted_address: v.formatted_address } : undefined;
  }
  if (['number', 'currency', 'date'].includes(String(f.type))) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return String(v);
}

const jourParis = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
// Assiette ADVENIR infrastructure selon la date de dépôt du permis (règle validée)
function assietteAdvenir(fiche: any): string {
  const ms = Number(champ(fiche, CHAMP_PERMIS)?.value);
  if (!Number.isFinite(ms) || ms <= 0) return 'Date de dépôt du permis non renseignée : elle fixe l’assiette ADVENIR.';
  const d = jourParis(ms);
  const date = `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
  if (d < '2017-01-01') return `Permis déposé le ${date} : avant 2017, assiette complète.`;
  if (d <= '2021-03-10') return `Permis déposé le ${date} : entre 2017 et le 10/03/2021, assiette réduite.`;
  return `Permis déposé le ${date} : après le 10/03/2021, non éligible à l’aide infrastructure.`;
}
function placesTexte(fiche: any): string {
  const n = Number(champ(fiche, CHAMP_PLACES)?.value);
  return rempli(fiche, CHAMP_PLACES) && Number.isFinite(n) ? `${n} places de parking.` : 'Nombre de places non renseigné.';
}

// Champs de la fiche recopiés sur le dossier ADVENIR ; dossier déjà existant : seulement ses champs vides
async function remplirDossier(token: string, fiche: any, dossierId: string, dossier?: any): Promise<{ copies: string[]; rates: string[] }> {
  const copies: string[] = [];
  const rates: string[] = [];
  for (const id of CHAMPS_ADVENIR) {
    const f = champ(fiche, id);
    const v = valeurAEcrire(f);
    if (v === undefined) continue;
    if (dossier && rempli(dossier, id)) continue;
    const r = await api(token, `/task/${dossierId}/field/${id}`, 'POST', { value: v });
    if (r.ok) copies.push(String(f.name));
    else { rates.push(String(f.name)); console.error(`Champ ${f.name} non recopié sur le dossier ADVENIR (${r.status})`); }
  }
  return { copies, rates };
}

async function statutsListe(listId: string, token: string): Promise<any[]> {
  const res = await api(token, `/list/${listId}`);
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json?.statuses) ? json.statuses : [];
}

async function statutNomme(listId: string, token: string, mot: string): Promise<string | null> {
  const s = (await statutsListe(listId, token)).find((x: any) => normal(x.status).includes(mot));
  return s ? String(s.status) : null;
}

// Garde : null = autorisé, sinon l'action renvoyée
function garde(fiche: any, simulation: boolean): string | null {
  if (fiche.parent) return 'ignore_sous_tache';
  const liste = String(fiche?.list?.id ?? '');
  const qualif = String(getQualificationListId() || '');
  if (process.env.VERCEL_ENV === 'production') return liste === qualif ? null : 'ignore_hors_qualification';
  if (liste !== qualif && liste !== QUALIFICATION_PROD_ID) return 'ignore_hors_qualification';
  if (simulation) return null;
  return liste === qualif || normal(fiche.name).startsWith('test') ? null : 'refuse_preview_fiche_reelle';
}

// Tâche déjà liée à la fiche dans une liste donnée (lien de tâche). null = aucune
async function tacheLieeDans(fiche: any, listeId: string, token: string): Promise<any | null> {
  const moi = String(fiche.id);
  const ids = (Array.isArray(fiche?.linked_tasks) ? fiche.linked_tasks : [])
    .map((l: any) => (String(l?.task_id) === moi ? String(l?.link_id) : String(l?.task_id)))
    .filter((x: string) => x && x !== 'undefined' && x !== moi);
  for (const id of Array.from(new Set<string>(ids)).slice(0, 20)) {
    const t = await lireTache(id, token);
    if (t && String(t?.list?.id ?? '') === listeId && !t.parent) return t;
  }
  return null;
}

// #3 : même tâche déplacée dans Planning Chantiers, statuts utilisés (fiche, scénarios, éléments) vers 📥 à planifier
async function deplacerVersPlanning(fiche: any, token: string): Promise<{ ok: boolean; detail?: string; essai?: string; relue?: any }> {
  const [source, dest] = await Promise.all([statutsListe(String(fiche.list.id), token), statutsListe(PLANNING_CHANTIERS_ID, token)]);
  const cible = dest.find((s: any) => normal(s.status).includes('planifier')) || dest.find((s: any) => s.type === 'open');
  if (!cible || !source.length) return { ok: false, detail: 'statuts introuvables' };
  const trouver = (s: any) => source.find((x: any) => x.id === s?.id) || source.find((x: any) => normal(x.status) === normal(s?.status));
  const actuel = trouver(fiche.status);
  if (!actuel) return { ok: false, detail: 'statut actuel introuvable' };
  // Statuts utilisés : la fiche, ses sous-tâches, et ses sous-fiches archivées (absentes de la lecture, 14/10)
  const utilises: any[] = [actuel];
  const ajouter = (st: any) => {
    const s = trouver(st?.status);
    if (s && !utilises.some((u) => u.id === s.id)) utilises.push(s);
  };
  const listeId = String(fiche.list.id);
  const archivees = await sousTachesArchivees(token, listeId, String(fiche.id));
  const directes = [...(Array.isArray(fiche?.subtasks) ? fiche.subtasks : []), ...archivees]
    .filter((st: any) => !st?.parent || String(st.parent) === String(fiche.id));
  for (const st of directes) ajouter(st);
  // 18/10 : les éléments de chaque scénario (sous-sous-tâches), actifs et archivés, absents de la lecture de la fiche
  for (const sc of directes) {
    const lu = await lireTache(String(sc.id), token, true);
    const elements = [
      ...(Array.isArray(lu?.subtasks) ? lu.subtasks : []),
      ...(await sousTachesArchivees(token, listeId, String(sc.id))),
    ];
    for (const e of elements) ajouter(e);
  }
  // Pas de move_custom_fields : les champs propres à Qualification ne sont pas ajoutés à Planning Chantiers.
  // Les champs communs (même champ dans les deux listes) gardent leur valeur ; c'est vérifié à la relecture.
  const essais: { nom: string; corps: any }[] = [
    { nom: 'utilises_id', corps: { move_custom_fields: false, status_mappings: utilises.map((s) => ({ source_status_id: s.id, destination_status_id: cible.id })) } },
    { nom: 'actuel_id', corps: { move_custom_fields: false, status_mappings: [{ source_status_id: actuel.id, destination_status_id: cible.id }] } },
    { nom: 'utilises', corps: { status_mappings: utilises.map((s) => ({ source_status: s.id, destination_status: cible.id })) } },
  ];
  const erreurs: string[] = [];
  for (const e of essais) {
    const res = await api(token, `/workspaces/${WORKSPACE_ID}/tasks/${fiche.id}/home_list/${PLANNING_CHANTIERS_ID}`, 'PUT', e.corps, 'v3');
    if (res.ok) {
      const relue = await lireTache(String(fiche.id), token);
      return { ok: String(relue?.list?.id ?? '') === PLANNING_CHANTIERS_ID, detail: relue?.status?.status, essai: e.nom, relue };
    }
    erreurs.push(`${e.nom}: HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 120)}`);
    if (res.status !== 400) break;
  }
  return { ok: false, detail: erreurs.join(' | ') };
}

// Création d'une tâche liée à la fiche (commande ou dossier ADVENIR), avec son type
async function creerLiee(token: string, fiche: any, listeId: string, motStatut: string, description: string, cle: CleType) {
  const statut = await statutNomme(listeId, token, motStatut);
  const nom = String(fiche.name || '').trim();
  const res = await api(token, `/list/${listeId}/task`, 'POST', {
    name: nom, description, ...(statut ? { status: statut } : {}), ...(await champType(token, cle)),
  });
  if (!res.ok) {
    console.error(`Création refusée dans ${listeId} (${res.status})`, await res.text().catch(() => ''));
    return null;
  }
  const t = await res.json();
  const lien = await api(token, `/task/${t.id}/link/${fiche.id}`, 'POST');
  return { id: String(t.id), url: String(t.url || ''), statut, lien: lien.ok };
}

export async function traiterGagne(taskId: string, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { success: false, error: 'Configuration serveur incomplète' };
  const fiche = await lireTache(taskId, token, true);
  if (!fiche) return { success: false, error: 'Fiche introuvable' };
  const refus = garde(fiche, simulation);
  if (refus) return { success: true, action: refus, simulation };
  if (!normal(fiche?.status?.status).includes('gagn')) {
    return { success: true, action: 'ignore_plus_gagne', statut: fiche?.status?.status, simulation };
  }
  const aTrancher = scenariosActifs(fiche);
  if (aTrancher.length && !simulation) {
    return { success: false, action: 'bloque_scenarios', scenarios: aTrancher.map((s: any) => s.name), simulation };
  }

  const id = String(fiche.id);
  const nom = String(fiche.name || '').trim();
  const segment = option(fiche, CHAMP_SEGMENT);
  const avecAdvenir = normal(segment).trim() !== 'res';
  const commandeExistante = await tacheLieeDans(fiche, COMMANDES_ID, token);
  const dossierExistant = avecAdvenir ? await tacheLieeDans(fiche, ADVENIR_ID, token) : null;

  if (simulation) {
    return {
      success: true, simulation, segment: segment || 'vide',
      planning: 'deplacerait en 📥 à planifier',
      commande: commandeExistante ? 'deja_creee' : 'creerait',
      advenir: !avecAdvenir ? 'ignore_res' : dossierExistant ? 'deja_cree' : 'creerait',
      advenirChamps: CHAMPS_ADVENIR.filter((c) => rempli(fiche, c)).map((c) => String(champ(fiche, c)?.name || c)),
      assiette: assietteAdvenir(fiche),
    };
  }

  // 1. #3 Planning Chantiers
  const d = await deplacerVersPlanning(fiche, token);
  let perdus: string[] = [];
  if (!d.ok) {
    await alerter(token, id, "⚠️ Passage en gagné : la fiche n'a pas pu partir dans Planning Chantiers. Déplace-la à la main (statut 📥 à planifier). La commande matériel et le dossier ADVENIR sont créés quand même.");
  } else {
    perdus = CHAMPS_COMMUNS.filter((c) => rempli(fiche, c.id) && !rempli(d.relue, c.id)).map((c) => c.nom);
    if (perdus.length) {
      await alerter(token, id, `⚠️ Passage en gagné : fiche arrivée dans Planning Chantiers, mais ${perdus.join(', ')} ${perdus.length > 1 ? 'sont vides' : 'est vide'} après le déplacement. Recopie la valeur depuis l'historique de la fiche.`);
    }
    // Étape 2 : la fiche est un Projet (sans effet si elle l'est déjà, sans blocage si le type est introuvable)
    await poserType(token, id, 'projet');
  }

  // 2. #5 Commandes Matériel
  let commande: any;
  if (commandeExistante) commande = { action: 'deja_creee', url: commandeExistante.url };
  else {
    const c = await creerLiee(token, fiche, COMMANDES_ID, 'a commander',
      `Matériel pour ${nom}. Vérifier d'abord le stock et les commandes en cours, puis commander seulement ce qui manque.`, 'commande');
    if (!c) commande = { action: 'erreur_creation' };
    else {
      const relation = d.ok
        ? (await api(token, `/task/${c.id}/field/${CHAMP_CHANTIER}`, 'POST', { value: { add: [id], rem: [] } })).ok
        : false;
      commande = { action: 'creee', ...c, relation };
    }
  }

  // 3. #6 Dossiers ADVENIR (fiche lue AVANT le déplacement : toutes ses valeurs de Qualification)
  let advenir: any;
  if (!avecAdvenir) advenir = { action: 'ignore_res' };
  else if (dossierExistant) {
    const r = await remplirDossier(token, fiche, String(dossierExistant.id), dossierExistant);
    advenir = { action: 'deja_cree', url: dossierExistant.url, ...r };
  } else {
    const a = await creerLiee(token, fiche, ADVENIR_ID, 'reserver',
      `Dossier ADVENIR pour ${nom}. Première étape : vérifier l'éligibilité (date de dépôt du permis, date du vote d'AG, barème applicable) avant toute réservation.\n\n${placesTexte(fiche)}\n${assietteAdvenir(fiche)}`, 'dossierAide');
    advenir = a ? { action: 'cree', ...a, ...(await remplirDossier(token, fiche, a.id)) } : { action: 'erreur_creation' };
  }
  const manquantsAdvenir = avecAdvenir
    ? [!rempli(fiche, CHAMP_PLACES) && 'nombre de places', !rempli(fiche, CHAMP_PERMIS) && 'date de dépôt du permis'].filter(Boolean) as string[]
    : [];

  // Récapitulatif sur la fiche
  const lignes = [d.ok ? '🏆 Affaire gagnée : fiche passée dans Planning Chantiers (📥 à planifier).' : '🏆 Affaire gagnée.'];
  if (commande.action === 'creee') lignes.push(`📦 Commande matériel à préparer (vérifier le stock d'abord) : ${commande.url}`);
  if (advenir.action === 'cree') lignes.push(`🏛️ Dossier ADVENIR créé, première étape : vérifier l'éligibilité : ${advenir.url}`);
  if ((advenir.action === 'cree' || advenir.action === 'deja_cree') && advenir.copies?.length) lignes.push(`🏛️ Recopié sur le dossier ADVENIR : ${advenir.copies.join(', ')}. ${assietteAdvenir(fiche)}`);
  if (advenir.action === 'ignore_res') lignes.push('🏛️ Pas de dossier ADVENIR (segment RES).');
  if (lignes.length > 1 || d.ok) await commenter(token, id, lignes.join('\n'));

  const rates = [
    commande.action === 'erreur_creation' ? 'la commande matériel (Commandes Matériel)' : '',
    advenir.action === 'erreur_creation' ? 'le dossier ADVENIR (Dossiers ADVENIR)' : '',
  ].filter(Boolean);
  if (rates.length) await alerter(token, id, `⚠️ Passage en gagné : je n'ai pas pu créer ${rates.join(' ni ')}. ${rates.length > 1 ? 'Crée-les à la main et lie-les' : 'Crée-la à la main et lie-la'} à cette fiche.`);
  if (advenir.rates?.length) await alerter(token, id, `⚠️ Dossier ADVENIR : ${advenir.rates.join(', ')} non recopié${advenir.rates.length > 1 ? 's' : ''} depuis la fiche. Reporte la valeur à la main.`);
  if (manquantsAdvenir.length) await alerter(token, id, `⚠️ Dossier ADVENIR : ${manquantsAdvenir.join(' et ')} absent${manquantsAdvenir.length > 1 ? 's' : ''} de la fiche. Renseigne-les sur la fiche et sur le dossier : ils fixent l'éligibilité et le barème.`);

  return {
    success: d.ok && !rates.length && !perdus.length && !advenir.rates?.length,
    segment: segment || 'vide',
    planning: { ok: d.ok, statut: d.detail, essai: d.essai, champsVides: perdus },
    commande, advenir, manquantsAdvenir,
  };
}
