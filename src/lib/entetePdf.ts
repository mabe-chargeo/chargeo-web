// En-tête A4 officiel CHARGéO (03_BACK_OFFICE/07_MARQUE_PAPETERIE/EN_TETES, fourni par Matthieu le 18/10/2026 à 16 h 35) :
// page entière en vectoriel (logo avec slogan, coordonnées, filet turquoise et mentions légales du pied), flux PDF
// compressé (Brotli, plus compact) en base64 (découpé en 4 fichiers entetePdf1 à 4), recompressé en FlateDecode à la génération. Repris tel quel (coordonnées arrondies au dixième de point, invisible à l'œil), sans
// aucune retouche : Matthieu, 16 h 32, « tu as recréé le logo et ça ne va pas ». Ne pas modifier à la main.
import { PARTIE_1 } from './entetePdf1';
import { PARTIE_2 } from './entetePdf2';
import { PARTIE_3 } from './entetePdf3';
import { PARTIE_4 } from './entetePdf4';

export const ENTETE_FLUX_B64 = PARTIE_1 + PARTIE_2 + PARTIE_3 + PARTIE_4;
