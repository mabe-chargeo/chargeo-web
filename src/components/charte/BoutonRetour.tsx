"use client";

// Bouton Retour de l'en-tête (17/10/2026, 16 h 19, Matthieu : « il faut bien faire attention à ce qu'il y ait des
// boutons retour partout pour pouvoir revenir à l'écran précédent sans galérer »).
// Revient à l'écran précédent de l'application (historique du navigateur) quand on y est arrivé depuis l'application ;
// sinon (lien ouvert depuis ClickUp, un mail, un favori) ouvre l'écran parent « repli ». Sans JavaScript, le lien
// mène aussi à l'écran parent.
// Pas de bouton sur les écrans racines de la barre du bas quand rien n'est imposé : Ma journée, À traiter, Consulter
// (ajouté le 17/10, 22 h 20 : la barre a 4 onglets depuis 20 h 17) et Créer.
// 19/10/2026, 18 h 43 (adresses propres) : racines et repli lus dans src/lib/adresses.ts ; « arrivé depuis l'application »
// = page précédente du même site et écran de l'application (estPageAppli), plus de préfixe /interne.
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { adresses, estPageAppli } from '@/lib/adresses';

const RACINES = [adresses.journee, adresses.aTraiter, adresses.consulter, adresses.creer];
const CLE_PAGES = 'chargeo_pages_vues';

// La page précédente est un écran de l'application, sur la même adresse
function depuisLAppli(): boolean {
  try {
    const precedente = new URL(document.referrer);
    return precedente.origin === window.location.origin && estPageAppli(precedente.pathname);
  } catch {
    return false;
  }
}

export default function BoutonRetour({ repli = adresses.aTraiter, force = false }: { repli?: string; force?: boolean }) {
  const chemin = usePathname() || '';
  const [avecRequete, setAvecRequete] = useState(false);

  // Compte les écrans de l'application vus dans cet onglet : au-delà d'un, l'écran précédent est dans l'application
  useEffect(() => {
    setAvecRequete(!!window.location.search);
    try {
      const n = Number(sessionStorage.getItem(CLE_PAGES) || '0');
      sessionStorage.setItem(CLE_PAGES, String(n + 1));
    } catch { /* navigation privée */ }
  }, [chemin]);

  // Écran racine sans paramètre (ex. l'espace d'un autre rôle garde son retour)
  if (!force && RACINES.includes(chemin) && !avecRequete) return null;

  const revenir = (e: React.MouseEvent<HTMLAnchorElement>) => {
    let vues = 0;
    try { vues = Number(sessionStorage.getItem(CLE_PAGES) || '0'); } catch { /* rien */ }
    if (window.history.length > 1 && (vues > 1 || depuisLAppli())) {
      e.preventDefault();
      window.history.back();
    }
  };

  return (
    <a
      href={repli}
      onClick={revenir}
      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white transition-transform active:scale-95"
    >
      <ArrowLeft size={16} /> Retour
    </a>
  );
}
