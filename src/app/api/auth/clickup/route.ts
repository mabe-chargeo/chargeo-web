import { NextResponse } from 'next/server';
import { cheminSur } from '@/lib/session';

// Connexion avec ClickUp (OAuth 2) : envoie vers la page d'autorisation ClickUp.
// Application à déclarer dans ClickUp (Paramètres > Intégrations > API ClickUp > Créer une application), avec l'URL de
// retour https://<domaine>/api/auth/clickup/retour. Variables Vercel : CLICKUP_OAUTH_CLIENT_ID, CLICKUP_OAUTH_CLIENT_SECRET.
export const dynamic = 'force-dynamic';
const COOKIE_OAUTH = 'chargeo_oauth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = process.env.CLICKUP_OAUTH_CLIENT_ID?.trim();
  if (!clientId || !process.env.CLICKUP_OAUTH_CLIENT_SECRET?.trim()) {
    return NextResponse.redirect(new URL('/connexion?erreur=configuration', url.origin));
  }
  const etat = crypto.randomUUID();
  const suivant = cheminSur(url.searchParams.get('suivant'));
  const autorisation = new URL('https://app.clickup.com/api');
  autorisation.searchParams.set('client_id', clientId);
  autorisation.searchParams.set('redirect_uri', `${url.origin}/api/auth/clickup/retour`);
  autorisation.searchParams.set('state', etat);

  const res = NextResponse.redirect(autorisation.toString());
  res.cookies.set(COOKIE_OAUTH, JSON.stringify({ etat, suivant }), {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600,
  });
  return res;
}
