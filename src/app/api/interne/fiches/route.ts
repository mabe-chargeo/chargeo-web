import { NextResponse } from 'next/server';
import { getQualificationListId } from '@/lib/listesClickUp';
import { aujourdhuiParis } from '@/lib/joursOuvres';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { chargerTypes, estScenario } from '@/lib/typesTaches';
import { CHAMPS } from '@/lib/champsClickUp';
import { adresseDe, dateVisiteDe, libelleDate, nomOption, sansEmoji, trier, vuesVisibles } from '@/lib/vuesFiches';

// Écran Fiches de l'application équipe (structure validée par Matthieu le 16/10/2026). LECTURE SEULE.
// GET ?vue=<clé> : fiches principales de Qualification (TEST en preview) filtrées par la vue (src/lib/vuesFiches.ts),
// avec le compteur de chaque vue accessible pour le sous-menu. Vues filtrées côté serveur selon les rôles.

export const dynamic = 'force-dynamic';
const PAGES_MAX = 10;

async function listerTout(token: string, listId: string): Promise<any[]> {
  const toutes: any[] = [];
  for (let page = 0; page < PAGES_MAX; page++) {
    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false&include_closed=false&subtasks=true&page=${page}`, {
      headers: { Authorization: token },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`ClickUp a refusé la lecture (${res.status})`);
    const json = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    toutes.push(...lot);
    if (json?.last_page !== false || lot.length === 0) break;
  }
  return toutes;
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  const session = await sessionDeRequete(request);
  if (!session?.id) return NextResponse.json({ error: 'Connexion requise : reconnecte-toi.' }, { status: 401 });
  const listId = getQualificationListId();
  if (!listId) return NextResponse.json({ error: 'Liste Qualification non configurée' }, { status: 500 });

  try {
    const roles = await rolesDe(token, session.id);
    const vues = vuesVisibles(roles);
    const preview = process.env.VERCEL_ENV !== 'production';
    if (!vues.length) return NextResponse.json({ vues: [], vue: null, fiches: [], preview });
    const demandee = new URL(request.url).searchParams.get('vue');
    const vue = vues.find((v) => v.cle === demandee) || vues.find((v) => v.cle === 'toutes') || vues[0];

    const [toutes, { carte }] = await Promise.all([listerTout(token, listId), chargerTypes(token)]);
    const fichesPrincipales = toutes.filter((t) => !t?.parent);
    const enfants = new Map<string, any[]>();
    for (const t of toutes) {
      if (!t?.parent) continue;
      const cle = String(t.parent);
      enfants.set(cle, [...(enfants.get(cle) || []), t]);
    }
    const aujourdhui = aujourdhuiParis();

    const compteurs = vues.map((v) => ({ cle: v.cle, libelle: v.libelle, n: fichesPrincipales.filter((t) => v.filtre(t, aujourdhui)).length }));
    const fiches = trier(fichesPrincipales.filter((t) => vue.filtre(t, aujourdhui)), vue.tri).map((t) => {
      const visite = dateVisiteDe(t);
      const echeance = Number(t?.due_date) || 0;
      const quand = vue.tri === 'echeance' && echeance
        ? `Relance ${libelleDate(echeance, false)}`
        : visite ? `Visite ${libelleDate(visite)}` : '';
      const scenarios = (enfants.get(String(t.id)) || []).filter((s) => !s?.archived && estScenario(s, carte)).length;
      return {
        id: String(t.id),
        nom: String(t.name || ''),
        statut: String(t?.status?.status || ''),
        couleurStatut: String(t?.status?.color || ''),
        typeClient: sansEmoji(nomOption(t, CHAMPS.typeClient)),
        segment: nomOption(t, CHAMPS.segment),
        quand,
        adresse: adresseDe(t),
        scenarios,
      };
    });

    return NextResponse.json({
      vues: compteurs,
      vue: { cle: vue.cle, libelle: vue.libelle, description: vue.description },
      fiches,
      preview,
    });
  } catch (error) {
    console.error('Erreur écran Fiches :', error);
    return NextResponse.json({ error: 'Lecture des fiches impossible' }, { status: 500 });
  }
}
