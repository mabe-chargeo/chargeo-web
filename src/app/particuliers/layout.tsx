import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Installation Borne de Recharge Maison à Thonon & Chablais | CHARGÉO",
  description: "Faites installer votre borne de recharge à domicile à Thonon-les-Bains, Évian et dans le Chablais. Installateur IRVE local, prix ferme, solution clé en main éligible aux aides de l'État.",
};

export default function ParticuliersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
