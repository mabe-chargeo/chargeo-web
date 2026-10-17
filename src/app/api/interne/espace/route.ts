import { NextResponse } from 'next/server';
import { getQualificationListId } from '@/lib/listesClickUp';
import { aujourdhuiParis } from '@/lib/joursOuvres';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { vueDe } from '@/lib/vuesFiches';
import { ESPACES, FILTRES, LISTES, type Filtre, type SourceVue, type VueEspace } from '@/lib/espaces';

// Mon espace (un espace par rôle, validé par Matthieu le 17/10/2026). LECTURE SEULE.
// GET ?role=<rôle> : les vues de l'espace du rôle (src/lib/espaces.ts) avec leur compteur réel. Chaque liste ClickUp
// nécessaire n'est lue qu'une fois, toutes en parallèle ; une liste illisible donne « ? » sans bloquer les autres.
// Une clé « source:cle » additionne une autre liste (ex. Mes interventions = chantiers + visites de maintenance).
// Les vues « moi » (installateur) comptent ce qui est affecté à la personne connectée.
// Droits : la personne doit avoir ce rôle, ou être direction (qui peut voir l'espace de chaque rôle).
// Preview : Qualification lue dans 🧪 Qualification TEST ; les autres listes dans les vraies listes, en lecture seule.

export const dynamic = 'force-dynamic';
const PAGES_MAX = 10;

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

// « maintenance:mes-visites » → { source: 'maintenance', cle: 'mes-visites' } ; « feu-vert » → source de la vue
function decouper(v: VueEspace, cle: string): { source: SourceVue; cle: string } {
  const i = cle.indexOf(':');
  return i > 0 ? { source: cle.slice(0, i) as SourceVue, cle: cle.slice(i + 1) } : { source: v.source, cle };
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  const session = await sessionDeRequete(request);
  if (!session?.id) return NextResponse.json({ error: 'Connexion requise : reconnecte-toi.' }, { status: 401 });

  const role = new URL(request.url).searchParams.get('role') || '';
  const espace = (ESPACES as Record<string, { titre: string; creer?: { libelle: string; href: string }; vues: VueEspace[] } | undefined>)[role];
  const preview = process.env.VERCEL_ENV !== 'production';
  if (!espace) return NextResponse.json({ espace: null, vues: [], preview });

  try {
    const roles = await rolesDe(token, session.id);
    if (!roles.includes('direction') && !(roles as string[]).includes(role)) {
      return NextResponse.json({ error: 'Cet espace ne correspond pas à ton rôle.' }, { status: 403 });
    }
    const moi = Number(session.id);

    // Listes à lire, une seule fois chacune
    const sources: SourceVue[] = [];
    for (const v of espace.vues) {
      for (const k of v.vues || []) {
        const s = decouper(v, k).source;
        if (s !== 'aucune' && !sources.includes(s)) sources.push(s);
      }
    }
    const qualifId = getQualificationListId();
    const idDe = (s: SourceVue): string | undefined => (s === 'qualification' ? qualifId : (LISTES as Record<string, string>)[s]);
    const lus = await Promise.allSettled(sources.map((s) => {
      const id = idDe(s);
      return id ? lister(token, id) : Promise.reject(new Error(`liste ${s} non configurée`));
    }));
    const taches: Partial<Record<SourceVue, any[] | null>> = {};
    sources.forEach((s, i) => { const r = lus[i]; taches[s] = r.status === 'fulfilled' ? r.value : null; });
    const aujourdhui = aujourdhuiParis();

    const vues = espace.vues.map((v) => {
      let n: number | null = null;
      if (v.vues?.length) {
        let total = 0;
        let complet = true;
        for (const k of v.vues) {
          const { source, cle } = decouper(v, k);
          const liste = taches[source];
          const f: Filtre | undefined = source === 'qualification' ? vueDe(cle)?.filtre : FILTRES[source]?.[cle];
          if (!liste || !f) { complet = false; break; }
          total += liste.filter((t) => f(t, aujourdhui, moi)).length;
        }
        n = complet ? total : null;
      }
      return { ...v, n };
    });

    return NextResponse.json({ espace: { titre: espace.titre, creer: espace.creer || null }, vues, preview });
  } catch (error) {
    console.error('Erreur Mon espace :', error);
    return NextResponse.json({ error: 'Lecture de l’espace impossible' }, { status: 500 });
  }
}
