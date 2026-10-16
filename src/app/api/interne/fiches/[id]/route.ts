import { NextResponse } from 'next/server';
import { lireTacheQualification } from '@/lib/listesClickUp';
import { sessionDeRequete } from '@/lib/session';
import { chargerTypes, estScenario } from '@/lib/typesTaches';
import { CHAMPS } from '@/lib/champsClickUp';
import { adresseDe, champ, dateVisiteDe, libelleDate, nomOption, sansEmoji } from '@/lib/vuesFiches';

// Fiche détaillée de l'application équipe (structure validée par Matthieu le 16/10/2026). LECTURE SEULE.
// GET /api/interne/fiches/<id> : passeport client, statut, relevé, scénarios avec leurs éléments, devis.
// Seules les fiches principales de la liste Qualification autorisée (TEST en preview) sont lisibles.

export const dynamic = 'force-dynamic';

const texte = (t: any, id: string): string => {
  const v = champ(t, id)?.value;
  if (v === undefined || v === null || v === '') return '';
  if (typeof v === 'object') return String(v?.formatted_address || '');
  return String(v).trim();
};
const nombre = (t: any, id: string): number | null => {
  const n = Number(champ(t, id)?.value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

async function lireAvecSousTaches(token: string, id: string): Promise<any | null> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(id)}?include_subtasks=true`, {
    headers: { Authorization: token },
    cache: 'no-store',
  });
  return res.ok ? res.json() : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  const session = await sessionDeRequete(request);
  if (!session?.id) return NextResponse.json({ error: 'Connexion requise : reconnecte-toi.' }, { status: 401 });

  try {
    const { id } = await params;
    const lu = await lireTacheQualification(String(id || ''), token, { sousTaches: true });
    if (!lu.ok) return NextResponse.json({ error: lu.erreur }, { status: lu.status });
    const t = lu.tache;
    if (t?.parent) return NextResponse.json({ error: 'Ceci est un scénario : ouvre la fiche principale', parent: String(t.parent) }, { status: 400 });

    const { carte } = await chargerTypes(token);
    const directes = (Array.isArray(t?.subtasks) ? t.subtasks : []).filter((s: any) => !s?.archived && (!s?.parent || String(s.parent) === String(t.id)));
    const scenarios = await Promise.all(
      directes.filter((s: any) => estScenario(s, carte)).map(async (s: any) => {
        const complet = await lireAvecSousTaches(token, String(s.id));
        const elements = (Array.isArray(complet?.subtasks) ? complet.subtasks : [])
          .filter((e: any) => !e?.archived && String(e?.parent || '') === String(s.id));
        const parNature = new Map<string, number>();
        for (const e of elements) {
          const n = sansEmoji(nomOption(e, CHAMPS.nature)) || 'Autre';
          parNature.set(n, (parNature.get(n) || 0) + 1);
        }
        return {
          id: String(s.id),
          nom: String(s.name || ''),
          statut: String(s?.status?.status || ''),
          couleurStatut: String(s?.status?.color || ''),
          segment: nomOption(complet || s, CHAMPS.segment),
          elements: elements.length,
          natures: [...parNature.entries()].map(([nature, n]) => ({ nature, n })),
        };
      })
    );

    const visite = dateVisiteDe(t);
    const echeance = Number(t?.due_date) || 0;
    return NextResponse.json({
      fiche: {
        id: String(t.id),
        nom: String(t.name || ''),
        statut: String(t?.status?.status || ''),
        couleurStatut: String(t?.status?.color || ''),
        url: String(t.url || `https://app.clickup.com/t/${t.id}`),
        passeport: {
          typeClient: sansEmoji(nomOption(t, CHAMPS.typeClient)),
          telephone: texte(t, CHAMPS.telephone),
          email: texte(t, CHAMPS.email),
          adresse: adresseDe(t),
        },
        projet: {
          segment: nomOption(t, CHAMPS.segment),
          zone: nomOption(t, CHAMPS.zoneDeplacement),
          places: nombre(t, CHAMPS.nbPlacesParking),
        },
        releve: {
          visite: visite ? libelleDate(visite) : '',
          lien: `/interne/metre/${t.id}`,
        },
        relance: echeance ? libelleDate(echeance, false) : '',
        devis: {
          numero: texte(t, CHAMPS.numeroDevis),
          montantHT: nombre(t, CHAMPS.montantDevisHT),
          lienDevis: texte(t, CHAMPS.lienDevis),
          lienCostructor: texte(t, CHAMPS.lienCostructor),
        },
        scenarios,
      },
      preview: process.env.VERCEL_ENV !== 'production',
    });
  } catch (error) {
    console.error('Erreur fiche détaillée :', error);
    return NextResponse.json({ error: 'Lecture de la fiche impossible' }, { status: 500 });
  }
}
