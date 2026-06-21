// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "@/components/ui/CookieBanner";
import { GoogleTagManager } from "@next/third-parties/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Installateur Borne de Recharge Haute-Savoie (74) | CHARGÉO",
  description: "Spécialiste de l'installation de bornes de recharge pour véhicules électriques en Haute-Savoie. Simulateur en ligne et devis gratuit pour particuliers, pros et syndics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Les données structurées pour Google (SEO Local)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "CHARGÉO",
    "image": "https://www.chargeo.fr/CHARGEO_LOGO_COMPLET_FOND_TRANSPARENT_2026-01-24.png",
    "description": "Installateur et Opérateur de Points de Charge pour véhicules électriques en Haute-Savoie.",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "8, Avenue du général De Gaulle",
      "addressLocality": "THONON-LES-BAINS",
      "postalCode": "74200",
      "addressCountry": "FR"
    },
    "telephone": "+33485692204",
    "areaServed": ["Chablais", "Haute-Savoie", "Annecy", "Genevois"],
    "priceRange": "$$"
  };

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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