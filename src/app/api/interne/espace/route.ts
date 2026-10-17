import { NextResponse } from 'next/server';
import { getQualificationListId } from '@/lib/listesClickUp';
import { aujourdhuiParis } from '@/lib/joursOuvres';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { vueDe } from '@/lib/vuesFiches';
import { ESPACES, PROSPECTION_ID, VUES_PROSPECTION } from '@/lib/espaces';

// Mon espace (un espace par rôle, validé par Matthieu le 17/10/2026). LECTURE SEULE.
// GET ?role=<rôle> : les vues de l'espace du rôle (src/lib/espaces.ts) avec leur compteur réel.
// Droits : la personne doit avoir ce rôle, ou être direction (qui peut voir l'espace de chaque rôle).
// Preview : Qualification lue dans 🧪 Qualification TEST ; Prospection et Contacts lus dans les vraies listes.

export const dynamic = 'force-dynamic';
const PAGES_MAX = 10;
const CONTACTS_ID = '1200630000008493';

async function lister(token: string, listId: string): Promise<any[]> {
  const toutes: any[] = [];
  for (let page = 0; page < PAGES_MAX; page++) {
    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false&include_closed=false&subtasks=false&page=${page}`, {
      headers: { Authorization: token },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`ClickUp a refusé la lecture (${res.status})`);
    const json = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    toutes.push(...lot.filter((t) => !t?.parent));
    if (json?.last_page !== false || lot.length === 0) break;
  }
  return toutes;
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  const session = await sessionDeRequete(request);
  if (!session?.id) return NextResponse.json({ error: 'Connexion requise : reconnecte-toi.' }, { status: 401 });

  const role = new URL(request.url).searchParams.get('role') || '';
  const espace = (ESPACES as Record<string, any>)[role];
  const preview = process.env.VERCEL_ENV !== 'production';
  if (!espace) return NextResponse.json({ espace: null, vues: [], preview });

  try {
    const roles = await rolesDe(token, session.id);
    if (!roles.includes('direction') && !(roles as string[]).includes(role)) {
      return NextResponse.json({ error: 'Cet espace ne correspond pas à ton rôle.' }, { status: 403 });
    }
    const besoin = new Set<string>(espace.vues.map((v: any) => v.source));
    const qualifId = getQualificationListId();
    const [rQualif, rProspection, rContacts] = await Promise.allSettled([
      besoin.has('qualification') ? (qualifId ? lister(token, qualifId) : Promise.reject(new Error('liste Qualification non configurée'))) : Promise.resolve([]),
      besoin.has('prospection') ? lister(token, PROSPECTION_ID) : Promise.resolve([]),
      besoin.has('contacts') ? lister(token, CONTACTS_ID) : Promise.resolve([]),
    ]);
    const lu = (r: PromiseSettledResult<any[]>) => (r.status === 'fulfilled' ? r.value : null);
    const sources: Record<string, any[] | null> = { qualification: lu(rQualif), prospection: lu(rProspection), contacts: lu(rContacts) };
    const aujourdhui = aujourdhuiParis();

    const vues = espace.vues.map((v: any) => {
      const taches = sources[v.source];
      let n: number | null = null;
      if (taches) {
        if (v.source === 'qualification') { const f = vueDe(v.vue); n = f ? taches.filter((t) => f.filtre(t, aujourdhui)).length : null; }
        else if (v.source === 'prospection') { const f = VUES_PROSPECTION[v.vue]; n = f ? taches.filter((t) => f.filtre(t, aujourdhui)).length : null; }
        else if (v.source === 'contacts') n = taches.length;
      }
      return { ...v, n };
    });

    return NextResponse.json({ espace: { titre: espace.titre, creer: espace.creer || null }, vues, preview });
  } catch (error) {
    console.error('Erreur Mon espace :', error);
    return NextResponse.json({ error: 'Lecture de l’espace impossible' }, { status: 500 });
  }
}
