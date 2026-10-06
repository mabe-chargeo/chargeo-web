"use client";

// Briques des pages Guides (charte 2026) : filtre par catégorie, carte de guide, bloc « à la une »,
// bloc turquoise des 3 offres. Les données viennent toujours de src/content/blog.ts.
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, Phone, Home, Building, Briefcase, User, ClipboardList, FileSignature, LifeBuoy } from "lucide-react";
import { NAVY, CYAN, ORANGE, LABEL, BLEU_CLAIR, CYAN_CLAIR, CARTE, Reveal, Barre, Lbl, Titre, Icone } from "@/components/charte/Charte";

export type GuideResume = {
  slug: string; title: string; description: string; category: string;
  readingMinutes: number; dateTexte: string; cover: { src: string; alt: string };
};

export function Meta({ g, light = false }: { g: GuideResume; light?: boolean }) {
  return (
    <p className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: light ? BLEU_CLAIR : LABEL }}>
      <Clock size={15} className="shrink-0" /> {g.readingMinutes} min de lecture · {g.dateTexte}
    </p>
  );
}

function Pastille({ children }: { children: React.ReactNode }) {
  return <span className="w-fit rounded-full px-3 py-1 text-[12px] font-extrabold uppercase tracking-[0.12em] text-white" style={{ backgroundColor: CYAN }}>{children}</span>;
}

export function CarteGuide({ g }: { g: GuideResume }) {
  return (
    <Link href={`/blog/${g.slug}`} className="group relative flex h-full flex-col overflow-hidden rounded-[24px] transition-transform duration-500 hover:-translate-y-1.5" style={{ ...CARTE, color: NAVY }}>
      <div className="pointer-events-none absolute inset-0 z-10 rounded-[24px] opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ boxShadow: `inset 0 0 0 2.5px ${CYAN}` }} />
      <div className="relative h-[210px] overflow-hidden">
        <Image src={g.cover.src} alt={g.cover.alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
      </div>
      <div className="flex flex-1 flex-col p-7">
        <Pastille>{g.category}</Pastille>
        <h3 className="mt-4 text-[21px] font-bold leading-snug">{g.title}</h3>
        <p className="mt-3 flex-1 text-[15px] leading-relaxed">{g.description}</p>
        <div className="mt-6 flex items-center justify-between gap-4">
          <Meta g={g} />
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors group-hover:bg-[#0097b2]" style={{ backgroundColor: NAVY }}>
            <ArrowRight size={18} color="#fff" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function CarteEquipe() {
  return (
    <div className="flex h-full flex-col justify-center rounded-[24px] p-8" style={{ backgroundColor: NAVY }}>
      <Icone I={Phone} />
      <Lbl light className="mt-6">Une question avant de vous lancer ?</Lbl>
      <p className="mt-2 text-[26px] font-bold leading-snug text-white">Parlez à l’équipe qui pose les bornes.</p>
      <p className="mt-3 text-[16px] leading-relaxed" style={{ color: BLEU_CLAIR }}>
        Standard : <a href="tel:+33485692204" className="font-semibold text-white hover:underline">04 85 69 22 04</a>, du lundi au vendredi.
      </p>
      <Link href="/#contact" className="mt-7 inline-flex w-fit items-center gap-3 rounded-full px-7 py-3.5 text-[16px] font-semibold text-white" style={{ backgroundColor: ORANGE }}>
        Étude gratuite <ArrowRight size={18} />
      </Link>
    </div>
  );
}

// Filtre + guide à la une + grille. Les puces sont construites à partir des catégories réellement publiées.
export function GuidesGrille({ guides }: { guides: GuideResume[] }) {
  const categories = Array.from(new Set(guides.map((g) => g.category)));
  const [filtre, setFiltre] = useState<string>("Tous");
  const liste = filtre === "Tous" ? guides : guides.filter((g) => g.category === filtre);
  const [une, ...autres] = liste;

  return (
    <>
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 pt-16">
          <div className="flex flex-wrap gap-3" role="tablist" aria-label="Filtrer les guides">
            {["Tous", ...categories].map((c) => {
              const actif = c === filtre;
              return (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={actif}
                  onClick={() => setFiltre(c)}
                  className="rounded-full px-6 py-3 text-[15px] font-semibold transition-colors"
                  style={actif ? { backgroundColor: CYAN, color: "#fff" } : { backgroundColor: "#eceef1", color: NAVY }}
                >
                  {c === "Tous" ? "Tous les guides" : c}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {une && (
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 pt-14">
            <Barre />
            <Lbl className="mt-8">{filtre === "Tous" ? "Le dernier guide" : `Le dernier guide · ${filtre}`}</Lbl>
            <Reveal>
              <Link href={`/blog/${une.slug}`} className="group mt-6 grid overflow-hidden rounded-[28px] lg:grid-cols-2" style={{ ...CARTE, color: NAVY }}>
                <div className="relative h-[280px] overflow-hidden lg:h-auto lg:min-h-[400px]">
                  <Image src={une.cover.src} alt={une.cover.alt} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                </div>
                <div className="flex flex-col justify-center p-8 lg:p-12">
                  <Pastille>{une.category}</Pastille>
                  <h2 className="mt-5 text-[28px] font-bold leading-tight sm:text-[32px]">{une.title}</h2>
                  <p className="mt-4 text-[17px] leading-relaxed">{une.description}</p>
                  <div className="mt-8 flex flex-wrap items-center gap-6">
                    <span className="inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-[16px] font-semibold text-white transition-colors group-hover:bg-[#032b60]" style={{ backgroundColor: CYAN }}>
                      Lire le guide <ArrowRight size={18} />
                    </span>
                    <Meta g={une} />
                  </div>
                </div>
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <Barre />
          <Titre>{filtre === "Tous" ? "Tous nos guides." : "Les autres guides."}</Titre>
          <div className="mt-12 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {autres.map((g, i) => (
              <Reveal key={g.slug} delay={(i % 3) * 80} className="h-full"><CarteGuide g={g} /></Reveal>
            ))}
            <CarteEquipe />
          </div>
        </div>
      </section>
    </>
  );
}

export function GuidesLies({ guides }: { guides: GuideResume[] }) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-6 pb-20">
        <Barre />
        <Titre>À lire aussi.</Titre>
        <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((g) => <CarteGuide key={g.slug} g={g} />)}
          <div className="flex h-full flex-col justify-center rounded-[24px] p-8" style={{ backgroundColor: NAVY }}>
            <Lbl light>Votre espace client</Lbl>
            <p className="mt-2 text-[24px] font-bold text-white">Suivez tout, en ligne.</p>
            <ul className="mt-5 space-y-3">
              {[{ i: ClipboardList, t: "Suivi du chantier" }, { i: FileSignature, t: "Devis à signer" }, { i: LifeBuoy, t: "Tickets SAV" }].map((p) => (
                <li key={p.t} className="flex items-center gap-3 text-[16px] font-medium text-white"><p.i size={18} color={CYAN_CLAIR} /> {p.t}</li>
              ))}
            </ul>
            <Link href="/espace-client" className="mt-7 inline-flex w-fit items-center gap-3 rounded-full px-6 py-3 text-[16px] font-semibold text-white" style={{ backgroundColor: CYAN }}>
              <User size={18} /> Accéder à mon espace
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BlocOffres({ titre = "Un projet de borne dans le Chablais ?", sous = "Étude gratuite, prix ferme, installateur local. Choisissez votre situation :" }: { titre?: string; sous?: string }) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-[28px] p-8 sm:p-10 lg:p-14" style={{ backgroundColor: CYAN }}>
          <h2 className="text-[30px] font-bold leading-tight text-white sm:text-[42px]">{titre}</h2>
          <p className="mt-3 text-[18px] text-white">{sous}</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              { i: Home, t: "Particuliers", s: "Maison, droit à la prise", href: "/particuliers" },
              { i: Building, t: "Copropriétés", s: "Infrastructure, borne partagée", href: "/copropriete" },
              { i: Briefcase, t: "Entreprises", s: "Flotte, tertiaire, domicile salariés", href: "/pro" },
            ].map((o) => (
              <Link key={o.t} href={o.href} className="group flex items-center gap-5 rounded-[20px] bg-white p-5 transition-transform hover:-translate-y-1" style={{ boxShadow: "0 8px 22px rgba(3,43,96,0.18)", color: NAVY }}>
                <Icone I={o.i} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="text-[20px] font-bold">{o.t}</p>
                  <p className="text-[14px]">{o.s}</p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: ORANGE }}>
                  <ArrowRight size={20} color="#fff" className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
