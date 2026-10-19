import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { GROUPES_WIKI, WIKIS, wikiDe, wikiVisible } from '@/lib/wikis';

// Wikis ClickUp dans l'application (17/10/2026, 19 h 25). LECTURE SEULE.
// GET : index des wikis visibles pour la personne connectée (src/lib/wikis.ts), rangés par groupe.
// GET ?cle=<wiki> : le contenu de la page en Markdown (API ClickUp v3 des Docs, content_format=text/md), pour
// l'afficher dans l'application sans ouvrir ClickUp.

export const dynamic = 'force-dynamic';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Connexion requise : reconnecte-toi.' }, 401);
  try {
    const roles = (await rolesDe(token, session.id)) as string[];
    const cle = new URL(request.url).searchParams.get('cle') || '';

    if (!cle) {
      const visibles = WIKIS.filter((w) => wikiVisible(w, roles)).map((w) => ({ cle: w.cle, titre: w.titre, groupe: w.groupe }));
      return json({ groupes: GROUPES_WIKI.filter((g) => visibles.some((w) => w.groupe === g)), wikis: visibles });
    }

    const w = wikiDe(cle);
    if (!w) return json({ error: 'Wiki inconnu' }, 404);
    if (!wikiVisible(w, roles)) return json({ error: 'Ce wiki n’est pas dans ton rôle.' }, 403);
    const equipe = process.env.CLICKUP_TEAM_ID?.trim() || '90151325642';
    const res = await fetch(`https://api.clickup.com/api/v3/workspaces/${equipe}/docs/${w.doc}/pages/${w.page}?content_format=text%2Fmd`, {
      headers: { Authorization: token },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('Wiki', cle, res.status, await res.text().catch(() => ''));
      return json({ error: `ClickUp n’a pas donné la page (${res.status})` }, 502);
    }
    const corps = await res.json().catch(() => ({}));
    const page = corps?.page || (Array.isArray(corps) ? corps[0] : corps) || {};
    return json({ cle: w.cle, titre: w.titre, groupe: w.groupe, nom: String(page?.name || w.titre), contenu: String(page?.content || '') });
  } catch (e) {
    console.error('Wiki', e);
    return json({ error: 'Lecture du wiki impossible pour l’instant' }, 500);
  }
}
