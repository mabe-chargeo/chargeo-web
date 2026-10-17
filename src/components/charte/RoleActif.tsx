"use client";

// Pastille du rôle affiché, dans l'en-tête de chaque écran (recherche bonnes pratiques du 17/10/2026 : changer de rôle
// est un changement de contexte, il doit rester visible en permanence). Un appui ouvre Plus pour changer de rôle.
import { CYAN_SUR_NAVY } from '@/components/charte/couleurs';
import { LIBELLE_ROLE } from '@/lib/menusAppli';
import { useRoleAppli } from '@/components/charte/roleAppli';

export default function RoleActif() {
  const { role, roles, possibles } = useRoleAppli();
  if (!role) return null;
  const direction = !!roles?.includes('direction');
  const texte = direction && role !== 'direction' ? `Direction · vue ${LIBELLE_ROLE[role]}` : LIBELLE_ROLE[role];
  const contenu = (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold text-white">
      <span className="block h-2 w-2 rounded-full" style={{ backgroundColor: CYAN_SUR_NAVY }} />
      {texte}
    </span>
  );
  return possibles.length > 1 ? <a href="/interne/plus" aria-label={`Rôle affiché : ${texte}. Changer de rôle`}>{contenu}</a> : contenu;
}
