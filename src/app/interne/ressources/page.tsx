"use client";

// Ressources (17/10/2026, 17 h 03, Matthieu : « chaque rôle a besoin de ses propres ressources »). Les dossiers des
// drives partagés utiles au rôle choisi dans la pastille de l'en-tête (src/lib/ressources.ts) ; la direction voit les
// ressources de chaque rôle, une rangée par rôle. Chaque carte ouvre le dossier dans Google Drive (application Drive
// sur téléphone). Les droits sont ceux du Drive.
// 17 h 14 : Notices et manuels montre un bouton par marque (Bornes, Supervision et logiciels, Matériel), puis « Toutes
// les marques ». Pour la direction, les marques ne sont dépliées qu'une fois (rangée Chef de chantier).
// 22 h 20 : ouvert depuis l'onglet Consulter, le retour y ramène (avant : Mon espace, partie À consulter).
import { ChevronRight, ExternalLink } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Alerte } from '@/components/charte/Appli';
import { CYAN, GRIS } from '@/components/charte/couleurs';
import { LIBELLE_ROLE, type RoleAppli } from '@/lib/menusAppli';
import { useRoleAppli } from '@/components/charte/roleAppli';
import { ORDRE_RESSOURCES, RESSOURCES, lienDossier, type Ressource } from '@/lib/ressources';

export default function RessourcesPage() {
  const { role } = useRoleAppli();
  const roles: RoleAppli[] = !role || role === 'direction' ? ORDRE_RESSOURCES : [role];

  const entete = (r: Ressource) => (
    <>
      <span className="shrink-0 text-[24px] leading-none" aria-hidden>{r.emoji}</span>
      <div className="min-w-0 grow">
        <p className="text-[17px] font-bold leading-tight">{r.libelle}</p>
        <p className="mt-1 text-[13px]">{r.description}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Drive {r.drive}</p>
      </div>
    </>
  );

  const carte = (r: Ressource, deplier: boolean) => {
    if (r.marques && deplier) {
      return (
        <div key={r.cle} className="rounded-[20px] p-5" style={{ backgroundColor: GRIS }}>
          <div className="flex items-center gap-3">{entete(r)}</div>
          {r.marques.map((g) => (
            <div key={g.libelle} className="mt-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">{g.libelle}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {g.marques.map((m) => (
                  <a
                    key={m.dossier}
                    href={lienDossier(m.dossier)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-[14px] bg-white px-3 py-3 text-[14px] font-bold transition-transform active:scale-[0.98]"
                  >
                    <span className="truncate">{m.nom}</span>
                    <ChevronRight size={16} className="shrink-0" color={CYAN} />
                  </a>
                ))}
              </div>
            </div>
          ))}
          <a
            href={lienDossier(r.dossier)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-[14px] px-3 py-3 text-[14px] font-bold text-white transition-transform active:scale-[0.98]"
            style={{ backgroundColor: CYAN }}
          >
            Toutes les marques <ExternalLink size={15} />
          </a>
        </div>
      );
    }
    return (
      <a
        key={r.cle}
        href={lienDossier(r.dossier)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-[20px] p-5 transition-transform active:scale-[0.98]"
        style={{ backgroundColor: GRIS }}
      >
        {entete(r)}
        <ExternalLink size={18} className="shrink-0" color={CYAN} />
      </a>
    );
  };

  // Direction : les marques ne sont dépliées qu'à leur première apparition
  const deplie: string[] = [];
  const afficher = (r: Ressource) => {
    const deplier = deplie.indexOf(r.cle) < 0;
    if (r.marques) deplie.push(r.cle);
    return carte(r, deplier);
  };

  return (
    <PageAppli>
      <EnTeteAppli surtitre={role ? LIBELLE_ROLE[role] : 'Application équipe'} titre="Ressources" retour={{ href: '/interne/consulter', libelle: 'Consulter' }} />
      <ContenuAppli className="space-y-3">
        <Alerte>Chaque carte ouvre le dossier dans Google Drive. Si un dossier refuse l’accès, demande à Matthieu de te l’ouvrir.</Alerte>
        {roles.map((r, i) => (
          <div key={r} className="space-y-3">
            {roles.length > 1 && (
              <div className={i > 0 ? 'pt-4' : 'pt-1'}>
                <Repere>{LIBELLE_ROLE[r]}</Repere>
              </div>
            )}
            {RESSOURCES[r].map(afficher)}
          </div>
        ))}
      </ContenuAppli>
    </PageAppli>
  );
}
