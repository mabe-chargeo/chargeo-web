import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { LISTES } from '@/lib/espaces';

export const dynamic = 'force-dynamic';

const json = (body: any, status = 200) => NextResponse.json(body, { status });
const normal = (v: unknown) => String(v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function api(token: string, path: string, method = 'GET', body?: any) {
  return fetch(`https://api.clickup.com/api/v2${path}`, {
    method,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
}

async function lire(token: string, id: string) {
  const res = await api(token, `/task/${encodeURIComponent(id)}`);
  return res.ok ? res.json() : null;
}

function autorise(t: any) {
  return process.env.VERCEL_ENV === 'production' || normal(t?.name).trim().startsWith('test');
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Connexion requise' }, 401);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[a-z0-9]+$/i.test(id)) return json({ error: 'Identifiant invalide' }, 400);
  const t = await lire(token, id);
  if (!t || String(t?.list?.id || '') !== LISTES.planning) return json({ error: 'Chantier introuvable dans le Planning' }, 404);
  return json({ id, nom: t.name, statut: t?.status?.status || '', ecritureAutorisee: autorise(t) });
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Session expirée' }, 401);
  const { id } = await request.json().catch(() => ({}));
  if (!/^[a-z0-9]+$/i.test(String(id || ''))) return json({ error: 'Identifiant invalide' }, 400);
  const t = await lire(token, String(id));
  if (!t || String(t?.list?.id || '') !== LISTES.planning) return json({ error: 'Chantier introuvable dans le Planning' }, 404);
  if (!autorise(t)) return json({ error: 'En preview, seuls les chantiers « Test » sont modifiables' }, 403);
  const statut = normal(t?.status?.status);
  if (!['planifie', 'preparation'].includes(statut)) return json({ statut: t?.status?.status || '', deja: true });
  const r = await api(token, `/task/${encodeURIComponent(String(id))}`, 'PUT', { status: '🚧 en cours' });
  if (!r.ok) return json({ error: `ClickUp a refusé le démarrage (${r.status})` }, 502);
  await api(token, `/task/${encodeURIComponent(String(id))}/comment`, 'POST', {
    comment_text: `🚧 Chantier démarré depuis l’application par ${session.nom || 'l’équipe'}.`,
    notify_all: false,
  });
  return json({ success: true, statut: '🚧 en cours' });
}
