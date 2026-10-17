// Types de tâches ClickUp (étape 1 du plan du 15/10/2026, tâche Phase 6).
// Les types sont créés par Matthieu dans Paramètres → Types de tâches. Le site les retrouve PAR LEUR NOM (l'identifiant
// numérique est propre à l'espace de travail), une fois par instance, puis les pose à la création (custom_item_id).
// Détection : on lit d'abord le type ; tant que les anciennes fiches ne sont pas converties (type Tâche ou Prospect),
// on retombe sur l'ancienne règle par le nom (« Scénario … », « ✅ Retenu · », « 🔧 Réserve : … »). Le repli sera retiré
// après la conversion des ~75 tâches.
// Test du 15/10 (preview) : Projet 1012, Scénario 1013, Élément 1014, Installation 1015, Réserve 1016, Commande 1017,
// Achat 1018, Dossier aide 1019, Ticket SAV 1020, Intervention 1010, Facture 1004, Prospect 1002, Contact 1011.
// 17/10/2026, 20 h 01 : Salarié et Candidat ajoutés (types déjà créés dans l'espace de travail), posés par
// /api/interne/creer-rh et /api/recrutement. Prospect posé par /api/interne/prospects, Projet au passage en Qualification.
// ClickUp renvoie 0 (ou rien) pour le type Tâche par défaut.

export const TYPES = {
  projet: 'Projet',
  scenario: 'Scénario',
  element: 'Élément',
  installation: 'Installation',
  reserve: 'Réserve',
  commande: 'Commande',
  achat: 'Achat',
  dossierAide: 'Dossier aide',
  ticketSav: 'Ticket SAV',
  intervention: 'Intervention',
  facture: 'Facture',
  prospect: 'Prospect',
  contact: 'Contact',
  salarie: 'Salarié',
  candidat: 'Candidat',
} as const;

export type CleType = keyof typeof TYPES;
export type CarteTypes = Partial<Record<CleType, number>>;

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

let cache: { carte: CarteTypes; manquants: CleType[]; lu: number } | null = null;
const DUREE_CACHE = 10 * 60 * 1000; // 10 minutes : un type créé ou renommé est vu sans redéploiement

// Lit les types de l'espace de travail et les associe aux clés ci-dessus. Jamais d'exception : carte vide si erreur.
export async function chargerTypes(token: string, forcer = false): Promise<{ carte: CarteTypes; manquants: CleType[] }> {
  if (!forcer && cache && Date.now() - cache.lu < DUREE_CACHE) return cache;
  const equipe = process.env.CLICKUP_TEAM_ID?.trim() || '90151325642';
  const carte: CarteTypes = {};
  try {
    const res = await fetch(`https://api.clickup.com/api/v2/team/${equipe}/custom_item`, {
      headers: { Authorization: token },
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      const liste: any[] = Array.isArray(json?.custom_items) ? json.custom_items : [];
      for (const [cle, nom] of Object.entries(TYPES) as [CleType, string][]) {
        const t = liste.find((x) => normal(x?.name) === normal(nom));
        if (t && Number.isFinite(Number(t.id))) carte[cle] = Number(t.id);
      }
    } else {
      console.error(`Types de tâches illisibles (${res.status})`);
    }
  } catch (e) {
    console.error('Types de tâches illisibles', e);
  }
  const manquants = (Object.keys(TYPES) as CleType[]).filter((k) => carte[k] === undefined);
  cache = { carte, manquants, lu: Date.now() };
  return cache;
}

// Champ à ajouter au corps d'une création de tâche : { custom_item_id } ou rien si le type est introuvable
// (la tâche est alors créée en Tâche, comme avant : on ne bloque jamais une création pour un type).
export async function champType(token: string, cle: CleType): Promise<{ custom_item_id?: number }> {
  const { carte } = await chargerTypes(token);
  const id = carte[cle];
  return id === undefined ? {} : { custom_item_id: id };
}

// Change le type d'une tâche existante (ex. Projet → Installation au Parc). true si écrit.
export async function poserType(token: string, taskId: string, cle: CleType): Promise<boolean> {
  const corps = await champType(token, cle);
  if (corps.custom_item_id === undefined) return false;
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}`, {
    method: 'PUT',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
    cache: 'no-store',
  });
  if (!res.ok) console.error(`Type ${TYPES[cle]} refusé (${res.status}) sur ${taskId}`);
  return res.ok;
}

// Type lu sur une tâche ClickUp (null = Tâche par défaut, que ClickUp renvoie 0 ou rien)
export function idTypeDe(tache: any): number | null {
  const v = tache?.custom_item_id;
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

export function estDuType(tache: any, cle: CleType, carte: CarteTypes): boolean {
  const id = carte[cle];
  return id !== undefined && idTypeDe(tache) === id;
}

// Une tâche porte-t-elle un des nouveaux types ? Si oui, le nom n'est plus jamais lu pour la classer.
function typeeNouveauModele(tache: any, carte: CarteTypes): boolean {
  const id = idTypeDe(tache);
  if (id === null) return false;
  return (['projet', 'scenario', 'element', 'installation', 'reserve'] as CleType[]).some((k) => carte[k] === id);
}

// Repli par le nom (anciennes fiches) : mêmes règles que src/lib/scenarioRetenu.ts et les routes de réception
const nomScenario = (n: string) => /^\s*Sc[ée]nario\b/i.test(n) || n.startsWith('✅ Retenu · ');
const nomReserve = (n: string) => normal(n).includes('reserve');
const nomEmplacement = (n: string) => /^\s*Emplacement\b/i.test(n);

// Scénario (tranché ou non). Ne dit rien de l'archivage : à filtrer par l'appelant.
export function estScenario(tache: any, carte: CarteTypes): boolean {
  if (typeeNouveauModele(tache, carte)) return estDuType(tache, 'scenario', carte);
  return nomScenario(String(tache?.name || ''));
}

export function estReserve(tache: any, carte: CarteTypes): boolean {
  if (typeeNouveauModele(tache, carte)) return estDuType(tache, 'reserve', carte);
  return nomReserve(String(tache?.name || ''));
}

export function estElement(tache: any, carte: CarteTypes): boolean {
  return estDuType(tache, 'element', carte);
}

// Ancien modèle uniquement (supprimé à l'étape 4) : jamais vrai pour une tâche typée
export function estEmplacement(tache: any, carte: CarteTypes): boolean {
  if (typeeNouveauModele(tache, carte)) return false;
  return nomEmplacement(String(tache?.name || ''));
}
