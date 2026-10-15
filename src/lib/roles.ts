// Rôles de l'application équipe (étape 3 du plan du 15/10/2026, décisions Q32 et Q33 du 14/10).
// Direction : propriétaire de l'espace de travail ClickUp, ou identifiant ClickUp listé dans ROLES_DIRECTION_IDS (Vercel,
// séparés par des virgules). Autres rôles : groupes ClickUp (Paramètres → Équipes), reconnus par leur nom ou leur @ :
// commercial, chargé d'opération (ou chef de chantier), back-office, poseurs. Plusieurs rôles possibles.
// Sans groupe ni direction : aucun droit de modification.
// Droits, contrôlés côté serveur :
// - scénarios (archiver, restaurer, renommer, dupliquer) : direction et commercial ;
// - éléments (créer, ajouter, renommer, dupliquer, archiver, restaurer) : direction, commercial et chargé d'opération ;
// - poseur et back-office : jamais.
export type Role = 'direction' | 'commercial' | 'chargeOperation' | 'backOffice' | 'poseur';
export type Droits = { scenarios: boolean; elements: boolean };

type Cache = { lu: number; proprietaires: Set<number>; groupes: { role: Role; membres: Set<number> }[] };
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
  let complet = true;
  try {
    const r = await fetch('https://api.clickup.com/api/v2/team', { headers: { Authorization: token }, cache: 'no-store' });
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      const t = (Array.isArray(j?.teams) ? j.teams : []).find((x: any) => String(x?.id) === equipe);
      for (const m of Array.isArray(t?.members) ? t.members : []) {
        if (Number(m?.user?.role) === 1) proprietaires.add(Number(m.user.id));
      }
    } else complet = false;
    const g = await fetch(`https://api.clickup.com/api/v2/group?team_id=${equipe}`, { headers: { Authorization: token }, cache: 'no-store' });
    if (g.ok) {
      const j = await g.json().catch(() => ({}));
      for (const x of Array.isArray(j?.groups) ? j.groups : []) {
        const role = roleDuGroupe(`${x?.name || ''} ${x?.handle || ''}`);
        if (!role) continue;
        const membres = new Set<number>((Array.isArray(x?.members) ? x.members : []).map((m: any) => Number(m?.id)));
        groupes.push({ role, membres });
      }
    } else complet = false;
  } catch (e) {
    complet = false;
    console.error('Rôles illisibles', e);
  }
  const lu: Cache = { lu: Date.now(), proprietaires, groupes };
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

export function droitsDe(roles: Role[]): Droits {
  const a = (r: Role) => roles.includes(r);
  return {
    scenarios: a('direction') || a('commercial'),
    elements: a('direction') || a('commercial') || a('chargeOperation'),
  };
}
