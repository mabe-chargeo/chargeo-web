import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { getQualificationListId } from '@/lib/listesClickUp';
import { LISTES } from '@/lib/espaces';
import { CONFIG_LISTES, lienListe, peutLire, seulementMoi, sourceDeListe } from '@/lib/listesAppli';
import { champsLus, dateCourte, estAMoiPartout } from '@/lib/champsGeneriques';
import { lireFacture } from '@/lib/factureFiche';
import { lireGabarit } from '@/lib/ficheGabarit';

// Fiche générique (lot « écrans qui manquent » du 17/10/2026, 14 h 28). LECTURE SEULE.
// GET ?id=<tâche> : une tâche d'une liste de src/lib/listesAppli.ts (commande, ticket SAV, visite, facture, achat, dossier
// ADVENIR, installation du Parc, demande RH, CODIR, OKR, Kaizen, To-Do), avec tous ses champs remplis, sa description,
// ses 10 derniers commentaires, ses pièces jointes et ses sous-tâches.
// 17/10, 20 h 01 : et ses checklists (onboarding des salariés…), cochables par /api/interne/checklist.
// 18/10, 18 h 19 (écran facture validé par Matthieu) : une facture client renvoie aussi « facture » (src/lib/factureFiche.ts).
// 18/10, 19 h 50 (gabarit commun validé par Matthieu) : les autres listes renvoient « gabarit » (src/lib/ficheGabarit.ts) :
// champs clés, parcours par statuts, contact Appeler / Itinéraire / Écrire, liens.
// 19/10, 8 h 35 (passe de cohérence validée sur maquette) : et les documents de la liste (📄 Rapport d'intervention d'un
// ticket SAV), présentés comme le PV de la réception.
// Une fiche affaire (Prospection, Qualification, Planning, Parc) renvoie { fiche } : l'écran bascule sur la fiche
// affaire unique /interne/fiches/<id>, qui garde le bloc Contact et les sections par étape.
// (/api/interne/elements est déjà pris par les éléments des scénarios du relevé.)

export const dynamic = 'force-dynamic';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });

async function api(token: string, chemin: string): Promise<any | null> {
  const res = await fetch(`https://api.clickup.com/api/v2${chemin}`, { headers: { Authorization: token }, cache: 'no-store' });
  return res.ok ? res.json().catch(() => null) : null;
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Connexion requise : reconnecte-toi.' }, 401);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[a-z0-9]+$/i.test(id)) return json({ error: 'Identifiant invalide' }, 400);

  try {
    const t = await api(token, `/task/${encodeURIComponent(id)}?include_subtasks=true`);
    if (!t) return json({ error: 'Élément introuvable' }, 404);
    const listId = String(t?.list?.id || '');
    const fichesAffaire = [getQualificationListId(), LISTES.prospection, LISTES.planning, LISTES.parc].filter(Boolean).map(String);
    const source = sourceDeListe(listId);
    if (fichesAffaire.includes(listId)) return json({ fiche: `/interne/fiches/${t.id}` });
    if (!source) return json({ error: 'Cette liste n’a pas encore d’écran dans l’application', url: String(t.url || '') }, 404);

    const roles = await rolesDe(token, session.id);
    if (!peutLire(source, roles)) return json({ error: 'Cet élément n’est pas dans ton rôle.' }, 403);
    if (seulementMoi(source, roles) && !estAMoiPartout(t, Number(session.id))) return json({ error: 'Cet élément ne t’est pas affecté.' }, 403);

    const coms = await api(token, `/task/${encodeURIComponent(id)}/comment`);
    const commentaires = (Array.isArray(coms?.comments) ? coms.comments : []).slice(0, 10).map((c: any) => ({
      id: String(c.id),
      auteur: String(c?.user?.username || c?.user?.email || ''),
      date: dateCourte(c?.date, true),
      texte: String(c?.comment_text || '').slice(0, 2000),
    }));
    const sousTaches = (Array.isArray(t?.subtasks) ? t.subtasks : [])
      .filter((s: any) => !s?.archived)
      .map((s: any) => ({ id: String(s.id), nom: String(s.name || ''), statut: String(s?.status?.status || ''), couleurStatut: String(s?.status?.color || '') }));
    // Checklists, points dans l'ordre de ClickUp
    const parOrdre = (a: any, b: any) => Number(a?.orderindex ?? 0) - Number(b?.orderindex ?? 0);
    const checklists = (Array.isArray(t?.checklists) ? t.checklists.slice() : []).sort(parOrdre).map((c: any) => ({
      id: String(c.id),
      nom: String(c.name || 'Checklist'),
      points: (Array.isArray(c?.items) ? c.items.slice() : []).sort(parOrdre).map((i: any) => ({ id: String(i.id), nom: String(i.name || ''), fait: !!i.resolved })),
    }));
    const facture = source === 'factures' ? await lireFacture(token, t).catch((e) => { console.error('Écran facture :', e); return undefined; }) : undefined;
    const gabarit = source !== 'factures' ? await lireGabarit(token, t, CONFIG_LISTES[source].champs || [], String((session as any)?.email || ''), source).catch((e) => { console.error('Gabarit de fiche :', e); return undefined; }) : undefined;

    return json({
      element: {
        id: String(t.id),
        nom: String(t.name || ''),
        source,
        liste: CONFIG_LISTES[source].titre,
        emoji: CONFIG_LISTES[source].emoji,
        retour: lienListe(source),
        statut: String(t?.status?.status || ''),
        couleurStatut: String(t?.status?.color || ''),
        echeance: dateCourte(t?.due_date, true),
        debut: dateCourte(t?.start_date, true),
        assignes: (Array.isArray(t?.assignees) ? t.assignees : []).map((u: any) => String(u?.username || u?.email || '')).filter(Boolean),
        tags: (Array.isArray(t?.tags) ? t.tags : []).map((x: any) => String(x?.name || '')).filter(Boolean),
        description: String(t?.text_content || '').trim().slice(0, 6000),
        champs: champsLus(t),
        parent: t?.parent ? String(t.parent) : '',
        sousTaches,
        checklists,
        piecesJointes: (Array.isArray(t?.attachments) ? t.attachments : []).map((a: any) => ({ nom: String(a?.title || 'fichier'), url: String(a?.url || '') })).filter((a: any) => a.url),
        commentaires,
        url: String(t.url || `https://app.clickup.com/t/${t.id}`),
        ...(facture ? { facture } : {}),
        ...(gabarit ? { gabarit } : {}),
      },
    });
  } catch (error) {
    console.error('Fiche générique :', error);
    return json({ error: 'Lecture impossible pour l’instant' }, 500);
  }
}
