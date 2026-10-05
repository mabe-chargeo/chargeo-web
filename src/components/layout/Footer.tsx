// Pied de page commun (charte 2026) : vrais liens, standard, filigrane é.
import React from "react";
import Link from "next/link";

const COLONNES = [
  { titre: "Nos offres", liens: [["Particuliers", "/particuliers"], ["Copropriétés", "/copropriete"], ["Entreprises", "/pro"]] },
  { titre: "CHARGéO", liens: [["Guides & conseils", "/blog"], ["Recrutement", "/recrutement"], ["Mentions légales", "/mentions-legales"]] },
  { titre: "Clients", liens: [["Espace client", "/espace-client"], ["Étude gratuite", "/#contact"]] },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden" style={{ backgroundColor: "#032b60" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/filigrane-e.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute select-none"
        style={{ bottom: "-55%", right: "-8%", width: "min(620px, 90vw)" }}
      />
      <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1.3fr]">
          <div>
            <Link href="/" aria-label="CHARGéO, accueil">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-chargeo-slogan-blanc.svg" alt="CHARGéO, installateur de bornes de recharge" className="h-20 w-auto sm:h-24" />
            </Link>
          </div>
          {COLONNES.map((col) => (
            <div key={col.titre}>
              <p className="text-[13px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "#69e8ff" }}>{col.titre}</p>
              <ul className="mt-4 space-y-3">
                {col.liens.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-[16px] font-medium text-white transition-colors hover:text-[#69e8ff]">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="text-[13px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "#69e8ff" }}>Contact</p>
            <ul className="mt-4 space-y-3 text-[16px] font-medium text-white">
              <li><a href="tel:+33485692204" className="transition-colors hover:text-[#69e8ff]">Standard : 04 85 69 22 04</a></li>
              <li><a href="mailto:contact@chargeo.fr" className="transition-colors hover:text-[#69e8ff]">contact@chargeo.fr</a></li>
              <li className="max-w-[15rem]" style={{ color: "#a9d8e6" }}>89 chemin de la Ballastière, 74200 Thonon-les-Bains</li>
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-2 border-t border-white/15 pt-6 text-[14px] sm:flex-row sm:justify-between" style={{ color: "#a9d8e6" }}>
          <span>© {new Date().getFullYear()} CHARGéO · Installateur de bornes de recharge en Chablais et Haute-Savoie</span>
          <span>Entreprise en cours de création</span>
        </div>
      </div>
    </footer>
  );
}
