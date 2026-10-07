import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HautPhoto } from "@/components/charte/HautPhoto";
import { GuidesGrille, BlocOffres, type GuideResume } from "@/components/charte/Guides";
import { articles, formatDate } from "@/content/blog";

// Page Guides, charte 2026 (maquette validée le 05/10/2026). SEO et contenu (src/content/blog.ts) inchangés.
// 07/10/2026 (images) : photo de haut de page propre au blog (n'est plus celle de l'accueil).
export const metadata: Metadata = {
  title: "Guides borne de recharge à Thonon & Chablais | CHARGÉO",
  description:
    "Nos guides pour installer une borne de recharge à Thonon, Évian et dans le Chablais : droit à la prise, choix de la borne, aides ADVENIR en copropriété.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const sorted = [...articles].sort((a, b) => b.date.localeCompare(a.date));
  const guides: GuideResume[] = sorted.map((a) => ({
    slug: a.slug,
    title: a.title,
    description: a.description,
    category: a.category,
    readingMinutes: a.readingMinutes,
    dateTexte: formatDate(a.date),
    cover: { src: a.cover.src, alt: a.cover.alt },
  }));

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans antialiased" style={{ color: "#032b60" }}>
      <Navbar transparent />
      <main>
        <HautPhoto
          img="/photo-parking-bornes.webp"
          eyebrow="Guides & conseils"
          eyeIcon={BookOpen}
          minH="560px"
          titre="Tout comprendre sur la recharge."
          sous="Des réponses claires aux questions que se posent les particuliers, les entreprises et les copropriétés du Chablais avant d’installer une borne."
        />
        <GuidesGrille guides={guides} />
        <BlocOffres />
      </main>
      <Footer />
    </div>
  );
}
