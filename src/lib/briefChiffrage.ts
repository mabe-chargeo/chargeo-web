// Brief de chiffrage (étape 5 du plan du 15/10/2026, PR #51).
// Décision de Matthieu (15/10, 10 h 51) : au clic « Prêt à chiffrer », le site calcule et poste un commentaire
// « 📋 Brief de chiffrage » sur le scénario. Ce n'est pas le site qui fait le devis (synthèse du 14/10, section 8).
// 01/11/2026 (Phase 8, étape 4, « chiffrer sans IA ») : le brief devient une liste prête à saisir par Mathieu, sans
// calcul à refaire : le modèle Costructor (src/lib/modelesDevis.ts), puis, sous-section par sous-section du modèle,
// chaque « référence × quantité » tirée de la table de correspondance du 01/11 (compétence Bibliothèque Costructor).
// Règles appliquées : D1 (pas de délesteur en bibliothèque : TIC = coffret simple + LIA-DATA-TIC, Modbus = coffret -MOD +
// LIA-DATA-MOD), D2 à D4 (bornes, prises, pieds), D5 et D6 (PDL dédié : ni compteur ni comptage), D8 (supervision PAR,
// FLT, TER), D9 (déplacement), D13 (colonne Enedis), D14 (pas de 3G35), D15 (TD de borne partagée), D16 (artère = chemin
// de câbles neuf LIA-CDC + LIA-DATA-RJ45 sur la même longueur, alimentation = chemin de câbles existant LIA-CDC-EX), et
// les réponses du 01/11 (RIC tarif type ou résident selon 🏢 Type Client de la fiche ; point de livraison dédié = devis
// AMO séparé envoyé en premier ; dépose = élément Autre ; façade = case du cheminement). Une référence absente de la
// bibliothèque n'est jamais inventée : elle part dans « ⏳ À faire à la main ».
// 01/11, 20 h 15 (Mathieu : « le brief du devis doit suivre la structure du modèle de devis correspondant ») : la liste
// suit le plan lu dans chaque modèle (PLANS, src/lib/modelesDevis.ts). Alertes : borne triphasée sur raccordement
// monophasé et TD 2 ou 3 points pour moins de points de charge.
// 02/11 (recette du brief PAR sur PDL dédié) : alerte si plus de 12 kVA sont demandés sur un branchement monophasé.
// 02/11, 18 h 46 (Phase 8, étape 7) : chaque devis reçoit « Avant de saisir » et « Avant de finaliser »
// (src/lib/briefSaisie.ts) ; la liaison data de l'élément Communication est rangée avec le modem (écart 3).
// 02/11, 19 h 57 : les éléments du relevé sont transmis aux consignes de saisie (crochet [emplacements]).
// 03/11 (D9) : la zone de déplacement n'est plus demandée ; LOG-DEP-Z1 « zone et jours à ajuster au montage ».
// 03/11, passe 2 de la recette (décisions de Mathieu, T5 et T6 tranchés à 21 h 21 et 21 h 22) :
// - gestionnaire de grappe : demande plafonnée à 36 kVA (52 A), section calculée sur cette consigne (5G16 au lieu de
//   5G25), plus d'alerte « au-dessus de la puissance dispo » (écarts 2, 8, 63, 64) ;
// - COP sur services généraux : puissance cible = pointe réelle des communs + réserve IRVE ; si l'abonnement suffit,
//   il reste inchangé, sinon ADMIN-AUGM-PDL + JUR-AUGM-PUISSANCE (écarts 51 et 52) ;
// - paliers 24, 30 et 36 kVA ; « 18 kVA et plus » n'est plus lu comme 18 kVA (écart 50) ;
// - liaison de plus de 3 m depuis le tableau : DEPART-TGBT-MONO-40 ou -TRI-40 ajouté en Raccordement (écarts 32, 43, 65) ;
// - TIC Linky : liaison data sur les deux tronçons (écarts 16 et 74) ; une liaison data qui manque au relevé prend la
//   longueur de l'alimentation du même tronçon (écart 48) ; PDL dédié : la liaison data Raccordement → TD n'est jamais
//   comptée (écart 58) ;
// - T5 : COFF-MONO-7K contient déjà 3 m de 3G16 et 3 m de téléreport : liaison Raccordement → coffret et TIC comptées
//   au-delà de 3 m seulement ;
// - une seule Boîte de dérivation avec une quantité (écart 46) ; HUB présélectionné selon les points de charge (T6) ;
// - Artère en vide sanitaire ou en tirage existant (écart 47) ; Réseau « Box ou WiFi du client » : portée à vérifier (T4) ;
// - lot 3 : « Nouveau devis ▾ › Créer à partir d'un modèle » (écart 14) ; la sous-section est écrite au bout de chaque
//   ligne (écart 15) ; T2, modèle complet qu'on élague : une ligne du modèle sans équivalent dans le relevé est à retirer
//   (✖), le contrôle vérifie d'abord qu'aucun ✖ n'est oublié ; DAP : la ligne Segment dit la source (écart 40) ; RIC sur
//   l'infra CHARGéO : la dérivation reprend la section de l'artère de l'infra liée (écarts 66 et 70) ; ADVENIR chiffré
//   sur les prix de la bibliothèque (src/lib/briefSaisie.ts). L'envoi sur le scénario est dans src/lib/briefPoste.ts.
// - 04/11 (préparation de la passe 3) : RIC sur l'infra, la dérivation prend la section de l'artère mais garde les phases
//   du raccordement du résident, 3G en monophasé, 5G en triphasé si l'artère l'est aussi (écart 66 : 3G16 pour une borne
//   mono sur une artère 5G16).
// - 04/11, 7 h 41 (cas 8, écart 65, décision de Mathieu : « sinon on installe le TDIRVE à côté du TGBT ») : au-delà de
//   40 A, pas de départ protégé au tableau. Liaison Raccordement → TD de plus de 3 m : alerte, le TD IRVE se pose à côté
//   du TGBT (3 m au plus, protection déportée au TD) et la distance passe sur les liaisons TD → bornes.
// - 04/11, soir (modèles V2 complets, décisions de Mathieu du jour) : le brief suit les plans V2 ;
//   · DAP : modèle sur services généraux ou sur le tableau du logement selon la source ;
//   · ✖ regroupés sur une ligne par sous-section (« ✖ retirer, rien au relevé : … ») ;
//   · 🔁 seulement pour la section d'un câble (même mode de pose) et pour un percement -40 ; tout le reste se garde ou
//     se retire ;
//   · textes conditionnels (coupure, réserve, augmentation, sans délestage, tranchée, façade) retirés si le relevé ne les
//     demande pas ; tranchée et façade posées dans chaque cheminement concerné, point de recharge par point de recharge ;
//   · coupure : JUR-COUPURE-TGBT sur les services généraux, JUR-COUPURE-TABLEAU sur le tableau du logement ;
//   · PDL dédié : LIA-PDL-MONO-2X16 ou LIA-PDL-TRI-4X16 en Raccordement ; ADMIN-CREATION-PDL reste dans l'AMO seul ;
//   · comptage des services généraux (COP, PAR) rangé dans « Gestionnaire de charge » ;
//   · liaison data vers le routeur (élément Communication) en LIA-ROUTEUR.
// - 05/11 (passe 3, cas 11) : une liaison entièrement couverte par le câble compris dans le coffret (T5) ne donne pas de
//   ligne ; la ligne du modèle de la même famille est écrite « ✖ REF : retirer (… compris dans les 3 m de COFF-MONO-7K) »
//   au lieu de partir sans explication dans « rien au relevé ».
// Calculs (synthèse du 14/10, sections 4, 6 et 7) :
// - réserve IRVE au barème (arrêté du 23/12/2020) en COP, avec le plafond ADVENIR infra ;
// - puissance à demander à Enedis si PDL dédié (réserve IRVE en COP, somme des puissances visées sinon, plafonnée à
//   36 kVA avec un gestionnaire), toujours « à valider » ; en COP sur le TGBT SG : pointe réelle + réserve IRVE ;
// - alerte « > 36 kVA : tarif jaune, étude spécifique » ;
// - section et chute de tension de chaque cheminement d'alimentation, 🔧 Section forcée prioritaire ;
// - artère COP : 63 A tri, 16 mm², ou 25 mm² si la chute dépasse le budget ;
// - RIC : boîte → coffret à la section de l'artère, forfait 5 + 5 m de tube apparent, dépassement = devis détaillé ;
// - protection en tête si Raccordement → coffret > 3 m (hors COP et RIC) ;
// - exclusion Enedis dès qu'Enedis intervient (PDL dédié, passage en tri, augmentation de puissance).
// 15/10, 18 h 14 (normes du Drive) :
// - chute de tension, NF C 15-100 art. 525 et UTE C 15-105 : u = b (ρ1 L / S cos φ + λ L sin φ) IB, b = 2 en mono et 1 en
//   tri, rapportée à 230 V ; ρ1 = 0,0225 Ω·mm²/m (cuivre en service normal) ; λ = 0,08 mΩ/m ; cos φ = 1 ;
// - IB = courant assigné de la borne (UTE C 15-722, notes du tableau 2) ;
// - limite : 5 % cumulés depuis l'origine (tableau 52W) ; la chute en amont du raccordement relevé n'est pas comptée ;
// - protections et sections minimales : UTE C 15-722 tableau 2 (16 A → 20 A et 2,5 mm² ; 32 A → 40 A et 10 mm²) ;
// - utilisation et simultanéité = 1 (7-722, 722.311), réductible seulement avec une gestion de charge ;
// - déport de protection jusqu'à 3 m sous conditions (433.2.1 et 434.2.2.1) ;
// - circuit spécialisé (722.314.101), DDR 30 mA individuel par point de charge (722.411).
// Choix CHARGéO (pas une valeur de norme) : budget de 3 % pour l'artère COP, pour laisser 2 % aux dérivations RIC.
import type { Segment } from '@/lib/champsClickUp';
import { LIBELLE_SEGMENT, ORDRE_NATURE, FORFAIT_RIC_TUBE_APPARENT, estDepose, nomLien } from '@/lib/elementsModele';
import {
  MODELES, NOM_ZONE, ORDRE_ZONES, PLANS, REPLI_ZONE, TEXTES_CONDITIONNELS, ZONES_PAR_POINT, lienModele,
  type ModeleDevis, type SectionModele, type Zone,
} from '@/lib/modelesDevis';
import {
  DISTANCES, PERCEMENTS, PLAFOND_GESTION_KVA, POINTS_PAR_BOITE, PRISES, SAISIES, alerteTroisMetres, estCoffretTd, gestionDuSite, hubSuggere,
  ligneBorne, longueurTotale, modeleCoherent, nombreBoites, type ElementReleve,
} from '@/lib/releveElements';
import { avantFinaliser, avantSaisie, type ContexteSaisie } from '@/lib/briefSaisie';

const RHO = 0.0225; // Ω·mm²/m, cuivre en service normal
const LAMBDA = 0.00008; // Ω/m (0,08 mΩ/m)
const COS_PHI = 1;
const SIN_PHI = Math.sqrt(1 - COS_PHI * COS_PHI);
const U0 = 230;
const LIMITE_CUMULEE = 5;
export const BUDGET_ARTERE = 3;
const TARIF_JAUNE_KVA = 36;
const MONO_MAX_KVA = 12; // branchement monophasé Enedis : 12 kVA au plus, au-delà triphasé (recette du 02/11)
// Consigne du gestionnaire de grappe : 36 kVA en tri (≈ 52 A), 12 kVA en mono (≈ 52 A) ; protection 63 A, 16 mm²
const COURANT_PLAFOND = 52;
// Plus gros départ protégé au tableau en bibliothèque (DEPART-TGBT-MONO-40 et -TRI-40). Au-delà, le TD IRVE se pose à
// côté du TGBT (décision du 04/11, cas 8)
const DEPART_MAX_A = 40;
const SECTIONS = [2.5, 4, 6, 10, 16, 25, 35, 50];
const CALIBRES = [20, 25, 32, 40, 50, 63, 80, 100, 125];
// UTE C 15-722 tableau 2 pour 20 A et 40 A ; valeurs usuelles pour les autres calibres
const SECTION_MIN: Record<number, number> = { 20: 2.5, 25: 4, 32: 6, 40: 10, 50: 16, 63: 16, 80: 25, 100: 35, 125: 50 };
const KW: Record<string, number> = { '3.7': 3.7, '7.4': 7.4, '11': 11, '22': 22 };
const ASSIGNE: Record<string, number> = { '3.7': 16, '7.4': 32, '11': 16, '22': 32 };
// « 18 kVA et plus » (ancien palier) n'a pas de valeur : il n'est plus lu comme 18 kVA (écart 50)
const DISPO_KVA: Record<string, number> = { '3': 3, '6': 6, '9': 9, '12': 12, '24': 24, '30': 30, '36': 36 };
// Câble déjà compris dans un coffret (T5, 03/11 à 21 h 21 ; composition lue dans Costructor le 03/11)
const CABLE_INCLUS: Record<string, { puissance: number; data: number }> = {
  'COFF-MONO-7K': { puissance: 3, data: 3 }, // 3 m de H07RN-F 3G16 « liaison TGBT éloigné » + 3 m de téléreport
};

// Ligne à saisir : zone du modèle, rang du point de recharge (0 = N°1), référence, quantité (null pour un texte), unité,
// détail (élément du relevé d'où elle vient)
export type LigneDevis = { zone: Zone; pdc: number; ref: string; qte: number | null; unite: string; detail?: string };

// Sections de câble qui ont un ouvrage, par famille de liaison. Pas de 3G35 (D14).
const BASE_10 = ['3G2.5', '3G4', '3G6', '3G10', '5G2.5', '5G4', '5G6', '5G10'];
const GROS = ['3G16', '3G25', '5G16', '5G25', '5G35'];
const CABLES: Record<string, string[]> = {
  'LIA-TUBE': [...BASE_10, ...GROS],
  'LIA-GOUL': BASE_10,
  'LIA-ENC': BASE_10,
  'LIA-VIDE': BASE_10,
  'LIA-TIR': BASE_10,
  'LIA-CDC-EX': BASE_10,
  'LIA-ENT': [...BASE_10, '5G25', '5G35'],
  'LIA-CDC': GROS,
  'LIA-DERIV': GROS,
};
const POSE_ALIMENTATION: Record<string, string> = {
  distTubeApparent: 'LIA-TUBE', distGoulotte: 'LIA-GOUL', distEncastre: 'LIA-ENC', distVideSanitaire: 'LIA-VIDE',
  distTirageExistant: 'LIA-TIR', distCheminCables: 'LIA-CDC-EX', distTranchee: 'LIA-ENT',
};
// Artère : chemin de câbles, tranchée, vide sanitaire ou tirage existant (écart 47) ; tube apparent gardé pour un ancien relevé
const POSE_ARTERE: Record<string, string> = {
  distCheminCables: 'LIA-CDC', distTranchee: 'LIA-ENT', distVideSanitaire: 'LIA-VIDE', distTirageExistant: 'LIA-TIR', distTubeApparent: 'LIA-TUBE',
};
const PERCEMENT_REF: Record<string, string> = {
  percementsPlaco: 'PER-PLACO', percementsBrique: 'PER-PARPAING', percementsBeton: 'PER-BETON', percementsDalle: 'PER-DALLE',
};

const texte = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const fr = (n: number, d = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: d });
const metres = (m: number) => Math.ceil(m - 1e-9); // longueurs arrondies au mètre au-dessus
const libelle = (cle: string, v: unknown) => {
  const t = texte(v);
  if (!t) return '';
  return SAISIES[cle]?.options?.find((o) => o.cle === t)?.libelle ?? t;
};
const typeDe = (c: ElementReleve) => c.typeCheminement || texte(c.valeurs.typeCheminement) || 'alimentation';
const cleKw = (e: ElementReleve) => (e.nature === 'priseRenforcee' ? '3.7' : texte(e.valeurs.puissanceVisee));
const kwDe = (e: ElementReleve) => KW[cleKw(e)] ?? 0;
const normal = (s: unknown) => texte(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const pointeDe = (racc: ElementReleve | undefined): number | null => (Number(racc?.valeurs.pointeReelle) > 0 ? Number(racc?.valeurs.pointeReelle) : null);
const inclusDans = (e: ElementReleve | undefined) =>
  (e?.nature === 'tdIrveCoffret' ? CABLE_INCLUS[texte(e.valeurs.coffretIrve)] : undefined) ?? { puissance: 0, data: 0 };

// Réserve IRVE (kVA) selon le nombre de places, barème de l'arrêté du 23/12/2020. null : moins de 10 places
export function reserveIrve(places: number): number | null {
  if (places < 10) return null;
  if (places <= 20) return 15;
  if (places <= 40) return 22;
  if (places <= 50) return 30;
  if (places <= 100) return 30 + 6 * Math.ceil((places - 50) / 10);
  if (places <= 200) return 60 + 3.6 * Math.ceil((places - 100) / 10);
  return 96 + 0.2 * (places - 200);
}

// Plafond ADVENIR infra : 12 500 € HT jusqu'à 100 places, + 125 € par place au-delà
export const plafondAdvenirInfra = (places: number) => (places <= 100 ? 12500 : 12500 + 125 * (places - 100));

// COP sur services généraux (décision de Mathieu du 03/11, 14 h 57) : puissance cible = pointe réelle des communs + réserve
// IRVE. Si l'abonnement actuel suffit, il reste inchangé ; sinon augmentation de puissance. augmenter : null = on ne sait pas.
export function puissanceCopSg(dispo: number | null, pointe: number | null, reserve: number): { cible: number | null; augmenter: boolean | null; lignes: string[]; alerte?: string } {
  if (pointe !== null) {
    const besoin = pointe + reserve;
    const calcul = `pointe réelle des communs ${fr(pointe)} kVA + réserve IRVE ${fr(reserve)} kVA = ${fr(besoin)} kVA`;
    if (dispo !== null && besoin <= dispo) {
      return { cible: dispo, augmenter: false, lignes: [`Puissance cible du PDL services généraux : ${calcul}, couverte par l'abonnement actuel (${fr(dispo)} kVA) : abonnement inchangé`] };
    }
    return {
      cible: besoin,
      augmenter: dispo === null ? null : true,
      lignes: [`Puissance cible du PDL services généraux : ${calcul}${dispo !== null ? `, au-dessus de l'abonnement actuel (${fr(dispo)} kVA) : augmentation de puissance à demander à Enedis` : ' (abonnement actuel à renseigner)'}, à valider`],
    };
  }
  const alerte = "Pointe réelle des communs non relevée (élément Raccordement) : puissance cible calculée sur l'abonnement, qui ne dit pas la consommation réelle. À relever pour savoir s'il faut augmenter la puissance";
  if (dispo !== null) {
    return { cible: dispo + reserve, augmenter: null, alerte, lignes: [`Puissance cible du PDL services généraux : ${fr(dispo)} kVA (abonnement actuel) + ${fr(reserve)} kVA = ${fr(dispo + reserve)} kVA, à valider (pointe réelle non relevée)`] };
  }
  return { cible: null, augmenter: null, alerte, lignes: ['Puissance cible du PDL services généraux : pointe réelle des communs et abonnement actuel à renseigner, + réserve IRVE'] };
}

// Modèle(s) du devis (src/lib/modelesDevis.ts). typeClient : clé de 🏢 Type Client de la fiche (particulier, pro, syndic).
export function modelesDuScenario(
  seg: Segment | null, source: string, typeClient: string | null, priseSeule: boolean,
): { devis: { modele: ModeleDevis; role: string }[]; alertes: string[] } {
  const devis: { modele: ModeleDevis; role: string }[] = [];
  const alertes: string[] = [];
  // Point de livraison dédié : toujours un devis AMO séparé, envoyé en premier (décision du 01/11, 19 h 23)
  if (source === 'pdlDedie') {
    devis.push({ modele: MODELES.AMO_PDL, role: "à envoyer en premier : il lance la demande Enedis, pour que le client connaisse le prix global (travaux + Enedis). Rien à y ajouter" });
  }
  let principal: ModeleDevis | null = null;
  switch (seg) {
    case 'COP':
      if (source === 'tgbtServicesGeneraux') principal = MODELES.COP_SG;
      else if (source === 'pdlDedie') principal = MODELES.COP_PDL;
      else alertes.push('COP : source à renseigner (TGBT services généraux ou PDL dédié) pour choisir le modèle');
      break;
    case 'PAR':
      if (source === 'tgbtServicesGeneraux') principal = MODELES.PAR_SG;
      else if (source === 'pdlDedie') principal = MODELES.PAR_PDL;
      else alertes.push('PAR : source à renseigner (TGBT services généraux ou PDL dédié) pour choisir le modèle');
      break;
    case 'RIC':
      if (source === 'colonneEnedis') principal = MODELES.RIC_COLONNE;
      else if (typeClient === 'particulier') principal = MODELES.RIC_RESIDENT;
      else if (typeClient === 'syndic' || typeClient === 'pro') principal = MODELES.RIC_TARIF_TYPE;
      else alertes.push('RIC : 🏢 Type Client vide sur la fiche. Syndic ou pro = tarif type, particulier = vrai devis résident');
      break;
    case 'RES':
      principal = priseSeule ? MODELES.RES_PRISE : MODELES.RES;
      break;
    case 'DAP':
      // Deux modèles depuis le 04/11 : services généraux de la copropriété, ou tableau du logement
      if (source === 'tgbtServicesGeneraux') principal = MODELES.DAP_SG;
      else if (source === 'tableauIndividuel') principal = MODELES.DAP_HSG;
      else alertes.push('DAP : source à renseigner (TGBT services généraux ou tableau du logement) pour choisir le modèle');
      break;
    case 'FLT':
      principal = MODELES.FLT;
      break;
    case 'TER':
      principal = MODELES.TER;
      break;
    default:
      alertes.push('Segment du scénario à renseigner pour choisir le modèle');
  }
  if (priseSeule && seg && seg !== 'RES') alertes.push(`Prise renforcée en ${seg} : pas de modèle prise pour ce segment, TVA à fixer (10 % pour une prise en logement de plus de 2 ans)`);
  if (principal) devis.push({ modele: principal, role: source === 'pdlDedie' ? 'devis des travaux' : '' });
  return { devis, alertes };
}

// plafonne : courant ramené à la consigne du gestionnaire de grappe (36 kVA, 03/11)
type Circuit = { tri: boolean; courant: number; calibre: number; sectionMin: number; plafonne?: boolean };

// Calibre normalisé ≥ 1,25 × courant assigné (16 A → 20 A, 32 A → 40 A, comme le tableau 2 de l'UTE C 15-722)
function circuit(courant: number, tri: boolean): Circuit {
  const calibre = CALIBRES.find((c) => c >= courant * 1.25) ?? CALIBRES[CALIBRES.length - 1];
  return { tri, courant, calibre, sectionMin: SECTION_MIN[calibre] ?? 50 };
}

// Chute de tension en % (NF C 15-100 art. 525) : b = 2 en mono, 1 en tri, rapportée à 230 V
export function chute(tri: boolean, longueur: number, courant: number, section: number): number {
  const b = tri ? 1 : 2;
  const u = b * ((RHO * longueur * COS_PHI) / section + LAMBDA * longueur * SIN_PHI) * courant;
  return (u / U0) * 100;
}

const sectionSuivante = (s: number) => SECTIONS.find((x) => x > s) ?? null;

// Courant assigné en aval d'un équipement (bornes mono supposées sur la même phase, simultanéité 1).
// monoSeul : raccordement monophasé sans passage en tri, une borne 11 ou 22 kW y est bridée à 7,4 kW (32 A mono).
function aval(id: string, els: ElementReleve[], monoSeul = false, vus = new Set<string>()): { courant: number; tri: boolean } {
  if (vus.has(id)) return { courant: 0, tri: false };
  vus.add(id);
  const e = els.find((x) => x.id === id);
  if (!e) return { courant: 0, tri: false };
  if (e.nature === 'borne' || e.nature === 'priseRenforcee') {
    const k = cleKw(e);
    const tri = k === '11' || k === '22';
    if (tri && monoSeul) return { courant: 32, tri: false };
    return { courant: ASSIGNE[k] ?? 0, tri };
  }
  let courant = 0;
  let tri = false;
  for (const c of els.filter((x) => x.nature === 'cheminement' && x.depart === id && x.arrivee && typeDe(x) !== 'liaisonData')) {
    const a = aval(String(c.arrivee), els, monoSeul, vus);
    courant += a.courant;
    tri = tri || a.tri;
  }
  return { courant, tri };
}

// Artère de l'infra CHARGéO liée (RIC, écarts 66 et 70) : section et phases, lues par src/lib/briefPoste.ts
export type ArtereInfra = { section: number; tri: boolean; nom: string };

export type EntreeBrief = {
  scenarioNom: string;
  segment: Segment | null;
  nbPlaces: number | null;
  zone: string | null;
  elements: ElementReleve[];
  typeClient?: string | null; // 🏢 Type Client de la fiche (RIC : tarif type ou résident)
  ficheNom?: string | null; // nom de la fiche (02/11)
  dateVisite?: string | null; // 📅 Date Visite Technique (JJ/MM/AAAA), crochet [date] de l'en-tête (02/11)
  datePermis?: number | null; // 🏛️ Date dépôt permis (ms), assiette ADVENIR infra (03/11)
  infra?: ArtereInfra | null; // RIC sur l'infra : artère de l'infra liée (03/11)
  prix?: Map<string, number> | null; // prix de vente HT de la bibliothèque, pour les 3 valeurs ADVENIR (03/11)
};

type Calcul = {
  c: ElementReleve;
  type: string;
  long: number;
  ci: Circuit | null;
  forcee: number | null;
  section: number | null;
  fixe: boolean; // section forcée ou imposée : jamais augmentée par le calcul
  infra: boolean; // RIC boîte → coffret : section de l'artère de l'infra
};

export function genererBrief(b: EntreeBrief): { texte: string; alertes: string[]; lignes: LigneDevis[]; aFaire: string[] } {
  const els = b.elements;
  const seg = b.segment;
  const cop = seg === 'COP';
  const ric = seg === 'RIC';
  const alertes: string[] = [];
  const protections: string[] = [];
  const exclusions: string[] = [];
  const nomDe = (id: string | null) => (id ? els.find((e) => e.id === id)?.nom ?? '?' : '');
  const ordre = (e: ElementReleve | undefined) => ORDRE_NATURE[e?.nature ?? 'autre'];
  const cheminements = els.filter((e) => e.nature === 'cheminement')
    .sort((x, y) => ordre(els.find((e) => e.id === x.depart)) - ordre(els.find((e) => e.id === y.depart)) || x.nom.localeCompare(y.nom, 'fr', { numeric: true }));
  const equipements = els.filter((e) => e.nature !== 'cheminement')
    .sort((x, y) => ordre(x) - ordre(y) || x.nom.localeCompare(y.nom, 'fr', { numeric: true }));
  const racc = els.find((e) => e.nature === 'raccordement');
  const source = texte(racc?.valeurs.sourceRaccordement);
  const dispoCle = texte(racc?.valeurs.puissanceDispo);
  const dispo = DISPO_KVA[dispoCle] ?? null;
  const pointe = pointeDe(racc);
  const cible = texte(racc?.valeurs.raccordementCible);
  const bornes = els.filter((e) => e.nature === 'borne' || e.nature === 'priseRenforcee');
  if (dispoCle === '18+') alertes.push('Puissance dispo « 18 kVA et plus » (ancien palier) : choisir 24, 30 ou 36 kVA au relevé, calcul fait sans puissance dispo');
  const monoSeul = !cop && !ric && texte(racc?.valeurs.typeRaccordement) === 'mono' && cible !== 'passageTri';
  const kwReel = (e: ElementReleve) => (monoSeul && kwDe(e) > 7.4 ? 7.4 : kwDe(e));
  const kwBornes = bornes.reduce((s, e) => s + kwReel(e), 0);
  if (monoSeul) {
    for (const bo of bornes.filter((e) => kwDe(e) > 7.4)) {
      alertes.push(`${bo.nom} : ${fr(kwDe(bo))} kW (triphasé) sur un raccordement monophasé, elle sera bridée à 7,4 kW. Viser 7,4 kW, ou passer le raccordement en triphasé (raccordement cible)`);
    }
    for (const td of els.filter((e) => e.nature === 'tdIrveCoffret' && texte(e.valeurs.coffretIrve).includes('-TRI-'))) {
      alertes.push(`${td.nom} : coffret triphasé ${texte(td.valeurs.coffretIrve)} sur un raccordement monophasé`);
    }
  }
  const site = gestionDuSite(els, seg);
  const gestion = !!site.gestion && site.gestion !== 'aucune';
  const grappe = site.gestion === 'gestionnaireGrappe' && !cop && !ric;

  // En-tête (D9 : la zone n'est citée que si elle est saisie). DAP : la ligne Segment dit la source (écart 40)
  const quand = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });
  const libelleSegment = !seg ? 'à renseigner'
    : seg === 'DAP'
      ? `DAP · Droit à la prise, ${source === 'tgbtServicesGeneraux' ? 'sur les services généraux de la copro' : source === 'tableauIndividuel' ? 'sur le compteur du résident' : 'source à relever'}`
      : LIBELLE_SEGMENT[seg];
  const entete = [
    `📋 Brief de chiffrage · ${b.scenarioNom}`,
    `Calculé par le site au clic « Prêt à chiffrer » (${quand}). Les puissances et sections sont à valider avant l'envoi du devis.`,
    '',
    `Segment : ${libelleSegment}`,
    ...(cop || b.nbPlaces ? [`Places de parking : ${b.nbPlaces ?? 'à renseigner'}`] : []),
    ...(b.zone ? [`Zone de déplacement : ${b.zone}`] : []),
  ];

  // Puissance
  const puissance: string[] = ['', '⚡ PUISSANCE'];
  if (racc) {
    puissance.push(`Source : ${libelle('sourceRaccordement', source) || 'à renseigner'} · ${libelle('typeRaccordement', racc.valeurs.typeRaccordement) || 'mono ou tri à renseigner'}${dispo !== null ? ` · puissance dispo ${libelle('puissanceDispo', dispoCle)}` : ''}${pointe !== null ? ` · pointe réelle des communs ${fr(pointe)} kVA` : ''}`);
    if (cible && cible !== 'inchange') puissance.push(`Raccordement cible : ${libelle('raccordementCible', cible)}`);
  }
  if (bornes.length) {
    puissance.push(`Points de charge : ${bornes.length}, ${fr(kwBornes)} kW au total (simultanéité 1, NF C 15-100-7-722 §722.311${gestion ? ', réductible grâce à la gestion de charge' : ''})`);
  }
  if (grappe && kwBornes > PLAFOND_GESTION_KVA) {
    puissance.push(`Gestionnaire de grappe : demande plafonnée à ${PLAFOND_GESTION_KVA} kVA (${COURANT_PLAFOND} A), sections calculées sur cette consigne (décision du 03/11)`);
  }
  let demandee: number | null = null;
  let augmentation: boolean | null = null; // COP sur services généraux (écart 53)
  if (cop) {
    const r = b.nbPlaces ? reserveIrve(b.nbPlaces) : null;
    if (r === null) puissance.push(`Réserve IRVE : ${b.nbPlaces ? 'moins de 10 places, hors barème' : 'nombre de places à renseigner'}`);
    else {
      puissance.push(`Réserve IRVE (barème de l'arrêté du 23/12/2020) : ${fr(r)} kVA pour ${b.nbPlaces} places`);
      if (source === 'pdlDedie') {
        demandee = r;
        puissance.push(`Puissance à demander à Enedis (PDL dédié) : ${fr(r)} kVA, à valider`);
      } else if (source === 'tgbtServicesGeneraux') {
        const p = puissanceCopSg(dispo, pointe, r);
        demandee = p.cible;
        augmentation = p.augmenter;
        puissance.push(...p.lignes);
        if (p.alerte) alertes.push(p.alerte);
      }
    }
    if (b.nbPlaces && b.nbPlaces >= 10) {
      puissance.push(`ADVENIR infra : 50 % plafonné à ${fr(plafondAdvenirInfra(b.nbPlaces), 0)} € HT. Éligibilité selon la date du permis (avant 2017 : complète ; 2017 → 10/03/2021 : réduite ; après : non éligible)`);
    }
    puissance.push('TD IRVE : protection 63 A');
  } else if (ric) {
    puissance.push(source === 'colonneEnedis'
      ? 'Raccordement en aval du Linky de la place (colonne Enedis) : puissance du nouveau point de livraison à demander par le résident'
      : "Raccordement sur l'infra collective CHARGéO : pas de puissance à demander");
  } else if (source === 'pdlDedie') {
    demandee = grappe ? Math.min(kwBornes, PLAFOND_GESTION_KVA) : kwBornes;
    puissance.push(grappe && kwBornes > PLAFOND_GESTION_KVA
      ? `Puissance à demander à Enedis (PDL dédié) : ${fr(demandee)} kVA (gestionnaire de grappe, consigne plafonnée pour ${fr(kwBornes)} kW de bornes), à valider`
      : `Puissance à demander à Enedis (PDL dédié) : ${fr(kwBornes)} kVA (somme des puissances visées), à valider`);
  } else if (dispo !== null && grappe) {
    puissance.push(`Gestionnaire de grappe : la charge des bornes est répartie dans la puissance dispo (${fr(dispo)} kVA)`);
  } else if (dispo !== null && kwBornes > dispo) {
    alertes.push(`Points de charge (${fr(kwBornes)} kW) au-dessus de la puissance dispo (${fr(dispo)} kVA) : gestion de charge ou augmentation de puissance à prévoir`);
  }
  if (demandee !== null && demandee > MONO_MAX_KVA && texte(racc?.valeurs.typeRaccordement) === 'mono') {
    alertes.push(`Branchement monophasé limité à ${MONO_MAX_KVA} kVA chez Enedis : ${fr(demandee)} kVA demandés, passer le raccordement en triphasé`);
  }
  if (demandee !== null && demandee > TARIF_JAUNE_KVA) {
    alertes.push(`> ${TARIF_JAUNE_KVA} kVA (${fr(demandee)} kVA) : tarif jaune, étude spécifique, chiffrage à la main`);
  }
  if (source === 'pdlDedie' || cible === 'passageTri' || cible === 'augmentation' || (cop && demandee !== null && dispo !== null && demandee > dispo)) {
    exclusions.push("Exclusion Enedis : génie civil et travaux Enedis (création ou modification du branchement) non compris, ligne d'exclusion au devis");
  }
  if (ric && source !== 'colonneEnedis') {
    puissance.push(b.infra
      ? `Infra liée : ${b.infra.nom}, artère en ${fr(b.infra.section)} mm² ${b.infra.tri ? 'triphasée' : 'monophasée'}`
      : 'Infra liée : introuvable (🔗 Infrastructure liée vide ou artère non relevée)');
  }

  // Équipements
  const materiel: string[] = ['', '🧰 ÉQUIPEMENTS'];
  for (const e of equipements) {
    const v = (k: string) => libelle(k, e.valeurs[k]);
    let d: string[] = [];
    switch (e.nature) {
      case 'raccordement':
        d = [v('sourceRaccordement'), v('typeRaccordement'), v('puissanceDispo'), v('etatTableau') && `tableau ${v('etatTableau')}`,
          v('raccordementCible') && `cible ${v('raccordementCible')}`, pointe !== null ? `pointe réelle ${fr(pointe)} kVA` : '',
          e.valeurs.terre !== null && e.valeurs.terre !== undefined ? `terre ${fr(Number(e.valeurs.terre))} Ω` : ''];
        break;
      case 'tdIrveCoffret':
        d = [v('coffretIrve'), v('emplacement') && `emplacement : ${v('emplacement')}`];
        break;
      case 'borne':
        d = [v('puissanceVisee'), v('marqueBorne'), v('modeleBorne'), v('supportBorne')];
        break;
      case 'priseRenforcee':
        d = ['3,7 kW', v('marqueBorne'), v('supportBorne')];
        break;
      case 'communication':
        d = [site.gestion && `gestion de charge : ${libelle('gestionCharge', site.gestion)}`, site.mesure && `mesure : ${libelle('mesurePuissance', site.mesure)}`, v('tailleHub'),
          v('connectivite'), v('reseau') && `réseau : ${v('reseau')}`];
        break;
      case 'boiteDerivation':
        d = [`× ${Number(e.valeurs.quantite) > 0 ? fr(Number(e.valeurs.quantite), 0) : '1'}`, `borniers + switch, ${POINTS_PAR_BOITE} points de charge par boîte`];
        break;
      case 'autre':
        d = [e.valeurs.quantite ? `quantité ${fr(Number(e.valeurs.quantite))}` : ''];
        break;
      default:
        d = [];
    }
    materiel.push(`• ${e.nom} : ${d.filter(Boolean).join(' · ') || 'rien de saisi'}`);
  }

  // 1. Circuit et section de départ de chaque cheminement
  const calculs: Calcul[] = cheminements.map((c) => {
    const type = typeDe(c);
    const long = longueurTotale(c.valeurs);
    const forcee = Number(texte(c.valeurs.sectionForcee).replace(',', '.')) || null;
    if (type === 'liaisonData') return { c, type, long, ci: null, forcee: null, section: null, fixe: true, infra: false };
    if (type === 'artere') {
      const ci: Circuit = { tri: true, courant: 63, calibre: 63, sectionMin: 16 };
      const auto = chute(true, long, 63, 16) <= BUDGET_ARTERE ? 16 : 25;
      return { c, type, long, ci, forcee, section: forcee ?? auto, fixe: true, infra: false };
    }
    const dep = els.find((e) => e.id === c.depart);
    const arr = els.find((e) => e.id === c.arrivee);
    // RIC sur l'infra : la dérivation reprend la section de l'artère de l'infra liée (écarts 66 et 70)
    if (ric && dep?.nature === 'raccordement' && source !== 'colonneEnedis') {
      return { c, type, long, ci: null, forcee, section: forcee ?? b.infra?.section ?? null, fixe: true, infra: true };
    }
    let ci: Circuit | null = null;
    if (cop && arr?.nature === 'tdIrveCoffret') ci = { tri: true, courant: 63, calibre: 63, sectionMin: 16 };
    else if (c.arrivee) {
      const a = aval(String(c.arrivee), els, monoSeul);
      if (a.courant > 0) {
        ci = grappe && a.courant > COURANT_PLAFOND
          ? { tri: a.tri, courant: COURANT_PLAFOND, calibre: 63, sectionMin: 16, plafonne: true }
          : circuit(a.courant, a.tri);
      }
    }
    return { c, type, long, ci, forcee, section: forcee ?? (ci ? ci.sectionMin : null), fixe: !!forcee, infra: false };
  });
  const chuteDe = (k: Calcul) => (k.ci && k.section && k.long > 0 ? chute(k.ci.tri, k.long, k.ci.courant, k.section) : null);

  // Tronçons d'alimentation entre le raccordement et chaque point de charge
  const chemin = (borneId: string): Calcul[] => {
    const liste: Calcul[] = [];
    const vus = new Set<string>();
    let id: string | null = borneId;
    while (id && !vus.has(id)) {
      vus.add(id);
      const cour: string = id;
      const amont = calculs.find((k) => k.c.arrivee === cour && k.type !== 'liaisonData');
      if (!amont) break;
      liste.push(amont);
      id = amont.c.depart;
    }
    return liste;
  };
  const cumul = (liste: Calcul[]) => liste.reduce((s, k) => s + (chuteDe(k) ?? 0), 0);

  // 2. Sections augmentées tant que la chute cumulée dépasse 5 % (le tronçon qui chute le plus d'abord)
  for (let tour = 0; tour < 40; tour++) {
    let change = false;
    for (const bo of bornes) {
      const liste = chemin(bo.id);
      if (cumul(liste) <= LIMITE_CUMULEE) continue;
      const candidats = liste.filter((k) => !k.fixe && k.section !== null && sectionSuivante(k.section) !== null)
        .sort((x, y) => (chuteDe(y) ?? 0) - (chuteDe(x) ?? 0));
      const k = candidats[0];
      if (!k || k.section === null) continue;
      k.section = sectionSuivante(k.section);
      change = true;
    }
    if (!change) break;
  }

  // 3. Rendu des cheminements
  const chemins: string[] = ['', '🛤️ CHEMINEMENTS'];
  const totaux: Record<string, Record<string, number>> = { alimentation: {}, artere: {}, liaisonData: {} };
  const percements: Record<string, number> = {};
  for (const k of calculs) {
    const { c, type, long } = k;
    const modes: string[] = [];
    for (const d of DISTANCES) {
      const m = Number(c.valeurs[d]) || 0;
      if (m <= 0) continue;
      modes.push(`${SAISIES[d].libelle.replace(' (m)', '').toLowerCase()} ${fr(m)} m`);
      totaux[type] = totaux[type] || {};
      totaux[type][d] = (totaux[type][d] || 0) + m;
    }
    const percs: string[] = [];
    for (const p of PERCEMENTS) {
      const n = Number(c.valeurs[p]) || 0;
      if (n <= 0) continue;
      percs.push(`${SAISIES[p].libelle.replace('Percements ', '')} × ${fr(n, 0)}`);
      percements[p] = (percements[p] || 0) + n;
    }
    let section = '';
    if (type === 'liaisonData') section = 'câble data';
    else if (k.infra) {
      section = k.forcee ? `${fr(k.forcee)} mm² (forcée)`
        : b.infra ? `${fr(b.infra.section)} mm², section de l'artère de l'infra liée (${b.infra.nom})`
          : "section de l'artère de l'infra : infra liée introuvable, 25 mm² par défaut, à vérifier";
    } else if (!k.ci) section = 'puissance en aval inconnue, section non calculée';
    else if (long <= 0) section = `longueur à renseigner (minimum ${fr(k.ci.sectionMin)} mm² pour ${k.ci.calibre} A)`;
    else if (k.section !== null) {
      const du = chute(k.ci.tri, long, k.ci.courant, k.section);
      const auto = type === 'artere' ? '' : k.forcee ? ` (forcée)` : k.section > k.ci.sectionMin ? ` (minimum ${fr(k.ci.sectionMin)} mm², augmentée pour la chute)` : '';
      const td = k.ci.courant === 63 && k.ci.calibre === 63;
      const circuitTexte = td
        ? `${k.ci.tri ? 'tri' : 'mono'} 63 A, protection du TD`
        : k.ci.plafonne
          ? `${k.ci.tri ? 'tri' : 'mono'} ${COURANT_PLAFOND} A (consigne du gestionnaire, ${k.ci.tri ? PLAFOND_GESTION_KVA : MONO_MAX_KVA} kVA), protection ${k.ci.calibre} A`
          : `${k.ci.tri ? 'tri' : 'mono'} ${fr(k.ci.courant)} A assignés, protection ${k.ci.calibre} A`;
      section = `${fr(k.section)} mm²${auto}, ${circuitTexte}, chute ${fr(du, 2)} %`;
      if (type === 'artere') {
        if (k.forcee) section += ` (section forcée)`;
        if (du > BUDGET_ARTERE) alertes.push(`${c.nom} : chute de ${fr(du, 2)} % en ${fr(k.section)} mm², au-dessus du budget artère de ${BUDGET_ARTERE} %`);
      }
      if (k.forcee && k.forcee < k.ci.sectionMin) alertes.push(`${c.nom} : section forcée ${fr(k.forcee)} mm² sous le minimum de ${fr(k.ci.sectionMin)} mm² pour ${k.ci.calibre} A`);
    }
    chemins.push(`• ${c.nom} (${libelle('typeCheminement', type) || type}) : ${long > 0 ? `${fr(long)} m` : 'longueur à renseigner'}${modes.length ? ` (${modes.join(', ')})` : ''}`);
    if (section) chemins.push(`  Section : ${section}`);
    if (percs.length) chemins.push(`  Percements : ${percs.join(', ')}`);
    if (ric && type !== 'liaisonData' && source !== 'colonneEnedis') {
      const tube = Number(c.valeurs.distTubeApparent) || 0;
      const forfait = tube <= FORFAIT_RIC_TUBE_APPARENT && long - tube <= 0;
      chemins.push(`  Forfait RIC : ${forfait ? `dans le forfait (${FORFAIT_RIC_TUBE_APPARENT} m de tube apparent)` : `dépassement (${fr(long)} m) : devis détaillé, pas de supplément au mètre`}`);
    }
    if (alerteTroisMetres(c, els, seg)) {
      // Au-delà de 40 A, pas de départ au tableau : TD IRVE à côté du TGBT (décision du 04/11, cas 8)
      protections.push(k.ci && k.ci.calibre > DEPART_MAX_A
        ? `Protection en tête : ${nomDe(c.depart)} → ${nomDe(c.arrivee)} fait ${fr(long)} m en ${k.ci.calibre} A. Pas de départ à ce calibre au tableau : TD IRVE à poser à côté du TGBT, à 3 m au plus, protection déportée au TD (NF C 15-100 433.2.1 et 434.2.2.1). Corriger le relevé, la distance passe sur les liaisons TD → bornes`
        : `Protection en tête : ${nomDe(c.depart)} → ${nomDe(c.arrivee)} fait ${fr(long)} m. Au-delà de 3 m, la protection ne peut pas être déportée au coffret (NF C 15-100 433.2.1 et 434.2.2.1) : disjoncteur au départ du tableau (ligne DEPART-TGBT en Raccordement)`);
    }
  }
  if (!calculs.length) chemins.push('Aucun cheminement');
  if (ric && source !== 'colonneEnedis' && !b.infra && calculs.some((k) => k.infra && !k.forcee)) {
    alertes.push("RIC : infra liée introuvable (🔗 Infrastructure liée ou artère de l'infra), dérivation comptée en 25 mm² par défaut : vérifier la section de l'artère");
  }

  // Chute cumulée du raccordement jusqu'à chaque point de charge
  for (const bo of bornes) {
    const liste = chemin(bo.id);
    const total = cumul(liste);
    const manque = liste.some((k) => chuteDe(k) === null);
    if (total > 0) chemins.push(`Chute cumulée jusqu'à ${bo.nom} : ${fr(total, 2)} %${manque ? ' (un tronçon sans calcul)' : ''}`);
    if (total > LIMITE_CUMULEE) alertes.push(`Chute cumulée de ${fr(total, 2)} % jusqu'à ${bo.nom}, au-dessus de ${LIMITE_CUMULEE} % même en section maximale ou forcée`);
  }
  if (cop) {
    const total = calculs.filter((k) => k.type === 'artere' || (k.ci && k.ci.courant === 63)).reduce((s, k) => s + (chuteDe(k) ?? 0), 0);
    if (total > 0) chemins.push(`Chute raccordement → fin d'artère : ${fr(total, 2)} % (reste ${fr(Math.max(0, LIMITE_CUMULEE - total), 2)} % pour les dérivations)`);
    if (total > LIMITE_CUMULEE) alertes.push(`Chute raccordement → fin d'artère de ${fr(total, 2)} %, au-dessus de ${LIMITE_CUMULEE} %`);
  }

  // 4. Lignes à saisir (table de correspondance du 01/11), dans l'ordre du modèle
  const { lignes, aFaire, retirer } = lignesDevis(b, calculs, alertes);
  const priseSeule = els.some((e) => e.nature === 'priseRenforcee') && !els.some((e) => e.nature === 'borne');
  const choix = modelesDuScenario(seg, source, b.typeClient ?? null, priseSeule);
  alertes.push(...choix.alertes);

  // Consignes de saisie de chaque devis (étape 7, 02/11) : nom, TVA, crochets de l'en-tête, prime, contrôle final
  const groupes = new Map<string, { n: number; kw: number; gamme: string }>();
  for (const bo of els.filter((e) => e.nature === 'borne')) {
    const gamme = (ligneBorne(bo.valeurs.modeleBorne)?.gamme ?? libelle('marqueBorne', bo.valeurs.marqueBorne))
      .replace(/\s\d[\d,]*(\s(à|×)\s[\d,]+)*\skW$/, '');
    const kw = kwReel(bo);
    const cle = `${gamme}|${kw}`;
    const g = groupes.get(cle) ?? { n: 0, kw, gamme };
    g.n += 1;
    groupes.set(cle, g);
  }
  const parts = Array.from(groupes.values());
  const nbPrises = els.filter((e) => e.nature === 'priseRenforcee').length;
  const nbBornes = parts.reduce((s, g) => s + g.n, 0);
  const materielCourt = cop ? `Infra ${b.nbPlaces ?? '?'} places` : [
    ...parts.map((g) => (g.n > 1 ? `${g.n} bornes ${fr(g.kw)} kW` : `Borne ${fr(g.kw)} kW`)),
    ...(nbPrises ? [nbPrises > 1 ? `${nbPrises} prises renforcées` : 'Prise renforcée'] : []),
  ].join(' + ') || 'matériel à préciser';
  const pointsDeCharge = els.filter((e) => e.nature === 'borne').reduce((n, bo) => n + (ligneBorne(bo.valeurs.modeleBorne)?.points ?? 1), 0) + nbPrises;
  const ctxSaisie: ContexteSaisie = {
    ficheNom: b.ficheNom ?? null,
    scenarioNom: b.scenarioNom,
    segment: seg,
    source,
    tri: texte(racc?.valeurs.typeRaccordement) === 'tri',
    materiel: materielCourt,
    nombreBornes: nbBornes,
    marquePuissance: parts.map((g) => `${g.gamme}, ${fr(g.kw)} kW`).join(' et '),
    points: pointsDeCharge,
    puissanceKva: demandee,
    dateVisite: b.dateVisite ?? null,
    plafondInfra: cop && b.nbPlaces && b.nbPlaces >= 10 ? plafondAdvenirInfra(b.nbPlaces) : null,
    facade: cheminements.some((c) => texte(c.valeurs.passageFacade) === 'oui'),
    elements: els,
    augmentation,
    datePermis: b.datePermis ?? null,
    lignes: lignes.map((l) => ({ zone: l.zone, ref: l.ref, qte: l.qte })),
    prix: b.prix ?? null,
  };

  const saisie: string[] = ['', '🧾 À SAISIR DANS COSTRUCTOR'];
  saisie.push("Dans l'ordre du modèle, sous-section indiquée au bout de chaque ligne. ✔ garder · ✏️ changer la quantité · 🔁 remplacer la section du câble ou le percement · ✖ retirer (modèle complet : ce qui ne sert pas s'enlève, regroupé sur une ligne par sous-section) · ➕ ajouter, l'exception. Les textes du modèle restent, sauf ceux marqués ✖ (coupure, réserve, augmentation, sans délestage, tranchée, façade : seulement si le relevé les demande).");
  if (!choix.devis.length) {
    saisie.push('', 'Modèle : à choisir (voir les alertes). Lignes du relevé :');
    saisie.push(...lignes.map((l) => `• ${NOM_ZONE[l.zone]} : ${l.ref}${l.qte === null ? ' (texte)' : ` × ${fr(l.qte)}${l.unite ? ` ${l.unite}` : ''}`}${l.detail ? ` · ${l.detail}` : ''}`));
  }
  choix.devis.forEach((d, i) => {
    const titre = choix.devis.length > 1 ? `DEVIS ${i + 1}` : 'DEVIS';
    saisie.push('', `━━ ${titre} : Nouveau devis ▾ › Créer à partir d'un modèle › « ${d.modele.nom} » (TVA ${d.modele.tva}${d.role ? `, ${d.role}` : ''}) : ${lienModele(d.modele)}`);
    saisie.push(...avantSaisie(d.modele, ctxSaisie));
    if (d.modele.cle === 'AMO_PDL') {
      const amo: LigneDevis[] = [
        { zone: 'prestations', pdc: 0, ref: 'ADMIN-CREATION-PDL', qte: 1, unite: '' },
        { zone: 'prestations', pdc: 0, ref: 'JUR-CONSUEL-PDL-ENEDIS', qte: null, unite: 'texte' },
        { zone: 'logistique', pdc: 0, ref: `LOG-DEP-${b.zone && ['Z1', 'Z2', 'Z3'].includes(b.zone) ? b.zone : 'Z1'}`, qte: 1, unite: '' },
      ];
      saisie.push(...rendreDevis(PLANS.AMO_PDL, amo));
      saisie.push(...avantFinaliser(d.modele, ctxSaisie));
      return;
    }
    const nbPoints = bornes.length;
    if (PLANS[d.modele.cle].some((s) => s.parPoint) && nbPoints > 1) {
      saisie.push(`${nbPoints} points de recharge : le modèle a une section « POINT DE RECHARGE N°1 », une section par point ci-dessous (dupliquer la N°1, puis renuméroter les sections suivantes).`);
    }
    saisie.push(...rendreDevis(PLANS[d.modele.cle], lignes, retirer, nbPoints));
    saisie.push(...avantFinaliser(d.modele, ctxSaisie));
  });
  if (aFaire.length) saisie.push('', '⏳ À FAIRE À LA MAIN', ...aFaire.map((a) => `• ${a}`));

  // Totaux par mode de pose et percements
  const recap: string[] = ['', '📏 TOTAUX PAR MODE DE POSE'];
  for (const type of ['alimentation', 'artere', 'liaisonData']) {
    const t = totaux[type] || {};
    const ls = DISTANCES.filter((k) => (t[k] || 0) > 0).map((k) => `${SAISIES[k].libelle.replace(' (m)', '').toLowerCase()} ${fr(t[k])} m`);
    if (!ls.length) continue;
    const somme = Object.values(t).reduce((s, m) => s + m, 0);
    recap.push(`• ${libelle('typeCheminement', type)} : ${ls.join(', ')} (total ${fr(somme)} m)`);
  }
  if (recap.length === 2) recap.push('Aucune longueur saisie');
  const totalPercs = PERCEMENTS.filter((k) => (percements[k] || 0) > 0).map((k) => `${SAISIES[k].libelle.replace('Percements ', '')} × ${fr(percements[k], 0)}`);
  recap.push(`Percements : ${totalPercs.length ? totalPercs.join(', ') : 'aucun'}`);

  // Protection, exclusions, rappels de norme, alertes, notes
  const fin: string[] = ['', '🛡️ PROTECTION ET EXCLUSIONS'];
  fin.push(...protections, ...exclusions);
  if (!protections.length && !cop && !ric && racc && calculs.some((k) => els.find((e) => e.id === k.c.depart)?.nature === 'raccordement')) {
    fin.push('Raccordement → coffret de 3 m ou moins : protection déportée au coffret admise (NF C 15-100 433.2.1 et 434.2.2.1 : sans dérivation, risque de court-circuit réduit, loin de matériaux combustibles)');
  }
  if (fin.length === 2) fin.push('Rien à signaler');
  if (bornes.length) {
    fin.push('', '📘 RAPPELS NORME (NF C 15-100-7-722)',
      '• Circuit spécialisé par point de charge (§722.314.101)',
      '• DDR 30 mA individuel par point de charge (§722.411) : type A ou F en mono, type B en tri, ou A/F + détection 6 mA DC (IEC 62955)');
  }
  fin.push('', '⚠️ ALERTES', ...(alertes.length ? alertes.map((a) => `• ${a}`) : ['Aucune']));
  const notes = els.filter((e) => texte(e.valeurs.notesCheminement).trim()).map((e) => `• ${e.nom} : ${texte(e.valeurs.notesCheminement).trim()}`);
  if (notes.length) fin.push('', '📝 NOTES DU RELEVÉ', ...notes);
  fin.push('', `Méthode : NF C 15-100 art. 525, u = b (ρ1 L / S cos φ + λ L sin φ) IB, ρ1 cuivre 0,0225 Ω·mm²/m (service normal), λ 0,08 mΩ/m, cos φ = 1 (charge VE), IB = courant assigné, b = 2 mono / 1 tri, rapportée à 230 V. Limite ${LIMITE_CUMULEE} % cumulée depuis le raccordement relevé (tableau 52W, autres usages, réseau BT public), chute en amont non comptée. Protections et sections minimales : guide UTE C 15-722 tableau 2. Artère COP : budget CHARGéO de ${BUDGET_ARTERE} %. Gestionnaire de grappe : consigne de ${PLAFOND_GESTION_KVA} kVA (${COURANT_PLAFOND} A, protection 63 A).`);

  const detail = ['', '———— DÉTAIL DES CALCULS ————'];
  return {
    texte: [...entete, ...saisie, ...detail, ...puissance, ...materiel, ...chemins, ...recap, ...fin].join('\n'),
    alertes,
    lignes,
    aFaire,
  };
}

// Lignes « référence × quantité » rangées par zone du modèle, à partir des éléments et des sections calculées. Table de
// correspondance du 01/11 : R (raccordement), C (cheminement), T (TD IRVE / coffret), BD, B (borne), P (prise),
// K (communication), A (autre), G (prestations). pdc : rang du point de recharge (0 = N°1). retirer : lignes du modèle à
// enlever, avec la raison (par référence, ou par « zone#pdc#famille » pour une liaison couverte par le coffret, 05/11).
function lignesDevis(b: EntreeBrief, calculs: Calcul[], alertes: string[]): { lignes: LigneDevis[]; aFaire: string[]; retirer: Record<string, string> } {
  const els = b.elements;
  const seg = b.segment;
  const cop = seg === 'COP';
  const ric = seg === 'RIC';
  const lignes: LigneDevis[] = [];
  const aFaire: string[] = [];
  const retirer: Record<string, string> = {};
  const ajouter = (zone: Zone, ref: string, qte: number, unite = '', detail?: string, pdc = 0) => {
    if (!(qte > 0)) return;
    lignes.push({ zone, pdc, ref, qte, unite, detail });
  };
  // Liaison entièrement couverte par le câble compris dans le coffret (T5) : la ligne du modèle de la même famille se
  // retire, avec la raison (passe 3, cas 11, 05/11)
  const couvert = (zone: Zone, pdc: number, ref: string, raison: string) => { retirer[`${zone}#${pdc}#${famille(ref)}`] = raison; };
  const texteFixe = (zone: Zone, ref: string, detail?: string, pdc = 0) => {
    if (!lignes.some((l) => l.zone === zone && l.ref === ref && l.pdc === pdc)) lignes.push({ zone, pdc, ref, qte: null, unite: 'texte', detail });
  };
  const racc = els.find((e) => e.nature === 'raccordement');
  const source = texte(racc?.valeurs.sourceRaccordement);
  const triRacc = texte(racc?.valeurs.typeRaccordement) === 'tri';
  const pdl = source === 'pdlDedie';
  const sg = source === 'tgbtServicesGeneraux';
  const coms = els.filter((e) => e.nature === 'communication');
  const connectivite = texte(coms[0]?.valeurs.connectivite);
  const tailleHub = coms.map((e) => texte(e.valeurs.tailleHub)).find(Boolean) || '';
  const rang = rangsPoints(els);
  const site = gestionDuSite(els, seg);
  const parId = new Map<string, ElementReleve>(els.map((e) => [e.id, e]));

  // COP sur services généraux : augmentation de puissance si la pointe réelle + la réserve dépassent l'abonnement (écart 52)
  const reserve = cop && b.nbPlaces ? reserveIrve(b.nbPlaces) : null;
  const augmenterCop = cop && sg && reserve !== null
    && puissanceCopSg(DISPO_KVA[texte(racc?.valeurs.puissanceDispo)] ?? null, pointeDe(racc), reserve).augmenter === true;

  // Raccordement (R1 à R10)
  if (racc) {
    // Coupure : TGBT des services généraux ou tableau du logement (modèles V2 du 04/11)
    if (sg) texteFixe('raccordement', 'JUR-COUPURE-TGBT');
    else if (source === 'tableauIndividuel' && !ric) texteFixe('raccordement', 'JUR-COUPURE-TABLEAU');
    // Comptage des services généraux : sous-section Gestionnaire de charge des V2 (R3, D5, D6)
    if (sg && (cop || seg === 'PAR')) ajouter('pilotage', `INFRA-COP-COMPTAGE-${triRacc ? 'TRI' : 'MONO'}`, 1);
    // PDL dédié : raccordement du coffret de comptage Enedis au TD (V2 du 04/11)
    if (pdl) ajouter('raccordement', triRacc ? 'LIA-PDL-TRI-4X16' : 'LIA-PDL-MONO-2X16', 1, '', 'du coffret de comptage Enedis au TD IRVE');
    if (source === 'colonneEnedis') texteFixe('raccordement', 'INFO-RACC-LINKY-ENEDIS'); // R6, D13
    const cible = texte(racc.valeurs.raccordementCible);
    if ((cible && cible !== 'inchange') || augmenterCop) { // R7
      ajouter('raccordement', 'ADMIN-AUGM-PDL', 1, '', augmenterCop ? 'pointe réelle + réserve IRVE au-dessus de l\'abonnement' : undefined);
      texteFixe('raccordement', 'JUR-AUGM-PUISSANCE');
    }
    const etat = texte(racc.valeurs.etatTableau);
    if (etat === 'aRemanier' || etat === 'aRemplacer') { // R8
      texteFixe('raccordement', 'JUR-RESERVE-EXISTANT');
      aFaire.push(`Tableau ${etat === 'aRemplacer' ? 'à remplacer' : 'à remanier'} : remise à niveau à chiffrer à la main`);
    }
    const terre = racc.valeurs.terre;
    if (terre !== null && terre !== undefined && terre !== '' && Number(terre) > 100) { // R9, R10
      ajouter('raccordement', 'TERRE-RENF', 1, '', `terre ${fr(Number(terre))} Ω`);
      aFaire.push('Terre > 100 Ω : TERRE-RENF si une prise de terre existe, sinon TERRE-PIQ à la place');
    }
  }

  // Protection au départ du tableau quand la liaison Raccordement → coffret dépasse 3 m (écarts 32, 43, 65). Au-delà de
  // 40 A, pas de départ : le TD IRVE se pose à côté du TGBT (décision du 04/11, 7 h 41, cas 8)
  if (!cop && !ric) {
    for (const k of calculs) {
      if (k.type !== 'alimentation' || !alerteTroisMetres(k.c, els, seg)) continue;
      const tri = k.ci ? k.ci.tri : triRacc;
      if (k.ci && k.ci.calibre > DEPART_MAX_A) {
        alertes.push(`${k.c.nom} : ${fr(k.long)} m protégés en ${k.ci.calibre} A, pas de départ à ce calibre au tableau. Poser le TD IRVE à côté du TGBT (3 m au plus, protection déportée au TD), puis corriger le relevé : la distance passe sur les liaisons TD → bornes`);
      } else ajouter('raccordement', `DEPART-TGBT-${tri ? 'TRI' : 'MONO'}-40`, 1, '', `${k.c.nom} : ${fr(k.long)} m, plus de 3 m, protection au départ du tableau`);
    }
  }

  // Cheminement (C1 à C13). Tranchée et façade : un texte dans chaque cheminement concerné (V2 du 04/11)
  const textesPose = new Map<string, { zone: Zone; pdc: number; ref: string }>();
  const marquer = (ref: string, zone: Zone, pdc: number) => {
    if (zone !== 'communication') textesPose.set(`${ref}|${zone}|${pdc}`, { zone, pdc, ref });
  };
  for (const k of calculs) {
    const { c, type, long } = k;
    if (long <= 0) continue;
    const dep = c.depart ? parId.get(c.depart) : undefined;
    const arr = c.arrivee ? parId.get(c.arrivee) : undefined;
    const versCom = type === 'liaisonData' && (dep?.nature === 'communication' || arr?.nature === 'communication');
    const zone: Zone = versCom ? 'communication'
      : type !== 'artere' && (arr?.nature === 'tdIrveCoffret' || dep?.nature === 'raccordement') ? 'chemAmont' : 'chemAval';
    const pdc = zone === 'chemAval' && c.arrivee ? rang.get(String(c.arrivee)) ?? 0 : 0;
    const poserLigne = (ref: string, m: number, unite: string, detail?: string) => ajouter(zone, ref, m, unite, detail, pdc);
    if (texte(c.valeurs.passageFacade) === 'oui') marquer('JUR-AUTORISATION-FACADE', zone, pdc);
    if (type === 'liaisonData') { // C10 à C12
      const amont = dep?.nature === 'raccordement' && arr?.nature === 'tdIrveCoffret';
      const versBorne = dep?.nature === 'tdIrveCoffret' && arr?.nature === 'borne';
      if (amont && pdl) continue; // écart 58
      const mesure = amont ? site.mesure : versBorne && site.mesure === 'ticLinky' ? 'ticLinky' : '';
      // Liaison vers le routeur : LIA-ROUTEUR (data RJ45 PoE sous tube apparent, au mètre)
      const ref = versCom ? 'LIA-ROUTEUR' : mesure === 'compteurModbus' ? 'LIA-DATA-MOD' : mesure === 'ticLinky' ? 'LIA-DATA-TIC' : 'LIA-DATA-RJ45';
      const inclus = amont && ref === 'LIA-DATA-TIC' ? inclusDans(arr).data : 0;
      const enTranchee = Number(c.valeurs.distTranchee) || 0;
      const horsTranchee = Math.max(0, long - enTranchee - inclus);
      const trancheeRestante = Math.max(0, enTranchee - Math.max(0, inclus - (long - enTranchee)));
      const note = inclus ? ` (${inclus} m compris dans ${texte(arr?.valeurs.coffretIrve)})` : '';
      if (inclus > 0 && horsTranchee <= 0 && trancheeRestante <= 0) {
        couvert(zone, pdc, ref, `${c.nom} : ${fr(long)} m compris dans les ${inclus} m de ${texte(arr?.valeurs.coffretIrve)}`);
      }
      poserLigne(ref, metres(horsTranchee), 'ml', `${c.nom}${note}`);
      if (trancheeRestante > 0) {
        marquer('INFO-TRANCHEE-TERRASSIER', zone, pdc);
        if (ref === 'LIA-DATA-RJ45' || ref === 'LIA-ROUTEUR') poserLigne('LIA-ENT-RJ45', metres(trancheeRestante), 'ml', `${c.nom} (en tranchée)`);
        else poserLigne(ref, metres(trancheeRestante), 'ml', `${c.nom} (en tranchée)`);
      }
    } else {
      // Section : calculée (S1), forcée (S2), de l'artère (S4) ; 3G en mono, 5G en tri (S5). RIC sur l'infra : section de
      // l'artère de l'infra, phases du raccordement du résident, 5G seulement si l'artère est triphasée (écarts 66 et 70)
      const triCable = k.infra ? (triRacc && (b.infra ? b.infra.tri : true))
        : type === 'artere' || (cop && arr?.nature === 'tdIrveCoffret') ? triRacc : (k.ci ? k.ci.tri : triRacc);
      let s = k.section;
      let noteSection = '';
      if (cop && arr?.nature === 'tdIrveCoffret' && s !== null) {
        const artere = calculs.find((x) => x.type === 'artere' && x.c.depart === arr.id);
        if (artere?.section && artere.section > s) s = artere.section;
      }
      if (k.infra && s === null) { s = 25; noteSection = " (infra liée introuvable : 25 mm² par défaut, à vérifier)"; }
      else if (k.infra && !k.forcee && b.infra) noteSection = ` (section de l'artère de ${b.infra.nom})`;
      if (s === null) {
        aFaire.push(`${c.nom} : section non calculée (puissance en aval inconnue), liaison à choisir à la main`);
      } else {
        const code = `${triCable ? '5G' : '3G'}${String(s)}`;
        const poser = (famille: string, m: number, detail: string) => {
          const ref = `${famille}-${code}`;
          if (CABLES[famille]?.includes(code)) poserLigne(ref, metres(m), 'ml', detail);
          else aFaire.push(`${detail} : ${ref} × ${metres(m)} ml n'existe pas en bibliothèque${code === '3G35' ? ' (pas de 3G35 : passer en triphasé, D14)' : ''}`);
        };
        if (k.infra) {
          poser('LIA-DERIV', long, `${c.nom}${noteSection}`); // C5
        } else {
          const poses = type === 'artere' ? POSE_ARTERE : POSE_ALIMENTATION;
          const inclus = type === 'alimentation' && dep?.nature === 'raccordement' ? inclusDans(arr).puissance : 0;
          let reste = inclus;
          for (const d of DISTANCES) {
            let m = Number(c.valeurs[d]) || 0;
            if (m <= 0) continue;
            let pris = 0;
            if (reste > 0) { pris = Math.min(m, reste); m -= pris; reste -= pris; }
            if (m <= 0) {
              // Longueur entièrement dans le câble du coffret (T5) : la ligne du modèle se retire, avec la raison (05/11)
              if (poses[d]) couvert(zone, pdc, `${poses[d]}-${code}`, `${c.nom} : ${fr(pris)} m compris dans les ${inclus} m de ${texte(arr?.valeurs.coffretIrve)}`);
              continue;
            }
            const famille = poses[d];
            const mode = SAISIES[d].libelle.replace(' (m)', '').toLowerCase();
            if (!famille) { aFaire.push(`${c.nom} : ${mode} ${fr(m)} m en artère, pas d'ouvrage d'artère pour ce mode de pose`); continue; }
            poser(famille, m, `${c.nom}, ${mode}${inclus ? ` (${inclus} m déjà compris dans ${texte(arr?.valeurs.coffretIrve)})` : ''}`);
            if (d === 'distTranchee') marquer('INFO-TRANCHEE-TERRASSIER', zone, pdc);
            if (type === 'artere' && d === 'distCheminCables') poserLigne('LIA-DATA-RJ45', metres(m), 'ml', `${c.nom}, câble data dans le chemin de câbles (D16)`);
          }
        }
        if (ric && source !== 'colonneEnedis' && connectivite === 'switchBoiteDerivation') {
          poserLigne('LIA-DATA-RJ45', metres(long), 'ml', `${c.nom} (data, avec l'alimentation)`);
        }
      }
      for (const p of PERCEMENTS) {
        const n = Number(c.valeurs[p]) || 0;
        if (n > 0) poserLigne(`${PERCEMENT_REF[p]}${(s ?? 0) >= 16 ? '-40' : ''}`, Math.ceil(n), '', c.nom);
      }
      continue;
    }
    for (const p of PERCEMENTS) {
      const n = Number(c.valeurs[p]) || 0;
      if (n > 0) poserLigne(PERCEMENT_REF[p], Math.ceil(n), '', c.nom);
    }
  }
  // Liaisons data de la mesure qui manquent au relevé : longueur de l'alimentation du même tronçon (écarts 16, 48, 74)
  const aUneData = (d: string | null, a: string | null) => calculs.some((x) => x.type === 'liaisonData' && x.c.depart === d && x.c.arrivee === a);
  for (const k of calculs) {
    if (k.type !== 'alimentation' || k.long <= 0 || k.infra) continue;
    const dep = k.c.depart ? parId.get(k.c.depart) : undefined;
    const arr = k.c.arrivee ? parId.get(k.c.arrivee) : undefined;
    const amont = dep?.nature === 'raccordement' && arr?.nature === 'tdIrveCoffret' && !!site.mesure && !pdl;
    const versBorne = dep?.nature === 'tdIrveCoffret' && arr?.nature === 'borne' && site.mesure === 'ticLinky';
    if ((!amont && !versBorne) || aUneData(k.c.depart, k.c.arrivee)) continue;
    const ref = amont && site.mesure === 'compteurModbus' ? 'LIA-DATA-MOD' : 'LIA-DATA-TIC';
    const inclus = amont && ref === 'LIA-DATA-TIC' ? inclusDans(arr).data : 0;
    const zone: Zone = amont ? 'chemAmont' : 'chemAval';
    const pdc = zone === 'chemAval' && k.c.arrivee ? rang.get(String(k.c.arrivee)) ?? 0 : 0;
    if (inclus > 0 && k.long - inclus <= 0) {
      couvert(zone, pdc, ref, `${nomLien(dep?.nom ?? null, arr?.nom ?? null, 'liaisonData')} : ${fr(k.long)} m compris dans les ${inclus} m de ${texte(arr?.valeurs.coffretIrve)}`);
    }
    ajouter(zone, ref, metres(Math.max(0, k.long - inclus)), 'ml', `${nomLien(dep?.nom ?? null, arr?.nom ?? null, 'liaisonData')} : longueur de l'alimentation${inclus ? `, ${inclus} m compris dans ${texte(arr?.valeurs.coffretIrve)}` : ''} (liaison data absente du relevé)`, pdc);
  }
  for (const t of Array.from(textesPose.values())) texteFixe(t.zone, t.ref, undefined, t.pdc);

  // TD IRVE / coffret (T1 à T10)
  const points = els.filter((e) => e.nature === 'borne').reduce((n, bo) => n + (ligneBorne(bo.valeurs.modeleBorne)?.points ?? 1), 0)
    + els.filter((e) => e.nature === 'priseRenforcee').length;
  const nbBoites = nombreBoites(els);
  const tds = els.filter((e) => e.nature === 'tdIrveCoffret');
  const mesure = site.mesure;
  // TD 2D22 / 3D22 : HUB 10 et switch inclus, pas de PILOTAGE en plus (règle validée)
  if (site.gestion === 'gestionnaireGrappe' && !ric && !tds.some((td) => estCoffretTd(td.valeurs.coffretIrve))) {
    const ptsHub = cop ? nbBoites * POINTS_PAR_BOITE : points;
    const suggere = hubSuggere(ptsHub);
    const hub = tailleHub || suggere;
    ajouter('pilotage', `INFRA-COP-PILOTAGE-${hub}`, 1, '', tailleHub ? undefined : `HUB présélectionné pour ${ptsHub} points de charge`);
    if (tailleHub && Number(tailleHub) < Number(suggere)) {
      alertes.push(`HUB ${tailleHub} pour ${ptsHub} points de charge : HUB ${suggere} attendu (jusqu'à 10 → 10, de 11 à 20 → 20, au-delà → 150)`);
    }
  }
  if (site.gestion === 'aucune') texteFixe('td', 'JUR-PUISSANCE-SANS-DELESTAGE'); // T6
  for (const td of tds) {
    const ref = texte(td.valeurs.coffretIrve);
    if (cop) ajouter('td', `INFRA-COP-TETE-${triRacc ? 'TRI' : 'MONO'}`, 1); // T7
    else if (ref) ajouter('td', ref, 1); // T1, T2
    else aFaire.push(`${td.nom} : référence du coffret à choisir`);
    if (ref.startsWith('COFF-')) { // T3, T4 (D1)
      if (mesure === 'compteurModbus' && !ref.endsWith('-MOD') && ref !== 'COFF-MONO-3K') alertes.push(`${td.nom} : compteur Modbus mais coffret ${ref} sans -MOD`);
      if (mesure === 'ticLinky' && ref.endsWith('-MOD')) alertes.push(`${td.nom} : mesure TIC Linky mais coffret ${ref} : prendre le coffret simple (D1)`);
    }
    if (pdl && td === tds[0] && calculs.some((x) => x.type === 'liaisonData' && x.c.arrivee === td.id && parId.get(String(x.c.depart))?.nature === 'raccordement')) {
      alertes.push('PDL dédié, ni compteur ni comptage (D5, D6) : la liaison data Raccordement → TD est à archiver dans l\'appli (elle n\'est pas comptée)');
    }
    if (seg === 'PAR' && sg && !estCoffretTd(ref) && !ref.endsWith('-MOD')) alertes.push(`${td.nom} : PAR sur services généraux, coffret -MOD (compteur Modbus) attendu (D6)`);
    if (estCoffretTd(ref)) {
      const departs = ref.includes('3D22') ? 3 : 2;
      if (points < departs) alertes.push(`${td.nom} : ${ref} prévu pour ${departs} points de charge, ${points} au relevé. ${points <= 1 ? 'Pour une seule borne, un coffret COFF suffit' : `Prendre le TD ${points} points`}`);
      if (points > departs) alertes.push(`${td.nom} : ${points} points de charge pour ${departs} départs du ${ref} : un TD ou un coffret de plus`);
    }
  }
  if (estCoffretTd(els.find((e) => e.nature === 'tdIrveCoffret')?.valeurs.coffretIrve) && seg && !['PAR', 'FLT', 'TER'].includes(seg)) {
    alertes.push(`TD de borne partagée en ${seg} : proposé en PAR, FLT et TER seulement (D15)`);
  }
  // DAP sur services généraux : sous-compteur MID pour refacturer la copropriété (le modèle hors SG ne l'a pas)
  if (seg === 'DAP' && sg) ajouter('td', 'MID-SOUS-COMPTAGE', 1);

  // Boîte de dérivation (BD1) : un seul élément avec sa quantité (écart 46)
  ajouter('boite', 'INFRA-COP-BOITE', nbBoites);

  // Borne (B1 à B17) : une mise en service par point de charge (B15), dans la section de sa borne
  let wittyPlus = 0;
  const miseEnService = new Map<number, number>();
  const supervise = seg === 'PAR' || seg === 'FLT' || seg === 'TER' || (ric && source !== 'colonneEnedis');
  for (const bo of els.filter((e) => e.nature === 'borne')) {
    const pdc = rang.get(bo.id) ?? 0;
    const ligne = ligneBorne(bo.valeurs.modeleBorne);
    if (!ligne) {
      aFaire.push(`${bo.nom} : modèle de borne à choisir`);
      miseEnService.set(pdc, (miseEnService.get(pdc) ?? 0) + 1);
      continue;
    }
    if (!modeleCoherent(bo.valeurs)) alertes.push(`${bo.nom} : ${ligne.ref} ne correspond pas à la marque ou à la puissance saisie`);
    ajouter('borne', ligne.ref, 1, '', undefined, pdc);
    if (ligne.ref === 'BORNE-HAG-WPLUS-22') wittyPlus += 1;
    if (texte(bo.valeurs.supportBorne) === 'surPied') {
      if (ligne.pied) ajouter('borne', ligne.pied, 1, '', undefined, pdc);
      else aFaire.push(`${bo.nom} : pied ${libelle('marqueBorne', bo.valeurs.marqueBorne) || ''} à créer en bibliothèque (seuls les pieds Peblar existent, D4)`);
    }
    miseEnService.set(pdc, (miseEnService.get(pdc) ?? 0) + ligne.points);
  }
  for (const [pdc, n] of Array.from(miseEnService)) ajouter('borne', supervise ? 'SERV-SETUP-PDC' : 'SERV-SETUP-PDC-LOCAL', n, '', undefined, pdc);
  for (const a of els.filter((e) => e.nature === 'autre' && estDepose(e.nom))) { // B16
    ajouter('borne', 'DEPOSE-BORNE', Number(a.valeurs.quantite) || 1, '', a.nom);
  }

  // Prise renforcée (P1 à P5)
  for (const p of els.filter((e) => e.nature === 'priseRenforcee')) {
    const ref = PRISES[texte(p.valeurs.marqueBorne)];
    if (ref) ajouter('prise', ref, 1, '', undefined, rang.get(p.id) ?? 0);
    else aFaire.push(`${p.nom} : marque de prise à choisir (Legrand, Hager ou Schneider)`);
  }

  // Communication (K1 à K7)
  for (const com of coms) {
    if (texte(com.valeurs.connectivite) === 'modemDeporte') ajouter('communication', 'INFRA-COP-ROUTEUR', 1); // K2
    if (texte(com.valeurs.reseau) === 'cableRequis' && !els.some((e) => e.nature === 'cheminement' && typeDe(e) === 'liaisonData' && e.depart === com.id)) {
      alertes.push(`${com.nom} : câble requis mais aucune liaison data saisie (K6)`);
    }
    if (texte(com.valeurs.reseau) === 'wifi') aFaire.push(`${com.nom} : box ou WiFi du client, portée jusqu'à la borne à vérifier (aucune ligne au devis)`); // T4
  }
  // SIM 4G de la borne : carte 4G en option sur la Witty Plus (écart 31)
  if (wittyPlus > 0 && connectivite === 'simIntegree') ajouter('communication', 'OPT-4G-HAG', wittyPlus); // K1
  const supervision: Partial<Record<Segment, string>> = {
    PAR: 'SERV-SETUP-SUPERVISION-REFACT', FLT: 'SERV-SETUP-SUPERVISION', TER: 'SERV-SETUP-SUPERVISION-REFACT', COP: 'SERV-SETUP-SUPERVISION',
  };
  if (seg && supervision[seg]) ajouter('communication', supervision[seg] as string, 1); // K7, D8

  // Autre (A1), hors dépose (rangée en Borne)
  for (const a of els.filter((e) => e.nature === 'autre' && !estDepose(e.nom))) {
    const n = normal(a.nom);
    const qte = Number(a.valeurs.quantite) || 1;
    const ref = n.includes('arceau') ? 'OPT-ARCEAU-PROT'
      : n.includes('badge') && (n.includes('itinerance') || n.includes('emsp')) ? 'OPT-BADGE-EMSP'
        : n.includes('badge') && n.includes('nominati') ? 'SERV-BADGE'
          : n.includes('badge') ? 'OPT-BADGE-LOCAL' : '';
    if (ref) ajouter('autre', ref, qte, ref.startsWith('OPT-BADGE') ? 'u' : '', a.nom);
    else aFaire.push(`${a.nom} (× ${fr(qte)}) : option à choisir à la main`);
  }

  // Prestations (G1 à G5)
  if (seg === 'FLT' || seg === 'TER') ajouter('prestations', 'ADMIN-CONSUEL-VERT', 1);
  else if (seg === 'RES' || seg === 'DAP' || seg === 'PAR' || seg === 'COP' || (ric && source === 'colonneEnedis')) ajouter('prestations', 'ADMIN-CONSUEL', 1);
  if (seg === 'DAP') ajouter('prestations', 'ADMIN-DAP', 1);
  if (cop) { ajouter('prestations', 'SERV-ETUDE-COP', 1); ajouter('prestations', 'ADMIN-CONTROLE', 1); }
  const advenir = cop ? 'INFO-ADVENIR-INFRA' : seg === 'PAR' ? 'INFO-ADVENIR-PARTAGE' : ric || (seg === 'DAP' && sg) ? 'INFO-ADVENIR-INDIVIDUEL' : '';
  if (advenir) {
    ajouter('prestations', 'ADMIN-ADVENIR', 1);
    texteFixe('prestations', advenir, 'les 3 valeurs du texte : voir « Avant de saisir »');
  }
  ajouter('logistique', `LOG-DEP-${zoneDeplacement(b.zone)}`, 1, '', '1 par jour de pose (environ 7 h sur place), zone et jours à ajuster au montage (D9)');

  return { lignes, aFaire, retirer };
}

const zoneDeplacement = (z: string | null) => (z && ['Z1', 'Z2', 'Z3'].includes(z) ? z : 'Z1');

// Rang de chaque point de recharge (bornes puis prises, par nom) : 0 = N°1
function rangsPoints(els: ElementReleve[]): Map<string, number> {
  const pts = els.filter((e) => e.nature === 'borne' || e.nature === 'priseRenforcee')
    .sort((x, y) => (x.nature === y.nature ? 0 : x.nature === 'borne' ? -1 : 1) || x.nom.localeCompare(y.nom, 'fr', { numeric: true }));
  return new Map(pts.map((e, i) => [e.id, i]));
}

// Famille d'une ligne (modèles V2 du 04/11 : seule la section d'un câble se remplace). Une ligne du modèle absente du
// relevé et une ligne du relevé absente du modèle, de la même famille et dans la même sous-section, se lisent comme un
// remplacement : même mode de pose, autre section (LIA-TUBE-3G10 → LIA-TUBE-3G16), ou percement en -40 (gros câble).
// Tout le reste se garde, se retire ou s'ajoute.
export function famille(ref: string): string {
  const cable = ref.match(/^(LIA-[A-Z-]+?)-[35]G[\d.]+$/);
  if (cable) return cable[1];
  const per = ref.match(/^(PER-[A-Z]+)(-40)?$/);
  if (per) return per[1];
  return ref;
}

const LIEU_A_CREER: Partial<Record<Zone, string>> = {
  communication: 'section « 3. COMMUNICATION » à créer avant les prestations',
  pilotage: 'sous-section « Gestionnaire de charge » à créer dans la section Communication',
  autre: 'à la fin de la section du point de recharge',
};

// Rendu d'un devis dans l'ordre exact de son modèle : chaque section, chaque sous-section, chaque ligne du modèle avec
// ce qu'il faut en faire, puis les lignes à ajouter, puis une seule ligne ✖ avec tout ce qui ne sert pas. La sous-section
// est répétée au bout de chaque ligne (écart 15). Une zone que le modèle n'a pas devient une sous-section « à créer ».
// Une ligne du modèle dont la liaison est couverte par le câble du coffret est retirée avec sa raison (05/11).
export function rendreDevis(plan: SectionModele[], lignes: LigneDevis[], retirer: Record<string, string> = {}, nbPoints = 1): string[] {
  const out: string[] = [];
  const zonesDuPlan = new Set(plan.flatMap((s) => s.sous.map((ss) => ss.zone)));
  const zoneCible = (z: Zone): Zone | null => (zonesDuPlan.has(z) ? z : REPLI_ZONE[z] && zonesDuPlan.has(REPLI_ZONE[z] as Zone) ? REPLI_ZONE[z] as Zone : null);
  const parPoint = plan.some((s) => s.parPoint);
  const pdcDe = (l: LigneDevis) => (parPoint && ZONES_PAR_POINT.includes(l.zone) ? l.pdc : 0);
  const restantes = lignes.map((l) => ({ ...l, zone: zoneCible(l.zone) ?? l.zone }));
  const qte = (n: number | null, unite: string) => (n === null ? '' : ` × ${fr(n)}${unite && unite !== 'texte' ? ` ${unite}` : ''}`);
  const details = (ls: LigneDevis[]) => {
    const d = ls.map((l) => l.detail).filter(Boolean);
    return d.length ? ` · ${Array.from(new Set(d)).join(' ; ')}` : '';
  };
  const libTexte = (ref: string) => `texte ${ref}`;

  const rendreSous = (zone: Zone, pdc: number, modele: { ref: string; qte?: number; texte?: string }[], aCreer: boolean, lieu = '') => {
    const ici = restantes.filter((l) => l.zone === zone && pdcDe(l) === pdc);
    const prises = new Set<LigneDevis>();
    const items: string[] = [];
    const sansObjet: string[] = []; // lignes et textes du modèle sans rien au relevé, regroupés sur une ligne ✖
    for (const m of modele) {
      if (m.texte !== undefined) {
        const demande = m.ref ? ici.find((l) => !prises.has(l) && l.ref === m.ref && l.qte === null) : undefined;
        if (demande) prises.add(demande);
        if (m.ref && retirer[m.ref]) items.push(`✖ texte « ${m.texte} » : retirer (${retirer[m.ref]})`);
        else if (!demande && TEXTES_CONDITIONNELS.has(m.ref)) sansObjet.push(libTexte(m.ref));
        else items.push(`✔ texte « ${m.texte} » : garder${demande?.detail ? `, ${demande.detail}` : ''}`);
        continue;
      }
      const memes = ici.filter((l) => !prises.has(l) && l.ref === m.ref && l.qte !== null);
      if (memes.length) {
        memes.forEach((l) => prises.add(l));
        const total = memes.reduce((s, l) => s + (l.qte ?? 0), 0);
        const u = memes[0].unite;
        items.push(total === m.qte
          ? `✔ ${m.ref}${qte(total, u)} : garder${details(memes)}`
          : `✏️ ${m.ref} : passer de ${fr(m.qte ?? 0)} à ${fr(total)}${u ? ` ${u}` : ''}${details(memes)}`);
        continue;
      }
      if (retirer[m.ref]) { items.push(`✖ ${m.ref} : retirer (${retirer[m.ref]})`); continue; }
      // Remplacement : section du câble (même mode de pose) ou percement -40, pas dans le modèle, même sous-section
      const fam = famille(m.ref);
      const autre = fam !== m.ref || /^PER-/.test(m.ref)
        ? ici.find((l) => !prises.has(l) && l.qte !== null && l.ref !== m.ref && famille(l.ref) === fam && !modele.some((x) => x.ref === l.ref))
        : undefined;
      if (autre) {
        const memeRef = ici.filter((l) => !prises.has(l) && l.ref === autre.ref && l.qte !== null);
        memeRef.forEach((l) => prises.add(l));
        const total = memeRef.reduce((s, l) => s + (l.qte ?? 0), 0);
        items.push(`🔁 ${m.ref} → remplacer par ${autre.ref}${qte(total, autre.unite)}${details(memeRef)}`);
        continue;
      }
      // Liaison couverte par le câble compris dans le coffret (T5, 05/11) : retirée avec la raison
      const couverte = retirer[`${zone}#${pdc}#${fam}`];
      if (couverte) { items.push(`✖ ${m.ref} : retirer (${couverte})`); continue; }
      // T2 : modèle complet qu'on élague, une ligne sans équivalent dans le relevé s'enlève
      sansObjet.push(m.ref);
    }
    const reste = ici.filter((l) => !prises.has(l));
    const vus = new Set<string>();
    for (const l of reste) {
      if (vus.has(l.ref)) continue;
      vus.add(l.ref);
      const memes = reste.filter((x) => x.ref === l.ref);
      if (l.qte === null) items.push(`➕ ${libTexte(l.ref)}${details(memes)}`);
      else items.push(`➕ ${l.ref}${qte(memes.reduce((s, x) => s + (x.qte ?? 0), 0), l.unite)}${details(memes)}`);
    }
    if (sansObjet.length) items.push(`✖ retirer, rien au relevé : ${sansObjet.join(', ')}`);
    if (aCreer && !items.length) return;
    // Sous-section rappelée au bout de chaque ligne (écart 15)
    const ou = ` → ${NOM_ZONE[zone]}${parPoint && ZONES_PAR_POINT.includes(zone) ? ` N°${pdc + 1}` : ''}`;
    out.push(`▸ ${NOM_ZONE[zone]}${aCreer ? ` (sous-section à créer${lieu ? `, ${lieu}` : ' ici'})` : ''}`);
    out.push(...(items.length ? items.map((i) => `   ${i}${ou}`) : ['   rien à saisir']));
  };

  const manquantes = Array.from(new Set(restantes.map((l) => l.zone))).filter((z) => !zonesDuPlan.has(z));
  const apres = (z: Zone) => {
    const i = ORDRE_ZONES.indexOf(z);
    for (let j = i - 1; j >= 0; j--) if (zonesDuPlan.has(ORDRE_ZONES[j])) return ORDRE_ZONES[j];
    return null;
  };
  const creerApres = (zone: Zone | null, pdc: number, quoi: 'point' | 'hors' | 'tous') => {
    for (const z of manquantes.filter((x) => apres(x) === zone && (quoi === 'tous' || ZONES_PAR_POINT.includes(x) === (quoi === 'point')))) {
      rendreSous(z, pdc, [], true, LIEU_A_CREER[z]);
    }
  };

  plan.forEach((s, i) => {
    const repetitions = s.parPoint ? Math.max(1, nbPoints) : 1;
    for (let p = 0; p < repetitions; p++) {
      out.push('', p === 0 ? s.titre : `${s.titre.replace('N°1', `N°${p + 1}`)} (section à créer : dupliquer la section N°1)`);
      if (i === 0 && p === 0) creerApres(null, 0, 'tous');
      for (const ss of s.sous) {
        rendreSous(ss.zone, s.parPoint ? p : 0, ss.lignes, false);
        creerApres(ss.zone, s.parPoint ? p : 0, s.parPoint ? 'point' : 'tous');
      }
    }
    if (s.parPoint) for (const ss of s.sous) creerApres(ss.zone, 0, 'hors');
  });
  return out;
}
