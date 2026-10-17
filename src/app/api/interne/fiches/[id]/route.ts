import { NextResponse } from 'next/server';
import { getQualificationListId } from '@/lib/listesClickUp';
import { sessionDeRequete } from '@/lib/session';
import { chargerTypes, estScenario } from '@/lib/typesTaches';
import { CHAMPS } from '@/lib/champsClickUp';
import { adresseDe, champ, dateVisiteDe, libelleDate, nomOption, normal, sansEmoji } from '@/lib/vuesFiches';
import { CHAMP_FEU_VERT, CHAMPS_INTERVENTION, LISTES, PREREQUIS_FEU_VERT } from '@/lib/espaces';

// Fiche affaire unique (étape 1 de l'ordre de construction, lancée par Matthieu le 17/10/2026 à 12 h 25). LECTURE SEULE.
// Une seule fiche suit la tâche voyageuse de Prospection à Qualification, Planning Chantiers puis Parc (section 3 de la
// carte des menus) : la route lit la tâche où qu'elle soit et renvoie les sections de son étape.
// GET /api/interne/fiches/<id> : statut, étape, passeport, relevé et scénarios, devis, feu vert, chantier, réception,
// parc et contrat (avec ses SAV et visites liés).
// Listes lisibles : Qualification de l'environnement (🧪 TEST en preview), Prospection, Planning Chantiers et Parc,
// en lecture seule (comme le bloc Contact).

export const dynamic = 'force-dynamic';

type Etape = 'prospection' | 'qualification' | 'chantier' | 'parc';

// Champs propres au Planning et au Parc (relus le 17/10/2026)
const RESERVES = '1463a905-0b11-4693-b9d9-e8cca4f79eeb'; // 🧾 Réserves (Planning, Parc)
const PV_RECEPTION = 'ea4cf46a-c8bc-41ad-a46e-c7d313099f1b'; // 📂 PV Réception
const RAPPORT_MESURES = '463edfd0-faf9-40e6-b37a-9ee126c2b449'; // 📊 Rapport de mesures
const PHOTOS_CHANTIER = 'e907f3f8-c702-47bd-b523-017e684e78c1'; // 📸 Photos Chantier
const PARC = {
  typeContrat: 'a0505dec-e32f-485d-b501-2288a4c5f150',
  echeanceAnnuelle: '837dd2a3-2b7c-4ce8-b62f-6f0884c53ec1',
  miseEnService: '5e301b44-b0b8-478a-90c2-86e0201ef9d5',
  finGarantie: '7e7e31c8-d18a-406f-8c0f-a67a900fbc91',
  modele: 'e99c813b-e066-4e58-9401-8d570c476f9d',
  numeroSerie: '3b583c66-e4ac-4313-a60b-fd397b9f4923',
  pointsDeCharge: '56a64d37-0a10-4a5a-84d5-d6123ec47364',
  lienChargeUnix: '14cdce07-ad36-42ea-a67f-43cf6c74cfd6',
};
const LIBELLES_PREREQUIS = ['Devis signé', 'Acompte', 'Autorisations et aides', 'Matériel reçu conforme', 'Équipe, date et accès'];

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
const dateChamp = (t: any, id: string): string => {
  const n = Number(champ(t, id)?.value);
  return Number.isFinite(n) && n > 0 ? libelleDate(n) : '';
};
const tableau = (t: any, id: string): any[] => { const v = champ(t, id)?.value; return Array.isArray(v) ? v : []; };
const personnes = (t: any, id: string): string[] =>
  tableau(t, id).map((u: any) => String(u?.username || u?.email || '').trim()).filter(Boolean);
const liees = (t: any, id: string) => tableau(t, id).map((x: any) => ({ id: String(x?.id || ''), nom: String(x?.name || '') })).filter((x) => x.id);

async function lire(token: string, id: string, sousTaches = false): Promise<any | null> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(id)}${sousTaches ? '?include_subtasks=true' : ''}`, {
    headers: { Authorization: token },
    cache: 'no-store',
  });
  return res.ok ? res.json() : null;
}

function etapeDe(listId: string): Etape | null {
  const qualif = getQualificationListId();
  if (qualif && listId === String(qualif)) return 'qualification';
  if (listId === LISTES.prospection) return 'prospection';
  if (listId === LISTES.planning) return 'chantier';
  if (listId === LISTES.parc) return 'parc';
  return null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  const session = await sessionDeRequete(request);
  if (!session?.id) return NextResponse.json({ error: 'Connexion requise : reconnecte-toi.' }, { status: 401 });

  try {
    const { id } = await params;
    const tid = String(id || '');
    if (!/^[a-z0-9]+$/i.test(tid)) return NextResponse.json({ error: 'Identifiant de fiche invalide' }, { status: 400 });
    const t = await lire(token, tid, true);
    if (!t) return NextResponse.json({ error: 'Fiche introuvable' }, { status: 404 });
    const etape = etapeDe(String(t?.list?.id ?? ''));
    if (!etape) return NextResponse.json({ error: 'Fiche hors des listes autorisées' }, { status: 403 });
    if (t?.parent) return NextResponse.json({ error: 'Ceci est un scénario ou un élément : ouvre la fiche principale', parent: String(t.parent) }, { status: 400 });

    // Scénarios : sous-tâches directes, qui suivent la tâche voyageuse
    const { carte } = await chargerTypes(token);
    const directes = (Array.isArray(t?.subtasks) ? t.subtasks : []).filter((s: any) => !s?.archived && (!s?.parent || String(s.parent) === String(t.id)));
    const scenarios = await Promise.all(
      directes.filter((s: any) => estScenario(s, carte)).map(async (s: any) => {
        const complet = await lire(token, String(s.id), true);
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
    const s = normal(t?.status?.status);

    // Feu vert et chantier (Planning Chantiers)
    const feuVert = etape === 'chantier'
      ? {
          donne: champ(t, CHAMP_FEU_VERT)?.value === true || champ(t, CHAMP_FEU_VERT)?.value === 'true',
          prerequis: PREREQUIS_FEU_VERT.map((pid, i) => {
            const v = sansEmoji(nomOption(t, pid));
            const n = normal(v);
            return { libelle: LIBELLES_PREREQUIS[i], valeur: v || 'à renseigner', ok: n.includes('confirme') || n.includes('non applicable') };
          }),
        }
      : null;
    const chantier = etape === 'chantier'
      ? {
          intervention: dateChamp(t, CHAMPS_INTERVENTION.dateChantier),
          techniciens: personnes(t, CHAMPS_INTERVENTION.technicienChantier),
          realise: s.includes('realise'),
        }
      : null;
    // Réception : au Planning (chantier réalisé ou en cours) et au Parc
    const reception = etape === 'parc' || (etape === 'chantier' && (s.includes('realise') || s.includes('en cours')))
      ? {
          reserves: sansEmoji(nomOption(t, RESERVES)),
          pv: tableau(t, PV_RECEPTION).length,
          rapport: tableau(t, RAPPORT_MESURES).length,
          photos: tableau(t, PHOTOS_CHANTIER).length,
        }
      : null;
    const parc = etape === 'parc'
      ? {
          contrat: sansEmoji(nomOption(t, PARC.typeContrat)),
          echeance: dateChamp(t, PARC.echeanceAnnuelle),
          miseEnService: dateChamp(t, PARC.miseEnService),
          finGarantie: dateChamp(t, PARC.finGarantie),
          modele: sansEmoji(nomOption(t, PARC.modele)),
          numeroSerie: texte(t, PARC.numeroSerie),
          pointsDeCharge: nombre(t, PARC.pointsDeCharge),
          lienChargeUnix: texte(t, PARC.lienChargeUnix),
          sav: liees(t, CHAMPS_INTERVENTION.installationTicket),
          visites: liees(t, CHAMPS_INTERVENTION.borneVisitee),
        }
      : null;

    return NextResponse.json({
      fiche: {
        id: String(t.id),
        nom: String(t.name || ''),
        etape,
        liste: String(t?.list?.name || ''),
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
          // Le relevé ne s'ouvre que tant que la fiche est en Qualification
          lien: etape === 'qualification' ? `/interne/metre/${t.id}` : '',
        },
        relance: etape === 'qualification' && echeance ? libelleDate(echeance, false) : '',
        rappel: etape === 'prospection' && echeance ? libelleDate(echeance, false) : '',
        devis: {
          numero: texte(t, CHAMPS.numeroDevis),
          montantHT: nombre(t, CHAMPS.montantDevisHT),
          lienDevis: texte(t, CHAMPS.lienDevis),
          lienCostructor: texte(t, CHAMPS.lienCostructor),
        },
        scenarios,
        feuVert,
        chantier,
        reception,
        parc,
      },
      preview: process.env.VERCEL_ENV !== 'production',
    });
  } catch (error) {
    console.error('Erreur fiche affaire :', error);
    return NextResponse.json({ error: 'Lecture de la fiche impossible' }, { status: 500 });
  }
}
