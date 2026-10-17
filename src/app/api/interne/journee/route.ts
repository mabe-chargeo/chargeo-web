import { NextResponse } from 'next/server';
import { getQualificationListId } from '@/lib/listesClickUp';
import { aujourdhuiParis, ajouterJours, comparer, libelleJour, type Jour } from '@/lib/joursOuvres';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe, type Role } from '@/lib/roles';
import { CHAMPS } from '@/lib/champsClickUp';
import { adresseDe, champ, dateVisiteDe, jourDe, libelleDate, nomOption, normal, sansEmoji, trier, vueDe, type CleVue } from '@/lib/vuesFiches';
import { CHAMPS_INTERVENTION, chantierAMoi } from '@/lib/espaces';

// Accueil « Ma journée » de l'application équipe (Phase 6, maquette du 13/10/2026). LECTURE SEULE.
// GET : ce qui est à faire aujourd'hui et ce qui est en retard, avec des compteurs réels, selon les rôles de la personne
// connectée (src/lib/roles.ts). Direction : toutes les cartes. Autres rôles : seulement les leurs, filtrées ici.
// 16/10/2026, 23 h 22 (structure validée par Matthieu) : les cartes des fiches ouvrent la vue correspondante de l'écran
// Fiches (/interne/fiches?vue=…), plus ClickUp ; elles comptent avec les règles de src/lib/vuesFiches.ts (mêmes
// chiffres que le sous-menu des vues). Relevés du jour et en retard : une carte chacun, qui ouvre la fiche détaillée.
// Chantiers : feu vert à donner (5 prérequis OK, pas de feu vert) et réceptions à valider (réalisé), vers leurs écrans.
// Back-office : factures et contrats, vers les écrans de liste de l'application (depuis le 17/10 à 14 h 28).
// 17/10, 11 h 01 et 13 h 13 : relevés au chef de chantier, visites à caler au commercial.
// 17/10, 11 h 18 : carte « Mes interventions » de l'installateur, vers /interne/interventions.
// 17/10, 16 h 32 (Matthieu : il ne comprenait pas la différence entre « À faire aujourd'hui » et « À débloquer » ;
// choix « Deux blocs : Aujourd'hui / En retard ») : la section dépend de la DATE de chaque fiche, plus du type de carte.
//   - section 'aujourdhui' : date du jour, ou travail sans date à traiter (visites à caler, devis à chiffrer, feu vert,
//     réceptions, contrats dans les 30 jours) ;
//   - section 'retard' : date dépassée (relevés, relances de devis, interventions, factures, contrats échus).
//   Une carte datée est coupée en deux : sa part du jour dans Aujourd'hui, sa part en retard (si non vide) dans En retard.
//   La carte « Relevés planifiés » (visites à venir) est retirée : ce n'est pas le travail du jour, les relevés du
//   jour ont chacun leur carte.
// Preview : fiches lues dans 🧪 Qualification TEST, le reste dans les listes réelles, en lecture seule.

export const dynamic = 'force-dynamic';

const PLANNING_CHANTIERS_ID = '901520038258';
const PARC_ID = '901520038290';
const FACTURES_ID = process.env.CLICKUP_FACTURES_LIST_ID || '1200630000003863';
const CHAMP_FEU_VERT = 'c27f8084-e2f2-4eaf-83bd-d75e082e0d0a';
// Les 5 prérequis du feu vert (mêmes identifiants que src/app/api/interne/feu-vert/route.ts)
const PREREQUIS = [
  '348cc59d-5adc-4ed4-b07d-5da40a9e6abc', // 📝 Devis signé
  'ba4a2025-43ec-44a0-8938-1cbc497f7bbf', // 💶 Acompte
  '8074d071-24d4-4711-8726-4c20098321fd', // 📜 Autorisations et aides
  '7ac103cd-7b52-40ca-a2d4-939e59427f56', // 📦 Matériel reçu conforme
  '24f63f50-0839-416b-8f07-9c60ee56e308', // 👷 Équipe, date et accès
];
const PAGES_MAX = 10;
const JOURS_CONTRAT = 30;
const EXEMPLES_MAX = 3;
const CHEF = 'Chef de chantier';

type Section = 'aujourdhui' | 'retard';
type Exemple = { nom: string; url: string };
type CarteJournee = {
  cle: string;
  role: Role;
  section: Section;
  surtitre: string;
  titre: string;
  detail: string;
  n: number | null;
  urgent: boolean;
  lien: string;
  externe: boolean;
  exemples: Exemple[];
  erreur?: string;
};
type Releve = { id: string; nom: string; quand: string; retard: boolean; typeClient: string; adresse: string; lien: string };
// Carte datée : date de référence de chaque fiche, et libellés de sa part en retard
type Coupe = { dateDe: (t: any) => Jour | null; titreRetard: string; detailRetard: string };

const champNomme = (t: any, mot: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => normal(c?.name).includes(mot));
const urlTache = (t: any) => `/interne/element/${t?.id}`;
const urlFiche = (t: any) => `/interne/fiches/${t?.id}`;

// « 14h30 » à Paris. Date sans heure dans ClickUp (enregistrée à 0 h ou 4 h) : heure non précisée
function heureDe(ms: number): string {
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms));
  const h = parts.find((p) => p.type === 'hour')?.value || '00';
  const m = parts.find((p) => p.type === 'minute')?.value || '00';
  return m === '00' && (h === '00' || h === '04') ? 'heure à caler' : `${h}h${m}`;
}

// Fiches principales ouvertes d'une liste, toutes pages
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

const lu = (r: PromiseSettledResult<any[]>): { taches: any[] | null; erreur?: string } =>
  r.status === 'fulfilled' ? { taches: r.value } : { taches: null, erreur: String((r.reason as any)?.message || 'lecture impossible') };

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  const session = await sessionDeRequete(request);
  if (!session?.id) return NextResponse.json({ error: 'Connexion requise : reconnecte-toi.' }, { status: 401 });

  try {
    const roles = await rolesDe(token, session.id);
    const direction = roles.includes('direction');
    const visible = (r: Role) => direction || roles.includes(r);

    const qualifId = getQualificationListId();
    const [rQualif, rPlanning, rFactures, rParc] = await Promise.allSettled([
      qualifId ? lister(token, qualifId) : Promise.reject(new Error('liste Qualification non configurée')),
      lister(token, PLANNING_CHANTIERS_ID),
      lister(token, FACTURES_ID),
      lister(token, PARC_ID),
    ]);
    const qualif = lu(rQualif);
    const planning = lu(rPlanning);
    const factures = lu(rFactures);
    const parc = lu(rParc);

    const aujourdhui = aujourdhuiParis();
    const limiteContrat = ajouterJours(aujourdhui, JOURS_CONTRAT);
    const echu = (ms: unknown) => { const j = jourDe(ms); return !!j && comparer(j, aujourdhui) <= 0; };
    const statut = (t: any) => normal(t?.status?.status);

    // Relevés du jour et en retard : une carte par fiche, les plus anciens d'abord (la page les range par section)
    const planifies = vueDe('planifies');
    const enRetard = vueDe('en-retard');
    const duJour = (qualif.taches || []).filter((t) => {
      const j = jourDe(dateVisiteDe(t));
      return !!j && comparer(j, aujourdhui) === 0 && !!planifies?.filtre(t, aujourdhui);
    });
    const retards = (qualif.taches || []).filter((t) => !!enRetard?.filtre(t, aujourdhui));
    const releves: Releve[] = visible('chargeOperation')
      ? trier([...retards, ...duJour], 'dateVisite').map((t) => {
        const ms = dateVisiteDe(t) || 0;
        const retard = retards.includes(t);
        return {
          id: String(t.id),
          nom: String(t.name || ''),
          quand: retard ? `Prévu ${libelleDate(ms, false)}, pas encore envoyé` : heureDe(ms),
          retard,
          typeClient: sansEmoji(nomOption(t, CHAMPS.typeClient)).toLowerCase(),
          adresse: adresseDe(t),
          lien: `/interne/fiches/${t.id}`,
        };
      })
      : [];

    const cartes: CarteJournee[] = [];
    // Range une carte : entière dans Aujourd'hui, ou coupée par date (part du jour + part en retard si non vide)
    const pousser = (
      c: Omit<CarteJournee, 'n' | 'exemples' | 'erreur' | 'section'>,
      liste: any[] | null,
      erreur: string | undefined,
      exemple: (t: any) => Exemple,
      coupe?: Coupe,
    ) => {
      const ex = (l: any[]) => l.slice(0, EXEMPLES_MAX).map(exemple);
      const err = erreur ? { erreur } : {};
      if (!liste) { cartes.push({ ...c, section: 'aujourdhui', n: null, exemples: [], ...err }); return; }
      if (!coupe) { cartes.push({ ...c, section: 'aujourdhui', n: liste.length, exemples: ex(liste) }); return; }
      const enRetardListe = liste.filter((t) => { const j = coupe.dateDe(t); return !!j && comparer(j, aujourdhui) < 0; });
      const duJourListe = liste.filter((t) => !enRetardListe.includes(t));
      cartes.push({ ...c, section: 'aujourdhui', n: duJourListe.length, exemples: ex(duJourListe) });
      if (enRetardListe.length) {
        cartes.push({ ...c, cle: `${c.cle}-retard`, section: 'retard', titre: coupe.titreRetard, detail: coupe.detailRetard, urgent: true, n: enRetardListe.length, exemples: ex(enRetardListe) });
      }
    };
    const ajouter = (c: Omit<CarteJournee, 'n' | 'exemples' | 'erreur' | 'section'>, source: { taches: any[] | null; erreur?: string }, filtre: (t: any) => boolean, coupe?: Coupe) => {
      if (!visible(c.role)) return;
      pousser(c, source.taches ? source.taches.filter(filtre) : null, source.erreur, (t) => ({ nom: String(t?.name || ''), url: urlTache(t) }), coupe);
    };
    // Carte d'une vue de l'écran Fiches : même filtre, même tri, ouvre la vue
    const carteVue = (cle: CleVue, role: Role, surtitre: string, urgent: boolean, libelles?: { titre: string; detail: string }, coupe?: Coupe) => {
      const v = vueDe(cle);
      if (!v || !visible(role)) return;
      const liste = qualif.taches ? trier(qualif.taches.filter((t) => v.filtre(t, aujourdhui)), v.tri) : null;
      pousser({
        cle, role, surtitre, titre: libelles?.titre || v.libelle, detail: libelles?.detail || v.description, urgent,
        lien: `/interne/fiches?vue=${cle}`, externe: false,
      }, liste, qualif.erreur, (t) => ({ nom: String(t?.name || ''), url: urlFiche(t) }), coupe);
    };

    // ── Commercial ──
    carteVue('a-caler', 'commercial', 'Commercial', false);
    carteVue('relances-echues', 'commercial', 'Commercial', true,
      { titre: 'Relances du jour', detail: 'Devis envoyés à relancer aujourd’hui' },
      { dateDe: (t) => jourDe(t?.due_date), titreRetard: 'Relances en retard', detailRetard: 'Devis envoyés dont la date de relance est passée' });
    carteVue('devis-a-chiffrer', 'commercial', 'Commercial', false);

    // ── Installateur : ses chantiers du jour ou en retard, pas encore réalisés ──
    const moi = Number(session.id);
    const dateChantier = (t: any) => jourDe(champ(t, CHAMPS_INTERVENTION.dateChantier)?.value);
    ajouter({
      cle: 'mesInterventions', role: 'poseur', surtitre: 'Installateur', titre: 'Mes interventions du jour',
      detail: 'Chantiers où tu es le technicien, prévus aujourd’hui', urgent: true, lien: '/interne/interventions', externe: false,
    }, planning, (t) => {
      const j = dateChantier(t);
      return chantierAMoi(t, moi) && !!j && comparer(j, aujourdhui) <= 0;
    }, { dateDe: dateChantier, titreRetard: 'Mes interventions en retard', detailRetard: 'Date d’intervention passée, chantier pas encore réalisé' });

    // ── Chef de chantier : travail sans date, à traiter aujourd'hui ──
    ajouter({
      cle: 'feuVert', role: 'chargeOperation', surtitre: `Chantiers · ${CHEF}`, titre: 'Feu vert à donner',
      detail: 'Chantiers dont les 5 prérequis sont OK', urgent: false, lien: '/interne/feu-vert', externe: false,
    }, planning, (t) => {
      const coche = champ(t, CHAMP_FEU_VERT)?.value;
      if (coche === true || coche === 'true') return false;
      return PREREQUIS.every((id) => { const n = normal(nomOption(t, id)); return n.includes('confirme') || n.includes('non applicable'); });
    });
    ajouter({
      cle: 'receptions', role: 'chargeOperation', surtitre: `Chantiers · ${CHEF}`, titre: 'Réceptions à valider',
      detail: 'PV, rapport de mesures et photos déposés par le poseur', urgent: true, lien: '/interne/validation', externe: false,
    }, planning, (t) => statut(t).includes('realise'));

    // ── Back-office ──
    ajouter({
      cle: 'factures', role: 'backOffice', surtitre: 'Back-office', titre: 'Factures à relancer aujourd’hui',
      detail: 'Échéance aujourd’hui (relances J+3, J+10, J+15)', urgent: true, lien: '/interne/liste/factures?vue=retard', externe: false,
    }, factures, (t) => {
      const s = statut(t);
      return !s.includes('litige') && (s.includes('emise') || s.includes('partiel')) && echu(t?.due_date);
    }, { dateDe: (t) => jourDe(t?.due_date), titreRetard: 'Factures en retard', detailRetard: 'Échéance dépassée, pas encore payées (relances J+3, J+10, J+15)' });
    ajouter({
      cle: 'contrats', role: 'backOffice', surtitre: 'Back-office', titre: 'Contrats à renouveler',
      detail: `Échéance annuelle dans les ${JOURS_CONTRAT} jours`, urgent: false, lien: '/interne/liste/parc?vue=contrats', externe: false,
    }, parc, (t) => {
      if (statut(t).includes('hors service')) return false;
      const j = jourDe(champNomme(t, 'echeance annuelle')?.value);
      return !!j && comparer(j, limiteContrat) <= 0;
    }, { dateDe: (t) => jourDe(champNomme(t, 'echeance annuelle')?.value), titreRetard: 'Contrats échus', detailRetard: 'Échéance annuelle dépassée, contrat pas encore renouvelé' });

    const avertissements: string[] = [];
    if (qualif.erreur && (visible('chargeOperation') || visible('commercial'))) avertissements.push(`Fiches : ${qualif.erreur}`);
    if (!roles.length) avertissements.push("Aucun rôle trouvé pour ton compte : demande à Matthieu de t'ajouter au bon groupe ClickUp.");

    return NextResponse.json({
      date: libelleJour(aujourdhui),
      personne: session.nom || null,
      roles,
      direction,
      releves,
      cartes,
      avertissements,
      preview: process.env.VERCEL_ENV !== 'production',
    });
  } catch (error) {
    console.error('Erreur accueil Ma journée :', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
