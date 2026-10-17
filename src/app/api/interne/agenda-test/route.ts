import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { agendaBranche, occupationsAgenda } from '@/lib/googleAgenda';

// Test de connexion Google Agenda (17/10/2026, 21 h 56, après la configuration du compte de service par Matthieu).
// GET : lit l'agenda principal de la personne connectée sur 7 jours et renvoie le nombre de créneaux occupés
// (aucun détail). Sert à vérifier la variable GOOGLE_SERVICE_ACCOUNT_JSON et la délégation au niveau du domaine.
// Droits : direction et chef de chantier.

export const dynamic = 'force-dynamic';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ ok: false, erreur: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ ok: false, erreur: 'Connexion requise : reconnecte-toi.' }, 401);
  const roles = await rolesDe(token, session.id);
  if (!roles.includes('direction') && !roles.includes('chargeOperation')) return json({ ok: false, erreur: 'Réservé à la direction et aux chefs de chantier' }, 403);
  if (!agendaBranche()) return json({ ok: false, erreur: 'Google Agenda non branché : variable GOOGLE_SERVICE_ACCOUNT_JSON absente ou illisible sur cet environnement (redéployer après l’avoir ajoutée).' });
  const email = String((session as any).email || '').trim().toLowerCase();
  if (!email) return json({ ok: false, erreur: 'Pas d’email dans la session : déconnecte-toi et reconnecte-toi.' });
  try {
    const creneaux = await occupationsAgenda(email, new Date(), new Date(Date.now() + 7 * 86400000));
    return json({ ok: true, agenda: email, creneauxOccupes7Jours: creneaux.length });
  } catch (e) {
    return json({ ok: false, agenda: email, erreur: String((e as any)?.message || e).slice(0, 300) });
  }
}
