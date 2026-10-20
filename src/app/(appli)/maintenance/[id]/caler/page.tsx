import EcranCalerRdv from '@/components/appli/EcranCalerRdv';

// Caler (ou décaler) une visite de maintenance : écran commun src/components/appli/EcranCalerRdv.tsx.
// Ancienne adresse : /interne/rdv/visite/<id> (renvoyée ici par src/proxy.ts).
export default function CalerVisitePage() {
  return <EcranCalerRdv type="visite" />;
}
