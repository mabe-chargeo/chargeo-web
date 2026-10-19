import { aujourdhuiParis, echeanceClickUp, libelleJour, type Jour } from '@/lib/joursOuvres';
import { alerter } from '@/lib/alerteSite';
import { FACTURES_ID, CHAMP_ECHEANCE, lireStatut, traiterRelance } from '@/lib/relancesFacture';

// Remplissage automatique des factures clients depuis Costructor (Matthieu, 18/10/2026, 18 h 38 : « il faut reporter
// manuellement le numéro de facture, on a pas créé des champs et tout ça qui sont censés se remplir ? », puis 18 h 41
// « Oui, remplissage automatique » et 18 h 57 « on vérifie sur la première vraie facture »).
// Pour une tâche de Factures Clients en 📄 à émettre, sans 🧾 N° facture : le site cherche la facture finalisée dans
// Costructor (pas un brouillon, pas annulée, pas un avoir, pas déjà reprise par une autre tâche) :
// 1. du devis signé (📝 Réf. devis signé) si Costructor relie ses factures au devis, sinon du client (Lien Costructor) ;
// 2. du même type (acompte, situation, solde) quand Costructor le donne.
// Une seule trouvée : 🧾 N° facture, Montant HT et Date d'échéance remplis, passage en 📤 émise, première relance
// programmée (src/lib/relancesFacture.ts), commentaire. Sans date d'échéance dans Costructor : n° et montant remplis,
// statut inchangé, alerte au back-office. Plusieurs possibles : rien n'est choisi, alerte avec la liste (une fois par
// jour). Aucune : rien (la facture n'est pas encore émise).
// Déclenché à l'ouverture de l'écran facture (back-office, direction) et chaque matin par le contrôle quotidien.
// À vérifier sur la première vraie facture (Costructor n'en avait aucune le 18/10) : noms des champs de l'API externe
// (client, devis, type, échéance), lus ici sous plusieurs noms possibles. Montants : centimes, comme les devis
// (variable Vercel COSTRUCTOR_MONTANTS_CENTIMES=0 si cela change).
// En preview : écriture seulement sur une facture « Test… ».

const COSTRUCTOR = 'https://api.costructor.co/external/v1';
const CHAMP = {
  numero: 'acb6da97-630a-4421-8a0b-1533b1cc0338',
  montant: 'b1ed211d-fa1a-452a-a955-a45cbc57ebe7',
  ref: '70524913-0dea-4ce4-828e-fea0338a6d1f',
  lien: '87363f81-73a0-4928-b637-5a1c63fdc075',
  type: '2885d2af-84ee-4c56-aa4d-3be5e2efd671',
};
const MARQUE = '🔎 Facture Costructor';

type Genre = 'acompte' | 'solde' | 'situation' | '';
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const euros = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT`;
const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c.id === id);
const texte = (t: any, id: string) => { const v = champ(t, id)?.value; return v === undefined || v === null ? '' : String(v).trim(); };

async function clickup(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
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

// Liste paginée de Costructor (factures ou devis). null = lecture impossible.
async function lister(token: string, ressource: 'invoices' | 'quotes'): Promise<any[] | null> {
  const tous: any[] = [];
  const vus = new Set<string>();
  for (let page = 1; page <= 20; page++) {
    const res = await costructor(token, `/${ressource}?_limit=100&limit=100&_page=${page}&page=${page}`);
    if (!res.ok) return page === 1 ? null : tous;
    const json = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    const nouveaux = lot.filter((x) => x?.id && !vus.has(x.id));
    if (!nouveaux.length) break;
    for (const x of nouveaux) { vus.add(x.id); tous.push(x); }
  }
  return tous;
}

// ---------- Lecture tolérante d'une facture Costructor ----------
const clientDe = (f: any) => String(f?.customer?.id || f?.customerId || f?.customer_id || f?.contactId || '');
const devisIdDe = (f: any) => String(f?.quoteId || f?.quote_id || f?.quote?.id || f?.sourceQuoteId || '');
const devisNumDe = (f: any) => String(f?.quote?.number || f?.quoteNumber || f?.quote_number || '');
function genreDe(f: any): Genre {
  const v = normal([f?.kind, f?.invoiceType, f?.invoice_type, f?.mode, f?.billingType, f?.category, f?.subtype].filter(Boolean).join(' '));
  if (/down|acompte|deposit|advance/.test(v)) return 'acompte';
  if (/situation|progress/.test(v)) return 'situation';
  if (/final|solde|balance/.test(v)) return 'solde';
  return '';
}
function montantHT(f: any): number | null {
  for (const c of ['subtotal', 'subTotal', 'totalExclTax', 'total_ht', 'amountExclTax']) {
    const dec = f?.[`${c}Decimal`];
    if (typeof dec === 'string' && dec !== '') return Number(dec);
    const v = f?.[c];
    if (v === undefined || v === null || v === '') continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    return process.env.COSTRUCTOR_MONTANTS_CENTIMES !== '0' ? Math.round(n) / 100 : n;
  }
  return null;
}
function echeanceDe(f: any): Jour | null {
  const v = f?.dueDate ?? f?.due_date ?? f?.dueAt ?? f?.paymentDueDate ?? f?.dueOn;
  if (v === undefined || v === null || v === '') return null;
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return { a: Number(m[1]), m: Number(m[2]), j: Number(m[3]) };
  const d = new Date(/^\d+$/.test(s) ? Number(s) : s);
  return Number.isNaN(d.getTime()) ? null : aujourdhuiParis(d);
}
const utilisable = (f: any) => {
  const s = normal(f?.status);
  return String(f?.type || 'invoice') !== 'credit' && !!String(f?.number || '').trim() && s !== 'draft' && !s.includes('annul') && s !== 'cancelled';
};

function genreTache(t: any): Genre {
  const f = champ(t, CHAMP.type);
  const o = (f?.type_config?.options || []).find((x: any) => String(x.id) === String(f?.value) || Number(x.orderindex) === Number(f?.value));
  const n = normal(o?.name || t?.name);
  return n.includes('acompte') ? 'acompte' : n.includes('situation') ? 'situation' : n.includes('solde') ? 'solde' : '';
}

type Contexte = { factures: any[]; devis: any[] | null; taches: any[] };

// Tâches de Factures Clients (non archivées), avec leurs champs
async function tachesFactures(cu: string): Promise<any[] | null> {
  const toutes: any[] = [];
  for (let page = 0; page < 10; page++) {
    const res = await clickup(cu, `/list/${FACTURES_ID}/task?include_closed=true&archived=false&page=${page}`);
    if (!res.ok) return page === 0 ? null : toutes;
    const json = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    toutes.push(...lot.filter((t) => !t.parent));
    if (json?.last_page !== false || lot.length === 0) break;
  }
  return toutes;
}

// Factures Costructor possibles pour une tâche (sans rien écrire)
function candidatesPour(t: any, ctx: Contexte): { liste: any[]; ambigu: boolean; par: 'devis' | 'client' | '' } {
  const id = String(t.id);
  const pris = new Set(ctx.taches.filter((x) => String(x.id) !== id).map((x) => texte(x, CHAMP.numero)).filter(Boolean));
  const libres = ctx.factures.filter((f) => utilisable(f) && !pris.has(String(f.number).trim()));
  const ref = texte(t, CHAMP.ref);
  const clientId = (texte(t, CHAMP.lien).match(/cnt_[a-z0-9]+/i) || [])[0] || '';
  const idsDevis = ref && ctx.devis ? ctx.devis.filter((d) => String(d?.number || '') === ref).map((d) => String(d.id)) : [];
  const parDevis = ref ? libres.filter((f) => (devisIdDe(f) && idsDevis.includes(devisIdDe(f))) || devisNumDe(f) === ref) : [];
  const parClient = clientId ? libres.filter((f) => clientDe(f) === clientId) : [];
  const base = parDevis.length ? parDevis : parClient;
  const par = parDevis.length ? 'devis' : parClient.length ? 'client' : '';
  const genre = genreTache(t);
  const typees = base.some((f) => genreDe(f)) && genre ? base.filter((f) => genreDe(f) === genre) : base;
  // Type inconnu dans Costructor et plusieurs factures à émettre pour la même affaire : on ne devine pas laquelle
  const soeurs = ctx.taches.filter((x) => String(x.id) !== id && lireStatut(String(x?.status?.status || '')) === 'a_emettre' && !texte(x, CHAMP.numero)
    && ((ref && texte(x, CHAMP.ref) === ref) || (clientId && texte(x, CHAMP.lien).includes(clientId))));
  const ambigu = typees.length === 1 && !genreDe(typees[0]) && soeurs.length > 0;
  return { liste: typees, ambigu, par };
}

async function dejaSignaleAujourdhui(cu: string, id: string, jour: string): Promise<boolean> {
  const res = await clickup(cu, `/task/${id}/comment`);
  if (!res.ok) return false;
  const json = await res.json().catch(() => ({}));
  return (Array.isArray(json?.comments) ? json.comments : []).slice(0, 10)
    .some((c: any) => String(c?.comment_text || '').includes(MARQUE) && String(c?.comment_text || '').includes(jour));
}

// Traite une tâche : renvoie ce qui a été (ou serait) fait. alerter = signaler les cas « plusieurs » (contrôle du matin)
async function traiterTache(cu: string, t: any, ctx: Contexte, simulation: boolean, signaler: boolean): Promise<any> {
  const id = String(t.id);
  const nom = String(t.name || '');
  if (lireStatut(String(t?.status?.status || '')) !== 'a_emettre') return { facture: nom, action: 'pas_a_emettre' };
  if (texte(t, CHAMP.numero)) return { facture: nom, action: 'numero_deja_rempli' };
  if (process.env.VERCEL_ENV !== 'production' && !simulation && !normal(nom).trim().startsWith('test')) {
    return { facture: nom, action: 'preview_hors_test' };
  }
  const { liste, ambigu, par } = candidatesPour(t, ctx);
  if (!liste.length) return { facture: nom, action: 'aucune' };
  const jour = libelleJour(aujourdhuiParis());
  if (liste.length > 1 || ambigu) {
    const lignes = liste.slice(0, 6).map((f) => `• ${f.number}${montantHT(f) !== null ? ` · ${euros(montantHT(f) as number)}` : ''}`).join('\n');
    const texteAlerte = `${MARQUE} du ${jour} : ${liste.length > 1 ? `${liste.length} factures possibles` : 'une facture possible, mais plusieurs factures de cette affaire sont à émettre'} dans Costructor, aucune n'a été choisie. Reporte la bonne sur l'écran facture (n°, montant, paiement dû) :\n${lignes}`;
    if (!simulation && signaler && !(await dejaSignaleAujourdhui(cu, id, jour))) await alerter(cu, id, texteAlerte);
    return { facture: nom, action: 'plusieurs', candidates: liste.map((f) => f.number), signale: signaler && !simulation };
  }

  const f = liste[0];
  const numero = String(f.number).trim();
  const montant = montantHT(f);
  const du = echeanceDe(f);
  const resume = { facture: nom, numero, montant, echeance: du ? libelleJour(du) : null, par };
  if (simulation) return { ...resume, action: du ? 'associerait' : 'associerait_sans_echeance' };

  const ecrits = [await clickup(cu, `/task/${id}/field/${CHAMP.numero}`, 'POST', { value: numero })];
  if (montant !== null && montant > 0) ecrits.push(await clickup(cu, `/task/${id}/field/${CHAMP.montant}`, 'POST', { value: Math.round(montant * 100) / 100 }));
  if (du) ecrits.push(await clickup(cu, `/task/${id}/field/${CHAMP_ECHEANCE}`, 'POST', { value: echeanceClickUp(du), value_options: { time: false } }));
  if (ecrits.some((r) => !r.ok)) {
    console.error('Facture Costructor : champ refusé', id);
    return { ...resume, action: 'erreur_ecriture' };
  }
  const details = `n° ${numero}${montant !== null ? `, ${euros(montant)}` : ''}${du ? `, paiement dû le ${libelleJour(du)}` : ''}`;
  if (!du) {
    await alerter(cu, id, `${MARQUE} du ${jour} : facture retrouvée (${details}), mais sans date d'échéance dans Costructor. Indique « Paiement dû le » sur l'écran facture pour lancer les relances.`);
    return { ...resume, action: 'associee_sans_echeance' };
  }
  const liste2 = await clickup(cu, `/list/${FACTURES_ID}`);
  const statuts: any[] = liste2.ok ? (await liste2.json().catch(() => ({})))?.statuses || [] : [];
  const emise = String(statuts.find((s: any) => lireStatut(String(s?.status || '')) === 'emise')?.status || '📤 émise');
  const maj = await clickup(cu, `/task/${id}`, 'PUT', { status: emise });
  await clickup(cu, `/task/${id}/comment`, 'POST', {
    comment_text: `${MARQUE} retrouvée automatiquement (par ${par === 'devis' ? 'le devis' : 'le client'}) : ${details}.${maj.ok ? ' Facture passée en 📤 émise.' : ' ⚠️ Statut non changé : passe-la en 📤 émise.'}`,
    notify_all: false,
  });
  const relance = maj.ok ? (await traiterRelance(id, false).catch((e) => ({ status: 500, body: { success: false, error: String(e) } }))).body : null;
  return { ...resume, action: maj.ok ? 'associee' : 'associee_statut_refuse', relance };
}

async function contexte(cu: string, co: string): Promise<Contexte | { erreur: string }> {
  const [factures, taches] = await Promise.all([lister(co, 'invoices'), tachesFactures(cu)]);
  if (!factures) return { erreur: 'Lecture des factures Costructor impossible' };
  if (!taches) return { erreur: 'Lecture de Factures Clients impossible' };
  // Les devis ne servent qu'à relier une facture à « Réf. devis signé » par son identifiant
  const besoinDevis = factures.some((f) => devisIdDe(f) && !devisNumDe(f));
  const devis = besoinDevis ? await lister(co, 'quotes') : null;
  return { factures, devis, taches };
}

// Écran facture : une tâche
export async function retrouverFacture(taskId: string): Promise<any> {
  const cu = process.env.CLICKUP_API_KEY;
  const co = process.env.COSTRUCTOR_API_KEY;
  if (!cu || !co) return { success: false, error: 'Configuration serveur incomplète' };
  const ctx = await contexte(cu, co);
  if ('erreur' in ctx) return { success: false, error: ctx.erreur };
  const t = ctx.taches.find((x) => String(x.id) === String(taskId));
  if (!t) return { success: false, error: 'Facture introuvable' };
  return { success: true, ...(await traiterTache(cu, t, ctx, false, false)) };
}

// Contrôle du matin : toutes les factures à émettre
export async function retrouverFacturesAEmettre(simulation: boolean): Promise<any> {
  const cu = process.env.CLICKUP_API_KEY;
  const co = process.env.COSTRUCTOR_API_KEY;
  if (!cu || !co) return { success: false, error: 'Configuration serveur incomplète' };
  const ctx = await contexte(cu, co);
  if ('erreur' in ctx) return { success: false, error: ctx.erreur };
  const aTraiter = ctx.taches.filter((t) => lireStatut(String(t?.status?.status || '')) === 'a_emettre' && !texte(t, CHAMP.numero));
  const resultats: any[] = [];
  for (const t of aTraiter) {
    const r = await traiterTache(cu, t, ctx, simulation, true).catch((e) => ({ facture: t.name, action: 'erreur', error: String(e) }));
    resultats.push(r);
    // Facture reprise : son n° n'est plus libre pour les suivantes
    if (!simulation && String(r?.action || '').startsWith('associee')) {
      t.custom_fields = [...(t.custom_fields || []).filter((c: any) => c.id !== CHAMP.numero), { id: CHAMP.numero, value: r.numero }];
    }
  }
  return { success: true, facturesCostructor: ctx.factures.length, aEmettre: aTraiter.length, resultats, simulation };
}
