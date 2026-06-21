import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Borne de Recharge en Copropriété & Syndic | Haute-Savoie",
  description: "Solutions de recharge collective pour copropriétés. Installation, gestion des coûts et infrastructure collective sans frais pour le syndic.",
};

export default function CoproprieteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}