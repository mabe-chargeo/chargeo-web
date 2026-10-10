// src/app/layout.tsx
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "@/components/ui/CookieBanner";
import { SuiviClics } from "@/components/ui/SuiviClics";
import { GoogleTagManager } from "@next/third-parties/google";

// Charte 2026 : Poppins, comme les brochures (700 pour les titres, 400 pour le texte).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.chargeo.fr"),
  title: "Installateur Borne de Recharge à Thonon-les-Bains & Chablais | CHARGÉO",
  description: "Installateur de bornes de recharge IRVE à Thonon-les-Bains, Évian et dans tout le Chablais (Haute-Savoie). Particuliers, entreprises et copropriétés : simulateur en ligne, prix ferme et devis gratuit.",
  // Identite du 04/10/2026 : e turquoise + eclair sur carre navy.
  // SVG pour les navigateurs recents, PNG 48 px pour les autres et pour Google.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Apercu de partage (06/10/2026) : carte image + titre sur WhatsApp, LinkedIn,
  // Facebook et SMS. Herite par toutes les pages ; les articles du blog gardent
  // le leur. Sans og:title, les applications reprennent le titre de la page.
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "CHARGéO",
    images: [{ url: "/og-chargeo.png", width: 1200, height: 630, alt: "CHARGéO, installateur de bornes de recharge" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-chargeo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Données structurées pour Google (SEO local), enrichies le 07/10/2026 :
  // identifiant stable (@id), coordonnées GPS de l'adresse (Base Adresse Nationale),
  // zones desservies typées, catalogue des 3 offres, fondateur, et le site lui-même.
  // 10/10/2026 : fiche Google Business Profile reliee (sameAs + hasMap, lien stable par CID).
  // A ajouter des que les profils existent : Facebook, LinkedIn, annuaires ADVENIR /
  // Qualifelec dans "sameAs", et "openingHoursSpecification" (horaires reels).
  const ENTREPRISE = "https://www.chargeo.fr/#entreprise";
  const FICHE_GOOGLE = "https://maps.google.com/?cid=6752944860837772629";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Electrician",
        "@id": ENTREPRISE,
        "name": "CHARGÉO",
        "url": "https://www.chargeo.fr",
        "image": "https://www.chargeo.fr/logo-chargeo.png",
        "logo": "https://www.chargeo.fr/logo-chargeo.png",
        "description": "Installateur de bornes de recharge pour véhicules électriques à Thonon-les-Bains, dans le Chablais et en Haute-Savoie : maisons, copropriétés et entreprises.",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "89 chemin de la Ballastière",
          "addressLocality": "Thonon-les-Bains",
          "postalCode": "74200",
          "addressRegion": "Haute-Savoie",
          "addressCountry": "FR"
        },
        "geo": { "@type": "GeoCoordinates", "latitude": 46.387849, "longitude": 6.506903 },
        "hasMap": FICHE_GOOGLE,
        "sameAs": [FICHE_GOOGLE],
        "telephone": "+33485692204",
        "email": "contact@chargeo.fr",
        "founder": { "@type": "Person", "@id": "https://www.chargeo.fr/#mathieu-belengri", "name": "Mathieu Belengri", "jobTitle": "Fondateur" },
        "areaServed": [
          { "@type": "City", "name": "Thonon-les-Bains" },
          { "@type": "City", "name": "Évian-les-Bains" },
          { "@type": "City", "name": "Douvaine" },
          { "@type": "AdministrativeArea", "name": "Chablais" },
          { "@type": "AdministrativeArea", "name": "Haute-Savoie" },
          { "@type": "City", "name": "Annecy" },
          { "@type": "AdministrativeArea", "name": "Genevois" }
        ],
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Installation de bornes de recharge",
          "itemListElement": [
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Borne de recharge à la maison et droit à la prise", "url": "https://www.chargeo.fr/particuliers" } },
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Bornes de recharge en copropriété", "url": "https://www.chargeo.fr/copropriete" } },
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Bornes de recharge pour entreprises et flottes", "url": "https://www.chargeo.fr/pro" } }
          ]
        },
        "priceRange": "$$"
      },
      {
        "@type": "WebSite",
        "@id": "https://www.chargeo.fr/#site",
        "url": "https://www.chargeo.fr",
        "name": "CHARGéO",
        "inLanguage": "fr-FR",
        "publisher": { "@id": ENTREPRISE }
      }
    ]
  };

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0097b2" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('ServiceWorker failed: ', err);
                  });
                });
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'analytics_storage': 'denied'
              });
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${poppins.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <CookieBanner />
        <SuiviClics />
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
        )}
      </body>
    </html>
  );
}
