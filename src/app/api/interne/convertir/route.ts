import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { lireTacheQualification } from '@/lib/listesClickUp';
import { rolesDe } from '@/lib/roles';
import { OPTIONS, type Segment } from '@/lib/champsClickUp';
import { executer, preparer } from '@/lib/conversion';

// Conversion d'un ancien relevé (fiche sans scénario, ou scénario sans éléments) vers les éléments (plan du 16/10/2026).
// GET ?taskId=…&simulation=1 : montre ce qui serait créé, rien n'est écrit.
// GET ?taskId=…&executer=1 : crée le scénario (fiche) et les éléments, remplis avec les anciennes valeurs.
// &segment=RES|DAP|COP|PAR|FLT|TER|RIC : segment imposé (fiche au segment vide).
// Réservé à la direction. Liste Qualification de l'environnement uniquement (TEST en preview, vraie liste en production).
// Correspondance des champs : src/lib/conversion.ts.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const json = (corps: any, status = 200) => NextResponse.json(corps, { status });

export async function GET(request: Request) {
  try {
    const session = await sessionDeRequete(request);
    if (!session) return json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401);
    const token = process.env.CLICKUP_API_KEY as string;
    if (!(await rolesDe(token, session.id)).includes('direction')) {
      return json({ success: false, error: 'Réservé à la direction' }, 403);
    }
    const p = new URL(request.url).searchParams;
    const simulation = p.get('simulation') === '1';
    const execution = p.get('executer') === '1';
    if (simulation === execution) {
      return json({ success: false, error: "Ajoute simulation=1 (rien n'est écrit) ou executer=1 (conversion)" }, 400);
    }
    const seg = String(p.get('segment') || '').trim().toUpperCase();
    if (seg && !(seg in OPTIONS.segment)) return json({ success: false, error: 'Segment inconnu' }, 400);

    const l = await lireTacheQualification(String(p.get('taskId') || ''), token, { sousTaches: true });
    if (!l.ok) return json({ success: false, error: l.erreur }, l.status);
    const mode = simulation ? 'simulation' : 'execution';
    const prep = await preparer(token, l.tache, seg ? (seg as Segment) : null);
    if (!prep.ok) return json({ success: false, mode, error: prep.erreur, details: prep.details || [] }, 400);
    if (simulation) return json({ success: true, mode, ...prep.plan });
    const r = await executer(token, prep);
    return json({ success: r.ok, mode, ...prep.plan, resultat: r });
  } catch (e) {
    console.error('Conversion du relevé', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}
