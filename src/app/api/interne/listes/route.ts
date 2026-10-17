import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { aujourdhuiParis } from '@/lib/joursOuvres';
import { CONFIG_LISTES, estSourceListe, filtreDe, idListe, peutLire, seulementMoi } from '@/lib/listesAppli';
import { champsCles, dateCourte, estAMoiPartout } from '@/lib/champsGeneriques';

// Écrans de liste (lot « écrans qui manquent » du 17/10/2026, 14 h 28). LECTURE SEULE.
// GET ?source=<commandes|sav|maintenance|factures|achats|advenir|parc|rh|codir|okr|kaizen|todo>
// Renvoie les tâches principales ouvertes de la liste, avec pour chacune les vues de l'espace qui la comptent (mêmes
// règles que Mon espace, src/lib/espaces.ts), son statut, son échéance, ses assignés et ses champs clés.
// 17/10, 19 h 00 : montants = valeurs des champs monétaires de config.totaux (null si vide), que l'écran additionne
// pour la vue affichée (trésorerie ADVENIR, factures, achats).
// Droits : src/lib/listesAppli.ts (la direction lit tout). L'installateur ne reçoit que ses tâches.
// Les listes sont lues pour de vrai en preview aussi (lecture seule), comme les autres écrans hors Qualification.

export const dynamic = 'force-dynamic';
const PAGES_MAX = 10;
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function lister(token: string, listId: string): Promise<any[]> {
  const toutes: any[] = [];
  for (let page = 0; page < PAGES_MAX; page++) {
    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false&include_closed=false&subtasks=false&page=${page}`, {
      headers: { Authorization: token },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`ClickUp a refusé la lecture (${res.status})`);
    const corps = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(corps?.tasks) ? corps.tasks : [];
    toutes.push(...lot.filter((t) => !t?.parent));
    if (corps?.last_page !== false || lot.length === 0) break;
  }
  return toutes;
}

// Valeur d'un champ monétaire ou numérique trouvé par un mot de son nom, null s'il est vide
function montantDe(t: any, mot: string): number | null {
  const c = (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find(
    (x: any) => (x?.type === 'currency' || x?.type === 'number' || x?.type === 'formula') && normal(x?.name).includes(normal(mot)),
  );
  const v = c?.value;
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Connexion requise : reconnecte-toi.' }, 401);

  const source = new URL(request.url).searchParams.get('source') || '';
  if (!estSourceListe(source)) return json({ error: 'Liste inconnue' }, 404);
  try {
    const roles = await rolesDe(token, session.id);
    if (!peutLire(source, roles)) return json({ error: 'Cette liste n’est pas dans ton rôle.' }, 403);
    const config = CONFIG_LISTES[source];
    const totaux = config.totaux || [];
    const moi = Number(session.id);
    const aujourdhui = aujourdhuiParis();
    const restreint = seulementMoi(source, roles);

    let taches = await lister(token, idListe(source));
    if (restreint) taches = taches.filter((t) => estAMoiPartout(t, moi));

    const elements = taches.map((t) => ({
      id: String(t.id),
      nom: String(t.name || ''),
      statut: String(t?.status?.status || ''),
      couleurStatut: String(t?.status?.color || ''),
      ordreStatut: Number(t?.status?.orderindex ?? 99),
      echeance: dateCourte(t?.due_date),
      echeanceMs: Number(t?.due_date) || null,
      assignes: (Array.isArray(t?.assignees) ? t.assignees : []).map((u: any) => String(u?.username || u?.email || '')).filter(Boolean),
      champs: champsCles(t, config.champs).map((c) => ({ nom: c.nom, texte: c.texte })),
      montants: totaux.map((x) => montantDe(t, x.mot)),
      vues: config.vues.filter((v) => { const f = filtreDe(source, v.cle); return !!f && f(t, aujourdhui, moi); }).map((v) => v.cle),
      aMoi: estAMoiPartout(t, moi),
    }));
    elements.sort((a, b) => a.ordreStatut - b.ordreStatut || (a.echeanceMs ?? 9e15) - (b.echeanceMs ?? 9e15) || a.nom.localeCompare(b.nom, 'fr'));

    return json({
      source,
      titre: config.titre,
      emoji: config.emoji,
      note: config.note || '',
      vues: config.vues,
      totaux: totaux.map((x) => x.libelle),
      restreint,
      elements,
      url: `https://app.clickup.com/${process.env.CLICKUP_TEAM_ID?.trim() || '90151325642'}/v/li/${idListe(source)}`,
    });
  } catch (error) {
    console.error(`Liste ${source} :`, error);
    return json({ error: 'Lecture de la liste impossible pour l’instant' }, 500);
  }
}
