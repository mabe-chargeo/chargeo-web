import { type Jour, aujourdhuiParis, ajouterJours, comparer, libelleJour } from '@/lib/joursOuvres';
import { alerter } from '@/lib/alerteSite';

// Rappel des décomptes énergétiques (Phase 5, décision Matthieu du 13/10/2026). Appelé chaque matin par le contrôle
// quotidien, sans Super Agent. Le site ne produit aucun décompte et n'envoie rien : l'intégration Charge Unix n'est pas
// opérationnelle (tâche « Intégrer Charge Unix au portail »), le back-office prépare le décompte à la main.
// Parc installé, bornes hors ⚫ hors service :
// - 🔁 Mode supervision = Refacturation : jamais de rappel (les paiements passent par Charge Unix) ;
// - 🔁 Mode supervision = Relevé : à la fin de chaque période (🗓️ Fréquence décomptes, périodes civiles : mois,
//   trimestre, semestre ou année), une alerte back-office « décompte à préparer » pour la période écoulée, une seule
//   fois par période, pendant les 15 premiers jours de la période suivante (rattrapage si un contrôle a sauté).
//   Début ajusté à 📅 Date de Mise en Service si elle tombe dans la période ; rien si la borne n'était pas en service.
//   Avertissements dans le message : 💶 Tarif gestionnaire vide (le demander au syndic, ne rien supposer),
//   📡 Abonnement supervision pas « Actif » (consommations distantes peut-être absentes) ;
// - Relevé sans 🗓️ Fréquence décomptes, ou 📜 Type de Contrat « Maintenance + relevé » sans 🔁 Mode supervision :
//   alerte une seule fois pour compléter la fiche.
// Calendrier convenu avec un gestionnaire différent des périodes civiles : pas encore géré (aucun champ pour le noter).

const PARC_ID = '901520038290';
const F = {
  contrat: 'a0505dec-e32f-485d-b501-2288a4c5f150',
  miseEnService: '5e301b44-b0b8-478a-90c2-86e0201ef9d5',
  mode: '4a9e7298-404b-4600-9456-38c77ef16e5d',
  abonnement: 'df349392-a330-4621-b8a2-e25c70035699',
  tarif: '8f11a5d6-cc1d-4cbd-9ce9-16275088d6bd',
  frequence: '865046fb-feef-4d6e-8e7d-cd5172534314',
};
const MOIS_PAR_PERIODE: Record<string, number> = { mensuelle: 1, trimestrielle: 3, semestrielle: 6, annuelle: 12 };
const MARQUE = '🧾 Décompte énergie';
const MARQUE_FICHE = '🧾 Décomptes : fiche à compléter';
const FENETRE_JOURS = 15;

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const dateFr = (d: Jour) => `${String(d.j).padStart(2, '0')}/${String(d.m).padStart(2, '0')}/${d.a}`;

async function clickup(token: string, chemin: string): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, { headers: { Authorization: token }, cache: 'no-store' });
}

const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c.id === id);
const vide = (v: any) => v === undefined || v === null || v === '';
function jourDe(t: any, id: string): Jour | null {
  const v = champ(t, id)?.value;
  if (vide(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? aujourdhuiParis(new Date(n)) : null;
}
function option(t: any, id: string): string {
  const f = champ(t, id);
  if (!f || vide(f.value)) return '';
  const o = (f.type_config?.options || []).find((x: any) => x.orderindex === Number(f.value) || x.id === f.value);
  return String(o?.name || '');
}

// Période civile écoulée juste avant celle qui contient « aujourdhui », et début de la période en cours
export function periodeEcoulee(aujourdhui: Jour, mois: number): { debut: Jour; fin: Jour; debutEnCours: Jour } {
  const idx = Math.floor((aujourdhui.m - 1) / mois) * mois; // 0-based, premier mois de la période en cours
  const debutEnCours: Jour = { a: aujourdhui.a, m: idx + 1, j: 1 };
  const fin = ajouterJours(debutEnCours, -1);
  const total = debutEnCours.a * 12 + idx - mois;
  const debut: Jour = { a: Math.floor(total / 12), m: (total % 12) + 1, j: 1 };
  return { debut, fin, debutEnCours };
}

export type Constat =
  | { type: 'fiche_a_completer'; manque: string }
  | { type: 'decompte_a_preparer'; debut: Jour; fin: Jour; frequence: string; ajuste: boolean; avertissements: string[] };

export function constater(t: any, aujourdhui: Jour): Constat | null {
  if (String(t?.status?.type || '') === 'closed' || normal(t?.status?.status).includes('hors service')) return null;
  const mode = normal(option(t, F.mode));
  if (mode.includes('refactur')) return null;
  if (!mode) {
    return normal(option(t, F.contrat)).includes('releve') ? { type: 'fiche_a_completer', manque: '🔁 Mode supervision' } : null;
  }
  if (!mode.includes('releve')) return null;
  const frequence = option(t, F.frequence);
  const mois = MOIS_PAR_PERIODE[normal(frequence)];
  if (!mois) return { type: 'fiche_a_completer', manque: '🗓️ Fréquence décomptes' };

  const p = periodeEcoulee(aujourdhui, mois);
  if (comparer(aujourdhui, ajouterJours(p.debutEnCours, FENETRE_JOURS - 1)) > 0) return null;
  const mes = jourDe(t, F.miseEnService);
  const avertissements: string[] = [];
  let debut = p.debut;
  let ajuste = false;
  if (mes) {
    if (comparer(mes, p.fin) > 0) return null; // pas encore en service pendant la période
    if (comparer(mes, p.debut) > 0) { debut = mes; ajuste = true; }
  } else avertissements.push('📅 Date de Mise en Service vide : vérifie le début réel de la période');
  if (vide(champ(t, F.tarif)?.value)) avertissements.push('💶 Tarif gestionnaire vide : demande le tarif au syndic (date, période, HT ou TTC), ne suppose rien');
  const abo = normal(option(t, F.abonnement));
  if (abo !== 'actif') avertissements.push(`📡 Abonnement supervision « ${option(t, F.abonnement) || 'vide'} » : les consommations à distance peuvent manquer`);
  return { type: 'decompte_a_preparer', debut, fin: p.fin, frequence, ajuste, avertissements };
}

async function dejaDit(token: string, id: string, texte: string): Promise<boolean> {
  const res = await clickup(token, `/task/${id}/comment`);
  if (!res.ok) return false;
  const json = await res.json().catch(() => ({}));
  return (Array.isArray(json?.comments) ? json.comments : []).some((c: any) => String(c?.comment_text || '').includes(texte));
}

export async function rappelerDecomptes(simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { success: false, error: 'Configuration serveur incomplète' };
  const aujourdhui = aujourdhuiParis();
  const resultats: any[] = [];
  let lues = 0;
  for (let page = 0; page < 20; page++) {
    const res = await clickup(token, `/list/${PARC_ID}/task?archived=false&subtasks=false&page=${page}`);
    if (!res.ok) return { success: false, error: 'Lecture du Parc installé impossible' };
    const json = await res.json().catch(() => ({}));
    const taches: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    for (const t of taches) {
      if (t.parent) continue;
      lues++;
      const c = constater(t, aujourdhui);
      if (!c) continue;
      const id = String(t.id);
      let cle: string;
      let texte: string;
      if (c.type === 'fiche_a_completer') {
        cle = `${MARQUE_FICHE} (${c.manque})`;
        texte = `${cle} : « ${t.name} » est suivie en relevé mais ${c.manque} est vide. Complète-le pour que le rappel des décomptes fonctionne.`;
      } else {
        const periode = `du ${dateFr(c.debut)} au ${dateFr(c.fin)}`;
        cle = `${MARQUE} à préparer, période ${periode}`;
        const ajuste = c.ajuste ? ' (début = mise en service)' : '';
        const notes = c.avertissements.length ? ` ⚠️ ${c.avertissements.join(' ; ')}.` : '';
        texte = `${cle}${ajuste}, ${normal(c.frequence)}. Reprends les consommations de la période dans Charge Unix, kWh par résident ou lot au tarif coûtant du syndic (aucune marge, ce n'est pas une facture CHARGéO), vérifie les changements d'occupant et de badge, puis valide avant tout envoi.${notes}`;
      }
      if (await dejaDit(token, id, cle)) { resultats.push({ borne: t.name, type: c.type, action: 'deja_signale' }); continue; }
      if (!simulation) await alerter(token, id, texte);
      resultats.push({ borne: t.name, type: c.type, action: simulation ? 'signalerait' : 'signale', commentaire: texte });
    }
    if (json?.last_page !== false || taches.length === 0) break;
  }
  return { success: true, jour: libelleJour(aujourdhui), bornesLues: lues, resultats, simulation };
}
