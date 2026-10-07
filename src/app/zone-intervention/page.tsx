// src/app/zone-intervention/page.tsx
// Page « Zone d'intervention » (07/10/2026, SEO local) : relie les pages des communes.
// 07/10/2026 (images) : photo de haut de page propre (n'est plus celle de l'accueil).
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Phone } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HautPhoto } from "@/components/charte/HautPhoto";
import { BlocOffres } from "@/components/charte/Guides";
import { Barre, Titre } from "@/components/charte/Charte";
import { villes, pct } from "@/content/villes";

const NAVY = "#032b60";
const CYAN = "#0097b2";
const GRIS = "#eceef1";
const BASE = "https://www.chargeo.fr";

export const metadata: Metadata = {
  title: "Zone d'intervention : Chablais, Genevois et Annecy | CHARGÉO",
  description:
    "CHARGéO installe des bornes de recharge à Thonon-les-Bains, Évian, Publier, Douvaine, Annemasse, Annecy et dans tout le Chablais. Chiffres locaux et conseils par commune.",
  alternates: { canonical: "/zone-intervention" },
};

export default function ZoneInterventionPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Zone d'intervention", item: `${BASE}/zone-intervention` },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans antialiased" style={{ color: NAVY }}>
      <Navbar transparent />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <HautPhoto
          img="/review-flotte.webp"
          eyebrow="Zone d'intervention"
          eyeIcon={MapPin}
          minH="560px"
          titreClass="sm:text-[52px] lg:text-[64px]"
          titre="Du Chablais au Genevois, on vient chez vous."
          sous="Notre équipe est basée à Thonon-les-Bains. Nous intervenons dans tout le Chablais, le Genevois français et jusqu'à Annecy. Chaque commune a ses particularités : voici ce qu'il faut savoir chez vous."
        />

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
            <Barre />
            <Titre>Choisissez votre commune.</Titre>
            <ul className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {villes.map((v) => (
                <li key={v.slug}>
                  <Link href={`/zone-intervention/${v.slug}`} className="group flex h-full flex-col rounded-[24px] p-8 transition-transform hover:-translate-y-1.5" style={{ backgroundColor: GRIS, boxShadow: "0 8px 22px rgba(3,43,96,0.10)", color: NAVY }}>
                    <span className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "#007f96" }}>
                      <MapPin size={15} /> {v.km === 0 ? "Notre base" : `≈ ${v.km} km de Thonon`}
                    </span>
                    <h2 className="mt-4 text-[26px] font-bold leading-tight">{v.nom}</h2>
                    <p className="mt-3 flex-1 text-[15px] leading-relaxed">
                      {pct(v.appartements)} d&apos;appartements, {pct(v.maisons)} de maisons. {v.enjeux[0].titre}.
                    </p>
                    <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold" style={{ color: CYAN }}>
                      Voir la page <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-10 max-w-[48rem] text-[17px] leading-relaxed">
              Votre commune n&apos;est pas dans la liste ? Nous intervenons dans tout le Chablais et le Genevois français.{" "}
              <a href="tel:+33485692204" className="inline-flex items-center gap-1 font-semibold underline decoration-2 underline-offset-4" style={{ color: CYAN }}>
                <Phone size={16} /> Appelez-nous au 04 85 69 22 04
              </a>
              , on vous dit tout de suite si et comment nous pouvons venir.
            </p>
          </div>
        </section>

        <BlocOffres />
      </main>
      <Footer />
    </div>
  );
}
