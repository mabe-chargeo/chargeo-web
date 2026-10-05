// src/app/layout.tsx
import type { Metadata } from "next";
import { Poppins, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "@/components/ui/CookieBanner";
import { GoogleTagManager } from "@next/third-parties/google";

// Charte 2026 : Poppins, comme les brochures (700 pour les titres, 400 pour le texte).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Les données structurées pour Google (SEO Local)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Electrician",
    "name": "CHARGÉO",
    "url": "https://www.chargeo.fr",
    "image": "https://www.chargeo.fr/logo-chargeo.png",
    "logo": "https://www.chargeo.fr/logo-chargeo.png",
    "description": "Installateur de bornes de recharge pour véhicules électriques à Thonon-les-Bains, dans le Chablais et en Haute-Savoie.",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "89, chemin de la Ballastière",
      "addressLocality": "THONON-LES-BAINS",
      "postalCode": "74200",
      "addressCountry": "FR"
    },
    "telephone": "+33485692204",
    "email": "contact@chargeo.fr",
    "areaServed": ["Thonon-les-Bains", "Évian-les-Bains", "Douvaine", "Chablais", "Haute-Savoie", "Annecy", "Genevois"],
    "priceRange": "$$"
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
        className={`${poppins.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <CookieBanner />
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
        )}
      </body>
    </html>
  );
}
