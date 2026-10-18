// Documents PDF générés par l'application CHARGéO, à la charte (src/lib/pdfCharte.ts) :
// - rapport de mise en service (décision de Matthieu du 18/10/2026, 15 h 36 : « L'appli génère le rapport ») ;
// - procès-verbal de réception signé au doigt sur le téléphone (18/10/2026, 16 h 04 : « au doigt sur le téléphone, et
//   créer une mise en page comme pour le rapport »).
// Fonctions pures : elles reçoivent des données déjà lues et rendent les octets du PDF.
import { DocumentPdf, NAVY, TURQUOISE_FONCE, type ImageJpeg, type LigneCarte } from './pdfCharte';

const etiquette = (s: string): LigneCarte => ({ texte: s.toUpperCase(), gras: true, taille: 7.4, couleur: TURQUOISE_FONCE });

// ---------- Rapport de mise en service ----------
export type MesureElement = { nom: string; texte: string };
export type DonneesRapport = { reference: string; chantier: string; adresse: string; quand: string; elements: MesureElement[] };

// Commentaire « ⚡ Mise en service · … » → lignes de carte
function lireMesure(texte: string) {
  const lignes = String(texte || '').split('\n');
  const qui = (lignes[0] || '').match(/\(([^)]*)\)\s*$/)?.[1] || '';
  let appareil = '';
  const carte: LigneCarte[] = [];
  let verdict = '';
  let remarque = '';
  for (const brute of lignes.slice(1)) {
    const l = brute.replace(/\s+$/, '');
    const t = l.trim();
    if (!t || /^réf\./.test(t)) continue;
    if (t.startsWith('Appareil :')) { appareil = t.slice(10).trim(); continue; }
    if (t.startsWith('Remarque :')) { remarque = t.slice(10).trim(); continue; }
    if (/Aucun défaut noté|Défauts :/.test(t)) { verdict = t; continue; }
    if (/^\d+\.\s/.test(t)) { carte.push({ texte: t, gras: true, espace: carte.length ? 6 : 0 }); continue; }
    const m = t.match(/^(.*?) : (.*)$/);
    if (m) carte.push({ texte: m[1], valeur: m[2], retrait: 10 });
    else carte.push({ texte: t });
  }
  return { qui, appareil, carte, verdict, remarque };
}

export function pdfRapportMiseEnService(d: DonneesRapport): Uint8Array {
  const doc = new DocumentPdf({ titre: 'Rapport de mise en service', reference: d.reference, pied: d.chantier });
  doc.titre('Rapport de mise en service');
  doc.texte(`Référence ${d.reference}`, { taille: 8 });
  doc.texte(d.chantier, { taille: 12, gras: true });
  doc.deuxCartes(
    [etiquette('Chantier'), { texte: d.chantier, gras: true }, ...(d.adresse ? [{ texte: d.adresse }] : [])],
    [etiquette('Mise en service'), { texte: 'Établi le', valeur: d.quand }, { texte: 'Éléments', valeur: String(d.elements.length) }, { texte: 'Résultat', valeur: 'tous conformes' }],
  );
  doc.texte('Rapport établi par l’application CHARGéO à partir des mesures saisies sur place, élément par élément, dans l’ordre du courant.', { taille: 8.5, espaceAvant: 4 });
  d.elements.forEach((e, i) => {
    const m = lireMesure(e.texte);
    doc.label(`Élément ${i + 1}`, { espaceAvant: 16 });
    doc.texte(e.nom, { taille: 11.5, gras: true });
    doc.texte([m.appareil && `Appareil : ${m.appareil}`, m.qui && `mesuré par ${m.qui}`].filter(Boolean).join(' · '), { taille: 8.5 });
    const lignes = [...m.carte];
    if (m.remarque) lignes.push({ texte: `Remarque : ${m.remarque}`, espace: 6 });
    lignes.push({ texte: m.verdict || 'Aucun défaut noté', gras: true, espace: 6 });
    doc.carte(lignes);
  });
  doc.espace(10);
  doc.encadre('Conclusion : aucun défaut noté, installation mise en service.', { gras: true });
  return doc.finir();
}

// ---------- Procès-verbal de réception ----------
export type ReservePv = { libelle: string; echeance?: string; responsable?: string };
export type DonneesPv = {
  reference: string;
  chantier: string;
  client: { nom: string; type?: string; adresse?: string; email?: string; telephone?: string };
  adresse: string;
  devis?: string;
  dateIntervention?: string;
  dateReception: string;
  commune?: string;
  ouvrages: string[];
  miseEnService: { elements: number; rapport?: string } | null;
  reserves: ReservePv[];
  signataire: { nom: string; qualite: string; image: ImageJpeg };
  technicien: { nom: string; image: ImageJpeg };
  horodatage: string;
};

export function pdfPvReception(d: DonneesPv): Uint8Array {
  const doc = new DocumentPdf({ titre: 'Procès-verbal de réception', reference: d.reference, pied: d.chantier });
  doc.titre('Procès-verbal de réception des travaux');
  doc.texte(`Référence ${d.reference} · réception prononcée en application de l’article 1792-6 du Code civil.`, { taille: 8 });
  doc.deuxCartes(
    [etiquette('Maître d’ouvrage'), { texte: d.client.nom, gras: true }, ...(d.client.type ? [{ texte: d.client.type }] : []),
      ...(d.client.adresse ? [{ texte: d.client.adresse }] : []), ...(d.client.email ? [{ texte: d.client.email }] : []), ...(d.client.telephone ? [{ texte: d.client.telephone }] : [])],
    [etiquette('Entreprise'), { texte: 'CHARGéO', gras: true }, { texte: 'SAS au capital de 5 000 €' }, { texte: 'SIRET 130 946 346 00017' }, { texte: '89 chemin de la Ballastière, 74200 Thonon-les-Bains' }],
  );

  doc.label('Chantier');
  doc.carte([
    { texte: 'Adresse des travaux', valeur: d.adresse || 'non renseignée' },
    ...(d.devis ? [{ texte: 'Devis', valeur: d.devis }] : []),
    ...(d.dateIntervention ? [{ texte: 'Travaux réalisés le', valeur: d.dateIntervention }] : []),
    { texte: 'Réception prononcée le', valeur: d.dateReception },
  ]);

  doc.label('Ouvrages réceptionnés');
  doc.carte(d.ouvrages.length ? d.ouvrages.map((o) => ({ texte: `•  ${o}` })) : [{ texte: 'Ouvrages du devis signé' }]);

  if (d.miseEnService) {
    doc.label('Mise en service');
    doc.carte([
      { texte: 'Éléments mis en service et conformes', valeur: String(d.miseEnService.elements) },
      ...(d.miseEnService.rapport ? [{ texte: 'Rapport de mise en service annexé', valeur: d.miseEnService.rapport, taille: 8.5 }] : []),
    ]);
  }

  doc.label('Décision du maître d’ouvrage');
  doc.encadre(d.reserves.length
    ? `Après visite des ouvrages en présence de l’entreprise, le maître d’ouvrage prononce la réception des travaux avec ${d.reserves.length} réserve${d.reserves.length > 1 ? 's' : ''}, que CHARGéO lèvera aux dates indiquées ci-dessous.`
    : 'Après visite des ouvrages en présence de l’entreprise, le maître d’ouvrage prononce la réception des travaux sans réserve.', { gras: true });
  if (d.reserves.length) {
    doc.carte(d.reserves.map((r, i) => ({ texte: `${i + 1}. ${r.libelle}`, valeur: r.echeance ? `à lever le ${r.echeance}` : 'date à fixer', espace: i ? 3 : 0 })));
  }

  // Garanties, « Fait à » et signatures restent ensemble sur la même page (18/10, 16 h 53 : paragraphe coupé en deux)
  doc.garder(300);
  doc.label('Garanties');
  doc.texte('La réception est le point de départ de la garantie de parfait achèvement (1 an, article 1792-6 du Code civil), de la garantie de bon fonctionnement des éléments d’équipement (2 ans au moins, article 1792-3) et de la garantie décennale (10 ans, articles 1792 et 1792-4-1).', { taille: 8.5 });

  doc.texte(`Fait${d.commune ? ` à ${d.commune}` : ''}, le ${d.dateReception}, en présence des deux parties.`, { espaceAvant: 10 });
  doc.signatures([
    { titre: 'Pour le maître d’ouvrage', nom: d.signataire.nom, qualite: d.signataire.qualite, image: d.signataire.image, mention: 'Lu et approuvé, réception prononcée' },
    { titre: 'Pour CHARGéO', nom: d.technicien.nom, qualite: 'Technicien', image: d.technicien.image, mention: 'Pour l’entreprise' },
  ]);
  doc.texte(`Signé au doigt sur l’application CHARGéO le ${d.horodatage}. Un exemplaire est remis au maître d’ouvrage.`, { taille: 7.5, espaceAvant: 6, couleur: NAVY });
  return doc.finir();
}
