import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { agendaBranche, occupationsAgenda } from '@/lib/googleAgenda';

// Test de connexion Google Agenda (17/10/2026, 21 h 56, après la configuration du compte de service par Matthieu).
// GET : lit les agendas affichés de la personne connectée sur 7 jours et renvoie le nombre d'agendas lus et de
// créneaux occupés (aucun détail). listeComplete = false : l'autorisation calendarlist.readonly manque dans la
// délégation, seul l'agenda principal est lu (17/10, 22 h 01).
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
  const email = String(session.email || '').trim().toLowerCase();
  if (!email) return json({ ok: false, erreur: 'Pas d’email dans la session : déconnecte-toi et reconnecte-toi.' });
  try {
    const l = await occupationsAgenda(email, new Date(), new Date(Date.now() + 7 * 86400000));
    return json({
      ok: true,
      agenda: email,
      agendasLus: l.agendas,
      agendasIllisibles: l.sautes,
      listeComplete: l.listeComplete,
      creneauxOccupes7Jours: l.creneaux.length,
      ...(l.listeComplete ? {} : { aFaire: 'Ajouter https://www.googleapis.com/auth/calendar.calendarlist.readonly dans la délégation Google : seul l’agenda principal est lu.' }),
    });
  } catch (e) {
    return json({ ok: false, agenda: email, erreur: String((e as any)?.message || e).slice(0, 300) });
  }
}
