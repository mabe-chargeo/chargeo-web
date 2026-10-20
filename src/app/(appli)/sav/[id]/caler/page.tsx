import EcranCalerRdv from '@/components/appli/EcranCalerRdv';

// Caler (ou décaler) le dépannage d'un ticket SAV : écran commun src/components/appli/EcranCalerRdv.tsx.
// Ancienne adresse : /interne/rdv/depannage/<id> (renvoyée ici par src/proxy.ts).
export default function CalerDepannagePage() {
  return <EcranCalerRdv type="depannage" />;
}
