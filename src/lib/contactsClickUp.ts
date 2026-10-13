// Liste Contacts 👥 (point 15) : gestionnaire du syndic et président du conseil syndical saisis sur le formulaire du site
// (lot 3.5, 13/10/2026). Une personne = une seule fiche, retrouvée par email, puis téléphone, puis nom
// (un même gestionnaire suit plusieurs copros). Elle est reliée à l'affaire par 👔 Gestionnaire ou 📍 Contact sur place.
// Production seulement : ces relations pointent vers la vraie liste Qualification, pas vers la liste TEST.

export const CONTACTS_LIST_ID = '1200630000008493';
const CHAMP_EMAIL = 'fe270c78-ce53-427c-ad4f-73090f7c3252';
const CHAMP_TEL = '9f8e22e3-656d-4d9b-b923-cfff21366e8f';
const CHAMP_ROLE = '1e728c9c-f988-4fcf-84f4-6354a3cb8032';
const CHAMP_SOCIETE = 'f2d33127-9301-40f0-bffd-a22b6292239f';
// Relations de la fiche Qualification (même identifiant des deux côtés)
export const RELATION_GESTIONNAIRE = '0a6a88d4-1d1a-4034-8e7b-bf6213b1d9c3';
export const RELATION_CONTACT_SUR_PLACE = '7d20a03c-f9b5-4395-9114-362e194a9a85';

export type RoleContact = 'Gestionnaire syndic' | 'Président CS';
export type PersonneSaisie = { role: RoleContact; nom: string; email?: string; telephone?: string; societe?: string };
export type ResultatContact = { nom: string; role: RoleContact; action: 'reutilise' | 'cree' | 'echec'; relie: boolean; id?: string };

const API = 'https://api.clickup.com/api/v2';
const emailNormal = (s: unknown) => String(s ?? '').trim().toLowerCase();
export function telNormal(s: unknown): string {
  let t = String(s ?? '').replace(/[\s.()-]/g, '');
  if (t.startsWith('00')) t = '+' + t.slice(2);
  if (t.startsWith('0')) t = '+33' + t.slice(1);
  return t;
}
const clePersonne = (s: string) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(Boolean).sort().join(' ');

function valeurChamp(tache: any, id: string): any {
  const f = (Array.isArray(tache?.custom_fields) ? tache.custom_fields : []).find((c: any) => c?.id === id);
  return f?.value;
}

async function lireContacts(token: string): Promise<any[] | null> {
  const tous: any[] = [];
  for (let page = 0; page < 10; page++) {
    const res = await fetch(`${API}/list/${CONTACTS_LIST_ID}/task?page=${page}&include_closed=true&subtasks=true`, {
      headers: { Authorization: token },
      cache: 'no-store',
    });
    if (!res.ok) return page === 0 ? null : tous;
    const json = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    tous.push(...lot);
    if (json?.last_page !== false || lot.length === 0) break;
  }
  return tous;
}

function trouver(p: PersonneSaisie, contacts: any[]): any | undefined {
  const email = emailNormal(p.email);
  if (email) {
    const r = contacts.find((c) => emailNormal(valeurChamp(c, CHAMP_EMAIL)) === email);
    if (r) return r;
  }
  const tel = p.telephone ? telNormal(p.telephone) : '';
  if (tel) {
    const r = contacts.find((c) => telNormal(valeurChamp(c, CHAMP_TEL)) === tel);
    if (r) return r;
  }
  const cle = clePersonne(p.nom);
  return cle ? contacts.find((c) => clePersonne(c?.name) === cle) : undefined;
}

// Option du menu 🎭 Rôle lue par son nom (jamais par sa position)
async function optionRole(role: RoleContact, token: string): Promise<string | undefined> {
  const res = await fetch(`${API}/list/${CONTACTS_LIST_ID}/field`, { headers: { Authorization: token }, cache: 'no-store' });
  if (!res.ok) return undefined;
  const json = await res.json().catch(() => ({}));
  const champ = (Array.isArray(json?.fields) ? json.fields : []).find((f: any) => f?.id === CHAMP_ROLE);
  const options: any[] = Array.isArray(champ?.type_config?.options) ? champ.type_config.options : [];
  return options.find((o) => String(o?.name || '').trim().toLowerCase() === role.toLowerCase())?.id;
}

async function creer(p: PersonneSaisie, token: string): Promise<string> {
  const champs: { id: string; value: any }[] = [];
  if (p.email) champs.push({ id: CHAMP_EMAIL, value: emailNormal(p.email) });
  if (p.telephone) champs.push({ id: CHAMP_TEL, value: telNormal(p.telephone) });
  if (p.societe) champs.push({ id: CHAMP_SOCIETE, value: p.societe });
  const role = await optionRole(p.role, token);
  if (role) champs.push({ id: CHAMP_ROLE, value: role });
  const res = await fetch(`${API}/list/${CONTACTS_LIST_ID}/task`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: p.nom, custom_fields: champs }),
  });
  if (!res.ok) {
    console.error(`Création du contact refusée (${res.status})`, await res.text().catch(() => ''));
    return '';
  }
  const json = await res.json().catch(() => ({}));
  return String(json?.id || '');
}

async function relier(taskId: string, relation: string, contactId: string, token: string): Promise<boolean> {
  const res = await fetch(`${API}/task/${taskId}/field/${relation}`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: { add: [contactId], rem: [] } }),
  });
  if (!res.ok) console.error(`Relation refusée (${res.status}) sur ${taskId}`, await res.text().catch(() => ''));
  return res.ok;
}

// Retrouve ou crée chaque personne, puis la relie à l'affaire. Ne lève jamais d'erreur : le résultat dit ce qui a échoué.
export async function relierContacts(taskId: string, personnes: PersonneSaisie[], token: string): Promise<ResultatContact[]> {
  const resultats: ResultatContact[] = [];
  if (personnes.length === 0) return resultats;
  const contacts = await lireContacts(token);
  for (const p of personnes) {
    const base = { nom: p.nom, role: p.role };
    // Sans lecture de la liste, on ne crée rien (sinon risque de doublon)
    if (!contacts) { resultats.push({ ...base, action: 'echec', relie: false }); continue; }
    const existant = trouver(p, contacts);
    const id = existant ? String(existant.id) : await creer(p, token);
    if (!id) { resultats.push({ ...base, action: 'echec', relie: false }); continue; }
    if (!existant) contacts.push({ id, name: p.nom, custom_fields: [{ id: CHAMP_EMAIL, value: p.email }, { id: CHAMP_TEL, value: p.telephone }] });
    const relation = p.role === 'Gestionnaire syndic' ? RELATION_GESTIONNAIRE : RELATION_CONTACT_SUR_PLACE;
    const relie = await relier(taskId, relation, id, token);
    resultats.push({ ...base, action: existant ? 'reutilise' : 'cree', relie, id });
  }
  return resultats;
}
