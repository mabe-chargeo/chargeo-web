// Brief de chiffrage : consignes de saisie de chaque devis (Phase 8, étape 7, recette du 02/11/2026).
// Mathieu (02/11, 18 h 41 : « est-ce qu'on ne peut pas mettre toutes les informations dans le brief ? », accord à 18 h 46) :
// pour chaque devis, le brief donne le nom exact à coller, la TVA à poser sur les lignes ajoutées (Costructor met 20 %
// par défaut sur une ligne de la bibliothèque : écart 5 de la recette), les valeurs des crochets de l'en-tête, la prime
// ADVENIR en valeur haute et la liste de contrôle avant finalisation. Fichier neutre, sans appel réseau.
// Sources : compétences Devis après relevé (nom « fiche · Scénario X : source · matériel », validité 30 jours, signature
// en ligne sauf tarif type), Textes et mentions (conditions de paiement, mentions TVA), Prime ADVENIR, et advenir.mobi
// (barème point de recharge partagé : 50 % plafonné à 1 660 € HT par point, surprime équipements et cheminement jusqu'à
// 8 000 € HT, en vigueur depuis le 01/04/2026, relu le 02/11/2026). Aucun montant n'est inventé : la prime est donnée en
// valeur haute (plafond), le reste à charge se calcule sur le total TTC du devis (D7).
import type { Segment } from '@/lib/champsClickUp';
import type { ModeleDevis } from '@/lib/modelesDevis';

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
};

const SOURCE_COURTE: Record<string, string> = {
  tableauIndividuel: 'Tableau', tgbtServicesGeneraux: 'SG', pdlDedie: 'PDL dédié', infraCollective: 'Infra CHARGéO', colonneEnedis: 'Colonne Enedis',
};
const fr = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const euros = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
// « Scénario A : Borne partagée » → « Scénario A »
const lettre = (nom: string) => nom.match(/Scénario\s+[A-Z]+/)?.[0] ?? 'Scénario';

export function nomDevis(m: ModeleDevis, c: ContexteSaisie): string {
  const fiche = c.ficheNom?.trim() || '[nom de la fiche]';
  const fin = m.cle === 'AMO_PDL' ? 'PDL dédié · AMO création PDL'
    : m.cle === 'AMO_COLONNE' ? 'Colonne Enedis · AMO colonne'
      : `${SOURCE_COURTE[c.source] ?? '[source]'} · ${c.materiel}`;
  return `${fiche} · ${lettre(c.scenarioNom)} : ${fin}`;
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
  const crochets: string[] = [];
  if (m.cle === 'AMO_PDL') {
    crochets.push(`« [puissance kVA, mono ou tri] » → ${c.puissanceKva !== null ? `${fr(c.puissanceKva)} kVA` : 'puissance à renseigner'}, ${c.tri ? 'triphasé' : 'monophasé'} (à valider)`);
  } else if (c.nombreBornes > 0) {
    crochets.push(`« [Nombre] » → ${c.nombreBornes}`, `« [marque, puissance] » → ${c.marquePuissance}`);
  }
  crochets.push(`« [date] » → ${c.dateVisite ?? 'date de la visite (📅 Date Visite Technique vide sur la fiche)'}`);
  out.push(`   En-tête : remplacer ${crochets.join(' · ')}. Tout autre crochet ([emplacements]…) est à écrire : il n'est pas relevé dans l'appli`);
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
