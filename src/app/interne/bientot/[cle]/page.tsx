"use client";

// Écran pas encore construit : affiche ce qui a été validé avec Matthieu le 11/10/2026 (src/lib/menusAppli.ts).
// 17/10/2026, 22 h 20 : plus de lien « Retour au menu Plus » (Plus est devenu Créer) ; le bouton Retour de l'en-tête
// ramène à l'écran d'où l'on vient.
import { useParams } from 'next/navigation';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte } from '@/components/charte/Appli';
import { CYAN, NAVY } from '@/components/charte/couleurs';
import { ECRANS } from '@/lib/menusAppli';
import { ICONES } from '@/components/charte/iconesAppli';

export default function BientotPage() {
  const params = useParams();
  const brut = params?.cle;
  const cle = Array.isArray(brut) ? brut[0] : brut || '';
  const ecran = ECRANS[cle];
  const Icon = ecran ? ICONES[ecran.icone] : null;

  return (
    <PageAppli>
      <EnTeteAppli surtitre="À construire" titre={ecran ? ecran.libelle : 'Écran inconnu'} retour={{ href: '/interne/espace', libelle: 'À traiter' }} />
      <ContenuAppli className="space-y-3">
        <Carte>
          <div className="flex items-start gap-4">
            {Icon && (
              <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: CYAN }}>
                <Icon size={22} color="#ffffff" strokeWidth={1.8} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: NAVY }}>Écran validé le 11/10, à construire</p>
              <p className="mt-2 text-[15px] leading-snug">{ecran ? ecran.description : 'Cet écran ne fait pas partie des menus validés.'}</p>
            </div>
          </div>
        </Carte>
      </ContenuAppli>
    </PageAppli>
  );
}
