"use client";

// Écrire un mail hors étape (page blanche) depuis le bouton « Mail » du bloc 📇 Contact (Phase 9, lot 1, 05/11/2026) :
// /mail?fiche=<id>&a=<destinataire>&modele=<clé>. Depuis le 05/11/2026 (décision de Mathieu de 21 h 56 à 21 h 58 : le bon
// mail au bon moment, obligatoire, dans l'écran de l'étape), l'écriture vit dans src/components/ui/EcrireMail.tsx,
// affiché aussi sur la fiche affaire et sur Caler. Cette page ne fait que l'encadrer.
import { useEffect, useState } from 'react';
import { PageAppli, EnTeteAppli, ContenuAppli, Alerte } from '@/components/charte/Appli';
import EcrireMail from '@/components/ui/EcrireMail';
import { adresses } from '@/lib/adresses';

export default function MailPage() {
  const [p, setP] = useState<{ fiche: string; a: string; modele: string } | null>(null);
  const [titre, setTitre] = useState('Écrire un mail');

  useEffect(() => {
    const s = new URLSearchParams(window.location.search);
    setP({ fiche: s.get('fiche') || '', a: s.get('a') || '', modele: s.get('modele') || '' });
  }, []);

  const retour = p?.fiche ? adresses.fiche(p.fiche) : adresses.journee;
  return (
    <PageAppli>
      <EnTeteAppli surtitre="Écrire un mail" titre={titre} retour={{ href: retour, libelle: 'La fiche' }} />
      <ContenuAppli className="space-y-4">
        {p && !p.fiche && <Alerte>Ouvre ce mail depuis une fiche (bouton « Mail » du bloc Contact).</Alerte>}
        {p?.fiche && <EcrireMail ficheId={p.fiche} modele={p.modele} dest={p.a} onFiche={setTitre} retour={{ href: retour, libelle: '← Revenir à la fiche' }} />}
      </ContenuAppli>
    </PageAppli>
  );
}
