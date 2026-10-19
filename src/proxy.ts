import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_SESSION, lireSession } from '@/lib/session';

// Écran de connexion de l'application équipe (Phase 6, 13/10/2026).
// Sans session valide : les pages /interne renvoient vers /connexion (puis retour à la page demandée), les API
// de l'application répondent 401. Les routes appelées par ClickUp (webhooks, /api/chantiers/feu-vert, réception,
// cron) ne sont pas concernées : seul le chemin exact /api/chantiers (liste du planning) est protégé.
// Clés Vercel : CLICKUP_OAUTH_CLIENT_ID et CLICKUP_OAUTH_CLIENT_SECRET (application « CHARGéO Équipe », 13/10/2026).
//
// Adresse dédiée app.chargeo.fr (prévue le 10/10, lancée par Matthieu le 18/10/2026 à 10 h 00). Même projet Vercel que
// le site : l'adresse est un second domaine du projet.
// - Sur app.chargeo.fr (APP_HOTE pour une autre adresse) : « / » ouvre Ma journée (/interne/journee) ; l'application, la
//   connexion, les API et les fichiers restent servis ; une page du site public est renvoyée vers chargeo.fr
//   (CHARGEO_SITE_URL).
// - Sur chargeo.fr, quand la variable Vercel APP_CHARGEO_ACTIF vaut 1 en production : /interne et /connexion sont
//   renvoyés vers app.chargeo.fr (à activer une fois le domaine vérifié et l'URL de retour ajoutée dans ClickUp).
//   Les webhooks, le cron et les API restent sur chargeo.fr.
// La session est un cookie propre à chaque adresse : une seule reconnexion par personne au passage sur app.chargeo.fr.
// 19/10/2026, 13 h 24 (Matthieu, premier essai sur app.chargeo.fr : « je voudrais que la page d'accueil soit la page de
// ma journée ») : « / » ouvrait /interne (Relevés à faire), il ouvre maintenant Ma journée.
// 19/10/2026, 13 h 37 (Matthieu : « ton lien bascule vers les relevés à faire il faut que ça bascule vers ma journée ») :
// l'ancienne adresse d'entrée chargeo.fr/interne (favoris, anciens messages) bascule sur Ma journée. Les liens vers une
// page précise (chargeo.fr/interne/element/…, /interne/fiches/…) gardent leur page. Dans l'appli, /interne reste la page
// Relevés à faire (menu À traiter).
// 19/10/2026, 14 h 20 (Matthieu : « ça ne fonctionne toujours pas, j'arrive toujours sur mes relevés » ; le navigateur
// propose app.chargeo.fr/interne depuis son historique) : toute ENTRÉE dans l'appli sur /interne, sur n'importe quelle
// adresse, ouvre Ma journée. Une entrée = navigation qui ne vient pas d'une page de l'appli (barre d'adresse, favori,
// historique, lien d'un message ou de ClickUp) : en-tête Sec-Fetch-Site différent de « same-origin ». Depuis l'appli
// (menu À traiter, pastilles Aujourd'hui et À venir), /interne reste Relevés à faire.

const APP_HOTE = (process.env.APP_HOTE || 'app.chargeo.fr').trim().toLowerCase();
const SITE_PUBLIC = (process.env.CHARGEO_SITE_URL || 'https://chargeo.fr').trim().replace(/\/$/, '');
const ACCUEIL_APPLI = '/interne/journee';

// Chemins de l'application qui demandent une session
const protege = (p: string) => p === '/interne' || p.startsWith('/interne/') || p.startsWith('/api/interne/') || p === '/api/chantiers';
// Pages de l'application équipe (renvoyées vers app.chargeo.fr quand il est actif)
const pageAppli = (p: string) => p === '/interne' || p.startsWith('/interne/') || p === '/connexion' || p.startsWith('/connexion/');
// Ce que app.chargeo.fr sert lui-même : l'application, la connexion, toutes les API, les fichiers (sw.js, manifeste, icônes)
const servieParAppli = (p: string) => pageAppli(p) || p.startsWith('/api/') || p.startsWith('/_next/') || /\.[a-z0-9]+$/i.test(p);
// Adresse d'entrée de l'appli (ancienne page d'accueil, aujourd'hui Relevés à faire)
const entreeAppli = (p: string) => p === '/interne' || p === '/interne/';
// Navigation qui arrive de l'extérieur de l'appli (barre d'adresse, favori, historique, lien d'un autre site)
function arriveeDeDehors(request: NextRequest): boolean {
  const site = request.headers.get('sec-fetch-site');
  const mode = request.headers.get('sec-fetch-mode');
  return mode === 'navigate' && !!site && site !== 'same-origin';
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hote = request.nextUrl.hostname.toLowerCase();

  if (hote === APP_HOTE) {
    if (pathname === '/' || (entreeAppli(pathname) && arriveeDeDehors(request))) {
      const url = request.nextUrl.clone();
      url.pathname = ACCUEIL_APPLI;
      url.search = '';
      return NextResponse.redirect(url);
    }
    if (!servieParAppli(pathname)) return NextResponse.redirect(`${SITE_PUBLIC}${pathname}${search}`);
  } else if (process.env.APP_CHARGEO_ACTIF === '1' && process.env.VERCEL_ENV === 'production' && pageAppli(pathname)) {
    // Ancienne adresse d'entrée de l'appli : Ma journée ; une page précise garde son chemin
    if (entreeAppli(pathname)) return NextResponse.redirect(`https://${APP_HOTE}${ACCUEIL_APPLI}`);
    return NextResponse.redirect(`https://${APP_HOTE}${pathname}${search}`);
  } else if (entreeAppli(pathname) && arriveeDeDehors(request)) {
    // chargeo.fr avant la bascule et préversion : même règle d'entrée
    const url = request.nextUrl.clone();
    url.pathname = ACCUEIL_APPLI;
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (!protege(pathname)) return NextResponse.next();
  const session = await lireSession(request.cookies.get(COOKIE_SESSION)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Connexion requise : reconnecte-toi.' }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = '/connexion';
  url.search = `?suivant=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

// Toutes les adresses sauf les fichiers générés de Next (pour reconnaître app.chargeo.fr partout)
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
