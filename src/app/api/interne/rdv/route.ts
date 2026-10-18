import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { membresDuRole, rolesDe } from '@/lib/roles';
import { getQualificationListId } from '@/lib/listesClickUp';
import { CHAMPS_INTERVENTION, LISTES, etapePlanning } from '@/lib/espaces';
import { adresseDe, champ, dateVisiteDe } from '@/lib/vuesFiches';
import { agendaBranche, idEvenement, occupationsAgenda, poserEvenement, retirerEvenement } from '@/lib/googleAgenda';
import { demiJourneesDe, jourEtMinutes, libelleJour, parisVersMs, segmentsPose, villeDe } from '@/lib/demiJournees';

// Caler une visite de maintenance ou un dépannage SAV (18/10/2026, 8 h 31, Matthieu : « Fais maintenance et SAV », suite
// de « il faut que ça fonctionne de la même manière pour les installateurs pour leur caler les chantiers et
// intervention »). Même principe que le relevé (Caler) et la pose (Planifier) : techniciens, durée, créneau dans
// l'agenda de la semaine, avec le planning ERP et le Google Agenda des techniciens choisis.
// - visite : Maintenance 🛠️, à planifier ou rdv confirmé. 📆 Date de RDV (avec l'heure), 👷 Technicien, statut
//   « rdv confirmé ». Annuler : date vidée, retour « à planifier ».
// - depannage : Tickets SAV 🔧 ni résolu ni archivé. Échéance de la tâche (avec l'heure), assignés, statut
//   « 📅 intervention planifiée ». Annuler : échéance vidée, retour « 📞 diagnostic téléphonique ».
// Durée : ⏳ Durée RDV (créé le 18/10 dans les deux listes : 30 min, 1 h, 1 h 30, 2 h, 3 h, 4 h ; option lue par son
// nom, 1 h 30 si vide). Adresse : celle de la fiche, sinon celle de l'installation du Parc liée (🔋 Borne visitée,
// 🔗 Fiche Installation). Google : un événement « visite… » ou « depan… » par technicien, retiré chez ceux qui n'y
// sont plus. Un échec Google n'annule jamais l'écriture ClickUp : il est signalé par personne.
// Occupations ERP lues avec leur vraie durée : poses (⏳ Durée intervention), visites et dépannages (⏳ Durée RDV),
// relevés (⏳ Durée relevé).
// GET ?type=visite|depannage&id=<tâche> ; POST { type, id, jour, minutes, duree, techniciens } ou { type, id, action: 'annuler' }.
// Droits : chef de chantier et direction. Preview : seules les fiches avec « Test » dans le nom sont modifiées.
// Le fichier n'exporte que les handlers (règle des routes Next).

export const dynamic = 'force-dynamic';
const API = 'https://api.clickup.com/api/v2';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const texte = (v: unknown, max = 200) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const AUTORISES = ['direction', 'chargeOperation'];
const JOURS_PLANNING = 35;
const PAGES_MAX = 10;
const DUREE_DEFAUT = 90;
const DUREE_DEFAUT_LIBELLE = '1 h 30';

type TypeRdv = 'visite' | 'depannage';
type Personne = { id: number; nom: string; email: string; role: string };
type Bloc = { jour: string; debut: number; fin: number; journee: boolean; type: 'pose' | 'visite' | 'depannage' | 'releve'; nom: string; ville: string; personnes: number[] };

const CONFIG: Record<TypeRdv, { liste: string; prefixe: string; titre: string; relation: string; planifie: string; retour: string; libelle: string }> = {
  visite: { liste: LISTES.maintenance, prefixe: 'visite', titre: '🔧 Maintenance', relation: CHAMPS_INTERVENTION.borneVisitee, planifie: 'rdv confirmé', retour: 'à planifier', libelle: 'Visite de maintenance' },
  depannage: { liste: LISTES.sav, prefixe: 'depan', titre: '🚨 Dépannage', relation: CHAMPS_INTERVENTION.installationTicket, planifie: '📅 intervention planifiée', retour: '📞 diagnostic téléphonique', libelle: 'Dépannage SAV' },
};
const typeDe = (v: unknown): TypeRdv | null => (v === 'visite' || v === 'depannage' ? v : null);
const ouvert = (type: TypeRdv, t: any) => {
  const s = normal(t?.status?.status);
  return type === 'visite' ? s.includes('a planifier') || s.includes('rdv confirme') : !s.includes('resolu') && !s.includes('archive');
};
const jourParis = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const prenom = (nom: string) => nom.split(/\s+/)[0] || nom;
const heureDe = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}h${String(m % 60).padStart(2, '0')}`;

// Menu déroulant d'une tâche trouvé par un mot de son nom : champ, options et option choisie
function menuNomme(t: any, mot: string): { id: string; options: { id: string; nom: string }[]; choisi: string } | null {
  const f = (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => normal(c?.name).includes(mot));
  if (!f) return null;
  const brutes: any[] = Array.isArray(f?.type_config?.options) ? f.type_config.options : [];
  const options = brutes.map((o: any) => ({ id: String(o?.id), nom: String(o?.name ?? o?.label ?? ''), ordre: Number(o?.orderindex) }));
  const v = f?.value;
  const o = v === undefined || v === null || v === '' ? undefined : options.find((x) => x.id === String(v) || x.ordre === Number(v));
  return { id: String(f.id), options: options.map((x) => ({ id: x.id, nom: x.nom })), choisi: o?.nom || '' };
}
// « 30 min » → 30, « 1 h » → 60, « 1 h 30 » → 90 ; 0 si inconnu
function minutesDe(libelle: string): number {
  const n = normal(libelle).replace(/\s+/g, '');
  const h = n.match(/(\d+)h(\d+)?/);
  if (h) return Number(h[1]) * 60 + (h[2] ? Number(h[2]) : 0);
  const m = n.match(/(\d+)min/);
  return m ? Number(m[1]) : 0;
}
const dureeDe = (t: any, mot: string, defaut: number) => minutesDe(menuNomme(t, mot)?.choisi || '') || defaut;

async function lister(token: string, listId: string): Promise<any[]> {
  const toutes: any[] = [];
  for (let page = 0; page < PAGES_MAX; page++) {
    const res = await fetch(`${API}/list/${listId}/task?archived=false&include_closed=false&subtasks=false&page=${page}`, { headers: { Authorization: token }, cache: 'no-store' });
    if (!res.ok) throw new Error(`ClickUp a refusé la lecture (${res.status})`);
    const corps = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(corps?.tasks) ? corps.tasks : [];
    toutes.push(...lot.filter((t) => !t?.parent));
    if (corps?.last_page !== false || lot.length === 0) break;
  }
  return toutes;
}

// Personnes qui interviennent : installateurs, puis chefs de chantier
async function personnesTerrain(token: string): Promise<Personne[]> {
  const [poseurs, chefs] = await Promise.all([membresDuRole(token, 'poseur'), membresDuRole(token, 'chargeOperation')]);
  const res: Personne[] = poseurs.map((p) => ({ id: p.id, nom: p.nom, email: p.email, role: 'Installateur' }));
  for (const c of chefs) if (!res.some((p) => p.id === c.id)) res.push({ id: c.id, nom: c.nom, email: c.email, role: 'Chef de chantier' });
  return res;
}

// Date, heure et techniciens actuels du rendez-vous
const dateDe = (type: TypeRdv, t: any) => (type === 'visite' ? champ(t, CHAMPS_INTERVENTION.dateVisite)?.value : t?.due_date);
const techniciensDe = (type: TypeRdv, t: any): number[] =>
  (Array.isArray(type === 'visite' ? champ(t, CHAMPS_INTERVENTION.technicienVisite)?.value : t?.assignees) ? (type === 'visite' ? champ(t, CHAMPS_INTERVENTION.technicienVisite)?.value : t.assignees) : [])
    .map((u: any) => Number(u?.id)).filter((n: number) => n > 0);

// Adresse de la fiche, sinon celle de l'installation du Parc liée
const adresseLibre = (t: any): string => adresseDe(t) || String((Array.isArray(t?.custom_fields) ? t.custom_fields : []).map((c: any) => c?.value?.formatted_address).find(Boolean) || '');
async function adresseRdv(token: string, type: TypeRdv, t: any): Promise<string> {
  const directe = adresseLibre(t);
  if (directe) return directe;
  const lie = (Array.isArray(champ(t, CONFIG[type].relation)?.value) ? champ(t, CONFIG[type].relation)?.value : [])[0];
  if (!lie?.id) return '';
  try {
    const r = await fetch(`${API}/task/${encodeURIComponent(String(lie.id))}`, { headers: { Authorization: token }, cache: 'no-store' });
    if (!r.ok) return '';
    return adresseLibre(await r.json().catch(() => null));
  } catch {
    return '';
  }
}

// Occupations des personnes dans l'ERP sur 35 jours, avec leur durée, sans le rendez-vous à caler
async function occupationsErp(token: string, ids: number[], saufId: string): Promise<{ blocs: Bloc[]; incomplet: boolean }> {
  const debut = jourParis(new Date());
  const fin = jourParis(new Date(Date.now() + JOURS_PLANNING * 86400000));
  const qualification = String(getQualificationListId() || '');
  const lus = await Promise.allSettled([
    lister(token, LISTES.planning),
    lister(token, LISTES.maintenance),
    lister(token, LISTES.sav),
    qualification ? lister(token, qualification) : Promise.resolve([] as any[]),
  ]);
  const blocs: Bloc[] = [];
  const qui = (v: unknown) => (Array.isArray(v) ? v : []).map((u: any) => Number(u?.id)).filter((n) => ids.includes(n));
  const rdv = (t: any, type: Bloc['type'], ms: unknown, personnes: number[], duree: number) => {
    if (!personnes.length || String(t?.id) === saufId) return;
    const d = jourEtMinutes(ms);
    if (!d || d.jour < debut || d.jour > fin) return;
    const base = { type, nom: String(t?.name || ''), ville: villeDe(adresseDe(t)), personnes };
    if (d.minutes === null) blocs.push(Object.assign({ jour: d.jour, debut: 480, fin: 1050, journee: true }, base));
    else blocs.push(Object.assign({ jour: d.jour, debut: d.minutes, fin: d.minutes + duree, journee: false }, base));
  };
  const [rPlanning, rVisites, rSav, rReleves] = lus;
  if (rPlanning.status === 'fulfilled') {
    for (const t of rPlanning.value) {
      if (etapePlanning(String(t?.status?.status || '')) > 3 || String(t?.id) === saufId) continue;
      const personnes = qui(champ(t, CHAMPS_INTERVENTION.technicienChantier)?.value);
      const d = jourEtMinutes(champ(t, CHAMPS_INTERVENTION.dateChantier)?.value);
      if (!personnes.length || !d) continue;
      const demi = demiJourneesDe(menuNomme(t, 'duree intervention')?.choisi || '');
      const segs = segmentsPose(d.jour, d.minutes === null ? 480 : d.minutes, demi || (d.minutes === null ? 2 : 1));
      if (d.minutes !== null && !demi) segs[0] = { jour: d.jour, debut: d.minutes, fin: d.minutes + 240 };
      for (const s of segs.filter((x) => x.jour >= debut && x.jour <= fin)) blocs.push({ jour: s.jour, debut: s.debut, fin: s.fin, journee: false, type: 'pose', nom: String(t?.name || ''), ville: villeDe(adresseDe(t)), personnes });
    }
  }
  if (rVisites.status === 'fulfilled') {
    for (const t of rVisites.value) {
      if (!ouvert('visite', t)) continue;
      rdv(t, 'visite', champ(t, CHAMPS_INTERVENTION.dateVisite)?.value, qui(champ(t, CHAMPS_INTERVENTION.technicienVisite)?.value), dureeDe(t, 'duree rdv', DUREE_DEFAUT));
    }
  }
  if (rSav.status === 'fulfilled') {
    for (const t of rSav.value) {
      if (!ouvert('depannage', t)) continue;
      rdv(t, 'depannage', t?.due_date, qui(t?.assignees), dureeDe(t, 'duree rdv', DUREE_DEFAUT));
    }
  }
  if (rReleves.status === 'fulfilled') {
    for (const t of rReleves.value) {
      if (!normal(t?.status?.status).includes('a visiter')) continue;
      rdv(t, 'releve', dateVisiteDe(t), qui(t?.assignees), dureeDe(t, 'duree releve', 60));
    }
  }
  return { blocs, incomplet: lus.some((r) => r.status !== 'fulfilled') };
}

// Créneaux occupés des Google Agendas (tous les agendas affichés, horaires seulement)
async function lireAgendas(personnes: Personne[]) {
  const creneaux: { personne: number; jour: string; debut: number; fin: number; journee: boolean }[] = [];
  const erreurs: string[] = [];
  if (!agendaBranche()) return { branche: false, creneaux, erreurs };
  const depuis = new Date();
  const jusque = new Date(Date.now() + JOURS_PLANNING * 86400000);
  const lus = await Promise.allSettled(personnes.map((p) => (p.email ? occupationsAgenda(p.email, depuis, jusque) : Promise.reject(new Error('pas d’email dans ClickUp')))));
  lus.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      for (const x of r.value.creneaux) creneaux.push({ personne: personnes[i].id, jour: x.jour, debut: x.debut, fin: x.fin, journee: x.journee });
      if (!r.value.listeComplete) erreurs.push(`Seul l’agenda principal de ${personnes[i].nom} est lu.`);
      if (r.value.sautes) erreurs.push(`${r.value.sautes} agenda(s) de ${personnes[i].nom} illisible(s).`);
    } else {
      erreurs.push(`Agenda Google de ${personnes[i].nom} illisible : ${texte((r.reason as any)?.message || r.reason, 160)}`);
    }
  });
  return { branche: true, creneaux, erreurs };
}

async function lireRdv(token: string, type: TypeRdv, id: string): Promise<{ ok: true; t: any } | { ok: false; status: number; erreur: string }> {
  if (!id) return { ok: false, status: 400, erreur: 'Fiche manquante' };
  const r = await fetch(`${API}/task/${encodeURIComponent(id)}`, { headers: { Authorization: token }, cache: 'no-store' });
  if (!r.ok) return { ok: false, status: r.status === 404 ? 404 : 502, erreur: r.status === 404 ? 'Fiche introuvable' : `ClickUp a refusé la lecture (${r.status})` };
  const t = await r.json().catch(() => null);
  if (String(t?.list?.id) !== CONFIG[type].liste) return { ok: false, status: 400, erreur: type === 'visite' ? 'Cette fiche n’est pas une visite de maintenance' : 'Cette fiche n’est pas un ticket SAV' };
  if (t?.parent) return { ok: false, status: 400, erreur: 'Ouvre la fiche principale, pas une sous-tâche' };
  return { ok: true, t };
}

async function autoriser(request: Request, token: string) {
  const session = await sessionDeRequete(request);
  if (!session?.id) return { ok: false as const, reponse: json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401) };
  const roles = await rolesDe(token, session.id);
  if (!AUTORISES.some((r) => (roles as string[]).includes(r))) return { ok: false as const, reponse: json({ success: false, error: 'Caler une visite ou un dépannage est réservé au chef de chantier et à la direction.' }, 403) };
  return { ok: true as const, session };
}

const libelleQuand = (jour: string, minutes: number | null) => (minutes === null ? `${libelleJour(jour)} (heure à caler)` : `${libelleJour(jour)} à ${heureDe(minutes)}`);

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
  const a = await autoriser(request, token);
  if (!a.ok) return a.reponse;
  try {
    const url = new URL(request.url);
    const type = typeDe(url.searchParams.get('type'));
    if (!type) return json({ success: false, error: 'Type de rendez-vous inconnu' }, 400);
    const lu = await lireRdv(token, type, texte(url.searchParams.get('id'), 30));
    if (!lu.ok) return json({ success: false, error: lu.erreur }, lu.status);
    const t = lu.t;
    const personnes = await personnesTerrain(token);
    const [erp, agenda, adresse] = await Promise.all([occupationsErp(token, personnes.map((p) => p.id), String(t.id)), lireAgendas(personnes), adresseRdv(token, type, t)]);
    const d = jourEtMinutes(dateDe(type, t));
    const menu = menuNomme(t, 'duree rdv');
    return json({
      success: true,
      preview: process.env.VERCEL_ENV !== 'production',
      rdv: {
        id: String(t.id),
        type,
        libelle: CONFIG[type].libelle,
        nom: String(t.name || ''),
        statut: String(t?.status?.status || ''),
        ouvert: ouvert(type, t),
        adresse,
        ville: villeDe(adresse),
        quand: d ? libelleQuand(d.jour, d.minutes) : '',
        duree: menu?.choisi || '',
        techniciens: techniciensDe(type, t),
      },
      durees: (menu?.options || []).map((o) => ({ libelle: o.nom, minutes: minutesDe(o.nom) })).filter((o) => o.minutes > 0),
      champDureeManquant: !menu,
      personnes: personnes.map((p) => ({ id: p.id, nom: p.nom, role: p.role })),
      blocs: erp.blocs,
      planningIncomplet: erp.incomplet,
      agenda,
    });
  } catch (e) {
    console.error('Caler un rendez-vous (lecture)', e);
    return json({ success: false, error: 'Lecture impossible pour l’instant' }, 500);
  }
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
  const a = await autoriser(request, token);
  if (!a.ok) return a.reponse;
  const preview = process.env.VERCEL_ENV !== 'production';
  const auteur = texte((a.session as any).nom) || texte((a.session as any).email) || 'CHARGéO';
  try {
    const corps = await request.json().catch(() => ({}));
    const type = typeDe(corps?.type);
    if (!type) return json({ success: false, error: 'Type de rendez-vous inconnu' }, 400);
    const cfg = CONFIG[type];
    const lu = await lireRdv(token, type, texte(corps?.id, 30));
    if (!lu.ok) return json({ success: false, error: lu.erreur }, lu.status);
    const t = lu.t;
    const tid = encodeURIComponent(String(t.id));
    if (!ouvert(type, t)) return json({ success: false, error: type === 'visite' ? 'Cette visite est déjà réalisée.' : 'Ce ticket est déjà résolu.' }, 400);
    if (preview && !/\btest\b/i.test(String(t?.name || ''))) return json({ success: false, error: 'En preview, seules les fiches de test (avec « Test » dans le nom) peuvent être modifiées.' }, 403);
    const personnes = await personnesTerrain(token);
    const anciens = techniciensDe(type, t);
    const ancienne = jourEtMinutes(dateDe(type, t));
    const menu = menuNomme(t, 'duree rdv');
    const idGoogle = idEvenement(cfg.prefixe, String(t.id));
    const mettre = (corpsPut: any) => fetch(`${API}/task/${tid}`, { method: 'PUT', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify(corpsPut), cache: 'no-store' });
    const ecrire = (champId: string, valeur: any) => fetch(`${API}/task/${tid}/field/${champId}`, { method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify(valeur), cache: 'no-store' });
    const vider = (champId: string) => fetch(`${API}/task/${tid}/field/${champId}`, { method: 'DELETE', headers: { Authorization: token }, cache: 'no-store' });
    const commenter = (lignes: string[]) => fetch(`${API}/task/${tid}/comment`, { method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify({ comment_text: lignes.filter(Boolean).join('\n'), notify_all: false }), cache: 'no-store' }).catch(() => null);

    // Annuler : date et durée vidées, événements Google retirés, statut d'avant, techniciens gardés
    if (texte(corps?.action, 20) === 'annuler') {
      if (!ancienne) return json({ success: false, error: 'Aucun rendez-vous calé sur cette fiche.' }, 400);
      const r = type === 'visite' ? await vider(CHAMPS_INTERVENTION.dateVisite) : await mettre({ due_date: null, due_date_time: false });
      if (!r.ok) return json({ success: false, error: `ClickUp a refusé l’annulation (${r.status})` }, 502);
      if (menu) await vider(menu.id).catch(() => null);
      if (normal(t?.status?.status).includes(normal(cfg.planifie).replace(/^[^a-z]+/, ''))) await mettre({ status: cfg.retour }).catch(() => null);
      let agendaOk = true;
      if (agendaBranche()) {
        for (const p of personnes.filter((x) => x.email && anciens.includes(x.id))) {
          try { await retirerEvenement(p.email, idGoogle); } catch { agendaOk = false; }
        }
      }
      await commenter([`${cfg.titre} : rendez-vous annulé depuis l'application par ${auteur} (il était prévu ${libelleQuand(ancienne.jour, ancienne.minutes)}). Les techniciens restent affectés.`, agendaOk ? '' : '⚠️ L’événement n’a pas pu être retiré de tous les agendas Google.']);
      return json({ success: true, annule: true, agendaOk, preview });
    }

    const jour = /^\d{4}-\d{2}-\d{2}$/.test(texte(corps?.jour, 10)) ? texte(corps.jour, 10) : '';
    const minutes = Number(corps?.minutes);
    if (!jour || !Number.isFinite(minutes) || minutes < 6 * 60 || minutes > 19 * 60 || minutes % 30 !== 0) return json({ success: false, error: 'Choisis un créneau dans l’agenda' }, 400);
    const option = menu ? menu.options.find((o) => o.nom === texte(corps?.duree, 20)) : undefined;
    const duree = option ? minutesDe(option.nom) || DUREE_DEFAUT : dureeDe(t, 'duree rdv', DUREE_DEFAUT);
    const choisis: number[] = (Array.isArray(corps?.techniciens) ? corps.techniciens : []).map(Number).filter((n: number) => personnes.some((p) => p.id === n));
    if (!choisis.length) return json({ success: false, error: 'Choisis au moins un technicien' }, 400);
    const debutMs = parisVersMs(jour, minutes);
    if (debutMs < Date.now()) return json({ success: false, error: 'Ce créneau est déjà passé' }, 400);
    const avertissements: string[] = [];

    // 1. Date et heure
    const rDate = type === 'visite'
      ? await ecrire(CHAMPS_INTERVENTION.dateVisite, { value: debutMs, value_options: { time: true } })
      : await mettre({ due_date: debutMs, due_date_time: true });
    if (!rDate.ok) return json({ success: false, error: `ClickUp a refusé la date (${rDate.status})` }, 502);
    // 2. Durée
    if (menu && option) {
      const rD = await ecrire(menu.id, { value: option.id });
      if (!rD.ok) avertissements.push('La durée n’a pas pu être enregistrée.');
    } else if (!menu) avertissements.push('Champ ⏳ Durée RDV introuvable : durée non enregistrée.');
    // 3. Techniciens
    const add = choisis.filter((n) => !anciens.includes(n));
    const rem = anciens.filter((n) => !choisis.includes(n));
    if (add.length || rem.length) {
      const rT = type === 'visite' ? await ecrire(CHAMPS_INTERVENTION.technicienVisite, { value: { add, rem } }) : await mettre({ assignees: { add, rem } });
      if (!rT.ok) avertissements.push('Les techniciens n’ont pas pu être enregistrés.');
    }
    // 4. Statut
    let statut = String(t?.status?.status || '');
    if (!normal(statut).includes(normal(cfg.planifie).replace(/^[^a-z]+/, ''))) {
      const rs = await mettre({ status: cfg.planifie });
      if (rs.ok) statut = cfg.planifie;
      else avertissements.push(`Le statut n’a pas pu passer à « ${cfg.planifie} ».`);
    }

    // 5. Google Agenda de chaque technicien (retiré chez ceux qui n'y sont plus)
    const adresse = await adresseRdv(token, type, t);
    const agenda: { nom: string; statut: string; erreur?: string }[] = [];
    if (agendaBranche()) {
      const origine = new URL(request.url).origin;
      const equipe = personnes.filter((p) => choisis.includes(p.id)).map((p) => p.nom);
      const description = [`Techniciens : ${equipe.join(', ')}`, `Durée : ${option?.nom || `${duree} min`}`, `Calé par ${auteur} depuis l'application CHARGéO.`, `Fiche : ${origine}/interne/element/${t.id}`].join('\n');
      for (const p of personnes.filter((x) => x.email && (choisis.includes(x.id) || anciens.includes(x.id)))) {
        try {
          if (!choisis.includes(p.id)) { await retirerEvenement(p.email, idGoogle); agenda.push({ nom: p.nom, statut: 'retiré' }); continue; }
          const r = await poserEvenement(p.email, idGoogle, { debutMs, finMs: debutMs + duree * 60000, titre: `${cfg.titre} · ${String(t.name || '')}`, lieu: adresse, description });
          agenda.push({ nom: p.nom, statut: r === 'cree' ? 'ajouté' : 'déplacé' });
        } catch (e) {
          agenda.push({ nom: p.nom, statut: 'erreur', erreur: texte((e as any)?.message || e, 160) });
        }
      }
      for (const p of personnes.filter((x) => choisis.includes(x.id) && !x.email)) agenda.push({ nom: p.nom, statut: 'erreur', erreur: 'pas d’email dans ClickUp' });
    }

    // 6. Trace
    const quand = libelleQuand(jour, minutes);
    const noms = personnes.filter((p) => choisis.includes(p.id)).map((p) => p.nom);
    await commenter([
      `${cfg.titre} ${ancienne ? 'décalé' : 'calé'} depuis l'application par ${auteur} : ${quand} (${option?.nom || `${duree} min`}), avec ${noms.join(', ')}.`,
      ancienne ? `Ancien rendez-vous : ${libelleQuand(ancienne.jour, ancienne.minutes)}.` : '',
      agenda.length ? `🗓️ Agenda Google : ${agenda.map((x) => `${prenom(x.nom)} ${x.statut}${x.erreur ? ` (${x.erreur})` : ''}`).join(', ')}.` : '',
      avertissements.length ? `⚠️ ${avertissements.join(' ')}` : '',
    ]);

    return json({ success: true, preview, quand, duree: option?.nom || `${duree} min`, statut, equipe: noms, agenda, avertissements, lienFiche: `/interne/element/${t.id}` });
  } catch (e) {
    console.error('Caler un rendez-vous (écriture)', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}
