// src/app/robots.ts
// Génère /robots.txt : autorise tout le site, bloque seulement les routes API.
// Les pages internes (/interne, /suivi) sont exclues de Google via un noindex dans leur layout.
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: "https://www.chargeo.fr/sitemap.xml",
  };
}
