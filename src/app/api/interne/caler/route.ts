import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { membresDuRole, rolesDe } from '@/lib/roles';
import { estAVisiter, lireTacheQualification } from '@/lib/listesClickUp';
import { CHAMPS } from '@/lib/champsClickUp';
import { DATE_VISITE_ID, adresseDe, champ, dateVisiteDe, libelleDate } from '@/lib/vuesFiches';

// Caler le relevé technique depuis l'application (17/10/2026, 20 h 44, choix de Matthieu : « Caler + email de
// confirmation prêt à envoyer »). Le commercial appelle le client et fixe le rendez-vous du chef de chantier.
// GET ?id=<fiche> : la fiche (nom, adresse, email et téléphone du passeport, date déjà calée), les chefs de chantier
//   (groupe ClickUp du rôle) et le chef déjà assigné.
// POST { id, date (AAAA-MM-JJ), heure (HH:MM), chefId?, note? } → 📅 Date Visite Technique avec l'heure (Paris), chef
//   assigné à la fiche, commentaire de trace. Renvoie l'email de confirmation prêt à envoyer (à, objet, texte) : le
//   commercial l'ouvre dans sa messagerie, le relit et l'envoie lui-même (rien n'est envoyé par le site).
// La fiche passe d'elle-même de « Visites à caler » à « Agenda des visites » et « Relevés planifiés » (vuesFiches).
// Droits : commercial, chef de chantier et direction. Fiche de la Qualification de l'environnement (🧪 TEST en preview,
// où seules les fiches « Test … » sont modifiées), au statut 📍 à visiter.
// Le fichier n'exporte que les handlers (règle des routes Next).

export const dynamic = 'force-dynamic';
const API = 'https://api.clickup.com/api/v2';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const texte = (v: unknown, max = 200) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));
const AUTORISES = ['direction', 'commercial', 'chargeOperation'];

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
const prenom = (nom: string) => nom.split(/\s+/)[0] || nom;

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
  try {
    const lu = await lireTacheQualification(texte(new URL(request.url).searchParams.get('id'), 30), token);
    if (!lu.ok) return json({ success: false, error: lu.erreur }, lu.status);
    const t = lu.tache;
    if (t?.parent) return json({ success: false, error: 'Ouvre la fiche principale, pas un scénario' }, 400);
    const chefs = await membresDuRole(token, 'chargeOperation');
    const assignes = (Array.isArray(t?.assignees) ? t.assignees : []).map((u: any) => Number(u?.id));
    const visite = dateVisiteDe(t);
    return json({
      success: true,
      preview: process.env.VERCEL_ENV !== 'production',
      fiche: {
        id: String(t.id),
        nom: String(t.name || ''),
        statut: String(t?.status?.status || ''),
        aVisiter: estAVisiter(t?.status?.status),
        adresse: adresseDe(t),
        email: texte(champ(t, CHAMPS.email)?.value, 120),
        telephone: texte(champ(t, CHAMPS.telephone)?.value, 30),
        dejaCale: visite ? libelleDate(visite) : '',
      },
      chefs,
      chefAssigne: chefs.find((c) => assignes.includes(c.id))?.id || null,
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
    const note = texte(corps?.note, 1000);

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
    const quand = libelleLong(ms);
    const adresse = adresseDe(t);
    // 3. Commentaire de trace
    const ancien = dateVisiteDe(t);
    await fetch(`${API}/task/${encodeURIComponent(String(t.id))}/comment`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment_text: [
          `📅 Relevé technique ${ancien ? 'décalé' : 'calé'} depuis l'application par ${auteur} : ${quand}${chef ? `, avec ${chef.nom}` : ''}.`,
          ancien ? `Ancienne date : ${libelleDate(ancien)}.` : '',
          note ? `Accès / remarques : ${note}` : '',
        ].filter(Boolean).join('\n'),
        notify_all: false,
      }),
      cache: 'no-store',
    }).catch(() => null);

    // 4. Email de confirmation prêt à envoyer (le commercial le relit et l'envoie de sa messagerie)
    const email = texte(champ(t, CHAMPS.email)?.value, 120);
    const sujet = `Confirmation de votre rendez-vous de relevé technique ${quand.replace(/ à .*/, '')}`;
    const texteEmail = [
      'Bonjour,',
      '',
      `Je vous confirme notre rendez-vous pour le relevé technique de votre projet de recharge, le ${quand}${adresse ? `, au ${adresse}` : ''}.`,
      '',
      `${chef ? `${prenom(chef.nom)}, notre chef de chantier,` : 'Notre chef de chantier'} viendra sur place pour environ une heure. Il aura besoin d’accéder au tableau électrique (ou au local compteurs) et aux emplacements prévus pour les bornes.`,
      note ? `\nNoté pour l’accès : ${note}` : '',
      '',
      'En cas d’empêchement, il suffit de répondre à ce message pour convenir d’un autre créneau.',
      '',
      'Bien cordialement,',
      auteur,
      'CHARGéO',
    ].filter((l) => l !== null).join('\n');

    return json({
      success: true,
      preview,
      chefOk,
      cale: { quand, chef: chef?.nom || '', lienFiche: `/interne/fiches/${t.id}` },
      emailConfirmation: { a: email, sujet, texte: texteEmail },
    });
  } catch (e) {
    console.error('Caler le relevé (écriture)', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}
