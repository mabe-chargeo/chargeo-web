// Documents administratifs de CHARGéO pour le mail « Documents administratifs » (Phase 9, lot 4, choix de Mathieu du
// 06/11/2026 à 23 h 43 : « Depuis le Drive »). Source : 03_BACK_OFFICE/01_DOSSIER_ENTREPRISE (« toujours la version en
// cours, l'ancienne va dans ARCHIVES »), un dossier par pièce. Lecture seule : l'appli ne range ni ne modifie rien.
// Accès : compte de service chargeo-mails au nom de contact@chargeo.fr (src/lib/mails.ts), droit drive.readonly ; le
// dossier doit être partagé en lecture avec contact@chargeo.fr. Sans l'un ou l'autre : liste vide et la raison.
// Libellés et dates lus dans le nom des fichiers (charte ENTITE_TYPE_SUJET_DATE du Drive v12). Contrôles du modèle 20 du
// 02/11 : attestation URSSAF de moins de 6 mois, assurance de l'année en cours.
import { jeton } from '@/lib/mails';

const DRIVE = 'https://www.googleapis.com/drive/v3/files';
const SCOPE_DRIVE = 'https://www.googleapis.com/auth/drive.readonly';
const MOIS_URSSAF = 6;

type Sorte = { cle: string; libelle: string; dossier: string; nomDossier: string };
// Dossiers relus le 06/11/2026 dans Google Drive
const SORTES: Sorte[] = [
  { cle: 'rib', libelle: 'RIB', dossier: '1YxjEgs-HvbPUj9CMRgl-DO6QQP5PjUFs', nomDossier: 'RIB' },
  { cle: 'kbis', libelle: 'Kbis', dossier: '1deM8V2LA922pc0z7NGJTr8wACCxMk8KI', nomDossier: 'KBIS' },
  { cle: 'assurance', libelle: 'Attestation d’assurance', dossier: '1NIVjV0EYchLV7zrZ7hop--jhczUr5uBI', nomDossier: 'ATTESTATIONS_ASSURANCE' },
  { cle: 'qualification', libelle: 'Qualification IRVE', dossier: '1u4tSRh7_Ew1Y9DiWlHHZf9nZROCHse7z', nomDossier: 'QUALIFICATIONS' },
  { cle: 'urssaf', libelle: 'Attestation URSSAF', dossier: '1l7C2SJEtwYpQ1DubKsbXK6OzE2nZqC5R', nomDossier: 'ATTESTATIONS_URSSAF' },
  { cle: 'fiscale', libelle: 'Attestation de régularité fiscale', dossier: '1OaVTlBUorofQrQPiqoDij4b_32WdXqG4', nomDossier: 'ATTESTATIONS_FISCALES' },
];
// Pièces du modèle 20 : leur absence est signalée (l'attestation fiscale est facultative)
const ATTENDUES = ['rib', 'kbis', 'assurance', 'qualification', 'urssaf'];

// Document proposé à l'écran : id = « drive:<fichier> », ligne = ce que le mail écrit (« Kbis du 8 octobre 2026 »)
export type DocEntreprise = {
  id: string; fichier: string; nom: string; sorte: string; libelle: string; ligne: string; date: string;
  alerte: string; coche: boolean; taille: number; type: string;
};

const haut = (s: string) => String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const dateDuNom = (nom: string, repli: string) => {
  const l = String(nom || '').match(/\d{4}-\d{2}-\d{2}/g);
  return l ? l[l.length - 1] : String(repli || '').slice(0, 10);
};
function dateLongue(jour: string): string {
  const [a, mo, j] = String(jour || '').split('-').map(Number);
  if (!a || !mo || !j) return '';
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(a, mo - 1, j, 12)));
}
const aujourdhui = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
function moisAvant(jour: string, n: number): string {
  const [a, mo, j] = jour.split('-').map(Number);
  return new Date(Date.UTC(a, mo - 1 - n, j, 12)).toISOString().slice(0, 10);
}

// Libellé du fichier selon son nom (« CAISSE_EPARGNE_RIB_CHARGEO_COMPTE_COURANT_2026-10-14.pdf » → RIB du compte courant)
function libelleDe(s: Sorte, nom: string): string {
  const n = haut(nom);
  if (s.cle === 'rib') return n.includes('COURANT') ? 'RIB du compte courant' : n.includes('EXCEDENT') ? 'RIB du compte excédents' : 'RIB';
  if (s.cle === 'assurance') return n.includes('DECENNALE') ? 'Attestation d’assurance décennale et responsabilité civile' : n.includes('MULTIRISQUE') ? 'Attestation d’assurance multirisque professionnelle' : s.libelle;
  if (s.cle === 'qualification') return n.includes('QUALIFELEC') ? 'Qualification IRVE Qualifelec' : n.includes('FORMATION') ? 'Attestation de formation IRVE' : s.libelle;
  return s.libelle;
}
// Cases cochées d'office : le RIB du compte courant, la décennale, tout le reste sauf la multirisque et l'attestation fiscale
function cocheDe(s: Sorte, nom: string, ribCourantExiste: boolean, premierRib: boolean): boolean {
  const n = haut(nom);
  if (s.cle === 'fiscale') return false;
  if (s.cle === 'rib') return ribCourantExiste ? n.includes('COURANT') : premierRib;
  if (s.cle === 'assurance') return !n.includes('MULTIRISQUE');
  return true;
}
function alerteDe(s: Sorte, nom: string, date: string): string {
  const jour = aujourdhui();
  if (s.cle === 'urssaf' && date && date < moisAvant(jour, MOIS_URSSAF)) return `datée de plus de ${MOIS_URSSAF} mois : télécharge une attestation à jour sur urssaf.fr`;
  if (s.cle === 'assurance' && !haut(nom).includes('MULTIRISQUE') && date && date.slice(0, 4) < jour.slice(0, 4)) return 'pas de l’année en cours : demande l’attestation à jour à l’assureur';
  return '';
}

async function lireDossier(acces: string, dossier: string): Promise<any[]> {
  const p = new URLSearchParams({
    q: `'${dossier}' in parents and trashed = false`,
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    pageSize: '50',
    fields: 'files(id,name,mimeType,size,modifiedTime)',
    orderBy: 'name desc',
  });
  const r = await fetch(`${DRIVE}?${p.toString()}`, { headers: { Authorization: `Bearer ${acces}` }, cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`lecture du Drive refusée (${j?.error?.message || r.status})`);
  return (Array.isArray(j?.files) ? j.files : []).filter((f: any) => f?.mimeType === 'application/pdf' || String(f?.mimeType || '').startsWith('image/'));
}

// Documents en cours du dossier entreprise. Jamais d'erreur : liste vide et la raison ; pièces attendues absentes à part
export async function listerDocuments(): Promise<{ documents: DocEntreprise[]; problemes: string[] }> {
  let acces = '';
  try {
    acces = await jeton(SCOPE_DRIVE);
  } catch (e: any) {
    const raison = String(e?.message || 'erreur Google');
    return { documents: [], problemes: [/unauthorized_client/.test(raison) ? 'droit de lecture du Drive pas encore donné au compte chargeo-mails (console Google Admin, droit drive.readonly)' : raison] };
  }
  const documents: DocEntreprise[] = [];
  const problemes: string[] = [];
  const lus = await Promise.all(SORTES.map(async (s) => ({ s, fichiers: await lireDossier(acces, s.dossier).catch((e) => (e instanceof Error ? e : new Error(String(e)))) })));
  for (const { s, fichiers } of lus) {
    if (fichiers instanceof Error) { problemes.push(`${s.nomDossier} : ${fichiers.message}`); continue; }
    // Une seule pièce en cours par dossier, sauf RIB, assurances et qualifications (plusieurs pièces différentes)
    const tries = fichiers
      .map((f: any) => ({ f, date: dateDuNom(String(f.name || ''), String(f.modifiedTime || '')) }))
      .sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date));
    const gardes: { f: any; date: string }[] = ['rib', 'assurance', 'qualification'].includes(s.cle) ? tries : tries.slice(0, 1);
    if (!gardes.length && ATTENDUES.includes(s.cle)) problemes.push(`aucun fichier dans ${s.nomDossier} : ajoute la pièce en cours dans le Drive`);
    const ribCourant = s.cle === 'rib' && gardes.some((g) => haut(g.f.name).includes('COURANT'));
    gardes.forEach((g, i) => {
      const nom = String(g.f.name || '');
      const libelle = libelleDe(s, nom);
      const date = g.date;
      documents.push({
        id: `drive:${g.f.id}`, fichier: String(g.f.id), nom, sorte: s.cle, libelle,
        ligne: date && s.cle !== 'rib' ? `${libelle} du ${dateLongue(date)}` : libelle,
        date, alerte: alerteDe(s, nom, date), coche: cocheDe(s, nom, ribCourant, i === 0),
        taille: Number(g.f.size) || 0, type: String(g.f.mimeType || 'application/pdf'),
      });
    });
  }
  if (!documents.length && !problemes.length) problemes.push('aucun document lu : vérifie que 01_DOSSIER_ENTREPRISE est partagé en lecture avec contact@chargeo.fr');
  return { documents, problemes };
}

// Contenu d'un fichier du Drive (null si illisible)
export async function telechargerDocument(fichier: string): Promise<Buffer | null> {
  if (!/^[a-zA-Z0-9_-]+$/.test(String(fichier || ''))) return null;
  try {
    const acces = await jeton(SCOPE_DRIVE);
    const r = await fetch(`${DRIVE}/${encodeURIComponent(fichier)}?alt=media&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${acces}` }, cache: 'no-store' });
    return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}
