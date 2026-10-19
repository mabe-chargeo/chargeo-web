// Ligne « document » commune (passe de cohérence du 19/10/2026, maquette MAQUETTE_COHERENCE-SAV_2026-10-19.png validée
// par Matthieu à 8 h 35, après sa remarque du 18/10, 22 h 44 : « faut que ce soit cohérent dans la présentation, utilise
// des blocs communs au lieu de recoder toutes les pages »).
// Même présentation partout : titre, compteur de fichiers (vert) ou état vide (orange), aide, vignettes 3 par ligne
// ouvertes par /api/interne/fichier (le lien ClickUp n'est jamais donné au navigateur), puis les boutons de la ligne.
// Sert à la réception (PV, rapport de mise en service, photos) et aux fiches (📄 Rapport d'intervention d'un ticket SAV).
import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';
import { CYAN, ORANGE } from '@/components/charte/couleurs';

export type FichierApercu = { id: string; nom: string; image: boolean };

export function lienFichier(taskId: string, cible: string, id: string): string {
  return `/api/interne/fichier?taskId=${encodeURIComponent(taskId)}&cible=${encodeURIComponent(cible)}&id=${encodeURIComponent(id)}`;
}

export function LigneDocument({
  titre,
  fichiers,
  taskId,
  cible,
  vide = 'aucun fichier',
  aide,
  children,
}: {
  titre: ReactNode;
  fichiers: FichierApercu[];
  taskId: string;
  cible: string;
  vide?: string;
  aide?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[14px] bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-bold">{titre}</p>
        <span className="text-[12px] font-semibold" style={{ color: fichiers.length ? '#16a34a' : ORANGE }}>
          {fichiers.length ? `${fichiers.length} fichier${fichiers.length > 1 ? 's' : ''}` : vide}
        </span>
      </div>
      {aide && <p className="mt-1 text-[13px]">{aide}</p>}
      {/* Aperçu : vignette pour les images, icône pour les PDF, ouverture en grand dans un nouvel onglet */}
      {fichiers.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {fichiers.map((f, i) => {
            const lien = lienFichier(taskId, cible, f.id);
            return (
              <a key={f.id || i} href={lien} target="_blank" rel="noreferrer" title={f.nom} className="block overflow-hidden rounded-[10px] ring-[1.5px] ring-[#dfe3e8]">
                {f.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${lien}&mini=1`} alt={f.nom} loading="lazy" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square flex-col items-center justify-center gap-1 p-2 text-center">
                    <FileText size={22} color={CYAN} />
                    <span className="line-clamp-2 break-all text-[11px]">{f.nom}</span>
                  </div>
                )}
              </a>
            );
          })}
        </div>
      )}
      {children}
    </div>
  );
}

// Bouton d'une ligne document : cyan plein (action principale de la ligne, ex. « Faire signer le PV »)
export function ActionDocument({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="mt-2 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold text-white" style={{ backgroundColor: CYAN }}>
      {children}
    </a>
  );
}
