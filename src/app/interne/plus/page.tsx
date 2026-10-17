"use client";

// Onglet Plus de l'application équipe (carte des menus validée par Matthieu le 17/10/2026).
// 17/10/2026, 13 h 40 : le choix du rôle affiché n'est plus ici. Il se fait avec le sélecteur unique, la pastille de
// rôle de l'en-tête (src/components/charte/RoleActif.tsx), présente sur tous les écrans.
// 17/10/2026, 17 h 24 (choix de Matthieu : Mon espace en deux parties) : Parc, Ressources, Agenda, Planning et Relevés
// passent dans Mon espace (partie « À consulter »). Plus ne garde que les créations du rôle (CREER : + Nouveau projet,
// + Ticket SAV, + Idée Kaizen) et la déconnexion. MENUS[rôle].plus reste lu au cas où un écran y serait remis.
import { ChevronRight, LogOut } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere } from '@/components/charte/Appli';
import { CYAN, NAVY, ORANGE } from '@/components/charte/couleurs';
import { CREER, ECRANS, LIBELLE_ROLE, MENUS } from '@/lib/menusAppli';
import { ICONES } from '@/components/charte/iconesAppli';
import { useRoleAppli } from '@/components/charte/roleAppli';

type Lien = { href: string; titre: string; detail: string; Icon: any; couleur: string; bientot: boolean };

export default function PlusPage() {
  const { role } = useRoleAppli();
  const ecrans = (role ? MENUS[role].plus : []).map((c) => ECRANS[c]).filter(Boolean);
  const creations = (role ? CREER[role] : []).map((c) => ECRANS[c]).filter(Boolean);
  const aCreer: Lien[] = [
    ...creations.map((e) => ({ href: e.href, titre: `+ ${e.libelle}`, detail: e.description, Icon: ICONES[e.icone], couleur: e.pret ? CYAN : '#9aa5b1', bientot: !e.pret })),
    ...ecrans.map((e) => ({ href: e.href, titre: e.libelle, detail: e.description, Icon: ICONES[e.icone], couleur: e.pret ? CYAN : '#9aa5b1', bientot: !e.pret })),
  ];
  const compte: Lien[] = [
    { href: '/api/auth/deconnexion', titre: 'Se déconnecter', detail: 'Fermer la session sur ce téléphone', Icon: LogOut, couleur: ORANGE, bientot: false },
  ];

  const carte = ({ href, titre, detail, Icon, couleur, bientot }: Lien) => (
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
        <p className="text-[17px] font-bold leading-tight">
          {titre}
          {bientot && (
            <span className="ml-2 rounded-full bg-[#eef1f4] px-2 py-0.5 align-middle text-[11px] font-bold" style={{ color: NAVY }}>à construire</span>
          )}
        </p>
        <p className="mt-1.5 text-[13px]">{detail}</p>
      </div>
      <ChevronRight size={22} className="shrink-0" color={couleur} />
    </a>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre={role ? LIBELLE_ROLE[role] : 'Application équipe'} titre="Plus" />
      <ContenuAppli className="space-y-3">
        {aCreer.length > 0 && (
          <>
            <div className="pt-1">
              <Repere>Créer</Repere>
            </div>
            {aCreer.map(carte)}
          </>
        )}
        <div className={aCreer.length > 0 ? 'pt-5' : 'pt-1'}>
          <Repere>Mon compte</Repere>
        </div>
        {compte.map(carte)}
      </ContenuAppli>
    </PageAppli>
  );
}
