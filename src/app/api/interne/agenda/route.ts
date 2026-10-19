import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { getQualificationListId, estAVisiter } from '@/lib/listesClickUp';
import { aujourdhuiParis } from '@/lib/joursOuvres';
import { CHAMPS } from '@/lib/champsClickUp';
import { adresseDe, dateVisiteDe, nomOption, sansEmoji, vueDe } from '@/lib/vuesFiches';

// Agenda des visites (lot B des écrans manquants, 17/10/2026) : AGENDA VISITES et CARTE DES AUDITS de Qualification.
// LECTURE SEULE. Les relevés techniques calés par le commercial (fiches 📍 à visiter avec une 📅 Date Visite Technique),
// par jour, avec l'adresse et la position pour l'itinéraire du jour. Compte aussi les visites encore à caler.
// Droits : commercial, chef de chantier, direction. Preview : fiches lues dans 🧪 Qualification TEST.

export const dynamic = 'force-dynamic';
const PAGES_MAX = 10;
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });

async function lister(token: string, listId: string): Promise<any[]> {
  const toutes: any[] = [];
  for (let page = 0; page < PAGES_MAX; page++) {
    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false&include_closed=false&subtasks=false&page=${page}`, {
      headers: { Authorization: token },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`ClickUp a refusé la lecture (${res.status})`);
    const corps = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(corps?.tasks) ? corps.tasks : [];
    toutes.push(...lot.filter((t) => !t?.parent));
    if (corps?.last_page !== false || lot.length === 0) break;
  }
  return toutes;
}

function jourEtHeure(ms: number): { jour: string; heure: string } {
  const p = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms));
  const v = (t: string) => p.find((x) => x.type === t)?.value || '00';
  const h = v('hour');
  const m = v('minute');
  return { jour: `${v('year')}-${v('month')}-${v('day')}`, heure: m === '00' && (h === '00' || h === '04') ? '' : `${h}h${m}` };
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Connexion requise : reconnecte-toi.' }, 401);
  try {
    const roles = await rolesDe(token, session.id);
    if (!['direction', 'commercial', 'chargeOperation'].some((r) => roles.includes(r as any))) {
      return json({ error: 'L’agenda des visites est réservé au commercial, au chef de chantier et à la direction.' }, 403);
    }
    const listId = getQualificationListId();
    if (!listId) return json({ error: 'Liste Qualification non configurée' }, 500);
    const fiches = await lister(token, listId);
    const a = aujourdhuiParis();
    const aCaler = vueDe('a-caler');
    const visites = fiches
      .filter((t) => estAVisiter(t?.status?.status) && !!dateVisiteDe(t))
      .map((t) => {
        const ms = Number(dateVisiteDe(t));
        const { jour, heure } = jourEtHeure(ms);
        const adresse: any = (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c?.id === CHAMPS.adresse)?.value;
        return {
          id: String(t.id),
          nom: String(t.name || ''),
          jour,
          heure,
          ms,
          typeClient: sansEmoji(nomOption(t, CHAMPS.typeClient)),
          adresse: adresseDe(t),
          lat: Number(adresse?.location?.lat) || null,
          lng: Number(adresse?.location?.lng) || null,
          lien: `/interne/fiches/${t.id}`,
        };
      })
      .sort((x, y) => x.ms - y.ms);
    return json({
      visites,
      aCaler: aCaler ? fiches.filter((t) => aCaler.filtre(t, a)).length : null,
      preview: process.env.VERCEL_ENV !== 'production',
    });
  } catch (error) {
    console.error('Agenda :', error);
    return json({ error: 'Lecture de l’agenda impossible pour l’instant' }, 500);
  }
}
