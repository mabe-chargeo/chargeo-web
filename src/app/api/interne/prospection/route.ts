import { NextResponse } from 'next/server';
import { aujourdhuiParis } from '@/lib/joursOuvres';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { CHAMPS } from '@/lib/champsClickUp';
import { adresseDe, libelleDate, nomOption, sansEmoji } from '@/lib/vuesFiches';
import { PROSPECTION_ID, SOURCE_PROSPECT_ID, VUES_PROSPECTION, etapeProspect } from '@/lib/espaces';

// Prospection (Chasse) ❄️ de l'espace Commercial (validé par Matthieu le 17/10/2026). LECTURE SEULE.
// GET ?vue=a-appeler|chasse[&linkedin=1] : prospects ouverts de la liste, filtrés comme les vues ClickUp
// 📞 À APPELER AUJOURD'HUI et 🚀 PIPELINE CHASSE (filtre LinkedIn = Source 💼 LinkedIn).
// Droits : commercial ou direction. Preview : vraie liste, en lecture seule.

export const dynamic = 'force-dynamic';
const PAGES_MAX = 10;

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const champNomme = (t: any, mot: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => normal(c?.name).includes(mot));
function optionDe(f: any): string {
  const v = f?.value;
  if (v === undefined || v === null || v === '') return '';
  const o = (f?.type_config?.options || []).find((x: any) => x.orderindex === Number(v) || x.id === v);
  return String(o?.name || '');
}

async function lister(token: string): Promise<any[]> {
  const toutes: any[] = [];
  for (let page = 0; page < PAGES_MAX; page++) {
    const res = await fetch(`https://api.clickup.com/api/v2/list/${PROSPECTION_ID}/task?archived=false&include_closed=false&subtasks=false&page=${page}`, {
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

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  const session = await sessionDeRequete(request);
  if (!session?.id) return NextResponse.json({ error: 'Connexion requise : reconnecte-toi.' }, { status: 401 });

  try {
    const roles = await rolesDe(token, session.id);
    if (!roles.includes('direction') && !roles.includes('commercial')) {
      return NextResponse.json({ error: 'La prospection est réservée au commercial.' }, { status: 403 });
    }
    const params = new URL(request.url).searchParams;
    const cle = VUES_PROSPECTION[params.get('vue') || ''] ? String(params.get('vue')) : 'a-appeler';
    const vue = VUES_PROSPECTION[cle];
    const linkedin = params.get('linkedin') === '1';
    const aujourdhui = aujourdhuiParis();

    const toutes = await lister(token);
    const compteurs = Object.entries(VUES_PROSPECTION).map(([k, v]) => ({ cle: k, libelle: v.libelle, n: toutes.filter((t) => v.filtre(t, aujourdhui)).length }));
    const prospects = toutes
      .filter((t) => vue.filtre(t, aujourdhui))
      .filter((t) => !linkedin || normal(nomOption(t, SOURCE_PROSPECT_ID)).includes('linkedin'))
      .sort((a, b) => etapeProspect(a) - etapeProspect(b) || (Number(a?.due_date) || Number.MAX_SAFE_INTEGER) - (Number(b?.due_date) || Number.MAX_SAFE_INTEGER))
      .map((t) => ({
        id: String(t.id),
        nom: String(t.name || ''),
        statut: String(t?.status?.status || ''),
        couleurStatut: String(t?.status?.color || ''),
        etape: etapeProspect(t),
        source: sansEmoji(nomOption(t, SOURCE_PROSPECT_ID)),
        typeClient: sansEmoji(nomOption(t, CHAMPS.typeClient)),
        resultat: optionDe(champNomme(t, 'resultat appel')),
        rappel: Number(t?.due_date) ? libelleDate(Number(t.due_date), false) : '',
        adresse: adresseDe(t),
        url: String(t?.url || `https://app.clickup.com/t/${t.id}`),
      }));

    return NextResponse.json({ vues: compteurs, vue: { cle, libelle: vue.libelle }, linkedin, prospects });
  } catch (error) {
    console.error('Erreur Prospection :', error);
    return NextResponse.json({ error: 'Lecture de la prospection impossible' }, { status: 500 });
  }
}
