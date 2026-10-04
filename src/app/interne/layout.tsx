import type { Metadata } from "next";

// Outil terrain interne : ne doit pas apparaître dans Google.
export const metadata: Metadata = {
  title: "Outil interne | CHARGÉO",
  robots: { index: false, follow: false },
};

export default function InterneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
