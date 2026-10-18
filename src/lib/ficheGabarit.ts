import { champsCles, champsLus } from '@/lib/champsGeneriques';
import { getQualificationListId } from '@/lib/listesClickUp';
import { LISTES } from '@/lib/espaces';

// Gabarit commun des fiches génériques (maquette MAQUETTE_GABARIT-FICHES_2026-10-18.png validée par Matthieu le
// 18/10/2026, 19 h 50, après « la page des factures est plus travaillée que toutes les autres pages… j'aimerais bien
// qu'il y ait ce genre de lien un peu sur toutes les pages, il faut que l'application soit pratique »).
// Calculé par /api/interne/fiche-generique pour toutes les listes sauf Factures (écran propre) :
// - cles : 3 champs clés de la carte du haut (mots « champs » de la liste, src/lib/listesAppli.ts) ;
// - parcours : statuts ouverts de la liste ClickUp, dans leur ordre, avec l'étape en cours ;
// - affaire : première fiche reliée qui est une affaire (Prospection, Qualification, Planning, Parc) : l'écran y affiche
//   le bloc 📇 Contact validé (src/components/ui/BlocContact.tsx) ;
// - contact : téléphone, email et adresse de la fiche elle-même (en plus de l'affaire s'il y en a), montrés avec les mêmes boutons
//   (BoutonsContact : Appeler, Google Voice, SMS, Gmail ; Waze et Google Maps pour l'adresse) ;
// - liens : fiches reliées (ouvertes dans l'application), liens web, autres adresses, pièces jointes, tâche parente.
// 18/10, 20 h 00 (Matthieu : « ton bouton… qui ouvre FaceTime, on avait travaillé là-dessus ») : plus de raccourcis tel: /
// mailto: bruts, les boutons de contact sont ceux du bloc Contact validé les 15 et 17/10.
// Lecture seule. Un échec réseau ne casse pas la fiche : parcours ou affaire absents.

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
  affaire: string;
  contact: { tel: string; email: string; adresse: string; lat: number | null; lng: number | null; autres: { libelle: string; tel: string; email: string }[] };
  // Email CHARGéO de la personne connectée (Google Voice et Gmail sur le bon compte)
  moi: string;
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

function genreWeb(url: string): string {
  const u = normal(url);
  if (u.includes('costructor')) return 'Dans Costructor';
  if (u.includes('drive.google') || u.includes('docs.google')) return 'Dans le Drive';
  if (u.includes('chargeo')) return 'Sur le site CHARGéO';
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Lien'; }
}

export async function lireGabarit(token: string, t: any, motsCles: string[], moi = ''): Promise<Gabarit> {
  const champs = champsLus(t);
  const cles = champsCles(t, motsCles, 3).filter((c) => !RELATIONS.includes(c.type)).map((c) => c.id);
  const ailleurs: string[] = [];
  const liens: LienFiche[] = [];
  const contact: Gabarit['contact'] = { tel: '', email: '', adresse: '', lat: null, lng: null, autres: [] };
  const brut = (id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((x: any) => String(x?.id) === id)?.value;

  // Contact de la fiche : le premier de chaque sorte, puis les autres numéros et emails avec leur nom ; les autres adresses dans les liens
  for (const c of champs.filter((x) => CONTACTS.includes(x.type))) {
    ailleurs.push(c.id);
    const nom = sansEmoji(c.nom) || c.nom;
    if (c.type === 'phone') {
      if (!contact.tel) contact.tel = c.texte;
      else contact.autres.push({ libelle: nom, tel: c.texte, email: '' });
    } else if (c.type === 'email') {
      if (!contact.email) contact.email = c.texte;
      else contact.autres.push({ libelle: nom, tel: '', email: c.texte });
    } else if (!contact.adresse) {
      const v = brut(c.id);
      contact.adresse = c.texte;
      contact.lat = typeof v?.location?.lat === 'number' ? v.location.lat : null;
      contact.lng = typeof v?.location?.lng === 'number' ? v.location.lng : null;
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

  // Affaire reliée (installation du Parc, chantier, fiche de vente) : son bloc Contact
  const affaires = [getQualificationListId(), LISTES.prospection, LISTES.planning, LISTES.parc].filter(Boolean).map(String);
  let affaire = '';
  for (const r of reliees.slice(0, RELIEES_MAX)) {
    const lt = await lire(token, `/task/${encodeURIComponent(r.id)}`);
    if (lt && affaires.includes(String(lt?.list?.id || ''))) { affaire = String(lt.id); break; }
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
  return { cles, parcours, affaire, contact, moi, liens, ailleurs };
}
