import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Borne de Recharge en Copropriété à Thonon & Chablais | CHARGÉO",
  description: "Solutions de recharge collective pour copropriétés à Thonon-les-Bains, Évian et dans le Chablais. Installation, gestion des coûts et infrastructure collective sans frais pour le syndic.",
};

export default function CoproprieteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
