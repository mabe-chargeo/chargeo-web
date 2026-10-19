// Rôles des contacts (liste Contacts 👥, champ 🎭 Rôle) et règle de lien au projet (écran Nouveau projet, parcours validé
// par Matthieu le 17/10/2026, 14 h 08). Fichier pur : utilisable côté téléphone comme côté serveur.
// Les options sont écrites par leur IDENTIFIANT (pas par index) : l'option « Client », ajoutée par Matthieu le 17/10, est
// en tête du menu dans ClickUp, l'ordre ne compte donc pas ici.
// Règle de lien : un Gestionnaire syndic est relié en 👔 Gestionnaire, tous les autres rôles en 📍 Contact sur place.

export const CHAMPS_CONTACTS = {
  tel: '9f8e22e3-656d-4d9b-b923-cfff21366e8f',
  email: 'fe270c78-ce53-427c-ad4f-73090f7c3252',
  role: '1e728c9c-f988-4fcf-84f4-6354a3cb8032',
  societe: 'f2d33127-9301-40f0-bffd-a22b6292239f',
  // Champs relation vers Qualification (mêmes identifiants sur la fiche et sur le contact)
  contactSurPlace: '7d20a03c-f9b5-4395-9114-362e194a9a85',
  gestionnaire: '0a6a88d4-1d1a-4034-8e7b-bf6213b1d9c3',
} as const;

export type CleRoleContact = 'client' | 'gestionnaire' | 'presidentCS' | 'membreCS' | 'salarie' | 'autre';
export type LienProjet = 'gestionnaire' | 'surPlace';

export const ROLES_CONTACT: { cle: CleRoleContact; libelle: string; optionId: string }[] = [
  { cle: 'client', libelle: 'Client', optionId: '72a9b328-769c-458e-8f64-fcac0fe4b5ad' },
  { cle: 'gestionnaire', libelle: 'Gestionnaire syndic', optionId: 'efb52de4-4dbf-493e-8f81-aa17d4f4ce48' },
  { cle: 'presidentCS', libelle: 'Président CS', optionId: '2e54115e-00a2-4610-b12a-1b19cc5c17f7' },
  { cle: 'membreCS', libelle: 'Membre CS', optionId: '7b99090f-03c0-455d-b21d-da73becd50e8' },
  { cle: 'salarie', libelle: 'Salarié', optionId: '9b61e77a-dc97-4795-a2df-6db0ee451677' },
  { cle: 'autre', libelle: 'Autre', optionId: '986d25d7-bd4e-4cc6-8a86-b50aaaf7bbea' },
];

export const LIBELLE_LIEN: Record<LienProjet, string> = { gestionnaire: '👔 Gestionnaire', surPlace: '📍 Contact sur place' };

export const lienDuRole = (cle: CleRoleContact | null | undefined): LienProjet => (cle === 'gestionnaire' ? 'gestionnaire' : 'surPlace');

export const roleDeCle = (cle: unknown) => ROLES_CONTACT.find((r) => r.cle === cle) || null;

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// Rôle d'une tâche de la liste Contacts : la valeur du menu peut être l'index ou l'identifiant de l'option
export function roleDeTache(tache: any): CleRoleContact | null {
  const f = (Array.isArray(tache?.custom_fields) ? tache.custom_fields : []).find((c: any) => c?.id === CHAMPS_CONTACTS.role);
  const v = f?.value;
  if (v === undefined || v === null || v === '') return null;
  const o = (f?.type_config?.options || []).find((x: any) => x.orderindex === Number(v) || x.id === v);
  if (!o) return null;
  const r = ROLES_CONTACT.find((x) => x.optionId === o.id || normal(x.libelle) === normal(o.name));
  return r ? r.cle : null;
}

// Téléphone au format ClickUp : sans espaces, 0 initial remplacé par +33 (même règle que le formulaire du site)
export function telClickUp(tel: unknown): string {
  let t = String(tel ?? '').replace(/[\s.\-()]/g, '');
  if (t.startsWith('00')) t = `+${t.substring(2)}`;
  if (t.startsWith('0')) t = `+33${t.substring(1)}`;
  return t;
}

// Clés de comparaison pour éviter les doublons (email en minuscules, 9 derniers chiffres du téléphone)
export const cleEmail = (e: unknown) => normal(e);
export const cleTel = (t: unknown) => String(t ?? '').replace(/\D/g, '').slice(-9);
