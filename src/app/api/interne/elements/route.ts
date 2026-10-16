import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { lireTacheQualification } from '@/lib/listesClickUp';
import { chargerTypes, estScenario } from '@/lib/typesTaches';
import { rolesDe, droitsDe } from '@/lib/roles';
import { OPTIONS, type Nature, type Segment } from '@/lib/champsClickUp';
import {
  aUnLienDevis, ajouterElement, archiverElement, contexteScenario, creerParDefaut, dupliquerBorne, dupliquerBranche,
  enregistrerReleve, gardeDevis, pretAChiffrer, renommerElement, restaurerElement, segmentDe, vue, type Resultat,
} from '@/lib/elements';
import { posterBrief } from '@/lib/briefChiffrage';

// Éléments d'un scénario dans l'application (étapes 3, 4 et 5 du plan du 15/10/2026, PR #51).
// GET ?scenarioId=… : éléments actifs (avec leur relevé) et archivés, segment, droits de la personne connectée.
// POST { action, … } : defaut, ajouter, renommer, archiver, restaurer, dupliquerBranche, dupliquerBorne,
// releve (relevé d'un élément), pret (« Prêt à chiffrer »).
// Étape 5 (15/10/2026) : « Prêt à chiffrer » poste aussi le commentaire « 📋 Brief de chiffrage » sur le scénario
// (src/lib/briefChiffrage.ts), à chaque clic : le dernier brief posté est celui qui compte.
// Droits contrôlés ici (src/lib/roles.ts) : commercial, chargé d'opération et direction. Scénario de la liste
// Qualification autorisée uniquement (TEST en preview).
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const json = (corps: any, status = 200) => NextResponse.json(corps, { status });

type Lecture = { ok: true; scenario: any } | { ok: false; status: number; error: string };

async function scenarioDe(token: string, id: string): Promise<Lecture> {
  const l = await lireTacheQualification(id, token, { sousTaches: true });
  if (!l.ok) return { ok: false, status: l.status, error: l.erreur };
  const { carte } = await chargerTypes(token);
  if (!l.tache?.parent || !estScenario(l.tache, carte)) return { ok: false, status: 400, error: "Ce n'est pas un scénario" };
  return { ok: true, scenario: l.tache };
}

export async function GET(request: Request) {
  try {
    const session = await sessionDeRequete(request);
    if (!session) return json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401);
    const token = process.env.CLICKUP_API_KEY as string;
    const id = new URL(request.url).searchParams.get('scenarioId') || '';
    const s = await scenarioDe(token, id);
    if (!s.ok) return json({ success: false, error: s.error }, s.status);
    const ctx = await contexteScenario(token, s.scenario);
    const droits = droitsDe(await rolesDe(token, session.id));
    return json({
      success: true,
      scenario: {
        id: String(s.scenario.id),
        nom: String(s.scenario.name || ''),
        statut: String(s.scenario?.status?.status || ''),
        segment: segmentDe(s.scenario),
        lienDevis: aUnLienDevis(s.scenario),
        projetId: String(s.scenario.parent),
      },
      elements: ctx.actifs.map(vue),
      archives: ctx.archives.map(vue),
      droits,
    });
  } catch (e) {
    console.error('Lecture des éléments', e);
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
    if (!droits.elements) {
      return json({ success: false, error: "Réservé au commercial, au chargé d'opération et à la direction" }, 403);
    }

    // Scénario concerné : donné directement, ou parent de l'élément visé
    let scenarioId = String(corps?.scenarioId || '');
    if (action !== 'defaut' && action !== 'ajouter' && action !== 'pret') {
      const l = await lireTacheQualification(id, token);
      if (!l.ok) return json({ success: false, error: l.erreur }, l.status);
      scenarioId = String(l.tache?.parent || '');
    }
    const s = await scenarioDe(token, scenarioId);
    if (!s.ok) return json({ success: false, error: s.error }, s.status);
    const ctx = await contexteScenario(token, s.scenario);

    let r: Resultat;
    switch (action) {
      case 'defaut': {
        const segment = String(corps?.segment || '');
        if (!(segment in OPTIONS.segment)) return json({ success: false, error: 'Segment inconnu' }, 400);
        const materiel = corps?.materiel === 'prise' ? 'prise' : 'borne';
        const places = Math.max(0, Math.min(500, parseInt(String(corps?.nbPlaces ?? '0'), 10) || 0));
        r = await creerParDefaut(ctx, segment as Segment, materiel, places);
        break;
      }
      case 'ajouter': {
        const nature = String(corps?.nature || '');
        if (!(nature in OPTIONS.nature)) return json({ success: false, error: 'Nature inconnue' }, 400);
        const tc = String(corps?.typeCheminement || '');
        r = await ajouterElement(
          ctx,
          nature as Nature,
          corps?.depart ? String(corps.depart) : undefined,
          corps?.arrivee ? String(corps.arrivee) : undefined,
          tc in OPTIONS.typeCheminement ? (tc as keyof typeof OPTIONS.typeCheminement) : undefined,
        );
        break;
      }
      case 'renommer': {
        const nom = String(corps?.nom || '').replace(/\s+/g, ' ').trim().slice(0, 80);
        if (!nom) return json({ success: false, error: 'Donne un nom' }, 400);
        r = await renommerElement(ctx, id, nom);
        break;
      }
      case 'archiver': {
        const g = gardeDevis(s.scenario);
        if (g.bloque) return json({ success: false, error: g.bloque }, 409);
        if (g.avertissement && !corps?.confirme) return json({ success: false, aConfirmer: true, avertissement: g.avertissement });
        r = await archiverElement(ctx, id);
        break;
      }
      case 'restaurer':
        r = await restaurerElement(ctx, id);
        break;
      case 'dupliquerBranche':
        r = await dupliquerBranche(ctx, id);
        break;
      case 'dupliquerBorne':
        r = await dupliquerBorne(ctx, id);
        break;
      case 'releve': {
        const valeurs = corps?.valeurs && typeof corps.valeurs === 'object' ? corps.valeurs : {};
        const liens = corps?.liens && typeof corps.liens === 'object'
          ? {
            ...('depart' in corps.liens ? { depart: corps.liens.depart ? String(corps.liens.depart) : null } : {}),
            ...('arrivee' in corps.liens ? { arrivee: corps.liens.arrivee ? String(corps.liens.arrivee) : null } : {}),
          }
          : undefined;
        r = await enregistrerReleve(ctx, id, valeurs, liens);
        break;
      }
      case 'pret': {
        const p = await pretAChiffrer(ctx);
        if (!p.ok && p.erreur) return json({ success: false, error: p.erreur, manquants: p.manquants || [] }, 400);
        // Étape 5 : brief de chiffrage calculé et posté sur le scénario (l'ancienne phrase d'attente est retirée)
        const messages = (p.messages || []).filter((m) => !m.includes('étape 5'));
        const brief = await posterBrief(token, s.scenario, ctx.actifs.map(vue));
        if (brief.ok) {
          messages.push(`📋 Brief de chiffrage posté sur le scénario${brief.alertes ? ` (${brief.alertes} alerte${brief.alertes > 1 ? 's' : ''} à lire)` : ''}`);
        }
        r = { ...p, messages, erreurs: [...(p.erreurs || []), ...(brief.ok ? [] : ['brief de chiffrage non posté'])] };
        break;
      }
      default:
        return json({ success: false, error: 'Action inconnue' }, 400);
    }
    if (!r.ok && r.erreur) return json({ success: false, error: r.erreur }, 400);
    return json({ success: true, ...r });
  } catch (e) {
    console.error('Action sur les éléments', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}
