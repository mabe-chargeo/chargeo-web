import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { aujourdhuiParis } from '@/lib/joursOuvres';
import { getQualificationListId } from '@/lib/listesClickUp';
import { adresseDe, champ, dateVisiteDe } from '@/lib/vuesFiches';
import { CHAMPS_INTERVENTION, LISTES, etapePlanning } from '@/lib/espaces';

// Planning (lot B des écrans manquants, 17/10/2026) : Master planning (par date) et Planning techs (par installateur).
// LECTURE SEULE. Le planning sert à planifier avec les clients (Matthieu, 17/10, 18 h 34) : interventions chantier,
// dépannages, visites de maintenance et relevés techniques. Pas de livraisons (elles restent dans Matériel : suivi
// logistique, réceptions sous 7 jours).
// - Pose : chantier du Planning à planifier, en préparation, planifié ou en cours ; date = 📅 Date Intervention,
//   techniciens = 👷 Technicien. Ouvre la fiche affaire.
// - Visite : Maintenance à planifier ou RDV confirmé ; date = 📆 Date de RDV, techniciens = 👷 Technicien.
// - Dépannage : ticket SAV ni résolu ni archivé ; date = échéance, techniciens = assignés.
// - Relevé : fiche de Qualification 📍 à visiter dont la visite est calée (📅 Date Visite Technique), techniciens =
//   assignés. Ouvre la fiche affaire. En preview, lue dans 🧪 Qualification TEST.
// Droits : chef de chantier, back-office, direction.

export const dynamic = 'force-dynamic';
const PAGES_MAX = 10;
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

type TypeIntervention = 'pose' | 'visite' | 'depannage' | 'releve';

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

const personnes = (v: unknown) =>
  (Array.isArray(v) ? v : []).filter((u: any) => u?.id).map((u: any) => ({ id: String(u.id), nom: String(u.username || u.email || 'Technicien') }));

// « AAAA-MM-JJ » à Paris, et heure si elle est précisée (ClickUp enregistre 0 h ou 4 h pour une date sans heure)
function jourEtHeure(ms: unknown): { jour: string; heure: string } | null {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return null;
  const p = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(n));
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
    if (!['direction', 'chargeOperation', 'backOffice'].some((r) => roles.includes(r as any))) {
      return json({ error: 'Le planning est réservé au chef de chantier, au back-office et à la direction.' }, 403);
    }
    const qualification = String(getQualificationListId() || '');
    const [rPlanning, rVisites, rSav, rReleves] = await Promise.allSettled([
      lister(token, LISTES.planning),
      lister(token, LISTES.maintenance),
      lister(token, LISTES.sav),
      qualification ? lister(token, qualification) : Promise.resolve([] as any[]),
    ]);
    const avertissements: string[] = [];
    const items: any[] = [];
    const pousser = (t: any, type: TypeIntervention, ms: unknown, techniciens: { id: string; nom: string }[], lien: string) => {
      const d = jourEtHeure(ms);
      items.push({
        id: String(t.id), type, nom: String(t.name || ''),
        statut: String(t?.status?.status || ''), couleurStatut: String(t?.status?.color || ''),
        jour: d?.jour || '', heure: d?.heure || '', techniciens, adresse: adresseDe(t), lien,
      });
    };

    if (rPlanning.status === 'fulfilled') {
      for (const t of rPlanning.value) {
        if (etapePlanning(String(t?.status?.status || '')) > 3) continue;
        pousser(t, 'pose', champ(t, CHAMPS_INTERVENTION.dateChantier)?.value, personnes(champ(t, CHAMPS_INTERVENTION.technicienChantier)?.value), `/interne/fiches/${t.id}`);
      }
    } else avertissements.push('Planning Chantiers illisible pour l’instant');

    if (rVisites.status === 'fulfilled') {
      for (const t of rVisites.value) {
        const s = normal(t?.status?.status);
        if (!s.includes('a planifier') && !s.includes('rdv confirme')) continue;
        pousser(t, 'visite', champ(t, CHAMPS_INTERVENTION.dateVisite)?.value, personnes(champ(t, CHAMPS_INTERVENTION.technicienVisite)?.value), `/interne/element/${t.id}`);
      }
    } else avertissements.push('Maintenance illisible pour l’instant');

    if (rSav.status === 'fulfilled') {
      for (const t of rSav.value) {
        const s = normal(t?.status?.status);
        if (s.includes('resolu') || s.includes('archive')) continue;
        pousser(t, 'depannage', t?.due_date, personnes(t?.assignees), `/interne/element/${t.id}`);
      }
    } else avertissements.push('Tickets SAV illisibles pour l’instant');

    // Relevés techniques calés par le commercial (les visites pas encore calées sont dans « Visites à caler »)
    if (rReleves.status === 'fulfilled') {
      for (const t of rReleves.value) {
        if (!normal(t?.status?.status).includes('a visiter')) continue;
        const visite = dateVisiteDe(t);
        if (!visite) continue;
        pousser(t, 'releve', visite, personnes(t?.assignees), `/interne/fiches/${t.id}`);
      }
    } else avertissements.push('Relevés techniques illisibles pour l’instant');

    const a = aujourdhuiParis();
    return json({ aujourdhui: String(a), items, avertissements, moi: String(session.id) });
  } catch (error) {
    console.error('Planning :', error);
    return json({ error: 'Lecture du planning impossible pour l’instant' }, 500);
  }
}
