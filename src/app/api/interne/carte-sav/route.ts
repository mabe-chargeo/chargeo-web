import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { adresseDe, champ, libelleDate, nomOption, sansEmoji } from '@/lib/vuesFiches';
import { CHAMPS_INTERVENTION, LISTES, ticketAMoi } from '@/lib/espaces';
import { adresses } from '@/lib/adresses';

// Carte du SAV (17/10/2026, 18 h 27, demandée par Matthieu). LECTURE SEULE.
// GET : tickets SAV ni résolus ni archivés, placés à l'adresse de l'installation du Parc liée (🔗 Fiche Installation),
// à défaut l'adresse du ticket. Les tickets n'ont pas d'adresse propre : elle est sur la fiche du Parc.
// Droits : chef de chantier, back-office et direction voient toute l'équipe ; l'installateur (ou la vue Installateur,
// ?role=poseur) seulement ses tickets.

export const dynamic = 'force-dynamic';
const PAGES_MAX = 10;
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function lister(token: string, listId: string): Promise<any[]> {
  const toutes: any[] = [];
  for (let page = 0; page < PAGES_MAX; page++) {
    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false&include_closed=true&subtasks=false&page=${page}`, {
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

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  const session = await sessionDeRequete(request);
  if (!session?.id) return NextResponse.json({ error: 'Connexion requise : reconnecte-toi.' }, { status: 401 });

  try {
    const roles = await rolesDe(token, session.id);
    const peutVoirEquipe = ['direction', 'chargeOperation', 'backOffice'].some((r) => roles.includes(r as any));
    if (!peutVoirEquipe && !roles.includes('poseur' as any)) {
      return NextResponse.json({ error: 'La carte du SAV est réservée à l’équipe technique.' }, { status: 403 });
    }
    const equipe = peutVoirEquipe && new URL(request.url).searchParams.get('role') !== 'poseur';
    const moi = Number(session.id);

    const [tickets, parc] = await Promise.all([lister(token, LISTES.sav), lister(token, LISTES.parc)]);
    const installations: Record<string, any> = {};
    for (const p of parc) installations[String(p.id)] = p;

    const items = tickets
      .filter((t) => { const s = normal(t?.status?.status); return !s.includes('resolu') && !s.includes('archive'); })
      .filter((t) => equipe || ticketAMoi(t, moi))
      .map((t) => {
        const v = champ(t, CHAMPS_INTERVENTION.installationTicket)?.value;
        const lie = Array.isArray(v) && v[0]?.id ? v[0] : null;
        const installation = lie ? installations[String(lie.id)] : null;
        const echeance = Number(t?.due_date) || 0;
        return {
          id: String(t.id),
          nom: String(t.name || ''),
          statut: String(t?.status?.status || ''),
          couleurStatut: String(t?.status?.color || ''),
          severite: sansEmoji(nomOption(t, CHAMPS_INTERVENTION.severite)),
          quand: echeance ? libelleDate(echeance) : '',
          enRetard: !!echeance && echeance < Date.now(),
          installation: lie ? String(lie.name || installation?.name || '') : '',
          installationId: lie ? String(lie.id) : '',
          adresse: installation ? adresseDe(installation) : adresseDe(t),
          techniciens: (Array.isArray(t?.assignees) ? t.assignees : []).map((u: any) => String(u?.username || u?.email || '')).filter(Boolean),
          lien: adresses.fiche(String(t.id)),
        };
      })
      .sort((a, b) => (a.enRetard === b.enRetard ? 0 : a.enRetard ? -1 : 1) || a.nom.localeCompare(b.nom, 'fr'));

    return NextResponse.json({ equipe, items });
  } catch (error) {
    console.error('Carte du SAV :', error);
    return NextResponse.json({ error: 'Lecture des tickets SAV impossible' }, { status: 500 });
  }
}
