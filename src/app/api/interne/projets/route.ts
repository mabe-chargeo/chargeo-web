import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { getQualificationListId, lireTacheQualification } from '@/lib/listesClickUp';
import { CHAMPS } from '@/lib/champsClickUp';
import { LISTES } from '@/lib/espaces';
import { champType } from '@/lib/typesTaches';
import {
  CHAMPS_CONTACTS, LIBELLE_LIEN, ROLES_CONTACT, cleEmail, cleTel, lienDuRole, roleDeCle, roleDeTache, telClickUp,
  type CleRoleContact, type LienProjet,
} from '@/lib/rolesContact';
import { adresses } from '@/lib/adresses';

// Écran Nouveau projet de l'application équipe (parcours validé par Matthieu le 17/10/2026, 14 h 08).
// 1. Qui appelle ? On relie un contact existant de la liste Contacts 👥 (son rôle est déjà connu) ou on en crée un, avec
//    son rôle. Gestionnaire syndic → 👔 Gestionnaire, autres rôles → 📍 Contact sur place (src/lib/rolesContact.ts).
// 2. Adresse du chantier : elle appartient au PROJET (champ 📍 Adresse de la fiche), pas au contact. Suggestions par la
//    Géoplateforme IGN (base adresse nationale, gratuite, sans clé), avec repli sur api-adresse.data.gouv.fr.
// 3. Doublon : un projet ouvert à moins de 40 m (ou de même adresse) en Qualification, au Planning ou au Parc est signalé.
// 4. Le contact principal remplit le passeport 📞 Telephone et 📧 Email de la fiche (lu par le webhook Costructor).
// La même route relie des contacts à un projet existant (action « ajouter », bouton de la fiche affaire).
// GET                         : annuaire de la liste Contacts, avec les projets déjà reliés à chaque contact
// GET ?adresse=…              : suggestions d'adresses
// GET ?lat=…&lng=…&label=…   : projets ouverts à la même adresse
// GET ?fiche=…                : fiche à compléter (nom et contacts déjà reliés)
// POST { action: 'creer' | 'ajouter', … }
// Preview : la fiche est créée dans 🧪 Qualification TEST et son nom commence par « Test ». La liste Contacts réelle n'est
// JAMAIS écrite et les champs relation n'existent pas sur TEST : les contacts sont notés en commentaire sur la fiche test.

export const dynamic = 'force-dynamic';
const PAGES_MAX = 10;
const RAYON_DOUBLON_M = 40;

const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const champs = (t: any): any[] => (Array.isArray(t?.custom_fields) ? t.custom_fields : []);
const valeur = (t: any, id: string) => champs(t).find((c) => c?.id === id)?.value;
const texte = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());
const estPreview = () => process.env.VERCEL_ENV !== 'production';

async function lister(token: string, listId: string): Promise<any[]> {
  const toutes: any[] = [];
  for (let page = 0; page < PAGES_MAX; page++) {
    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false&include_closed=false&subtasks=false&page=${page}`, {
      headers: { Authorization: token },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`ClickUp a refusé la lecture (${res.status})`);
    const corps = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(corps?.tasks) ? corps.tasks : [];
    toutes.push(...lot.filter((t) => !t?.parent));
    if (corps?.last_page !== false || lot.length === 0) break;
  }
  return toutes;
}

const liens = (t: any, champId: string): { id: string; nom: string }[] => {
  const v = valeur(t, champId);
  return (Array.isArray(v) ? v : []).filter((x: any) => x?.id).map((x: any) => ({ id: String(x.id), nom: texte(x.name) }));
};

// Contact de l'annuaire, tel que l'écran l'affiche
function contactDe(t: any) {
  const role = roleDeTache(t);
  const gestion = liens(t, CHAMPS_CONTACTS.gestionnaire);
  const surPlace = liens(t, CHAMPS_CONTACTS.contactSurPlace);
  const projets = [...gestion, ...surPlace].filter((p, i, tab) => tab.findIndex((x) => x.id === p.id) === i);
  return {
    id: String(t.id),
    nom: texte(t.name),
    role,
    roleLibelle: roleDeCle(role)?.libelle || '',
    societe: texte(valeur(t, CHAMPS_CONTACTS.societe)),
    tel: texte(valeur(t, CHAMPS_CONTACTS.tel)),
    email: texte(valeur(t, CHAMPS_CONTACTS.email)),
    projets,
  };
}

// Suggestions d'adresses (Géoplateforme IGN, repli sur l'ancienne API Adresse)
async function suggestions(q: string) {
  const sources = [
    `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&limit=6`,
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=6`,
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const corps = await res.json().catch(() => ({}));
      const features: any[] = Array.isArray(corps?.features) ? corps.features : [];
      return features
        .filter((f) => Array.isArray(f?.geometry?.coordinates) && f?.properties?.label)
        .map((f) => ({ label: String(f.properties.label), lng: Number(f.geometry.coordinates[0]), lat: Number(f.geometry.coordinates[1]), ville: texte(f.properties.city) }));
    } catch {
      // source suivante
    }
  }
  return [];
}

function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Projets ouverts à la même adresse (Qualification de l'environnement, Planning Chantiers, Parc)
async function doublons(token: string, cible: { lat: number; lng: number; label: string }) {
  const qualifId = getQualificationListId();
  const sources = [
    { id: qualifId, etape: 'En vente', fiche: true },
    { id: LISTES.planning, etape: 'Chantier', fiche: true },
    { id: LISTES.parc, etape: 'Parc', fiche: true },
  ];
  const lus = await Promise.allSettled(sources.map((s) => (s.id ? lister(token, String(s.id)) : Promise.resolve([] as any[]))));
  const trouves: { id: string; nom: string; etape: string; statut: string; adresse: string; distance: number | null; lien: string }[] = [];
  lus.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    for (const t of r.value) {
      const a: any = valeur(t, CHAMPS.adresse);
      const label = texte(a?.formatted_address);
      if (!label) continue;
      const lat = Number(a?.location?.lat);
      const lng = Number(a?.location?.lng);
      const d = Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(cible.lat) && Number.isFinite(cible.lng) ? distanceM(cible, { lat, lng }) : null;
      const memeTexte = !!cible.label && normal(label).startsWith(normal(cible.label).split(' ').slice(0, 4).join(' ')) && normal(label).includes(normal(cible.label).split(' ').slice(-1)[0] || '#');
      if ((d !== null && d <= RAYON_DOUBLON_M) || memeTexte) {
        trouves.push({ id: String(t.id), nom: texte(t.name), etape: sources[i].etape, statut: texte(t?.status?.status), adresse: label, distance: d === null ? null : Math.round(d), lien: adresses.affaire(String(t.id)) });
      }
    }
  });
  return trouves;
}

async function droits(request: Request, token: string) {
  const session = await sessionDeRequete(request);
  if (!session?.id) return { ok: false as const, reponse: json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401) };
  const roles = await rolesDe(token, session.id);
  return { ok: true as const, session, roles };
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
  const d = await droits(request, token);
  if (!d.ok) return d.reponse;
  const autorise = ['direction', 'commercial', 'chargeOperation', 'backOffice'].some((r) => d.roles.includes(r as any));
  if (!autorise) return json({ success: false, error: 'Réservé au commercial, au chef de chantier, au back-office et à la direction.' }, 403);

  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get('adresse') || '').trim();
    if (q) return json({ success: true, suggestions: q.length >= 3 ? await suggestions(q) : [] });

    if (url.searchParams.has('lat') || url.searchParams.has('label')) {
      const cible = { lat: Number(url.searchParams.get('lat')), lng: Number(url.searchParams.get('lng')), label: texte(url.searchParams.get('label')) };
      return json({ success: true, doublons: await doublons(token, cible) });
    }

    const ficheId = (url.searchParams.get('fiche') || '').trim();
    let fiche: any = null;
    if (ficheId) {
      const lu = await lireTacheQualification(ficheId, token);
      if (!lu.ok) return json({ success: false, error: lu.erreur }, lu.status);
      fiche = {
        id: String(lu.tache.id),
        nom: texte(lu.tache.name),
        gestionnaire: liens(lu.tache, CHAMPS_CONTACTS.gestionnaire),
        surPlace: liens(lu.tache, CHAMPS_CONTACTS.contactSurPlace),
      };
    }

    const contacts = LISTES.contacts ? (await lister(token, String(LISTES.contacts))).map(contactDe) : [];
    contacts.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    return json({
      success: true,
      preview: estPreview(),
      peutCreer: d.roles.includes('direction') || d.roles.includes('commercial'),
      roles: ROLES_CONTACT.map((r) => ({ cle: r.cle, libelle: r.libelle })),
      contacts,
      fiche,
    });
  } catch (e) {
    console.error('Nouveau projet (lecture)', e);
    return json({ success: false, error: 'Lecture impossible pour l’instant' }, 500);
  }
}

type ContactDemande = {
  id?: string;
  nouveau?: { prenom?: string; nom?: string; tel?: string; email?: string; societe?: string; role?: CleRoleContact };
  principal?: boolean;
};
type ContactRetenu = { id: string | null; nom: string; role: CleRoleContact | null; lien: LienProjet; tel: string; email: string; etat: 'existant' | 'cree' | 'retrouve' | 'preview'; principal: boolean };

const nomContact = (n: ContactDemande['nouveau']) => {
  const prenom = texte(n?.prenom);
  const nom = texte(n?.nom).toUpperCase();
  return [prenom, nom].filter(Boolean).join(' ');
};

async function ecrireChamp(token: string, taskId: string, champId: string, value: any): Promise<boolean> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}/field/${champId}`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
    cache: 'no-store',
  });
  if (!res.ok) console.error(`Champ ${champId} refusé (${res.status}) sur ${taskId}`, await res.text().catch(() => ''));
  return res.ok;
}

async function commenter(token: string, taskId: string, texteCommentaire: string) {
  await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}/comment`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment_text: texteCommentaire, notify_all: false }),
    cache: 'no-store',
  }).catch(() => null);
}

// Résout les contacts demandés : existants (par identifiant), retrouvés (même email ou téléphone) ou créés.
// En preview, rien n'est écrit dans la liste Contacts.
async function resoudreContacts(token: string, demandes: ContactDemande[], annuaire: any[], preview: boolean): Promise<{ retenus: ContactRetenu[]; erreurs: string[] }> {
  const retenus: ContactRetenu[] = [];
  const erreurs: string[] = [];
  for (const dm of demandes) {
    const principal = !!dm.principal;
    if (dm.id) {
      const t = annuaire.find((x) => String(x.id) === String(dm.id));
      if (!t) { erreurs.push('Un contact choisi est introuvable dans la liste Contacts'); continue; }
      const c = contactDe(t);
      retenus.push({ id: c.id, nom: c.nom, role: c.role, lien: lienDuRole(c.role), tel: c.tel, email: c.email, etat: 'existant', principal });
      continue;
    }
    const n = dm.nouveau;
    const nom = nomContact(n);
    const role = roleDeCle(n?.role);
    if (!nom || !role) { erreurs.push('Nouveau contact : nom et rôle obligatoires'); continue; }
    const tel = n?.tel ? telClickUp(n.tel) : '';
    const email = texte(n?.email);
    // Même email ou même téléphone qu'un contact existant : on le relie au lieu de créer un doublon
    const meme = annuaire.find((t) => {
      const c = contactDe(t);
      return (!!email && cleEmail(c.email) === cleEmail(email)) || (!!tel && cleTel(c.tel).length === 9 && cleTel(c.tel) === cleTel(tel));
    });
    if (meme) {
      const c = contactDe(meme);
      retenus.push({ id: c.id, nom: c.nom, role: c.role, lien: lienDuRole(c.role), tel: c.tel, email: c.email, etat: 'retrouve', principal });
      continue;
    }
    if (preview) {
      retenus.push({ id: null, nom, role: role.cle, lien: lienDuRole(role.cle), tel, email, etat: 'preview', principal });
      continue;
    }
    const champsContact: any[] = [{ id: CHAMPS_CONTACTS.role, value: role.optionId }];
    if (tel) champsContact.push({ id: CHAMPS_CONTACTS.tel, value: tel });
    if (email) champsContact.push({ id: CHAMPS_CONTACTS.email, value: email });
    if (texte(n?.societe)) champsContact.push({ id: CHAMPS_CONTACTS.societe, value: texte(n?.societe) });
    const type = await champType(token, 'contact');
    const res = await fetch(`https://api.clickup.com/api/v2/list/${LISTES.contacts}/task`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nom, ...type, custom_fields: champsContact }),
      cache: 'no-store',
    });
    const cree = await res.json().catch(() => ({}));
    if (!res.ok || !cree?.id) { erreurs.push(`Création du contact ${nom} refusée par ClickUp (${res.status})`); continue; }
    retenus.push({ id: String(cree.id), nom, role: role.cle, lien: lienDuRole(role.cle), tel, email, etat: 'cree', principal });
  }
  // Un seul principal : le premier coché, sinon le premier de la liste
  const iPrincipal = Math.max(0, retenus.findIndex((r) => r.principal));
  retenus.forEach((r, i) => { r.principal = i === iPrincipal; });
  return { retenus, erreurs };
}

// Relie les contacts à la fiche (champs relation de la fiche). En preview : commentaire seulement.
async function relier(token: string, ficheId: string, retenus: ContactRetenu[], preview: boolean, auteur: string, creation: boolean) {
  const erreurs: string[] = [];
  if (!preview) {
    for (const lien of ['gestionnaire', 'surPlace'] as LienProjet[]) {
      const ids = retenus.filter((r) => r.lien === lien && r.id).map((r) => String(r.id));
      if (!ids.length) continue;
      const champ = lien === 'gestionnaire' ? CHAMPS_CONTACTS.gestionnaire : CHAMPS_CONTACTS.contactSurPlace;
      const ok = await ecrireChamp(token, ficheId, champ, { add: ids, rem: [] });
      if (!ok) erreurs.push(`Lien ${LIBELLE_LIEN[lien]} refusé par ClickUp`);
    }
  }
  const etat = (r: ContactRetenu) => (r.etat === 'cree' ? 'créé' : r.etat === 'retrouve' ? 'existant, retrouvé par email ou téléphone' : r.etat === 'preview' ? 'non créé, preview' : 'existant');
  const lignes = retenus.map((r) => `• ${r.nom} · ${roleDeCle(r.role)?.libelle || 'rôle inconnu'} · ${LIBELLE_LIEN[r.lien]}${r.principal ? ' · principal' : ''} (${etat(r)})`);
  const titre = creation ? `🆕 Projet créé depuis l'application par ${auteur}` : `👥 Contacts ajoutés depuis l'application par ${auteur}`;
  const note = preview ? "\n\nPreview : la liste Contacts réelle n'est pas écrite et les liens ne sont pas posés (champs absents sur 🧪 TEST)." : '';
  await commenter(token, ficheId, `${titre}\n\nContacts du projet :\n${lignes.join('\n')}${note}`);
  return erreurs;
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
  const d = await droits(request, token);
  if (!d.ok) return d.reponse;
  const preview = estPreview();
  const auteur = texte((d.session as any).nom) || texte((d.session as any).email) || 'l’équipe';

  try {
    const corps = await request.json().catch(() => ({}));
    const demandes: ContactDemande[] = Array.isArray(corps?.contacts) ? corps.contacts.slice(0, 8) : [];
    if (!demandes.length) return json({ success: false, error: 'Ajoute au moins un contact' }, 400);
    if (!LISTES.contacts) return json({ success: false, error: 'Liste Contacts non configurée' }, 500);
    const annuaire = await lister(token, String(LISTES.contacts));

    // ── Relier des contacts à un projet existant ──
    if (corps?.action === 'ajouter') {
      const autorise = ['direction', 'commercial', 'chargeOperation', 'backOffice'].some((r) => d.roles.includes(r as any));
      if (!autorise) return json({ success: false, error: 'Droits insuffisants' }, 403);
      const lu = await lireTacheQualification(String(corps?.ficheId || ''), token);
      if (!lu.ok) return json({ success: false, error: lu.erreur }, lu.status);
      if (preview && !/^test/i.test(texte(lu.tache.name))) return json({ success: false, error: 'En preview, seules les fiches « Test… » peuvent être modifiées.' }, 403);
      const { retenus, erreurs } = await resoudreContacts(token, demandes.map((x) => ({ ...x, principal: false })), annuaire, preview);
      if (!retenus.length) return json({ success: false, error: erreurs.join(' ; ') || 'Aucun contact à relier' }, 400);
      const erreursLien = await relier(token, String(lu.tache.id), retenus, preview, auteur, false);
      return json({ success: true, preview, fiche: { id: String(lu.tache.id), nom: texte(lu.tache.name), lien: adresses.affaire(String(lu.tache.id)) }, contacts: retenus, avertissements: [...erreurs, ...erreursLien] });
    }

    // ── Créer un projet ──
    if (!d.roles.includes('direction') && !d.roles.includes('commercial')) return json({ success: false, error: 'La création de projet est réservée au commercial et à la direction.' }, 403);
    const listId = getQualificationListId();
    if (!listId) return json({ success: false, error: 'Liste Qualification non configurée' }, 500);
    const p = corps?.projet || {};
    let nom = texte(p.nom);
    const adresse = p.adresse || {};
    const label = texte(adresse.label);
    const lat = Number(adresse.lat);
    const lng = Number(adresse.lng);
    if (!nom) return json({ success: false, error: 'Nom du projet obligatoire' }, 400);
    if (!label || !Number.isFinite(lat) || !Number.isFinite(lng)) return json({ success: false, error: 'Choisis l’adresse du chantier dans les suggestions' }, 400);
    if (preview && !/^test/i.test(nom)) nom = `Test · ${nom}`;

    const { retenus, erreurs } = await resoudreContacts(token, demandes, annuaire, preview);
    if (!retenus.length) return json({ success: false, error: erreurs.join(' ; ') || 'Aucun contact valable' }, 400);
    const principal = retenus.find((r) => r.principal) || retenus[0];

    const champsFiche: any[] = [{ id: CHAMPS.adresse, value: { location: { lat, lng }, formatted_address: label } }];
    if (principal.email) champsFiche.push({ id: CHAMPS.email, value: principal.email });
    if (principal.tel) champsFiche.push({ id: CHAMPS.telephone, value: telClickUp(principal.tel) });
    if (Number.isInteger(p.typeClient) && p.typeClient >= 0 && p.typeClient <= 2) champsFiche.push({ id: CHAMPS.typeClient, value: p.typeClient });
    if (Number.isInteger(p.segment) && p.segment >= 0 && p.segment <= 6) champsFiche.push({ id: CHAMPS.segment, value: p.segment });
    const description = [
      `Projet créé depuis l'application équipe par ${auteur}.`,
      `Adresse du chantier : ${label}`,
      texte(p.notes) ? `\nNotes : ${texte(p.notes)}` : '',
    ].filter(Boolean).join('\n');
    const type = await champType(token, 'projet');
    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nom, description, ...type, custom_fields: champsFiche }),
      cache: 'no-store',
    });
    const fiche = await res.json().catch(() => ({}));
    if (!res.ok || !fiche?.id) {
      console.error('Création de projet refusée', res.status, fiche);
      return json({ success: false, error: `ClickUp a refusé la création du projet (${res.status})`, contacts: retenus }, 502);
    }
    const erreursLien = await relier(token, String(fiche.id), retenus, preview, auteur, true);
    return json({ success: true, preview, fiche: { id: String(fiche.id), nom, lien: adresses.affaire(String(fiche.id)) }, contacts: retenus, avertissements: [...erreurs, ...erreursLien] });
  } catch (e) {
    console.error('Nouveau projet (écriture)', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}
