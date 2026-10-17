// Affichage simple du Markdown des Docs ClickUp (wikis, 17/10/2026, 19 h 25), lisible au téléphone.
// Gère : titres (#, ##, ###), paragraphes, listes à puces et numérotées, cases (- [ ] / - [x]), citations (>),
// tableaux (| a | b |, affichés en cartes ligne par ligne), séparateurs (---), gras, code et liens.
// Les balises HTML de ClickUp (bannières, mentions) sont retirées, leur texte gardé. Les liens vers ClickUp sont
// affichés en texte simple (ClickUp n'est pas utilisé au téléphone) ; les autres liens s'ouvrent dans un nouvel onglet.
import React from 'react';
import { CYAN, CYAN_PALE } from '@/components/charte/couleurs';

const sansHtml = (s: string) => s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');

// Gras, code et liens dans une ligne
function enLigne(texte: string, cle: string): React.ReactNode[] {
  const morceaux = texte.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]*\]\([^)\s]+\))/g).filter((m) => m !== '');
  return morceaux.map((m, i) => {
    const k = `${cle}-${i}`;
    if (m.startsWith('**') && m.endsWith('**') && m.length > 4) return <strong key={k}>{m.slice(2, -2)}</strong>;
    if (m.startsWith('`') && m.endsWith('`') && m.length > 2) return <code key={k} className="rounded bg-[#eef1f4] px-1.5 py-0.5 text-[0.92em] font-semibold">{m.slice(1, -1)}</code>;
    const lien = m.match(/^\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (lien) {
      const libelle = lien[1] || lien[2];
      if (/clickup\.com/i.test(lien[2]) || !/^https?:/i.test(lien[2])) return <strong key={k}>{libelle}</strong>;
      return <a key={k} href={lien[2]} target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: CYAN }}>{libelle}</a>;
    }
    return <React.Fragment key={k}>{m}</React.Fragment>;
  });
}

const cellules = (ligne: string) => ligne.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

export default function Markdown({ texte }: { texte: string }) {
  const lignes = sansHtml(texte || '').replace(/\r/g, '').split('\n');
  const blocs: React.ReactNode[] = [];
  let i = 0;
  let n = 0;
  const cle = () => `b${n++}`;

  while (i < lignes.length) {
    const brute = lignes[i];
    const l = brute.trim();
    if (!l) { i++; continue; }

    // Titres
    const titre = l.match(/^(#{1,6})\s+(.*)$/);
    if (titre) {
      const niveau = titre[1].length;
      const k = cle();
      if (niveau <= 1) blocs.push(<h2 key={k} className="pt-2 text-[22px] font-bold leading-tight">{enLigne(titre[2], k)}</h2>);
      else if (niveau === 2) blocs.push(<h3 key={k} className="pt-3 text-[19px] font-bold leading-tight">{enLigne(titre[2], k)}</h3>);
      else blocs.push(<h4 key={k} className="pt-2 text-[16px] font-extrabold">{enLigne(titre[2], k)}</h4>);
      i++;
      continue;
    }

    // Séparateur
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(l)) { blocs.push(<hr key={cle()} className="border-[#dfe3e8]" />); i++; continue; }

    // Tableau : une carte par ligne, « en-tête : valeur »
    if (l.startsWith('|')) {
      const table: string[][] = [];
      while (i < lignes.length && lignes[i].trim().startsWith('|')) {
        const t = lignes[i].trim();
        if (!/^\|?\s*:?-{2,}/.test(t.replace(/\|/g, '|'))) table.push(cellules(t));
        i++;
      }
      const [entete, ...rangs] = table;
      const k = cle();
      blocs.push(
        <div key={k} className="space-y-2">
          {(rangs.length ? rangs : [entete || []]).map((r, ri) => (
            <div key={`${k}-${ri}`} className="rounded-[14px] bg-white p-3 ring-[1.5px] ring-[#dfe3e8]">
              {r.map((c, ci) => (
                <p key={ci} className={ci === 0 ? 'text-[15px] font-bold' : 'mt-0.5 text-[14px]'}>
                  {ci > 0 && entete?.[ci] && rangs.length ? <span className="text-slate-500">{entete[ci]} : </span> : null}
                  {enLigne(c, `${k}-${ri}-${ci}`)}
                </p>
              ))}
            </div>
          ))}
        </div>,
      );
      continue;
    }

    // Citation
    if (l.startsWith('>')) {
      const contenu: string[] = [];
      while (i < lignes.length && lignes[i].trim().startsWith('>')) { contenu.push(lignes[i].trim().replace(/^>\s?/, '')); i++; }
      const k = cle();
      blocs.push(<blockquote key={k} className="rounded-[14px] px-4 py-3 text-[15px] leading-relaxed" style={{ backgroundColor: CYAN_PALE, boxShadow: `inset 4px 0 0 ${CYAN}` }}>{enLigne(contenu.join(' '), k)}</blockquote>);
      continue;
    }

    // Listes (puces, numéros, cases)
    if (/^([-*+]|\d+[.)])\s+/.test(l)) {
      const items: { texte: string; case?: boolean; cochee?: boolean }[] = [];
      while (i < lignes.length && /^([-*+]|\d+[.)])\s+/.test(lignes[i].trim())) {
        const t = lignes[i].trim().replace(/^([-*+]|\d+[.)])\s+/, '');
        const c = t.match(/^\[( |x|X)\]\s*(.*)$/);
        items.push(c ? { texte: c[2], case: true, cochee: c[1].toLowerCase() === 'x' } : { texte: t });
        i++;
      }
      const k = cle();
      blocs.push(
        <ul key={k} className="space-y-1.5">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-2 text-[15px] leading-relaxed">
              <span className="shrink-0 font-bold" style={{ color: CYAN }}>{it.case ? (it.cochee ? '☑' : '☐') : '•'}</span>
              <span className="min-w-0">{enLigne(it.texte, `${k}-${ii}`)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Paragraphe : lignes consécutives jusqu'à une ligne vide ou un autre bloc
    const para: string[] = [];
    while (i < lignes.length) {
      const t = lignes[i].trim();
      if (!t || /^(#{1,6}\s|>|\||([-*+]|\d+[.)])\s+|-{3,}$)/.test(t)) break;
      para.push(t);
      i++;
    }
    const k = cle();
    blocs.push(<p key={k} className="text-[15px] leading-relaxed">{enLigne(para.join(' '), k)}</p>);
  }

  return <div className="space-y-3">{blocs}</div>;
}
