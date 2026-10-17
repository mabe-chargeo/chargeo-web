// Rôles de l'application équipe (étape 3 du plan du 15/10/2026, décisions Q32 et Q33 du 14/10).
// Direction : propriétaire de l'espace de travail ClickUp, ou identifiant ClickUp listé dans ROLES_DIRECTION_IDS (Vercel,
// séparés par des virgules). Autres rôles : groupes ClickUp (Paramètres → Équipes), reconnus par leur nom ou leur @ :
// commercial, chargé d'opération (ou chef de chantier), back-office, poseurs. Plusieurs rôles possibles.
// Sans groupe ni direction : aucun droit de modification.
// Droits, contrôlés côté serveur :
// - scénarios (archiver, restaurer, renommer, dupliquer) : direction et commercial ;
// - éléments (créer, ajouter, renommer, dupliquer, archiver, restaurer) : direction, commercial et chargé d'opération ;
// - poseur et back-office : jamais.
// 17/10/2026, 20 h 44 : membresDuRole donne les personnes d'un rôle (ex. les chefs de chantier, pour caler un relevé).
export type Role = 'direction' | 'commercial' | 'chargeOperation' | 'backOffice' | 'poseur';
export type Droits = { scenarios: boolean; elements: boolean };

type Cache = { lu: number; proprietaires: Set<number>; groupes: { role: Role; membres: Set<number> }[]; noms: Map<number, string> };
let cache: Cache | null = null;
const DUREE_CACHE = 5 * 60 * 1000;

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');

function roleDuGroupe(nom: string): Role | null {
  const n = normal(nom);
  if (n.includes('backoffice')) return 'backOffice';
  if (n.includes('chargedoperation') || n.includes('chargeoperation') || n.includes('chefdechantier')) return 'chargeOperation';
  if (n.includes('commercia')) return 'commercial';
  if (n.includes('poseur') || n.includes('installateur')) return 'poseur';
  if (n.includes('direction')) return 'direction';
  return null;
}

async function charger(token: string): Promise<Cache> {
  if (cache && Date.now() - cache.lu < DUREE_CACHE) return cache;
  const equipe = process.env.CLICKUP_TEAM_ID?.trim() || '90151325642';
  const proprietaires = new Set<number>();
  const groupes: Cache['groupes'] = [];
  const noms = new Map<number, string>();
  let complet = true;
  try {
    const r = await fetch('https://api.clickup.com/api/v2/team', { headers: { Authorization: token }, cache: 'no-store' });
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      const t = (Array.isArray(j?.teams) ? j.teams : []).find((x: any) => String(x?.id) === equipe);
      for (const m of Array.isArray(t?.members) ? t.members : []) {
        const id = Number(m?.user?.id);
        if (Number(m?.user?.role) === 1) proprietaires.add(id);
        const nom = String(m?.user?.username || m?.user?.email || '').trim();
        if (id > 0 && nom) noms.set(id, nom);
      }
    } else complet = false;
    const g = await fetch(`https://api.clickup.com/api/v2/group?team_id=${equipe}`, { headers: { Authorization: token }, cache: 'no-store' });
    if (g.ok) {
      const j = await g.json().catch(() => ({}));
      for (const x of Array.isArray(j?.groups) ? j.groups : []) {
        const role = roleDuGroupe(`${x?.name || ''} ${x?.handle || ''}`);
        if (!role) continue;
        const liste: any[] = Array.isArray(x?.members) ? x.members : [];
        for (const m of liste) {
          const id = Number(m?.id);
          const nom = String(m?.username || m?.email || '').trim();
          if (id > 0 && nom && !noms.has(id)) noms.set(id, nom);
        }
        const membres = new Set<number>(liste.map((m: any) => Number(m?.id)));
        groupes.push({ role, membres });
      }
    } else complet = false;
  } catch (e) {
    complet = false;
    console.error('Rôles illisibles', e);
  }
  const lu: Cache = { lu: Date.now(), proprietaires, groupes, noms };
  if (complet) cache = lu;
  return lu;
}

export async function rolesDe(token: string, userId: number): Promise<Role[]> {
  const c = await charger(token);
  const roles = new Set<Role>();
  const direction = String(process.env.ROLES_DIRECTION_IDS || '').split(',').map((s) => Number(s.trim())).filter((n) => n > 0);
  if (c.proprietaires.has(Number(userId)) || direction.includes(Number(userId))) roles.add('direction');
  for (const g of c.groupes) if (g.membres.has(Number(userId))) roles.add(g.role);
  return [...roles];
}

// Personnes qui ont un rôle (groupes ClickUp), avec leur nom, triées par nom
export async function membresDuRole(token: string, role: Role): Promise<{ id: number; nom: string }[]> {
  const c = await charger(token);
  const ids = new Set<number>();
  for (const g of c.groupes) if (g.role === role) g.membres.forEach((m) => { if (m > 0) ids.add(m); });
  return [...ids].map((id) => ({ id, nom: c.noms.get(id) || `Membre ${id}` })).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export function droitsDe(roles: Role[]): Droits {
  const a = (r: Role) => roles.includes(r);
  return {
    scenarios: a('direction') || a('commercial'),
    elements: a('direction') || a('commercial') || a('chargeOperation'),
  };
}
