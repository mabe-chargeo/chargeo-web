// Onglet Chantiers de l'application équipe (structure validée par Matthieu le 16/10/2026) : les vues des chantiers du
// Planning, rangées comme des vues ClickUp. Chaque vue ouvre son écran existant.
import { Camera, ChevronRight, ClipboardCheck, TrafficCone } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';

const VUES = [
  { href: '/interne/feu-vert', titre: 'Feu vert', detail: "Prérequis des chantiers et feu vert, pour le chargé d'opération", icon: TrafficCone },
  { href: '/interne/reception', titre: 'Réception sur place', detail: 'Pour le poseur : PV signé, rapport de mesures, photos et réserves', icon: Camera },
  { href: '/interne/validation', titre: 'Réceptions à valider', detail: "Pour le chargé d'opération : contrôle et passage au Parc", icon: ClipboardCheck },
];

export default function ChantiersPage() {
  return (
    <PageAppli>
      <EnTeteAppli surtitre="Planning chantiers" titre="Chantiers" />
      <ContenuAppli className="space-y-3">
        {VUES.map(({ href, titre, detail, icon: Icon }) => (
          <a
            key={href}
            href={href}
            className="flex w-full items-center gap-4 rounded-[20px] bg-white p-5 text-left ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-[0.98]"
            style={{ boxShadow: `inset 5px 0 0 ${CYAN}` }}
          >
            <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: CYAN }}>
              <Icon size={22} color="#ffffff" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 grow">
              <p className="text-[17px] font-bold leading-tight">{titre}</p>
              <p className="mt-1.5 text-[13px]">{detail}</p>
            </div>
            <ChevronRight size={22} className="shrink-0" color={CYAN} />
          </a>
        ))}
      </ContenuAppli>
    </PageAppli>
  );
}
