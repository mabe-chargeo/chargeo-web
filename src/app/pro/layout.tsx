import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Installation Borne de Recharge Entreprise & Flotte | Haute-Savoie",
  description: "CHARGÉO installe et gère vos bornes de recharge pour véhicules électriques en entreprise. Aménagement de flotte et conformité en Haute-Savoie (74).",
};

export default function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}