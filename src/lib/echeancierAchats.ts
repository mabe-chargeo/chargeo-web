import { aujourdhuiParis, ajouterJoursOuvres, comparer, libelleJour } from '@/lib/joursOuvres';
import { alerter } from '@/lib/alerteSite';

// Échéancier fournisseurs (Phase 4, achats et trésorerie, décision Matthieu du 13/10/2026).
// Appelé chaque matin par le contrôle quotidien (src/app/api/cron/quotidien), liste Achats Fournisseurs (v2).
// Reste à payer = 💶 Montant TTC à payer − 💵 Déjà payé TTC (vide = 0). Le HT engagé n'est jamais une sortie de
// trésorerie et la date de commande n'est jamais une échéance : seul 📅 Échéance de paiement compte.
// Pour chaque achat 📦 commandé, 📥 reçu ou ✅ soldé (demandes, à valider et annulés ignorés) :
// - échéance dans 2 jours ouvrés ou moins, reste dû : alerte « à payer avant le … », avec le reste ;
// - échéance dépassée, reste dû : alerte « en retard depuis le … » ;
// - ✅ soldé avec un reste dû : incohérence signalée ;
// - tout payé (reste nul) mais pas soldé : incohérence signalée (passer en ✅ soldé si la facture est bien réglée) ;
// - 📥 reçu avec un TTC à payer mais sans échéance : demande de la renseigner.
// Le site ne paie rien et ne change aucun statut. Alertes relayées au back-office (src/lib/alerteSite.ts).
// Un seul message par achat et par jour. Simulation : rien n'est écrit.

const ACHATS_ID = process.env.CLICKUP_ACHATS_LIST_ID || '1200630000003864';
const CHAMP_TTC = '076f2d6c-c78b-478a-81b2-d2915a6e5a99';
const CHAMP_PAYE = '7cdc528f-fbd3-4622-8c28-0cd591f7d7d5';
const CHAMP_ECHEANCE = '902d4b50-68fe-47c0-9ce9-c4e9c6322b85';
const CHAMP_FOURNISSEUR = '351b2b1d-e512-422f-b4b8-19549646f80e';
const CHAMP_FACTURE = 'ed86d7e4-c50b-4ff1-bf28-cb1c9aa36673';
const MARQUE = '💳 Échéancier fournisseur';
const PREAVIS_OUVRES = 2;

const sansAccent = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const euros = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC`;

async function clickup(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c.id === id);
function nombre(t: any, id: string): number | null {
  const v = champ(t, id)?.value;
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function option(t: any, id: string): string {
  const f = champ(t, id);
  if (!f || f.value === undefined || f.value === null || f.value === '') return '';
  const o = (f.type_config?.options || []).find((x: any) => x.orderindex === Number(f.value) || x.id === f.value);
  return String(o?.name || '');
}

function etape(statut: string): 'ignore' | 'engage' | 'solde' {
  const s = sansAccent(statut);
  if (s.includes('solde')) return 'solde';
  if (s.includes('commande') || s.includes('recu')) return 'engage';
  return 'ignore';
}

async function dejaSignaleAujourdhui(token: string, id: string, jour: string): Promise<boolean> {
  const res = await clickup(token, `/task/${id}/comment`);
  if (!res.ok) return false;
  const json = await res.json().catch(() => ({}));
  return (Array.isArray(json?.comments) ? json.comments : []).slice(0, 10)
    .some((c: any) => String(c?.comment_text || '').includes(MARQUE) && String(c?.comment_text || '').includes(jour));
}

// Constat pour un achat : null si rien à dire
export function constater(t: any, aujourdhui = aujourdhuiParis()): { type: string; texte: string } | null {
  const statut = String(t?.status?.status || '');
  const e = etape(statut);
  if (e === 'ignore') return null;
  const ttc = nombre(t, CHAMP_TTC);
  if (ttc === null) return null;
  const paye = nombre(t, CHAMP_PAYE) ?? 0;
  const reste = Math.round((ttc - paye) * 100) / 100;
  const qui = [option(t, CHAMP_FOURNISSEUR), String(champ(t, CHAMP_FACTURE)?.value || '').trim()].filter(Boolean).join(', facture ');
  const pour = qui ? ` (${qui})` : '';
  const jour = libelleJour(aujourdhui);

  if (e === 'solde') {
    if (reste > 0.01) return { type: 'solde_reste_du', texte: `${MARQUE} du ${jour} : achat ✅ soldé mais il reste ${euros(reste)} à payer${pour} (à payer ${euros(ttc)}, déjà payé ${euros(paye)}). Corrige 💵 Déjà payé TTC ou repasse l'achat en 📥 reçu.` };
    return null;
  }
  if (reste <= 0.01) return { type: 'paye_non_solde', texte: `${MARQUE} du ${jour} : tout est payé${pour}, ${euros(paye)}, mais l'achat est encore en « ${statut} ». Si la facture est bien réglée et le matériel reçu, passe-le en ✅ soldé.` };

  const brute = champ(t, CHAMP_ECHEANCE)?.value;
  if (!brute) {
    if (sansAccent(statut).includes('recu')) return { type: 'sans_echeance', texte: `${MARQUE} du ${jour} : ${euros(reste)} restent à payer${pour} mais 📅 Échéance de paiement est vide. Reprends la date sur la facture fournisseur.` };
    return null;
  }
  const echeance = aujourdhuiParis(new Date(Number(brute)));
  if (comparer(echeance, aujourdhui) < 0) {
    return { type: 'en_retard', texte: `${MARQUE} du ${jour} : paiement en retard depuis le ${libelleJour(echeance)}${pour}, reste ${euros(reste)}. Paie ou note la date convenue avec le fournisseur, puis mets à jour 💵 Déjà payé TTC.` };
  }
  if (comparer(echeance, ajouterJoursOuvres(aujourdhui, PREAVIS_OUVRES)) <= 0) {
    return { type: 'a_payer', texte: `${MARQUE} du ${jour} : à payer avant le ${libelleJour(echeance)}${pour}, reste ${euros(reste)}. Une fois payé, mets à jour 💵 Déjà payé TTC.` };
  }
  return null;
}

export async function controlerEcheancierAchats(simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { success: false, error: 'Configuration serveur incomplète' };
  const aujourdhui = aujourdhuiParis();
  const jour = libelleJour(aujourdhui);
  const resultats: any[] = [];
  let lus = 0;
  for (let page = 0; page < 10; page++) {
    const res = await clickup(token, `/list/${ACHATS_ID}/task?archived=false&page=${page}`);
    if (!res.ok) return { success: false, error: 'Lecture des Achats Fournisseurs impossible' };
    const json = await res.json().catch(() => ({}));
    const taches: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    for (const t of taches) {
      if (t.parent) continue;
      lus++;
      const c = constater(t, aujourdhui);
      if (!c) continue;
      if (await dejaSignaleAujourdhui(token, String(t.id), jour)) { resultats.push({ achat: t.name, type: c.type, action: 'deja_signale' }); continue; }
      if (!simulation) await alerter(token, String(t.id), c.texte);
      resultats.push({ achat: t.name, type: c.type, action: simulation ? 'signalerait' : 'signale', commentaire: c.texte });
    }
    if (json?.last_page !== false || taches.length === 0) break;
  }
  return { success: true, jour, achatsLus: lus, resultats, simulation };
}
