import { NextResponse } from 'next/server';
import { getQualificationListId } from '@/lib/listesClickUp';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { chargerTypes, estScenario } from '@/lib/typesTaches';
import { CHAMPS } from '@/lib/champsClickUp';
import { aujourdhuiParis, comparer } from '@/lib/joursOuvres';
import { adresseDe, champ, dateVisiteDe, jourDe, libelleDate, nomOption, normal, sansEmoji } from '@/lib/vuesFiches';
import { CHAMP_FEU_VERT, CHAMPS_INTERVENTION, LISTES, PREREQUIS_FEU_VERT } from '@/lib/espaces';

// Fiche affaire unique (étape 1 de l'ordre de construction, lancée par Matthieu le 17/10/2026 à 12 h 25). LECTURE SEULE.
// Une seule fiche suit la tâche voyageuse de Prospection à Qualification, Planning Chantiers puis Parc (section 3 de la
// carte des menus) : la route lit la tâche où qu'elle soit et renvoie les sections de son étape.
// GET /api/interne/fiches/<id> : statut, étape, passeport, relevé et scénarios, devis, feu vert, chantier, réception,
// parc et contrat (avec ses SAV et visites liés), factures et dossiers ADVENIR.
// Listes lisibles : Qualification de l'environnement (🧪 TEST en preview), Prospection, Planning Chantiers et Parc,
// en lecture seule (comme le bloc Contact).
// 17/10, 12 h 47 : factures = Factures Clients dont le champ 🔗 Affaire pointe sur la fiche (relu le 17/10 sur la facture
// de solde de test) ; dossiers ADVENIR = tâches de Dossiers Advenir liées à la fiche (lien de tâche posé à la création du
// dossier quand l'affaire est gagnée, relu le 17/10). Une liste illisible n'empêche pas la fiche de s'afficher.
// 17/10, 18 h 10 (décision de Matthieu à 17 h 37 : l'installateur voit « ce qui est prévu, sans prix ») : pour un
// installateur (aucun autre rôle), et pour toute personne en vue Installateur (?role=poseur), la fiche part sans prix :
// devis vidé (n°, montant, lien du devis, lien Costructor), ni factures ni dossiers ADVENIR (sansPrix: true).
// 18/10, 17 h 37 (Matthieu, au Parc : « je n'ai pas accès au PV de réception ») : la réception donne aussi les fichiers
// du PV, du rapport et des photos (le plus récent en premier), ouverts par l'aperçu /api/interne/fichier.

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
// Factures Clients 💰 (v2), champs relus le 17/10/2026
const FACTURE = {
  affaire: '70f095a0-d0ec-413a-9ed9-fbc763306869', // 🔗 Affaire
  typePiece: '2885d2af-84ee-4c56-aa4d-3be5e2efd671',
  montantHT: 'b1ed211d-fa1a-452a-a955-a45cbc57ebe7',
  echeance: 'ad00c457-c263-46cd-a2bb-83741ab5a240',
  numero: 'acb6da97-630a-4421-8a0b-1533b1cc0338', // 🧾 N° facture Costructor
  lienCostructor: '87363f81-73a0-4928-b637-5a1c63fdc075',
};
const LIBELLES_PREREQUIS = ['Devis signé', 'Acompte', 'Autorisations et aides', 'Matériel reçu conforme', 'Équipe, date et accès'];
const PAGES_FACTURES = 5;
const LIENS_MAX = 10;
// Rôles qui voient les prix (le poseur seul ne les voit pas)
const ROLES_AVEC_PRIX = ['direction', 'commercial', 'chargeOperation', 'backOffice'];

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
const champNomme = (t: any, mot: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => normal(c?.name).includes(mot));
// Fichiers d'un champ Fichiers, le plus récent en premier (le champ les garde dans l'ordre de dépôt)
const fichiersDe = (t: any, id: string) => tableau(t, id)
  .map((f: any) => ({
    id: String(f?.id || ''),
    nom: String(f?.title || f?.name || f?.extension || 'fichier'),
    image: String(f?.mimetype || '').startsWith('image/') || /^(jpe?g|png|gif|webp|heic|heif)$/i.test(String(f?.extension || '')),
  }))
  .filter((f) => f.id)
  .reverse();

async function lire(token: string, id: string, sousTaches = false): Promise<any | null> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(id)}${sousTaches ? '?include_subtasks=true' : ''}`, {
    headers: { Authorization: token },
    cache: 'no-store',
  });
  return res.ok ? res.json() : null;
}

// Toutes les factures (y compris payées) qui pointent sur l'affaire
async function facturesDe(token: string, affaireId: string): Promise<any[]> {
  const trouvees: any[] = [];
  for (let page = 0; page < PAGES_FACTURES; page++) {
    const res = await fetch(`https://api.clickup.com/api/v2/list/${LISTES.factures}/task?archived=false&include_closed=true&subtasks=true&page=${page}`, {
      headers: { Authorization: token },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Factures illisibles (${res.status})`);
    const json = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    for (const f of lot) {
      if (tableau(f, FACTURE.affaire).some((x: any) => String(x?.id || '') === affaireId)) trouvees.push(f);
    }
    if (json?.last_page !== false || lot.length === 0) break;
  }
  return trouvees;
}

// Tâches liées (liens de tâche ClickUp) qui sont dans Dossiers Advenir
async function dossiersAdvenirDe(token: string, t: any): Promise<any[]> {
  const ids: string[] = [];
  for (const l of Array.isArray(t?.linked_tasks) ? t.linked_tasks : []) {
    const autre = String(l?.task_id || '') === String(t.id) ? String(l?.link_id || '') : String(l?.task_id || '');
    if (autre && autre !== String(t.id) && !ids.includes(autre)) ids.push(autre);
  }
  const lues = await Promise.all(ids.slice(0, LIENS_MAX).map((i) => lire(token, i).catch(() => null)));
  return lues.filter((d) => d && String(d?.list?.id || '') === LISTES.advenir);
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
    // Sans prix : installateur seul, ou vue Installateur choisie dans la pastille de l'en-tête
    const roles = await rolesDe(token, session.id).catch(() => [] as string[]);
    const sansPrix = new URL(request.url).searchParams.get('role') === 'poseur' || !ROLES_AVEC_PRIX.some((r) => roles.includes(r as any));
    const t = await lire(token, tid, true);
    if (!t) return NextResponse.json({ error: 'Fiche introuvable' }, { status: 404 });
    const etape = etapeDe(String(t?.list?.id ?? ''));
    if (!etape) return NextResponse.json({ error: 'Fiche hors des listes autorisées' }, { status: 403 });
    if (t?.parent) return NextResponse.json({ error: 'Ceci est un scénario ou un élément : ouvre la fiche principale', parent: String(t.parent) }, { status: 400 });

    // Scénarios (sous-tâches directes, qui suivent la tâche voyageuse), factures et dossiers ADVENIR, en parallèle
    const { carte } = await chargerTypes(token);
    const directes = (Array.isArray(t?.subtasks) ? t.subtasks : []).filter((s: any) => !s?.archived && (!s?.parent || String(s.parent) === String(t.id)));
    const enVente = etape === 'prospection';
    // Ni factures ni dossiers en prospection, ni pour l'installateur
    const sansFinances = enVente || sansPrix;
    const [scenarios, facturesLues, dossiersLus] = await Promise.all([
      Promise.all(
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
      ),
      sansFinances ? Promise.resolve([] as any[]) : facturesDe(token, String(t.id)).catch((e) => { console.error('Fiche affaire, factures :', e); return null; }),
      sansFinances ? Promise.resolve([] as any[]) : dossiersAdvenirDe(token, t).catch((e) => { console.error('Fiche affaire, ADVENIR :', e); return null; }),
    ]);

    const aujourdhui = aujourdhuiParis();
    const factures = facturesLues === null ? null : facturesLues.map((f: any) => {
      const s = normal(f?.status?.status);
      const echeance = Number(champ(f, FACTURE.echeance)?.value) || Number(f?.due_date) || 0;
      const j = jourDe(echeance);
      return {
        id: String(f.id),
        nom: String(f.name || ''),
        statut: String(f?.status?.status || ''),
        couleurStatut: String(f?.status?.color || ''),
        type: sansEmoji(nomOption(f, FACTURE.typePiece)),
        numero: texte(f, FACTURE.numero),
        montantHT: nombre(f, FACTURE.montantHT),
        echeance: echeance ? libelleDate(echeance, false) : '',
        enRetard: !s.includes('litige') && (s.includes('emise') || s.includes('partiel')) && !!j && comparer(j, aujourdhui) < 0,
        lienCostructor: texte(f, FACTURE.lienCostructor),
        url: String(f.url || `https://app.clickup.com/t/${f.id}`),
      };
    });
    const advenir = dossiersLus === null ? null : dossiersLus.map((d: any) => {
      const limite = Number(champNomme(d, 'date limite')?.value) || 0;
      const estimee = Number(champNomme(d, 'prime estim')?.value);
      const reelle = Number(champNomme(d, 'prime reel')?.value);
      return {
        id: String(d.id),
        nom: String(d.name || ''),
        statut: String(d?.status?.status || ''),
        couleurStatut: String(d?.status?.color || ''),
        dateLimite: limite ? libelleDate(limite, false) : '',
        primeEstimee: Number.isFinite(estimee) && estimee > 0 ? estimee : null,
        primeReelle: Number.isFinite(reelle) && reelle > 0 ? reelle : null,
        url: String(d.url || `https://app.clickup.com/t/${d.id}`),
      };
    });

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
          fichiers: {
            pv: fichiersDe(t, PV_RECEPTION),
            rapport: fichiersDe(t, RAPPORT_MESURES),
            photos: fichiersDe(t, PHOTOS_CHANTIER),
          },
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
        devis: sansPrix
          ? { numero: '', montantHT: null, lienDevis: '', lienCostructor: '' }
          : {
              numero: texte(t, CHAMPS.numeroDevis),
              montantHT: nombre(t, CHAMPS.montantDevisHT),
              lienDevis: texte(t, CHAMPS.lienDevis),
              lienCostructor: texte(t, CHAMPS.lienCostructor),
            },
        sansPrix,
        scenarios,
        feuVert,
        chantier,
        reception,
        parc,
        // null = liste illisible ; [] = rien de lié
        factures,
        advenir,
      },
      preview: process.env.VERCEL_ENV !== 'production',
    });
  } catch (error) {
    console.error('Erreur fiche affaire :', error);
    return NextResponse.json({ error: 'Lecture de la fiche impossible' }, { status: 500 });
  }
}
