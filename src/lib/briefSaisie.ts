// Brief de chiffrage : consignes de saisie de chaque devis (Phase 8, étape 7, recette du 02/11/2026).
// Mathieu (02/11, 18 h 41 : « est-ce qu'on ne peut pas mettre toutes les informations dans le brief ? », accord à 18 h 46) :
// pour chaque devis, le brief donne le nom exact à coller, la TVA à poser sur les lignes ajoutées (Costructor met 20 %
// par défaut sur une ligne de la bibliothèque : écart 5 de la recette), la valeur de chaque crochet de l'en-tête, la
// prime ADVENIR et la liste de contrôle avant finalisation. Fichier neutre, sans appel réseau.
// 02/11, 19 h 26 (Mathieu : « il manque les champs de l'en-tête du devis ») : tous les crochets des 14 en-têtes (CROCHETS,
// relus dans Costructor le 02/11 à 19 h 30) reçoivent leur valeur ; [emplacements] vient du nouveau champ
// 📌 Emplacement de la borne (choix de Mathieu du 02/11 à 19 h 57). Un en-tête modifié dans Costructor se reporte ici.
// Sources : compétences Devis après relevé, Textes et mentions (conditions de paiement, mentions TVA), Prime ADVENIR, et
// advenir.mobi (point de recharge partagé : 50 % plafonné à 1 660 € HT par point, surprime équipements et cheminement
// jusqu'à 8 000 € HT, en vigueur depuis le 01/04/2026, relu le 02/11/2026).
// 03/11/2026 (passe 2 de la recette sans IA) :
// - nom du devis court et unique : « Scénario A · source · matériel », le devis est retrouvé par le client de la fiche
//   (écart 7) ;
// - emplacements : ponctuation de fin retirée, « et » avant le dernier (écart 10, « sous-sol., Place 13 ») ;
// - ADVENIR : les 3 valeurs du texte (TTC réglé en totalité, prime estimée, reste à charge estimé en TTC, D7) sont
//   calculées sur les lignes du brief et les prix de la bibliothèque lus au clic « Prêt à chiffrer » ; PAR : points de
//   recharge (50 %, 1 660 € HT par point) + surprime équipements et cheminement (TD, câbles, data, routeur : 50 %, 8 000 €
//   HT, décision du 03/11 à 10 h 15) ; COP : 50 % plafonné, selon la date du permis. Un prix manquant : la formule est
//   donnée à la place, rien n'est inventé (écarts 4, 9, 34) ;
// - T1 (21 h 16) : devis travaux PAR et COP sur PDL dédié, phrase « jusqu'à 3 000 € HT pour la création du point de
//   livraison, sous réserve » dans le texte ADVENIR, jamais comptée dans la prime estimée ni dans le reste à charge ;
//   l'AMO reste sans aide (D17) ;
// - COP sur services généraux : la phrase « pas besoin d'augmenter » de l'en-tête suit le calcul de la puissance cible
//   (écart 53).
// 04/11/2026, passe 3 cas 1 (choix de Mathieu vers 22 h 27) : la mise en service de la supervision (avec ou sans
// refacturation) est comptée avec les points de recharge, plus dans la surprime équipements et cheminement.
// 04/11/2026 (modèles V2) : le DAP a deux modèles, sur services généraux (DAP_SG, ADVENIR individuel) et sur le tableau du
// logement (DAP_HSG, sans ADVENIR : son en-tête porte déjà la bonne phrase, plus rien à remplacer, écart 42).
import type { Segment } from '@/lib/champsClickUp';
import type { CleModele, ModeleDevis, Zone } from '@/lib/modelesDevis';
import { DISTANCES, SAISIES, type ElementReleve } from '@/lib/releveElements';

// Ligne à saisir (même forme que LigneDevis de src/lib/briefChiffrage.ts, sans import circulaire)
export type LigneSaisie = { zone: Zone; ref: string; qte: number | null };

export type ContexteSaisie = {
  ficheNom: string | null;
  scenarioNom: string;
  segment: Segment | null;
  source: string; // clé de 🔌 Source de raccordement
  tri: boolean;
  materiel: string; // pour le nom du devis, ex. « 2 bornes 22 kW »
  nombreBornes: number;
  marquePuissance: string; // pour l'en-tête, ex. « Schneider Charge Pro, 22 kW »
  points: number; // points de charge (borne double = 2)
  puissanceKva: number | null; // puissance à demander à Enedis (PDL dédié) ou cible
  dateVisite: string | null; // JJ/MM/AAAA
  plafondInfra: number | null; // COP : plafond ADVENIR infra en € HT
  facade: boolean; // un cheminement passe en façade
  elements: ElementReleve[]; // relevé du scénario (pose, prise, emplacements)
  augmentation?: boolean | null; // COP sur services généraux : augmentation de puissance (null = inconnu)
  datePermis?: number | null; // 🏛️ Date dépôt permis (ms)
  lignes?: LigneSaisie[]; // lignes du devis principal (pour le calcul ADVENIR)
  prix?: Map<string, number> | null; // prix de vente HT de la bibliothèque, par référence
};

const SOURCE_COURTE: Record<string, string> = {
  tableauIndividuel: 'Tableau', tgbtServicesGeneraux: 'SG', pdlDedie: 'PDL dédié', infraCollective: 'Infra CHARGéO', colonneEnedis: 'Colonne Enedis',
};
const fr = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const euros = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
const euros2 = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const arrondi = (n: number) => Math.round(n * 100) / 100;
const texte = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const metres = (m: number) => Math.ceil(m - 1e-9);
const estDap = (m: ModeleDevis) => m.cle === 'DAP_SG' || m.cle === 'DAP_HSG';
// « Scénario A : Borne partagée » → « Scénario A »
const lettre = (nom: string) => nom.match(/Scénario\s+[A-Z]+/)?.[0] ?? 'Scénario';

// Nom court et unique (écart 7) : « Scénario A · SG · Borne 7,4 kW », « Scénario A · PDL dédié · AMO création PDL »
export function nomDevis(m: ModeleDevis, c: ContexteSaisie): string {
  const fin = m.cle === 'AMO_PDL' ? 'PDL dédié · AMO création PDL'
    : m.cle === 'AMO_COLONNE' ? 'Colonne Enedis · AMO colonne'
      : `${SOURCE_COURTE[c.source] ?? '[source]'} · ${c.materiel}`;
  return `${lettre(c.scenarioNom)} · ${fin}`;
}

// Crochets de l'en-tête de chaque modèle, dans l'ordre du texte (en-têtes lus dans Costructor le 02/11/2026, 19 h 30,
// gardés par les V2 du 04/11)
const PAR_CROCHETS = ['[Nombre]', '[marque, puissance]', '[emplacements]', '[date]'];
const CROCHETS: Record<CleModele, string[]> = {
  RES: ['[marque, puissance]', '[mode de pose, longueur]', '[date]'],
  RES_PRISE: ['[marque]', '[mode de pose, longueur]', '[date]'],
  DAP_SG: ['[marque, puissance]', '[raccordement]', '[mode de pose, longueur]', '[date]'],
  DAP_HSG: ['[marque, puissance]', '[mode de pose, longueur]', '[date]'],
  PAR_SG: PAR_CROCHETS,
  PAR_PDL: PAR_CROCHETS,
  COP_SG: ['[kVA]', '[date]'],
  COP_PDL: ['[kVA]', '[date]'],
  RIC_TARIF_TYPE: ['[marque, puissance]'],
  RIC_RESIDENT: ['[marque, puissance]', '[date]'],
  RIC_COLONNE: ['[marque, puissance]', '[date]'],
  FLT: ['[votre flotte]', ...PAR_CROCHETS],
  TER: ['[votre établissement]', ...PAR_CROCHETS],
  AMO_PDL: ['[puissance kVA, mono ou tri]', '[date]'],
  AMO_COLONNE: ['[date]'],
};

// Cheminements d'alimentation du scénario, par mode de pose : « en tube apparent, 11 m »
function poseLongueur(els: ElementReleve[]): string {
  const t: Record<string, number> = {};
  const alim = els.filter((e) => e.nature === 'cheminement' && (e.typeCheminement || texte(e.valeurs.typeCheminement) || 'alimentation') === 'alimentation');
  for (const c of alim) {
    for (const d of DISTANCES) {
      const m = Number(c.valeurs[d]) || 0;
      if (m > 0) t[d] = (t[d] || 0) + m;
    }
  }
  const modes = DISTANCES.filter((d) => (t[d] || 0) > 0);
  if (!modes.length) return 'mode de pose et longueur à relever';
  const lib = (d: string) => SAISIES[d].libelle.replace(' (m)', '').toLowerCase();
  const total = metres(modes.reduce((s, d) => s + t[d], 0));
  return modes.length === 1
    ? `en ${lib(modes[0])}, ${total} m`
    : `en ${modes.map((d) => `${lib(d)} ${metres(t[d])} m`).join(' et ')} (${total} m)`;
}

function marquePrise(els: ElementReleve[]): string {
  const cle = texte(els.find((e) => e.nature === 'priseRenforcee')?.valeurs.marqueBorne);
  return SAISIES.marqueBorne.options?.find((o) => o.cle === cle)?.libelle ?? 'marque de la prise à choisir au relevé';
}

// 📌 Emplacement de la borne, borne par borne, sans doublon ni ponctuation de fin, « et » avant le dernier (écart 10)
export function emplacements(els: ElementReleve[]): string {
  const liste = els.filter((e) => e.nature === 'borne')
    .map((e) => texte(e.valeurs.emplacementBorne).trim().replace(/[\s.,;:!]+$/u, ''))
    .filter(Boolean)
    // Après le premier, initiale en minuscule (« Place 13 » → « place 13 »), sauf un sigle (« RDC »)
    .map((s, i) => (i > 0 && /^\p{Lu}\p{Ll}/u.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s));
  const uniques = Array.from(new Set(liste));
  if (uniques.length <= 1) return uniques[0] ?? '';
  return `${uniques.slice(0, -1).join(', ')} et ${uniques[uniques.length - 1]}`;
}

function valeurCrochet(cr: string, c: ContexteSaisie): string {
  switch (cr) {
    case '[Nombre]':
      return c.nombreBornes > 0 ? String(c.nombreBornes) : 'nombre de bornes à relever';
    case '[marque, puissance]':
      return c.marquePuissance || 'borne à choisir au relevé';
    case '[marque]':
      return marquePrise(c.elements);
    case '[mode de pose, longueur]':
      return poseLongueur(c.elements);
    case '[raccordement]':
      return c.source === 'tgbtServicesGeneraux' ? 'les services généraux de la copropriété'
        : c.source === 'tableauIndividuel' ? 'votre propre compteur' : 'source de raccordement à relever';
    case '[kVA]':
      return c.puissanceKva !== null ? `${fr(c.puissanceKva)} kVA` : 'kVA à calculer (places de parking ou abonnement à renseigner)';
    case '[puissance kVA, mono ou tri]':
      return `${c.puissanceKva !== null ? `${fr(c.puissanceKva)} kVA` : 'puissance à renseigner'}, ${c.tri ? 'triphasé' : 'monophasé'} (à valider)`;
    case '[votre flotte]':
      return c.ficheNom ? `la flotte de ${c.ficheNom}` : 'votre flotte';
    case '[votre établissement]':
      return c.ficheNom || 'votre établissement';
    case '[emplacements]':
      return emplacements(c.elements) || "emplacement à noter sur chaque borne dans l'appli (📌 Emplacement de la borne)";
    case '[date]':
      return c.dateVisite ?? 'date de la visite (📅 Date Visite Technique vide sur la fiche)';
    default:
      return 'à écrire';
  }
}

// Textes et mentions (31/10 et 02/11/2026)
const CONDITIONS_STANDARD = 'Acompte de 50% à la signature. Solde à réception de facture. Règlement par virement bancaire.';
const CONDITIONS_AG = "Acompte de 50% à la signature, exigible après autorisation des travaux par l'assemblée générale. Solde à réception de facture. Règlement par virement bancaire.";
const CONDITIONS_FACADE = "Acompte de 50% à la signature, exigible après autorisation des travaux en façade par l'assemblée générale. Solde à réception de facture. Règlement par virement bancaire.";
const CONDITIONS_AMO = 'Règlement de 100 % à la signature. Règlement par virement bancaire.';

function conditions(m: ModeleDevis, c: ContexteSaisie): string {
  if (m.cle.startsWith('AMO')) return CONDITIONS_AMO;
  if (m.cle.startsWith('COP') || m.cle.startsWith('PAR')) return CONDITIONS_AG;
  if (estDap(m) && c.facade) return CONDITIONS_FACADE;
  return CONDITIONS_STANDARD;
}

const MENTION_TVA: Record<string, string> = {
  '5,5 %': 'attestation TVA 5,5 % (article 278-0 bis du CGI, texte de Mathieu)',
  '10 %': 'attestation TVA 10 % (article 257 du CGI)',
  '20 %': 'aucune attestation TVA',
};
const TAUX_TVA: Record<string, number> = { '5,5 %': 0.055, '10 %': 0.1, '20 %': 0.2 };

// ADVENIR (compétence Prime ADVENIR, D7, D17)
const PLAFOND_INDIVIDUEL = 1000;
const PLAFOND_PARTAGE = 1660;
const SURPRIME_PARTAGE = 8000;
const SURPRIME_PDL = 3000;
// PAR : zones des points de recharge (avec prestations et déplacement, valeur haute) ; le reste = équipements et cheminement
const ZONES_POINTS: Zone[] = ['borne', 'prise', 'autre', 'prestations', 'logistique'];
// Mise en service de la supervision : comptée avec les points de recharge, pas dans la surprime équipements et cheminement
// (choix de Mathieu du 04/11/2026 vers 22 h 27, passe 3 cas 1 ; la mise en service simple suit la même règle)
const REFS_POINTS = ['SERV-SETUP-SUPERVISION', 'SERV-SETUP-SUPERVISION-REFACT'];
const PERMIS_2017 = Date.UTC(2017, 0, 1);
const PERMIS_2021 = Date.UTC(2021, 2, 10);

type TypeAide = 'individuel' | 'partage' | 'infra' | null;
function typeAide(m: ModeleDevis): TypeAide {
  if (m.cle === 'PAR_SG' || m.cle === 'PAR_PDL') return 'partage';
  if (m.cle === 'COP_SG' || m.cle === 'COP_PDL') return 'infra';
  if (m.cle.startsWith('RIC')) return 'individuel';
  if (m.cle === 'DAP_SG') return 'individuel';
  return null;
}

// Total HT des lignes du devis aux prix de la bibliothèque ; null si un prix manque (la liste dit lesquels)
function totaux(c: ContexteSaisie): { ht: number; htPoints: number; htEquipements: number } | { manquants: string[] } | null {
  if (!c.prix || !c.lignes?.length) return null;
  let ht = 0;
  let htPoints = 0;
  const manquants = new Set<string>();
  for (const l of c.lignes) {
    if (l.qte === null) continue;
    const p = c.prix.get(l.ref);
    if (p === undefined) { manquants.add(l.ref); continue; }
    const v = p * l.qte;
    ht += v;
    if (ZONES_POINTS.includes(l.zone) || REFS_POINTS.includes(l.ref)) htPoints += v;
  }
  if (manquants.size) return { manquants: Array.from(manquants) };
  return { ht, htPoints, htEquipements: ht - htPoints };
}

// Prime ADVENIR : les 3 valeurs du texte, calculées si les prix sont connus, sinon la formule (écarts 4, 9, 34)
function primeAdvenir(m: ModeleDevis, c: ContexteSaisie): string[] {
  const aide = typeAide(m);
  if (!aide) {
    if (m.cle.startsWith('AMO')) return ['   Prime ADVENIR : aucune aide sur ce devis (D17)'];
    if (m.cle === 'DAP_HSG') return ["   Prime ADVENIR : aucune hors services généraux (le modèle n'a ni ADMIN-ADVENIR ni texte ADVENIR)"];
    return [];
  }
  const n = Math.max(1, c.points);
  const out: string[] = [];
  // COP : assiette selon la date du permis
  let noteCop = '';
  if (aide === 'infra') {
    if (!c.datePermis) noteCop = 'assiette selon 🏛️ Date dépôt permis (vide : à renseigner dans la carte « Le site »)';
    else if (c.datePermis >= PERMIS_2021) {
      return ['   Prime ADVENIR : permis déposé après le 10/03/2021, infrastructure non éligible. Retirer ADMIN-ADVENIR et le texte INFO-ADVENIR-INFRA'];
    } else if (c.datePermis >= PERMIS_2017) noteCop = 'permis de 2017 au 10/03/2021 : assiette réduite, montant à confirmer sur advenir.mobi';
    else noteCop = 'permis avant 2017 : assiette complète';
  }
  const plafond = aide === 'individuel' ? n * PLAFOND_INDIVIDUEL : aide === 'partage' ? n * PLAFOND_PARTAGE : c.plafondInfra;
  const t = totaux(c);
  const taux = TAUX_TVA[m.tva] ?? 0.2;
  if (t && 'ht' in t && plafond !== null) {
    const ttc = arrondi(t.ht * (1 + taux));
    let prime: number;
    let calcul: string;
    if (aide === 'partage') {
      const points = Math.min(t.htPoints * 0.5, plafond);
      const surprime = Math.min(t.htEquipements * 0.5, SURPRIME_PARTAGE);
      prime = arrondi(points + surprime);
      calcul = `points de recharge 50 % de ${euros2(t.htPoints)} HT plafonné à ${euros(plafond)} = ${euros2(points)} ; surprime équipements et cheminement 50 % de ${euros2(t.htEquipements)} HT plafonnée à ${euros(SURPRIME_PARTAGE)} = ${euros2(surprime)}`;
    } else {
      prime = arrondi(Math.min(t.ht * 0.5, plafond));
      calcul = `50 % de ${euros2(t.ht)} HT, plafonné à ${euros(plafond)}${aide === 'individuel' && n > 1 ? ` (${n} × ${euros(PLAFOND_INDIVIDUEL)})` : ''}`;
    }
    out.push(
      '   Texte ADVENIR, les 3 valeurs à saisir :',
      `      Total TTC réglé en totalité : ${euros2(ttc)} TTC`,
      `      Montant de prime estimé : ${euros2(prime)}`,
      `      Reste à charge estimé : ${euros2(arrondi(ttc - prime))} TTC`,
      `   (calcul : ${calcul} ; prix de la bibliothèque au clic « Prêt à chiffrer ». Une quantité changée au montage change ces valeurs : reprendre le total TTC du devis et refaire la soustraction${noteCop ? ` ; ${noteCop}` : ''})`,
    );
  } else {
    const pourquoi = t && 'manquants' in t ? `prix introuvable en bibliothèque pour ${t.manquants.join(', ')}` : 'prix de la bibliothèque non lus';
    const regle = aide === 'partage'
      ? `50 % du sous-total HT des points de recharge (avec la mise en service de la supervision) plafonné à ${n} × 1 660 € = ${euros(n * PLAFOND_PARTAGE)} HT, + 50 % du sous-total HT des équipements et cheminements (TD, câbles, data, routeur) plafonné à 8 000 € HT`
      : aide === 'individuel'
        ? `50 % du total HT plafonné à ${n > 1 ? `${n} × 1 000 € = ${euros(n * PLAFOND_INDIVIDUEL)}` : '1 000 €'}`
        : plafond !== null ? `50 % du total HT plafonné à ${euros(plafond)} HT` : '50 % du total HT, plafond à calculer (nombre de places à renseigner)';
    out.push(
      `   Texte ADVENIR, les 3 valeurs (${pourquoi}, à calculer sur le devis) :`,
      '      Total TTC réglé en totalité : total TTC du devis',
      `      Montant de prime estimé : ${regle}`,
      '      Reste à charge estimé : total TTC − prime, en TTC (D7)',
      ...(noteCop ? [`   (${noteCop})`] : []),
    );
  }
  // T1 : surprime création de PDL citée, jamais comptée (la contribution Enedis n'est pas connue à l'envoi)
  if (m.cle === 'PAR_PDL' || m.cle === 'COP_PDL') {
    out.push(`   Texte ADVENIR, ajouter la phrase : « jusqu'à ${SURPRIME_PDL.toLocaleString('fr-FR')} € HT pour la création du point de livraison, sous réserve » (ni dans la prime estimée, ni dans le reste à charge, T1)`);
  }
  return out;
}

// Juste sous « Nouveau devis ▾ › Créer à partir d'un modèle » : ce qu'il faut savoir avant de saisir les lignes
export function avantSaisie(m: ModeleDevis, c: ContexteSaisie): string[] {
  const out: string[] = ['📝 AVANT DE SAISIR', `   Nom du devis : ${nomDevis(m, c)}`];
  out.push(m.tva === '20 %'
    ? '   TVA : 20 % sur toutes les lignes (réglage par défaut de Costructor, rien à changer)'
    : `   TVA : passer chaque ligne ajoutée à ${m.tva} (Costructor met 20 % par défaut sur une ligne de la bibliothèque ; les lignes du modèle y sont déjà)`);
  const crochets = (CROCHETS[m.cle] ?? []).map((cr) => `« ${cr} » → ${valeurCrochet(cr, c)}`);
  if (crochets.length) out.push('   En-tête, remplacer :', ...crochets.map((x) => `      ${x}`));
  // COP sur services généraux : la phrase sur l'augmentation de puissance suit le calcul (écart 53)
  if (m.cle === 'COP_SG') {
    out.push(c.augmentation === true
      ? "   En-tête : retirer la phrase « pas besoin d'augmenter la puissance » (pointe réelle + réserve IRVE au-dessus de l'abonnement : augmentation à demander)"
      : c.augmentation === false
        ? "   En-tête : garder la phrase « pas besoin d'augmenter la puissance » (l'abonnement actuel couvre la pointe réelle + la réserve IRVE)"
        : "   En-tête : phrase « pas besoin d'augmenter la puissance » à vérifier (pointe réelle des communs ou abonnement non relevé)");
  }
  out.push(...primeAdvenir(m, c));
  return out;
}

// Après les lignes : ce qu'il faut vérifier avant de cliquer « Finaliser »
export function avantFinaliser(m: ModeleDevis, c: ContexteSaisie): string[] {
  const tarifType = m.cle === 'RIC_TARIF_TYPE';
  return [
    '✅ AVANT DE FINALISER',
    '   • Aucun ✖ oublié : chaque ligne à retirer est bien retirée',
    '   • Client rattaché (le devis créé à partir du modèle ne le reprend pas)',
    '   • Validité 30 jours (vérifier la date de fin)',
    `   • Signature en ligne ${tarifType ? 'désactivée (tarif type, indicatif)' : 'activée'}`,
    `   • Conditions de paiement : « ${conditions(m, c)} »${m.cle.startsWith('AMO') ? ' (réglage « Aucun acompte » : ce n\'est pas un écart)' : ''}`,
    `   • Pied de devis : ${MENTION_TVA[m.tva] ?? 'mention TVA du modèle'}`,
    '   • Plus aucun « [ » dans le devis (en-tête et textes)',
    '   • Une fois finalisé : 💶 Montant devis HT, 📝 N° devis et 🔗 Lien devis à reporter sur le scénario',
  ];
}
