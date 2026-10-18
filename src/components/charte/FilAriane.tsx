"use client";

// Fil d'Ariane de l'en-tête navy, sous le bouton Retour (18/10/2026, 17 h 20, validé sur maquette par Matthieu).
// L'onglet de la barre du bas puis les écrans parents, chaque mot étant un lien ; rien sur les écrans racines.
import { usePathname } from 'next/navigation';
import { filAriane } from '@/lib/filAriane';

export default function FilAriane() {
  const chemin = usePathname() || '';
  const miettes = filAriane(chemin);
  if (!miettes.length) return null;
  return (
    <nav aria-label="Fil d'Ariane" className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-semibold text-white/75">
      {miettes.map((m, i) => (
        <span key={`${m.href}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true">›</span>}
          <a href={m.href} className="underline decoration-white/35 underline-offset-4 transition-colors hover:text-white">{m.libelle}</a>
        </span>
      ))}
    </nav>
  );
}
