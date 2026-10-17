import { NextResponse } from 'next/server';
import { aujourdhuiParis } from '@/lib/joursOuvres';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { adresseDe, champ, libelleDate, nomOption, sansEmoji } from '@/lib/vuesFiches';
import { CHAMPS_INTERVENTION, LISTES, chantierAMoi, etapePlanning, ticketAMoi, visiteAMoi } from '@/lib/espaces';

// Mes interventions de l'espace Installateur (validé par Matthieu le 17/10/2026, 11 h 18). LECTURE SEULE.
// GET ?vue=interventions : chantiers (Planning Chantiers 🚧, 👷 Technicien = moi, préparation à en cours) et visites de
// maintenance (Maintenance 🛠️, 👷 Technicien = moi, à planifier ou RDV confirmé), comme la vue ClickUp 📱 MODE TECH.
// GET ?vue=sav : tickets SAV 🔧 affectés à moi, pas encore résolus.
// « moi » = la personne connectée. Direction et chef de chantier voient ceux de toute l'équipe (pour vérifier).
// 17/10/2026, 17 h 51 (Matthieu : « je suis en vue installateur, alors pourquoi j'ai ce message ? ») : &role= donne le
// rôle choisi dans la pastille de l'en-tête. En vue Installateur, même la direction voit seulement ses interventions,
// exactement comme un installateur ; la vue équipe reste pour Direction et Chef de chantier.
// Le bloc Contact lit la fiche du chantier, ou la fiche du Parc reliée à la visite ou au ticket.
// Preview : vraies listes, en lecture seule.

export const dynamic = 'force-dynamic';
const PAGES_MAX = 10;

async function lister(token: string, listId: string): Promise<any[]> {
  const toutes: any[] = [];
  for (let page = 0; page < PAGES_MAX; page++) {
    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false&include_closed=false&subtasks=false&page=${page}`, {
      headers: { Authorization: token },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`ClickUp a refusé la lecture (${res.status})`);
    const json = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    toutes.push(...lot.filter((t) => !t?.parent));
    if (json?.last_page !== false || lot.length === 0) break;
  }
  return toutes;
}

const cleJour = (ms: number): string => {
  if (!ms) return '';
  const j = aujourdhuiParis(new Date(ms));
  return `${j.a}-${String(j.m).padStart(2, '0')}-${String(j.j).padStart(2, '0')}`;
};
const relie = (t: any, id: string): string => {
  const v = champ(t, id)?.value;
  const premier = Array.isArray(v) ? v[0] : null;
  return premier?.id ? String(premier.id) : '';
};
const noms = (v: unknown): string[] => (Array.isArray(v) ? v : []).map((u: any) => String(u?.username || u?.email || '')).filter(Boolean);

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  const session = await sessionDeRequete(request);
  if (!session?.id) return NextResponse.json({ error: 'Connexion requise : reconnecte-toi.' }, { status: 401 });

  try {
    const roles = await rolesDe(token, session.id);
    const peutVoirEquipe = roles.includes('direction') || roles.includes('chargeOperation');
    if (!peutVoirEquipe && !roles.includes('poseur')) {
      return NextResponse.json({ error: 'Cet écran est réservé aux installateurs.' }, { status: 403 });
    }
    const params = new URL(request.url).searchParams;
    // Vue équipe sauf si le rôle choisi dans l'en-tête est Installateur
    const equipe = peutVoirEquipe && params.get('role') !== 'poseur';
    const moi = Number(session.id);
    const vue = params.get('vue') === 'sav' ? 'sav' : 'interventions';
    const auj = cleJour(Date.now());

    if (vue === 'sav') {
      const tickets = await lister(token, LISTES.sav);
      const items = tickets
        .filter((t) => (equipe ? !String(t?.status?.status || '').toLowerCase().includes('archiv') : ticketAMoi(t, moi)))
        .map((t) => ({
          id: String(t.id), type: 'sav', nom: String(t.name || ''), statut: String(t?.status?.status || ''), couleurStatut: String(t?.status?.color || ''),
          date: Number(t?.due_date) || 0, jour: cleJour(Number(t?.due_date) || 0), quand: Number(t?.due_date) ? libelleDate(Number(t.due_date)) : '',
          detail: sansEmoji(nomOption(t, CHAMPS_INTERVENTION.severite)), techniciens: noms(t?.assignees), adresse: '',
          contactId: relie(t, CHAMPS_INTERVENTION.installationTicket), url: String(t?.url || `https://app.clickup.com/t/${t.id}`), action: null,
        }));
      return NextResponse.json({ vue, aujourdhui: auj, equipe, items, lu: Date.now() });
    }

    const [chantiers, visites] = await Promise.all([lister(token, LISTES.planning), lister(token, LISTES.maintenance)]);
    const poses = chantiers
      .filter((t) => (equipe ? (() => { const e = etapePlanning(String(t?.status?.status || '')); return e >= 1 && e <= 3; })() : chantierAMoi(t, moi)))
      .map((t) => {
        const ms = Number(champ(t, CHAMPS_INTERVENTION.dateChantier)?.value) || 0;
        const enCours = String(t?.status?.status || '').toLowerCase().includes('en cours');
        return {
          id: String(t.id), type: 'pose', nom: String(t.name || ''), statut: String(t?.status?.status || ''), couleurStatut: String(t?.status?.color || ''),
          date: ms, jour: cleJour(ms), quand: ms ? libelleDate(ms) : '', detail: 'Pose', techniciens: noms(champ(t, CHAMPS_INTERVENTION.technicienChantier)?.value),
          adresse: adresseDe(t), contactId: String(t.id), url: String(t?.url || `https://app.clickup.com/t/${t.id}`),
          action: enCours ? { libelle: 'Réception sur place', href: '/interne/reception' } : null,
        };
      });
    const maintenances = visites
      .filter((t) => (equipe ? (() => { const s = String(t?.status?.status || '').toLowerCase(); return s.includes('planifier') || s.includes('confirm'); })() : visiteAMoi(t, moi)))
      .map((t) => {
        const ms = Number(champ(t, CHAMPS_INTERVENTION.dateVisite)?.value) || 0;
        return {
          id: String(t.id), type: 'visite', nom: String(t.name || ''), statut: String(t?.status?.status || ''), couleurStatut: String(t?.status?.color || ''),
          date: ms, jour: cleJour(ms), quand: ms ? libelleDate(ms) : '', detail: 'Visite de maintenance', techniciens: noms(champ(t, CHAMPS_INTERVENTION.technicienVisite)?.value),
          adresse: '', contactId: relie(t, CHAMPS_INTERVENTION.borneVisitee), url: String(t?.url || `https://app.clickup.com/t/${t.id}`), action: null,
        };
      });
    const items = [...poses, ...maintenances].sort((a, b) => (a.date || Number.MAX_SAFE_INTEGER) - (b.date || Number.MAX_SAFE_INTEGER));
    return NextResponse.json({ vue, aujourdhui: auj, equipe, items, lu: Date.now() });
  } catch (error) {
    console.error('Erreur Mes interventions :', error);
    return NextResponse.json({ error: 'Lecture des interventions impossible' }, { status: 500 });
  }
}
