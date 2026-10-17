"use client";

// Ressources (17/10/2026, 17 h 03, Matthieu : « chaque rôle a besoin de ses propres ressources »). Les dossiers des
// drives partagés utiles au rôle choisi dans la pastille de l'en-tête (src/lib/ressources.ts) ; la direction voit les
// ressources de chaque rôle, une rangée par rôle. Chaque carte ouvre le dossier dans Google Drive (application Drive
// sur téléphone). Les droits sont ceux du Drive.
import { ExternalLink } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Alerte } from '@/components/charte/Appli';
import { CYAN, GRIS } from '@/components/charte/couleurs';
import { LIBELLE_ROLE, type RoleAppli } from '@/lib/menusAppli';
import { useRoleAppli } from '@/components/charte/roleAppli';
import { ORDRE_RESSOURCES, RESSOURCES, lienDossier, type Ressource } from '@/lib/ressources';

export default function RessourcesPage() {
  const { role } = useRoleAppli();
  const roles: RoleAppli[] = !role || role === 'direction' ? ORDRE_RESSOURCES : [role];

  const carte = (r: Ressource) => (
    <a
      key={r.cle}
      href={lienDossier(r.dossier)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-[20px] p-5 transition-transform active:scale-[0.98]"
      style={{ backgroundColor: GRIS }}
    >
      <span className="shrink-0 text-[24px] leading-none" aria-hidden>{r.emoji}</span>
      <div className="min-w-0 grow">
        <p className="text-[17px] font-bold leading-tight">{r.libelle}</p>
        <p className="mt-1 text-[13px]">{r.description}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Drive {r.drive}</p>
      </div>
      <ExternalLink size={18} className="shrink-0" color={CYAN} />
    </a>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre={role ? LIBELLE_ROLE[role] : 'Application équipe'} titre="Ressources" retour={{ href: '/interne/plus', libelle: 'Plus' }} />
      <ContenuAppli className="space-y-3">
        <Alerte>Chaque carte ouvre le dossier dans Google Drive. Si un dossier refuse l’accès, demande à Matthieu de te l’ouvrir.</Alerte>
        {roles.map((r, i) => (
          <div key={r} className="space-y-3">
            {roles.length > 1 && (
              <div className={i > 0 ? 'pt-4' : 'pt-1'}>
                <Repere>{LIBELLE_ROLE[r]}</Repere>
              </div>
            )}
            {RESSOURCES[r].map(carte)}
          </div>
        ))}
      </ContenuAppli>
    </PageAppli>
  );
}
