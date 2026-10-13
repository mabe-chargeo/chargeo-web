import { NextResponse } from 'next/server';
import { COOKIE_SESSION } from '@/lib/session';

// Déconnexion : supprime la session et revient à l'écran de connexion
export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL('/connexion?deconnecte=1', new URL(request.url).origin));
  res.cookies.delete(COOKIE_SESSION);
  return res;
}
