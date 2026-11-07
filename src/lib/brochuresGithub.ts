// Brochures projet lues dans GitHub pour le mail d'envoi du devis (Phase 9, lot 4, choix de Mathieu du 07/11/2026 à
// 0 h 00 : « Oui, depuis GitHub », sur sa question « ça ne pourrait pas aller chercher directement les brochures dans le
// GitHub ? »). Source : documents/ du dépôt privé mabe-chargeo/chargeo-brochures, où la chaîne dépose le PDF de chaque
// brochure « PROJET-<NOM>.pdf » à chaque passe (compétence Brochures et documents) : toujours la dernière version.
// Lecture seule. Clé Vercel GITHUB_BROCHURES_TOKEN : jeton GitHub à grain fin, dépôt chargeo-brochures seulement,
// droit Contents en lecture. Sans elle : liste vide et la raison ; la brochure déposée sur la fiche reste possible.
// Brochure qui correspond à la fiche : tous les mots du nom (sans PROJET-, ni les petits mots) se retrouvent dans le nom
// de la fiche (« PROJET-LES-ROUSSY.pdf » → « SDC Les Roussy »).

const DEPOT = 'mabe-chargeo/chargeo-brochures';
const DOSSIER = 'documents';
const BRANCHE = 'main';
const API = `https://api.github.com/repos/${DEPOT}/contents/${DOSSIER}`;
const NOM_VALIDE = /^PROJET-[A-Za-z0-9._-]+\.pdf$/i;

export type BrochureGithub = { id: string; nom: string; taille: number; probable: boolean };

const jeton = () => String(process.env.GITHUB_BROCHURES_TOKEN || '').trim();
const entetes = (t: string, brut = false): HeadersInit => ({
  Authorization: `Bearer ${t}`,
  Accept: brut ? 'application/vnd.github.raw' : 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'chargeo-web',
});
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const VIDES = new Set(['les', 'le', 'la', 'de', 'du', 'des', 'et', 'sdc', 'residence', 'copropriete']);
const mots = (s: string) => normal(s).split(/[^a-z0-9]+/).filter((m) => m.length > 1 && !VIDES.has(m));

// La brochure correspond-elle à la fiche ?
export function correspond(nomFichier: string, nomFiche: string): boolean {
  const cles = mots(String(nomFichier || '').replace(/^PROJET-/i, '').replace(/\.pdf$/i, ''));
  if (!cles.length) return false;
  const fiche = new Set(mots(nomFiche));
  return cles.every((m) => fiche.has(m));
}

// Brochures projet du dépôt, celle de la fiche en tête. Jamais d'erreur : liste vide et la raison
export async function listerBrochures(nomFiche: string): Promise<{ brochures: BrochureGithub[]; probleme?: string }> {
  const t = jeton();
  if (!t) return { brochures: [], probleme: 'clé GitHub des brochures absente dans Vercel (GITHUB_BROCHURES_TOKEN)' };
  try {
    const r = await fetch(`${API}?ref=${BRANCHE}`, { headers: entetes(t), cache: 'no-store' });
    if (!r.ok) return { brochures: [], probleme: `lecture du dépôt des brochures refusée par GitHub (${r.status})` };
    const l = await r.json().catch(() => []);
    const brochures = (Array.isArray(l) ? l : [])
      .filter((f: any) => f?.type === 'file' && NOM_VALIDE.test(String(f?.name || '')))
      .map((f: any) => {
        const nom = String(f.name);
        return { id: `gh:${nom}`, nom, taille: Number(f.size) || 0, probable: correspond(nom, nomFiche) };
      })
      .sort((a: BrochureGithub, b: BrochureGithub) => Number(b.probable) - Number(a.probable) || a.nom.localeCompare(b.nom));
    return { brochures };
  } catch (e: any) {
    return { brochures: [], probleme: `GitHub injoignable (${String(e?.message || 'erreur')})` };
  }
}

// Contenu d'une brochure (null si illisible)
export async function telechargerBrochure(nom: string): Promise<Buffer | null> {
  const t = jeton();
  if (!t || !NOM_VALIDE.test(String(nom || ''))) return null;
  try {
    const r = await fetch(`${API}/${encodeURIComponent(nom)}?ref=${BRANCHE}`, { headers: entetes(t, true), cache: 'no-store' });
    return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}
