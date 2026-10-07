"use client";

// Liens vers les guides du blog, affichés sous la FAQ des pages offres (07/10/2026, SEO).
// Ils relient chaque offre aux guides qui la concernent : Google comprend mieux le site,
// et le visiteur qui hésite trouve la réponse détaillée. La liste se règle ici, par page.
// Pas encore de guide pour /pro : rien ne s'affiche tant qu'aucun slug n'est listé.
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { articles } from "@/content/blog";

const GUIDES_PAR_PAGE: Record<string, string[]> = {
  "/particuliers": [
    "prix-borne-recharge-maison-haute-savoie",
    "prise-renforcee-ou-wallbox-que-choisir",
    "droit-a-la-prise-copropriete-borne-recharge",
  ],
  "/copropriete": [
    "vote-borne-recharge-assemblee-generale-copropriete",
    "prime-advenir-copropriete-infrastructure-collective",
    "droit-a-la-prise-copropriete-borne-recharge",
  ],
};

export function GuidesLiens() {
  const chemin = usePathname();
  const slugs = GUIDES_PAR_PAGE[chemin ?? ""] ?? [];
  const guides = slugs
    .map((s) => articles.find((a) => a.slug === s))
    .filter((a): a is (typeof articles)[number] => Boolean(a));
  if (guides.length === 0) return null;

  return (
    <div className="pt-10">
      <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "#007f96" }}>Nos guides pour aller plus loin</p>
      <ul className="mt-5 grid gap-4 md:grid-cols-3">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link href={`/blog/${g.slug}`} className="group flex h-full flex-col justify-between gap-4 rounded-[20px] p-6 transition-transform hover:-translate-y-1" style={{ backgroundColor: "#eceef1", color: "#032b60" }}>
              <span className="text-[17px] font-bold leading-snug">{g.title}</span>
              <span className="inline-flex items-center gap-2 text-[15px] font-semibold" style={{ color: "#0097b2" }}>
                Lire le guide <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
