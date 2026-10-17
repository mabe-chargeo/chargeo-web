"use client";

// Barre de navigation de l'application équipe (carte des menus validée par Matthieu le 17/10/2026).
// 17/10, 20 h 17 (choix de Matthieu : « Oui, ces 4 onglets ») : Ma journée · À traiter · Consulter · Créer pour tous
// les rôles (MENUS[rôle].barre dans src/lib/menusAppli.ts) ; plus d'onglet « Plus » (la déconnexion est sous la
// pastille du rôle). Un seul onglet actif : le plus précis quand deux correspondent.
// Libellés courts en 12 px minimum (recherche bonnes pratiques du 17/10 : gants, plein soleil).
// Sans rôle connu (première ouverture hors ligne), barre minimale : Ma journée, Relevés, Créer.
// Relevé (/interne/metre/...) : masquée par défaut (le scénario et l'ancien formulaire ont leurs propres boutons en
// bas d'écran). 17/10, 20 h 33 (Matthieu : « ce serait bien qu'il y ait la barre d'onglets là ») : visible quand la
// page le demande par un repère data-barre-appli="oui" (fiche sans scénario, liste des scénarios), avec À traiter actif.
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BookOpen, ListTodo, PlusCircle } from 'lucide-react';
import { CYAN, NAVY } from '@/components/charte/couleurs';
import { ECRANS, MENUS, libelleBarre, precisionActif } from '@/lib/menusAppli';
import { ICONES } from '@/components/charte/iconesAppli';
import { useRoleAppli } from '@/components/charte/roleAppli';

// Icônes propres aux onglets de la barre
const ICONES_BARRE: Record<string, any> = { espace: ListTodo, consulter: BookOpen, creer: PlusCircle };

export default function NavAppli() {
  const chemin = usePathname() || '';
  const { role } = useRoleAppli();
  const releve = chemin.startsWith('/interne/metre');
  const [barreDemandee, setBarreDemandee] = useState(false);

  // Dans le relevé, la page dit si elle veut la barre (repère rendu par la page)
  useEffect(() => {
    if (!releve) return;
    const lire = () => setBarreDemandee(!!document.querySelector('[data-barre-appli="oui"]'));
    lire();
    const obs = new MutationObserver(lire);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [releve, chemin]);

  if (releve && !barreDemandee) return null;

  const cles = role ? MENUS[role].barre : ['journee', 'releves', 'creer'];
  const ecrans = cles.map((c) => ECRANS[c]).filter(Boolean);
  const precisions = ecrans.map((e) => precisionActif(e, chemin));
  const meilleure = Math.max(0, ...precisions);
  const onglets = ecrans.map((e, i) => ({
    cle: e.cle,
    href: e.href,
    libelle: libelleBarre(e),
    Icon: ICONES_BARRE[e.cle] || ICONES[e.icone],
    // Relevé : À traiter (Relevés à faire) quand aucun onglet ne correspond
    actif: meilleure > 0 ? precisions[i] === meilleure : releve && e.cle === 'espace',
  }));

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
