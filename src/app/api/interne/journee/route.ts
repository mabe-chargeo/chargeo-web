import { NextResponse } from 'next/server';
import { getQualificationListId, estAVisiter } from '@/lib/listesClickUp';
import { aujourdhuiParis, ajouterJours, comparer, libelleJour, type Jour } from '@/lib/joursOuvres';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe, type Role } from '@/lib/roles';

// Accueil « Ma journée » de l'application équipe (Phase 6, maquette du 13/10/2026, demande de Matthieu du 16/10 :
// « voir du concret »). LECTURE SEULE : rien n'est écrit dans ClickUp.
// GET : ce qui est à faire aujourd'hui et à débloquer, avec des compteurs réels lus dans ClickUp, selon les rôles de la
// personne connectée (src/lib/roles.ts). Direction : toutes les cartes (filtres par rôle dans l'écran). Autres rôles :
// seulement leurs cartes, filtrées ici côté serveur.
// Cartes (mêmes règles que les routes existantes) :
// - Relevés du jour (chargé d'opération) : fiches principales « à visiter » dont la 📅 Date Visite Technique est
//   aujourd'hui (comme /api/chantiers) ;
// - Relances devis échues (commercial) : fiches « 📩 devis envoyé » dont l'échéance (relance J+3 ouvrés posée par
//   /api/relances/devis-envoye) est aujourd'hui ou passée ;
// - Devis à chiffrer (commercial) : fiches « 📝 devis à faire » ;
// - Feu vert à donner (chargé d'opération) : chantiers du Planning dont les 5 prérequis sont confirmés ou non
//   applicables, sans 🟢 Feu vert (le blocage borne résident est revérifié par l'écran Feu vert) ;
// - Réceptions à valider (chargé d'opération) : chantiers en « ✅ réalisé » (comme /api/interne/reception?role=charge) ;
// - Factures en retard (back-office) : factures émises ou partiellement payées dont le rappel (échéance de la tâche
//   posée par /api/factures/relances) est aujourd'hui ou passé ; litiges exclus ;
// - Contrats à renouveler (back-office) : Parc, 🔄 Echéance annuelle dans les 30 jours ou dépassée, hors « hors service ».
// Le poseur n'a pas encore de carte : son écran « Mes interventions » est un lot à part.
// Preview : relevés, relances et devis sont lus dans 🧪 Qualification TEST (getQualificationListId), le reste dans les
// listes réelles, en lecture seule.

export const dynamic = 'force-dynamic';

const EQUIPE = process.env.CLICKUP_TEAM_ID?.trim() || '90151325642';
const PLANNING_CHANTIERS_ID = '901520038258';
const PARC_ID = '901520038290';
const FACTURES_ID = process.env.CLICKUP_FACTURES_LIST_ID || '1200630000003863';
const DATE_VISITE_ID = '3e633a82-89e3-4895-80d6-04ad25bbccd4';
const LIEU_CHANTIER_ID = '5b9cbfd6-535c-4416-b530-776f949ce432';
const ADRESSE_ID = '990a7f3b-989f-416d-9a80-eba5654b228d';
const TYPE_CLIENT_ID = 'f6b45107-9ba0-406b-8fd7-d678e6ad11dc';
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

type Exemple = { nom: string; url: string };
type CarteJournee = {
  cle: string;
  role: Role;
  section: 'aFaire' | 'aDebloquer';
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
type Releve = { id: string; nom: string; quand: string; typeClient: string; adresse: string; lien: string };

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c?.id === id);
const champNomme = (t: any, mot: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => normal(c?.name).includes(mot));
const urlTache = (t: any) => String(t?.url || `https://app.clickup.com/t/${t?.id}`);
const urlListe = (id: string) => `https://app.clickup.com/${EQUIPE}/v/li/${id}`;
const jourDe = (ms: unknown): Jour | null => {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? aujourdhuiParis(new Date(n)) : null;
};
const exemples = (taches: any[]): Exemple[] => taches.slice(0, EXEMPLES_MAX).map((t) => ({ nom: String(t?.name || ''), url: urlTache(t) }));

function nomOption(t: any, id: string): string {
  const f = champ(t, id);
  const v = f?.value;
  if (v === undefined || v === null || v === '') return '';
  const o = (f?.type_config?.options || []).find((x: any) => x.orderindex === Number(v) || x.id === v);
  return String(o?.name || '');
}

function adresseDe(t: any): string {
  for (const id of [LIEU_CHANTIER_ID, ADRESSE_ID]) {
    const v = champ(t, id)?.value;
    const a = v?.formatted_address || (typeof v === 'string' ? v : '');
    if (a) return String(a);
  }
  return '';
}

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

    // Relevés du jour : une carte par fiche, triées par heure
    const relevesDuJour = (qualif.taches || [])
      .filter((t) => estAVisiter(t?.status?.status))
      .map((t) => ({ t, ms: Number(champ(t, DATE_VISITE_ID)?.value) }))
      .filter(({ ms }) => { const j = jourDe(ms); return !!j && comparer(j, aujourdhui) === 0; })
      .sort((a, b) => a.ms - b.ms);
    const releves: Releve[] = visible('chargeOperation')
      ? relevesDuJour.map(({ t, ms }) => ({
        id: String(t.id),
        nom: String(t.name || ''),
        quand: heureDe(ms),
        typeClient: nomOption(t, TYPE_CLIENT_ID).replace(/^[^\p{L}]+/u, '').trim().toLowerCase(),
        adresse: adresseDe(t),
        lien: `/interne/metre/${t.id}`,
      }))
      : [];

    const cartes: CarteJournee[] = [];
    const ajouter = (c: Omit<CarteJournee, 'n' | 'exemples' | 'erreur'>, source: { taches: any[] | null; erreur?: string }, filtre: (t: any) => boolean) => {
      if (!visible(c.role)) return;
      const liste = source.taches ? source.taches.filter(filtre) : null;
      cartes.push({ ...c, n: liste ? liste.length : null, exemples: liste ? exemples(liste) : [], ...(source.erreur ? { erreur: source.erreur } : {}) });
    };

    const lienQualif = qualifId ? urlListe(qualifId) : 'https://app.clickup.com';
    ajouter({
      cle: 'relances', role: 'commercial', section: 'aFaire', surtitre: 'Commercial', titre: 'Relances devis échues',
      detail: 'Appeler ou relancer, la prochaine date se recalcule', urgent: true, lien: lienQualif, externe: true,
    }, qualif, (t) => statut(t).includes('devis envoy') && echu(t?.due_date));
    ajouter({
      cle: 'devis', role: 'commercial', section: 'aFaire', surtitre: 'Commercial', titre: 'Devis à chiffrer',
      detail: 'Fiches en 📝 devis à faire, relevé et brief prêts', urgent: false, lien: lienQualif, externe: true,
    }, qualif, (t) => statut(t).includes('devis a faire'));
    ajouter({
      cle: 'feuVert', role: 'chargeOperation', section: 'aDebloquer', surtitre: "Chargé d'opération", titre: 'Feu vert à donner',
      detail: 'Chantiers dont les 5 prérequis sont OK', urgent: false, lien: '/interne/feu-vert', externe: false,
    }, planning, (t) => {
      const coche = champ(t, CHAMP_FEU_VERT)?.value;
      if (coche === true || coche === 'true') return false;
      return PREREQUIS.every((id) => { const n = normal(nomOption(t, id)); return n.includes('confirme') || n.includes('non applicable'); });
    });
    ajouter({
      cle: 'receptions', role: 'chargeOperation', section: 'aDebloquer', surtitre: "Chargé d'opération", titre: 'Réceptions à valider',
      detail: 'PV, rapport de mesures et photos déposés par le poseur', urgent: true, lien: '/interne/validation', externe: false,
    }, planning, (t) => statut(t).includes('realise'));
    ajouter({
      cle: 'factures', role: 'backOffice', section: 'aDebloquer', surtitre: 'Back-office', titre: 'Factures en retard',
      detail: 'Rappel du jour ou dépassé (relances J+3, J+10, J+15)', urgent: true, lien: urlListe(FACTURES_ID), externe: true,
    }, factures, (t) => {
      const s = statut(t);
      return !s.includes('litige') && (s.includes('emise') || s.includes('partiel')) && echu(t?.due_date);
    });
    ajouter({
      cle: 'contrats', role: 'backOffice', section: 'aDebloquer', surtitre: 'Back-office', titre: 'Contrats à renouveler',
      detail: `Échéance annuelle dans les ${JOURS_CONTRAT} jours ou dépassée`, urgent: false, lien: urlListe(PARC_ID), externe: true,
    }, parc, (t) => {
      if (statut(t).includes('hors service')) return false;
      const j = jourDe(champNomme(t, 'echeance annuelle')?.value);
      return !!j && comparer(j, limiteContrat) <= 0;
    });

    const avertissements: string[] = [];
    if (qualif.erreur && visible('chargeOperation')) avertissements.push(`Relevés du jour : ${qualif.erreur}`);
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
