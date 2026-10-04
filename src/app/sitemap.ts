// src/app/sitemap.ts
// Génère /sitemap.xml : la liste des pages publiques à indexer par Google.
import type { MetadataRoute } from "next";
import { articles } from "@/content/blog";

const BASE_URL = "https://www.chargeo.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE_URL}/particuliers`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/pro`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/copropriete`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...articles.map((a) => ({
      url: `${BASE_URL}/blog/${a.slug}`,
      lastModified: new Date(`${a.date}T12:00:00Z`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${BASE_URL}/recrutement`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
