"use client";

// ⭐ Avis Google sur place (Phase 9, lot 4). Demande de Mathieu du 06/11/2026 à 23 h 13 : « lors de la mise en service,
// l'installateur [doit avoir] la possibilité d'afficher le QR code Google avec un rappel pour demander l'avis ».
// Le QR code mène à chargeo.fr/avis (src/app/avis/route.ts), qui renvoie vers la fenêtre de notation Google : la cible
// peut changer sans recoder le QR. Dessin calculé une fois (QR version 2, correction M, 25 × 25 modules), relu par un
// lecteur de QR avant d'être collé ici. Règle (src/lib/avisGoogle.ts) : demande neutre, sans cadeau ni contrepartie.
import { useState } from 'react';
import { QrCode, Star, X } from 'lucide-react';
import { CYAN } from '@/components/charte/couleurs';

const MODULES = 25;
const DESSIN =
  'M0 0h7v1h-7zM9 0h1v1h-1zM15 0h1v1h-1zM18 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM8 1h1v1h-1zM10 1h3v1h-3zM15 1h1v1h-1zM18 1h1v1h-1zM24 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM9 2h1v1h-1zM11 2h2v1h-2zM14 2h2v1h-2zM18 2h1v1h-1zM20 2h3v1h-3zM24 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM11 3h1v1h-1zM15 3h1v1h-1zM18 3h1v1h-1zM20 3h3v1h-3zM24 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM8 4h2v1h-2zM11 4h5v1h-5zM18 4h1v1h-1zM20 4h3v1h-3zM24 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM9 5h2v1h-2zM14 5h2v1h-2zM18 5h1v1h-1zM24 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h7v1h-7zM9 7h6v1h-6zM16 7h1v1h-1zM0 8h1v1h-1zM2 8h1v1h-1zM4 8h1v1h-1zM6 8h1v1h-1zM10 8h1v1h-1zM13 8h1v1h-1zM15 8h2v1h-2zM20 8h1v1h-1zM23 8h1v1h-1zM7 9h1v1h-1zM9 9h1v1h-1zM11 9h3v1h-3zM17 9h2v1h-2zM24 9h1v1h-1zM0 10h1v1h-1zM4 10h1v1h-1zM6 10h1v1h-1zM8 10h2v1h-2zM14 10h1v1h-1zM19 10h1v1h-1zM22 10h3v1h-3zM2 11h2v1h-2zM10 11h1v1h-1zM13 11h2v1h-2zM16 11h2v1h-2zM19 11h1v1h-1zM23 11h1v1h-1zM0 12h2v1h-2zM3 12h2v1h-2zM6 12h1v1h-1zM10 12h2v1h-2zM13 12h1v1h-1zM15 12h4v1h-4zM21 12h1v1h-1zM23 12h2v1h-2zM3 13h2v1h-2zM7 13h1v1h-1zM10 13h2v1h-2zM13 13h2v1h-2zM16 13h3v1h-3zM21 13h1v1h-1zM24 13h1v1h-1zM0 14h1v1h-1zM2 14h1v1h-1zM4 14h3v1h-3zM9 14h2v1h-2zM13 14h1v1h-1zM18 14h2v1h-2zM22 14h3v1h-3zM1 15h3v1h-3zM5 15h1v1h-1zM7 15h1v1h-1zM9 15h1v1h-1zM11 15h1v1h-1zM13 15h1v1h-1zM15 15h2v1h-2zM20 15h1v1h-1zM23 15h1v1h-1zM0 16h1v1h-1zM6 16h1v1h-1zM8 16h2v1h-2zM12 16h2v1h-2zM16 16h6v1h-6zM8 17h2v1h-2zM11 17h2v1h-2zM15 17h2v1h-2zM20 17h2v1h-2zM23 17h2v1h-2zM0 18h7v1h-7zM9 18h1v1h-1zM11 18h2v1h-2zM14 18h3v1h-3zM18 18h1v1h-1zM20 18h2v1h-2zM23 18h2v1h-2zM0 19h1v1h-1zM6 19h1v1h-1zM9 19h1v1h-1zM12 19h3v1h-3zM16 19h1v1h-1zM20 19h2v1h-2zM24 19h1v1h-1zM0 20h1v1h-1zM2 20h3v1h-3zM6 20h1v1h-1zM8 20h1v1h-1zM10 20h4v1h-4zM16 20h6v1h-6zM23 20h2v1h-2zM0 21h1v1h-1zM2 21h3v1h-3zM6 21h1v1h-1zM10 21h2v1h-2zM13 21h2v1h-2zM16 21h1v1h-1zM19 21h4v1h-4zM0 22h1v1h-1zM2 22h3v1h-3zM6 22h1v1h-1zM8 22h3v1h-3zM12 22h6v1h-6zM20 22h1v1h-1zM24 22h1v1h-1zM0 23h1v1h-1zM6 23h1v1h-1zM11 23h1v1h-1zM13 23h5v1h-5zM20 23h2v1h-2zM23 23h1v1h-1zM0 24h7v1h-7zM8 24h3v1h-3zM12 24h1v1h-1zM14 24h3v1h-3zM19 24h1v1h-1zM23 24h2v1h-2z';

// QR code de chargeo.fr/avis, marge blanche de 4 modules (lecture fiable sur un écran de téléphone)
export function QrAvis({ className = '' }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="QR code pour laisser un avis Google à CHARGéO"
      viewBox={`-4 -4 ${MODULES + 8} ${MODULES + 8}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect x={-4} y={-4} width={MODULES + 8} height={MODULES + 8} fill="#fff" />
      <path d={DESSIN} fill="#000" />
    </svg>
  );
}

// Bloc de l'écran de réception du poseur. pret : mise en service conforme, c'est le moment de demander l'avis.
export default function AvisSurPlace({ pret }: { pret: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className={`space-y-2 rounded-[14px] bg-white p-3 ring-[1.5px] ${pret ? 'ring-[#0097b2]' : 'ring-[#dfe3e8]'}`}>
      <p className="flex items-center gap-1.5 text-[14px] font-bold"><Star size={16} color={CYAN} /> Avis Google</p>
      <p className="text-[13px]">
        {pret
          ? 'Mise en service conforme : c’est le bon moment. Avant de partir, demande au client s’il veut bien laisser un avis, et montre-lui le QR code.'
          : 'En fin de chantier, quand tout fonctionne : demande au client s’il veut bien laisser un avis, et montre-lui le QR code.'}
      </p>
      <p className="text-[12px] text-slate-500">Demande simple et neutre, sans cadeau ni contrepartie. Le client peut citer ton prénom s’il le souhaite. Sans avis, un mail de rappel lui est proposé une semaine après.</p>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold text-white transition-transform active:scale-95"
        style={{ backgroundColor: CYAN }}
      >
        <QrCode size={16} /> Montrer le QR code au client
      </button>
      {ouvert && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-white p-6 text-center" role="dialog" aria-modal="true">
          <p className="text-[20px] font-bold leading-snug">Votre avis compte beaucoup pour nous</p>
          <QrAvis className="block h-auto w-[78vw] max-w-[360px]" />
          <p className="text-[15px]">Scannez ce code avec l’appareil photo de votre téléphone,<br />ou rendez-vous sur <strong>chargeo.fr/avis</strong></p>
          <p className="text-[14px] font-semibold" style={{ color: CYAN }}>Merci pour votre confiance !</p>
          <button
            type="button"
            onClick={() => setOuvert(false)}
            className="mt-2 flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold ring-[1.5px] ring-[#dfe3e8]"
          >
            <X size={18} /> Fermer
          </button>
        </div>
      )}
    </div>
  );
}
