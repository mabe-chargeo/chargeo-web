import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { LISTES } from '@/lib/espaces';

// Créations RH depuis l'application (17/10/2026, 19 h 10, choix de Matthieu : « Salarié et candidat »).
// POST { type: 'salarie', nom, poste, contrat, entree?, habilitations?, expiration?, telephone?, email?, notes? }
//   → Vie des Salariés 👥, statut de départ (👋 nouvel arrivant), champs créés le 17/10 à 19 h 10, et la checklist
//   ONBOARDING du wiki de la liste (12 points).
// POST { type: 'candidat', nom, telephone, email?, poste, disponibilite?, diplome?, permis?, habilitation?, notes? }
//   → Recrutement Installateurs 👷, mêmes champs que le formulaire chargeo.fr/recrutement (/api/recrutement).
// ATTENTION : les listes déroulantes sont écrites PAR INDEX (ordre des options dans ClickUp). Ne jamais réordonner.
// Droits : back-office et direction (données RH sensibles). Preview : nom préfixé « Test · ».

export const dynamic = 'force-dynamic';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const texte = (v: unknown, max = 200) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));
const estPreview = () => process.env.VERCEL_ENV !== 'production';

// Vie des Salariés (champs créés le 17/10/2026, 19 h 10)
const SALARIE = {
  entree: '5c799018-5b3e-4b56-8a22-9fdd823a0465', // 📅 Date d'entrée
  sortie: '73d9ccab-a133-417d-ae84-c08736515a5e', // 📅 Date de sortie
  contrat: 'f6bc0c8b-e41d-468b-a818-072b76acbfbf', // 📄 Type de contrat : CDI 0, CDD 1, Alternance 2, Freelance 3, Intérim 4
  poste: 'd4154e01-39c1-46c1-bbd2-dedb2f95c8a9', // 🔧 Poste : Installateur 0, Chef de chantier 1, Commercial 2, Back-office 3, Direction 4
  habilitations: 'd1e7bfc7-11e7-4ffd-ae20-945fdf60a36b', // 🛡️ Habilitations (texte)
  expiration: 'dea742f9-abdf-4c52-a662-035bad156a99', // 📅 Expiration habilitation
};
export const POSTES_SALARIE = ['Installateur', 'Chef de chantier', 'Commercial', 'Back-office', 'Direction'];
export const CONTRATS = ['CDI', 'CDD', 'Alternance', 'Freelance', 'Intérim'];
// Checklist ONBOARDING du wiki « Vie des Salariés »
const ONBOARDING = [
  'Contrat signé des deux côtés',
  'Déclaration préalable à l’embauche effectuée',
  'Création de l’adresse email',
  'Accès ClickUp limité au périmètre du rôle (aucun accès à Direction)',
  'Accès aux outils du poste : Costructor, application équipe, supervision, ressources',
  'Remise des EPI adaptés, listés et signés',
  'Formation sécurité et vérification des habilitations',
  'Remise du véhicule et de l’outillage avec état des lieux',
  'Visite du dépôt et présentation à l’équipe',
  'Lecture des wikis de ses listes de travail',
  'Première mise en pratique accompagnée',
  'Point à J+30',
];

// Recrutement Installateurs (champs du 03/10/2026, mêmes index que /api/recrutement)
const CANDIDAT = {
  telephone: 'f3d8c4c0-9628-4b38-9b27-11a58d54f8de',
  email: '66aee5d1-7159-46a7-b986-3dd6c314fd80',
  disponibilite: '3cc0e052-8b3d-4265-9372-b01da831776d',
  poste: '764a4908-93a9-425e-985c-e32029b5e375', // Électricien 0, Poseur 1, Chef d'équipe 2
  diplome: 'c8331498-8638-41de-8c3a-67290fc1dad6', // CAP 0, Bac pro 1, BTS 2, Autre 3
  permis: '9f2afed1-03d9-4cff-aa8b-a8649cc9fda9', // Permis B (case)
  habilitation: '0cb446e3-55f1-44a3-85c4-d9efa0ada758', // Aucune 0, Faite en formation 1, Titre déjà délivré 2
};
export const POSTES_CANDIDAT = ['Électricien', 'Poseur', 'Chef d’équipe'];
export const DIPLOMES = ['CAP', 'Bac pro', 'BTS', 'Autre'];
export const HABILITATIONS = ['Aucune', 'Faite en formation', 'Titre déjà délivré'];

// « AAAA-MM-JJ » → horodatage (8 h, comme le formulaire du site), null si invalide
function dateMs(v: unknown): number | null {
  const s = texte(v, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = new Date(`${s}T08:00:00`).getTime();
  return Number.isNaN(t) ? null : t;
}
const indexValide = (v: unknown, n: number) => { const i = Number(v); return Number.isInteger(i) && i >= 0 && i < n ? i : null; };
// Téléphone français ou suisse au format international (même règle que le formulaire du site)
function telephone(brut: unknown): string {
  let t = texte(brut, 30).replace(/[\s.\-()]/g, '');
  if (t.startsWith('00')) t = `+${t.substring(2)}`;
  if (t.startsWith('0')) t = `+33${t.substring(1)}`;
  return /^\+33[1-9]\d{8}$/.test(t) || /^\+41\d{9}$/.test(t) ? t : '';
}
const emailValide = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

async function creerTache(token: string, listId: string, corps: any) {
  const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
    cache: 'no-store',
  });
  const t = await res.json().catch(() => ({}));
  return res.ok && t?.id ? { ok: true as const, tache: t } : { ok: false as const, status: res.status };
}

// Checklist posée après la création ; un échec n'annule pas la fiche (signalé dans la réponse)
async function poserChecklist(token: string, tacheId: string, nom: string, points: string[]): Promise<boolean> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${tacheId}/checklist`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nom }),
    cache: 'no-store',
  });
  const c = await res.json().catch(() => ({}));
  const id = c?.checklist?.id;
  if (!res.ok || !id) return false;
  let ok = true;
  for (const p of points) {
    const r = await fetch(`https://api.clickup.com/api/v2/checklist/${id}/checklist_item`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: p }),
      cache: 'no-store',
    });
    if (!r.ok) ok = false;
  }
  return ok;
}

export async function GET() {
  return json({ postesSalarie: POSTES_SALARIE, contrats: CONTRATS, postesCandidat: POSTES_CANDIDAT, diplomes: DIPLOMES, habilitations: HABILITATIONS, preview: estPreview() });
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Connexion requise : reconnecte-toi.' }, 401);
  const preview = estPreview();
  const auteur = texte((session as any).nom) || texte((session as any).email) || 'l’équipe';
  const prefixe = (nom: string) => (preview && !/^test/i.test(nom) ? `Test · ${nom}` : nom);
  try {
    const roles = await rolesDe(token, session.id);
    if (!roles.includes('direction') && !roles.includes('backOffice')) return json({ error: 'Les fiches RH sont réservées au back-office et à la direction.' }, 403);
    const corps = await request.json().catch(() => ({}));
    const nom = texte(corps?.nom, 80);
    if (nom.split(/\s+/).filter(Boolean).length < 2) return json({ error: 'Donne le prénom et le nom' }, 400);
    const tel = telephone(corps?.telephone);
    if (texte(corps?.telephone) && !tel) return json({ error: 'Numéro de téléphone non reconnu (France ou Suisse)' }, 400);
    const email = texte(corps?.email, 120);
    if (email && !emailValide(email)) return json({ error: 'Adresse email non reconnue' }, 400);
    const notes = texte(corps?.notes, 2000);

    if (corps?.type === 'salarie') {
      const poste = indexValide(corps.poste, POSTES_SALARIE.length);
      const contrat = indexValide(corps.contrat, CONTRATS.length);
      if (poste === null) return json({ error: 'Choisis le poste' }, 400);
      if (contrat === null) return json({ error: 'Choisis le type de contrat' }, 400);
      const champs: any[] = [{ id: SALARIE.poste, value: poste }, { id: SALARIE.contrat, value: contrat }];
      const entree = dateMs(corps.entree);
      if (entree) champs.push({ id: SALARIE.entree, value: entree });
      const habilitations = texte(corps.habilitations, 200);
      if (habilitations) champs.push({ id: SALARIE.habilitations, value: habilitations });
      const expiration = dateMs(corps.expiration);
      if (expiration) champs.push({ id: SALARIE.expiration, value: expiration });
      const description = [
        `Fiche créée depuis l'application équipe par ${auteur}.`,
        `Poste : ${POSTES_SALARIE[poste]} · Contrat : ${CONTRATS[contrat]}`,
        tel ? `Téléphone : ${tel}` : '',
        email ? `Email : ${email}` : '',
        notes ? `\n${notes}` : '',
      ].filter(Boolean).join('\n');
      const r = await creerTache(token, LISTES.salaries, { name: prefixe(nom), description, custom_fields: champs });
      if (!r.ok) return json({ error: `ClickUp a refusé la création (${r.status})` }, 502);
      const checklist = await poserChecklist(token, String(r.tache.id), 'ONBOARDING', ONBOARDING);
      return json({ success: true, preview, checklist, cree: { id: String(r.tache.id), nom: String(r.tache.name), lien: `/interne/element/${r.tache.id}` } });
    }

    if (corps?.type === 'candidat') {
      if (!tel) return json({ error: 'Le téléphone du candidat est obligatoire' }, 400);
      const poste = indexValide(corps.poste, POSTES_CANDIDAT.length);
      if (poste === null) return json({ error: 'Choisis le poste' }, 400);
      const champs: any[] = [{ id: CANDIDAT.poste, value: poste }, { id: CANDIDAT.telephone, value: tel }];
      if (email) champs.push({ id: CANDIDAT.email, value: email });
      const dispo = dateMs(corps.disponibilite);
      if (dispo) champs.push({ id: CANDIDAT.disponibilite, value: dispo });
      const diplome = indexValide(corps.diplome, DIPLOMES.length);
      if (diplome !== null) champs.push({ id: CANDIDAT.diplome, value: diplome });
      const habilitation = indexValide(corps.habilitation, HABILITATIONS.length);
      if (habilitation !== null) champs.push({ id: CANDIDAT.habilitation, value: habilitation });
      if (corps.permis === true || corps.permis === false) champs.push({ id: CANDIDAT.permis, value: corps.permis });
      const description = [
        `Candidat saisi depuis l'application équipe par ${auteur}.`,
        `Poste : ${POSTES_CANDIDAT[poste]}`,
        notes ? `\n${notes}` : '',
      ].filter(Boolean).join('\n');
      const r = await creerTache(token, LISTES.recrutement, { name: prefixe(nom), description, custom_fields: champs });
      if (!r.ok) return json({ error: `ClickUp a refusé la création (${r.status})` }, 502);
      return json({ success: true, preview, cree: { id: String(r.tache.id), nom: String(r.tache.name), lien: `/interne/element/${r.tache.id}` } });
    }

    return json({ error: 'Création inconnue' }, 400);
  } catch (e) {
    console.error('Créations RH', e);
    return json({ error: 'Erreur serveur' }, 500);
  }
}
