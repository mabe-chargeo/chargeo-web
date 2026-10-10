// src/app/sitemap.ts
// Génère /sitemap.xml : la liste des pages publiques à indexer par Google.
//
// Dates REELLES de derniere modification (06/10/2026, puis 07/10/2026 : titre de
// l'accueil, FAQ et liens vers les guides sur les pages offres ; puis 08/10/2026 :
// audit de veracite sur l'accueil, les offres, les villes et tous les guides, et
// mentions legales avec le Kbis). Avant, chaque page portait la date du jour a chaque
// mise en ligne : Google finit par ignorer ces dates. Regle : quand on modifie le
// contenu d'une page, on met sa date a jour ici. Les articles portent leur date de
// publication (src/content/blog.ts), ou MAJ.guides si elle est plus recente.
// Pages communes (zone d'intervention) : une seule date, a changer si on modifie src/content/villes.ts.
import type { MetadataRoute } from "next";
import { articles } from "@/content/blog";
import { villes } from "@/content/villes";

const BASE_URL = "https://www.chargeo.fr";

const MAJ = {
  accueil: "2026-10-08",
  particuliers: "2026-10-08",
  pro: "2026-10-08",
  copropriete: "2026-10-08",
  recrutement: "2026-10-06",
  mentionsLegales: "2026-10-08",
  zoneIntervention: "2026-10-08",
  // Derniere relecture de l'ensemble des guides (audit de veracite du 08/10/2026).
  guides: "2026-10-08",
};

const jour = (d: string) => new Date(`${d}T12:00:00Z`);
const plusRecente = (a: string, b: string) => (a > b ? a : b);

export default function sitemap(): MetadataRoute.Sitemap {
  // La page Guides change quand un article parait ou est relu : sa date est la plus recente.
  const dernierArticle = articles.map((a) => a.date).sort().pop() ?? MAJ.accueil;
  const guides = plusRecente(plusRecente(dernierArticle, MAJ.guides), MAJ.accueil);
  return [
    { url: `${BASE_URL}/`, lastModified: jour(MAJ.accueil), changeFrequency: "monthly", priority: 1 },
    { url: `${BASE_URL}/particuliers`, lastModified: jour(MAJ.particuliers), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/pro`, lastModified: jour(MAJ.pro), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/copropriete`, lastModified: jour(MAJ.copropriete), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/zone-intervention`, lastModified: jour(MAJ.zoneIntervention), changeFrequency: "monthly", priority: 0.8 },
    ...villes.map((v) => ({
      url: `${BASE_URL}/zone-intervention/${v.slug}`,
      lastModified: jour(MAJ.zoneIntervention),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${BASE_URL}/blog`, lastModified: jour(guides), changeFrequency: "weekly", priority: 0.7 },
    ...articles.map((a) => ({
      url: `${BASE_URL}/blog/${a.slug}`,
      lastModified: jour(plusRecente(a.date, MAJ.guides)),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${BASE_URL}/recrutement`, lastModified: jour(MAJ.recrutement), changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/mentions-legales`, lastModified: jour(MAJ.mentionsLegales), changeFrequency: "yearly", priority: 0.2 },
  ];
}
