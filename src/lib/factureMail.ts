// Relance de facture par mail depuis l'appli (Phase 9, lot 4, accord de Mathieu du 07/11/2026 à 10 h 22 : « Oui,
// vas-y »). S'appuie sur les relances existantes de Factures Clients (src/lib/relancesFacture.ts, J+3, J+10, J+15 après le
// paiement dû, rappel posé dans l'échéance de la tâche), sans les changer :
// - relances 1 (J+3) et 2 (J+10) : le jour du rappel, le mail « Facture · relance » est en attente sur l'écran de la
//   facture (factureAEnvoyer), facture 📤 émise ou 💵 partiellement payée seulement. Non bloquant ;
// - parti (ou client relancé par téléphone faute d'adresse), il compte comme la relance (noterRelanceFacture) :
//   Relances envoyées + 1, puis traiterRelance programme le rappel suivant, comme « J'ai relancé le client » ;
// - relance 3 (J+15) : inchangée, appel du back-office (pas de mail proposé).
// Données du texte (donneesFacture) : n°, type et paiement dû lus sur la tâche ; montant TTC, reste dû et lien en ligne
// lus sur la facture Costructor de ce n° (lecture seule). Un champ absent n'est jamais inventé : le texte met un
// [crochet]. Le client (adresse, nom, segment) vient du chantier relié par 🔗 Affaire.
import { aujourdhuiParis, comparer, type Jour } from '@/lib/joursOuvres';
import { FACTURES_ID, CHAMP_ECHEANCE, CHAMP_RELANCES, lireStatut, traiterRelance } from '@/lib/relancesFacture';
import type { FactureMail } from '@/lib/modelesMails';

export const CLE_MAIL_FACTURE = 'facture-relance';
// Relances faites par mail : la 1 (J+3) et la 2 (J+10) ; la 3 (J+15) reste l'appel du back-office
export const RELANCES_PAR_MAIL = 2;

const API = 'https://api.clickup.com/api/v2';
const COSTRUCTOR = 'https://api.costructor.co/external/v1';
const CHAMP = {
  type: '2885d2af-84ee-4c56-aa4d-3be5e2efd671',
  numero: 'acb6da97-630a-4421-8a0b-1533b1cc0338',
  affaire: '70f095a0-d0ec-413a-9ed9-fbc763306869',
  client: '00a44fea-ea64-4350-be16-9c6e505373b4',
};

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c?.id === id);
const texte = (t: any, id: string) => { const v = champ(t, id)?.value; return v === undefined || v === null ? '' : String(v).trim(); };
const jourDe = (ms: unknown): Jour | null => (ms ? aujourdhuiParis(new Date(Number(ms))) : null);
const iso = (d: Jour) => `${d.a}-${String(d.m).padStart(2, '0')}-${String(d.j).padStart(2, '0')}`;
const relances = (t: any) => Math.max(0, Math.floor(Number(champ(t, CHAMP_RELANCES)?.value ?? 0) || 0));

// Tâche de Factures Clients (pas une sous-tâche)
export const estFacture = (t: any) => !!t && !t.parent && String(t?.list?.id || '') === String(FACTURES_ID);
// Chantier relié (premier 🔗 Affaire) et nom du client écrit sur la facture
export function affaireDe(t: any): string {
  const v = champ(t, CHAMP.affaire)?.value;
  const l: any[] = Array.isArray(v) ? v : [];
  return String(l[0]?.id ?? l[0] ?? '');
}
export const clientDeFacture = (t: any) => texte(t, CHAMP.client);

// N° de la relance à faire par mail aujourd'hui (1 ou 2), null sinon : facture émise ou partiellement payée, paiement
// dû dépassé, rappel de relance arrivé, moins de 2 relances faites
export function factureAEnvoyer(t: any): number | null {
  if (!estFacture(t)) return null;
  const etat = lireStatut(String(t?.status?.status || ''));
  if (etat !== 'emise' && etat !== 'partielle') return null;
  const n = relances(t);
  if (n >= RELANCES_PAR_MAIL) return null;
  const rappel = jourDe(t?.due_date);
  const du = jourDe(champ(t, CHAMP_ECHEANCE)?.value);
  const auj = aujourdhuiParis();
  if (!rappel || !du || comparer(du, auj) >= 0 || comparer(rappel, auj) > 0) return null;
  return n + 1;
}

function genreDe(t: any): string {
  const f = champ(t, CHAMP.type);
  const o = (Array.isArray(f?.type_config?.options) ? f.type_config.options : []).find((x: any) => String(x?.id) === String(f?.value) || Number(x?.orderindex) === Number(f?.value));
  const n = normal(o?.name || t?.name);
  return n.includes('acompte') ? 'acompte' : n.includes('situation') ? 'situation' : n.includes('solde') ? 'solde' : '';
}

// ── Facture Costructor (lecture seule) ──
const centimes = (n: number) => (process.env.COSTRUCTOR_MONTANTS_CENTIMES !== '0' ? Math.round(n) / 100 : Math.round(n * 100) / 100);
function montant(f: any, noms: string[]): number | null {
  for (const c of noms) {
    const dec = f?.[`${c}Decimal`];
    if (typeof dec === 'string' && dec.trim()) {
      const n = Number(dec);
      if (Number.isFinite(n)) return n;
    }
    const v = f?.[c];
    if (v === undefined || v === null || v === '') continue;
    const n = Number(v);
    if (Number.isFinite(n)) return centimes(n);
  }
  return null;
}
const TTC = ['total', 'totalInclTax', 'total_ttc', 'netToPay'];
const RESTE = ['amountDue', 'amount_due', 'remainingAmount', 'remaining_amount', 'balanceDue', 'balance_due', 'leftToPay', 'left_to_pay'];
const lienDe = (f: any) => {
  const l = String(f?.hostedUrl || f?.hosted_url || f?.publicUrl || f?.public_url || f?.shareUrl || f?.share_url || '').trim();
  return /^https:\/\/\S+$/i.test(l) ? l : '';
};

async function costructor(token: string, chemin: string): Promise<Response> {
  let res: Response | null = null;
  for (let essai = 0; essai < 3; essai++) {
    res = await fetch(`${COSTRUCTOR}${chemin}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (res.status !== 429) return res;
    await new Promise((r) => setTimeout(r, 1500 * (essai + 1)));
  }
  return res as Response;
}

// Facture de ce n° dans Costructor, relue en détail (null si absente)
async function factureCostructor(co: string, numero: string): Promise<{ f: any | null; erreur?: string }> {
  const vus = new Set<string>();
  for (let page = 1; page <= 20; page++) {
    const r = await costructor(co, `/invoices?_limit=100&limit=100&_page=${page}&page=${page}`);
    if (!r.ok) return page === 1 ? { f: null, erreur: 'lecture des factures Costructor impossible : réessaie dans quelques minutes' } : { f: null };
    const j = await r.json().catch(() => ({}));
    const lot: any[] = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
    const nouveaux = lot.filter((x) => x?.id && !vus.has(String(x.id)));
    if (!nouveaux.length) break;
    nouveaux.forEach((x) => vus.add(String(x.id)));
    const f = nouveaux.find((x) => String(x?.number || '').trim() === numero && String(x?.type || 'invoice') !== 'credit');
    if (f) {
      const d = await costructor(co, `/invoices/${encodeURIComponent(String(f.id))}`);
      const jd = d.ok ? await d.json().catch(() => null) : null;
      const detail = jd?.data && typeof jd.data === 'object' && !Array.isArray(jd.data) ? jd.data : jd;
      return { f: detail?.id ? { ...f, ...detail } : f };
    }
  }
  return { f: null };
}

// Données de la facture pour le texte du mail. avecCostructor = false : sans montant ni lien (contrôle d'adresse)
export async function donneesFacture(t: any, avecCostructor = true): Promise<{ facture: FactureMail; problemes: string[] }> {
  const numero = texte(t, CHAMP.numero);
  const du = jourDe(champ(t, CHAMP_ECHEANCE)?.value);
  const facture: FactureMail = {
    numero,
    genre: genreDe(t),
    ttc: null,
    reste: null,
    partielle: lireStatut(String(t?.status?.status || '')) === 'partielle',
    echeance: du ? iso(du) : '',
    rappel: Math.min(relances(t) + 1, RELANCES_PAR_MAIL),
    lien: '',
    jointe: false,
  };
  const problemes: string[] = [];
  if (!avecCostructor) return { facture, problemes };
  const co = process.env.COSTRUCTOR_API_KEY;
  if (!co) problemes.push('clé Costructor absente : montant à écrire à la main');
  else if (!numero) problemes.push('n° de facture vide : elle n’est pas encore reportée depuis Costructor');
  else {
    const lu: { f: any | null; erreur?: string } = await factureCostructor(co, numero).catch(() => ({ f: null, erreur: 'lecture des factures Costructor impossible' }));
    if (lu.erreur) problemes.push(lu.erreur);
    else if (!lu.f) problemes.push(`facture ${numero} introuvable dans Costructor`);
    else {
      facture.ttc = montant(lu.f, TTC);
      facture.reste = montant(lu.f, RESTE);
      facture.lien = lienDe(lu.f);
      // Reste dû inférieur au total : déjà réglée en partie, même si le statut ClickUp ne le dit pas encore
      if (facture.reste !== null && facture.ttc !== null && facture.reste > 0.005 && facture.reste < facture.ttc - 0.005) facture.partielle = true;
      if (facture.reste !== null && facture.reste <= 0.005) problemes.push(`Costructor indique la facture ${numero} comme réglée : vérifie avant d’envoyer, puis marque-la payée`);
    }
  }
  if (facture.partielle && facture.reste === null) problemes.push('reste dû introuvable dans Costructor : écris-le à la main');
  return { facture, problemes };
}

// Relance faite (mail parti, ou client appelé faute d'adresse) : Relances envoyées + 1, rappel suivant programmé
export async function noterRelanceFacture(token: string, t: any, mode: 'mail' | 'telephone', auteur: string): Promise<{ n: number; prochaine: string; probleme?: string }> {
  const n = relances(t) + 1;
  const id = encodeURIComponent(String(t.id));
  const r = await fetch(`${API}/task/${id}/field/${CHAMP_RELANCES}`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: n }),
    cache: 'no-store',
  });
  if (!r.ok) return { n: n - 1, prochaine: '', probleme: 'Relances envoyées non mis à jour' };
  await fetch(`${API}/task/${id}/comment`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment_text: `🔁 Relance ${n} faite ${mode === 'mail' ? 'par mail' : 'par téléphone'} depuis l'application par ${auteur}.`, notify_all: false }),
    cache: 'no-store',
  }).catch(() => null);
  const s = await traiterRelance(String(t.id), false).catch(() => null);
  const ok = !!s && s.status < 300;
  return { n, prochaine: ok ? String(s?.body?.rappel || '') : '', probleme: ok ? undefined : 'relance suivante non programmée' };
}
