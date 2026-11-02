// Brief de chiffrage : consignes de saisie de chaque devis (Phase 8, étape 7, recette du 02/11/2026).
// Mathieu (02/11, 18 h 41 : « est-ce qu'on ne peut pas mettre toutes les informations dans le brief ? », accord à 18 h 46) :
// pour chaque devis, le brief donne le nom exact à coller, la TVA à poser sur les lignes ajoutées (Costructor met 20 %
// par défaut sur une ligne de la bibliothèque : écart 5 de la recette), la valeur de chaque crochet de l'en-tête, la
// prime ADVENIR en valeur haute et la liste de contrôle avant finalisation. Fichier neutre, sans appel réseau.
// 02/11, 19 h 26 (Mathieu : « il manque les champs de l'en-tête du devis ») : tous les crochets des 14 en-têtes (CROCHETS,
// relus dans Costructor le 02/11 à 19 h 30) reçoivent leur valeur ; [emplacements] vient du nouveau champ
// 📌 Emplacement de la borne (choix de Mathieu du 02/11 à 19 h 57). Un en-tête modifié dans Costructor se reporte ici.
// Sources : compétences Devis après relevé (nom « fiche · Scénario X : source · matériel », validité 30 jours, signature
// en ligne sauf tarif type), Textes et mentions (conditions de paiement, mentions TVA), Prime ADVENIR, et advenir.mobi
// (barème point de recharge partagé : 50 % plafonné à 1 660 € HT par point, surprime équipements et cheminement jusqu'à
// 8 000 € HT, en vigueur depuis le 01/04/2026, relu le 02/11/2026). Aucun montant n'est inventé : la prime est donnée en
// valeur haute (plafond), le reste à charge se calcule sur le total TTC du devis (D7).
import type { Segment } from '@/lib/champsClickUp';
import type { CleModele, ModeleDevis } from '@/lib/modelesDevis';
import { DISTANCES, SAISIES, type ElementReleve } from '@/lib/releveElements';

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
};

const SOURCE_COURTE: Record<string, string> = {
  tableauIndividuel: 'Tableau', tgbtServicesGeneraux: 'SG', pdlDedie: 'PDL dédié', infraCollective: 'Infra CHARGéO', colonneEnedis: 'Colonne Enedis',
};
const fr = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const euros = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
const texte = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const metres = (m: number) => Math.ceil(m - 1e-9);
// « Scénario A : Borne partagée » → « Scénario A »
const lettre = (nom: string) => nom.match(/Scénario\s+[A-Z]+/)?.[0] ?? 'Scénario';

export function nomDevis(m: ModeleDevis, c: ContexteSaisie): string {
  const fiche = c.ficheNom?.trim() || '[nom de la fiche]';
  const fin = m.cle === 'AMO_PDL' ? 'PDL dédié · AMO création PDL'
    : m.cle === 'AMO_COLONNE' ? 'Colonne Enedis · AMO colonne'
      : `${SOURCE_COURTE[c.source] ?? '[source]'} · ${c.materiel}`;
  return `${fiche} · ${lettre(c.scenarioNom)} : ${fin}`;
}

// Crochets de l'en-tête de chaque modèle, dans l'ordre du texte (en-têtes lus dans Costructor le 02/11/2026, 19 h 30)
const PAR_CROCHETS = ['[Nombre]', '[marque, puissance]', '[emplacements]', '[date]'];
const CROCHETS: Record<CleModele, string[]> = {
  RES: ['[marque, puissance]', '[mode de pose, longueur]', '[date]'],
  RES_PRISE: ['[marque]', '[mode de pose, longueur]', '[date]'],
  DAP: ['[marque, puissance]', '[raccordement]', '[mode de pose, longueur]', '[date]'],
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

// 📌 Emplacement de la borne, borne par borne, sans doublon
function emplacements(els: ElementReleve[]): string {
  const liste = els.filter((e) => e.nature === 'borne').map((e) => texte(e.valeurs.emplacementBorne).trim()).filter(Boolean);
  return Array.from(new Set(liste)).join(', ');
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
  if (m.cle === 'DAP' && c.facade) return CONDITIONS_FACADE;
  return CONDITIONS_STANDARD;
}

const MENTION_TVA: Record<string, string> = {
  '5,5 %': 'attestation TVA 5,5 % (article 278-0 bis du CGI, texte de Mathieu)',
  '10 %': 'attestation TVA 10 % (article 257 du CGI)',
  '20 %': 'aucune attestation TVA',
};

// Prime ADVENIR en valeur haute (compétence Prime ADVENIR, D7, D17)
function prime(m: ModeleDevis, c: ContexteSaisie): string | null {
  const n = Math.max(1, c.points);
  const individuel = `point de recharge individuel, valeur haute ${n > 1 ? `${n} × 1 000 € = ${euros(n * 1000)}` : '1 000 €'}`;
  switch (m.cle) {
    case 'PAR_SG':
    case 'PAR_PDL':
      return `point de recharge partagé, valeur haute ${n} × 1 660 € HT = ${euros(n * 1660)} HT (50 % du HT des points de recharge, plafonné à 1 660 € par point ; surprime équipements et cheminement, jusqu'à 8 000 € HT, non comptée)`;
    case 'COP_SG':
    case 'COP_PDL':
      return c.plafondInfra !== null
        ? `infrastructure collective, valeur haute ${euros(c.plafondInfra)} HT (50 % plafonné ; assiette selon 🏛️ Date dépôt permis, à vérifier)`
        : 'infrastructure collective, plafond à calculer : nombre de places à renseigner';
    case 'RIC_TARIF_TYPE':
    case 'RIC_RESIDENT':
    case 'RIC_COLONNE':
      return individuel;
    case 'DAP':
      return c.source === 'tgbtServicesGeneraux' ? individuel : null;
    default:
      return null;
  }
}

// Juste sous « copier le modèle » : ce qu'il faut savoir avant de saisir les lignes
export function avantSaisie(m: ModeleDevis, c: ContexteSaisie): string[] {
  const out: string[] = ['📝 AVANT DE SAISIR', `   Nom du devis : ${nomDevis(m, c)}`];
  out.push(m.tva === '20 %'
    ? '   TVA : 20 % sur toutes les lignes (réglage par défaut de Costructor, rien à changer)'
    : `   TVA : passer chaque ligne ajoutée à ${m.tva} (Costructor met 20 % par défaut sur une ligne de la bibliothèque ; les lignes du modèle y sont déjà)`);
  const crochets = (CROCHETS[m.cle] ?? []).map((cr) => `« ${cr} » → ${valeurCrochet(cr, c)}`);
  if (crochets.length) out.push('   En-tête, remplacer :', ...crochets.map((x) => `      ${x}`));
  const p = prime(m, c);
  if (p) out.push(`   Prime ADVENIR : ${p}. Reste à charge estimé = total TTC du devis − prime, toujours en TTC (D7)`);
  else if (m.cle.startsWith('AMO')) out.push('   Prime ADVENIR : aucune aide sur ce devis (D17)');
  return out;
}

// Après les lignes : ce qu'il faut vérifier avant de cliquer « Finaliser »
export function avantFinaliser(m: ModeleDevis, c: ContexteSaisie): string[] {
  const tarifType = m.cle === 'RIC_TARIF_TYPE';
  return [
    '✅ AVANT DE FINALISER',
    '   • Client rattaché (la copie du modèle ne le reprend pas)',
    '   • Validité 30 jours (vérifier la date de fin posée par la copie)',
    `   • Signature en ligne ${tarifType ? 'désactivée (tarif type, indicatif)' : 'activée'}`,
    `   • Conditions de paiement : « ${conditions(m, c)} »${m.cle.startsWith('AMO') ? ' (réglage « Aucun acompte » : ce n\'est pas un écart)' : ''}`,
    `   • Pied de devis : ${MENTION_TVA[m.tva] ?? 'mention TVA du modèle'}`,
    '   • Plus aucun « [ » dans le devis (en-tête et textes)',
    '   • Une fois finalisé : 💶 Montant devis HT, 📝 N° devis et 🔗 Lien devis à reporter sur le scénario',
  ];
}
