"use client";

// Onglet Créer de l'application équipe (adresse /creer depuis le 19/10/2026, 18 h 43 ; l'ancienne /interne/plus y renvoie).
// 17/10/2026, 13 h 40 : le choix du rôle affiché se fait avec la pastille de rôle de l'en-tête (RoleActif.tsx).
// 17/10/2026, 17 h 24 : Plus ne garde que les créations du rôle (CREER) et la déconnexion.
// 17/10/2026, 20 h 17 (choix de Matthieu : barre à 4 onglets) : l'onglet s'appelle Créer et ne montre que les boutons
// + du rôle (+ Tâche, + Nouveau projet, + Prospect, + Ticket SAV, + Salarié, + Candidat, + Idée Kaizen). La
// déconnexion est sous la pastille du rôle.
import { ChevronRight } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte } from '@/components/charte/Appli';
import { CYAN, NAVY } from '@/components/charte/couleurs';
import { CREER, ECRANS, LIBELLE_ROLE } from '@/lib/menusAppli';
import { ICONES } from '@/components/charte/iconesAppli';
import { useRoleAppli } from '@/components/charte/roleAppli';

export default function CreerOngletPage() {
  const { role } = useRoleAppli();
  const creations = (role ? CREER[role] : []).map((c) => ECRANS[c]).filter(Boolean);

  return (
    <PageAppli>
      <EnTeteAppli surtitre={role ? LIBELLE_ROLE[role] : 'Application équipe'} titre="Créer" />
      <ContenuAppli className="space-y-3">
        {!creations.length && <Carte className="text-center"><p className="text-[15px] font-semibold">Aucune création pour ce rôle.</p></Carte>}
        {creations.map((e) => {
          const Icon = ICONES[e.icone];
          const couleur = e.pret ? CYAN : '#9aa5b1';
          return (
            <a
              key={e.cle}
              href={e.href}
              className="flex w-full items-center gap-4 rounded-[20px] bg-white p-5 text-left ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-[0.98]"
              style={{ boxShadow: `inset 5px 0 0 ${couleur}` }}
            >
              <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: couleur }}>
                <Icon size={22} color="#ffffff" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 grow">
                <p className="text-[17px] font-bold leading-tight">
                  + {e.libelle}
                  {!e.pret && <span className="ml-2 rounded-full bg-[#eef1f4] px-2 py-0.5 align-middle text-[11px] font-bold" style={{ color: NAVY }}>à construire</span>}
                </p>
                <p className="mt-1.5 text-[13px]">{e.description}</p>
              </div>
              <ChevronRight size={22} className="shrink-0" color={couleur} />
            </a>
          );
        })}
      </ContenuAppli>
    </PageAppli>
  );
}
