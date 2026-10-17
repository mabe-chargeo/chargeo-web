import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { CHAMPS } from '@/lib/champsClickUp';
import { adresseDe, libelleDate, nomOption, normal, sansEmoji } from '@/lib/vuesFiches';
import { LISTES, etapePlanning, feuVertADonner } from '@/lib/espaces';

// Chantiers en cours de l'espace Chef de chantier (validé par Matthieu le 17/10/2026, 11 h 06). LECTURE SEULE.
// GET : chantiers ouverts du Planning Chantiers 🚧 (à planifier, préparation, planifié, en cours), comme la vue ClickUp
// 🏗️ SUIVI TRAVAUX, avec la date d'intervention, le technicien et l'état du feu vert.
// Droits : chargé d'opération ou direction. Preview : vraie liste, en lecture seule.

export const dynamic = 'force-dynamic';
const PAGES_MAX = 10;
const DATE_INTERVENTION = '8ded0ef0-cdbc-43b8-9d20-5806e2fc119f';
const TECHNICIEN = 'b400c953-ae06-4336-b471-405296f9ff1c';

const champs = (t: any): any[] => (Array.isArray(t?.custom_fields) ? t.custom_fields : []);
const valeur = (t: any, id: string) => champs(t).find((c) => c?.id === id)?.value;

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  const session = await sessionDeRequete(request);
  if (!session?.id) return NextResponse.json({ error: 'Connexion requise : reconnecte-toi.' }, { status: 401 });

  try {
    const roles = await rolesDe(token, session.id);
    if (!roles.includes('direction') && !roles.includes('chargeOperation')) {
      return NextResponse.json({ error: 'Le suivi des chantiers est réservé au chef de chantier.' }, { status: 403 });
    }
    const toutes: any[] = [];
    for (let page = 0; page < PAGES_MAX; page++) {
      const res = await fetch(`https://api.clickup.com/api/v2/list/${LISTES.planning}/task?archived=false&include_closed=false&subtasks=false&page=${page}`, {
        headers: { Authorization: token },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`ClickUp a refusé la lecture (${res.status})`);
      const json = await res.json().catch(() => ({}));
      const lot: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
      toutes.push(...lot.filter((t) => !t?.parent));
      if (json?.last_page !== false || lot.length === 0) break;
    }
    const chantiers = toutes
      .filter((t) => etapePlanning(String(t?.status?.status || '')) <= 3)
      .map((t) => {
        const date = Number(valeur(t, DATE_INTERVENTION)) || 0;
        const techs = valeur(t, TECHNICIEN);
        const coche = valeur(t, 'c27f8084-e2f2-4eaf-83bd-d75e082e0d0a');
        return {
          id: String(t.id),
          nom: String(t.name || ''),
          statut: String(t?.status?.status || ''),
          couleurStatut: String(t?.status?.color || ''),
          etape: etapePlanning(String(t?.status?.status || '')),
          date,
          quand: date ? libelleDate(date) : '',
          techniciens: (Array.isArray(techs) ? techs : []).map((u: any) => String(u?.username || u?.email || '')).filter(Boolean),
          segment: nomOption(t, CHAMPS.segment),
          typeClient: sansEmoji(nomOption(t, CHAMPS.typeClient)),
          adresse: adresseDe(t),
          feuVert: coche === true || coche === 'true' ? 'donne' : feuVertADonner(t) ? 'a-donner' : 'incomplet',
          url: String(t?.url || `https://app.clickup.com/t/${t.id}`),
        };
      })
      .sort((a, b) => a.etape - b.etape || (a.date || Number.MAX_SAFE_INTEGER) - (b.date || Number.MAX_SAFE_INTEGER) || normal(a.nom).localeCompare(normal(b.nom)));
    return NextResponse.json({ chantiers });
  } catch (error) {
    console.error('Erreur Chantiers en cours :', error);
    return NextResponse.json({ error: 'Lecture des chantiers impossible' }, { status: 500 });
  }
}
