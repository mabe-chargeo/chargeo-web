// Moteur PDF A4 à la charte CHARGéO, sans dépendance (décisions de Matthieu du 18/10/2026 : « L'appli génère le
// rapport » à 15 h 36, puis 16 h 04 : « créer une mise en page comme pour le rapport, en s'inspirant des modèles
// d'en-tête du Drive »). Sert au rapport de mise en service et au PV de réception.
// 18/10, 16 h 35 : chaque page porte l'en-tête A4 officiel tel quel (src/lib/entetePdf.ts : logo avec slogan,
// coordonnées, filet et mentions légales), plus rien de redessiné. Par-dessus : texte navy #032b60, labels en capitales
// turquoise foncé #007f96, cartes gris #eceef1 arrondies, encadré turquoise pâle #e3f4f7, numéro de page au-dessus du filet. Police : Helvetica (police PDF standard ; Poppins demanderait d'embarquer
// la fonte). Accents par l'encodage WinAnsi ; emojis, Ω, Δ et flèches remplacés par un équivalent lisible.
// Signatures : images JPEG (canvas du téléphone) posées telles quelles (DCTDecode).
import { LARGEURS_HELVETICA, LARGEURS_HELVETICA_GRAS } from './logoPdf';
import { brotliDecompressSync, deflateSync } from 'zlib';
import { ENTETE_FLUX_B64 } from './entetePdf';

let fondCache: string | null = null;
function fondEntete(): string {
  const fond = fondCache ?? deflateSync(brotliDecompressSync(Buffer.from(ENTETE_FLUX_B64, 'base64')), { level: 9 }).toString('latin1');
  fondCache = fond;
  return fond;
}

export type Couleur = [number, number, number];
const rgb = (hex: string): Couleur => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Couleur;
export const NAVY = rgb('#032b60');
export const TURQUOISE = rgb('#0097b2');
export const TURQUOISE_FONCE = rgb('#007f96');
export const GRIS_CARTE = rgb('#eceef1');
export const TURQUOISE_PALE = rgb('#e3f4f7');
export const ORANGE = rgb('#c2410c');
export const BLANC: Couleur = [1, 1, 1];

export type ImageJpeg = { octets: Uint8Array; largeur: number; hauteur: number; gris: boolean };
export type LigneCarte = { texte?: string; valeur?: string; gras?: boolean; taille?: number; couleur?: Couleur; espace?: number; retrait?: number };
type Mesure = { h: number; libelles: string[]; valeurs: string[]; taille: number; retrait: number };
export type Signature = { titre: string; nom: string; qualite?: string; image?: ImageJpeg | null; mention?: string };

const LARGEUR = 595.28;
const HAUTEUR = 841.89;
const MARGE = 51;
const BAS = 74;
const CONTENU = LARGEUR - 2 * MARGE;

// ---------- Texte ----------
const CP1252: Record<string, number> = {
  '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  'Œ': 0x8c, 'œ': 0x9c, 'Ÿ': 0x9f,
};
const REMPLACEMENTS: [RegExp, string][] = [
  [/✅\s*/g, ''], [/❌\s*/g, ''], [/⚠\uFE0F?\s*/g, ''], [/⚡\s*/g, ''],
  [/MΩ/g, 'Mohm'], [/Ω/g, 'ohm'], [/Δ/g, 'D'], [/→/g, '->'], [/≤/g, '<='], [/≥/g, '>='], [/[\u202f\u2009]/g, ' '],
];
export function versWinAnsi(s: string): string {
  let t = String(s ?? '');
  for (const [re, r] of REMPLACEMENTS) t = t.replace(re, r);
  let sortie = '';
  for (const ch of t) {
    const c = ch.codePointAt(0) || 0;
    if ((c >= 0x20 && c < 0x7f) || (c >= 0xa0 && c <= 0xff)) sortie += String.fromCharCode(c);
    else if (CP1252[ch]) sortie += String.fromCharCode(CP1252[ch]);
  }
  return sortie.replace(/\s+/g, ' ').trim();
}
const echapper = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const n = (x: number) => (Math.round(x * 100) / 100).toString();
const couleur = (c: Couleur) => `${n(c[0])} ${n(c[1])} ${n(c[2])}`;

// Largeur d'un texte déjà converti en WinAnsi
export function largeurTexte(s: string, taille: number, gras = false, espacement = 0): number {
  const table = gras ? LARGEURS_HELVETICA_GRAS : LARGEURS_HELVETICA;
  let w = 0;
  for (let i = 0; i < s.length; i++) w += table[s.charCodeAt(i) - 32] || 556;
  return (w * taille) / 1000 + espacement * Math.max(0, s.length - 1);
}
function couper(s: string, taille: number, gras: boolean, max: number): string[] {
  if (!s) return [''];
  const lignes: string[] = [];
  let courante = '';
  for (const mot of s.split(' ')) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (largeurTexte(essai, taille, gras) <= max || !courante) {
      if (largeurTexte(essai, taille, gras) > max && !courante) {
        // mot plus long que la ligne : coupé net
        let bout = '';
        for (const ch of mot) {
          if (largeurTexte(bout + ch, taille, gras) > max) { lignes.push(bout); bout = ''; }
          bout += ch;
        }
        courante = bout;
      } else courante = essai;
    } else { lignes.push(courante); courante = mot; }
  }
  lignes.push(courante);
  return lignes;
}

// ---------- JPEG ----------
export function lireJpeg(octets: Uint8Array): ImageJpeg | null {
  if (octets.length < 4 || octets[0] !== 0xff || octets[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < octets.length) {
    if (octets[i] !== 0xff) { i++; continue; }
    const m = octets[i + 1];
    const longueur = (octets[i + 2] << 8) | octets[i + 3];
    if (m >= 0xc0 && m <= 0xc3) {
      return { octets, hauteur: (octets[i + 5] << 8) | octets[i + 6], largeur: (octets[i + 7] << 8) | octets[i + 8], gris: octets[i + 9] === 1 };
    }
    i += 2 + longueur;
  }
  return null;
}

// ---------- Document ----------
export class DocumentPdf {
  private pages: string[][] = [];
  private flux: string[] = [];
  private y = 0;
  private images: ImageJpeg[] = [];
  private o: { titre: string; reference?: string; pied?: string };
  constructor(o: { titre: string; reference?: string; pied?: string }) {
    this.o = o;
    this.nouvellePage();
  }

  private texteBrut(s: string, x: number, y: number, taille: number, gras: boolean, c: Couleur, espacement = 0) {
    this.flux.push(`BT /${gras ? 'F2' : 'F1'} ${n(taille)} Tf ${n(espacement)} Tc ${couleur(c)} rg ${n(x)} ${n(y)} Td (${echapper(s)}) Tj ET`);
  }
  private rectangle(x: number, y: number, w: number, h: number, r: number, c: Couleur) {
    const k = 0.5523 * r;
    this.flux.push(`${couleur(c)} rg ${n(x + r)} ${n(y)} m ${n(x + w - r)} ${n(y)} l ${n(x + w - r + k)} ${n(y)} ${n(x + w)} ${n(y + r - k)} ${n(x + w)} ${n(y + r)} c `
      + `${n(x + w)} ${n(y + h - r)} l ${n(x + w)} ${n(y + h - r + k)} ${n(x + w - r + k)} ${n(y + h)} ${n(x + w - r)} ${n(y + h)} c `
      + `${n(x + r)} ${n(y + h)} l ${n(x + r - k)} ${n(y + h)} ${n(x)} ${n(y + h - r + k)} ${n(x)} ${n(y + h - r)} c `
      + `${n(x)} ${n(y + r)} l ${n(x)} ${n(y + r - k)} ${n(x + r - k)} ${n(y)} ${n(x + r)} ${n(y)} c h f`);
  }
  private nouvellePage() {
    const suite = this.flux.length > 0 || this.pages.length > 0;
    if (this.flux.length) this.pages.push(this.flux);
    this.flux = ['q /Entete Do Q'];
    this.y = HAUTEUR - 118;
    // Pages suivantes : rappel du document sous l'en-tête
    if (suite) {
      const rappel = versWinAnsi(`${this.o.titre}${this.o.reference ? ` · ${this.o.reference}` : ''}`);
      this.texteBrut(rappel, MARGE, this.y - 4, 7.5, false, NAVY);
      this.y -= 16;
    }
  }
  private place(h: number) {
    if (this.y - h < BAS) this.nouvellePage();
  }
  espace(h: number) { this.y -= h; }
  // Garde ensemble le bloc qui suit (hauteur h) : nouvelle page s'il ne tient pas
  garder(h: number) { this.place(h); }

  titre(s: string, taille = 20) {
    const lignes = couper(versWinAnsi(s), taille, true, CONTENU);
    this.place(lignes.length * taille * 1.15);
    for (const l of lignes) { this.y -= taille * 1.1; this.texteBrut(l, MARGE, this.y, taille, true, NAVY); }
    this.y -= taille * 0.35;
  }
  label(s: string, o: { espaceAvant?: number } = {}) {
    this.y -= o.espaceAvant ?? 14;
    this.place(26);
    this.y -= 8;
    this.texteBrut(versWinAnsi(s.toUpperCase()), MARGE, this.y, 7.6, true, TURQUOISE_FONCE, 0.7);
    this.y -= 7;
  }
  texte(s: string, o: { taille?: number; gras?: boolean; couleur?: Couleur; retrait?: number; espaceAvant?: number } = {}) {
    const taille = o.taille || 9.5;
    const x = MARGE + (o.retrait || 0);
    const lignes = couper(versWinAnsi(s), taille, !!o.gras, LARGEUR - MARGE - x);
    this.y -= o.espaceAvant || 0;
    // Paragraphe court (8 lignes au plus) : jamais coupé entre deux pages
    if (lignes.length <= 8) this.place(lignes.length * taille * 1.45);
    for (const l of lignes) {
      this.place(taille * 1.45);
      this.y -= taille * 1.45;
      this.texteBrut(l, x, this.y, taille, !!o.gras, o.couleur || NAVY);
    }
  }

  // Lignes d'une carte : hauteur et dessin (une ligne « valeur » met le libellé à gauche et la valeur à droite)
  private mesurer(l: LigneCarte, largeur: number): Mesure {
    const taille = l.taille || 9.5;
    const retrait = l.retrait || 0;
    if (l.valeur !== undefined) {
      const v = versWinAnsi(l.valeur);
      const lv = Math.min(largeurTexte(v, taille, true), largeur * 0.5);
      const libelles = couper(versWinAnsi(l.texte || ''), taille, false, largeur - retrait - lv - 12);
      const valeurs = couper(v, taille, true, largeur * 0.5);
      const nb = Math.max(libelles.length, valeurs.length);
      return { h: (l.espace || 0) + nb * taille * 1.45, libelles, valeurs, taille, retrait };
    }
    const libelles = couper(versWinAnsi(l.texte || ''), taille, !!l.gras, largeur - retrait);
    return { h: (l.espace || 0) + libelles.length * taille * 1.45, libelles, valeurs: [], taille, retrait };
  }
  private dessiner(l: LigneCarte, m: Mesure, x: number, largeur: number, y: number) {
    let yy = y - (l.espace || 0);
    const couleurTexte = l.couleur || NAVY;
    const nb = Math.max(m.libelles.length, m.valeurs.length);
    for (let i = 0; i < nb; i++) {
      yy -= m.taille * 1.45;
      if (m.libelles[i]) this.texteBrut(m.libelles[i], x + m.retrait, yy + m.taille * 0.3, m.taille, l.valeur !== undefined ? false : !!l.gras, couleurTexte);
      if (m.valeurs[i]) this.texteBrut(m.valeurs[i], x + largeur - largeurTexte(m.valeurs[i], m.taille, true), yy + m.taille * 0.3, m.taille, true, couleurTexte);
    }
  }

  // Carte grise arrondie ; coupée proprement si elle ne tient pas sur la page
  carte(lignes: LigneCarte[], o: { fond?: Couleur; espaceAvant?: number } = {}) {
    const pad = 12;
    const interieur = CONTENU - 2 * pad;
    const mesures = lignes.map((l) => this.mesurer(l, interieur));
    this.y -= o.espaceAvant ?? 6;
    let i = 0;
    while (i < lignes.length) {
      if (this.y - (mesures[i].h + 2 * pad) < BAS) this.nouvellePage();
      let h = 0;
      let j = i;
      while (j < lignes.length && this.y - (h + mesures[j].h + 2 * pad) >= BAS) { h += mesures[j].h; j++; }
      if (j === i) { h = mesures[i].h; j = i + 1; }
      this.rectangle(MARGE, this.y - h - 2 * pad, CONTENU, h + 2 * pad, 10, o.fond || GRIS_CARTE);
      let yy = this.y - pad;
      for (let k = i; k < j; k++) { this.dessiner(lignes[k], mesures[k], MARGE + pad, interieur, yy); yy -= mesures[k].h; }
      this.y -= h + 2 * pad;
      i = j;
    }
  }
  encadre(s: string, o: { gras?: boolean } = {}) {
    this.carte([{ texte: s, gras: o.gras }], { fond: TURQUOISE_PALE });
  }

  // Deux cartes côte à côte, même hauteur
  deuxCartes(gauche: LigneCarte[], droite: LigneCarte[]) {
    const pad = 12;
    const gouttiere = 10;
    const w = (CONTENU - gouttiere) / 2;
    const mg = gauche.map((l) => this.mesurer(l, w - 2 * pad));
    const md = droite.map((l) => this.mesurer(l, w - 2 * pad));
    const h = Math.max(mg.reduce((a, m) => a + m.h, 0), md.reduce((a, m) => a + m.h, 0)) + 2 * pad;
    this.y -= 6;
    this.place(h);
    const colonnes: [LigneCarte[], Mesure[], number][] = [[gauche, mg, MARGE], [droite, md, MARGE + w + gouttiere]];
    for (const [ls, ms, x] of colonnes) {
      this.rectangle(x, this.y - h, w, h, 10, GRIS_CARTE);
      let yy = this.y - pad;
      ls.forEach((l, k) => { this.dessiner(l, ms[k], x + pad, w - 2 * pad, yy); yy -= ms[k].h; });
    }
    this.y -= h;
  }

  // Cadres de signature côte à côte
  signatures(blocs: Signature[]) {
    const gouttiere = 10;
    const w = (CONTENU - gouttiere * (blocs.length - 1)) / blocs.length;
    const h = 150;
    this.y -= 8;
    this.place(h);
    blocs.forEach((b, i) => {
      const x = MARGE + i * (w + gouttiere);
      this.rectangle(x, this.y - h, w, h, 10, GRIS_CARTE);
      let yy = this.y - 12 - 7.6;
      this.texteBrut(versWinAnsi(b.titre.toUpperCase()), x + 12, yy, 7.6, true, TURQUOISE_FONCE, 0.7);
      yy -= 14;
      this.texteBrut(versWinAnsi(b.nom), x + 12, yy, 10, true, NAVY);
      if (b.qualite) { yy -= 12; this.texteBrut(versWinAnsi(b.qualite), x + 12, yy, 8.5, false, NAVY); }
      // Zone blanche de signature
      const zx = x + 12, zw = w - 24, zh = 70, zy = this.y - h + 12 + (b.mention ? 12 : 0);
      this.rectangle(zx, zy, zw, zh, 6, BLANC);
      if (b.image) {
        const nom = this.ajouterImage(b.image);
        const echelle = Math.min((zw - 8) / b.image.largeur, (zh - 8) / b.image.hauteur);
        const iw = b.image.largeur * echelle, ih = b.image.hauteur * echelle;
        this.flux.push(`q ${n(iw)} 0 0 ${n(ih)} ${n(zx + (zw - iw) / 2)} ${n(zy + (zh - ih) / 2)} cm /${nom} Do Q`);
      }
      if (b.mention) this.texteBrut(versWinAnsi(b.mention), x + 12, this.y - h + 9, 6.8, false, NAVY);
    });
    this.y -= h;
  }

  private ajouterImage(img: ImageJpeg): string {
    this.images.push(img);
    return `Im${this.images.length}`;
  }

  finir(): Uint8Array {
    this.pages.push(this.flux);
    const total = this.pages.length;
    const morceaux: string[] = [];
    let longueur = 0;
    const positions: number[] = [];
    const ecrire = (s: string) => { morceaux.push(s); longueur += s.length; };
    const objets: (() => void)[] = [];
    let nb = 0;
    const reserver = () => ++nb;
    const catalogue = reserver(), racine = reserver(), f1 = reserver(), f2 = reserver(), entete = reserver(), ressources = reserver();
    const imgs = this.images.map(() => reserver());
    const pagesIds = this.pages.map(() => [reserver(), reserver()]);
    const objet = (id: number, corps: string) => objets.push(() => { positions[id] = longueur; ecrire(`${id} 0 obj\n${corps}\nendobj\n`); });
    objet(catalogue, `<< /Type /Catalog /Pages ${racine} 0 R >>`);
    objet(racine, `<< /Type /Pages /Kids [${pagesIds.map(([p]) => `${p} 0 R`).join(' ')}] /Count ${total} >>`);
    objet(f1, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objet(f2, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const fond = fondEntete();
    objet(entete, `<< /Type /XObject /Subtype /Form /BBox [0 0 ${LARGEUR} ${HAUTEUR}] /Resources << /ExtGState << /a0 << /CA 1 /ca 1 >> >> >> /Filter /FlateDecode /Length ${fond.length} >>\nstream\n${fond}\nendstream`);
    objet(ressources, `<< /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /XObject << /Entete ${entete} 0 R ${imgs.map((id, i) => `/Im${i + 1} ${id} 0 R`).join(' ')} >> >>`);
    this.images.forEach((img, i) => {
      let binaire = '';
      for (let k = 0; k < img.octets.length; k += 8192) binaire += String.fromCharCode(...img.octets.subarray(k, k + 8192));
      objet(imgs[i], `<< /Type /XObject /Subtype /Image /Width ${img.largeur} /Height ${img.hauteur} /ColorSpace /${img.gris ? 'DeviceGray' : 'DeviceRGB'} /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.octets.length} >>\nstream\n${binaire}\nendstream`);
    });
    this.pages.forEach((p, i) => {
      const pied: string[] = [];
      const numero = versWinAnsi(`${this.o.pied ? `${this.o.pied} · ` : ''}page ${i + 1}/${total}`);
      pied.push(`BT /F1 7 Tf 0 Tc ${couleur(NAVY)} rg ${n(LARGEUR - MARGE - largeurTexte(numero, 7))} 57 Td (${echapper(numero)}) Tj ET`);
      const corps = [...p, ...pied].join('\n');
      const [pageId, fluxId] = pagesIds[i];
      objet(fluxId, `<< /Length ${corps.length} >>\nstream\n${corps}\nendstream`);
      objet(pageId, `<< /Type /Page /Parent ${racine} 0 R /MediaBox [0 0 ${LARGEUR} ${HAUTEUR}] /Resources ${ressources} 0 R /Contents ${fluxId} 0 R >>`);
    });
    ecrire('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
    objets.forEach((f) => f());
    const xref = longueur;
    ecrire(`xref\n0 ${nb + 1}\n0000000000 65535 f \n`);
    for (let id = 1; id <= nb; id++) ecrire(`${String(positions[id]).padStart(10, '0')} 00000 n \n`);
    ecrire(`trailer\n<< /Size ${nb + 1} /Root ${catalogue} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const doc = morceaux.join('');
    const octets = new Uint8Array(doc.length);
    for (let i = 0; i < doc.length; i++) octets[i] = doc.charCodeAt(i) & 0xff;
    return octets;
  }
}
