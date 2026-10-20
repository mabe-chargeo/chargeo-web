// QR code d'avis Google à montrer au client le jour de la mise en service (Phase 4, validé par Matthieu le 11/10/2026).
// Le poseur ouvre cette page sur son téléphone, le client scanne et note directement. Aucune contrepartie au client,
// demande à tous les clients. Plus tard : bouton dans l'appli équipe (Phase 6).
import { ExternalLink, Star } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Repere } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';
import { adresses } from '@/lib/adresses';

export default function AvisPage() {
  return (
    <PageAppli>
      <EnTeteAppli surtitre="Mise en service" titre="Votre avis compte" retour={{ href: adresses.releves, libelle: 'Planning' }} />
      <ContenuAppli className="space-y-5">
        <Carte className="flex flex-col items-center p-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/avis-google-qr.svg"
            alt="QR code vers la page d'avis Google de CHARGéO"
            className="aspect-square w-full max-w-[340px] rounded-[16px] bg-white p-3"
          />
          <p className="mt-5 flex items-center gap-2 text-[19px] font-bold">
            <Star size={20} color={CYAN} fill={CYAN} /> Scannez pour laisser un avis
          </p>
          <p className="mt-2 text-[15px] leading-relaxed">
            Ouvrez l&apos;appareil photo de votre téléphone et visez le code. Une minute suffit, merci !
          </p>
          <a
            href="/avis"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-semibold ring-[1.5px] ring-[#dfe3e8]"
          >
            <ExternalLink size={16} color={CYAN} /> chargeo.fr/avis
          </a>
        </Carte>

        <Repere>Pour le poseur</Repere>
        <Carte accent>
          <p className="text-[15px] leading-relaxed">
            Demande à <strong>tous</strong> les clients, une fois la borne en charge. Aucun cadeau ni réduction en échange.
            Le client peut citer ton prénom s&apos;il le souhaite, sans insister. Sans avis, une relance par email est prévue à J+7.
          </p>
        </Carte>
      </ContenuAppli>
    </PageAppli>
  );
}
