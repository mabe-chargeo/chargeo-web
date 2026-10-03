import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "On recrute : poseur de bornes de recharge à Thonon | CHARGÉO",
  description: "CHARGéO, jeune entreprise du Chablais, recrute son premier poseur de bornes de recharge. Débutant accepté, formé à notre méthode, évolution vers chef de chantier.",
};

export default function RecrutementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
