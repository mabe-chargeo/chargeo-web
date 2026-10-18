// PDF texte minimal, sans dépendance (A4, Helvetica et Helvetica-Bold, encodage WinAnsi pour les accents français).
// Sert au rapport de mise en service généré par l'application (décision de Matthieu du 18/10/2026, 15 h 36 :
// « L'appli génère le rapport », à la place du PDF du contrôleur). Les caractères hors WinAnsi (emojis, Ω, Δ, →) sont
// remplacés par un équivalent lisible ou retirés.

export type Ligne = { texte: string; taille?: number; gras?: boolean; espace?: number; retrait?: number };

const LARGEUR = 595;
const HAUTEUR = 842;
const MARGE = 50;

const CP1252: Record<string, number> = {
  '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  'Œ': 0x8c, 'œ': 0x9c, 'Ÿ': 0x9f,
};
const REMPLACEMENTS: [RegExp, string][] = [
  [/✅\s*/g, ''], [/❌\s*/g, ''], [/⚠\uFE0F?\s*/g, ''], [/⚡\s*/g, ''],
  [/MΩ/g, 'Mohm'], [/Ω/g, 'ohm'], [/Δ/g, 'D'], [/→/g, '->'], [/[\u202f\u00a0]/g, ' '],
];

// Texte → octets WinAnsi (une lettre JavaScript = un octet)
export function versWinAnsi(s: string): string {
  let t = String(s ?? '');
  for (const [re, r] of REMPLACEMENTS) t = t.replace(re, r);
  let sortie = '';
  for (const ch of t) {
    const c = ch.codePointAt(0) || 0;
    if ((c >= 0x20 && c < 0x7f) || (c >= 0xa0 && c <= 0xff)) sortie += String.fromCharCode(c);
    else if (CP1252[ch]) sortie += String.fromCharCode(CP1252[ch]);
  }
  return sortie;
}

const echapper = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

function couper(texte: string, max: number): string[] {
  if (!texte) return [''];
  const mots = texte.split(' ');
  const lignes: string[] = [];
  let courante = '';
  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (essai.length > max && courante) { lignes.push(courante); courante = mot; }
    else courante = essai;
  }
  lignes.push(courante);
  return lignes;
}

export function genererPdf(lignes: Ligne[], pied = ''): Uint8Array {
  const pages: string[][] = [];
  let courante: string[] = [];
  let y = HAUTEUR - MARGE;
  for (const l of lignes) {
    const taille = l.taille || 10;
    const police = l.gras ? 'F2' : 'F1';
    const x = MARGE + (l.retrait || 0);
    const max = Math.max(20, Math.floor((LARGEUR - MARGE - x) / (taille * 0.5)));
    y -= l.espace || 0;
    for (const morceau of couper(versWinAnsi(l.texte), max)) {
      if (y - taille * 1.35 < MARGE + 20) { pages.push(courante); courante = []; y = HAUTEUR - MARGE; }
      y -= taille * 1.35;
      courante.push(`BT /${police} ${taille} Tf ${x} ${y.toFixed(1)} Td (${echapper(morceau)}) Tj ET`);
    }
  }
  pages.push(courante);

  const objets: string[] = [];
  const ajouter = (contenu: string) => { objets.push(contenu); return objets.length; };
  const catalogue = ajouter('');
  const racine = ajouter('');
  const f1 = ajouter('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = ajouter('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const enfants: number[] = [];
  pages.forEach((p, i) => {
    const basDePage = `BT /F1 8 Tf ${MARGE} 30 Td (${echapper(versWinAnsi(`${pied}${pied ? ' · ' : ''}page ${i + 1}/${pages.length}`))}) Tj ET`;
    const flux = [...p, basDePage].join('\n');
    const contenu = ajouter(`<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`);
    enfants.push(ajouter(`<< /Type /Page /Parent ${racine} 0 R /MediaBox [0 0 ${LARGEUR} ${HAUTEUR}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${contenu} 0 R >>`));
  });
  objets[catalogue - 1] = `<< /Type /Catalog /Pages ${racine} 0 R >>`;
  objets[racine - 1] = `<< /Type /Pages /Kids [${enfants.map((n) => `${n} 0 R`).join(' ')}] /Count ${enfants.length} >>`;

  let doc = '%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n';
  const positions: number[] = [];
  objets.forEach((o, i) => { positions.push(doc.length); doc += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = doc.length;
  doc += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  for (const p of positions) doc += `${String(p).padStart(10, '0')} 00000 n \n`;
  doc += `trailer\n<< /Size ${objets.length + 1} /Root ${catalogue} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  const octets = new Uint8Array(doc.length);
  for (let i = 0; i < doc.length; i++) octets[i] = doc.charCodeAt(i) & 0xff;
  return octets;
}
