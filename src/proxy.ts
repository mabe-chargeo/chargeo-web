import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_SESSION, lireSession } from '@/lib/session';
import { adresses, adresseDepuisAncienne, estPageAppli } from '@/lib/adresses';

// Écran de connexion de l'application équipe (Phase 6, 13/10/2026).
// Sans session valide : les pages de l'application renvoient vers /connexion (puis retour à la page demandée), les API
// de l'application répondent 401. Les routes appelées par ClickUp (webhooks, /api/chantiers/feu-vert, réception,
// cron) ne sont pas concernées : seul le chemin exact /api/chantiers (liste du planning) est protégé.
// Clés Vercel : CLICKUP_OAUTH_CLIENT_ID et CLICKUP_OAUTH_CLIENT_SECRET (application « CHARGéO Équipe », 13/10/2026).
//
// Adresse dédiée app.chargeo.fr (prévue le 10/10, lancée par Matthieu le 18/10/2026 à 10 h 00). Même projet Vercel que
// le site : l'adresse est un second domaine du projet.
// - Sur app.chargeo.fr (APP_HOTE pour une autre adresse) : « / » ouvre Ma journée ; l'application, la connexion, les API
//   et les fichiers restent servis ; une page du site public est renvoyée vers chargeo.fr (CHARGEO_SITE_URL).
// - Sur chargeo.fr, quand la variable Vercel APP_CHARGEO_ACTIF vaut 1 en production : les pages de l'application et
//   /connexion sont renvoyées vers app.chargeo.fr. Les webhooks, le cron et les API restent sur chargeo.fr.
// La session est un cookie propre à chaque adresse : une seule reconnexion par personne au passage sur app.chargeo.fr.
// 19/10/2026, 13 h 24 à 14 h 20 (Matthieu) : l'entrée dans l'appli ouvre Ma journée, jamais les Relevés.
//
// 19/10/2026, 18 h 43 (Matthieu : « fais-le proprement », adresses validées à 18 h 20) : les écrans quittent /interne.
// Le dossier = l'adresse (src/app/(appli)/…), les adresses sont dans src/lib/adresses.ts. Les anciennes adresses
// /interne/… (liens déjà partis : commentaires ClickUp, emails, agendas Google, Costructor) sont renvoyées vers la
// nouvelle, sur toutes les adresses du site, avant tout le reste. Redirection temporaire au sens HTTP (307) : le
// navigateur ne la garde pas en mémoire, la table peut être corrigée à tout moment. /interne seul ouvre Ma journée.

const APP_HOTE = (process.env.APP_HOTE || 'app.chargeo.fr').trim().toLowerCase();
const SITE_PUBLIC = (process.env.CHARGEO_SITE_URL || 'https://chargeo.fr').trim().replace(/\/$/, '');

// Chemins de l'application qui demandent une session
const protege = (p: string) => estPageAppli(p) || p.startsWith('/api/interne/') || p === '/api/chantiers';
// Pages de l'application équipe (renvoyées vers app.chargeo.fr quand il est actif)
const pageAppli = (p: string) => estPageAppli(p) || p === '/connexion' || p.startsWith('/connexion/');
// Ce que app.chargeo.fr sert lui-même : l'application, la connexion, toutes les API, les fichiers (sw.js, manifeste, icônes)
const servieParAppli = (p: string) => pageAppli(p) || p.startsWith('/api/') || p.startsWith('/_next/') || /\.[a-z0-9]+$/i.test(p);
// Bascule de chargeo.fr vers app.chargeo.fr (production seulement)
const basculeActive = () => process.env.APP_CHARGEO_ACTIF === '1' && process.env.VERCEL_ENV === 'production';

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hote = request.nextUrl.hostname.toLowerCase();
  const surAppli = hote === APP_HOTE;

  // Ancienne adresse /interne/… : la nouvelle adresse (le filtre ?… suit, sauf vers Ma journée)
  const nouvelle = adresseDepuisAncienne(pathname, !!search);
  if (nouvelle) {
    const suite = nouvelle === adresses.journee ? '' : search;
    if (!surAppli && basculeActive()) return NextResponse.redirect(`https://${APP_HOTE}${nouvelle}${suite}`);
    const url = request.nextUrl.clone();
    url.pathname = nouvelle;
    url.search = suite;
    return NextResponse.redirect(url);
  }

  if (surAppli) {
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = adresses.journee;
      url.search = '';
      return NextResponse.redirect(url);
    }
    if (!servieParAppli(pathname)) return NextResponse.redirect(`${SITE_PUBLIC}${pathname}${search}`);
  } else if (basculeActive() && pageAppli(pathname)) {
    return NextResponse.redirect(`https://${APP_HOTE}${pathname}${search}`);
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
