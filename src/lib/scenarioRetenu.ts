import { getQualificationListId, QUALIFICATION_PROD_ID } from '@/lib/listesClickUp';
import { alerter } from '@/lib/alerteSite';
import { champType } from '@/lib/typesTaches';

// Scénario retenu au passage en 🏆 gagné (décisions Matthieu des 13 et 14/10/2026).
// La fiche principale est le projet : elle va de la visite au Parc. Ses sous-fiches « Scénario … » sont les options de
// raccordement chiffrées, chacune avec son devis (🔗 Lien devis collé sur la sous-fiche par le commercial).
// Au gagné, AVANT le montant, l'acompte et le passage au Planning (src/lib/aiguillage.ts) :
// - retenu = le scénario dont le devis est signé dans Costructor (accepté), ou celui dont le devis est déjà dans le
//   🔗 Lien devis de la fiche (choix manuel du commercial) ;
// - ses champs de relevé et de devis sont recopiés sur la fiche (segment, matériels, distances, lien devis…), pour que
//   le montant, l'acompte, le Planning, ADVENIR et le chantier partent du bon scénario ; il est renommé « ✅ Retenu · » ;
// - les autres sont renommés « Non retenu · » et archivés (option B du 14/10) : ils suivent le projet sans apparaître
//   dans les vues ni l'appli, on les retrouve avec « afficher les archivées » ; test du 14/10 : un archivé suit bien
//   les déplacements Qualification → Planning → Parc ;
// - aucun devis signé, ou plusieurs : rien n'est choisi, alerte au commercial, la suite du gagné est bloquée.
// - autre payeur (décision Matthieu du 14/10) : si le retenu est en COP, un non retenu en PAR (borne partagée, payée
//   par le syndicat plus tard) n'est pas archivé : il devient un projet séparé dans Qualification (même passeport, son
//   relevé et son devis, lié au projet infra), passé en 📩 devis envoyé pour lancer relances et montant. La sous-fiche
//   d'origine est renommée « Projet séparé · » et archivée.
// Les sous-fiches « Emplacement … » (bornes d'un même devis) ne sont pas concernées.
// Preview : fiche de la liste TEST ou fiche « Test… » ; forcerSigne=<id de sous-fiche> traite son devis comme signé.
// Étape 2 (15/10/2026) : le projet séparé naît en type Projet. La détection des scénarios par type arrive à l'étape 6.

const COSTRUCTOR = 'https://api.costructor.co/external/v1';
const CHAMP_LIEN_DEVIS = 'ae80f202-2ef3-4302-b778-f36075ee398f';
export const PREFIXE_RETENU = '✅ Retenu · ';
export const PREFIXE_NON_RETENU = 'Non retenu · ';
export const PREFIXE_SEPARE = 'Projet séparé · ';
const CHAMP_SEGMENT = 'dbdacf18-1d26-4c58-9bbb-b4a9e443daa2';
const CHAMP_ALERTE = '42019c42-0af8-49de-a33d-8af0ddde3357';
const SIGNES = ['accepted', 'done'];
const EXCLUS = ['revised', 'draft', 'cancelled', 'refused'];
const LIBELLES_STATUT: Record<string, string> = {
  draft: 'Brouillon', open: 'En attente', accepted: 'Accepté', done: 'Accepté', refused: 'Refusé', cancelled: 'Annulé', revised: 'Révisé',
};
// Jamais recopiés du scénario vers le projet : identité du client (Passeport), alertes, rendez-vous, relances, calculs
const NON_COPIES = new Set([
  '6a120794-23be-4c50-8d25-75993f0aece4', // 📞 Telephone
  '66aee5d1-7159-46a7-b986-3dd6c314fd80', // 📧 Email
  '990a7f3b-989f-416d-9a80-eba5654b228d', // 📍 Adresse
  'f6b45107-9ba0-406b-8fd7-d678e6ad11dc', // 🏢 Type Client
  'd9f88e8f-4e20-4a98-aee8-3ded30fef5fc', // 🔗 Lien Costructor
  '42019c42-0af8-49de-a33d-8af0ddde3357', // 📣 Alerte site
]);
const MOTS_NON_COPIES = ['date visite', 'relance', 'date ag', 'rdv', 'motif', 'total'];
const TYPES_COPIES = ['drop_down', 'labels', 'number', 'currency', 'emoji', 'short_text', 'text', 'url', 'checkbox', 'date'];

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Sous-fiche scénario encore à trancher (ni retenue, ni écartée)
export const estScenario = (nom: string) => /^\s*Sc[ée]nario\b/i.test(String(nom || ''));
// Sous-fiche scénario, tranchée ou non (pour la ranger au passage au Parc)
export const estScenarioOuRetenu = (nom: string) => estScenario(nom) || String(nom || '').startsWith(PREFIXE_RETENU);
export const scenariosActifs = (fiche: any): any[] =>
  (Array.isArray(fiche?.subtasks) ? fiche.subtasks : []).filter((s: any) => estScenario(s?.name) && !s?.archived);

// Sous-tâches archivées d'une fiche (les non retenus) : absentes de include_subtasks, mais elles suivent la fiche lors
// d'un déplacement. Leurs statuts doivent figurer dans la correspondance, sinon elles gardent un statut inconnu de la
// liste d'arrivée (test du 14/10 : une correspondance de tous les statuts de la liste est refusée par ClickUp).
export async function sousTachesArchivees(token: string, listeId: string, parentId: string): Promise<any[]> {
  const trouvees: any[] = [];
  for (let page = 0; page < 20; page++) {
    const res = await api(token, `/list/${listeId}/task?archived=true&subtasks=true&include_closed=true&page=${page}`);
    if (!res.ok) break;
    const json = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    trouvees.push(...lot.filter((t) => String(t?.parent || '') === String(parentId)));
    if (json?.last_page !== false || !lot.length) break;
  }
  return trouvees;
}

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

async function lireTache(token: string, id: string, sousTaches = false): Promise<any | null> {
  const res = await api(token, `/task/${encodeURIComponent(id)}?custom_task_ids=true${sousTaches ? '&include_subtasks=true' : ''}`);
  return res.ok ? res.json() : null;
}

async function commenter(token: string, id: string, texte: string) {
  const res = await api(token, `/task/${id}/comment`, 'POST', { comment_text: texte, notify_all: false });
  if (!res.ok) console.error(`Commentaire refusé (${res.status}) sur ${id}`);
}

async function costructor(token: string, chemin: string): Promise<Response> {
  let res: Response | null = null;
  for (let essai = 0; essai < 3; essai++) {
    res = await fetch(`${COSTRUCTOR}${chemin}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (res.status !== 429) return res;
    await new Promise((r) => setTimeout(r, 1500 * (essai + 1)));
  }
  return res as Response;
}

// Tous les devis (même lecture que src/app/api/devis/montant/route.ts). null = lecture impossible
async function listerDevis(token: string): Promise<any[] | null> {
  const tous: any[] = [];
  const vus = new Set<string>();
  for (let page = 1; page <= 20; page++) {
    const res = await costructor(token, `/quotes?_limit=100&limit=100&_page=${page}&page=${page}`);
    if (!res.ok) return page === 1 ? null : tous;
    const json = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    const nouveaux = lot.filter((d) => d?.id && !vus.has(d.id));
    if (!nouveaux.length) break;
    for (const d of nouveaux) { vus.add(d.id); tous.push(d); }
  }
  return tous;
}

const statutDe = (d: any) => String(d?.status || '').toLowerCase();
const clientDe = (d: any) => String(d?.customer?.id || d?.customerId || d?.customer_id || '');
function derniereVersion(devis: any[], d: any): any {
  if (!EXCLUS.includes(statutDe(d))) return d;
  return devis.find((x) => x.number === d.number && clientDe(x) === clientDe(d) && !EXCLUS.includes(statutDe(x))) || d;
}

const champs = (t: any): any[] => (Array.isArray(t?.custom_fields) ? t.custom_fields : []);
const lienDevisDe = (t: any) => String((champs(t).find((c) => c.id === CHAMP_LIEN_DEVIS) || champs(t).find((c) => normal(c.name).includes('lien devis')))?.value || '').trim();
function segmentDe(t: any): string {
  const f = champs(t).find((c) => c.id === CHAMP_SEGMENT);
  if (!f || f.value === undefined || f.value === null || f.value === '') return '';
  const o = (f.type_config?.options || []).find((x: any) => x.orderindex === Number(f.value) || x.id === f.value);
  return normal(String(o?.name || '')).trim();
}

// Passeport du client (téléphone, email, type client, adresse, lien Costructor), relu sur le projet
function passeport(fiche: any): { id: string; nom: string; v: any }[] {
  const sortie: { id: string; nom: string; v: any }[] = [];
  for (const f of champs(fiche)) {
    if (!NON_COPIES.has(f.id) || f.id === CHAMP_ALERTE) continue;
    const v = f.value;
    if (v === undefined || v === null || v === '') continue;
    if (f.type === 'location') {
      const loc = v?.location || {};
      if (v?.formatted_address) sortie.push({ id: f.id, nom: String(f.name), v: { location: { lat: loc.lat, lng: loc.lng }, formatted_address: v.formatted_address } });
    } else if (f.type === 'drop_down') {
      const o = (f.type_config?.options || []).find((x: any) => x.orderindex === Number(v) || x.id === v);
      if (o) sortie.push({ id: f.id, nom: String(f.name), v: String(o.id) });
    } else sortie.push({ id: f.id, nom: String(f.name), v: String(v) });
  }
  return sortie;
}

async function statutNomme(token: string, listeId: string, mot: string): Promise<string | null> {
  const res = await api(token, `/list/${listeId}`);
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  const s = (Array.isArray(json?.statuses) ? json.statuses : []).find((x: any) => normal(x.status).includes(mot));
  return s ? String(s.status) : null;
}

// Autre payeur : le scénario devient un projet à part (voir en tête). null = création impossible
async function separer(token: string, fiche: any, a: any): Promise<{ id: string; url: string; statut: boolean; nonCopies: string[] } | null> {
  const listeId = String(fiche?.list?.id || '');
  const nomScenario = a.nom.replace(/^\s*Sc[ée]nario\s*[A-Z0-9]*\s*:?\s*/i, '').trim() || a.nom;
  const nom = `${String(fiche.name || '').trim()} · ${nomScenario}`;
  const res = await api(token, `/list/${listeId}/task`, 'POST', {
    name: nom,
    description: `Projet séparé issu du ${a.nom} de ${String(fiche.name || '').trim()} (autre payeur, devis à part). Projet infra : https://app.clickup.com/t/${fiche.id}`,
    ...(await champType(token, 'projet')),
  });
  if (!res.ok) return null;
  const t = await res.json();
  const nonCopies: string[] = [];
  for (const { id, nom: n, v } of passeport(fiche)) {
    if (!(await api(token, `/task/${t.id}/field/${id}`, 'POST', { value: v })).ok) nonCopies.push(n);
  }
  for (const f of champs(a.tache)) {
    const v = valeurACopier(f);
    if (v === undefined) continue;
    if (!(await api(token, `/task/${t.id}/field/${f.id}`, 'POST', { value: v })).ok) nonCopies.push(String(f.name));
  }
  await api(token, `/task/${t.id}/link/${fiche.id}`, 'POST');
  // En dernier : le passage en devis envoyé lance la relance J+3 et le montant à partir du 🔗 Lien devis recopié
  const envoye = await statutNomme(token, listeId, 'devis envoy');
  const statut = envoye ? (await api(token, `/task/${t.id}`, 'PUT', { status: envoye })).ok : false;
  return { id: String(t.id), url: String(t.url || `https://app.clickup.com/t/${t.id}`), statut, nonCopies };
}

const quoteId = (lien: string) => (lien.match(/quote_[a-z0-9]+/i) || [])[0] || '';

// Garde (même règle que src/lib/passageGagne.ts) : null = autorisé
function garde(fiche: any, simulation: boolean): string | null {
  if (fiche.parent) return 'ignore_sous_tache';
  const liste = String(fiche?.list?.id ?? '');
  const qualif = String(getQualificationListId() || '');
  if (process.env.VERCEL_ENV === 'production') return liste === qualif ? null : 'ignore_hors_qualification';
  if (liste !== qualif && liste !== QUALIFICATION_PROD_ID) return 'ignore_hors_qualification';
  if (simulation) return null;
  return liste === qualif || normal(fiche.name).startsWith('test') ? null : 'refuse_preview_fiche_reelle';
}

// Valeur d'un champ, prête à être réécrite sur une autre tâche de la même liste. undefined = ne pas copier
function valeurACopier(f: any): any {
  const v = f?.value;
  if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return undefined;
  if (NON_COPIES.has(f.id) || MOTS_NON_COPIES.some((m) => normal(f.name).includes(m))) return undefined;
  if (!TYPES_COPIES.includes(String(f.type))) return undefined;
  if (f.type === 'drop_down') {
    const o = (f.type_config?.options || []).find((x: any) => x.orderindex === Number(v) || x.id === v);
    return o ? String(o.id) : undefined;
  }
  if (f.type === 'labels') return (Array.isArray(v) ? v : []).map((x: any) => String(x?.id ?? x));
  if (['number', 'currency', 'emoji', 'date'].includes(f.type)) return Number(v);
  if (f.type === 'checkbox') return v === true || v === 'true';
  return String(v);
}

export async function traiterScenarios(taskId: string, simulation: boolean, forcerSigne = '') {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { success: false, error: 'Configuration serveur incomplète' };
  const fiche = await lireTache(token, taskId, true);
  if (!fiche) return { success: false, error: 'Fiche introuvable' };
  const refus = garde(fiche, simulation);
  if (refus) return { success: true, action: refus, simulation };
  if (!normal(fiche?.status?.status).includes('gagn')) return { success: true, action: 'ignore_plus_gagne', simulation };

  const id = String(fiche.id);
  const sous: any[] = Array.isArray(fiche?.subtasks) ? fiche.subtasks : [];
  const aTrancher = scenariosActifs(fiche);
  if (!aTrancher.length) {
    return { success: true, action: sous.some((s) => String(s?.name || '').startsWith(PREFIXE_RETENU)) ? 'deja_fait' : 'sans_scenario', simulation };
  }
  const bloquer = async (action: string, texte: string, extra: any = {}) => {
    if (!simulation) await alerter(token, id, texte);
    return { success: true, action, bloque: true, commentaire: texte, simulation, ...extra };
  };

  const co = process.env.COSTRUCTOR_API_KEY;
  if (!co) return bloquer('bloque_configuration', '⚠️ Projet gagné, mais je ne peux pas lire Costructor (configuration) pour trouver le scénario retenu. Colle le lien du devis retenu dans 🔗 Lien devis de la fiche, puis repasse-la en 🔥 en négociation et en 🏆 gagné.');
  const devis = await listerDevis(co);
  if (!devis) return bloquer('bloque_costructor', '⚠️ Projet gagné, mais Costructor ne répond pas : scénario retenu non trouvé, rien n\'a bougé. Repasse la fiche en 🔥 en négociation puis en 🏆 gagné dans quelques minutes.');

  const preview = process.env.VERCEL_ENV !== 'production';
  // Lecture complète de chaque scénario (champs avec leurs options)
  const analyse: any[] = [];
  for (const s of aTrancher) {
    const t = (await lireTache(token, String(s.id))) || s;
    const lien = lienDevisDe(t);
    const qid = quoteId(lien);
    const d0 = qid ? devis.find((d) => d.id === qid) : devis.find((d) => lien && d.hostedUrl && lien.startsWith(String(d.hostedUrl).split('?')[0]));
    const d = d0 ? derniereVersion(devis, d0) : null;
    const force = preview && !!forcerSigne && String(s.id) === forcerSigne;
    analyse.push({
      tache: t, id: String(s.id), nom: String(s.name || ''), lien: lien || null, devisId: d ? String(d.id) : (qid || null),
      numero: d ? String(d.number || '') : '', statut: d ? String(LIBELLES_STATUT[statutDe(d)] || d.status || '') : (lien ? 'introuvable' : 'pas de lien'),
      signe: force || (!!d && SIGNES.includes(statutDe(d))), force, enAttente: !!d && statutDe(d) === 'open',
    });
  }
  const resume = analyse.map(({ tache, ...a }) => a);

  // Choix manuel : le devis déjà collé dans 🔗 Lien devis de la fiche désigne le retenu
  const lienFiche = quoteId(lienDevisDe(fiche));
  let retenu = lienFiche ? analyse.find((a) => a.devisId === lienFiche) : undefined;
  const via = retenu ? 'lien_fiche' : 'devis_signe';
  if (!retenu) {
    const signes = analyse.filter((a) => a.signe);
    const sansLien = analyse.filter((a) => !a.lien).map((a) => a.nom);
    if (signes.length !== 1) {
      const quoi = signes.length === 0
        ? `aucun scénario n'a de devis signé dans Costructor${sansLien.length ? ` (sans 🔗 Lien devis : ${sansLien.join(', ')})` : ''}`
        : `${signes.length} scénarios ont un devis signé (${signes.map((a) => a.nom).join(', ')})`;
      return bloquer(signes.length === 0 ? 'bloque_aucun_signe' : 'bloque_plusieurs_signes',
        `⚠️ Projet gagné, mais ${quoi}. Rien n'a bougé. Colle le lien du devis retenu dans 🔗 Lien devis de la fiche (ou sur la sous-fiche du scénario), puis repasse la fiche en 🔥 en négociation et en 🏆 gagné.`,
        { scenarios: resume });
    }
    retenu = signes[0];
  }
  const autres = analyse.filter((a) => a.id !== retenu.id);
  // Autre payeur : retenu COP, non retenu PAR (décision du 14/10)
  const aSeparer = segmentDe(retenu.tache) === 'cop' ? autres.filter((a) => segmentDe(a.tache) === 'par') : [];
  const aArchiver = autres.filter((a) => !aSeparer.includes(a));
  const aCopier = champs(retenu.tache).map((f) => ({ f, v: valeurACopier(f) })).filter((x) => x.v !== undefined);
  if (simulation) {
    return { success: true, action: 'retiendrait', via, retenu: retenu.nom, nonRetenus: aArchiver.map((a) => a.nom), projetsSepares: aSeparer.map((a) => a.nom), champs: aCopier.map((x) => x.f.name), scenarios: resume, simulation };
  }

  // 1. Champs du scénario retenu recopiés sur le projet
  const nonCopies: string[] = [];
  for (const { f, v } of aCopier) {
    const r = await api(token, `/task/${id}/field/${f.id}`, 'POST', { value: v });
    if (!r.ok) nonCopies.push(String(f.name));
  }
  // 2. Retenu renommé, autres renommés et archivés
  const renomme = await api(token, `/task/${retenu.id}`, 'PUT', { name: `${PREFIXE_RETENU}${retenu.nom}` });
  const archives: string[] = [];
  const nonArchives: string[] = [];
  const separes: any[] = [];
  for (const a of aSeparer) {
    const p = await separer(token, fiche, a);
    if (!p) { nonArchives.push(`${a.nom} (projet séparé non créé)`); continue; }
    separes.push({ nom: a.nom, ...p });
    const r = await api(token, `/task/${a.id}`, 'PUT', { name: `${PREFIXE_SEPARE}${a.nom}`, archived: true });
    if (!r.ok) nonArchives.push(a.nom);
  }
  for (const a of aArchiver) {
    const r = await api(token, `/task/${a.id}`, 'PUT', { name: `${PREFIXE_NON_RETENU}${a.nom}`, archived: true });
    const j = r.ok ? await r.json().catch(() => ({})) : {};
    if (r.ok && j?.archived !== false) archives.push(a.nom); else nonArchives.push(a.nom);
  }

  // 3. Synthèse sur le projet, et rappel au commercial pour les devis restés « En attente »
  const ligne = (a: any) => `${a.nom}${a.numero ? ` (devis ${a.numero}, ${a.statut})` : a.lien ? '' : ' (sans devis)'}`;
  const lignes = [
    `🎯 Scénario retenu : ${ligne(retenu)}${via === 'lien_fiche' ? ', désigné par le 🔗 Lien devis de la fiche' : ', devis signé'}. Son relevé et son devis sont recopiés sur la fiche.`,
  ];
  if (aArchiver.length) lignes.push(`Non retenus, archivés dans le projet (« afficher les archivées » pour les revoir) : ${aArchiver.map(ligne).join(' ; ')}.`);
  for (const p of separes) lignes.push(`🔀 Autre payeur : ${p.nom} devient un projet séparé, en 📩 devis envoyé${p.statut ? '' : ' (statut à poser à la main)'} : ${p.url}${p.nonCopies.length ? ` ⚠️ Champs à reprendre : ${p.nonCopies.join(', ')}.` : ''}`);
  if (nonCopies.length) lignes.push(`⚠️ Champs non recopiés, à reprendre à la main depuis le scénario : ${nonCopies.join(', ')}.`);
  if (!renomme.ok) lignes.push('⚠️ Le scénario retenu n\'a pas pu être renommé « ✅ Retenu ».');
  if (nonArchives.length) lignes.push(`⚠️ Non archivés (à archiver à la main) : ${nonArchives.join(', ')}.`);
  await commenter(token, id, lignes.join('\n'));
  const enAttente = aArchiver.filter((a) => a.enAttente && a.numero);
  if (enAttente.length) {
    await alerter(token, id, `📝 Scénario retenu : ${retenu.nom}. Pense à passer en « refusé » dans Costructor ${enAttente.length > 1 ? 'les devis non retenus' : 'le devis non retenu'} ${enAttente.map((a) => a.numero).join(', ')}, sinon ${enAttente.length > 1 ? 'ils restent' : 'il reste'} « En attente ».`);
  }
  return { success: !nonCopies.length && renomme.ok && !nonArchives.length, action: 'retenu', via, retenu: retenu.nom, archives, nonArchives, nonCopies, separes, champsCopies: aCopier.length, scenarios: resume };
}
