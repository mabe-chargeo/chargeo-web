import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_SESSION, lireSession } from '@/lib/session';

// Écran de connexion de l'application équipe (Phase 6, 13/10/2026).
// Sans session valide : les pages /interne renvoient vers /connexion (puis retour à la page demandée), les API
// de l'application répondent 401. Les routes appelées par ClickUp (webhooks, /api/chantiers/feu-vert, réception,
// cron) ne sont pas concernées : seul le chemin exact /api/chantiers (liste du planning) est protégé.
export async function proxy(request: NextRequest) {
  const session = await lireSession(request.cookies.get(COOKIE_SESSION)?.value);
  if (session) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Connexion requise : reconnecte-toi.' }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = '/connexion';
  url.search = `?suivant=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/interne', '/interne/:path*', '/api/interne/:path*', '/api/chantiers'],
};
