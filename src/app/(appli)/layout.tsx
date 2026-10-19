import type { Metadata } from "next";
import NavAppli from "@/components/charte/NavAppli";

// Outil terrain interne : ne doit pas apparaître dans Google.
// 16/10/2026 (structure validée par Matthieu) : barre de navigation fixe en bas de chaque écran (sauf le relevé).
export const metadata: Metadata = {
  title: "Outil interne | CHARGÉO",
  robots: { index: false, follow: false },
};

export default function InterneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <NavAppli />
    </>
  );
}
