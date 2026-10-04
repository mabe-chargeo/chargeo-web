import type { Metadata } from "next";

// Suivi client personnel : ne doit pas apparaître dans Google.
export const metadata: Metadata = {
  title: "Suivi de votre projet | CHARGÉO",
  robots: { index: false, follow: false },
};

export default function SuiviLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
