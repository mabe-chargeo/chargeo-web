import type { Metadata } from 'next';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte } from '@/components/charte/Appli';
import { cheminSur } from '@/lib/session';

// Écran de connexion de l'application équipe (Phase 6, 13/10/2026) : connexion avec son compte ClickUp (OAuth).
export const metadata: Metadata = { title: 'Connexion équipe | CHARGéO', robots: { index: false, follow: false } };

const ERREURS: Record<string, string> = {
  configuration: 'La connexion ClickUp n\'est pas encore configurée sur le site (identifiants de l\'application manquants).',
  expiree: 'La demande de connexion a expiré. Recommence.',
  clickup: 'ClickUp n\'a pas validé la connexion. Recommence.',
  espace: 'Ce compte ClickUp n\'est pas membre de l\'espace de travail CHARGéO.',
};

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<{ suivant?: string; erreur?: string; deconnecte?: string }> }) {
  const p = await searchParams;
  const suivant = cheminSur(p.suivant);
  const erreur = p.erreur ? ERREURS[p.erreur] || ERREURS.clickup : null;
  return (
    <PageAppli>
      <EnTeteAppli surtitre="Application équipe" titre="Connexion" />
      <ContenuAppli className="space-y-4">
        {erreur && <Alerte>{erreur}</Alerte>}
        {p.deconnecte && !erreur && <Carte accent><p className="text-[15px] font-semibold">Tu es déconnecté.</p></Carte>}
        <Carte className="space-y-4">
          <p className="text-[15px] leading-relaxed">Connecte-toi avec ton compte ClickUp. CHARGéO ne reçoit jamais ton mot de passe.</p>
          <a
            href={`/api/auth/clickup?suivant=${encodeURIComponent(suivant)}`}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-[#FF6B00] px-8 py-4 text-[17px] font-semibold text-white shadow-[0_8px_22px_rgba(255,107,0,0.28)] transition-transform active:scale-95"
          >
            Se connecter avec ClickUp
          </a>
        </Carte>
      </ContenuAppli>
    </PageAppli>
  );
}
