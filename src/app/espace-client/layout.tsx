import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Espace client | CHARGéO',
  description: 'Suivez votre dossier CHARGéO : avancement du chantier, devis et assistance.',
  robots: { index: false, follow: false },
};

export default function EspaceClientLayout({ children }: { children: React.ReactNode }) {
  return children;
}
