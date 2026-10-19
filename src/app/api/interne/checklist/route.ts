import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { peutLire, seulementMoi, sourceDeListe } from '@/lib/listesAppli';
import { estAMoiPartout } from '@/lib/champsGeneriques';

// Cocher ou décocher un point de checklist depuis la fiche générique (17/10/2026, 20 h 01, choix de Matthieu :
// checklist d'onboarding dans la fiche salarié). Vaut pour toutes les listes de src/lib/listesAppli.ts.
// POST { tacheId, checklistId, pointId, fait } → le point doit appartenir à une checklist de la tâche.
// Droits : ceux de la fiche générique (rôle qui lit la liste ; l'installateur seulement sur ses tâches).
// Preview : seules les tâches « Test … » peuvent être modifiées. Un commentaire trace le changement.
// Le fichier n'exporte que les handlers (règle des routes Next).

export const dynamic = 'force-dynamic';
const API = 'https://api.clickup.com/api/v2';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const id = (v: unknown) => { const s = String(v ?? '').trim(); return /^[a-z0-9-]+$/i.test(s) ? s : ''; };

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401);
  const preview = process.env.VERCEL_ENV !== 'production';
  try {
    const corps = await request.json().catch(() => ({}));
    const tacheId = id(corps?.tacheId);
    const checklistId = id(corps?.checklistId);
    const pointId = id(corps?.pointId);
    const fait = corps?.fait === true;
    if (!tacheId || !checklistId || !pointId) return json({ success: false, error: 'Point de checklist inconnu' }, 400);

    const res = await fetch(`${API}/task/${encodeURIComponent(tacheId)}`, { headers: { Authorization: token }, cache: 'no-store' });
    if (!res.ok) return json({ success: false, error: 'Tâche introuvable' }, 404);
    const t = await res.json().catch(() => null);
    const source = sourceDeListe(String(t?.list?.id || ''));
    if (!source) return json({ success: false, error: 'Cette liste n’a pas d’écran dans l’application' }, 403);
    const roles = await rolesDe(token, session.id);
    if (!peutLire(source, roles)) return json({ success: false, error: 'Cet élément n’est pas dans ton rôle.' }, 403);
    if (seulementMoi(source, roles) && !estAMoiPartout(t, Number(session.id))) return json({ success: false, error: 'Cet élément ne t’est pas affecté.' }, 403);
    if (preview && !/^test/i.test(String(t?.name || ''))) return json({ success: false, error: 'En preview, seules les fiches « Test … » peuvent être modifiées.' }, 403);

    const checklist = (Array.isArray(t?.checklists) ? t.checklists : []).find((c: any) => String(c?.id) === checklistId);
    const point = (Array.isArray(checklist?.items) ? checklist.items : []).find((i: any) => String(i?.id) === pointId);
    if (!checklist || !point) return json({ success: false, error: 'Ce point n’est pas dans la checklist de la fiche' }, 400);

    const maj = await fetch(`${API}/checklist/${encodeURIComponent(checklistId)}/checklist_item/${encodeURIComponent(pointId)}`, {
      method: 'PUT',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: fait }),
      cache: 'no-store',
    });
    if (!maj.ok) return json({ success: false, error: `ClickUp a refusé la mise à jour (${maj.status})` }, 502);

    const auteur = String((session as any).nom || (session as any).email || 'l’équipe');
    await fetch(`${API}/task/${encodeURIComponent(tacheId)}/comment`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_text: `${fait ? '✅' : '↩️'} ${String(checklist.name || 'Checklist')} : « ${String(point.name || '')} » ${fait ? 'coché' : 'décoché'} depuis l'application par ${auteur}`, notify_all: false }),
      cache: 'no-store',
    }).catch(() => null);
    return json({ success: true, fait });
  } catch (e) {
    console.error('Checklist', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}
