import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { lireTacheQualification } from '@/lib/listesClickUp';
import { rolesDe, droitsDe } from '@/lib/roles';
import { chercherInfras, infraLieeDe, rattacher } from '@/lib/infraLiee';

// Étape 8 du plan du 15/10/2026 (PR #51) : résident d'une copropriété déjà équipée par CHARGéO (src/lib/infraLiee.ts).
// GET ?affaireId=… : infra déjà liée, ou infras COP trouvées à la même adresse (avec leurs Tarifs types), et droits.
// POST { affaireId, infraId, tarifId? } : rattache la fiche en RIC (segment, lien, Tarif type recopié).
// Réservé au commercial et à la direction. Fiche de la liste Qualification autorisée uniquement (TEST en preview).
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const json = (corps: any, status = 200) => NextResponse.json(corps, { status });

export async function GET(request: Request) {
  try {
    const session = await sessionDeRequete(request);
    if (!session) return json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401);
    const token = process.env.CLICKUP_API_KEY as string;
    const id = new URL(request.url).searchParams.get('affaireId') || '';
    const l = await lireTacheQualification(id, token, { sousTaches: true });
    if (!l.ok) return json({ success: false, error: l.erreur }, l.status);
    if (l.tache?.parent) return json({ success: false, error: "Ce n'est pas une fiche projet" }, 400);
    const droits = droitsDe(await rolesDe(token, session.id));
    const directe = infraLieeDe(l.tache);
    if (directe) return json({ success: true, rattache: directe, candidats: [], droits });
    const candidats = await chercherInfras(token, l.tache);
    const rattache = infraLieeDe(l.tache, candidats);
    return json({ success: true, rattache, candidats: rattache ? [] : candidats, droits });
  } catch (e) {
    console.error('Lecture des infras', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await sessionDeRequete(request);
    if (!session) return json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401);
    const token = process.env.CLICKUP_API_KEY as string;
    const corps = await request.json().catch(() => ({}));
    const droits = droitsDe(await rolesDe(token, session.id));
    if (!droits.scenarios) return json({ success: false, error: 'Réservé au commercial et à la direction' }, 403);
    const affaireId = String(corps?.affaireId || '');
    const infraId = String(corps?.infraId || '');
    const tarifId = corps?.tarifId ? String(corps.tarifId) : null;
    if (!/^[a-z0-9]+$/i.test(infraId) || (tarifId && !/^[a-z0-9]+$/i.test(tarifId))) return json({ success: false, error: 'Identifiant invalide' }, 400);
    const l = await lireTacheQualification(affaireId, token, { sousTaches: true });
    if (!l.ok) return json({ success: false, error: l.erreur }, l.status);
    if (l.tache?.parent) return json({ success: false, error: "Ce n'est pas une fiche projet" }, 400);
    const r = await rattacher(token, l.tache, infraId, tarifId);
    if (!r.ok && r.erreur) return json({ success: false, error: r.erreur }, 400);
    return json({ success: true, ...r });
  } catch (e) {
    console.error('Rattachement à une infra', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}
