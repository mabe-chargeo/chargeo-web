import { POST as costructorPOST, GET as costructorGET } from '@/app/api/webhooks/costructor/route';
import { POST as devisEnvoyePOST, GET as devisEnvoyeGET } from '@/app/api/relances/devis-envoye/route';
import { POST as montantPOST, GET as montantGET } from '@/app/api/devis/montant/route';
import { POST as suiviPOST, GET as suiviGET } from '@/app/api/relances/suivi/route';
import { POST as feuVertPOST, GET as feuVertGET } from '@/app/api/chantiers/feu-vert/route';
import { POST as receptionPOST, GET as receptionGET } from '@/app/api/chantiers/reception/route';
import { POST as commandesPOST, GET as commandesGET } from '@/app/api/commandes/reception/route';
import { POST as validationPOST, GET as validationGET } from '@/app/api/achats/validation/route';
import { POST as facturesPOST, GET as facturesGET } from '@/app/api/factures/relances/route';
import { POST as avisPOST, GET as avisGET } from '@/app/api/avis/suivi/route';
import { getQualificationListId, QUALIFICATION_PROD_ID } from '@/lib/listesClickUp';
import { CHAMP_ALERTE_SITE } from '@/lib/alerteSite';
import { CHAMP_AVIS } from '@/lib/avisGoogle';
import { traiterGagne } from '@/lib/passageGagne';
import { traiterScenarios } from '@/lib/scenarioRetenu';
import { synchroniserSav } from '@/lib/syncSavParc';
import { CHAMP_RESULTAT_APPEL, PROSPECTION_ID, traiterProspection, type DeclencheurProspection } from '@/lib/prospection';
import { apresReceptionResident, avantReceptionResident, controlerResident, suggererInfra } from '@/lib/residentInfra';
import { aujourdhuiParis, libelleJour } from '@/lib/joursOuvres';
import { traiterEmbauche } from '@/lib/embauche';

// Aiguillage des changements ClickUp (bascule du 12/10/2026) : remplace les automatisations « Appeler le webhook »
// et les Super Agents de synchro. ClickUp prévient le site (src/app/api/webhooks/clickup), l'aiguillage choisit
// les règles à appliquer selon la liste et ce qui a changé, puis appelle les routes existantes, sans rien changer à
// leurs règles. Chaque route garde ses protections : sous-tâches ignorées, « déjà fait » vérifié, fiches Test en preview.
// Ignoré : le champ 📣 Alerte site (écrit par le site, relayé par ClickBot), les listes non suivies (DIRECTION…).
// Restent dans ClickUp : Notif lead site, Notifier Devis À Faire (Brief Billie), #4 perdu, Notif SAV site.
//
// Prospection (13/10/2026) : création, statut, 📢 Résultat Appel → échéances de relance internes ; 📅 rdv fixé → la
//   même fiche part en Qualification, 📍 à visiter (src/lib/prospection.ts).
// Bornes résidents (13/10/2026, src/lib/residentInfra.ts) : fiche créée en Qualification → suggestion de l'infra de
//   même adresse ; 📝 devis à faire → contrôle du lien à l'infra ; 🏁 terminé → signalement sur la fiche infra.
// Qualification : 📝 devis à faire → client Costructor ; 📩 devis envoyé → relance J+3 ouvrés + montant du devis ;
//   🏆 gagné → scénario retenu (src/lib/scenarioRetenu.ts, 14/10 : bloque la suite s'il n'est pas trouvé), montant +
//   facture d'acompte, arrêt des relances, puis Planning Chantiers, commande matériel, ADVENIR (src/lib/passageGagne.ts) ; 🔁 Suivi relance ou 📅 Date AG ou RDV → suivi des relances.
// Planning Chantiers : 🟢 Feu vert, un des 5 prérequis, 🚧 en cours → feu vert ; ✅ réalisé, 🏁 terminé → réception.
// Commandes Matériel : tâche créée (après 15 s, le temps de relier le chantier) ou 🏗️ Chantier modifié → réception
//   matériel ; statut → validation des achats puis réception matériel.
// Achats Fournisseurs : statut → validation. Factures Clients : statut, Date d'échéance, Relances envoyées → relances.
// Parc installé : ⭐ Avis Google → suivi des avis. Tickets SAV : création, statut, 🔗 Fiche Installation → synchro Parc.
// Recrutement Installateurs (18/10/2026, 9 h 40, choix de Matthieu) : statut « embauché » → fiche salarié dans Vie des
//   Salariés avec la checklist ONBOARDING (src/lib/embauche.ts).

const PLANNING_CHANTIERS_ID = '901520038258';
const COMMANDES_ID = '901520038249';
const PARC_ID = '901520038290';
const RECRUTEMENT_ID = '1200630000003865';
const SAV_IDS = [process.env.CLICKUP_SAV_LIST_ID || '', '901520038282'].filter(Boolean);
const FACTURES_ID = process.env.CLICKUP_FACTURES_LIST_ID || '1200630000003863';
const ACHATS_ID = process.env.CLICKUP_ACHATS_LIST_ID || '1200630000003864';

const CHAMP_SUIVI = '840aecae-652d-40e4-b39e-525d5d56cec1';
const CHAMP_DATE_AG = '482cfe42-351f-4030-8789-d2010e1605ca';
const CHAMP_FEU_VERT = 'c27f8084-e2f2-4eaf-83bd-d75e082e0d0a';
const PREREQUIS = [
  '348cc59d-5adc-4ed4-b07d-5da40a9e6abc', 'ba4a2025-43ec-44a0-8938-1cbc497f7bbf', '8074d071-24d4-4711-8726-4c20098321fd',
  '7ac103cd-7b52-40ca-a2d4-939e59427f56', '24f63f50-0839-416b-8f07-9c60ee56e308',
];
const CHAMP_CHANTIER = '9b561ce2-719c-4cc0-9bb6-392959f9206e';
const CHAMP_ECHEANCE_FACTURE = 'ad00c457-c263-46cd-a2bb-83741ab5a240';
const CHAMP_RELANCES_FACTURE = 'e823883c-db1d-4ae1-ad72-1cd8e8064aa3';
const CHAMP_INSTALLATION = '3804df6e-a2e1-4058-913c-447189c73d35';
const ATTENTE_CREATION_COMMANDE = 15000;

type Handler = (r: Request) => Promise<Response>;
const ROUTES: Record<string, { chemin: string; post: Handler; get: Handler }> = {
  costructor: { chemin: '/api/webhooks/costructor', post: costructorPOST, get: costructorGET },
  devisEnvoye: { chemin: '/api/relances/devis-envoye', post: devisEnvoyePOST, get: devisEnvoyeGET },
  montant: { chemin: '/api/devis/montant', post: montantPOST, get: montantGET },
  suivi: { chemin: '/api/relances/suivi', post: suiviPOST, get: suiviGET },
  feuVert: { chemin: '/api/chantiers/feu-vert', post: feuVertPOST, get: feuVertGET },
  reception: { chemin: '/api/chantiers/reception', post: receptionPOST, get: receptionGET },
  commandes: { chemin: '/api/commandes/reception', post: commandesPOST, get: commandesGET },
  validation: { chemin: '/api/achats/validation', post: validationPOST, get: validationGET },
  factures: { chemin: '/api/factures/relances', post: facturesPOST, get: facturesGET },
  avis: { chemin: '/api/avis/suivi', post: avisPOST, get: avisGET },
};

export type Changement =
  | { type: 'creation' }
  | { type: 'statut'; statut: string; typeStatut: string }
  | { type: 'champ'; champId: string };
export type Etape = { cle: string; params?: Record<string, string>; attendre?: number };

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function listesQualification(): string[] {
  return Array.from(new Set([QUALIFICATION_PROD_ID, String(getQualificationListId() || '')].filter(Boolean)));
}

export function listeSuivie(listeId: string): boolean {
  return [String(PROSPECTION_ID), ...listesQualification(), PLANNING_CHANTIERS_ID, COMMANDES_ID, PARC_ID, RECRUTEMENT_ID, ...SAV_IDS, String(FACTURES_ID), String(ACHATS_ID)].includes(listeId);
}

// Changements lus dans l'envoi de ClickUp. Chaque type d'événement n'apporte que son changement (pas de doublon
// si ClickUp envoie le même changement sous deux événements).
export function lireChangements(evenement: string, items: any[]): Changement[] {
  if (evenement === 'taskCreated') return [{ type: 'creation' }];
  if (evenement === 'taskStatusUpdated') {
    // Statut sans « avant » : c'est le statut posé à la création de la tâche (vu au test SAV du 12/10), pas un changement
    const statuts: Changement[] = items.filter((i) => i?.field === 'status')
      .map((i) => (!i?.before?.status
        ? { type: 'creation' as const }
        : { type: 'statut' as const, statut: String(i?.after?.status || ''), typeStatut: String(i?.after?.type || '') }));
    return statuts.length ? statuts : [{ type: 'statut', statut: '', typeStatut: '' }];
  }
  if (evenement === 'taskUpdated') {
    const ids = items.filter((i) => i?.field === 'custom_field').map((i) => String(i?.custom_field?.id || ''))
      .filter((id) => id && id !== CHAMP_ALERTE_SITE);
    return Array.from(new Set(ids)).map((champId) => ({ type: 'champ' as const, champId }));
  }
  return [];
}

export function planifier(listeId: string, ch: Changement): Etape[] {
  const s = ch.type === 'statut' ? normal(ch.statut) : '';

  if (listeId === String(PROSPECTION_ID)) {
    if (ch.type === 'creation') return [{ cle: 'prospection', params: { declencheur: 'creation' } }];
    if (ch.type === 'statut') return [{ cle: 'prospection', params: { declencheur: 'statut' } }];
    if (ch.type === 'champ' && ch.champId === CHAMP_RESULTAT_APPEL) return [{ cle: 'prospection', params: { declencheur: 'resultat' } }];
    return [];
  }

  if (listesQualification().includes(listeId)) {
    if (ch.type === 'creation') return [{ cle: 'residentSuggestion' }];
    if (ch.type === 'statut') {
      if (s.includes('devis a faire')) return [{ cle: 'costructor' }, { cle: 'residentControle' }];
      if (s.includes('devis envoy')) return [{ cle: 'devisEnvoye' }, { cle: 'montant', params: { evenement: 'envoye' } }];
      if (s.includes('gagn')) return [{ cle: 'scenarios' }, { cle: 'montant', params: { evenement: 'gagne' } }, { cle: 'devisEnvoye' }, { cle: 'gagne' }];
    }
    if (ch.type === 'champ' && [CHAMP_SUIVI, CHAMP_DATE_AG].includes(ch.champId)) return [{ cle: 'suivi' }];
    return [];
  }

  if (listeId === PLANNING_CHANTIERS_ID) {
    if (ch.type === 'champ') {
      if (ch.champId === CHAMP_FEU_VERT) return [{ cle: 'feuVert', params: { evenement: 'feu_vert' } }];
      if (PREREQUIS.includes(ch.champId)) return [{ cle: 'feuVert', params: { evenement: 'prerequis' } }];
    }
    if (ch.type === 'statut') {
      if (s.includes('en cours')) return [{ cle: 'feuVert', params: { evenement: 'en_cours' } }];
      if (s.includes('realise')) return [{ cle: 'reception', params: { evenement: 'realise' } }];
      if (s.includes('termine') || ch.typeStatut === 'closed') return [{ cle: 'residentAvantParc' }, { cle: 'reception', params: { evenement: 'termine' } }, { cle: 'residentParc' }];
    }
    return [];
  }

  if (listeId === COMMANDES_ID) {
    if (ch.type === 'creation') return [{ cle: 'commandes', attendre: ATTENTE_CREATION_COMMANDE }];
    if (ch.type === 'statut') return [{ cle: 'validation' }, { cle: 'commandes' }];
    if (ch.type === 'champ' && ch.champId === CHAMP_CHANTIER) return [{ cle: 'commandes' }];
    return [];
  }

  if (listeId === String(ACHATS_ID)) return ch.type === 'statut' ? [{ cle: 'validation' }] : [];

  if (listeId === String(FACTURES_ID)) {
    if (ch.type === 'statut') return [{ cle: 'factures' }];
    if (ch.type === 'champ' && [CHAMP_ECHEANCE_FACTURE, CHAMP_RELANCES_FACTURE].includes(ch.champId)) return [{ cle: 'factures' }];
    return [];
  }

  if (listeId === PARC_ID) return ch.type === 'champ' && ch.champId === CHAMP_AVIS ? [{ cle: 'avis' }] : [];

  if (listeId === RECRUTEMENT_ID) return ch.type === 'statut' && s.includes('embauche') ? [{ cle: 'embauche' }] : [];

  if (SAV_IDS.includes(listeId)) {
    if (ch.type === 'creation') return [{ cle: 'sav', params: { declencheur: 'creation' } }];
    if (ch.type === 'statut') return [{ cle: 'sav', params: { declencheur: 'statut' } }];
    if (ch.type === 'champ' && ch.champId === CHAMP_INSTALLATION) return [{ cle: 'sav', params: { declencheur: 'champ' } }];
    return [];
  }
  return [];
}

// Même étape demandée deux fois dans un même envoi (deux prérequis changés d'un coup) : une seule exécution
export function sansDoublon(etapes: Etape[]): Etape[] {
  const vues = new Set<string>();
  return etapes.filter((e) => {
    const cle = `${e.cle}:${JSON.stringify(e.params || {})}`;
    if (vues.has(cle)) return false;
    vues.add(cle);
    return true;
  });
}

const libelle = (e: Etape) => `${e.cle}${e.params ? ` ${Object.values(e.params).join(' ')}` : ''}`;
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function appelerRoute(cle: string, taskId: string, params: Record<string, string>, simulation: boolean) {
  const r = ROUTES[cle];
  const q = new URLSearchParams({ taskId, ...params });
  if (simulation) q.set('simulation', '1');
  const requete = new Request(`https://site.interne${r.chemin}?${q.toString()}`, { method: simulation ? 'GET' : 'POST' });
  const res = simulation ? await r.get(requete) : await r.post(requete);
  const corps = await res.json().catch(() => null);
  return { status: res.status, ...(corps && typeof corps === 'object' ? corps : {}) };
}

// complet = false : résumé court pour les journaux Vercel. Une étape qui renvoie bloque: true arrête les suivantes
// (scénario retenu introuvable au gagné : pas d'acompte ni de départ au Planning sur le mauvais devis).
export async function executer(taskId: string, etapes: Etape[], simulation: boolean, complet = false) {
  const resultats: any[] = [];
  for (const e of etapes) {
    if (e.attendre && !simulation) await attendre(e.attendre);
    let r: any;
    try {
      if (e.cle === 'gagne') r = await traiterGagne(taskId, simulation);
      else if (e.cle === 'scenarios') r = await traiterScenarios(taskId, simulation);
      else if (e.cle === 'sav') r = await synchroniserSav(taskId, simulation, e.params?.declencheur);
      else if (e.cle === 'prospection') r = await traiterProspection(taskId, (e.params?.declencheur || 'statut') as DeclencheurProspection, simulation);
      else if (e.cle === 'residentSuggestion') r = await suggererInfra(taskId, simulation);
      else if (e.cle === 'residentControle') r = await controlerResident(taskId, simulation);
      else if (e.cle === 'residentAvantParc') r = await avantReceptionResident(taskId, simulation);
      else if (e.cle === 'residentParc') r = await apresReceptionResident(taskId, simulation, libelleJour(aujourdhuiParis()));
      else if (e.cle === 'embauche') r = await traiterEmbauche(taskId, simulation);
      else r = await appelerRoute(e.cle, taskId, e.params || {}, simulation);
    } catch (erreur) {
      console.error(`Aiguillage : ${libelle(e)} en erreur sur ${taskId}`, erreur);
      r = { success: false, error: String(erreur) };
    }
    resultats.push(complet ? { etape: libelle(e), ...r } : { etape: libelle(e), status: r?.status, success: r?.success, action: r?.action, error: r?.error });
    if (r?.bloque) break;
  }
  return resultats;
}

async function lireTache(taskId: string): Promise<any | null> {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return null;
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}`, { headers: { Authorization: token }, cache: 'no-store' });
  return res.ok ? res.json() : null;
}

// Envoi de ClickUp (signature déjà vérifiée)
export async function traiterEvenement(data: any) {
  const evenement = String(data?.event || '');
  const taskId = String(data?.task_id || '');
  if (!taskId) return { action: 'ignore_sans_tache', evenement };
  const items: any[] = Array.isArray(data?.history_items) ? data.history_items : [];
  let changements = lireChangements(evenement, items);
  if (!changements.length) return { action: 'ignore_rien_a_router', evenement, taskId };

  // Liste : celle de l'envoi si elle est suivie, sinon relue sur la tâche
  let listeId = String(items.find((i) => i?.parent_id)?.parent_id || '');
  let tache: any = null;
  const besoinStatut = changements.some((c) => c.type === 'statut' && !c.statut);
  if (!listeSuivie(listeId) || besoinStatut) {
    tache = await lireTache(taskId);
    listeId = String(tache?.list?.id || listeId);
  }
  if (!listeSuivie(listeId)) return { action: 'ignore_liste', evenement, taskId, listeId };
  if (besoinStatut && tache) {
    changements = changements.map((c) => (c.type === 'statut' && !c.statut
      ? { type: 'statut' as const, statut: String(tache?.status?.status || ''), typeStatut: String(tache?.status?.type || '') }
      : c));
  }

  const etapes = sansDoublon(changements.flatMap((c) => planifier(listeId, c)));
  if (!etapes.length) return { action: 'ignore_aucune_regle', evenement, taskId, listeId };
  const resultats = await executer(taskId, etapes, false);
  return { evenement, taskId, listeId, resultats };
}
