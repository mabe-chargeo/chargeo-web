import { estAVisiter, getQualificationListId } from '@/lib/listesClickUp';
import { dateVisiteDe } from '@/lib/vuesFiches';
import { mailAFaire, poserMailAFaire } from '@/lib/mailsAFaire';

// Rappel de la veille obligatoire (Phase 9, décision de Mathieu du 05/11/2026, 21 h 56 à 21 h 58), appelé par le
// contrôle quotidien (src/app/api/cron/quotidien/route.ts, 5 h UTC) : « ✉️ Mail à envoyer » = visite-rappel-veille sur
// les fiches à visiter dont la visite tombe le lendemain (du lundi au jeudi) ou le samedi, dimanche ou lundi (le
// vendredi). Rien le week-end. Une fiche qui a déjà un mail en attente (confirmation pas encore partie) le garde.
// Le commercial l'envoie depuis la fiche : rien ne part tout seul. Simulation : rien n'est écrit.
// 06/11/2026 (lot 4) : lister est aussi lu par les relances de devis (src/lib/relancesDevis.ts).

const PAGES_MAX = 10;
const JOUR_MS = 86400000;
const jourParis = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));

// Fiches principales (sans sous-tâches) d'une liste, ouvertes et non archivées
export async function lister(token: string, listId: string): Promise<any[]> {
  const toutes: any[] = [];
  for (let page = 0; page < PAGES_MAX; page++) {
    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false&include_closed=false&subtasks=false&page=${page}`, { headers: { Authorization: token }, cache: 'no-store' });
    if (!res.ok) throw new Error(`ClickUp a refusé la lecture (${res.status})`);
    const corps = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(corps?.tasks) ? corps.tasks : [];
    toutes.push(...lot.filter((t) => !t?.parent));
    if (corps?.last_page !== false || lot.length === 0) break;
  }
  return toutes;
}

export async function poserRappelsVeille(simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY as string;
  const listId = getQualificationListId();
  if (!token || !listId) return { success: false, error: 'configuration incomplète' };
  const maintenant = Date.now();
  const jourSemaine = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short' }).format(new Date(maintenant));
  const horizon = jourSemaine === 'Fri' ? 3 : jourSemaine === 'Sat' || jourSemaine === 'Sun' ? 0 : 1;
  const jours = Array.from({ length: horizon }, (_, i) => jourParis(maintenant + (i + 1) * JOUR_MS));
  if (!jours.length) return { success: true, simulation, jours, poses: [] as string[], refus: [] as string[] };
  const taches = await lister(token, String(listId));
  const cibles = taches.filter((t) => {
    const v = dateVisiteDe(t);
    return estAVisiter(t?.status?.status) && !mailAFaire(t) && !!v && jours.includes(jourParis(v));
  });
  const poses: string[] = [];
  const refus: string[] = [];
  for (const t of cibles) {
    const nom = String(t?.name || t?.id || '');
    if (simulation) { poses.push(nom); continue; }
    const ok = await poserMailAFaire(token, t, 'visite-rappel-veille').catch(() => false);
    (ok ? poses : refus).push(nom);
  }
  return { success: true, simulation, jours, poses, refus };
}
