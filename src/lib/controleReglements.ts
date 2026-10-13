import { aujourdhuiParis, comparer, libelleJour } from '@/lib/joursOuvres';
import { alerter } from '@/lib/alerteSite';

// Contrôle des règlements avant relance (Phase 4, relances impayés, décision Matthieu du 13/10/2026).
// Appelé chaque matin par le contrôle quotidien (src/app/api/cron/quotidien). Costructor fait référence pour les
// règlements : pour chaque facture de Factures Clients en 📤 émise ou 💵 partiellement payée dont le rappel de relance
// tombe aujourd'hui (ou est dépassé), le site relit la facture dans Costructor (🧾 N° facture Costructor) avant que
// quelqu'un ne relance le client :
// - réglée dans Costructor : alerte « ne relance pas », à passer en ✅ payée (le statut n'est jamais changé par le site) ;
// - règlement partiel : commentaire avec le reste dû ;
// - annulée dans Costructor : alerte, à vérifier ;
// - numéro vide ou facture introuvable : commentaire, vérifier dans Costructor avant de relancer ;
// - toujours due : rien (le rappel du jour reste valable).
// Un seul message par facture et par jour (relance du contrôle le même jour : pas de doublon).
// Simulation : rien n'est écrit.

const COSTRUCTOR = 'https://api.costructor.co/external/v1';
const FACTURES_ID = process.env.CLICKUP_FACTURES_LIST_ID || '1200630000003863';
const CHAMP_NUMERO = 'acb6da97-630a-4421-8a0b-1533b1cc0338';
const MARQUE = '🔎 Contrôle règlement';

const sansAccent = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const euros = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

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

// Toutes les factures Costructor (pagination comme les devis). null = lecture impossible.
async function listerFactures(token: string): Promise<any[] | null> {
  const toutes: any[] = [];
  const vues = new Set<string>();
  for (let page = 1; page <= 20; page++) {
    const res = await costructor(token, `/invoices?_limit=100&limit=100&_page=${page}&page=${page}`);
    if (!res.ok) return page === 1 ? null : toutes;
    const json = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    const nouveaux = lot.filter((f) => f?.id && !vues.has(f.id));
    if (!nouveaux.length) break;
    for (const f of nouveaux) { vues.add(f.id); toutes.push(f); }
  }
  return toutes;
}

// Montants : l'API externe renvoie des centimes pour les devis (vérifié le 11/10) ; même règle supposée pour les factures
// (variable Vercel COSTRUCTOR_MONTANTS_CENTIMES=0 si cela change). Champs décimaux utilisés en priorité s'ils existent.
function montant(f: any, cles: string[]): number | null {
  for (const c of cles) {
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
const resteDu = (f: any) => montant(f, ['amountDue', 'amountRemaining', 'remainingAmount', 'balance', 'leftToPay']);
const dejaPaye = (f: any) => montant(f, ['amountPaid', 'paidAmount', 'totalPaid']);

type Verdict = 'payee' | 'partielle' | 'annulee' | 'due' | 'introuvable' | 'sans_numero';

function juger(f: any | undefined, numero: string): { verdict: Verdict; reste?: number | null; paye?: number | null; statut?: string } {
  if (!numero) return { verdict: 'sans_numero' };
  if (!f) return { verdict: 'introuvable' };
  const statut = sansAccent(f.status || '');
  const libelle = String(f.statusLabel || f.status || '');
  const reste = resteDu(f);
  const paye = dejaPaye(f);
  if (statut === 'paid' || statut.includes('paye')) return { verdict: 'payee', statut: libelle };
  if (statut === 'cancelled' || statut.includes('annul')) return { verdict: 'annulee', statut: libelle };
  if (reste !== null && reste <= 0.005) return { verdict: 'payee', statut: libelle, reste };
  if (paye !== null && paye > 0.005) return { verdict: 'partielle', statut: libelle, reste, paye };
  return { verdict: 'due', statut: libelle, reste };
}

async function dejaControleAujourdhui(token: string, id: string, jour: string): Promise<boolean> {
  const res = await clickup(token, `/task/${id}/comment`);
  if (!res.ok) return false;
  const json = await res.json().catch(() => ({}));
  return (Array.isArray(json?.comments) ? json.comments : []).slice(0, 10)
    .some((c: any) => String(c?.comment_text || '').includes(MARQUE) && String(c?.comment_text || '').includes(jour));
}

export async function controlerReglements(simulation: boolean) {
  const cu = process.env.CLICKUP_API_KEY;
  const co = process.env.COSTRUCTOR_API_KEY;
  if (!cu || !co) return { success: false, error: 'Configuration serveur incomplète' };
  const aujourdhui = aujourdhuiParis();
  const jour = libelleJour(aujourdhui);

  // Factures ouvertes dont le rappel tombe aujourd'hui ou avant
  const aControler: any[] = [];
  for (let page = 0; page < 10; page++) {
    const res = await clickup(cu, `/list/${FACTURES_ID}/task?archived=false&page=${page}`);
    if (!res.ok) return { success: false, error: 'Lecture de Factures Clients impossible' };
    const json = await res.json().catch(() => ({}));
    const taches: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    for (const t of taches) {
      const s = sansAccent(t?.status?.status || '');
      if (t.parent || !(s.includes('emise') || s.includes('partiel')) || s.includes('litige') || !t.due_date) continue;
      if (comparer(aujourdhuiParis(new Date(Number(t.due_date))), aujourdhui) <= 0) aControler.push(t);
    }
    if (json?.last_page !== false || taches.length === 0) break;
  }
  if (!aControler.length) return { success: true, action: 'rien_a_controler', jour, simulation };

  const factures = await listerFactures(co);
  if (!factures) return { success: false, error: 'Lecture des factures Costructor impossible', aControler: aControler.length };

  const resultats: any[] = [];
  for (const t of aControler) {
    const numero = String((t.custom_fields || []).find((c: any) => c.id === CHAMP_NUMERO)?.value || '').trim();
    const f = numero ? factures.find((x) => String(x?.number || '').trim() === numero && String(x?.type || 'invoice') !== 'credit') : undefined;
    const j = juger(f, numero);
    const nom = String(t.name || '');
    let texte = '';
    let notifier = false;
    if (j.verdict === 'payee') {
      texte = `${MARQUE} du ${jour} : la facture ${numero} est réglée dans Costructor (« ${j.statut} »). Ne relance pas le client : passe cette tâche en ✅ payée.`;
      notifier = true;
    } else if (j.verdict === 'partielle') {
      texte = `${MARQUE} du ${jour} : règlement partiel dans Costructor${j.paye !== null && j.paye !== undefined ? ` (${euros(j.paye)} reçus)` : ''}${j.reste !== null && j.reste !== undefined ? `, reste dû ${euros(j.reste)}` : ''}. Relance seulement sur le reste dû, et passe la tâche en 💵 partiellement payée si ce n'est pas fait.`;
    } else if (j.verdict === 'annulee') {
      texte = `${MARQUE} du ${jour} : la facture ${numero} est annulée dans Costructor (« ${j.statut} »). Ne relance pas : vérifie, puis passe la tâche en 🚫 annulée.`;
      notifier = true;
    } else if (j.verdict === 'sans_numero') {
      texte = `${MARQUE} du ${jour} : 🧾 N° facture Costructor est vide, je ne peux pas vérifier le règlement. Regarde dans Costructor avant de relancer, et remplis le numéro.`;
    } else if (j.verdict === 'introuvable') {
      texte = `${MARQUE} du ${jour} : facture ${numero} introuvable dans Costructor. Vérifie le numéro et le règlement avant de relancer.`;
    }
    if (!texte) { resultats.push({ facture: nom, numero, verdict: j.verdict }); continue; }
    if (await dejaControleAujourdhui(cu, String(t.id), jour)) { resultats.push({ facture: nom, numero, verdict: j.verdict, action: 'deja_signale' }); continue; }
    if (!simulation) {
      if (notifier) await alerter(cu, String(t.id), texte);
      else await clickup(cu, `/task/${t.id}/comment`, 'POST', { comment_text: texte, notify_all: false });
    }
    resultats.push({ facture: nom, numero, verdict: j.verdict, action: simulation ? 'signalerait' : 'signale', commentaire: texte });
  }
  return { success: true, jour, controlees: aControler.length, facturesCostructor: factures.length, resultats, simulation };
}
