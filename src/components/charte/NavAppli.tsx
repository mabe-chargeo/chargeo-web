"use client";

// Barre de navigation de l'application équipe (structure validée par Matthieu le 16/10/2026) : fixe en bas de chaque
// écran de /interne, 4 onglets. Chacun ne voit que les onglets de ses rôles (lus sur /api/interne/moi) ; sans réponse
// (hors ligne, session expirée), tous les onglets restent affichés : l'affichage ne donne aucun droit.
// Masquée dans le relevé (/interne/metre/...), qui a ses propres boutons en bas d'écran.
import { useEffect, useState, type ElementType } from 'react';
import { usePathname } from 'next/navigation';
import { FolderOpen, HardHat, Menu, Sun } from 'lucide-react';
import { CYAN, NAVY } from '@/components/charte/couleurs';

type Role = 'direction' | 'commercial' | 'chargeOperation' | 'backOffice' | 'poseur';

const ONGLETS: { href: string; libelle: string; icon: ElementType; roles: Role[] | null; actif: (p: string) => boolean }[] = [
  { href: '/interne/journee', libelle: 'Ma journée', icon: Sun, roles: null, actif: (p) => p.startsWith('/interne/journee') },
  {
    href: '/interne/fiches', libelle: 'Fiches', icon: FolderOpen, roles: ['direction', 'commercial', 'chargeOperation', 'backOffice'],
    actif: (p) => p.startsWith('/interne/fiches'),
  },
  {
    href: '/interne/chantiers', libelle: 'Chantiers', icon: HardHat, roles: ['direction', 'chargeOperation', 'poseur'],
    actif: (p) => ['/interne/chantiers', '/interne/feu-vert', '/interne/reception', '/interne/validation'].some((x) => p.startsWith(x)),
  },
  { href: '/interne/plus', libelle: 'Plus', icon: Menu, roles: null, actif: (p) => p === '/interne' || p.startsWith('/interne/plus') },
];

export default function NavAppli() {
  const chemin = usePathname() || '';
  const [roles, setRoles] = useState<Role[] | null>(null);

  useEffect(() => {
    fetch('/api/interne/moi', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (Array.isArray(j?.roles) && j.roles.length) setRoles(j.roles as Role[]); })
      .catch(() => {});
  }, []);

  if (chemin.startsWith('/interne/metre')) return null;
  const onglets = ONGLETS.filter((o) => !o.roles || !roles || o.roles.some((r) => roles.includes(r)));

  return (
    <>
      <div className="h-24" aria-hidden />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dfe3e8] bg-white/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navigation de l'application"
      >
        <div className="mx-auto flex max-w-lg">
          {onglets.map(({ href, libelle, icon: Icon, actif }) => {
            const estActif = actif(chemin);
            return (
              <a
                key={href}
                href={href}
                aria-current={estActif ? 'page' : undefined}
                className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[12px] font-bold transition-transform active:scale-95"
                style={{ color: estActif ? CYAN : NAVY }}
              >
                <span
                  className="flex h-8 w-14 items-center justify-center rounded-full"
                  style={estActif ? { backgroundColor: '#e3f4f7' } : undefined}
                >
                  <Icon size={21} strokeWidth={estActif ? 2.2 : 1.8} />
                </span>
                {libelle}
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
