"use client";

// Briques communes de la charte 2026 (même grammaire que les brochures) :
// titres Poppins 700 en casse de phrase, barre turquoise 120 x 10 au-dessus des titres,
// cartes grises #eceef1 arrondies à 24 px, icônes blanches sur carré turquoise,
// filigrane é uniquement en haut de page et dans le pied de page.
import React, { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

export const NAVY = "#032b60";
export const CYAN = "#0097b2";
export const ORANGE = "#FF6B00";
export const LABEL = "#007f96";
export const GRIS = "#eceef1";
export const BLEU_CLAIR = "#a9d8e6";
export const CYAN_CLAIR = "#69e8ff";
export const CARTE: React.CSSProperties = { backgroundColor: GRIS, boxShadow: "0 8px 22px rgba(3,43,96,0.10)" };

export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vu, setVu] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVu(true);
          obs.disconnect();
        }
      },
      { rootMargin: "120px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${vu ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function Barre({ w = 120 }: { w?: number }) {
  return <span className="block h-[10px] rounded-[5px]" style={{ width: w, backgroundColor: CYAN }} />;
}

export function Lbl({ children, light = false, className = "" }: { children: React.ReactNode; light?: boolean; className?: string }) {
  return (
    <p className={`text-[13px] font-extrabold uppercase tracking-[0.12em] ${className}`} style={{ color: light ? CYAN_CLAIR : LABEL }}>
      {children}
    </p>
  );
}

export function Titre({ children, light = false, className = "", as = "h2" }: { children: React.ReactNode; light?: boolean; className?: string; as?: "h1" | "h2" }) {
  const Tag = as;
  return (
    <Tag className={`mt-8 text-[34px] font-bold leading-[1.14] tracking-[-0.015em] sm:text-[48px] ${className}`} style={{ color: light ? "#ffffff" : NAVY }}>
      {children}
    </Tag>
  );
}

export function Icone({ I, size = 56, r = 16, s = 26, bg = CYAN }: { I: LucideIcon; size?: number; r?: number; s?: number; bg?: string }) {
  return (
    <div className="flex shrink-0 items-center justify-center" style={{ width: size, height: size, borderRadius: r, backgroundColor: bg }}>
      <I size={s} color="#ffffff" strokeWidth={1.8} />
    </div>
  );
}

export function Filigrane({ style }: { style?: React.CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/filigrane-e.svg" alt="" aria-hidden="true" className="pointer-events-none absolute select-none" style={style} />
  );
}
