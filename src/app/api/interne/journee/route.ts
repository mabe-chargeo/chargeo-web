import { NextResponse } from 'next/server';
import { getQualificationListId } from '@/lib/listesClickUp';
import { aujourdhuiParis, ajouterJours, comparer, libelleJour } from '@/lib/joursOuvres';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe, type Role } from '@/lib/roles';
import { CHAMPS } from '@/lib/champsClickUp';
import { adresseDe, champ, dateVisiteDe, jourDe, libelleDate, nomOption, normal, sansEmoji, trier, vueDe, type CleVue } from '@/lib/vuesFiches';
import { CHAMPS_INTERVENTION, chantierAMoi } from '@/lib/espaces';

// Accueil « Ma journée » de l'application équipe (Phase 6, maquette du 13/10/2026). LECTURE SEULE.
// GET : ce qui est à faire aujourd'hui et à débloquer, avec des compteurs réels, selon les rôles de la personne
// connectée (src/lib/roles.ts). Direction : toutes les cartes. Autres rôles : seulement les leurs, filtrées ici.
// 16/10/2026, 23 h 22 (structure validée par Matthieu) : les cartes des fiches ouvrent la vue correspondante de l'écran
// Fiches (/interne/fiches?vue=…), plus ClickUp ; elles comptent avec les règles de src/lib/vuesFiches.ts (mêmes
// chiffres que le sous-menu des vues). Relevés du jour et en retard : une carte chacun, qui ouvre la fiche détaillée.
// Chantiers : feu vert à donner (5 prérequis OK, pas de feu vert) et réceptions à valider (réalisé), vers leurs écrans.
// Back-office : factures en retard et contrats à renouveler. Depuis le 17/10 à 14 h 28 (lot « écrans qui manquent »),
// elles ouvrent les écrans de liste de l'application (/interne/liste/factures et /interne/liste/parc), plus ClickUp.
// 17/10, 11 h 01 (Matthieu : « ce n'est pas le commercial qui fait les relevés techniques ») : les relevés planifiés et
// en retard sont au chargé d'opération / chef de chantier.
// 17/10, 13 h 13 (Matthieu : « c'est le commercial qui planifie le relevé technique pour le chef de chantier ») : la
// carte « Visites à caler » revient au commercial, avec ses cartes devis et relances.
// 17/10, 11 h 18 (espace Installateur validé) : carte « Mes interventions du jour » (chantiers dont je suis le
// 👷 Technicien, date d'intervention aujourd'hui ou passée et pas encore réalisés), vers /interne/interventions.
// 17/10, 13 h 40 (sélecteur de rôle unique) : libellés uniques dans les surtitres (Chef de chantier, Installateur).
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
type Releve = { id: string; nom: string; quand: string; retard: boolean; typeClient: string; adresse: string; lien: string };

const champNomme = (t: any, mot: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => normal(c?.name).includes(mot));
const urlTache = (t: any) => `/interne/element/${t?.id}`;

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

    // Relevés du jour et en retard : une carte par fiche, les plus anciens d'abord
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
    const ajouter = (c: Omit<CarteJournee, 'n' | 'exemples' | 'erreur'>, source: { taches: any[] | null; erreur?: string }, filtre: (t: any) => boolean) => {
      if (!visible(c.role)) return;
      const liste = source.taches ? source.taches.filter(filtre) : null;
      cartes.push({ ...c, n: liste ? liste.length : null, exemples: liste ? liste.slice(0, EXEMPLES_MAX).map((t) => ({ nom: String(t?.name || ''), url: urlTache(t) })) : [], ...(source.erreur ? { erreur: source.erreur } : {}) });
    };
    // Carte d'une vue de l'écran Fiches : même filtre, même tri, ouvre la vue
    const carteVue = (cle: CleVue, role: Role, surtitre: string, urgent: boolean) => {
      const v = vueDe(cle);
      if (!v || !visible(role)) return;
      const liste = qualif.taches ? trier(qualif.taches.filter((t) => v.filtre(t, aujourdhui)), v.tri) : null;
      cartes.push({
        cle, role, section: 'aFaire', surtitre, titre: v.libelle, detail: v.description, urgent,
        lien: `/interne/fiches?vue=${cle}`, externe: false,
        n: liste ? liste.length : null,
        exemples: liste ? liste.slice(0, EXEMPLES_MAX).map((t) => ({ nom: String(t?.name || ''), url: `/interne/fiches/${t.id}` })) : [],
        ...(qualif.erreur ? { erreur: qualif.erreur } : {}),
      });
    };

    carteVue('planifies', 'chargeOperation', `Relevés · ${CHEF}`, false);
    carteVue('a-caler', 'commercial', 'Commercial', false);
    carteVue('relances-echues', 'commercial', 'Commercial', true);
    carteVue('devis-a-chiffrer', 'commercial', 'Commercial', false);

    // Installateur : ses chantiers du jour (ou en retard), pas encore réalisés
    const moi = Number(session.id);
    ajouter({
      cle: 'mesInterventions', role: 'poseur', section: 'aFaire', surtitre: 'Installateur', titre: 'Mes interventions du jour',
      detail: 'Chantiers où tu es le technicien, prévus aujourd’hui ou en retard', urgent: true, lien: '/interne/interventions', externe: false,
    }, planning, (t) => {
      const j = jourDe(champ(t, CHAMPS_INTERVENTION.dateChantier)?.value);
      return chantierAMoi(t, moi) && !!j && comparer(j, aujourdhui) <= 0;
    });

    ajouter({
      cle: 'feuVert', role: 'chargeOperation', section: 'aDebloquer', surtitre: `Chantiers · ${CHEF}`, titre: 'Feu vert à donner',
      detail: 'Chantiers dont les 5 prérequis sont OK', urgent: false, lien: '/interne/feu-vert', externe: false,
    }, planning, (t) => {
      const coche = champ(t, CHAMP_FEU_VERT)?.value;
      if (coche === true || coche === 'true') return false;
      return PREREQUIS.every((id) => { const n = normal(nomOption(t, id)); return n.includes('confirme') || n.includes('non applicable'); });
    });
    ajouter({
      cle: 'receptions', role: 'chargeOperation', section: 'aDebloquer', surtitre: `Chantiers · ${CHEF}`, titre: 'Réceptions à valider',
      detail: 'PV, rapport de mesures et photos déposés par le poseur', urgent: true, lien: '/interne/validation', externe: false,
    }, planning, (t) => statut(t).includes('realise'));
    ajouter({
      cle: 'factures', role: 'backOffice', section: 'aDebloquer', surtitre: 'Back-office', titre: 'Factures en retard',
      detail: 'Rappel du jour ou dépassé (relances J+3, J+10, J+15)', urgent: true, lien: '/interne/liste/factures?vue=retard', externe: false,
    }, factures, (t) => {
      const s = statut(t);
      return !s.includes('litige') && (s.includes('emise') || s.includes('partiel')) && echu(t?.due_date);
    });
    ajouter({
      cle: 'contrats', role: 'backOffice', section: 'aDebloquer', surtitre: 'Back-office', titre: 'Contrats à renouveler',
      detail: `Échéance annuelle dans les ${JOURS_CONTRAT} jours ou dépassée`, urgent: false, lien: '/interne/liste/parc?vue=contrats', externe: false,
    }, parc, (t) => {
      if (statut(t).includes('hors service')) return false;
      const j = jourDe(champNomme(t, 'echeance annuelle')?.value);
      return !!j && comparer(j, limiteContrat) <= 0;
    });

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
