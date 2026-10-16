import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';

// Personne connectée et ses rôles (src/lib/roles.ts), pour afficher les bons onglets de la barre de navigation.
// L'affichage ne donne aucun droit : chaque route contrôle les rôles elle-même.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  const session = await sessionDeRequete(request);
  if (!session?.id) return NextResponse.json({ error: 'Connexion requise : reconnecte-toi.' }, { status: 401 });
  const roles = await rolesDe(token, session.id);
  return NextResponse.json({ nom: session.nom || '', roles });
}
