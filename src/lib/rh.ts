// Fiches RH partagées (17/10/2026, 19 h 10, créations « Salarié » et « Candidat » ; 18/10, 9 h 40 : fiche salarié
// automatique au passage d'un candidat en « embauché », src/lib/embauche.ts).
// ATTENTION : les listes déroulantes sont écrites PAR INDEX (ordre des options dans ClickUp). Ne jamais réordonner.

// Vie des Salariés (champs créés le 17/10/2026, 19 h 10)
export const SALARIE = {
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
export const ONBOARDING = [
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
export const CANDIDAT = {
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

// Checklist posée après la création ; un échec n'annule pas la fiche (signalé à l'appelant)
export async function poserChecklist(token: string, tacheId: string, nom: string, points: string[]): Promise<boolean> {
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
