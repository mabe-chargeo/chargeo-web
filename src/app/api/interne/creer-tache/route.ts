import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { LISTES } from '@/lib/espaces';
import { adresses } from '@/lib/adresses';

// + Tâche dans la To-Do 📝 (17/10/2026, 20 h 14, Matthieu : « il me faut la possibilité de créer des nouvelles tâches
// dans la to do »). La liste est dans l'espace DIRECTION : réservée à la direction (comme son écran).
// GET : membres de la liste (pour « Pour qui »).
// POST { titre, description?, echeance? (AAAA-MM-JJ), priorite? (1 urgente, 2 haute, 3 normale, 4 basse), pour? (id) }
//   → tâche au statut de départ de la liste, assignée à la personne choisie (moi par défaut).
// Preview : nom préfixé « Test · ». Le fichier n'exporte que les handlers (règle des routes Next).

export const dynamic = 'force-dynamic';
const API = 'https://api.clickup.com/api/v2';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const texte = (v: unknown, max = 200) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));
const estPreview = () => process.env.VERCEL_ENV !== 'production';

async function direction(request: Request, token: string) {
  const session = await sessionDeRequete(request);
  if (!session?.id) return { ok: false as const, reponse: json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401) };
  const roles = await rolesDe(token, session.id);
  if (!roles.includes('direction')) return { ok: false as const, reponse: json({ success: false, error: 'La To-Do est réservée à la direction.' }, 403) };
  return { ok: true as const, session };
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
  const d = await direction(request, token);
  if (!d.ok) return d.reponse;
  try {
    const res = await fetch(`${API}/list/${LISTES.todo}/member`, { headers: { Authorization: token }, cache: 'no-store' });
    const corps = res.ok ? await res.json().catch(() => ({})) : {};
    const membres = (Array.isArray(corps?.members) ? corps.members : [])
      .map((m: any) => ({ id: Number(m?.id), nom: String(m?.username || m?.email || '') }))
      .filter((m: any) => Number.isFinite(m.id) && m.id > 0 && m.nom);
    return json({ success: true, preview: estPreview(), moi: Number(d.session.id), membres });
  } catch (e) {
    console.error('To-Do (lecture)', e);
    return json({ success: true, preview: estPreview(), moi: Number(d.session.id), membres: [] });
  }
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
  const d = await direction(request, token);
  if (!d.ok) return d.reponse;
  const preview = estPreview();
  try {
    const corps = await request.json().catch(() => ({}));
    let titre = texte(corps?.titre, 200);
    if (titre.length < 3) return json({ success: false, error: 'Donne un titre à la tâche' }, 400);
    if (preview && !/^test/i.test(titre)) titre = `Test · ${titre}`;
    const echeance = /^\d{4}-\d{2}-\d{2}$/.test(texte(corps?.echeance, 10)) ? texte(corps.echeance, 10) : '';
    const priorite = [1, 2, 3, 4].includes(Number(corps?.priorite)) ? Number(corps.priorite) : null;
    const pour = Number(corps?.pour) > 0 ? Number(corps.pour) : Number(d.session.id);
    const auteur = texte((d.session as any).nom) || texte((d.session as any).email) || 'l’équipe';
    const description = [texte(corps?.description, 4000), `\nCréée depuis l'application équipe par ${auteur}.`].filter(Boolean).join('\n').trim();
    const res = await fetch(`${API}/list/${LISTES.todo}/task`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: titre,
        description,
        assignees: [pour],
        ...(priorite ? { priority: priorite } : {}),
        ...(echeance ? { due_date: new Date(`${echeance}T10:00:00Z`).getTime(), due_date_time: false } : {}),
      }),
      cache: 'no-store',
    });
    const t = await res.json().catch(() => ({}));
    if (!res.ok || !t?.id) {
      console.error('Création To-Do refusée', res.status, t);
      return json({ success: false, error: `ClickUp a refusé la création (${res.status})` }, 502);
    }
    return json({ success: true, preview, cree: { id: String(t.id), nom: String(t.name || titre), lien: adresses.fiche(String(t.id)) } });
  } catch (e) {
    console.error('To-Do (écriture)', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}
