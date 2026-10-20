import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { membresDuRole, rolesDe } from '@/lib/roles';
import { getQualificationListId } from '@/lib/listesClickUp';
import { CHAMPS_INTERVENTION, LISTES, etapePlanning } from '@/lib/espaces';
import { adresseDe, champ, dateVisiteDe } from '@/lib/vuesFiches';
import { agendaBranche, idEvenement, occupationsAgenda, poserEvenement, retirerEvenement, type GarderNos } from '@/lib/googleAgenda';
import { DEPARTS_POSE, demiJourneesDe, jourEtMinutes, libellePose, parisVersMs, segmentsPose, villeDe, type Segment } from '@/lib/demiJournees';
import { dureeRdv, dureeReleve } from '@/lib/dureesRdv';
import { adresses } from '@/lib/adresses';

// Planifier la pose d'un chantier (17/10/2026, 22 h 49, Matthieu : « il faut que ça fonctionne de la même manière pour
// les installateurs pour leur caler les chantiers » ; durée choisie à chaque chantier, ½ j à 5 j).
// GET ?id=<chantier du Planning> : le chantier (date, durée et techniciens actuels), les installateurs et chefs de chantier
//   (groupes ClickUp), leurs occupations sur 35 jours dans l'ERP et leurs créneaux Google Agenda (horaires seulement).
// 18/10, 9 h 22 (Matthieu : « il faut que toutes les durées soient paramétrables ») : chaque occupation ERP a sa durée
//   ClickUp (src/lib/dureesRdv.ts) : poses ⏳ Durée intervention, visites et dépannages ⏳ Durée RDV (1 h 30 si vide),
//   relevés ⏳ Durée relevé (1 h si vide) ; sans heure = journée.
// 18/10, 12 h 55 (Matthieu : « mon rendez-vous visite technique du lundi 19 n'apparaît pas dans le planning ») : un de
//   nos rendez-vous Google (relevé, pose, visite, dépannage) n'est plus ignoré que si l'ERP le montre déjà ; sinon (fiche
//   passée en gagné avant la date du relevé, statut changé à la main…) il compte comme créneau occupé de l'agenda.
// 18/10, 13 h 05 (« non ça n'apparaît toujours pas ») : la fiche du relevé EST le chantier à planifier (une fiche va de
//   la visite au Parc). Le chantier n'exclut donc que ses propres poses (sa planification actuelle, affichée à part) ;
//   l'ERP est indexé par type et fiche (« releve:<id> », « pose:<id> »…).
// POST { id, jour, minutes (480 ou 810), duree (libellé de ⏳ Durée intervention), techniciens: [ids] } :
//   📅 Date Intervention (début, avec l'heure), ⏳ Durée intervention, 👷 Technicien (ajoutés et retirés), statut
//   📅 planifié si le chantier était à planifier ou en préparation, événements « 🏗️ Pose · nom » (un par jour) dans
//   l'agenda Google de chaque technicien, retirés de l'agenda de ceux qui n'y sont plus, commentaire de trace.
//   Un échec Google n'annule jamais l'écriture ClickUp : il est signalé par personne.
// 17/10, 23 h 00 (Matthieu : « pouvoir supprimer un créneau aussi si on se trompe ») : POST { id, action: 'annuler' }
//   vide la date et la durée, retire les événements Google, repasse le chantier planifié en 📥 à planifier (les
//   techniciens restent affectés) et laisse une trace en commentaire.
// Droits : chef de chantier et direction. Preview : seules les fiches avec « Test » dans le nom sont modifiées.
// Le fichier n'exporte que les handlers (règle des routes Next).

export const dynamic = 'force-dynamic';
const API = 'https://api.clickup.com/api/v2';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const texte = (v: unknown, max = 200) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const AUTORISES = ['direction', 'chargeOperation'];
const STATUT_PLANIFIE = '📅 planifié';
const STATUT_A_PLANIFIER = '📥 à planifier';
const JOURS_PLANNING = 35;
const PAGES_MAX = 10;

type Personne = { id: number; nom: string; email: string; role: string };
type Bloc = { jour: string; debut: number; fin: number; journee: boolean; type: 'pose' | 'visite' | 'depannage' | 'releve'; nom: string; ville: string; personnes: number[] };
type ChampDuree = { id: string; options: { id: string; nom: string; ordre: number }[] };
// Préfixe des événements Google de chaque type (src/lib/googleAgenda.ts)
const PREFIXE: Record<Bloc['type'], string> = { pose: 'pose', visite: 'visite', depannage: 'depan', releve: 'releve' };

const jourParis = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const prenom = (nom: string) => nom.split(/\s+/)[0] || nom;

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

// ⏳ Durée intervention, cherché par son nom dans le Planning (créé le 17/10, 22 h 49)
async function champDuree(token: string): Promise<ChampDuree | null> {
  const r = await fetch(`${API}/list/${LISTES.planning}/field`, { headers: { Authorization: token }, cache: 'no-store' });
  if (!r.ok) return null;
  const j = await r.json().catch(() => ({}));
  const f = (Array.isArray(j?.fields) ? j.fields : []).find((x: any) => normal(x?.name).includes('duree intervention'));
  if (!f) return null;
  const options = (Array.isArray(f?.type_config?.options) ? f.type_config.options : []).map((o: any) => ({ id: String(o?.id), nom: String(o?.name ?? o?.label ?? ''), ordre: Number(o?.orderindex) }));
  return { id: String(f.id), options };
}
const dureeDe = (t: any, cd: ChampDuree | null): string => {
  if (!cd) return '';
  const v = champ(t, cd.id)?.value;
  if (v === undefined || v === null || v === '') return '';
  const o = cd.options.find((x) => x.id === String(v) || x.ordre === Number(v));
  return o?.nom || '';
};

// Personnes qui posent : installateurs, puis chefs de chantier
async function personnesPose(token: string): Promise<Personne[]> {
  const [poseurs, chefs] = await Promise.all([membresDuRole(token, 'poseur'), membresDuRole(token, 'chargeOperation')]);
  const res: Personne[] = poseurs.map((p) => ({ id: p.id, nom: p.nom, email: p.email, role: 'Installateur' }));
  for (const c of chefs) if (!res.some((p) => p.id === c.id)) res.push({ id: c.id, nom: c.nom, email: c.email, role: 'Chef de chantier' });
  return res;
}

// Occupations des personnes dans l'ERP sur 35 jours, avec leur durée ClickUp, sans le chantier à planifier.
// montres = rendez-vous montrés, « <préfixe>:<id de la fiche> » (leur événement Google est alors ignoré, pas compté deux fois)
async function occupationsErp(token: string, ids: number[], saufId: string, cd: ChampDuree | null): Promise<{ blocs: Bloc[]; incomplet: boolean; montres: Set<string> }> {
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
  const montres = new Set<string>();
  const qui = (v: unknown) => (Array.isArray(v) ? v : []).map((u: any) => Number(u?.id)).filter((n) => ids.includes(n));
  const garder = (s: Segment) => s.jour >= debut && s.jour <= fin;
  const rdv = (t: any, type: Bloc['type'], ms: unknown, personnes: number[], duree: number) => {
    if (!personnes.length || String(t?.id) === saufId) return;
    const d = jourEtMinutes(ms);
    if (!d || d.jour < debut || d.jour > fin) return;
    const base = { type, nom: String(t?.name || ''), ville: villeDe(adresseDe(t)), personnes };
    if (d.minutes === null) blocs.push(Object.assign({ jour: d.jour, debut: 480, fin: 1050, journee: true }, base));
    else blocs.push(Object.assign({ jour: d.jour, debut: d.minutes, fin: d.minutes + duree, journee: false }, base));
    montres.add(`${PREFIXE[type]}:${String(t?.id)}`);
  };
  const [rPlanning, rVisites, rSav, rReleves] = lus;
  if (rPlanning.status === 'fulfilled') {
    for (const t of rPlanning.value) {
      if (etapePlanning(String(t?.status?.status || '')) > 3 || String(t?.id) === saufId) continue;
      const personnes = qui(champ(t, CHAMPS_INTERVENTION.technicienChantier)?.value);
      const d = jourEtMinutes(champ(t, CHAMPS_INTERVENTION.dateChantier)?.value);
      if (!personnes.length || !d) continue;
      // Durée connue : ses demi-journées ; sinon une demi-journée à l'heure dite, ou la journée sans heure
      const demi = demiJourneesDe(dureeDe(t, cd)) || (d.minutes === null ? 2 : 1);
      const segs = segmentsPose(d.jour, d.minutes === null ? 480 : d.minutes, demi);
      if (d.minutes !== null && !demiJourneesDe(dureeDe(t, cd))) segs[0] = { jour: d.jour, debut: d.minutes, fin: d.minutes + 240 };
      for (const s of segs.filter(garder)) blocs.push({ jour: s.jour, debut: s.debut, fin: s.fin, journee: false, type: 'pose', nom: String(t?.name || ''), ville: villeDe(adresseDe(t)), personnes });
      montres.add(`pose:${String(t?.id)}`);
    }
  }
  if (rVisites.status === 'fulfilled') {
    for (const t of rVisites.value) {
      const s = normal(t?.status?.status);
      if (!s.includes('a planifier') && !s.includes('rdv confirme')) continue;
      rdv(t, 'visite', champ(t, CHAMPS_INTERVENTION.dateVisite)?.value, qui(champ(t, CHAMPS_INTERVENTION.technicienVisite)?.value), dureeRdv(t));
    }
  }
  if (rSav.status === 'fulfilled') {
    for (const t of rSav.value) {
      const s = normal(t?.status?.status);
      if (s.includes('resolu') || s.includes('archive')) continue;
      rdv(t, 'depannage', t?.due_date, qui(t?.assignees), dureeRdv(t));
    }
  }
  if (rReleves.status === 'fulfilled') {
    for (const t of rReleves.value) {
      if (!normal(t?.status?.status).includes('a visiter')) continue;
      rdv(t, 'releve', dateVisiteDe(t), qui(t?.assignees), dureeReleve(t));
    }
  }
  return { blocs, incomplet: lus.some((r) => r.status !== 'fulfilled'), montres };
}

// Créneaux occupés des Google Agendas (tous les agendas affichés, horaires seulement)
async function lireAgendas(personnes: Personne[], garderNos?: GarderNos) {
  const creneaux: { personne: number; jour: string; debut: number; fin: number; journee: boolean }[] = [];
  const erreurs: string[] = [];
  if (!agendaBranche()) return { branche: false, creneaux, erreurs };
  const depuis = new Date();
  const jusque = new Date(Date.now() + JOURS_PLANNING * 86400000);
  const lus = await Promise.allSettled(personnes.map((p) => (p.email ? occupationsAgenda(p.email, depuis, jusque, garderNos) : Promise.reject(new Error('pas d’email dans ClickUp')))));
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

async function lireChantier(token: string, id: string): Promise<{ ok: true; t: any } | { ok: false; status: number; erreur: string }> {
  if (!id) return { ok: false, status: 400, erreur: 'Chantier manquant' };
  const r = await fetch(`${API}/task/${encodeURIComponent(id)}`, { headers: { Authorization: token }, cache: 'no-store' });
  if (!r.ok) return { ok: false, status: r.status === 404 ? 404 : 502, erreur: r.status === 404 ? 'Chantier introuvable' : `ClickUp a refusé la lecture (${r.status})` };
  const t = await r.json().catch(() => null);
  if (String(t?.list?.id) !== LISTES.planning) return { ok: false, status: 400, erreur: 'Cette fiche n’est pas un chantier du Planning' };
  if (t?.parent) return { ok: false, status: 400, erreur: 'Ouvre le chantier, pas un de ses éléments' };
  return { ok: true, t };
}

async function autoriser(request: Request, token: string) {
  const session = await sessionDeRequete(request);
  if (!session?.id) return { ok: false as const, reponse: json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401) };
  const roles = await rolesDe(token, session.id);
  if (!AUTORISES.some((r) => (roles as string[]).includes(r))) return { ok: false as const, reponse: json({ success: false, error: 'Planifier une pose est réservé au chef de chantier et à la direction.' }, 403) };
  return { ok: true as const, session };
}

const segmentsDe = (t: any, cd: ChampDuree | null): Segment[] => {
  const d = jourEtMinutes(champ(t, CHAMPS_INTERVENTION.dateChantier)?.value);
  if (!d) return [];
  return segmentsPose(d.jour, d.minutes === null ? 480 : d.minutes, demiJourneesDe(dureeDe(t, cd)) || 2);
};
const techniciensDe = (t: any): number[] =>
  (Array.isArray(champ(t, CHAMPS_INTERVENTION.technicienChantier)?.value) ? champ(t, CHAMPS_INTERVENTION.technicienChantier)?.value : []).map((u: any) => Number(u?.id)).filter((n: number) => n > 0);

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
  const a = await autoriser(request, token);
  if (!a.ok) return a.reponse;
  try {
    const lu = await lireChantier(token, texte(new URL(request.url).searchParams.get('id'), 30));
    if (!lu.ok) return json({ success: false, error: lu.erreur }, lu.status);
    const t = lu.t;
    const [cd, personnes] = await Promise.all([champDuree(token), personnesPose(token)]);
    const ids = personnes.map((p) => p.id);
    // L'ERP d'abord : ses rendez-vous décident quels événements Google de l'appli sont déjà montrés
    const erp = await occupationsErp(token, ids, String(t.id), cd);
    const chantierId = String(t.id);
    const agenda = await lireAgendas(personnes, (ficheId, prefixe) =>
      !(prefixe === 'pose' && ficheId === chantierId) && !erp.montres.has(`${prefixe}:${ficheId}`));
    const d = jourEtMinutes(champ(t, CHAMPS_INTERVENTION.dateChantier)?.value);
    const actuels = segmentsDe(t, cd);
    return json({
      success: true,
      preview: process.env.VERCEL_ENV !== 'production',
      chantier: {
        id: String(t.id),
        nom: String(t.name || ''),
        statut: String(t?.status?.status || ''),
        etape: etapePlanning(String(t?.status?.status || '')),
        adresse: adresseDe(t),
        ville: villeDe(adresseDe(t)),
        jour: d?.jour || '',
        minutes: d ? d.minutes : null,
        duree: dureeDe(t, cd),
        quand: actuels.length ? libellePose(actuels) : '',
        techniciens: techniciensDe(t),
      },
      durees: cd ? cd.options.map((o) => o.nom) : [],
      champDureeManquant: !cd,
      personnes: personnes.map((p) => ({ id: p.id, nom: p.nom, role: p.role })),
      blocs: erp.blocs,
      planningIncomplet: erp.incomplet,
      agenda,
    });
  } catch (e) {
    console.error('Planifier la pose (lecture)', e);
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
    const lu = await lireChantier(token, texte(corps?.id, 30));
    if (!lu.ok) return json({ success: false, error: lu.erreur }, lu.status);
    const t = lu.t;
    const tid = encodeURIComponent(String(t.id));
    const etape = etapePlanning(String(t?.status?.status || ''));
    if (etape > 2) return json({ success: false, error: 'Ce chantier est déjà en cours ou terminé : il ne se planifie plus.' }, 400);
    if (preview && !/\btest\b/i.test(String(t?.name || ''))) return json({ success: false, error: 'En preview, seules les fiches de test (avec « Test » dans le nom) peuvent être modifiées.' }, 403);
    const [cd, personnes] = await Promise.all([champDuree(token), personnesPose(token)]);
    const ancienSegs = segmentsDe(t, cd);
    const anciens = techniciensDe(t);

    // Annuler la planification : date et durée vidées, événements Google retirés, retour à planifier
    if (texte(corps?.action, 20) === 'annuler') {
      if (!ancienSegs.length) return json({ success: false, error: 'Aucune pose planifiée sur ce chantier.' }, 400);
      const r = await fetch(`${API}/task/${tid}/field/${CHAMPS_INTERVENTION.dateChantier}`, { method: 'DELETE', headers: { Authorization: token }, cache: 'no-store' });
      if (!r.ok) return json({ success: false, error: `ClickUp a refusé l’annulation (${r.status})` }, 502);
      if (cd) await fetch(`${API}/task/${tid}/field/${cd.id}`, { method: 'DELETE', headers: { Authorization: token }, cache: 'no-store' }).catch(() => null);
      if (etape === 2) await fetch(`${API}/task/${tid}`, { method: 'PUT', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: STATUT_A_PLANIFIER }), cache: 'no-store' }).catch(() => null);
      let agendaOk = true;
      if (agendaBranche()) {
        for (const p of personnes.filter((x) => x.email && anciens.includes(x.id))) {
          for (let i = 0; i < ancienSegs.length; i++) {
            try { await retirerEvenement(p.email, idEvenement('pose', String(t.id), i)); } catch { agendaOk = false; }
          }
        }
      }
      await fetch(`${API}/task/${tid}/comment`, {
        method: 'POST',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_text: `🏗️ Pose déplanifiée depuis l'application par ${auteur} (elle était prévue ${libellePose(ancienSegs)}). Les techniciens restent affectés.${agendaOk ? '' : '\n⚠️ Des événements n’ont pas pu être retirés des agendas Google.'}`, notify_all: false }),
        cache: 'no-store',
      }).catch(() => null);
      return json({ success: true, annule: true, agendaOk, preview });
    }

    const jour = /^\d{4}-\d{2}-\d{2}$/.test(texte(corps?.jour, 10)) ? texte(corps.jour, 10) : '';
    const minutes = Number(corps?.minutes);
    if (!jour || !DEPARTS_POSE.includes(minutes)) return json({ success: false, error: 'Choisis une demi-journée de départ dans l’agenda' }, 400);
    if (!cd) return json({ success: false, error: 'Le champ ⏳ Durée intervention est introuvable dans le Planning Chantiers' }, 500);
    const option = cd.options.find((o) => o.nom === texte(corps?.duree, 30));
    if (!option) return json({ success: false, error: 'Choisis la durée de la pose' }, 400);
    const choisis = (Array.isArray(corps?.techniciens) ? corps.techniciens : []).map(Number).filter((n: number) => personnes.some((p) => p.id === n));
    if (!choisis.length) return json({ success: false, error: 'Choisis au moins un installateur' }, 400);
    const segs = segmentsPose(jour, minutes, demiJourneesDe(option.nom));
    const debutMs = parisVersMs(jour, minutes);
    if (debutMs < Date.now()) return json({ success: false, error: 'Ce créneau est déjà passé' }, 400);

    const ecrire = (champId: string, valeur: any) => fetch(`${API}/task/${tid}/field/${champId}`, {
      method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify(valeur), cache: 'no-store',
    });
    const avertissements: string[] = [];

    // 1. Date de début (avec l'heure)
    const rDate = await ecrire(CHAMPS_INTERVENTION.dateChantier, { value: debutMs, value_options: { time: true } });
    if (!rDate.ok) return json({ success: false, error: `ClickUp a refusé la date (${rDate.status})` }, 502);
    // 2. Durée
    const rDuree = await ecrire(cd.id, { value: option.id });
    if (!rDuree.ok) avertissements.push('La durée n’a pas pu être enregistrée.');
    // 3. Techniciens
    const add = choisis.filter((n: number) => !anciens.includes(n));
    const rem = anciens.filter((n: number) => !choisis.includes(n));
    if (add.length || rem.length) {
      const rTech = await ecrire(CHAMPS_INTERVENTION.technicienChantier, { value: { add, rem } });
      if (!rTech.ok) avertissements.push('Les installateurs n’ont pas pu être enregistrés sur le chantier.');
    }
    // 4. Statut planifié (depuis à planifier ou préparation)
    let statut = String(t?.status?.status || '');
    if (etape < 2) {
      const rs = await fetch(`${API}/task/${tid}`, { method: 'PUT', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: STATUT_PLANIFIE }), cache: 'no-store' });
      if (rs.ok) statut = STATUT_PLANIFIE;
      else avertissements.push('Le statut n’a pas pu passer à « planifié ».');
    }

    // 5. Google Agenda : un événement par jour pour chaque technicien, retiré de l'agenda de ceux qui n'y sont plus
    const agenda: { nom: string; statut: string; erreur?: string }[] = [];
    if (agendaBranche()) {
      const origine = new URL(request.url).origin;
      const equipe = personnes.filter((p) => choisis.includes(p.id)).map((p) => p.nom);
      const description = [`Installateurs : ${equipe.join(', ')}`, `Durée : ${option.nom}`, `Planifié par ${auteur} depuis l'application CHARGéO.`, `Fiche : ${origine}${adresses.affaire(String(t.id))}`].join('\n');
      const concernes = personnes.filter((p) => p.email && (choisis.includes(p.id) || anciens.includes(p.id)));
      for (const p of concernes) {
        try {
          const garde = choisis.includes(p.id);
          // Jours en trop de l'ancienne planification, ou tous si la personne n'y est plus
          for (let i = garde ? segs.length : 0; i < ancienSegs.length; i++) await retirerEvenement(p.email, idEvenement('pose', String(t.id), i));
          if (!garde) { agenda.push({ nom: p.nom, statut: 'retiré' }); continue; }
          for (let i = 0; i < segs.length; i++) {
            await poserEvenement(p.email, idEvenement('pose', String(t.id), i), {
              debutMs: parisVersMs(segs[i].jour, segs[i].debut),
              finMs: parisVersMs(segs[i].jour, segs[i].fin),
              titre: `🏗️ Pose · ${String(t.name || '')}${segs.length > 1 ? ` (jour ${i + 1}/${segs.length})` : ''}`,
              lieu: adresseDe(t),
              description,
            });
          }
          agenda.push({ nom: p.nom, statut: 'ajouté' });
        } catch (e) {
          agenda.push({ nom: p.nom, statut: 'erreur', erreur: texte((e as any)?.message || e, 160) });
        }
      }
      for (const p of personnes.filter((x) => choisis.includes(x.id) && !x.email)) agenda.push({ nom: p.nom, statut: 'erreur', erreur: 'pas d’email dans ClickUp' });
    }

    // 6. Commentaire de trace
    const quand = libellePose(segs);
    const noms = personnes.filter((p) => choisis.includes(p.id)).map((p) => p.nom);
    await fetch(`${API}/task/${tid}/comment`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment_text: [
          `🏗️ Pose ${ancienSegs.length ? 'décalée' : 'planifiée'} depuis l'application par ${auteur} : ${quand} (${option.nom}), avec ${noms.join(', ')}.`,
          ancienSegs.length ? `Ancienne planification : ${libellePose(ancienSegs)}.` : '',
          agenda.length ? `🗓️ Agenda Google : ${agenda.map((x) => `${prenom(x.nom)} ${x.statut}${x.erreur ? ` (${x.erreur})` : ''}`).join(', ')}.` : '',
          avertissements.length ? `⚠️ ${avertissements.join(' ')}` : '',
        ].filter(Boolean).join('\n'),
        notify_all: false,
      }),
      cache: 'no-store',
    }).catch(() => null);

    return json({ success: true, preview, quand, duree: option.nom, statut, equipe: noms, agenda, avertissements, lienFiche: adresses.affaire(String(t.id)) });
  } catch (e) {
    console.error('Planifier la pose (écriture)', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}
