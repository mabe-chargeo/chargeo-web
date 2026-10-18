// File d'envoi hors ligne de l'application équipe (étape 2, fiche intervention validée par Matthieu le 17/10/2026 à 13 h).
// Modèle de la recherche du 17/10 (Procore, Jobber, Android offline-first) : on écrit d'abord sur le téléphone, puis une
// file durable envoie quand le réseau revient. États visibles : en attente, en cours, échec (avec l'erreur et Réessayer).
// Une photo en échec ne bloque jamais le reste : chaque envoi part seul.
// Chaque envoi a une clé unique (« cle ») transmise au serveur, qui ne refait pas un envoi déjà reçu : rejouer la file
// ne crée pas de doublon.
// 17/10, 14 h 50 : chaque envoi peut viser sa route (« route ») : saisie à la pose (par défaut, /api/interne/pose) ou
// visite de maintenance (/api/interne/maintenance). Pour une visite, chantierId = la visite, elementId = le point de charge.
// 18/10, 14 h 41 : mise en service de la réception (/api/interne/mise-en-service), elementId = la borne ou le TD IRVE.
// IndexedDB (et pas localStorage) : les photos y tiennent sans la limite de 5 Mo. Navigateur uniquement.

export type EtatEnvoi = 'attente' | 'encours' | 'echec';
export type Envoi = {
  cle: string;
  chantierId: string;
  chantierNom: string;
  elementId: string;
  elementNom: string;
  type: 'saisie' | 'photo';
  // saisie : { numeroSerie, puissance } ou { resultats } ; photo : { etape }
  donnees: Record<string, string>;
  fichier?: Blob;
  nomFichier?: string;
  // Route qui reçoit l'envoi (absent = saisie à la pose)
  route?: string;
  etat: EtatEnvoi;
  erreur?: string;
  creeLe: number;
  essaisLe?: number;
};

const BASE = 'chargeo-terrain';
const TABLE = 'envois';
const ROUTES = ['/api/interne/pose', '/api/interne/maintenance', '/api/interne/mise-en-service'];
const routeDe = (e: Envoi) => (e.route && ROUTES.includes(e.route) ? e.route : '/api/interne/pose');

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    if (typeof indexedDB === 'undefined') { ko(new Error('Stockage du téléphone indisponible')); return; }
    const r = indexedDB.open(BASE, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(TABLE)) db.createObjectStore(TABLE, { keyPath: 'cle' });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error || new Error('Stockage du téléphone illisible'));
  });
}

async function transaction<T>(mode: IDBTransactionMode, travail: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await ouvrir();
  return new Promise((ok, ko) => {
    const tx = db.transaction(TABLE, mode);
    const req = travail(tx.objectStore(TABLE));
    let resultat: T | undefined;
    if (req) req.onsuccess = () => { resultat = req.result; };
    tx.oncomplete = () => { db.close(); ok(resultat); };
    tx.onerror = () => { db.close(); ko(tx.error || new Error('Écriture sur le téléphone refusée')); };
  });
}

export const nouvelleCle = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function ajouter(e: Omit<Envoi, 'etat' | 'creeLe'>): Promise<void> {
  await transaction('readwrite', (s) => s.put({ ...e, etat: 'attente', creeLe: Date.now() }));
}

export async function lister(): Promise<Envoi[]> {
  const tous = (await transaction<Envoi[]>('readonly', (s) => s.getAll() as IDBRequest<Envoi[]>)) || [];
  return tous.sort((a, b) => a.creeLe - b.creeLe);
}

async function maj(e: Envoi): Promise<void> {
  await transaction('readwrite', (s) => s.put(e));
}

async function retirer(cle: string): Promise<void> {
  await transaction('readwrite', (s) => s.delete(cle));
}

// Envoie un élément de la file. true = reçu par le serveur (retiré de la file)
async function envoyerUn(e: Envoi): Promise<boolean> {
  await maj({ ...e, etat: 'encours', essaisLe: Date.now() });
  try {
    let res: Response;
    const route = routeDe(e);
    if (e.type === 'photo') {
      if (!e.fichier) throw new Error('Photo absente du téléphone');
      const form = new FormData();
      form.append('cle', e.cle);
      form.append('chantierId', e.chantierId);
      form.append('elementId', e.elementId);
      form.append('etape', e.donnees.etape || 'photo');
      form.append('fichier', e.fichier, e.nomFichier || 'photo.jpg');
      res = await fetch(route, { method: 'POST', body: form });
    } else {
      res = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cle: e.cle, chantierId: e.chantierId, elementId: e.elementId, ...e.donnees }),
      });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) {
      await maj({ ...e, etat: 'echec', erreur: String(data?.error || `Refusé (${res.status})`), essaisLe: Date.now() });
      return false;
    }
    await retirer(e.cle);
    return true;
  } catch {
    await maj({ ...e, etat: 'echec', erreur: 'Pas de réseau : nouvel essai dès qu’il revient', essaisLe: Date.now() });
    return false;
  }
}

let enCours = false;
// Envoie toute la file, un élément après l'autre (l'échec de l'un n'arrête pas les suivants). Renvoie le nombre envoyé.
export async function envoyerTout(): Promise<number> {
  if (enCours) return 0;
  enCours = true;
  let n = 0;
  try {
    for (const e of await lister()) {
      if (await envoyerUn(e)) n++;
    }
  } finally {
    enCours = false;
  }
  return n;
}

// Un élément resté « en cours » (application fermée pendant l'envoi) repasse en attente
export async function reprendre(): Promise<void> {
  for (const e of await lister()) if (e.etat === 'encours') await maj({ ...e, etat: 'attente' });
}
