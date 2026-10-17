"use client";

// Barre de navigation de l'application équipe, une par rôle (validée par Matthieu le 17/10/2026, écrans du 11/10) :
// les écrans les plus utilisés du rôle affiché, puis « Plus ». Menus définis dans src/lib/menusAppli.ts.
// Libellés en 12 px minimum (recherche bonnes pratiques du 17/10 : gants, plein soleil).
// Sans rôle connu (première ouverture hors ligne), barre minimale : Ma journée, Relevés, Plus.
// Masquée dans le relevé (/interne/metre/...), qui a ses propres boutons en bas d'écran.
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { CYAN, NAVY } from '@/components/charte/couleurs';
import { ECRANS, MENUS, estActif } from '@/lib/menusAppli';
import { ICONES } from '@/components/charte/iconesAppli';
import { useRoleAppli } from '@/components/charte/roleAppli';

export default function NavAppli() {
  const chemin = usePathname() || '';
  const { role } = useRoleAppli();

  if (chemin.startsWith('/interne/metre')) return null;

  const cles = role ? MENUS[role].barre : ['journee', 'releves'];
  const ecrans = cles.map((c) => ECRANS[c]).filter(Boolean);
  const unActif = ecrans.some((e) => estActif(e, chemin));
  const onglets = [
    ...ecrans.map((e) => ({ cle: e.cle, href: e.href, libelle: e.libelle, Icon: ICONES[e.icone], actif: estActif(e, chemin) })),
    { cle: 'plus', href: '/interne/plus', libelle: 'Plus', Icon: Menu, actif: chemin.startsWith('/interne/plus') || !unActif },
  ];

  return (
    <>
      <div className="h-24" aria-hidden />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dfe3e8] bg-white/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navigation de l'application"
      >
        <div className="mx-auto flex max-w-lg">
          {onglets.map(({ cle, href, libelle, Icon, actif }) => (
            <a
              key={cle}
              href={href}
              aria-current={actif ? 'page' : undefined}
              className="flex min-h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 py-2.5 text-center text-[12px] font-bold leading-tight transition-transform active:scale-95"
              style={{ color: actif ? CYAN : NAVY }}
            >
              <span
                className="flex h-8 w-12 items-center justify-center rounded-full"
                style={actif ? { backgroundColor: '#e3f4f7' } : undefined}
              >
                <Icon size={22} strokeWidth={actif ? 2.2 : 1.8} />
              </span>
              <span className="w-full truncate">{libelle}</span>
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}
