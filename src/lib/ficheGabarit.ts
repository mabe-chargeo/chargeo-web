import { champsCles, champsLus, type ChampLu } from '@/lib/champsGeneriques';

// Gabarit commun des fiches génériques (maquette MAQUETTE_GABARIT-FICHES_2026-10-18.png validée par Matthieu le
// 18/10/2026, 19 h 50, après « la page des factures est plus travaillée que toutes les autres pages… j'aimerais bien
// qu'il y ait ce genre de lien un peu sur toutes les pages, il faut que l'application soit pratique »).
// Calculé par /api/interne/fiche-generique pour toutes les listes sauf Factures (écran propre) :
// - cles : 3 champs clés de la carte du haut (mots « champs » de la liste, src/lib/listesAppli.ts) ;
// - parcours : statuts ouverts de la liste ClickUp, dans leur ordre, avec l'étape en cours ;
// - contact : Appeler / Itinéraire / Écrire, champs de la fiche, sinon ceux de la première fiche reliée qui en a ;
// - liens : fiches reliées (ouvertes dans l'application), liens web, autres téléphones, emails et adresses, pièces
//   jointes, tâche parente.
// Lecture seule. Un échec réseau ne casse pas la fiche : parcours ou contact repris absents.

const API = 'https://api.clickup.com/api/v2';
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const sansEmoji = (s: string) => String(s || '').replace(/^[^A-Za-z0-9\u00C0-\u017F]+/, '').trim();
const ETAPES_MAX = 5;
const RELIEES_MAX = 3;
const RELATIONS = ['tasks', 'list_relationship'];
const CONTACTS = ['phone', 'email', 'location'];

export type LienFiche = { nom: string; sous: string; href: string; genre: 'fiche' | 'web' | 'tel' | 'mail' | 'carte' | 'fichier' };
export type Gabarit = {
  cles: string[];
  parcours: { etapes: string[]; courante: number } | null;
  contact: { tel: string; email: string; adresse: string; carte: string; depuis: string };
  liens: LienFiche[];
  // Champs déjà montrés ailleurs (contact, liens) : absents des Détails
  ailleurs: string[];
};

async function lire(token: string, chemin: string): Promise<any | null> {
  try {
    const r = await fetch(`${API}${chemin}`, { headers: { Authorization: token }, cache: 'no-store' });
    return r.ok ? await r.json().catch(() => null) : null;
  } catch {
    return null;
  }
}

// Statuts ouverts de la liste, l'étape en cours (toutes faites si la fiche est fermée), 5 étapes au plus
export async function parcoursDe(token: string, listId: string, statut: string) {
  const l = await lire(token, `/list/${encodeURIComponent(listId)}`);
  const tous: any[] = Array.isArray(l?.statuses) ? l.statuses.slice() : [];
  tous.sort((a, b) => Number(a?.orderindex ?? 0) - Number(b?.orderindex ?? 0));
  const ouverts = tous.filter((s) => s?.type !== 'closed' && !normal(s?.status).includes('archiv') && !normal(s?.status).includes('annul'));
  const noms = ouverts.map((s) => String(s?.status || ''));
  if (noms.length < 2) return null;
  let courante = noms.findIndex((n) => normal(n) === normal(statut));
  if (courante < 0) {
    // Fermée ou archivée : tout est fait ; annulée ou statut inconnu : pas de parcours
    const s = tous.find((x) => normal(x?.status) === normal(statut));
    if (!s || normal(statut).includes('annul')) return null;
    courante = noms.length;
  }
  const debut = noms.length <= ETAPES_MAX ? 0 : Math.max(0, Math.min(courante - 1, noms.length - ETAPES_MAX));
  const etapes = noms.slice(debut, debut + ETAPES_MAX).map((n) => {
    const x = sansEmoji(n);
    return x.charAt(0).toUpperCase() + x.slice(1);
  });
  return { etapes, courante: courante - debut };
}

const carteDe = (adresse: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`;
const telDe = (c: ChampLu) => c.lien || `tel:${c.texte.replace(/\s+/g, '')}`;

function genreWeb(url: string): string {
  const u = normal(url);
  if (u.includes('costructor')) return 'Dans Costructor';
  if (u.includes('drive.google') || u.includes('docs.google')) return 'Dans le Drive';
  if (u.includes('chargeo')) return 'Sur le site CHARGéO';
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Lien'; }
}

export async function lireGabarit(token: string, t: any, motsCles: string[]): Promise<Gabarit> {
  const champs = champsLus(t);
  const cles = champsCles(t, motsCles, 3).filter((c) => !RELATIONS.includes(c.type)).map((c) => c.id);
  const ailleurs: string[] = [];
  const liens: LienFiche[] = [];
  const contact = { tel: '', email: '', adresse: '', carte: '', depuis: '' };

  // Contact de la fiche : le premier de chaque sorte en raccourci, les autres dans les liens
  for (const c of champs.filter((x) => CONTACTS.includes(x.type))) {
    ailleurs.push(c.id);
    const nom = sansEmoji(c.nom) || c.nom;
    if (c.type === 'phone') {
      if (!contact.tel) contact.tel = telDe(c);
      else liens.push({ nom: c.texte, sous: `Appeler · ${nom}`, href: telDe(c), genre: 'tel' });
    } else if (c.type === 'email') {
      if (!contact.email) contact.email = `mailto:${c.texte}`;
      else liens.push({ nom: c.texte, sous: `Écrire · ${nom}`, href: `mailto:${c.texte}`, genre: 'mail' });
    } else if (!contact.adresse) {
      contact.adresse = c.texte;
      contact.carte = carteDe(c.texte);
    } else liens.push({ nom: c.texte, sous: `Itinéraire · ${nom}`, href: carteDe(c.texte), genre: 'carte' });
  }

  // Fiches reliées : ouvertes dans l'application
  const reliees: { id: string; nom: string }[] = [];
  for (const c of champs.filter((x) => RELATIONS.includes(x.type))) {
    ailleurs.push(c.id);
    for (const r of c.taches || []) {
      if (reliees.some((x) => x.id === r.id)) continue;
      reliees.push(r);
      liens.push({ nom: r.nom || 'Fiche reliée', sous: sansEmoji(c.nom) || 'Fiche reliée', href: `/interne/element/${r.id}`, genre: 'fiche' });
    }
  }

  // Contact manquant : repris de la première fiche reliée qui en a (installation du Parc, chantier…)
  if (!contact.tel || !contact.email || !contact.adresse) {
    for (const r of reliees.slice(0, RELIEES_MAX)) {
      const lt = await lire(token, `/task/${encodeURIComponent(r.id)}`);
      if (!lt) continue;
      const lc = champsLus(lt);
      const tel = lc.find((x) => x.type === 'phone');
      const mail = lc.find((x) => x.type === 'email');
      const adr = lc.find((x) => x.type === 'location');
      let pris = false;
      if (!contact.tel && tel) { contact.tel = telDe(tel); pris = true; }
      if (!contact.email && mail) { contact.email = `mailto:${mail.texte}`; pris = true; }
      if (!contact.adresse && adr) { contact.adresse = adr.texte; contact.carte = carteDe(adr.texte); pris = true; }
      if (pris && !contact.depuis) contact.depuis = String(lt?.name || r.nom || '');
      if (contact.tel && contact.email && contact.adresse) break;
    }
  }

  // Liens web
  for (const c of champs.filter((x) => x.type === 'url' && x.lien)) {
    ailleurs.push(c.id);
    liens.push({ nom: sansEmoji(c.nom) || 'Lien', sous: genreWeb(String(c.lien)), href: String(c.lien), genre: 'web' });
  }

  // Pièces jointes, puis tâche parente
  for (const a of Array.isArray(t?.attachments) ? t.attachments : []) {
    const url = String(a?.url || '');
    if (url) liens.push({ nom: String(a?.title || 'Fichier'), sous: 'Pièce jointe', href: url, genre: 'fichier' });
  }
  if (t?.parent) liens.push({ nom: 'Tâche parente', sous: 'Fiche principale', href: `/interne/element/${t.parent}`, genre: 'fiche' });

  const parcours = await parcoursDe(token, String(t?.list?.id || ''), String(t?.status?.status || ''));
  return { cles, parcours, contact, liens, ailleurs };
}
