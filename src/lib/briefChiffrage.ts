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
// Calculs (synthèse du 14/10, sections 4, 6 et 7) :
// - réserve IRVE au barème (arrêté du 23/12/2020) en COP, avec le plafond ADVENIR infra ;
// - puissance à demander à Enedis si PDL dédié (réserve IRVE en COP, somme des puissances visées sinon), toujours
//   « à valider » ; en COP sur le TGBT SG : abonnement actuel + réserve IRVE ;
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
import { LIBELLE_SEGMENT, ORDRE_NATURE, FORFAIT_RIC_TUBE_APPARENT, estDepose } from '@/lib/elementsModele';
import { MODELES, lienModele, type ModeleDevis } from '@/lib/modelesDevis';
import {
  DISTANCES, PERCEMENTS, PRISES, SAISIES, alerteTroisMetres, estCoffretTd, ligneBorne, longueurTotale, modeleCoherent,
  type ElementReleve,
} from '@/lib/releveElements';

const RHO = 0.0225; // Ω·mm²/m, cuivre en service normal
const LAMBDA = 0.00008; // Ω/m (0,08 mΩ/m)
const COS_PHI = 1;
const SIN_PHI = Math.sqrt(1 - COS_PHI * COS_PHI);
const U0 = 230;
const LIMITE_CUMULEE = 5;
const BUDGET_ARTERE = 3;
const TARIF_JAUNE_KVA = 36;
const SECTIONS = [2.5, 4, 6, 10, 16, 25, 35, 50];
const CALIBRES = [20, 25, 32, 40, 50, 63, 80, 100, 125];
// UTE C 15-722 tableau 2 pour 20 A et 40 A ; valeurs usuelles pour les autres calibres
const SECTION_MIN: Record<number, number> = { 20: 2.5, 25: 4, 32: 6, 40: 10, 50: 16, 63: 16, 80: 25, 100: 35, 125: 50 };
const KW: Record<string, number> = { '3.7': 3.7, '7.4': 7.4, '11': 11, '22': 22 };
const ASSIGNE: Record<string, number> = { '3.7': 16, '7.4': 32, '11': 16, '22': 32 };
const DISPO_KVA: Record<string, number> = { '3': 3, '6': 6, '9': 9, '12': 12, '18+': 18 };

// Sous-sections des modèles (mêmes noms que les éléments de l'appli, + Prestations hors relevé)
export const SOUS_SECTIONS = [
  'Raccordement', 'Cheminement', 'TD IRVE / coffret', 'Borne', 'Prise renforcée', 'Communication', 'Boîte de dérivation', 'Autre', 'Prestations',
] as const;
export type SousSection = typeof SOUS_SECTIONS[number];
export type LigneDevis = { ss: SousSection; ref: string; qte: number | null; unite: string; detail?: string };

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
const POSE_ARTERE: Record<string, string> = { distCheminCables: 'LIA-CDC', distTubeApparent: 'LIA-TUBE', distTranchee: 'LIA-ENT' };
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

type Circuit = { tri: boolean; courant: number; calibre: number; sectionMin: number };

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
function aval(id: string, els: ElementReleve[], vus = new Set<string>()): { courant: number; tri: boolean } {
  if (vus.has(id)) return { courant: 0, tri: false };
  vus.add(id);
  const e = els.find((x) => x.id === id);
  if (!e) return { courant: 0, tri: false };
  if (e.nature === 'borne' || e.nature === 'priseRenforcee') {
    const k = cleKw(e);
    return { courant: ASSIGNE[k] ?? 0, tri: k === '11' || k === '22' };
  }
  let courant = 0;
  let tri = false;
  for (const c of els.filter((x) => x.nature === 'cheminement' && x.depart === id && x.arrivee && typeDe(x) !== 'liaisonData')) {
    const a = aval(String(c.arrivee), els, vus);
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
  const cible = texte(racc?.valeurs.raccordementCible);
  const bornes = els.filter((e) => e.nature === 'borne' || e.nature === 'priseRenforcee');
  const kwBornes = bornes.reduce((s, e) => s + kwDe(e), 0);
  const gestion = els.some((e) => e.nature === 'tdIrveCoffret' && texte(e.valeurs.gestionCharge) && texte(e.valeurs.gestionCharge) !== 'aucune');

  // En-tête
  const quand = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });
  const entete = [
    `📋 Brief de chiffrage · ${b.scenarioNom}`,
    `Calculé par le site au clic « Prêt à chiffrer » (${quand}). Les puissances et sections sont à valider avant l'envoi du devis.`,
    '',
    `Segment : ${seg ? LIBELLE_SEGMENT[seg] : 'à renseigner'}`,
    ...(cop || b.nbPlaces ? [`Places de parking : ${b.nbPlaces ?? 'à renseigner'}`] : []),
    `Zone de déplacement : ${b.zone ?? 'à renseigner'}`,
  ];
  if (!b.zone) alertes.push('Zone de déplacement non renseignée (scénario et fiche)');

  // Puissance
  const puissance: string[] = ['', '⚡ PUISSANCE'];
  if (racc) {
    puissance.push(`Source : ${libelle('sourceRaccordement', source) || 'à renseigner'} · ${libelle('typeRaccordement', racc.valeurs.typeRaccordement) || 'mono ou tri à renseigner'}${dispo !== null ? ` · puissance dispo ${libelle('puissanceDispo', dispoCle)}` : ''}`);
    if (cible && cible !== 'inchange') puissance.push(`Raccordement cible : ${libelle('raccordementCible', cible)}`);
  }
  if (bornes.length) {
    puissance.push(`Points de charge : ${bornes.length}, ${fr(kwBornes)} kW au total (simultanéité 1, NF C 15-100-7-722 §722.311${gestion ? ', réductible grâce à la gestion de charge' : ''})`);
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
        if (dispo !== null) {
          demandee = dispo + r;
          puissance.push(`Puissance cible du PDL services généraux : ${fr(dispo)} kVA (abonnement actuel) + ${fr(r)} kVA = ${fr(demandee)} kVA, à valider (abonnement souscrit ≠ consommation réelle)`);
        } else puissance.push('Puissance cible du PDL services généraux : abonnement actuel à renseigner, + réserve IRVE');
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
    demandee = kwBornes;
    puissance.push(`Puissance à demander à Enedis (PDL dédié) : ${fr(kwBornes)} kVA (somme des puissances visées), à valider`);
  } else if (dispo !== null && dispoCle !== '18+' && kwBornes > dispo) {
    alertes.push(`Points de charge (${fr(kwBornes)} kW) au-dessus de la puissance dispo (${fr(dispo)} kVA) : gestion de charge ou augmentation de puissance à prévoir`);
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
          v('raccordementCible') && `cible ${v('raccordementCible')}`, e.valeurs.terre !== null && e.valeurs.terre !== undefined ? `terre ${fr(Number(e.valeurs.terre))} Ω` : ''];
        break;
      case 'tdIrveCoffret':
        d = [v('coffretIrve'), v('gestionCharge') && `gestion de charge : ${v('gestionCharge')}`, v('mesurePuissance') && `mesure : ${v('mesurePuissance')}`,
          v('emplacement') && `emplacement : ${v('emplacement')}`];
        break;
      case 'borne':
        d = [v('puissanceVisee'), v('marqueBorne'), v('modeleBorne'), v('supportBorne')];
        break;
      case 'priseRenforcee':
        d = ['3,7 kW', v('marqueBorne'), v('supportBorne')];
        break;
      case 'communication':
        d = [v('connectivite'), v('reseau') && `réseau : ${v('reseau')}`, v('tailleHub')];
        break;
      case 'boiteDerivation':
        d = ['borniers + switch, 4 PDC'];
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
    if (type === 'liaisonData') return { c, type, long, ci: null, forcee, section: null, fixe: true, infra: false };
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
      const a = aval(String(c.arrivee), els);
      if (a.courant > 0) ci = circuit(a.courant, a.tri);
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
      protections.push(`Protection en tête : ${nomDe(c.depart)} → ${nomDe(c.arrivee)} fait ${fr(long)} m. Au-delà de 3 m, la protection ne peut pas être déportée au coffret (NF C 15-100 433.2.1 et 434.2.2.1) : disjoncteur au départ du tableau à prévoir`);
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

  // 4. Lignes à saisir (table de correspondance du 01/11)
  const { lignes, aFaire } = lignesDevis(b, calculs, alertes);
  const priseSeule = els.some((e) => e.nature === 'priseRenforcee') && !els.some((e) => e.nature === 'borne');
  const choix = modelesDuScenario(seg, source, b.typeClient ?? null, priseSeule);
  alertes.push(...choix.alertes);
  const saisie: string[] = ['', '🧾 À SAISIR DANS COSTRUCTOR'];
  if (!choix.devis.length) saisie.push('Modèle : à choisir (voir les alertes)');
  choix.devis.forEach((d, i) => {
    const titre = choix.devis.length > 1 ? `Devis ${i + 1}` : 'Modèle';
    saisie.push(`${titre} : copier « ${d.modele.nom} » (TVA ${d.modele.tva}${d.role ? `, ${d.role}` : ''}) : ${lienModele(d.modele)}`);
  });
  if (choix.devis.length > 1) saisie.push(`Les lignes ci-dessous vont dans le devis ${choix.devis.length} (travaux).`);
  saisie.push("Règle : référence déjà dans la sous-section du modèle → mettre la quantité ci-dessous ; sinon l'ajouter. Ouvrage du modèle absent de la liste → à vérifier, le retirer s'il ne correspond pas au relevé. Les textes du modèle restent.");
  for (const ss of SOUS_SECTIONS) {
    const ls = lignes.filter((l) => l.ss === ss);
    if (!ls.length) continue;
    saisie.push('', ss);
    for (const l of ls) {
      const q = l.qte === null ? ' (texte)' : ` × ${fr(l.qte)}${l.unite ? ` ${l.unite}` : ''}`;
      saisie.push(`• ${l.ref}${q}${l.detail ? ` · ${l.detail}` : ''}`);
    }
  }
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
  fin.push('', `Méthode : NF C 15-100 art. 525, u = b (ρ1 L / S cos φ + λ L sin φ) IB, ρ1 cuivre 0,0225 Ω·mm²/m (service normal), λ 0,08 mΩ/m, cos φ = 1 (charge VE), IB = courant assigné, b = 2 mono / 1 tri, rapportée à 230 V. Limite ${LIMITE_CUMULEE} % cumulée depuis le raccordement relevé (tableau 52W, autres usages, réseau BT public), chute en amont non comptée. Protections et sections minimales : guide UTE C 15-722 tableau 2. Artère COP : budget CHARGéO de ${BUDGET_ARTERE} %.`);

  const detail = ['', '———— DÉTAIL DES CALCULS ————'];
  return {
    texte: [...entete, ...saisie, ...detail, ...puissance, ...materiel, ...chemins, ...recap, ...fin].join('\n'),
    alertes,
    lignes,
    aFaire,
  };
}

// Lignes « référence × quantité » par sous-section, à partir des éléments et des sections calculées.
// Table de correspondance du 01/11 : R (raccordement), C (cheminement), T (TD IRVE / coffret), BD, B (borne), P (prise),
// K (communication), A (autre), G (prestations).
function lignesDevis(b: EntreeBrief, calculs: Calcul[], alertes: string[]): { lignes: LigneDevis[]; aFaire: string[] } {
  const els = b.elements;
  const seg = b.segment;
  const cop = seg === 'COP';
  const ric = seg === 'RIC';
  const lignes: LigneDevis[] = [];
  const aFaire: string[] = [];
  const ajouter = (ss: SousSection, ref: string, qte: number, unite = '', detail?: string) => {
    if (!(qte > 0)) return;
    const meme = !detail ? lignes.find((l) => l.ss === ss && l.ref === ref && !l.detail && l.qte !== null) : undefined;
    if (meme && meme.qte !== null) meme.qte += qte;
    else lignes.push({ ss, ref, qte, unite, detail });
  };
  const texteFixe = (ss: SousSection, ref: string, detail?: string) => {
    if (!lignes.some((l) => l.ss === ss && l.ref === ref)) lignes.push({ ss, ref, qte: null, unite: 'texte', detail });
  };
  const racc = els.find((e) => e.nature === 'raccordement');
  const source = texte(racc?.valeurs.sourceRaccordement);
  const triRacc = texte(racc?.valeurs.typeRaccordement) === 'tri';
  const pdl = source === 'pdlDedie';
  const sg = source === 'tgbtServicesGeneraux';
  const coms = els.filter((e) => e.nature === 'communication');
  const connectivite = texte(coms[0]?.valeurs.connectivite);
  const tailleHub = coms.map((e) => texte(e.valeurs.tailleHub)).find(Boolean) || '';

  // Raccordement (R1 à R10)
  if (racc) {
    if (sg) {
      if (cop || seg === 'PAR') ajouter('Raccordement', `INFRA-COP-COMPTAGE-${triRacc ? 'TRI' : 'MONO'}`, 1); // R3, D5, D6
      else aFaire.push('Départ au TGBT services généraux : DEPART-TGBT-TRI-40 seulement si Mathieu le valide (R2)');
      texteFixe('Raccordement', 'JUR-COUPURE-TGBT');
    }
    if (pdl) aFaire.push('PDL dédié : ADMIN-CREATION-PDL est dans le devis AMO séparé, pas dans ce devis (ni compteur ni comptage, D5 et D6)');
    if (source === 'colonneEnedis') {
      texteFixe('Raccordement', 'INFO-RACC-LINKY-ENEDIS'); // R6, D13
      texteFixe('Raccordement', 'JUR-CONSUEL-PDL-ENEDIS');
    }
    const cible = texte(racc.valeurs.raccordementCible);
    if (cible && cible !== 'inchange') { // R7
      ajouter('Raccordement', 'ADMIN-AUGM-PDL', 1);
      texteFixe('Raccordement', 'JUR-AUGM-PUISSANCE');
    }
    const etat = texte(racc.valeurs.etatTableau);
    if (etat === 'aRemanier' || etat === 'aRemplacer') { // R8
      texteFixe('Raccordement', 'JUR-RESERVE-EXISTANT');
      aFaire.push(`Tableau ${etat === 'aRemplacer' ? 'à remplacer' : 'à remanier'} : remise à niveau à chiffrer à la main`);
    }
    const terre = racc.valeurs.terre;
    if (terre !== null && terre !== undefined && terre !== '' && Number(terre) > 100) { // R9, R10
      ajouter('Raccordement', 'TERRE-RENF', 1, '', `terre ${fr(Number(terre))} Ω`);
      aFaire.push('Terre > 100 Ω : TERRE-RENF si une prise de terre existe, sinon TERRE-PIQ à la place');
    }
  }

  // Cheminement (C1 à C13)
  let tranchee = false;
  let facade = false;
  for (const k of calculs) {
    const { c, type, long } = k;
    if (long <= 0) continue;
    const dep = els.find((e) => e.id === c.depart);
    const arr = els.find((e) => e.id === c.arrivee);
    if (texte(c.valeurs.passageFacade) === 'oui') facade = true;
    if (type === 'liaisonData') { // C10 à C12
      const mesure = dep?.nature === 'raccordement' && arr?.nature === 'tdIrveCoffret' ? texte(arr.valeurs.mesurePuissance) : '';
      const ref = mesure === 'compteurModbus' ? 'LIA-DATA-MOD' : mesure === 'ticLinky' ? 'LIA-DATA-TIC' : 'LIA-DATA-RJ45';
      const enTranchee = Number(c.valeurs.distTranchee) || 0;
      ajouter('Cheminement', ref, metres(long - enTranchee), 'ml', c.nom);
      if (enTranchee > 0) {
        tranchee = true;
        if (ref === 'LIA-DATA-RJ45') ajouter('Cheminement', 'LIA-ENT-RJ45', metres(enTranchee), 'ml', `${c.nom} (en tranchée)`);
        else ajouter('Cheminement', ref, metres(enTranchee), 'ml', `${c.nom} (en tranchée)`);
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
          if (CABLES[famille]?.includes(code)) ajouter('Cheminement', ref, metres(m), 'ml', detail);
          else aFaire.push(`${detail} : ${ref} × ${metres(m)} ml n'existe pas en bibliothèque${code === '3G35' ? ' (pas de 3G35 : passer en triphasé, D14)' : ''}`);
        };
        if (k.infra) {
          // C5 : boîte de dérivation → coffret, toujours en dérivation (forfait 5 m pré-rempli + dépassement)
          poser('LIA-DERIV', long, `${c.nom}${noteSection}`);
          // Câble data posé avec la dérivation, comme dans le modèle RIC
          if (connectivite === 'switchBoiteDerivation') ajouter('Cheminement', 'LIA-DATA-RJ45', metres(long), 'ml', `${c.nom} (data, avec la dérivation)`);
        } else {
          const poses = type === 'artere' ? POSE_ARTERE : POSE_ALIMENTATION;
          for (const d of DISTANCES) {
            const m = Number(c.valeurs[d]) || 0;
            if (m <= 0) continue;
            const famille = poses[d];
            const mode = SAISIES[d].libelle.replace(' (m)', '').toLowerCase();
            if (!famille) { aFaire.push(`${c.nom} : ${mode} ${fr(m)} m en artère, pas d'ouvrage d'artère pour ce mode de pose`); continue; }
            poser(famille, m, `${c.nom}, ${mode}`);
            if (d === 'distTranchee') tranchee = true;
            if (type === 'artere' && d === 'distCheminCables') ajouter('Cheminement', 'LIA-DATA-RJ45', metres(m), 'ml', `${c.nom}, câble data dans le chemin de câbles (D16)`);
          }
        }
      }
      // Percements (C13) : variante Ø40 dès 16 mm²
      for (const p of PERCEMENTS) {
        const n = Number(c.valeurs[p]) || 0;
        if (n > 0) ajouter('Cheminement', `${PERCEMENT_REF[p]}${(s ?? 0) >= 16 ? '-40' : ''}`, Math.ceil(n));
      }
      continue;
    }
    for (const p of PERCEMENTS) {
      const n = Number(c.valeurs[p]) || 0;
      if (n > 0) ajouter('Cheminement', PERCEMENT_REF[p], Math.ceil(n));
    }
  }
  if (tranchee) texteFixe('Cheminement', 'INFO-TRANCHEE-TERRASSIER');
  if (facade) texteFixe('Cheminement', 'JUR-AUTORISATION-FACADE');

  // TD IRVE / coffret (T1 à T10)
  for (const td of els.filter((e) => e.nature === 'tdIrveCoffret')) {
    const ref = texte(td.valeurs.coffretIrve);
    const gestionTd = texte(td.valeurs.gestionCharge);
    const mesure = gestionTd && gestionTd !== 'aucune' ? texte(td.valeurs.mesurePuissance) : '';
    if (cop) ajouter('TD IRVE / coffret', `INFRA-COP-TETE-${triRacc ? 'TRI' : 'MONO'}`, 1); // T7
    else if (ref) ajouter('TD IRVE / coffret', ref, 1); // T1, T2
    else aFaire.push(`${td.nom} : référence du coffret à choisir`);
    // RIC : le pilotage est celui de l'infra collective, rien à ajouter au devis du résident
    if (gestionTd === 'gestionnaireGrappe' && !estCoffretTd(ref) && !ric) { // T5, K5
      if (tailleHub) ajouter('TD IRVE / coffret', `INFRA-COP-PILOTAGE-${tailleHub}`, 1);
      else aFaire.push(`${td.nom} : gestionnaire de grappe sans taille de HUB (élément Communication) : INFRA-COP-PILOTAGE-10, -20 ou -150 à choisir`);
    }
    if (gestionTd === 'aucune') texteFixe('TD IRVE / coffret', 'JUR-PUISSANCE-SANS-DELESTAGE'); // T6
    if (ref.startsWith('COFF-')) { // T3, T4 (D1)
      if (mesure === 'compteurModbus' && !ref.endsWith('-MOD') && ref !== 'COFF-MONO-3K') alertes.push(`${td.nom} : compteur Modbus mais coffret ${ref} sans -MOD`);
      if (mesure === 'ticLinky' && ref.endsWith('-MOD')) alertes.push(`${td.nom} : mesure TIC Linky mais coffret ${ref} : prendre le coffret simple (D1)`);
    }
    if (pdl && mesure) alertes.push(`${td.nom} : PDL dédié, ni compteur ni comptage (D5, D6) : la mesure de puissance et sa liaison data sont à retirer`);
    if (seg === 'PAR' && sg && !estCoffretTd(ref) && !ref.endsWith('-MOD')) alertes.push(`${td.nom} : PAR sur services généraux, coffret -MOD (compteur Modbus) attendu (D6)`);
  }
  if (estCoffretTd(els.find((e) => e.nature === 'tdIrveCoffret')?.valeurs.coffretIrve) && seg && !['PAR', 'FLT', 'TER'].includes(seg)) {
    alertes.push(`TD de borne partagée en ${seg} : proposé en PAR, FLT et TER seulement (D15)`);
  }

  // Boîte de dérivation (BD1)
  ajouter('Boîte de dérivation', 'INFRA-COP-BOITE', els.filter((e) => e.nature === 'boiteDerivation').length);

  // Borne (B1 à B17)
  let points = 0;
  let wittyPlus = 0;
  for (const bo of els.filter((e) => e.nature === 'borne')) {
    const ligne = ligneBorne(bo.valeurs.modeleBorne);
    if (!ligne) { aFaire.push(`${bo.nom} : modèle de borne à choisir`); points += 1; continue; }
    if (!modeleCoherent(bo.valeurs)) alertes.push(`${bo.nom} : ${ligne.ref} ne correspond pas à la marque ou à la puissance saisie`);
    ajouter('Borne', ligne.ref, 1);
    points += ligne.points;
    if (ligne.ref === 'BORNE-HAG-WPLUS-22') wittyPlus += 1;
    if (texte(bo.valeurs.supportBorne) === 'surPied') {
      if (ligne.pied) ajouter('Borne', ligne.pied, 1);
      else aFaire.push(`${bo.nom} : pied ${libelle('marqueBorne', bo.valeurs.marqueBorne) || ''} à créer en bibliothèque (seuls les pieds Peblar existent, D4)`);
    }
  }
  if (points > 0) { // B15 : 1 mise en service par point de charge
    const supervise = seg === 'PAR' || seg === 'FLT' || seg === 'TER' || (ric && source !== 'colonneEnedis');
    ajouter('Borne', supervise ? 'SERV-SETUP-PDC' : 'SERV-SETUP-PDC-LOCAL', points);
  }
  for (const a of els.filter((e) => e.nature === 'autre' && estDepose(e.nom))) { // B16
    ajouter('Borne', 'DEPOSE-BORNE', Number(a.valeurs.quantite) || 1);
  }

  // Prise renforcée (P1 à P5)
  for (const p of els.filter((e) => e.nature === 'priseRenforcee')) {
    const ref = PRISES[texte(p.valeurs.marqueBorne)];
    if (ref) ajouter('Prise renforcée', ref, 1);
    else aFaire.push(`${p.nom} : marque de prise à choisir (Legrand, Hager ou Schneider)`);
  }

  // Communication (K1 à K7)
  for (const com of coms) {
    if (texte(com.valeurs.connectivite) === 'modemDeporte') ajouter('Communication', 'INFRA-COP-ROUTEUR', 1); // K2
    if (texte(com.valeurs.reseau) === 'cableRequis' && !els.some((e) => e.nature === 'cheminement' && typeDe(e) === 'liaisonData' && e.depart === com.id)) {
      alertes.push(`${com.nom} : câble requis mais aucune liaison data saisie (K6)`);
    }
  }
  if (wittyPlus > 0 && connectivite === 'simIntegree') ajouter('Communication', 'OPT-4G-HAG', wittyPlus); // K1
  const supervision: Partial<Record<Segment, string>> = {
    PAR: 'SERV-SETUP-SUPERVISION-REFACT', FLT: 'SERV-SETUP-SUPERVISION', TER: 'SERV-SETUP-SUPERVISION-REFACT', COP: 'SERV-SETUP-SUPERVISION',
  };
  if (seg && supervision[seg]) ajouter('Communication', supervision[seg] as string, 1); // K7, D8 ; COP : 01/11 (étape 3)

  // Autre (A1), hors dépose (rangée en Borne)
  for (const a of els.filter((e) => e.nature === 'autre' && !estDepose(e.nom))) {
    const n = normal(a.nom);
    const qte = Number(a.valeurs.quantite) || 1;
    const ref = n.includes('arceau') ? 'OPT-ARCEAU-PROT'
      : n.includes('badge') && (n.includes('itinerance') || n.includes('emsp')) ? 'OPT-BADGE-EMSP'
        : n.includes('badge') && n.includes('nominati') ? 'SERV-BADGE'
          : n.includes('badge') ? 'OPT-BADGE-LOCAL' : '';
    if (ref) ajouter('Autre', ref, qte, ref.startsWith('OPT-BADGE') ? 'u' : '', a.nom);
    else aFaire.push(`${a.nom} (× ${fr(qte)}) : option à choisir à la main`);
  }

  // Prestations (G1 à G5)
  if (seg === 'FLT' || seg === 'TER') ajouter('Prestations', 'ADMIN-CONSUEL-VERT', 1);
  else if (seg === 'RES' || seg === 'DAP' || seg === 'PAR' || seg === 'COP' || (ric && source === 'colonneEnedis')) ajouter('Prestations', 'ADMIN-CONSUEL', 1);
  if (cop) texteFixe('Prestations', 'JUR-CONSUEL-COPRO');
  if (seg === 'DAP') ajouter('Prestations', 'ADMIN-DAP', 1);
  if (cop) { ajouter('Prestations', 'SERV-ETUDE-COP', 1); ajouter('Prestations', 'ADMIN-CONTROLE', 1); }
  const advenir = cop ? 'INFO-ADVENIR-INFRA' : seg === 'PAR' ? 'INFO-ADVENIR-PARTAGE' : ric || (seg === 'DAP' && sg) ? 'INFO-ADVENIR-INDIVIDUEL' : '';
  if (advenir) {
    ajouter('Prestations', 'ADMIN-ADVENIR', 1);
    texteFixe('Prestations', advenir, 'montant estimé et reste à charge TTC à compléter');
  }
  if (seg === 'DAP' && !sg) aFaire.push('DAP hors services généraux : pas d’ADVENIR (éligible sur les services généraux seulement)');
  const zone = b.zone && ['Z1', 'Z2', 'Z3'].includes(b.zone) ? b.zone : 'Z1';
  ajouter('Prestations', `LOG-DEP-${zone}`, 1, '', `1 par jour de pose (environ 7 h sur place)${b.zone ? '' : ', zone à renseigner'}, à ajuster (D9)`);

  return { lignes, aFaire };
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
  const segment = cleOption(OPTIONS.segment, indexMenu(scenario, CHAMPS.segment)) as Segment | null;
  const typeClient = fiche ? ((cleOption(OPTIONS.typeClient, indexMenu(fiche, CHAMPS.typeClient)) as string | null) ?? null) : null;
  const brief = genererBrief({
    scenarioNom: String(scenario?.name || ''),
    segment,
    nbPlaces: places(scenario) ?? places(fiche),
    zone: zone(scenario) ?? zone(fiche),
    elements,
    typeClient,
  });
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(String(scenario.id))}/comment`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment_text: brief.texte, notify_all: false }),
  });
  if (!res.ok) console.error(`Brief de chiffrage refusé (${res.status}) sur ${scenario?.id}`, await res.text().catch(() => ''));
  return { ok: res.ok, alertes: brief.alertes.length + brief.aFaire.length };
}
