"use client";

// Menu commun à tout le site (charte 2026).
// Mêmes props qu'avant pour ne casser aucune page : isHome, showFloatingCta, onCtaClick, ctaText, ctaIcon.
// Nouveau : "transparent" pour les pages qui démarrent sur un haut de page navy (le menu devient blanc au défilement).
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, User, X, LucideIcon } from "lucide-react";

const NAVY = "#032b60";
const CYAN = "#0097b2";
const ORANGE = "#FF6B00";

const LIENS = [
  { label: "Particuliers", href: "/particuliers" },
  { label: "Copropriétés", href: "/copropriete" },
  { label: "Entreprises", href: "/pro" },
  { label: "Guides", href: "/blog" },
  { label: "Recrutement", href: "/recrutement" },
];

interface NavbarProps {
  isHome?: boolean;
  showFloatingCta?: boolean;
  onCtaClick?: () => void;
  ctaText?: string;
  ctaIcon?: LucideIcon;
  ctaHref?: string;
  transparent?: boolean;
}

export function Navbar({
  isHome = false,
  showFloatingCta = true,
  onCtaClick,
  ctaText,
  ctaIcon: CtaIcon = ArrowRight,
  ctaHref,
  transparent = false,
}: NavbarProps) {
  const pathname = usePathname() || "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = !transparent || scrolled || open;
  const ink = solid ? NAVY : "#ffffff";
  const libelle = ctaText && ctaText !== "Contact" ? ctaText : "Étude gratuite";
  const lienCta = ctaHref || (isHome ? "#contact" : "/#contact");
  const actif = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const BoutonCta = ({ mobile = false }: { mobile?: boolean }) => {
    const cls = mobile
      ? "mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[16px] font-semibold text-white"
      : "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-[15px] font-semibold text-white transition-transform hover:scale-[1.03]";
    const style = { backgroundColor: ORANGE, boxShadow: "0 6px 18px rgba(255,107,0,0.28)" };
    const contenu = (
      <>
        {libelle} <CtaIcon size={17} />
      </>
    );
    if (onCtaClick) {
      return (
        <button type="button" onClick={() => { setOpen(false); onCtaClick(); }} className={cls} style={style}>
          {contenu}
        </button>
      );
    }
    return (
      <a href={lienCta} onClick={() => setOpen(false)} className={cls} style={style}>
        {contenu}
      </a>
    );
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={{ backgroundColor: solid ? "#ffffff" : "transparent", boxShadow: solid ? "0 8px 22px rgba(3,43,96,0.08)" : "none" }}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-6 lg:h-24">
        <Link href="/" aria-label="CHARGéO, accueil" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={solid ? "/logo-chargeo-slogan-navy.svg" : "/logo-chargeo-slogan-blanc.svg"}
            alt="CHARGéO, installateur de bornes de recharge"
            className="h-11 w-auto sm:h-12 lg:h-14"
          />
        </Link>

        <nav className="hidden items-center gap-6 xl:gap-7 lg:flex">
          {LIENS.map((l) => (
            <Link key={l.href} href={l.href} className="group relative text-[15px] font-medium" style={{ color: ink }}>
              {l.label}
              <span
                className={`absolute -bottom-1.5 left-0 h-[3px] rounded-full transition-all duration-300 group-hover:w-full ${actif(l.href) ? "w-full" : "w-0"}`}
                style={{ backgroundColor: CYAN }}
              />
            </Link>
          ))}
          <Link
            href="/espace-client"
            className="inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-[15px] font-semibold transition-colors"
            style={{ borderColor: CYAN, color: solid ? CYAN : "#ffffff" }}
          >
            <User size={17} /> Espace client
          </Link>
          {showFloatingCta !== false || isHome ? <BoutonCta /> : null}
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/espace-client"
            aria-label="Espace client"
            className="flex h-11 w-11 items-center justify-center rounded-full border-2"
            style={{ borderColor: CYAN, color: solid ? CYAN : "#ffffff" }}
          >
            <User size={19} />
          </Link>
          <button
            type="button"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((o) => !o)}
            className="flex h-11 w-11 items-center justify-center"
            style={{ color: ink }}
          >
            {open ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t bg-white px-6 pb-6 lg:hidden" style={{ borderColor: "#eceef1" }}>
          {LIENS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-b py-3.5 text-[17px] font-medium"
              style={{ color: NAVY, borderColor: "#eceef1" }}
            >
              {l.label}
              {actif(l.href) && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CYAN }} />}
            </Link>
          ))}
          <Link
            href="/espace-client"
            onClick={() => setOpen(false)}
            className="mt-4 flex items-center justify-center gap-2 rounded-full border-2 py-3 text-[16px] font-semibold"
            style={{ borderColor: CYAN, color: CYAN }}
          >
            <User size={18} /> Espace client
          </Link>
          <BoutonCta mobile />
        </div>
      )}
    </header>
  );
}
