import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "On recrute : poseur de bornes de recharge à Thonon | CHARGÉO",
  description: "CHARGéO recrute un poseur de bornes de recharge à Thonon. Débutant accepté, 14 à 16 € brut/h, véhicule, tenue et outillage fournis, missions planifiées à la semaine.",
};

export default function RecrutementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
