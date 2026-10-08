import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Borne de Recharge Entreprise & Flotte à Thonon & Chablais | CHARGÉO",
  description: "CHARGÉO installe et gère vos bornes de recharge pour véhicules électriques en entreprise à Thonon-les-Bains, dans le Chablais et en Haute-Savoie (74). Recharge de flotte, des salariés et des visiteurs, et mise en conformité des parkings.",
  alternates: { canonical: "/pro" },
};

export default function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
