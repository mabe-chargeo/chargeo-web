import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Installation Borne de Recharge Maison & Garage | CHARGÉO",
  description: "Faites installer votre borne de recharge à domicile en Haute-Savoie. Solution clé en main, sécurisée et éligible aux aides de l'État.",
};

export default function ParticuliersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}