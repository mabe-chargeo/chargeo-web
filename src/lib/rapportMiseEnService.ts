// Rapport de mise en service généré par l'application (décision de Matthieu du 18/10/2026, 15 h 36 : « L'appli génère le
// rapport », à la place du PDF du contrôleur). Quand tous les éléments du scénario retenu sont mesurés et conformes,
// un PDF reprend, élément par élément, les mesures saisies (dernière mesure valide « ⚡ Mise en service · … » de chaque
// élément) et se dépose dans 📊 Rapport de mesures du chantier. Ce champ reste celui que contrôlent la réception et le
// passage au Parc : leurs règles ne changent pas. Un PDF du contrôleur peut encore y être ajouté, il devient facultatif.
// Une mesure refaite après correction produit une nouvelle version (la plus récente fait foi, les anciennes restent).
import { adresseDe } from '@/lib/vuesFiches';
import { mesuresDe, type EtatMes } from '@/lib/miseEnService';
import { genererPdf, type Ligne } from '@/lib/pdfSimple';

const WORKSPACE_ID = process.env.CLICKUP_TEAM_ID?.trim() || '90151325642';
export const CHAMP_RAPPORT = '463edfd0-faf9-40e6-b37a-9ee126c2b449';

const complet = (points: EtatMes[]) => points.length > 0 && points.every((p) => p.fait && !p.defaut);

const slug = (s: string) => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/^test\s*·\s*/i, 'TEST-')
  .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase().slice(0, 60);

function maintenant() {
  const d = new Date();
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ...o }).format(d);
  const jour = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return { lisible: f({ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }), jour };
}

// Lignes du rapport pour un élément, à partir de sa dernière mesure valide
function lignesElement(n: number, nom: string, texte: string): Ligne[] {
  const lignes = texte.split('\n');
  const entete = lignes[0] || '';
  const qui = entete.match(/\(([^)]*)\)\s*$/)?.[1] || '';
  const sortie: Ligne[] = [{ texte: `Élément ${n} : ${nom}`, taille: 12, gras: true, espace: 12 }];
  if (qui) sortie.push({ texte: `Mesuré par ${qui}`, taille: 9 });
  for (const l of lignes.slice(1)) {
    if (/^réf\./.test(l.trim())) continue;
    if (/^\s{2,}/.test(l)) sortie.push({ texte: l.trim(), retrait: 14 });
    else if (/^\d+\.\s/.test(l)) sortie.push({ texte: l.trim(), gras: true, espace: 3 });
    else sortie.push({ texte: l.trim() });
  }
  return sortie;
}

async function deposer(token: string, taskId: string, nom: string, octets: Uint8Array): Promise<string | null> {
  const form = new FormData();
  form.append('attachment', new Blob([octets as BlobPart], { type: 'application/pdf' }), nom);
  const res = await fetch(`https://api.clickup.com/api/v3/workspaces/${WORKSPACE_ID}/custom_fields/${CHAMP_RAPPORT}/attachments`, {
    method: 'POST', headers: { Authorization: token }, body: form, cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  const id = json?.id || json?.attachment?.id || json?.data?.id;
  if (!res.ok || !id) return `dépôt refusé (${res.status})`;
  const lien = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/field/${CHAMP_RAPPORT}`, {
    method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: { add: [String(id)], rem: [] } }), cache: 'no-store',
  });
  return lien.ok ? null : `rattachement au champ refusé (${lien.status})`;
}

export async function genererRapportMiseEnService(token: string, chantier: any, points: EtatMes[]): Promise<{ ok: boolean; nom?: string; erreur?: string }> {
  if (!complet(points)) return { ok: false, erreur: 'mise en service incomplète ou avec un défaut' };
  const textes = await Promise.all(points.map(async (p) => String((await mesuresDe(token, p.id))[0]?.comment_text || '')));
  const quand = maintenant();
  const adresse = adresseDe(chantier);
  const lignes: Ligne[] = [
    { texte: 'CHARGéO', taille: 16, gras: true },
    { texte: 'Rapport de mise en service', taille: 14, gras: true, espace: 4 },
    { texte: `Chantier : ${String(chantier?.name || '')}`, espace: 10 },
    ...(adresse ? [{ texte: `Adresse : ${adresse}` }] : []),
    { texte: `Établi le ${quand.lisible} par l’application CHARGéO, à partir des mesures saisies sur place.` },
    { texte: `${points.length} élément${points.length > 1 ? 's' : ''} mis en service, tous conformes.`, gras: true },
  ];
  points.forEach((p, i) => lignes.push(...lignesElement(i + 1, p.nom, textes[i])));
  lignes.push({ texte: 'Conclusion : aucun défaut noté, installation mise en service.', gras: true, espace: 16 });
  const octets = genererPdf(lignes, `CHARGéO · Rapport de mise en service · ${String(chantier?.name || '')}`);
  const nom = `RAPPORT_MISE-EN-SERVICE_${slug(chantier?.name)}_${quand.jour}.pdf`;
  const erreur = await deposer(token, String(chantier.id), nom, octets);
  return erreur ? { ok: false, erreur } : { ok: true, nom };
}
