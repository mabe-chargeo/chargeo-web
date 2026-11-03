// Brief de chiffrage (étape 5 du plan du 15/10/2026, PR #51).
// Décision de Matthieu (15/10, 10 h 51) : au clic « Prêt à chiffrer », le site calcule et poste un commentaire
// « 📋 Brief de chiffrage » sur le scénario. Ce n'est pas le site qui fait le devis (synthèse du 14/10, section 8).
// 01/11/2026 (Phase 8, étape 4, « chiffrer sans IA ») : le brief devient une liste prête à saisir par Mathieu, sans
// calcul à refaire : le modèle Costructor à copier (src/lib/modelesDevis.ts), puis, sous-section par sous-section du
// modèle, chaque « référence × quantité » tirée de la table de correspondance du 01/11 (compétence Bibliothèque
// Costructor). Règles appliquées : D1 (pas de délesteur en bibliothèque : TIC = coffret simple + LIA-DATA-TIC, Modbus =
// coffret -MOD + LIA-DATA-MOD), D2 à D4 (bornes, prises, pieds), D5 et D6 (PDL dédié : ni compteur ni comptage),
// D8 (supervision PAR, FLT, TER), D9 (déplacement), D13 (colonne Enedis), D14 (pas de 3G35), D15 (TD de borne
// partagée), D16 (artère = chemin de câbles neuf LIA-CDC + LIA-DATA-RJ45 sur la même longueur, alimentation = chemin
// de câbles existant LIA-CDC-EX), et les réponses du 01/11 (RIC tarif type ou résident selon 🏢 Type Client de la
// fiche ; point de livraison dédié = devis AMO séparé envoyé en premier ; dépose = élément Autre ; façade = case du
// cheminement). Une référence absente de la bibliothèque n'est jamais inventée : elle part dans « ⏳ À faire à la main ».
// Les calculs ci-dessous (puissance, sections, chutes) restent en détail sous la liste.
// 01/11, 20 h 15 (Mathieu : « le brief du devis doit suivre la structure du modèle de devis correspondant ») : la liste
// suit le plan lu dans chaque modèle (PLANS, src/lib/modelesDevis.ts) : sections, sous-sections, lignes du modèle à
// garder, changer, remplacer ou retirer, puis lignes à ajouter dans la bonne sous-section. Alertes ajoutées : borne
// triphasée sur raccordement monophasé (câble 3G, bridée à 7,4 kW) et TD 2 ou 3 points pour moins de points de charge.
// 02/11 (recette du brief PAR sur PDL dédié) : alerte si plus de 12 kVA sont demandés sur un branchement monophasé.
// 02/11, 18 h 46 (Phase 8, étape 7, recette de la chaîne sans IA, accord de Mathieu) : chaque devis reçoit « Avant de
// saisir » (nom exact, TVA à poser sur les lignes ajoutées, crochets de l'en-tête, prime ADVENIR en valeur haute) et
// « Avant de finaliser » (src/lib/briefSaisie.ts) ; la liaison data qui part ou arrive à l'élément Communication est
// rangée dans la sous-section Communication, avec le modem (écart 3 de la recette).
// 02/11, 19 h 57 : les éléments du relevé sont transmis aux consignes de saisie (crochet [emplacements] des bornes,
// question « 📌 Emplacement de la borne » en PAR, FLT et TER).
// 03/11 (D9, carte « Le projet » retirée de la fiche) : la zone de déplacement n'est plus demandée. L'en-tête ne la cite
// que si elle est saisie, plus d'alerte, et la ligne LOG-DEP-Z1 dit « zone et jours à ajuster au montage (D9) ».
// 03/11, passe 2 de la recette (décisions de Mathieu, T5 et T6 tranchés à 21 h 21 et 21 h 22) :
// - gestionnaire de grappe : demande plafonnée à 36 kVA (52 A), section calculée sur cette consigne (5G16 au lieu de
//   5G25), plus d'alerte « au-dessus de la puissance dispo » (écarts 2, 8, 63, 64) ;
// - COP sur services généraux : puissance cible = pointe réelle des communs + réserve IRVE ; si l'abonnement suffit,
//   il reste inchangé, sinon ADMIN-AUGM-PDL + JUR-AUGM-PUISSANCE (écarts 51 et 52) ;
// - paliers 24, 30 et 36 kVA ; « 18 kVA et plus » n'est plus lu comme 18 kVA (écart 50) ;
// - liaison de plus de 3 m depuis le tableau : DEPART-TGBT-MONO-40 ou -TRI-40 ajouté en Raccordement (écarts 32, 43, 65) ;
// - TIC Linky : liaison data sur les deux tronçons, Raccordement → coffret et coffret → borne (écarts 16 et 74) ; une
//   liaison data qui manque au relevé prend la longueur de l'alimentation du même tronçon (écart 48) ;
// - PDL dédié : la liaison data Raccordement → TD n'est jamais comptée (écart 58) ;
// - T5 : COFF-MONO-7K contient déjà 3 m de 3G16 (liaison TGBT éloigné) et 3 m de câble téléreport : la liaison
//   Raccordement → coffret et sa TIC ne sont comptées qu'au-delà de 3 m (composition lue dans Costructor le 03/11) ;
// - une seule Boîte de dérivation avec une quantité (écart 46) ; HUB présélectionné selon les points de charge (T6) ;
// - Artère en vide sanitaire ou en tirage existant (écart 47) ; Réseau « Box ou WiFi du client » : portée à vérifier (T4).
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
// 15/10, 18 h 14 (Matthieu : « tu as toutes tes réponses dans les textes de normes dans mon drive »), valeurs reprises des
// normes du Drive :
// - chute de tension, NF C 15-100 art. 525 et UTE C 15-105 : u = b (ρ1 L / S cos φ + λ L sin φ) IB, b = 2 en mono et 1 en
//   tri, rapportée à la tension phase-neutre (230 V) ; ρ1 = résistivité en service normal, 0,0225 Ω·mm²/m pour le cuivre
//   (1,25 × la valeur à 20 °C, donc pas 0,0171) ; λ = 0,08 mΩ/m ; cos φ = 1 retenu pour la charge d'un véhicule
//   (plus défavorable que le 0,8 par défaut sur ces sections) ;
// - IB = courant assigné de la borne (UTE C 15-722, notes du tableau 2) ;
// - limite : 5 % cumulés depuis l'origine pour les autres usages sur réseau BT public (tableau 52W), pas de limite IRVE
//   propre. L'origine connue du relevé est le raccordement : la chute en amont n'est pas comptée ;
// - protections et sections minimales : UTE C 15-722 tableau 2 (16 A → 20 A et 2,5 mm² ; 32 A → 40 A et 10 mm²) ;
// - utilisation et simultanéité = 1 (7-722, 722.311), réductible seulement avec une gestion de charge ;
// - déport de protection jusqu'à 3 m sous conditions (433.2.1 et 434.2.2.1) ;
// - circuit spécialisé (722.314.101), DDR 30 mA individuel par point de charge (722.411), type A ou F en mono, B en tri,
//   ou A/F + détection 6 mA DC (IEC 62955).
// Choix CHARGéO (pas une valeur de norme) : budget de 3 % pour l'artère COP, pour laisser 2 % aux dérivations RIC.
// 16/10 : l'alimentation du TD IRVE et l'artère COP affichent « 63 A, protection du TD » (ce n'est pas un courant
// assigné de borne, c'est le calibre de protection du TD).
import { CHAMPS, OPTIONS, cleOption, indexMenu, type Segment } from '@/lib/champsClickUp';
import { LIBELLE_SEGMENT, ORDRE_NATURE, FORFAIT_RIC_TUBE_APPARENT, estDepose, nomLien } from '@/lib/elementsModele';
import {
  MODELES, NOM_ZONE, ORDRE_ZONES, PLANS, REPLI_ZONE, ZONES_PAR_POINT, lienModele, type ModeleDevis, type SectionModele, type Zone,
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
const BUDGET_ARTERE = 3;
const TARIF_JAUNE_KVA = 36;
const MONO_MAX_KVA = 12; // branchement monophasé Enedis : 12 kVA au plus, au-delà triphasé (recette du 02/11)
// Consigne du gestionnaire de grappe : 36 kVA en tri (36 000 / (400 × √3) ≈ 52 A), 12 kVA en mono (≈ 52 A) ; protection
// 63 A, 16 mm² (décision de Mathieu du 03/11, 10 h 02 : 5G16 au lieu de 5G25)
const COURANT_PLAFOND = 52;
const SECTIONS = [2.5, 4, 6, 10, 16, 25, 35, 50];
const CALIBRES = [20, 25, 32, 40, 50, 63, 80, 100, 125];
// UTE C 15-722 tableau 2 pour 20 A et 40 A ; valeurs usuelles pour les autres calibres
const SECTION_MIN: Record<number, number> = { 20: 2.5, 25: 4, 32: 6, 40: 10, 50: 16, 63: 16, 80: 25, 100: 35, 125: 50 };
const KW: Record<string, number> = { '3.7': 3.7, '7.4': 7.4, '11': 11, '22': 22 };
const ASSIGNE: Record<string, number> = { '3.7': 16, '7.4': 32, '11': 16, '22': 32 };
// « 18 kVA et plus » (ancien palier) n'a pas de valeur : il n'est plus lu comme 18 kVA (écart 50)
const DISPO_KVA: Record<string, number> = { '3': 3, '6': 6, '9': 9, '12': 12, '24': 24, '30': 30, '36': 36 };
// Câble déjà compris dans un coffret (T5, 03/11 à 21 h 21 ; composition lue dans Costructor le 03/11) : mètres de la
// liaison Raccordement → coffret (puissance) et de sa liaison TIC (data) qu'on ne compte pas une deuxième fois
const CABLE_INCLUS: Record<string, { puissance: number; data: number }> = {
  'COFF-MONO-7K': { puissance: 3, data: 3 }, // 3 m de H07RN-F 3G16 « liaison TGBT éloigné » + 3 m de téléreport
};

// Ligne à saisir : zone du modèle (src/lib/modelesDevis.ts), rang du point de recharge (0 = N°1), référence, quantité
// (null pour un texte), unité, détail (élément du relevé d'où elle vient)
export type LigneDevis = { zone: Zone; pdc: number; ref: string; qte: number | null; unite: string; detail?: string };

// Sections de câble qui ont un ouvrage, par famille de liaison (bibliothèque et table de correspondance du 01/11).
// Pas de 3G35 (D14). Une section hors liste n'est pas inventée : elle part dans « À faire à la main ».
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
// Mode de pose saisi → famille de liaison (C1 à C3 pour l'alimentation, C7 à C9 pour l'artère)
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
// IRVE. Si l'abonnement actuel suffit, il reste inchangé ; sinon augmentation de puissance. Sans pointe relevée : l'ancien
// calcul (abonnement + réserve) avec une alerte. augmenter : null = on ne sait pas.
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

// Modèle(s) à copier (src/lib/modelesDevis.ts). typeClient : clé de 🏢 Type Client de la fiche (particulier, pro, syndic).
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
      principal = MODELES.DAP;
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

// Courant assigné en aval d'un équipement (bornes et prises alimentées par les cheminements qui en partent).
// Bornes mono supposées sur la même phase (cas le plus défavorable), simultanéité 1 (722.311).
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

export type EntreeBrief = {
  scenarioNom: string;
  segment: Segment | null;
  nbPlaces: number | null;
  zone: string | null;
  elements: ElementReleve[];
  typeClient?: string | null; // 🏢 Type Client de la fiche (RIC : tarif type ou résident)
  ficheNom?: string | null; // nom de la fiche, pour le nom du devis (02/11)
  dateVisite?: string | null; // 📅 Date Visite Technique (JJ/MM/AAAA), pour le crochet [date] de l'en-tête (02/11)
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
  // Raccordement monophasé (sans passage en tri) : une borne 11 ou 22 kW n'y donne que 7,4 kW, câble 3G
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
  // Gestion de charge du site : élément Communication (01/11, 21 h 35), ou TD IRVE / coffret d'un ancien relevé ; COP et
  // RIC sur l'infra : gestionnaire de grappe d'office (03/11)
  const site = gestionDuSite(els, seg);
  const gestion = !!site.gestion && site.gestion !== 'aucune';
  // Gestionnaire de grappe hors COP et RIC : demande plafonnée à 36 kVA (03/11, 10 h 02)
  const grappe = site.gestion === 'gestionnaireGrappe' && !cop && !ric;

  // En-tête (03/11, D9 : la zone n'est citée que si elle est saisie, elle s'ajuste au montage du devis)
  const quand = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });
  const entete = [
    `📋 Brief de chiffrage · ${b.scenarioNom}`,
    `Calculé par le site au clic « Prêt à chiffrer » (${quand}). Les puissances et sections sont à valider avant l'envoi du devis.`,
    '',
    `Segment : ${seg ? LIBELLE_SEGMENT[seg] : 'à renseigner'}`,
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
        puissance.push(...p.lignes);
        if (p.alerte) alertes.push(p.alerte);
      }
    }
    if (b.nbPlaces && b.nbPlaces >= 10) {
      puissance.push(`ADVENIR infra : 50 % plafonné à ${fr(plafondAdvenirInfra(b.nbPlaces), 0)} € HT. Éligibilité selon la date du permis (avant 2017 : complète ; 2017 → 10/03/2021 : réduite ; après : non éligible), à vérifier`);
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
    if (ric && dep?.nature === 'raccordement' && source !== 'colonneEnedis') return { c, type, long, ci: null, forcee, section: forcee, fixe: true, infra: true };
    let ci: Circuit | null = null;
    if (cop && arr?.nature === 'tdIrveCoffret') ci = { tri: true, courant: 63, calibre: 63, sectionMin: 16 };
    else if (c.arrivee) {
      const a = aval(String(c.arrivee), els, monoSeul);
      // Gestionnaire de grappe : le courant est ramené à la consigne (36 kVA, 52 A), protection 63 A, 16 mm² (03/11)
      if (a.courant > 0) {
        ci = grappe && a.courant > COURANT_PLAFOND
          ? { tri: a.tri, courant: COURANT_PLAFOND, calibre: 63, sectionMin: 16, plafonne: true }
          : circuit(a.courant, a.tri);
      }
    }
    return { c, type, long, ci, forcee, section: forcee ?? (ci ? ci.sectionMin : null), fixe: !!forcee, infra: false };
  });
  const parId = new Map<string, Calcul>(calculs.map((k) => [k.c.id, k]));
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
    else if (k.infra) section = k.forcee ? `${fr(k.forcee)} mm² (forcée)` : "section de l'artère de l'infra (16 ou 25 mm², voir le brief de l'infra)";
    else if (!k.ci) section = 'puissance en aval inconnue, section non calculée';
    else if (long <= 0) section = `longueur à renseigner (minimum ${fr(k.ci.sectionMin)} mm² pour ${k.ci.calibre} A)`;
    else if (k.section !== null) {
      const du = chute(k.ci.tri, long, k.ci.courant, k.section);
      const auto = type === 'artere' ? '' : k.forcee ? ` (forcée)` : k.section > k.ci.sectionMin ? ` (minimum ${fr(k.ci.sectionMin)} mm², augmentée pour la chute)` : '';
      // Alimentation du TD IRVE et artère COP : 63 A = calibre de protection du TD, pas un courant assigné de borne
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
      protections.push(`Protection en tête : ${nomDe(c.depart)} → ${nomDe(c.arrivee)} fait ${fr(long)} m. Au-delà de 3 m, la protection ne peut pas être déportée au coffret (NF C 15-100 433.2.1 et 434.2.2.1) : disjoncteur au départ du tableau (ligne DEPART-TGBT en Raccordement)`);
    }
  }
  if (!calculs.length) chemins.push('Aucun cheminement');

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
  // Contrôle : une section forcée reste prioritaire, même si la chute dépasse
  void parId;

  // 4. Lignes à saisir (table de correspondance du 01/11), dans l'ordre du modèle à copier
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
  };

  const saisie: string[] = ['', '🧾 À SAISIR DANS COSTRUCTOR'];
  saisie.push("Dans l'ordre du modèle. ✔ garder · ✏️ changer la quantité · 🔁 remplacer la ligne du modèle · ➕ ajouter dans cette sous-section · ✖ retirer · ❓ dans le modèle mais pas dans le relevé, à vérifier. Les textes du modèle restent.");
  if (!choix.devis.length) {
    saisie.push('', 'Modèle : à choisir (voir les alertes). Lignes du relevé :');
    saisie.push(...lignes.map((l) => `• ${NOM_ZONE[l.zone]} : ${l.ref}${l.qte === null ? ' (texte)' : ` × ${fr(l.qte)}${l.unite ? ` ${l.unite}` : ''}`}${l.detail ? ` · ${l.detail}` : ''}`));
  }
  choix.devis.forEach((d, i) => {
    const titre = choix.devis.length > 1 ? `DEVIS ${i + 1}` : 'MODÈLE';
    saisie.push('', `━━ ${titre} : copier « ${d.modele.nom} » (TVA ${d.modele.tva}${d.role ? `, ${d.role}` : ''}) : ${lienModele(d.modele)}`);
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

// Lignes « référence × quantité » rangées par zone du modèle (src/lib/modelesDevis.ts), à partir des éléments et des
// sections calculées. Table de correspondance du 01/11 : R (raccordement), C (cheminement), T (TD IRVE / coffret), BD,
// B (borne), P (prise), K (communication), A (autre), G (prestations). pdc : rang du point de recharge (0 = N°1), pour
// les modèles à une section par point. retirer : lignes du modèle à enlever, avec la raison.
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
  const texteFixe = (zone: Zone, ref: string, detail?: string) => {
    if (!lignes.some((l) => l.zone === zone && l.ref === ref)) lignes.push({ zone, pdc: 0, ref, qte: null, unite: 'texte', detail });
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
  const site = gestionDuSite(els, seg); // gestion de charge et mesure : élément Communication, ou TD d'un ancien relevé
  const parId = new Map<string, ElementReleve>(els.map((e) => [e.id, e]));

  // COP sur services généraux : augmentation de puissance si la pointe réelle + la réserve dépassent l'abonnement (écart 52)
  const reserve = cop && b.nbPlaces ? reserveIrve(b.nbPlaces) : null;
  const augmenterCop = cop && sg && reserve !== null
    && puissanceCopSg(DISPO_KVA[texte(racc?.valeurs.puissanceDispo)] ?? null, pointeDe(racc), reserve).augmenter === true;

  // Raccordement (R1 à R10)
  if (racc) {
    if (sg) {
      if (cop || seg === 'PAR') ajouter('raccordement', `INFRA-COP-COMPTAGE-${triRacc ? 'TRI' : 'MONO'}`, 1); // R3, D5, D6
      texteFixe('raccordement', 'JUR-COUPURE-TGBT');
    }
    if (source === 'colonneEnedis') {
      texteFixe('raccordement', 'INFO-RACC-LINKY-ENEDIS'); // R6, D13
      texteFixe('raccordement', 'JUR-CONSUEL-PDL-ENEDIS');
    }
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

  // Protection au départ du tableau quand la liaison Raccordement → coffret dépasse 3 m (écarts 32, 43, 65), en mono
  // comme en tri ; au-delà de 40 A, pas d'ouvrage : à la main
  if (!cop && !ric) {
    for (const k of calculs) {
      if (k.type !== 'alimentation' || !alerteTroisMetres(k.c, els, seg)) continue;
      const tri = k.ci ? k.ci.tri : triRacc;
      if (k.ci && k.ci.calibre > 40) aFaire.push(`${k.c.nom} : départ protégé en ${k.ci.calibre} A au tableau, pas d'ouvrage DEPART-TGBT à ce calibre, à chiffrer à la main`);
      else ajouter('raccordement', `DEPART-TGBT-${tri ? 'TRI' : 'MONO'}-40`, 1, '', `${k.c.nom} : ${fr(k.long)} m, plus de 3 m, protection au départ du tableau`);
    }
  }

  // Cheminement (C1 à C13) : section 1 s'il arrive au TD IRVE / coffret ou part du raccordement, sinon section des
  // points de recharge (ou de l'artère en COP), dans la section du point de recharge auquel il arrive. Liaison data qui
  // part ou arrive à l'élément Communication : sous-section Communication, avec le modem (écart 3, recette du 02/11).
  let tranchee: Zone | null = null;
  let facade: Zone | null = null;
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
    if (texte(c.valeurs.passageFacade) === 'oui') facade = facade ?? zone;
    if (type === 'liaisonData') { // C10 à C12
      const amont = dep?.nature === 'raccordement' && arr?.nature === 'tdIrveCoffret';
      const versBorne = dep?.nature === 'tdIrveCoffret' && arr?.nature === 'borne';
      // PDL dédié : ni compteur ni comptage (D5, D6), la liaison Raccordement → TD n'est jamais comptée (écart 58)
      if (amont && pdl) continue;
      // TIC Linky : sur les deux tronçons, Linky → coffret puis coffret → borne (carte TIC dans la borne, écarts 16 et 74)
      const mesure = amont ? site.mesure : versBorne && site.mesure === 'ticLinky' ? 'ticLinky' : '';
      const ref = mesure === 'compteurModbus' ? 'LIA-DATA-MOD' : mesure === 'ticLinky' ? 'LIA-DATA-TIC' : 'LIA-DATA-RJ45';
      // T5 : téléreport déjà compris dans le coffret, compté seulement au-delà
      const inclus = amont && ref === 'LIA-DATA-TIC' ? inclusDans(arr).data : 0;
      const enTranchee = Number(c.valeurs.distTranchee) || 0;
      const horsTranchee = Math.max(0, long - enTranchee - inclus);
      const tranchéeRestante = Math.max(0, enTranchee - Math.max(0, inclus - (long - enTranchee)));
      const note = inclus ? ` (${inclus} m compris dans ${texte(arr?.valeurs.coffretIrve)})` : '';
      poserLigne(ref, metres(horsTranchee), 'ml', `${c.nom}${note}`);
      if (tranchéeRestante > 0) {
        tranchee = tranchee ?? zone;
        if (ref === 'LIA-DATA-RJ45') poserLigne('LIA-ENT-RJ45', metres(tranchéeRestante), 'ml', `${c.nom} (en tranchée)`);
        else poserLigne(ref, metres(tranchéeRestante), 'ml', `${c.nom} (en tranchée)`);
      }
    } else {
      // Section : calculée (S1), forcée (S2), de l'artère (S4) ; 3G en mono, 5G en tri (S5)
      const triCable = type === 'artere' || k.infra || (cop && arr?.nature === 'tdIrveCoffret') ? triRacc : (k.ci ? k.ci.tri : triRacc);
      let s = k.section;
      let noteSection = '';
      // S4 : en COP, la liaison Raccordement → TD IRVE reprend la section de l'artère
      if (cop && arr?.nature === 'tdIrveCoffret' && s !== null) {
        const artere = calculs.find((x) => x.type === 'artere' && x.c.depart === arr.id);
        if (artere?.section && artere.section > s) s = artere.section;
      }
      if (k.infra && s === null) { s = 25; noteSection = " (section de l'artère de l'infra : 25 mm² par défaut, à vérifier)"; }
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
          // C5 : boîte de dérivation → coffret, toujours en dérivation (forfait 5 m pré-rempli + dépassement)
          poser('LIA-DERIV', long, `${c.nom}${noteSection}`);
        } else {
          const poses = type === 'artere' ? POSE_ARTERE : POSE_ALIMENTATION;
          // T5 : mètres déjà compris dans le coffret d'arrivée (COFF-MONO-7K), retirés des premiers modes de pose
          const inclus = type === 'alimentation' && dep?.nature === 'raccordement' ? inclusDans(arr).puissance : 0;
          let reste = inclus;
          for (const d of DISTANCES) {
            let m = Number(c.valeurs[d]) || 0;
            if (m <= 0) continue;
            if (reste > 0) { const pris = Math.min(m, reste); m -= pris; reste -= pris; }
            if (m <= 0) continue;
            const famille = poses[d];
            const mode = SAISIES[d].libelle.replace(' (m)', '').toLowerCase();
            if (!famille) { aFaire.push(`${c.nom} : ${mode} ${fr(m)} m en artère, pas d'ouvrage d'artère pour ce mode de pose`); continue; }
            poser(famille, m, `${c.nom}, ${mode}${inclus ? ` (${inclus} m déjà compris dans ${texte(arr?.valeurs.coffretIrve)})` : ''}`);
            if (d === 'distTranchee') tranchee = tranchee ?? zone;
            if (type === 'artere' && d === 'distCheminCables') poserLigne('LIA-DATA-RJ45', metres(m), 'ml', `${c.nom}, câble data dans le chemin de câbles (D16)`);
          }
        }
        // RIC : le câble data du switch de la boîte de dérivation suit l'alimentation jusqu'à la borne (dérivation, puis
        // coffret → borne), comme dans les modèles RIC (LIA-DATA-RJ45 × 5 dans chacun des deux cheminements)
        if (ric && source !== 'colonneEnedis' && connectivite === 'switchBoiteDerivation') {
          poserLigne('LIA-DATA-RJ45', metres(long), 'ml', `${c.nom} (data, avec l'alimentation)`);
        }
      }
      // Percements (C13) : variante Ø40 dès 16 mm²
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
  // Liaisons data de la mesure qui manquent au relevé : elles prennent la longueur de l'alimentation du même tronçon
  // (écart 48) ; TIC sur les deux tronçons (écarts 16 et 74), Modbus sur Raccordement → TD, jamais sur un PDL dédié
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
    ajouter(zone, ref, metres(Math.max(0, k.long - inclus)), 'ml', `${nomLien(dep?.nom ?? null, arr?.nom ?? null, 'liaisonData')} : longueur de l'alimentation${inclus ? `, ${inclus} m compris dans ${texte(arr?.valeurs.coffretIrve)}` : ''} (liaison data absente du relevé)`, pdc);
  }
  if (tranchee) texteFixe(tranchee, 'INFO-TRANCHEE-TERRASSIER');
  if (facade) texteFixe(facade, 'JUR-AUTORISATION-FACADE');

  // TD IRVE / coffret (T1 à T10)
  const points = els.filter((e) => e.nature === 'borne').reduce((n, bo) => n + (ligneBorne(bo.valeurs.modeleBorne)?.points ?? 1), 0)
    + els.filter((e) => e.nature === 'priseRenforcee').length;
  const nbBoites = nombreBoites(els);
  const tds = els.filter((e) => e.nature === 'tdIrveCoffret');
  const mesure = site.mesure;
  // T5, K5 : un gestionnaire de grappe pour le site (sauf TD de borne partagée, qui l'a déjà) ; RIC : le pilotage est
  // celui de l'infra collective, rien à ajouter au devis du résident. HUB : choisi au relevé, sinon présélectionné selon
  // les points de charge (T6, COP : 4 points par boîte de dérivation)
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
    // TD de borne partagée : 2 ou 3 départs, pour 2 ou 3 points de charge
    if (estCoffretTd(ref)) {
      const departs = ref.includes('3D22') ? 3 : 2;
      if (points < departs) alertes.push(`${td.nom} : ${ref} prévu pour ${departs} points de charge, ${points} au relevé. ${points <= 1 ? 'Pour une seule borne, un coffret COFF suffit' : `Prendre le TD ${points} points`}`);
      if (points > departs) alertes.push(`${td.nom} : ${points} points de charge pour ${departs} départs du ${ref} : un TD ou un coffret de plus`);
    }
  }
  if (estCoffretTd(els.find((e) => e.nature === 'tdIrveCoffret')?.valeurs.coffretIrve) && seg && !['PAR', 'FLT', 'TER'].includes(seg)) {
    alertes.push(`TD de borne partagée en ${seg} : proposé en PAR, FLT et TER seulement (D15)`);
  }
  // DAP : le sous-compteur MID du modèle sert à refacturer la copropriété, donc borne sur les services généraux
  if (seg === 'DAP') {
    if (sg) ajouter('td', 'MID-SOUS-COMPTAGE', 1);
    else retirer['MID-SOUS-COMPTAGE'] = 'borne sur ton propre compteur, rien à refacturer à la copropriété';
  }

  // Boîte de dérivation (BD1) : un seul élément avec sa quantité (écart 46), 1 par élément si la quantité est vide
  ajouter('boite', 'INFRA-COP-BOITE', nbBoites);

  // Borne (B1 à B17) : une mise en service par point de charge (B15), dans la section de sa borne
  let wittyPlus = 0;
  const miseEnService = new Map<number, number>(); // points de charge par section de point de recharge
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
    // T4 : box ou WiFi du client, aucune ligne au devis
    if (texte(com.valeurs.reseau) === 'wifi') aFaire.push(`${com.nom} : box ou WiFi du client, portée jusqu'à la borne à vérifier (aucune ligne au devis)`);
  }
  if (wittyPlus > 0 && connectivite === 'simIntegree') ajouter('communication', 'OPT-4G-HAG', wittyPlus); // K1
  const supervision: Partial<Record<Segment, string>> = {
    PAR: 'SERV-SETUP-SUPERVISION-REFACT', FLT: 'SERV-SETUP-SUPERVISION', TER: 'SERV-SETUP-SUPERVISION-REFACT', COP: 'SERV-SETUP-SUPERVISION',
  };
  if (seg && supervision[seg]) ajouter('communication', supervision[seg] as string, 1); // K7, D8 ; COP : 01/11 (étape 3)

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
  if (cop) texteFixe('prestations', 'JUR-CONSUEL-COPRO');
  if (seg === 'DAP') ajouter('prestations', 'ADMIN-DAP', 1);
  if (cop) { ajouter('prestations', 'SERV-ETUDE-COP', 1); ajouter('prestations', 'ADMIN-CONTROLE', 1); }
  const advenir = cop ? 'INFO-ADVENIR-INFRA' : seg === 'PAR' ? 'INFO-ADVENIR-PARTAGE' : ric || (seg === 'DAP' && sg) ? 'INFO-ADVENIR-INDIVIDUEL' : '';
  if (advenir) {
    ajouter('prestations', 'ADMIN-ADVENIR', 1);
    texteFixe('prestations', advenir, 'montant de la prime et reste à charge TTC : voir « Avant de saisir »');
  }
  if (seg === 'DAP' && !sg) {
    retirer['ADMIN-ADVENIR'] = "pas d'ADVENIR hors services généraux";
    retirer['INFO-ADVENIR-INDIVIDUEL'] = "pas d'ADVENIR hors services généraux";
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

// Famille d'une ligne : une ligne du modèle absente du relevé et une ligne du relevé absente du modèle, de la même
// famille et dans la même sous-section, se lisent comme un remplacement (ex. COFF-MONO-7K → COFF-TRI-22K)
function famille(ref: string): string {
  if (ref.startsWith('BORNE-')) return 'borne';
  if (ref.startsWith('COFF-') || ref.startsWith('INFRA-TD-')) return 'coffret';
  if (ref.startsWith('LIA-DATA-') || ref === 'LIA-ENT-RJ45') return 'data';
  if (ref.startsWith('LIA-')) return 'cable';
  if (ref.startsWith('SERV-SETUP-PDC')) return 'miseEnService';
  if (ref.startsWith('SERV-SETUP-SUPERVISION')) return 'supervision';
  if (ref.startsWith('ADMIN-CONSUEL')) return 'consuel';
  if (ref.startsWith('LOG-DEP-')) return 'deplacement';
  if (ref.startsWith('PRISE-')) return 'prise';
  return ref;
}

const LIEU_A_CREER: Partial<Record<Zone, string>> = {
  communication: 'section pilotage et communication à créer avant les prestations',
  autre: 'à la fin de la section du point de recharge',
};

// Rendu d'un devis dans l'ordre exact de son modèle : chaque section, chaque sous-section, chaque ligne du modèle avec
// ce qu'il faut en faire, puis les lignes à ajouter dans cette sous-section. Une zone que le modèle n'a pas devient une
// sous-section « à créer », placée juste après la sous-section qui la précède dans la chaîne.
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

  // Lignes d'une sous-section (zone, point de recharge), modèle d'abord
  const rendreSous = (zone: Zone, pdc: number, modele: { ref: string; qte?: number; texte?: string }[], aCreer: boolean, lieu = '') => {
    const ici = restantes.filter((l) => l.zone === zone && pdcDe(l) === pdc);
    const prises = new Set<LigneDevis>();
    const items: string[] = [];
    for (const m of modele) {
      if (m.texte !== undefined) {
        const demande = m.ref ? ici.find((l) => !prises.has(l) && l.ref === m.ref && l.qte === null) : undefined;
        if (demande) prises.add(demande);
        if (m.ref && retirer[m.ref]) items.push(`✖ texte « ${m.texte} » : retirer (${retirer[m.ref]})`);
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
      // Remplacement : même famille, pas dans le modèle, dans la même sous-section
      const fam = famille(m.ref);
      const autre = ici.find((l) => !prises.has(l) && l.qte !== null && famille(l.ref) === fam && !modele.some((x) => x.ref === l.ref));
      if (autre) {
        const memeRef = ici.filter((l) => !prises.has(l) && l.ref === autre.ref && l.qte !== null);
        memeRef.forEach((l) => prises.add(l));
        const total = memeRef.reduce((s, l) => s + (l.qte ?? 0), 0);
        items.push(`🔁 ${m.ref} → remplacer par ${autre.ref}${qte(total, autre.unite)}${details(memeRef)}`);
        continue;
      }
      items.push(`❓ ${m.ref}${qte(m.qte ?? 1, '')} : rien dans le relevé, à vérifier (le retirer s'il ne correspond pas)`);
    }
    // Ajouts, regroupés par référence, dans l'ordre du relevé
    const reste = ici.filter((l) => !prises.has(l));
    const vus = new Set<string>();
    for (const l of reste) {
      if (vus.has(l.ref)) continue;
      vus.add(l.ref);
      const memes = reste.filter((x) => x.ref === l.ref);
      if (l.qte === null) items.push(`➕ ${libTexte(l.ref)}${details(memes)}`);
      else items.push(`➕ ${l.ref}${qte(memes.reduce((s, x) => s + (x.qte ?? 0), 0), l.unite)}${details(memes)}`);
    }
    if (aCreer && !items.length) return;
    out.push(`▸ ${NOM_ZONE[zone]}${aCreer ? ` (sous-section à créer${lieu ? `, ${lieu}` : ' ici'})` : ''}`);
    out.push(...(items.length ? items.map((i) => `   ${i}`) : ['   rien à saisir']));
  };

  // Zones du relevé sans sous-section dans le modèle, rangées après la sous-section qui les précède dans la chaîne
  const manquantes = Array.from(new Set(restantes.map((l) => l.zone))).filter((z) => !zonesDuPlan.has(z));
  const apres = (z: Zone) => {
    const i = ORDRE_ZONES.indexOf(z);
    for (let j = i - 1; j >= 0; j--) if (zonesDuPlan.has(ORDRE_ZONES[j])) return ORDRE_ZONES[j];
    return null;
  };
  // quoi : 'point' = zones d'un point de recharge seulement, 'hors' = les autres, 'tous' = toutes
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
        // Les sous-sections d'un point de recharge N°2 et suivants reprennent celles du N°1 (copie de la section)
        rendreSous(ss.zone, s.parPoint ? p : 0, ss.lignes, false);
        creerApres(ss.zone, s.parPoint ? p : 0, s.parPoint ? 'point' : 'tous');
      }
    }
    if (s.parPoint) for (const ss of s.sous) creerApres(ss.zone, 0, 'hors');
  });
  return out;
}

// Calcule le brief d'un scénario et le poste en commentaire sur le scénario (places et zone : scénario, sinon fiche)
export async function posterBrief(token: string, scenario: any, elements: ElementReleve[]): Promise<{ ok: boolean; alertes: number }> {
  const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c?.id === id);
  let fiche: any = null;
  if (scenario?.parent) {
    const r = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(String(scenario.parent))}`, { headers: { Authorization: token }, cache: 'no-store' });
    if (r.ok) fiche = await r.json().catch(() => null);
  }
  const places = (t: any): number | null => {
    const v = Number(champ(t, CHAMPS.nbPlacesParking)?.value);
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const zone = (t: any): string | null => (t ? ((cleOption(OPTIONS.zoneDeplacement, indexMenu(t, CHAMPS.zoneDeplacement)) as string | null) ?? null) : null);
  // 📅 Date Visite Technique (horodatage ClickUp en millisecondes) → JJ/MM/AAAA, heure de Paris (02/11)
  const dateVisite = (t: any): string | null => {
    const v = Number(champ(t, CHAMPS.dateVisiteTechnique)?.value);
    return Number.isFinite(v) && v > 0 ? new Date(v).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) : null;
  };
  const segment = cleOption(OPTIONS.segment, indexMenu(scenario, CHAMPS.segment)) as Segment | null;
  const typeClient = fiche ? ((cleOption(OPTIONS.typeClient, indexMenu(fiche, CHAMPS.typeClient)) as string | null) ?? null) : null;
  const brief = genererBrief({
    scenarioNom: String(scenario?.name || ''),
    segment,
    nbPlaces: places(scenario) ?? places(fiche),
    zone: zone(scenario) ?? zone(fiche),
    elements,
    typeClient,
    ficheNom: fiche?.name ? String(fiche.name) : null,
    dateVisite: dateVisite(fiche) ?? dateVisite(scenario),
  });
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(String(scenario.id))}/comment`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment_text: brief.texte, notify_all: false }),
  });
  if (!res.ok) console.error(`Brief de chiffrage refusé (${res.status}) sur ${scenario?.id}`, await res.text().catch(() => ''));
  return { ok: res.ok, alertes: brief.alertes.length + brief.aFaire.length };
}
