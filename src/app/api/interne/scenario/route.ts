import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { lireTacheQualification } from '@/lib/listesClickUp';
import { chargerTypes, estScenario } from '@/lib/typesTaches';
import { rolesDe, droitsDe } from '@/lib/roles';
import {
  archiverScenario, dupliquerScenario, gardeDevis, renommerScenario, restaurerScenario, scenariosArchives, type Resultat,
} from '@/lib/elements';

// Gestion des scénarios dans l'application (étape 3 du plan du 15/10/2026, décisions Q29 à Q34 du 14/10).
// GET ?affaireId=… : scénarios archivés depuis l'application (à restaurer) et droits.
// POST { action, id, nom?, confirme? } : archiver (avec ses éléments), restaurer (avec ses éléments), renommer,
// dupliquer. Réservé au commercial et à la direction. Garde-fou devis sur l'archivage.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const json = (corps: any, status = 200) => NextResponse.json(corps, { status });

export async function GET(request: Request) {
  try {
    const session = await sessionDeRequete(request);
    if (!session) return json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401);
    const token = process.env.CLICKUP_API_KEY as string;
    const id = new URL(request.url).searchParams.get('affaireId') || '';
    const l = await lireTacheQualification(id, token);
    if (!l.ok) return json({ success: false, error: l.erreur }, l.status);
    if (l.tache?.parent) return json({ success: false, error: "Ce n'est pas une fiche projet" }, 400);
    const archives = await scenariosArchives(token, l.tache);
    const droits = droitsDe(await rolesDe(token, session.id));
    return json({ success: true, archives, droits });
  } catch (e) {
    console.error('Lecture des scénarios archivés', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await sessionDeRequete(request);
    if (!session) return json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401);
    const token = process.env.CLICKUP_API_KEY as string;
    const corps = await request.json().catch(() => ({}));
    const action = String(corps?.action || '');
    const id = String(corps?.id || '');

    const droits = droitsDe(await rolesDe(token, session.id));
    if (!droits.scenarios) return json({ success: false, error: 'Réservé au commercial et à la direction' }, 403);

    const l = await lireTacheQualification(id, token, { sousTaches: true });
    if (!l.ok) return json({ success: false, error: l.erreur }, l.status);
    const scenario = l.tache;
    const { carte } = await chargerTypes(token);
    if (!scenario?.parent || !estScenario(scenario, carte)) return json({ success: false, error: "Ce n'est pas un scénario" }, 400);

    let r: Resultat;
    switch (action) {
      case 'archiver': {
        const g = gardeDevis(scenario);
        if (g.bloque) return json({ success: false, error: g.bloque }, 409);
        if (g.avertissement && !corps?.confirme) return json({ success: false, aConfirmer: true, avertissement: g.avertissement });
        r = await archiverScenario(token, scenario);
        break;
      }
      case 'restaurer':
        r = await restaurerScenario(token, scenario);
        break;
      case 'renommer': {
        const nom = String(corps?.nom || '').replace(/\s+/g, ' ').trim().slice(0, 80);
        if (!nom) return json({ success: false, error: 'Donne un nom' }, 400);
        r = await renommerScenario(token, scenario, nom);
        break;
      }
      case 'dupliquer': {
        const p = await lireTacheQualification(String(scenario.parent), token, { sousTaches: true });
        if (!p.ok) return json({ success: false, error: p.erreur }, p.status);
        r = await dupliquerScenario(token, scenario, p.tache);
        break;
      }
      default:
        return json({ success: false, error: 'Action inconnue' }, 400);
    }
    if (!r.ok && r.erreur) return json({ success: false, error: r.erreur }, 400);
    return json({ success: true, ...r, projetId: String(scenario.parent) });
  } catch (e) {
    console.error('Action sur le scénario', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}
