import { NextResponse } from 'next/server';
import { COOKIE_SESSION, DUREE_SESSION_S, cheminSur, creerSession } from '@/lib/session';

// Retour de ClickUp après autorisation : échange du code contre un jeton, identité de la personne, contrôle qu'elle est
// membre de l'espace de travail CHARGéO, puis ouverture de la session (cookie signé, 30 jours).
// Le jeton ClickUp de la personne n'est pas conservé : il sert seulement à l'identifier.
export const dynamic = 'force-dynamic';
const COOKIE_OAUTH = 'chargeo_oauth';
const ESPACE_CHARGEO = '90151325642';

function echec(origine: string, code: string) {
  const res = NextResponse.redirect(new URL(`/connexion?erreur=${code}`, origine));
  res.cookies.delete(COOKIE_OAUTH);
  return res;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origine = url.origin;
  try {
    const clientId = process.env.CLICKUP_OAUTH_CLIENT_ID?.trim();
    const secret = process.env.CLICKUP_OAUTH_CLIENT_SECRET?.trim();
    if (!clientId || !secret) return echec(origine, 'configuration');

    const brut = request.headers.get('cookie')?.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE_OAUTH}=`));
    let attendu: { etat?: string; suivant?: string } = {};
    try { attendu = brut ? JSON.parse(decodeURIComponent(brut.slice(COOKIE_OAUTH.length + 1))) : {}; } catch { attendu = {}; }
    const code = url.searchParams.get('code');
    const etat = url.searchParams.get('state');
    if (!code || !attendu.etat) return echec(origine, 'expiree');
    if (etat && etat !== attendu.etat) return echec(origine, 'expiree');

    const jeton = await fetch(
      `https://api.clickup.com/api/v2/oauth/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(secret)}&code=${encodeURIComponent(code)}`,
      { method: 'POST', cache: 'no-store' },
    );
    const jsonJeton = jeton.ok ? await jeton.json().catch(() => ({})) : {};
    const acces = String(jsonJeton?.access_token || '');
    if (!acces) return echec(origine, 'clickup');

    const [resUser, resEquipes] = await Promise.all([
      fetch('https://api.clickup.com/api/v2/user', { headers: { Authorization: acces }, cache: 'no-store' }),
      fetch('https://api.clickup.com/api/v2/team', { headers: { Authorization: acces }, cache: 'no-store' }),
    ]);
    const user = resUser.ok ? (await resUser.json().catch(() => ({})))?.user : null;
    const equipes: any[] = resEquipes.ok ? (await resEquipes.json().catch(() => ({})))?.teams || [] : [];
    if (!user?.id) return echec(origine, 'clickup');
    const espace = process.env.CLICKUP_TEAM_ID?.trim() || ESPACE_CHARGEO;
    if (!equipes.some((t) => String(t?.id) === espace)) return echec(origine, 'espace');

    const session = await creerSession({ id: Number(user.id), nom: String(user.username || user.email || ''), email: String(user.email || '') });
    if (!session) return echec(origine, 'configuration');

    const res = NextResponse.redirect(new URL(cheminSur(attendu.suivant), origine));
    res.cookies.set(COOKIE_SESSION, session, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: DUREE_SESSION_S });
    res.cookies.delete(COOKIE_OAUTH);
    return res;
  } catch (error) {
    console.error('Erreur connexion ClickUp :', error);
    return echec(origine, 'clickup');
  }
}
