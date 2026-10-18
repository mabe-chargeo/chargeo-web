// Rapport de mise en service généré par l'application (décision de Matthieu du 18/10/2026, 15 h 36 : « L'appli génère le
// rapport », à la place du PDF du contrôleur). Quand tous les éléments du scénario retenu sont mesurés et conformes,
// un PDF reprend, élément par élément, les mesures saisies (dernière mesure valide « ⚡ Mise en service · … » de chaque
// élément) et se dépose dans 📊 Rapport de mesures du chantier. Ce champ reste celui que contrôlent la réception et le
// passage au Parc : leurs règles ne changent pas. Un PDF du contrôleur peut encore y être ajouté, il devient facultatif.
// Une mesure refaite après correction produit une nouvelle version (la plus récente fait foi, les anciennes restent).
// 18/10, 16 h 04 : mise en page à la charte (src/lib/documentsPdf.ts, src/lib/pdfCharte.ts).
import { adresseDe } from '@/lib/vuesFiches';
import { mesuresDe, type EtatMes } from '@/lib/miseEnService';
import { pdfRapportMiseEnService } from '@/lib/documentsPdf';
import { deposerDansChamp, horodatage, slugFichier } from '@/lib/champFichier';

export const CHAMP_RAPPORT = '463edfd0-faf9-40e6-b37a-9ee126c2b449';

const complet = (points: EtatMes[]) => points.length > 0 && points.every((p) => p.fait && !p.defaut);

export async function genererRapportMiseEnService(token: string, chantier: any, points: EtatMes[]): Promise<{ ok: boolean; nom?: string; erreur?: string }> {
  if (!complet(points)) return { ok: false, erreur: 'mise en service incomplète ou avec un défaut' };
  const textes = await Promise.all(points.map(async (p) => String((await mesuresDe(token, p.id))[0]?.comment_text || '')));
  const q = horodatage();
  const base = `RAPPORT_MISE-EN-SERVICE_${slugFichier(chantier?.name)}_${q.jour}`;
  const octets = pdfRapportMiseEnService({
    reference: base,
    chantier: String(chantier?.name || ''),
    adresse: adresseDe(chantier),
    quand: q.lisible,
    elements: points.map((p, i) => ({ nom: p.nom, texte: textes[i] })),
  });
  const nom = `${base}.pdf`;
  const erreur = await deposerDansChamp(token, String(chantier.id), CHAMP_RAPPORT, octets, nom);
  return erreur ? { ok: false, erreur } : { ok: true, nom };
}
