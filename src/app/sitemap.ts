// src/app/sitemap.ts
// Génère /sitemap.xml : la liste des pages publiques à indexer par Google.
//
// Dates REELLES de derniere modification (06/10/2026). Avant, chaque page
// portait la date du jour a chaque mise en ligne : Google finit par ignorer ces
// dates. Regle : quand on modifie le contenu d'une page, on met sa date a jour
// ici. Les articles portent leur date de publication (src/content/blog.ts).
import type { MetadataRoute } from "next";
import { articles } from "@/content/blog";

const BASE_URL = "https://www.chargeo.fr";

const MAJ = {
  accueil: "2026-10-06",
  particuliers: "2026-10-06",
  pro: "2026-10-06",
  copropriete: "2026-10-06",
  recrutement: "2026-10-06",
  mentionsLegales: "2026-10-06",
};

const jour = (d: string) => new Date(`${d}T12:00:00Z`);

export default function sitemap(): MetadataRoute.Sitemap {
  // La page Guides change quand un article parait : sa date est la plus recente.
  const dernierArticle = articles.map((a) => a.date).sort().pop() ?? MAJ.accueil;
  const guides = dernierArticle > MAJ.accueil ? dernierArticle : MAJ.accueil;
  return [
    { url: `${BASE_URL}/`, lastModified: jour(MAJ.accueil), changeFrequency: "monthly", priority: 1 },
    { url: `${BASE_URL}/particuliers`, lastModified: jour(MAJ.particuliers), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/pro`, lastModified: jour(MAJ.pro), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/copropriete`, lastModified: jour(MAJ.copropriete), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/blog`, lastModified: jour(guides), changeFrequency: "weekly", priority: 0.7 },
    ...articles.map((a) => ({
      url: `${BASE_URL}/blog/${a.slug}`,
      lastModified: jour(a.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${BASE_URL}/recrutement`, lastModified: jour(MAJ.recrutement), changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/mentions-legales`, lastModified: jour(MAJ.mentionsLegales), changeFrequency: "yearly", priority: 0.2 },
  ];
}
