import { type Jour, aujourdhuiParis, ajouterJours, comparer, echeanceClickUp, libelleJour } from '@/lib/joursOuvres';
import { alerter } from '@/lib/alerteSite';

// Maintenance programmée (Phase 5, 13/10/2026). Appelé chaque matin par le contrôle quotidien, sans Super Agent.
// Lit le Parc installé (bornes hors ⚫ hors service) et la liste Maintenance 🛠️.
// Contrat souscrit (📜 Type de Contrat = Maintenance, Maintenance + relevé ou Visite seule) :
// - 🔄 Echéance annuelle vide : alerte (une fois) ;
// - à 30 jours de l'échéance : création de la visite dans Maintenance 🛠️ (à planifier, 📅 Échéance, 🔋 Borne visitée),
//   une seule par borne et par échéance (aucun doublon, même si la visite a déjà été faite et fermée) ;
// - lendemain de l'échéance : 🔄 Echéance annuelle avance d'un an. L'anniversaire ne bouge jamais avec la date réelle
//   de la visite (une visite tardive ne décale rien) et la visite due reste à faire ;
// - visite dont l'échéance est passée, toujours à planifier ou rdv confirmé : alerte, au plus une fois par semaine.
// Sans contrat (Aucun ou vide) : entre 11 et 12 mois après 📅 Date de Mise en Service, une seule alerte back-office pour
// reproposer un contrat, après vérification qu'aucun n'a été signé entre-temps et que le client accepte d'être sollicité.
// Aucun email client, aucun rendez-vous fixé, aucun statut du Parc changé. Simulation : rien n'est écrit.
// Pas encore géré : fin de contrat / renouvellement (aucun champ de date de fin dans le Parc).

const PARC_ID = '901520038290';
const MAINTENANCE_ID = process.env.CLICKUP_MAINTENANCE_LIST_ID || '1200630000008492';
const P = {
  contrat: 'a0505dec-e32f-485d-b501-2288a4c5f150',
  echeance: '837dd2a3-2b7c-4ce8-b62f-6f0884c53ec1',
  miseEnService: '5e301b44-b0b8-478a-90c2-86e0201ef9d5',
};
const M = {
  echeance: 'e7040d3d-3b17-430b-95c7-4a4ab40e35ea',
  borne: 'bf8c35b7-65e1-4bcf-afe3-5740e1acc9fa',
};
const PREAVIS_JOURS = 30;
const MARQUE_SANS_ECHEANCE = '🛠️ Maintenance : contrat souscrit mais 🔄 Echéance annuelle vide';
const MARQUE_RETARD = '🛠️ Visite de maintenance en retard';
const MARQUE_ONZE_MOIS = '🛠️ Relance contrat de maintenance (11 mois)';
const SEMAINE_MS = 7 * 24 * 3600 * 1000;

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const dateFr = (d: Jour) => `${String(d.j).padStart(2, '0')}/${String(d.m).padStart(2, '0')}/${d.a}`;
const cleJour = (d: Jour) => `${d.a}-${d.m}-${d.j}`;

// d + n mois, jour ramené au dernier jour du mois si besoin (31/01 + 1 mois = 28 ou 29/02)
export function ajouterMois(d: Jour, n: number): Jour {
  const total = d.a * 12 + (d.m - 1) + n;
  const a = Math.floor(total / 12);
  const m = (total % 12) + 1;
  const dernier = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return { a, m, j: Math.min(d.j, dernier) };
}

async function clickup(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c.id === id);
function jourDe(t: any, id: string): Jour | null {
  const v = champ(t, id)?.value;
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? aujourdhuiParis(new Date(n)) : null;
}
function option(t: any, id: string): string {
  const f = champ(t, id);
  if (!f || f.value === undefined || f.value === null || f.value === '') return '';
  const o = (f.type_config?.options || []).find((x: any) => x.orderindex === Number(f.value) || x.id === f.value);
  return String(o?.name || '');
}
const liees = (t: any, id: string): string[] => {
  const v = champ(t, id)?.value;
  return (Array.isArray(v) ? v : []).map((x: any) => String(x?.id ?? x)).filter(Boolean);
};

async function toutesLesTaches(token: string, liste: string, fermees: boolean): Promise<any[] | null> {
  const out: any[] = [];
  for (let page = 0; page < 20; page++) {
    const res = await clickup(token, `/list/${liste}/task?archived=false&subtasks=false&include_closed=${fermees}&page=${page}`);
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const taches: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    out.push(...taches.filter((t) => !t.parent));
    if (json?.last_page !== false || taches.length === 0) break;
  }
  return out;
}

// Dernier commentaire contenant la marque (date en ms), 0 si aucun
async function derniereMarque(token: string, id: string, marque: string): Promise<number> {
  const res = await clickup(token, `/task/${id}/comment`);
  if (!res.ok) return 0;
  const json = await res.json().catch(() => ({}));
  const c = (Array.isArray(json?.comments) ? json.comments : []).find((x: any) => String(x?.comment_text || '').includes(marque));
  return c ? Number(c.date) || 1 : 0;
}

export type Constat =
  | { type: 'sans_echeance' }
  | { type: 'creer_visite'; echeance: Jour }
  | { type: 'avancer_echeance'; echeance: Jour; suivante: Jour }
  | { type: 'relance_onze_mois'; miseEnService: Jour; anniversaire: Jour };

// Ce qu'il faut faire pour une borne (sans lecture réseau). visites = clés « borne|jour » déjà créées.
export function constater(parc: any, aujourdhui: Jour, visites: Set<string>): Constat[] {
  if (String(parc?.status?.type || '') === 'closed' || normal(parc?.status?.status).includes('hors service')) return [];
  const contrat = normal(option(parc, P.contrat));
  const souscrit = !!contrat && contrat !== 'aucun';
  const out: Constat[] = [];
  if (souscrit) {
    const e = jourDe(parc, P.echeance);
    if (!e) return [{ type: 'sans_echeance' }];
    // Échéance passée depuis plus de 60 jours (date jamais tenue à jour) : on avance sans créer de visite ancienne
    const ancienne = comparer(aujourdhui, ajouterJours(e, 60)) > 0;
    if (!ancienne && comparer(aujourdhui, ajouterJours(e, -PREAVIS_JOURS)) >= 0 && !visites.has(`${parc.id}|${cleJour(e)}`)) {
      out.push({ type: 'creer_visite', echeance: e });
    }
    if (comparer(aujourdhui, e) > 0) out.push({ type: 'avancer_echeance', echeance: e, suivante: ajouterMois(e, 12) });
    return out;
  }
  const mes = jourDe(parc, P.miseEnService);
  if (!mes) return [];
  const onze = ajouterMois(mes, 11);
  const anniversaire = ajouterMois(mes, 12);
  if (comparer(aujourdhui, onze) >= 0 && comparer(aujourdhui, anniversaire) < 0) {
    out.push({ type: 'relance_onze_mois', miseEnService: mes, anniversaire });
  }
  return out;
}

export async function controlerMaintenance(simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { success: false, error: 'Configuration serveur incomplète' };
  const aujourdhui = aujourdhuiParis();
  const jour = libelleJour(aujourdhui);
  const [parc, visitesListe] = await Promise.all([toutesLesTaches(token, PARC_ID, false), toutesLesTaches(token, MAINTENANCE_ID, true)]);
  if (!parc) return { success: false, error: 'Lecture du Parc installé impossible' };
  if (!visitesListe) return { success: false, error: 'Lecture de la liste Maintenance impossible' };

  const visites = new Set<string>();
  for (const v of visitesListe) {
    const e = jourDe(v, M.echeance);
    if (e) for (const b of liees(v, M.borne)) visites.add(`${b}|${cleJour(e)}`);
  }
  const resultats: any[] = [];

  for (const b of parc) {
    const id = String(b.id);
    for (const c of constater(b, aujourdhui, visites)) {
      if (c.type === 'sans_echeance') {
        const texte = `${MARQUE_SANS_ECHEANCE}. Renseigne-la (mise en service + 1 an, ou date convenue si le contrat a été signé plus tard), sinon aucune visite ne sera préparée.`;
        if (await derniereMarque(token, id, MARQUE_SANS_ECHEANCE)) { resultats.push({ borne: b.name, type: c.type, action: 'deja_signale' }); continue; }
        if (!simulation) await alerter(token, id, texte);
        resultats.push({ borne: b.name, type: c.type, action: simulation ? 'signalerait' : 'signale', commentaire: texte });
      } else if (c.type === 'creer_visite') {
        const nom = `🛠️ Visite annuelle · ${b.name} · échéance ${dateFr(c.echeance)}`;
        if (simulation) { resultats.push({ borne: b.name, type: c.type, action: 'creerait', visite: nom }); continue; }
        const res = await clickup(token, `/list/${MAINTENANCE_ID}/task`, 'POST', {
          name: nom,
          status: 'à planifier',
          due_date: echeanceClickUp(c.echeance),
          due_date_time: false,
          custom_fields: [{ id: M.echeance, value: echeanceClickUp(c.echeance), value_options: { time: false } }],
        });
        const visite = res.ok ? await res.json().catch(() => null) : null;
        if (!visite?.id) {
          await alerter(token, id, `⚠️ Maintenance : je n'ai pas pu créer la visite de l'échéance du ${dateFr(c.echeance)}. Crée-la à la main dans Maintenance 🛠️.`);
          resultats.push({ borne: b.name, type: c.type, action: 'erreur_creation' });
          continue;
        }
        visites.add(`${id}|${cleJour(c.echeance)}`);
        const lien = await clickup(token, `/task/${visite.id}/field/${M.borne}`, 'POST', { value: { add: [id], rem: [] } });
        const manque = lien.ok ? '' : ' ⚠️ Lien 🔋 Borne visitée non écrit, relie la borne à la main.';
        await alerter(token, String(visite.id), `🛠️ Visite de maintenance à planifier avant le ${dateFr(c.echeance)} pour « ${b.name} » (${option(b, P.contrat)}). Cale le rendez-vous avec le client, puis renseigne 📆 Date de RDV et 👷 Technicien.${manque} ${b.url || ''}`.trim());
        await clickup(token, `/task/${id}/comment`, 'POST', { comment_text: `🛠️ Visite annuelle créée dans Maintenance 🛠️ (échéance ${dateFr(c.echeance)}). ${visite.url || ''}`.trim(), notify_all: false });
        resultats.push({ borne: b.name, type: c.type, action: 'cree', visite: nom, lienBorne: lien.ok });
      } else if (c.type === 'avancer_echeance') {
        const texte = `🔄 Echéance annuelle passée au ${dateFr(c.suivante)} (anniversaire du ${dateFr(c.echeance)} atteint). Si la visite de cette échéance n'est pas faite, elle reste due.`;
        if (simulation) { resultats.push({ borne: b.name, type: c.type, action: 'avancerait', vers: dateFr(c.suivante) }); continue; }
        const r = await clickup(token, `/task/${id}/field/${P.echeance}`, 'POST', { value: echeanceClickUp(c.suivante), value_options: { time: false } });
        if (r.ok) await clickup(token, `/task/${id}/comment`, 'POST', { comment_text: texte, notify_all: false });
        else await alerter(token, id, `⚠️ Maintenance : je n'ai pas pu passer 🔄 Echéance annuelle au ${dateFr(c.suivante)}. Fais-le à la main.`);
        resultats.push({ borne: b.name, type: c.type, action: r.ok ? 'avance' : 'erreur_ecriture', vers: dateFr(c.suivante) });
      } else if (c.type === 'relance_onze_mois') {
        const texte = `${MARQUE_ONZE_MOIS} : « ${b.name} » est en service depuis le ${dateFr(c.miseEnService)}, sans contrat. Avant le ${dateFr(c.anniversaire)}, vérifie qu'aucun contrat n'a été signé entre-temps et que le client accepte d'être sollicité, puis repropose le contrat. Aucun rendez-vous sans son accord. Contrat signé : mets à jour 📜 Type de Contrat et 🔄 Echéance annuelle.`;
        if (await derniereMarque(token, id, MARQUE_ONZE_MOIS)) { resultats.push({ borne: b.name, type: c.type, action: 'deja_signale' }); continue; }
        if (!simulation) await alerter(token, id, texte);
        resultats.push({ borne: b.name, type: c.type, action: simulation ? 'signalerait' : 'signale', commentaire: texte });
      }
    }
  }

  // Visites en retard : échéance passée, pas encore réalisée
  for (const v of visitesListe) {
    const s = normal(v?.status?.status);
    if (!(s.includes('planifier') || s.includes('rdv'))) continue;
    const e = jourDe(v, M.echeance);
    if (!e || comparer(aujourdhui, e) <= 0) continue;
    const texte = `${MARQUE_RETARD} : échéance du ${dateFr(e)} dépassée (${s.includes('rdv') ? 'rendez-vous calé mais visite pas réalisée' : 'rendez-vous pas encore calé'}). La visite reste due, l'anniversaire du contrat ne change pas.`;
    const derniere = await derniereMarque(token, String(v.id), MARQUE_RETARD);
    if (derniere && Date.now() - derniere < SEMAINE_MS) { resultats.push({ visite: v.name, type: 'visite_en_retard', action: 'deja_signale' }); continue; }
    if (!simulation) await alerter(token, String(v.id), texte);
    resultats.push({ visite: v.name, type: 'visite_en_retard', action: simulation ? 'signalerait' : 'signale', commentaire: texte });
  }

  return { success: resultats.every((r) => !String(r.action).startsWith('erreur')), jour, bornesLues: parc.length, visitesLues: visitesListe.length, resultats, simulation };
}
