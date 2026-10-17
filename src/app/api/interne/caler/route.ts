import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { membresDuRole, rolesDe } from '@/lib/roles';
import { estAVisiter, getQualificationListId, lireTacheQualification } from '@/lib/listesClickUp';
import { CHAMPS } from '@/lib/champsClickUp';
import { CHAMPS_INTERVENTION, LISTES, etapePlanning } from '@/lib/espaces';
import { DATE_VISITE_ID, adresseDe, champ, dateVisiteDe, libelleDate } from '@/lib/vuesFiches';

// Caler le relevé technique depuis l'application (17/10/2026, 20 h 44, choix de Matthieu : « Caler + email de
// confirmation prêt à envoyer »). Le commercial appelle le client et fixe le rendez-vous du chef de chantier.
// GET ?id=<fiche> : la fiche (nom, adresse, email et téléphone du passeport, date déjà calée), les chefs de chantier
//   (groupe ClickUp du rôle), le chef déjà assigné et, si la visite est déjà calée, l'email de confirmation à
//   renvoyer (note d'accès reprise du dernier commentaire « 📅 Relevé technique »).
// 17/10, 20 h 59 (Matthieu : « comment je fais pour caler un rendez-vous si je n'ai pas de vue sur le planning ? ») :
//   GET renvoie aussi les occupations des chefs sur 30 jours, avec les mêmes règles que /api/interne/planning : poses
//   (📅 Date Intervention, 👷 Technicien), visites de maintenance (📆 Date de RDV, 👷 Technicien), dépannages SAV
//   (échéance, assignés) et relevés déjà calés (📅 Date Visite Technique, assignés), sans la fiche elle-même. Le
//   commercial n'a pas accès au planning complet : il ne reçoit que l'heure, le type, le nom et la ville.
// POST { id, date (AAAA-MM-JJ), heure (HH:MM), chefId?, note? } → 📅 Date Visite Technique avec l'heure (Paris), chef
//   assigné à la fiche, commentaire de trace avec le texte de l'email. Renvoie l'email de confirmation prêt à envoyer.
//   Le commercial l'ouvre dans sa messagerie, le relit et l'envoie lui-même (rien n'est envoyé par le site).
// 17/10, 20 h 53 : le texte s'arrête à « Bien cordialement, », la messagerie ajoute la signature de son compte ; nom et
//   CHARGéO sont ajoutés seulement au texte copié (signature). Le texte est gardé dans le commentaire de la fiche.
// Droits : commercial, chef de chantier et direction. Fiche de la Qualification de l'environnement (🧪 TEST en preview,
// où seules les fiches « Test … » sont modifiées), au statut 📍 à visiter.
// Le fichier n'exporte que les handlers (règle des routes Next).

export const dynamic = 'force-dynamic';
const API = 'https://api.clickup.com/api/v2';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const texte = (v: unknown, max = 200) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const AUTORISES = ['direction', 'commercial', 'chargeOperation'];
const MARQUE_COMMENTAIRE = '📅 Relevé technique';
const MARQUE_NOTE = 'Accès / remarques : ';
const JOURS_PLANNING = 30;
const PAGES_MAX = 10;

// « 2026-10-22 » + « 14:30 », heure de Paris → horodatage
function parisVersMs(date: string, heure: string): number {
  const [a, m, j] = date.split('-').map(Number);
  const [h, mi] = heure.split(':').map(Number);
  const essai = Date.UTC(a, m - 1, j, h, mi);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(essai));
  const p = (t: string) => Number(parts.find((x) => x.type === t)?.value);
  const vuParis = Date.UTC(p('year'), p('month') - 1, p('day'), p('hour'), p('minute'));
  return essai - (vuParis - essai);
}
// « jeudi 22 octobre à 14h30 »
function libelleLong(ms: number): string {
  const d = new Date(ms);
  const jour = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const h = parts.find((x) => x.type === 'hour')?.value || '00';
  const mi = parts.find((x) => x.type === 'minute')?.value || '00';
  return `${jour} à ${h}h${mi}`;
}
// « AAAA-MM-JJ » à Paris, et minutes depuis minuit si l'heure est précisée (date sans heure : 0 h ou 4 h)
function jourEtMinutes(ms: unknown): { jour: string; minutes: number | null } | null {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return null;
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(n));
  const v = (t: string) => p.find((x) => x.type === t)?.value || '00';
  const h = Number(v('hour'));
  const m = Number(v('minute'));
  return { jour: `${v('year')}-${v('month')}-${v('day')}`, minutes: m === 0 && (h === 0 || h === 4) ? null : h * 60 + m };
}
const jourParis = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
// Ville d'une adresse (« 41 Av. Anna de Noailles, 74500 Évian-les-Bains, France » → « Évian-les-Bains »)
function villeDe(adresse: string): string {
  const m = adresse.match(/\b\d{5}\s+([^,]+)/);
  if (m) return m[1].trim();
  const morceaux = adresse.split(',').map((s) => s.trim()).filter(Boolean);
  return morceaux.length > 1 ? morceaux[morceaux.length - 2] : morceaux[0] || '';
}
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

type Occupation = { jour: string; minutes: number | null; type: 'pose' | 'visite' | 'depannage' | 'releve'; nom: string; ville: string; techniciens: number[] };

// Occupations des chefs sur les 30 prochains jours (mêmes règles que /api/interne/planning), sans la fiche à caler
async function occupationsDes(token: string, chefs: number[], saufId: string): Promise<{ occupations: Occupation[]; incomplet: boolean }> {
  if (!chefs.length) return { occupations: [], incomplet: false };
  const debut = jourParis(new Date());
  const fin = jourParis(new Date(Date.now() + JOURS_PLANNING * 86400000));
  const qualification = String(getQualificationListId() || '');
  const lus = await Promise.allSettled([
    lister(token, LISTES.planning),
    lister(token, LISTES.maintenance),
    lister(token, LISTES.sav),
    qualification ? lister(token, qualification) : Promise.resolve([] as any[]),
  ]);
  const occupations: Occupation[] = [];
  const ids = (v: unknown) => (Array.isArray(v) ? v : []).map((u: any) => Number(u?.id)).filter((n) => chefs.includes(n));
  const pousser = (t: any, type: Occupation['type'], ms: unknown, techniciens: number[]) => {
    if (!techniciens.length || String(t?.id) === saufId) return;
    const d = jourEtMinutes(ms);
    if (!d || d.jour < debut || d.jour > fin) return;
    occupations.push({ jour: d.jour, minutes: d.minutes, type, nom: String(t?.name || ''), ville: villeDe(adresseDe(t)), techniciens });
  };
  const [rPlanning, rVisites, rSav, rReleves] = lus;
  if (rPlanning.status === 'fulfilled') {
    for (const t of rPlanning.value) {
      if (etapePlanning(String(t?.status?.status || '')) > 3) continue;
      pousser(t, 'pose', champ(t, CHAMPS_INTERVENTION.dateChantier)?.value, ids(champ(t, CHAMPS_INTERVENTION.technicienChantier)?.value));
    }
  }
  if (rVisites.status === 'fulfilled') {
    for (const t of rVisites.value) {
      const s = normal(t?.status?.status);
      if (!s.includes('a planifier') && !s.includes('rdv confirme')) continue;
      pousser(t, 'visite', champ(t, CHAMPS_INTERVENTION.dateVisite)?.value, ids(champ(t, CHAMPS_INTERVENTION.technicienVisite)?.value));
    }
  }
  if (rSav.status === 'fulfilled') {
    for (const t of rSav.value) {
      const s = normal(t?.status?.status);
      if (s.includes('resolu') || s.includes('archive')) continue;
      pousser(t, 'depannage', t?.due_date, ids(t?.assignees));
    }
  }
  if (rReleves.status === 'fulfilled') {
    for (const t of rReleves.value) {
      if (!normal(t?.status?.status).includes('a visiter')) continue;
      pousser(t, 'releve', dateVisiteDe(t), ids(t?.assignees));
    }
  }
  occupations.sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : (a.minutes ?? -1) - (b.minutes ?? -1)));
  return { occupations, incomplet: lus.some((r) => r.status !== 'fulfilled') };
}

// Email de confirmation (sans signature : la messagerie ajoute celle du compte qui envoie)
function emailDe(t: any, ms: number, chefNom: string, note: string, auteur: string) {
  const quand = libelleLong(ms);
  const adresse = adresseDe(t);
  const lignes = [
    'Bonjour,',
    '',
    `Je vous confirme notre rendez-vous pour le relevé technique de votre projet de recharge, le ${quand}${adresse ? `, au ${adresse}` : ''}.`,
    '',
    `${chefNom ? `${prenom(chefNom)}, notre chef de chantier,` : 'Notre chef de chantier'} viendra sur place pour environ une heure. Il aura besoin d’accéder au tableau électrique (ou au local compteurs) et aux emplacements prévus pour les bornes.`,
  ];
  if (note) lignes.push('', `Noté pour l’accès : ${note}`);
  lignes.push('', 'En cas d’empêchement, il suffit de répondre à ce message pour convenir d’un autre créneau.', '', 'Bien cordialement,');
  return {
    a: texte(champ(t, CHAMPS.email)?.value, 120),
    sujet: `Confirmation de votre rendez-vous de relevé technique le ${quand.replace(/ à .*/, '')}`,
    texte: lignes.join('\n'),
    signature: `${auteur}\nCHARGéO`,
    quand,
  };
}

// Note d'accès du dernier rendez-vous calé depuis l'application (commentaire de trace)
async function derniereNote(token: string, id: string): Promise<string> {
  try {
    const res = await fetch(`${API}/task/${encodeURIComponent(id)}/comment`, { headers: { Authorization: token }, cache: 'no-store' });
    if (!res.ok) return '';
    const corps = await res.json().catch(() => ({}));
    const c = (Array.isArray(corps?.comments) ? corps.comments : []).find((x: any) => String(x?.comment_text || '').startsWith(MARQUE_COMMENTAIRE));
    const ligne = String(c?.comment_text || '').split('\n').find((l) => l.startsWith(MARQUE_NOTE));
    return ligne ? ligne.slice(MARQUE_NOTE.length).trim() : '';
  } catch {
    return '';
  }
}

async function autoriser(request: Request, token: string) {
  const session = await sessionDeRequete(request);
  if (!session?.id) return { ok: false as const, reponse: json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401) };
  const roles = await rolesDe(token, session.id);
  if (!AUTORISES.some((r) => (roles as string[]).includes(r))) return { ok: false as const, reponse: json({ success: false, error: 'Caler un relevé est réservé au commercial et au chef de chantier.' }, 403) };
  return { ok: true as const, session };
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
  const a = await autoriser(request, token);
  if (!a.ok) return a.reponse;
  const auteur = texte((a.session as any).nom) || texte((a.session as any).email) || 'CHARGéO';
  try {
    const lu = await lireTacheQualification(texte(new URL(request.url).searchParams.get('id'), 30), token);
    if (!lu.ok) return json({ success: false, error: lu.erreur }, lu.status);
    const t = lu.tache;
    if (t?.parent) return json({ success: false, error: 'Ouvre la fiche principale, pas un scénario' }, 400);
    const chefs = await membresDuRole(token, 'chargeOperation');
    const assignes = (Array.isArray(t?.assignees) ? t.assignees : []).map((u: any) => Number(u?.id));
    const chefAssigne = chefs.find((c) => assignes.includes(c.id)) || null;
    const visite = dateVisiteDe(t);
    const [note, planning] = await Promise.all([
      visite ? derniereNote(token, String(t.id)) : Promise.resolve(''),
      occupationsDes(token, chefs.map((c) => c.id), String(t.id)),
    ]);
    const email = visite ? emailDe(t, visite, chefAssigne?.nom || '', note, auteur) : null;
    return json({
      success: true,
      preview: process.env.VERCEL_ENV !== 'production',
      fiche: {
        id: String(t.id),
        nom: String(t.name || ''),
        statut: String(t?.status?.status || ''),
        aVisiter: estAVisiter(t?.status?.status),
        adresse: adresseDe(t),
        ville: villeDe(adresseDe(t)),
        email: texte(champ(t, CHAMPS.email)?.value, 120),
        telephone: texte(champ(t, CHAMPS.telephone)?.value, 30),
        dejaCale: visite ? libelleDate(visite) : '',
      },
      chefs,
      chefAssigne: chefAssigne?.id || null,
      occupations: planning.occupations,
      planningIncomplet: planning.incomplet,
      // Visite déjà calée : de quoi renvoyer la confirmation sans recaler
      cale: email ? { quand: email.quand, chef: chefAssigne?.nom || '', lienFiche: `/interne/fiches/${t.id}` } : null,
      emailConfirmation: email ? { a: email.a, sujet: email.sujet, texte: email.texte, signature: email.signature } : null,
    });
  } catch (e) {
    console.error('Caler le relevé (lecture)', e);
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
    const lu = await lireTacheQualification(texte(corps?.id, 30), token);
    if (!lu.ok) return json({ success: false, error: lu.erreur }, lu.status);
    const t = lu.tache;
    if (t?.parent) return json({ success: false, error: 'Ouvre la fiche principale, pas un scénario' }, 400);
    if (!estAVisiter(t?.status?.status)) return json({ success: false, error: 'Cette fiche n’est plus à visiter : le relevé est déjà fait.' }, 400);
    if (preview && !/^test/i.test(String(t?.name || ''))) return json({ success: false, error: 'En preview, seules les fiches « Test … » peuvent être modifiées.' }, 403);

    const date = /^\d{4}-\d{2}-\d{2}$/.test(texte(corps?.date, 10)) ? texte(corps.date, 10) : '';
    const heure = /^\d{2}:\d{2}$/.test(texte(corps?.heure, 5)) ? texte(corps.heure, 5) : '';
    if (!date) return json({ success: false, error: 'Choisis le jour du relevé' }, 400);
    if (!heure) return json({ success: false, error: 'Choisis l’heure du rendez-vous' }, 400);
    const ms = parisVersMs(date, heure);
    if (!Number.isFinite(ms)) return json({ success: false, error: 'Date ou heure non reconnue' }, 400);
    if (ms < Date.now() - 60 * 60 * 1000) return json({ success: false, error: 'Ce créneau est déjà passé' }, 400);

    const chefs = await membresDuRole(token, 'chargeOperation');
    const chefId = Number(corps?.chefId) || 0;
    const chef = chefId ? chefs.find((c) => c.id === chefId) : undefined;
    if (chefId && !chef) return json({ success: false, error: 'Ce chef de chantier est inconnu' }, 400);
    const note = texte(corps?.note, 1000).replace(/\s*\n\s*/g, ' ');

    // 1. Date et heure du relevé
    const r = await fetch(`${API}/task/${encodeURIComponent(String(t.id))}/field/${DATE_VISITE_ID}`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: ms, value_options: { time: true } }),
      cache: 'no-store',
    });
    if (!r.ok) {
      console.error('Date de visite refusée', r.status, await r.text().catch(() => ''));
      return json({ success: false, error: `ClickUp a refusé la date (${r.status})` }, 502);
    }
    // 2. Chef de chantier assigné (un échec n'annule pas la date, il est signalé)
    let chefOk = true;
    if (chef) {
      const ra = await fetch(`${API}/task/${encodeURIComponent(String(t.id))}`, {
        method: 'PUT',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignees: { add: [chef.id], rem: [] } }),
        cache: 'no-store',
      });
      chefOk = ra.ok;
    }
    const email = emailDe(t, ms, chef?.nom || '', note, auteur);
    // 3. Commentaire de trace, avec le texte de l'email préparé
    const ancien = dateVisiteDe(t);
    await fetch(`${API}/task/${encodeURIComponent(String(t.id))}/comment`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment_text: [
          `${MARQUE_COMMENTAIRE} ${ancien ? 'décalé' : 'calé'} depuis l'application par ${auteur} : ${email.quand}${chef ? `, avec ${chef.nom}` : ''}.`,
          ancien ? `Ancienne date : ${libelleDate(ancien)}.` : '',
          note ? `${MARQUE_NOTE}${note}` : '',
          '',
          `✉️ Email de confirmation préparé${email.a ? ` pour ${email.a}` : ' (pas d’email sur la fiche)'} :`,
          `Objet : ${email.sujet}`,
          email.texte,
        ].filter((l, i) => l !== '' || i === 3).join('\n'),
        notify_all: false,
      }),
      cache: 'no-store',
    }).catch(() => null);

    return json({
      success: true,
      preview,
      chefOk,
      cale: { quand: email.quand, chef: chef?.nom || '', lienFiche: `/interne/fiches/${t.id}` },
      emailConfirmation: { a: email.a, sujet: email.sujet, texte: email.texte, signature: email.signature },
    });
  } catch (e) {
    console.error('Caler le relevé (écriture)', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}
