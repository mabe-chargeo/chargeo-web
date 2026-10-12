import { NextResponse } from 'next/server';
import { aujourdhuiParis, ajouterJours, libelleJour } from '@/lib/joursOuvres';
import { CHAMP_AVIS, CHAMP_TECHNICIEN, creerRappelAvis, poseurs } from '@/lib/avisGoogle';
import { devisIdDe, traiterContrat } from '@/lib/contratMaintenance';
import { creerSolde } from '@/lib/factureSolde';
import { alerter } from '@/lib/alerteSite';

// Réception, réserves et passage au Parc (Phase 4, bloc 2 validé par Matthieu le 11/10/2026).
// Appelé par les automatisations de Planning Chantiers : POST ?taskId=...&evenement=realise | termine
// - realise (statut → ✅ réalisé) : contrôle PV, photos et 🧾 Réserves. Commentaire ⚠️ s'il manque quelque chose,
//   sans retour en arrière.
// - termine (statut → 🏁 terminé) : refusé si Réserves vide ou 🔴 Bloquante, PV manquant, ou réserve mineure sans
//   sous-tâche « 🔧 Réserve : … » complète (responsable + échéance). Refus : retour en ✅ réalisé + motif.
//   Sinon le site déplace la même tâche au Parc installé (🟢 en service ; sous-tâches de réserve ouvertes en
//   ⚠️ sous surveillance), note la demande d'avis faite sur place (QR code) et crée la sous-tâche ⭐ de relance
//   par email à J+7 pour le poseur. Les règlements et aides ne conditionnent pas ce passage.
//   Prestations vendues (12/10/2026) : le contrat de maintenance du devis signé (🔗 Lien devis, lu avant le déplacement)
//   remplit 📜 Type de Contrat, 📅 Date de Mise en Service, 🔄 Echeance annuelle et 🔢 Nb points de charge (voir
//   src/lib/contratMaintenance.ts). Aucune visite n'est créée ici.
//   Facture de solde (décision Matthieu du 12/10/2026) : « Solde · client · n° devis » créée dans Factures Clients,
//   📄 à émettre, rappel J+1 ouvré, sans doublon (voir src/lib/factureSolde.ts).
// Alertes notifiées (12/10) : écrites dans 📣 Alerte site, relayées par ClickBot à @charge-doperation (src/lib/alerteSite.ts).
//   Le refus garde en plus son commentaire du site : c'est lui qui évite le ⚠️ « réalisé incomplet » juste après le retour.
// Preview : GET ?taskId=...&evenement=...&simulation=1 (rien n'est écrit) ou &executer=1 (fiches « Test » uniquement).
//   GET ?taskId=...&evenement=contrat&devis=quote_...&simulation=1|executer=1 : lecture du contrat seule, sur une fiche
//   du Parc ou de Planning (exécution : fiche « Test » du Parc uniquement). Sans &devis, le 🔗 Lien devis de la fiche.

const WORKSPACE_ID = process.env.CLICKUP_TEAM_ID || '90151325642';
const PLANNING_CHANTIERS_ID = '901520038258';
const PARC_ID = '901520038290';
const CHAMP_RESERVES = '1463a905-0b11-4693-b9d9-e8cca4f79eeb';
const CHAMP_PV = 'ea4cf46a-c8bc-41ad-a46e-c7d313099f1b';
const CHAMP_PHOTOS = 'e907f3f8-c702-47bd-b523-017e684e78c1';
const CHAMPS_A_GARDER = [CHAMP_PV, CHAMP_PHOTOS, CHAMP_RESERVES, CHAMP_TECHNICIEN, CHAMP_AVIS];
const PREFIXE_REFUS = '🔴 Passage au Parc refusé';
const EVENEMENTS = ['realise', 'termine'] as const;
type Evenement = (typeof EVENEMENTS)[number];

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function api(token: string, chemin: string, methode = 'GET', corps?: any, version = 'v2'): Promise<Response> {
  return fetch(`https://api.clickup.com/api/${version}${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

async function lireTache(taskId: string, token: string): Promise<any | null> {
  const res = await api(token, `/task/${encodeURIComponent(taskId)}?custom_task_ids=true&include_subtasks=true`);
  return res.ok ? res.json() : null;
}

// notifier = true : alerte relayée par ClickBot (src/lib/alerteSite.ts), sinon simple commentaire
async function commenter(taskId: string, token: string, texte: string, notifier = false): Promise<boolean> {
  if (notifier) return alerter(token, taskId, texte);
  const res = await api(token, `/task/${taskId}/comment`, 'POST', { comment_text: texte, notify_all: false });
  if (!res.ok) console.error(`Commentaire refusé (${res.status}) sur ${taskId}`);
  return res.ok;
}

async function statutsListe(listId: string, token: string): Promise<any[]> {
  const res = await api(token, `/list/${listId}`);
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json?.statuses) ? json.statuses : [];
}

function champ(tache: any, id: string): any {
  return (Array.isArray(tache?.custom_fields) ? tache.custom_fields : []).find((c: any) => c.id === id);
}

const aFichier = (t: any, id: string) => { const v = champ(t, id)?.value; return Array.isArray(v) ? v.length > 0 : !!v; };

// 🔗 Lien devis du chantier (lu par nom : le champ n'existe pas dans le Parc)
const lienDevis = (t: any) => String((Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => normal(c.name).includes('lien devis'))?.value || '');

function reserves(t: any): 'aucune' | 'mineure' | 'bloquante' | '' {
  const f = champ(t, CHAMP_RESERVES);
  if (!f || f.value === undefined || f.value === null || f.value === '') return '';
  const o = (f.type_config?.options || []).find((x: any) => x.orderindex === Number(f.value) || x.id === f.value);
  const n = normal(o?.name || '');
  if (n.includes('aucune')) return 'aucune';
  if (n.includes('mineure')) return 'mineure';
  if (n.includes('bloquante')) return 'bloquante';
  return '';
}

// Sous-tâches « 🔧 Réserve : … » et celles qui n'ont pas de responsable ou d'échéance
function sousTachesReserve(t: any) {
  const st = (Array.isArray(t?.subtasks) ? t.subtasks : []).filter((s: any) => normal(s?.name).includes('reserve'));
  const incompletes = st.filter((s: any) => !(Array.isArray(s?.assignees) && s.assignees.length) || !s?.due_date).map((s: any) => s.name);
  return { total: st.length, incompletes };
}

// Un refus récent (moins de 3 min) parmi les derniers commentaires : celui du site ou son relais par ClickBot
async function dernierCommentaireRefusRecent(taskId: string, token: string): Promise<boolean> {
  const res = await api(token, `/task/${taskId}/comment`);
  if (!res.ok) return false;
  const json = await res.json().catch(() => ({}));
  const derniers: any[] = Array.isArray(json?.comments) ? json.comments.slice(0, 3) : [];
  return derniers.some((c: any) => Date.now() - Number(c?.date || 0) < 3 * 60 * 1000 && String(c?.comment_text || '').includes(PREFIXE_REFUS));
}

// Statut source (objet de la liste Planning Chantiers) correspondant au statut d'une tâche ou sous-tâche
function statutSource(source: any[], s: any): any | undefined {
  return source.find((x: any) => x.id === s?.id) || source.find((x: any) => normal(x.status) === normal(s?.status));
}

async function deplacerAuParc(tache: any, token: string): Promise<{ ok: boolean; detail?: string; essai?: string }> {
  const [source, dest] = await Promise.all([statutsListe(PLANNING_CHANTIERS_ID, token), statutsListe(PARC_ID, token)]);
  const enService = dest.find((s: any) => normal(s.status).includes('en service'));
  const surveillance = dest.find((s: any) => normal(s.status).includes('surveillance')) || enService;
  if (!enService || !source.length) return { ok: false, detail: 'statuts introuvables' };
  const cible = (s: any) => (s?.type === 'closed' || s?.type === 'done' ? enService.id : surveillance.id);

  // Statuts réellement utilisés : la tâche principale puis ses sous-tâches (sans doublon)
  const actuel = statutSource(source, tache.status);
  if (!actuel) return { ok: false, detail: 'statut actuel introuvable' };
  const utilises: any[] = [actuel];
  for (const st of Array.isArray(tache?.subtasks) ? tache.subtasks : []) {
    const s = statutSource(source, st.status);
    if (s && !utilises.some((u) => u.id === s.id)) utilises.push(s);
  }

  // Format validé le 11/10 : source_status_id / destination_status_id sur les statuts utilisés (essai « utilises_id »).
  // Les autres formats restent en secours.
  const essais: { nom: string; mappings: any[] }[] = [
    { nom: 'utilises_id', mappings: utilises.map((s) => ({ source_status_id: s.id, destination_status_id: cible(s) })) },
    { nom: 'utilises', mappings: utilises.map((s) => ({ source_status: s.id, destination_status: cible(s) })) },
    { nom: 'actuel_id', mappings: [{ source_status_id: actuel.id, destination_status_id: enService.id }] },
  ];
  const erreurs: string[] = [];
  for (const e of essais) {
    const res = await api(
      token,
      `/workspaces/${WORKSPACE_ID}/tasks/${tache.id}/home_list/${PARC_ID}`,
      'PUT',
      { move_custom_fields: true, custom_fields_to_move: CHAMPS_A_GARDER, status_mappings: e.mappings },
      'v3',
    );
    if (res.ok) {
      const relue = await lireTache(String(tache.id), token);
      return { ok: String(relue?.list?.id ?? '') === PARC_ID, detail: relue?.status?.status, essai: e.nom };
    }
    erreurs.push(`${e.nom}: HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 120)}`);
    if (res.status !== 400) break;
  }
  return { ok: false, detail: erreurs.join(' | ') };
}

async function traiter(taskId: string, evenement: Evenement, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { status: 500, body: { success: false, error: 'Configuration serveur incomplète' } };
  const co = process.env.COSTRUCTOR_API_KEY || '';

  const tache = await lireTache(taskId, token);
  if (!tache) return { status: 404, body: { success: false, error: 'Fiche introuvable' } };
  if (tache.parent) return { status: 200, body: { success: true, action: 'ignore_sous_tache', simulation } };
  if (String(tache?.list?.id ?? '') !== PLANNING_CHANTIERS_ID) {
    return { status: 200, body: { success: true, action: 'ignore_hors_planning_chantiers', simulation } };
  }
  if (process.env.VERCEL_ENV !== 'production' && !simulation && !normal(tache.name).startsWith('test')) {
    return { status: 403, body: { success: false, error: 'En preview : exécution sur une fiche « Test » uniquement, simulation partout' } };
  }

  const id = String(tache.id);
  const pv = aFichier(tache, CHAMP_PV);
  const photos = aFichier(tache, CHAMP_PHOTOS);
  const res = reserves(tache);
  const st = sousTachesReserve(tache);
  const pose = poseurs(tache);
  const aujourdhui = aujourdhuiParis();
  const jour = libelleJour(aujourdhui);
  const devisId = devisIdDe(lienDevis(tache));
  const etat = { pv, photos, reserves: res || 'vide', sousTachesReserve: st.total, sousTachesIncompletes: st.incompletes, poseurs: pose.noms };

  if (evenement === 'realise') {
    const manque: string[] = [];
    if (!pv) manque.push('📂 PV Réception');
    if (!photos) manque.push('📸 Photos Chantier');
    if (!res) manque.push('🧾 Réserves (Aucune, Mineure ou Bloquante)');
    if (res === 'mineure' && !st.total) manque.push('une sous-tâche « 🔧 Réserve : … » par réserve mineure');
    if (!manque.length) return { status: 200, body: { success: true, action: 'realise_complet', ...etat, simulation } };
    const texte = `⚠️ Chantier réalisé, mais il manque : ${manque.join(', ')}. À compléter avant le passage au Parc.`;
    if (simulation) return { status: 200, body: { success: true, action: 'realise_incomplet', ...etat, commentaire: texte, simulation } };
    if (await dernierCommentaireRefusRecent(id, token)) {
      return { status: 200, body: { success: true, action: 'ignore_retour_apres_refus', ...etat } };
    }
    await commenter(id, token, texte);
    return { status: 200, body: { success: true, action: 'realise_incomplet', ...etat, commentaire: texte } };
  }

  // evenement termine
  if (String(tache?.status?.type || '') !== 'closed') {
    return { status: 200, body: { success: true, action: 'ignore_pas_termine', statut: tache?.status?.status, simulation } };
  }
  const motifs: string[] = [];
  if (!res) motifs.push('🧾 Réserves n’est pas renseigné');
  if (res === 'bloquante') motifs.push('une réserve 🔴 Bloquante empêche la mise en service');
  if (!pv) motifs.push('📂 PV Réception manquant');
  if (res === 'mineure' && !st.total) motifs.push('réserve mineure sans sous-tâche « 🔧 Réserve : … »');
  if (res === 'mineure' && st.incompletes.length) motifs.push(`sous-tâche sans responsable ou sans échéance (${st.incompletes.join(', ')})`);

  if (motifs.length) {
    const texte = `${PREFIXE_REFUS} : ${motifs.join(' ; ')}. Le chantier est remis en ✅ réalisé.`;
    if (simulation) return { status: 200, body: { success: true, action: 'parc_refuse', ...etat, motifs, commentaire: texte, simulation } };
    const statuts = await statutsListe(PLANNING_CHANTIERS_ID, token);
    const realise = statuts.find((s: any) => normal(s.status).includes('realise'));
    const retour = realise ? await api(token, `/task/${id}`, 'PUT', { status: realise.status }) : null;
    await commenter(id, token, texte);
    await alerter(token, id, `${PREFIXE_REFUS}, chantier remis en ✅ réalisé : le motif est dans le commentaire du site sur la fiche.`);
    return { status: 200, body: { success: true, action: 'parc_refuse', ...etat, motifs, remisEnRealise: !!retour?.ok, commentaire: texte } };
  }

  const mineures = res === 'mineure' ? ` ${st.total} réserve${st.total > 1 ? 's' : ''} mineure${st.total > 1 ? 's' : ''} suivie${st.total > 1 ? 's' : ''} en sous-tâche.` : '';
  const sansPhotos = photos ? '' : ' ⚠️ Pas de 📸 Photos Chantier : à ajouter pour le SAV.';
  const avis = ` ⭐ Avis Google demandé sur place${pose.noms.length ? ` par ${pose.noms.join(', ')}` : ''} ; sans avis, relance par email le ${libelleJour(ajouterJours(aujourdhui, 7))}.`;
  let texte = `🏁 Réception confirmée le ${jour} : chantier passé au Parc installé.${mineures}${sansPhotos}${avis}`;
  if (simulation) {
    const contrat = co ? await traiterContrat(token, co, id, devisId, aujourdhui, true) : { action: 'cle_costructor_absente' };
    const solde = await creerSolde(token, tache, true);
    return { status: 200, body: { success: true, action: 'parc_deplacement', ...etat, commentaire: texte, contrat, solde, simulation } };
  }

  const d = await deplacerAuParc(tache, token);
  if (!d.ok) {
    await commenter(id, token, `⚠️ Passage au Parc : la tâche n'a pas pu être déplacée. Déplace-la à la main vers Parc installé.`, true);
    return { status: 502, body: { success: false, error: 'Déplacement impossible', detail: d.detail, ...etat } };
  }
  const rappel = await creerRappelAvis(tache, token, PARC_ID, pose, true);
  if (!rappel.ok) texte = texte.replace(avis, ' ⚠️ La sous-tâche ⭐ avis Google n\'a pas pu être créée : note la relance à J+7 à la main.');
  else if (rappel.deja) texte = texte.replace(avis, ' ⭐ Sous-tâche d\'avis Google déjà présente.');
  await commenter(id, token, texte);
  let contrat: any = { action: 'cle_costructor_absente' };
  if (co) contrat = await traiterContrat(token, co, id, devisId, aujourdhui, false);
  else await commenter(id, token, '⚠️ Contrat de maintenance : lecture du devis impossible (configuration). Remplis 📜 Type de Contrat à la main.', true);

  // Facture de solde, à partir de la fiche lue avant le déplacement (N° devis, montant, liens)
  const solde = await creerSolde(token, tache, false);
  if (solde.solde === 'cree') {
    await commenter(id, token, `🧾 Facture de solde à émettre : tâche créée dans Factures Clients (montant = devis moins acompte), rappel le ${solde.rappel}. ${solde.url}`);
  } else if (solde.solde !== 'deja_cree') {
    const raison = solde.solde === 'sans_numero_devis' ? '📝 N° devis vide' : 'erreur de création';
    await commenter(id, token, `⚠️ Facture de solde : je n'ai pas pu créer la tâche dans Factures Clients (${raison}). Crée-la à la main (Type de pièce Solde, Réf. devis signé).`, true);
  }
  return { status: 200, body: { success: true, action: 'parc_deplace', statutParc: d.detail, essai: d.essai, avis: rappel, contrat, solde, ...etat, commentaire: texte } };
}

// Preview : contrat de maintenance seul (lecture partout, écriture sur la fiche « Test » du Parc)
async function testerContrat(taskId: string, devis: string, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  const co = process.env.COSTRUCTOR_API_KEY;
  if (!token || !co) return { status: 500, body: { success: false, error: 'Configuration serveur incomplète' } };
  const tache = await lireTache(taskId, token);
  if (!tache) return { status: 404, body: { success: false, error: 'Fiche introuvable' } };
  const liste = String(tache?.list?.id ?? '');
  if (![PARC_ID, PLANNING_CHANTIERS_ID].includes(liste)) return { status: 200, body: { success: true, action: 'ignore_hors_liste', simulation } };
  if (!simulation && (liste !== PARC_ID || !normal(tache.name).startsWith('test'))) {
    return { status: 403, body: { success: false, error: 'Exécution : fiche « Test » du Parc uniquement, simulation partout' } };
  }
  const devisId = devisIdDe(devis) || devisIdDe(lienDevis(tache));
  const r = await traiterContrat(token, co, String(tache.id), devisId, aujourdhuiParis(), simulation);
  return { status: 200, body: { success: true, devisId: devisId || null, ...r } };
}

function lireEvenement(p: URLSearchParams): Evenement | null {
  const e = p.get('evenement') as Evenement;
  return EVENEMENTS.includes(e) ? e : null;
}

export async function POST(request: Request) {
  try {
    const p = new URL(request.url).searchParams;
    const taskId = p.get('taskId');
    const evenement = lireEvenement(p);
    if (!taskId || !evenement) {
      return NextResponse.json({ success: false, error: 'Il faut ?taskId=...&evenement=realise|termine' }, { status: 400 });
    }
    const r = await traiter(taskId, evenement, false);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur réception chantier :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Preview uniquement : ?taskId=...&evenement=...&simulation=1 ou &executer=1
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ error: 'Non disponible' }, { status: 404 });
  }
  try {
    const p = new URL(request.url).searchParams;
    const taskId = p.get('taskId');
    const executer = p.get('executer') === '1';
    const simulation = p.get('simulation') === '1';
    if (taskId && p.get('evenement') === 'contrat' && (executer || simulation)) {
      const r = await testerContrat(taskId, p.get('devis') || '', !executer);
      return NextResponse.json(r.body, { status: r.status });
    }
    const evenement = lireEvenement(p);
    if (!taskId || !evenement || (!executer && !simulation)) {
      return NextResponse.json({ error: 'Ajoute ?taskId=...&evenement=realise|termine|contrat&simulation=1 ou &executer=1' }, { status: 400 });
    }
    const r = await traiter(taskId, evenement, !executer);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur réception chantier (preview) :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
