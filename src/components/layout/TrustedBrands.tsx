"use client";

// Bandeau défilant des marques (charte 2026) : défilement continu, pause au survol,
// logos en gris qui reprennent leur couleur au survol. Hauteurs réglées logo par logo
// pour un poids visuel égal. Animation coupée si l'utilisateur a demandé moins de mouvement.
import React from "react";

const MARQUES = [
  { nom: "Hager", src: "/logo-hager.jpg", h: 30 },
  { nom: "Schneider Electric", src: "/logo-schneider.svg", h: 36 },
  { nom: "Peblar", src: "/logo-peblar.svg", h: 28 },
  { nom: "ABB", src: "/logo-abb.svg", h: 28 },
  { nom: "Legrand", src: "/logo-legrand.png", h: 26 },
  { nom: "Autel", src: "/logo-autel.png", h: 22 },
  { nom: "Wallbox", src: "/logo-wallbox.png", h: 24 },
  { nom: "Alfen", src: "/logo-alfen.jpeg", h: 28 },
];

const CSS = `
@keyframes defilement-marques { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.bandeau-defilant { animation: defilement-marques 38s linear infinite; will-change: transform; }
.bandeau-defilant:hover { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .bandeau-defilant { animation: none; width: auto; flex-wrap: wrap; justify-content: center; }
  .bandeau-copie { display: none; }
  .bandeau-masque { mask-image: none !important; -webkit-mask-image: none !important; }
}
`;

function Serie({ copie = false }: { copie?: boolean }) {
  return (
    <ul className={`flex shrink-0 items-center ${copie ? "bandeau-copie" : ""}`} aria-hidden={copie ? "true" : undefined}>
      {MARQUES.map((m) => (
        <li key={m.nom} className="group flex h-16 w-[170px] shrink-0 items-center justify-center px-6 sm:w-[210px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.src}
            alt={copie ? "" : m.nom}
            loading="lazy"
            style={{ height: m.h }}
            className="w-auto max-w-[150px] object-contain opacity-50 mix-blend-multiply grayscale transition duration-500 group-hover:opacity-100 group-hover:grayscale-0"
          />
        </li>
      ))}
    </ul>
  );
}

export function TrustedBrands() {
  return (
    <section aria-label="Marques que nous installons" className="border-b border-[#eceef1] bg-white py-8 md:py-10">
      <style>{CSS}</style>
      <div
        className="bandeau-masque relative overflow-hidden"
        style={{ maskImage: "linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%)", WebkitMaskImage: "linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%)" }}
      >
        <div className="bandeau-defilant flex w-max">
          <Serie />
          <Serie copie />
        </div>
      </div>
    </section>
  );
}
