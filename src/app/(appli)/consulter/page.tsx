"use client";

// Onglet Consulter (17/10/2026, 20 h 17, choix de Matthieu : barre à 4 onglets). L'ancienne partie « À consulter » de
// Mon espace : ce qu'on consulte sans compteur, selon le rôle (MENUS[rôle].consulter dans src/lib/menusAppli.ts :
// Parc, Ressources, Wikis, Agenda, Planning, Carte du SAV).
import { ChevronRight } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';
import { ECRANS, LIBELLE_ROLE, MENUS } from '@/lib/menusAppli';
import { ICONES } from '@/components/charte/iconesAppli';
import { useRoleAppli } from '@/components/charte/roleAppli';

export default function ConsulterPage() {
  const { role } = useRoleAppli();
  const ecrans = (role ? MENUS[role].consulter : ['wikis']).map((c) => ECRANS[c]).filter(Boolean);

  return (
    <PageAppli>
      <EnTeteAppli surtitre={role ? LIBELLE_ROLE[role] : 'Application équipe'} titre="À consulter" />
      <ContenuAppli className="space-y-3">
        {!ecrans.length && <Carte className="text-center"><p className="text-[15px] font-semibold">Rien à consulter pour ce rôle.</p></Carte>}
        {ecrans.map((e) => {
          const Icon = ICONES[e.icone];
          return (
            <a
              key={e.cle}
              href={e.href}
              className="flex items-center gap-3 rounded-[20px] bg-white p-5 ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-[0.98]"
            >
              <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: CYAN }}>
                <Icon size={20} color="#ffffff" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 grow">
                <p className="text-[17px] font-bold leading-tight">{e.libelle}</p>
                <p className="mt-1 text-[13px]">{e.description}</p>
              </div>
              <ChevronRight size={20} className="shrink-0" color={CYAN} />
            </a>
          );
        })}
      </ContenuAppli>
    </PageAppli>
  );
}
