"use client";

// Sélecteur de rôle unique de l'application équipe (décision de Matthieu du 17/10/2026, 13 h 40).
// La pastille du rôle affiché est dans l'en-tête de chaque écran. Changer de rôle est un changement de contexte, il doit
// rester visible en permanence (recherche du 17/10). Le rôle choisi s'applique partout : barre du bas, Mon espace et
// Ma journée.
// Qui peut choisir :
// - la direction : tous les rôles ;
// - une personne qui est dans plusieurs équipes ClickUp : seulement ses rôles.
// Les autres voient leur rôle, sans choix. Un appui ouvre la liste sur place (plus de détour par Plus). L'affichage ne
// donne aucun droit : chaque route contrôle les rôles elle-même.
import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { CYAN, CYAN_SUR_NAVY, NAVY } from '@/components/charte/couleurs';
import { LIBELLE_ROLE } from '@/lib/menusAppli';
import { useRoleAppli } from '@/components/charte/roleAppli';

export default function RoleActif() {
  const { role, roles, possibles, choisir } = useRoleAppli();
  const [ouvert, setOuvert] = useState(false);
  if (!role) return null;
  const direction = !!roles?.includes('direction');
  const texte = direction && role !== 'direction' ? `Direction · vue ${LIBELLE_ROLE[role]}` : LIBELLE_ROLE[role];
  const choix = possibles.length > 1;

  const pastille = (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold text-white">
      <span className="block h-2 w-2 rounded-full" style={{ backgroundColor: CYAN_SUR_NAVY }} />
      {texte}
      {choix && <ChevronDown size={14} className={ouvert ? 'rotate-180' : ''} />}
    </span>
  );
  if (!choix) return pastille;

  return (
    <span className="relative inline-block">
      <button type="button" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} aria-label={`Rôle affiché : ${texte}. Changer de rôle`}>
        {pastille}
      </button>
      {ouvert && (
        <>
          <button type="button" aria-label="Fermer" className="fixed inset-0 z-40 cursor-default" onClick={() => setOuvert(false)} />
          <span className="absolute right-0 top-full z-50 mt-2 block w-60 rounded-[16px] bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
            <span className="block px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: NAVY }}>Voir l&apos;appli comme</span>
            {possibles.map((r) => {
              const actif = r === role;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => { choisir(r); setOuvert(false); }}
                  className="flex min-h-[48px] w-full items-center justify-between rounded-[12px] px-3 text-left text-[15px] font-semibold active:bg-[#eef1f4]"
                  style={{ color: actif ? CYAN : NAVY }}
                >
                  {LIBELLE_ROLE[r]}
                  {actif && <Check size={18} color={CYAN} />}
                </button>
              );
            })}
            <span className="block px-3 pb-2 pt-1 text-[11px] text-slate-500">Les droits restent ceux de ton compte.</span>
          </span>
        </>
      )}
    </span>
  );
}
