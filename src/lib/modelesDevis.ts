// Les 14 modèles de devis Costructor (Phase 8, clôture de l'étape 3 du 01/11/2026, 18 h 30).
// Le brief de chiffrage (src/lib/briefChiffrage.ts) dit lequel copier. Fichier neutre, sans appel réseau.
// Un modèle ajouté ou renommé dans Costructor se reporte ici (nom exact et identifiant).
// Règles du choix (décisions D5, D6, D10, D13 et questions du 01/11) :
// - COP et PAR : variante selon la source (services généraux ou point de livraison dédié) ;
// - RIC : colonne Enedis si la source est « Colonne Enedis », sinon tarif type (fiche au nom d'un syndic ou d'un pro)
//   ou résident (fiche au nom d'un particulier) ;
// - RES : borne, ou prise renforcée (TVA 10 %) si le scénario n'a que des prises ;
// - point de livraison dédié, quel que soit le segment : un devis AMO « Création d'un point de livraison Enedis »
//   séparé, envoyé en premier pour lancer la demande Enedis (01/11, 19 h 23) ;
// - AMO colonne horizontale : hors relevé (Enedis fait tout), jamais choisi par le brief.

export type CleModele =
  | 'COP_PDL' | 'COP_SG' | 'PAR_SG' | 'PAR_PDL' | 'RIC_TARIF_TYPE' | 'RIC_RESIDENT' | 'RIC_COLONNE'
  | 'RES' | 'RES_PRISE' | 'DAP' | 'FLT' | 'TER' | 'AMO_PDL' | 'AMO_COLONNE';

export type ModeleDevis = { cle: CleModele; nom: string; id: string; tva: string };

export const MODELES: Record<CleModele, ModeleDevis> = {
  COP_PDL: { cle: 'COP_PDL', nom: 'MODÈLE COP · Infrastructure collective sur PDL dédié', id: 'quote_01m66syj25agr2z9g4ckzknzp7', tva: '5,5 %' },
  COP_SG: { cle: 'COP_SG', nom: 'MODÈLE COP · Infrastructure collective sur services généraux', id: 'quote_01m6bt1qvy2rtk38az096tx9h5', tva: '5,5 %' },
  PAR_SG: { cle: 'PAR_SG', nom: 'MODÈLE PAR · Borne partagée sur services généraux', id: 'quote_01m66xwvqjwzgnq7ztjw4d79zd', tva: '5,5 %' },
  PAR_PDL: { cle: 'PAR_PDL', nom: 'MODÈLE PAR · Borne partagée sur PDL dédié', id: 'quote_01m6bswa32xfj11f2nm6z8w5xg', tva: '5,5 %' },
  RIC_TARIF_TYPE: { cle: 'RIC_TARIF_TYPE', nom: "MODÈLE RIC · Tarif type résident (avec l'infrastructure)", id: 'quote_01m66xxmnzx2nm9xw97bttpn4x', tva: '5,5 %' },
  RIC_RESIDENT: { cle: 'RIC_RESIDENT', nom: 'MODÈLE RIC · Résident (vrai devis)', id: 'quote_01m66xys2taehgs4gz0v9d4359', tva: '5,5 %' },
  RIC_COLONNE: { cle: 'RIC_COLONNE', nom: 'MODÈLE RIC · Résident sur colonne Enedis', id: 'quote_01m6bt5b9ykcje24havcqn7sx8', tva: '5,5 %' },
  RES: { cle: 'RES', nom: 'MODÈLE RES · Résidentiel', id: 'quote_01m66xzazjd9xkpymnn0z3142c', tva: '5,5 %' },
  RES_PRISE: { cle: 'RES_PRISE', nom: 'MODÈLE RES · Prise renforcée (TVA 10 %)', id: 'quote_01kz1rv25k9ktzrgzw1p1hmcjt', tva: '10 %' },
  DAP: { cle: 'DAP', nom: 'MODÈLE DAP · Droit à la prise', id: 'quote_01m66xzm3ahyrea7x401xzbyt2', tva: '5,5 %' },
  FLT: { cle: 'FLT', nom: 'MODÈLE FLT · Flotte', id: 'quote_01m66xzsrb9pnp5ybn4sgwm7vg', tva: '20 %' },
  TER: { cle: 'TER', nom: 'MODÈLE TER · Tertiaire', id: 'quote_01m66xzypz4m7d7rxde772g98q', tva: '20 %' },
  AMO_PDL: { cle: 'AMO_PDL', nom: "MODÈLE AMO · Création d'un point de livraison Enedis", id: 'quote_01m6bsrq9akgea3yp5ws69trqa', tva: '20 %' },
  AMO_COLONNE: { cle: 'AMO_COLONNE', nom: 'MODÈLE AMO · Colonne horizontale Enedis (Réseau Électrique Auto)', id: 'quote_01m6bst6m24hjqprjc7y7721ds', tva: '20 %' },
};

export const lienModele = (m: ModeleDevis) => `https://app.costructor.co/quotes/${m.id}`;
