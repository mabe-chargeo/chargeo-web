// Onglet Plus de l'application équipe (structure validée par Matthieu le 16/10/2026) : le planning terrain des relevés
// (écran hors ligne existant, /interne) et la déconnexion.
import { ChevronRight, ClipboardList, LogOut } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';

const LIENS = [
  { href: '/interne', titre: 'Planning terrain', detail: 'Relevés à faire, utilisables hors ligne en sous-sol', icon: ClipboardList, couleur: CYAN },
  { href: '/api/auth/deconnexion', titre: 'Se déconnecter', detail: 'Fermer la session sur ce téléphone', icon: LogOut, couleur: ORANGE },
];

export default function PlusPage() {
  return (
    <PageAppli>
      <EnTeteAppli surtitre="Application équipe" titre="Plus" />
      <ContenuAppli className="space-y-3">
        {LIENS.map(({ href, titre, detail, icon: Icon, couleur }) => (
          <a
            key={href}
            href={href}
            className="flex w-full items-center gap-4 rounded-[20px] bg-white p-5 text-left ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-[0.98]"
            style={{ boxShadow: `inset 5px 0 0 ${couleur}` }}
          >
            <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: couleur }}>
              <Icon size={22} color="#ffffff" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 grow">
              <p className="text-[17px] font-bold leading-tight">{titre}</p>
              <p className="mt-1.5 text-[13px]">{detail}</p>
            </div>
            <ChevronRight size={22} className="shrink-0" color={couleur} />
          </a>
        ))}
      </ContenuAppli>
    </PageAppli>
  );
}
