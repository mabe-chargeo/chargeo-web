// Liste Recrutement (écran src/components/appli/EcranListe.tsx). Ex-/interne/liste/recrutement : l'adresse est
// /candidatures car chargeo.fr/recrutement est la page publique des candidats.
import EcranListe from '@/components/appli/EcranListe';

export default function Page() {
  return <EcranListe source="recrutement" />;
}
