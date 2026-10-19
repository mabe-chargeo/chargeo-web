import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { getQualificationListId } from '@/lib/listesClickUp';
import { PROSPECTION_ID } from '@/lib/espaces';
import { champType, poserType } from '@/lib/typesTaches';
import { adresses } from '@/lib/adresses';

// Prospects créés et suivis depuis l'application (17/10/2026, 19 h 53, Matthieu : « tu fais bien attention à ce que le
// type de tâche créé dans ClickUp soit prospect qui deviendra alors un projet si ça se concrétise »).
// GET : options (sources, types de client, résultats d'appel, statuts de la liste), lues dans ClickUp.
// POST { action: 'creer', nom, telephone?, email?, linkedin?, source, typeClient?, adresse?, budget?, rappel?, notes? }
//   → Prospection (Chasse) ❄️, type de tâche Prospect, statut ⬜ à traiter, échéance = date de rappel (aujourd'hui par
//   défaut : « un lead sans échéance est un lead perdu », wiki de la liste).
// POST { action: 'maj', id, statut?, resultat?, rappel?, note? } → statut, 📢 Résultat Appel, prochain rappel et
//   commentaire. Sans date saisie, l'échéance suit les règles du wiki : en traitement +2 jours ouvrés, pas de réponse ou
//   message vocal +2 jours ouvrés, contacté +1 jour ouvré, nurturing +90 jours ; pas intéressé ou archivé : plus de date.
// POST { action: 'projet', id } → RDV obtenu : la MÊME tâche est déplacée en Qualification (wiki : « déplacement, pas une
//   copie »), son type devient Projet, statut de départ de la Qualification (📍 à visiter, donc « Visites à caler »),
//   échéance effacée. Source, LinkedIn et résultat d'appel (champs propres à la Prospection) sont notés en commentaire
//   avant le déplacement. Si ClickUp refuse le déplacement, rien n'est changé.
// Les champs sont retrouvés par leur NOM et les menus écrits par l'identifiant de l'option (pas par index).
// Droits : commercial et direction. Preview : création dans la vraie liste avec le nom « Test · … », seuls ces prospects
// peuvent être modifiés, et le passage en projet les envoie dans 🧪 Qualification TEST.
// Le fichier n'exporte que les handlers (règle des routes Next).

export const dynamic = 'force-dynamic';
const API = 'https://api.clickup.com/api/v2';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const texte = (v: unknown, max = 200) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const estPreview = () => process.env.VERCEL_ENV !== 'production';
const equipe = () => process.env.CLICKUP_TEAM_ID?.trim() || '90151325642';

// Champs de la Prospection, retrouvés par un mot de leur nom (sans accents)
const MOTS: Record<string, string> = {
  telephone: 'telephone',
  email: 'email',
  linkedin: 'linkedin',
  source: 'source',
  typeClient: 'type client',
  resultat: 'resultat appel',
  adresse: 'adresse',
  budget: 'budget',
};
type Option = { id: string; nom: string };
type ChampLu = { id: string; type: string; options: Option[] };
type Champs = Record<string, ChampLu | undefined>;

async function lireChamps(token: string): Promise<Champs> {
  const res = await fetch(`${API}/list/${PROSPECTION_ID}/field`, { headers: { Authorization: token }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Champs de la Prospection illisibles (${res.status})`);
  const corps = await res.json().catch(() => ({}));
  const liste: any[] = Array.isArray(corps?.fields) ? corps.fields : [];
  const carte: Champs = {};
  for (const cle of Object.keys(MOTS)) {
    const c = liste.find((x) => normal(x?.name).includes(MOTS[cle]));
    if (!c) continue;
    const options: any[] = Array.isArray(c?.type_config?.options) ? c.type_config.options.slice() : [];
    options.sort((a, b) => Number(a?.orderindex) - Number(b?.orderindex));
    carte[cle] = { id: String(c.id), type: String(c.type), options: options.map((o) => ({ id: String(o.id), nom: String(o.name || '') })) };
  }
  return carte;
}

async function statutsDe(token: string, listId: string): Promise<{ nom: string; type: string }[]> {
  const res = await fetch(`${API}/list/${listId}`, { headers: { Authorization: token }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Liste illisible (${res.status})`);
  const corps = await res.json().catch(() => ({}));
  const s: any[] = Array.isArray(corps?.statuses) ? corps.statuses.slice() : [];
  s.sort((a, b) => Number(a?.orderindex) - Number(b?.orderindex));
  return s.map((x) => ({ nom: String(x.status || ''), type: String(x.type || '') }));
}

// Dates : jour de Paris « AAAA-MM-JJ », enregistré à midi (Paris) sans heure
const jourParis = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
function plusJours(n: number, ouvres: boolean): string {
  const [a, m, j] = jourParis(new Date()).split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j, 12));
  let reste = n;
  while (reste > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const w = d.getUTCDay();
    if (!ouvres || (w !== 0 && w !== 6)) reste--;
  }
  return d.toISOString().slice(0, 10);
}
const dateValide = (v: unknown) => { const s = texte(v, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; };
const msDe = (iso: string) => new Date(`${iso}T10:00:00Z`).getTime();
const libelle = (iso: string) => { const [a, m, j] = iso.split('-'); return `${j}/${m}/${a}`; };

// Téléphone français ou suisse au format international (même règle que le formulaire du site)
function telephone(brut: unknown): string {
  let t = texte(brut, 30).replace(/[\s.\-()]/g, '');
  if (t.startsWith('00')) t = `+${t.substring(2)}`;
  if (t.startsWith('0')) t = `+33${t.substring(1)}`;
  return /^\+33[1-9]\d{8}$/.test(t) || /^\+41\d{9}$/.test(t) ? t : '';
}
const emailValide = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const optionDe = (c: ChampLu | undefined, id: unknown) => (c ? c.options.find((o) => o.id === String(id ?? '')) : undefined);
const sansEmoji = (s: string) => s.replace(/^[^A-Za-z0-9\u00C0-\u017F]+/, '').trim();

async function commenter(token: string, id: string, t: string) {
  await fetch(`${API}/task/${encodeURIComponent(id)}/comment`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment_text: t, notify_all: false }),
    cache: 'no-store',
  }).catch(() => null);
}
async function ecrireChamp(token: string, id: string, champId: string, value: any): Promise<boolean> {
  const res = await fetch(`${API}/task/${encodeURIComponent(id)}/field/${champId}`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
    cache: 'no-store',
  });
  return res.ok;
}
async function modifier(token: string, id: string, corps: any): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`${API}/task/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
    cache: 'no-store',
  });
  return { ok: res.ok, status: res.status };
}

// Prospect de la liste Prospection ; en preview, seulement les « Test … »
async function lireProspect(token: string, id: string, preview: boolean): Promise<{ ok: true; tache: any } | { ok: false; status: number; erreur: string }> {
  if (!/^[a-z0-9]+$/i.test(id)) return { ok: false, status: 400, erreur: 'Prospect inconnu' };
  const res = await fetch(`${API}/task/${id}`, { headers: { Authorization: token }, cache: 'no-store' });
  if (!res.ok) return { ok: false, status: res.status === 404 ? 404 : 502, erreur: 'Prospect introuvable' };
  const tache = await res.json().catch(() => null);
  if (String(tache?.list?.id || '') !== PROSPECTION_ID) return { ok: false, status: 403, erreur: 'Cette fiche n’est pas dans la Prospection' };
  if (preview && !/^test/i.test(String(tache?.name || ''))) return { ok: false, status: 403, erreur: 'En preview, seuls les prospects « Test … » peuvent être modifiés.' };
  return { ok: true, tache };
}
const valeurOption = (t: any, c: ChampLu | undefined) => {
  if (!c) return '';
  const f = (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((x: any) => String(x?.id) === c.id);
  const v = f?.value;
  if (v === undefined || v === null || v === '') return '';
  const o = (f?.type_config?.options || []).find((x: any) => Number(x?.orderindex) === Number(v) || String(x?.id) === String(v));
  return String(o?.name || '');
};
const valeurTexte = (t: any, c: ChampLu | undefined) => {
  if (!c) return '';
  const f = (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((x: any) => String(x?.id) === c.id);
  return texte(f?.value, 300);
};

async function autoriser(request: Request, token: string) {
  const session = await sessionDeRequete(request);
  if (!session?.id) return { ok: false as const, reponse: json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401) };
  const roles = await rolesDe(token, session.id);
  if (!roles.includes('direction') && !roles.includes('commercial')) return { ok: false as const, reponse: json({ success: false, error: 'La prospection est réservée au commercial.' }, 403) };
  return { ok: true as const, session };
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
  const a = await autoriser(request, token);
  if (!a.ok) return a.reponse;
  try {
    const [champs, statuts] = await Promise.all([lireChamps(token), statutsDe(token, PROSPECTION_ID)]);
    return json({
      success: true,
      preview: estPreview(),
      sources: champs.source?.options || [],
      typesClient: champs.typeClient?.options || [],
      resultats: champs.resultat?.options || [],
      statuts,
      manquants: Object.keys(MOTS).filter((k) => !champs[k]),
    });
  } catch (e) {
    console.error('Prospects (lecture)', e);
    return json({ success: false, error: 'Lecture de la Prospection impossible pour l’instant' }, 500);
  }
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
  const a = await autoriser(request, token);
  if (!a.ok) return a.reponse;
  const preview = estPreview();
  const auteur = texte((a.session as any).nom) || texte((a.session as any).email) || 'l’équipe';
  try {
    const corps = await request.json().catch(() => ({}));
    const champs = await lireChamps(token);

    // ── Créer un prospect ──
    if (corps?.action === 'creer') {
      let nom = texte(corps.nom, 120);
      if (nom.length < 2) return json({ success: false, error: 'Donne le nom du prospect' }, 400);
      const tel = telephone(corps.telephone);
      if (texte(corps.telephone) && !tel) return json({ success: false, error: 'Numéro de téléphone non reconnu (France ou Suisse)' }, 400);
      const email = texte(corps.email, 120);
      if (email && !emailValide(email)) return json({ success: false, error: 'Adresse email non reconnue' }, 400);
      const linkedin = texte(corps.linkedin, 300);
      if (linkedin && !/^https?:\/\//i.test(linkedin)) return json({ success: false, error: 'Le profil LinkedIn doit être un lien (https://…)' }, 400);
      if (!tel && !email && !linkedin) return json({ success: false, error: 'Il faut au moins un téléphone, un email ou un profil LinkedIn' }, 400);
      const source = optionDe(champs.source, corps.source);
      if (!source) return json({ success: false, error: 'Choisis la source (règle d’or du wiki : toujours renseigner Source)' }, 400);
      const typeClient = corps.typeClient ? optionDe(champs.typeClient, corps.typeClient) : undefined;
      if (corps.typeClient && !typeClient) return json({ success: false, error: 'Type de client inconnu' }, 400);
      const rappel = dateValide(corps.rappel) || plusJours(0, false);
      const budget = Number(corps.budget);
      const ad = corps.adresse || {};
      const adLabel = texte(ad.label, 300);
      const lat = Number(ad.lat);
      const lng = Number(ad.lng);

      const valeurs: any[] = [{ id: champs.source!.id, value: source.id }];
      if (tel && champs.telephone) valeurs.push({ id: champs.telephone.id, value: tel });
      if (email && champs.email) valeurs.push({ id: champs.email.id, value: email });
      if (linkedin && champs.linkedin) valeurs.push({ id: champs.linkedin.id, value: linkedin });
      if (typeClient && champs.typeClient) valeurs.push({ id: champs.typeClient.id, value: typeClient.id });
      if (adLabel && Number.isFinite(lat) && Number.isFinite(lng) && champs.adresse) valeurs.push({ id: champs.adresse.id, value: { location: { lat, lng }, formatted_address: adLabel } });
      if (Number.isFinite(budget) && budget > 0 && champs.budget) valeurs.push({ id: champs.budget.id, value: budget });

      const statuts = await statutsDe(token, PROSPECTION_ID);
      const depart = statuts.find((s) => normal(s.nom).includes('a traiter')) || statuts[0];
      if (preview && !/^test/i.test(nom)) nom = `Test · ${nom}`;
      const description = [
        `Prospect créé depuis l'application équipe par ${auteur}.`,
        adLabel && !valeurs.some((v) => champs.adresse && v.id === champs.adresse.id) ? `Adresse : ${adLabel}` : '',
        texte(corps.notes, 2000) ? `\n${texte(corps.notes, 2000)}` : '',
      ].filter(Boolean).join('\n');
      const type = await champType(token, 'prospect');
      const res = await fetch(`${API}/list/${PROSPECTION_ID}/task`, {
        method: 'POST',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nom, description, ...type, ...(depart ? { status: depart.nom } : {}),
          due_date: msDe(rappel), due_date_time: false, assignees: [Number(a.session.id)], custom_fields: valeurs,
        }),
        cache: 'no-store',
      });
      const t = await res.json().catch(() => ({}));
      if (!res.ok || !t?.id) {
        console.error('Création de prospect refusée', res.status, t);
        return json({ success: false, error: `ClickUp a refusé la création (${res.status})` }, 502);
      }
      return json({
        success: true, preview, typeProspect: type.custom_item_id !== undefined,
        cree: { id: String(t.id), nom: String(t.name || nom), rappel: libelle(rappel), lien: `${adresses.prospection}?vue=chasse` },
      });
    }

    // ── Mettre à jour un prospect (résultat d'appel, statut, prochain rappel) ──
    if (corps?.action === 'maj') {
      const lu = await lireProspect(token, texte(corps.id, 30), preview);
      if (!lu.ok) return json({ success: false, error: lu.erreur }, lu.status);
      const statuts = await statutsDe(token, PROSPECTION_ID);
      const statut = texte(corps.statut, 80) ? statuts.find((s) => s.nom === texte(corps.statut, 80)) : undefined;
      if (texte(corps.statut, 80) && !statut) return json({ success: false, error: 'Statut inconnu' }, 400);
      if (statut && normal(statut.nom).includes('rdv fixe')) return json({ success: false, error: 'RDV fixé : utilise « Passer en projet »' }, 400);
      const resultat = corps.resultat ? optionDe(champs.resultat, corps.resultat) : undefined;
      if (corps.resultat && !resultat) return json({ success: false, error: 'Résultat d’appel inconnu' }, 400);
      const note = texte(corps.note, 2000);
      if (!statut && !resultat && !dateValide(corps.rappel) && !note) return json({ success: false, error: 'Rien à enregistrer' }, 400);

      // Prochain rappel : date saisie, sinon règles du wiki ; plus de date si le prospect sort du radar
      const ns = normal(statut?.nom || '');
      const nr = normal(resultat?.nom || '');
      const sortie = ns.includes('pas interesse') || ns.includes('archive');
      let rappel = dateValide(corps.rappel);
      let regle = '';
      if (!rappel && !sortie) {
        if (ns.includes('nurturing')) { rappel = plusJours(90, false); regle = 'nurturing : +90 jours'; }
        else if (ns.includes('contacte')) { rappel = plusJours(1, true); regle = 'contacté : +1 jour ouvré'; }
        else if (nr.includes('pas de reponse') || nr.includes('vocal')) { rappel = plusJours(2, true); regle = `${sansEmoji(resultat?.nom || '')} : +2 jours ouvrés`; }
        else if (ns.includes('en traitement')) { rappel = plusJours(2, true); regle = 'en traitement : +2 jours ouvrés'; }
      }
      const modif: any = {};
      if (statut) modif.status = statut.nom;
      if (sortie) modif.due_date = null;
      else if (rappel) { modif.due_date = msDe(rappel); modif.due_date_time = false; }
      if (Object.keys(modif).length) {
        const r = await modifier(token, String(lu.tache.id), modif);
        if (!r.ok) return json({ success: false, error: `ClickUp a refusé la mise à jour (${r.status})` }, 502);
      }
      if (resultat && champs.resultat) {
        const ok = await ecrireChamp(token, String(lu.tache.id), champs.resultat.id, resultat.id);
        if (!ok) return json({ success: false, error: 'ClickUp a refusé le résultat d’appel' }, 502);
      }
      const lignes = [
        `📞 Suivi depuis l'application par ${auteur}`,
        statut ? `Statut : ${statut.nom}` : '',
        resultat ? `Résultat d'appel : ${resultat.nom}` : '',
        sortie ? 'Plus de rappel (sorti du radar)' : rappel ? `Prochain rappel : ${libelle(rappel)}${regle ? ` (règle du wiki, ${regle})` : ''}` : '',
        note ? `\n${note}` : '',
      ].filter(Boolean);
      await commenter(token, String(lu.tache.id), lignes.join('\n'));
      const sansDate = !sortie && !rappel && !Number(lu.tache?.due_date);
      return json({ success: true, preview, rappel: rappel ? libelle(rappel) : '', regle, sansDate });
    }

    // ── RDV obtenu : le prospect devient un projet (même tâche, déplacée en Qualification) ──
    if (corps?.action === 'projet') {
      const lu = await lireProspect(token, texte(corps.id, 30), preview);
      if (!lu.ok) return json({ success: false, error: lu.erreur }, lu.status);
      const id = String(lu.tache.id);
      const qualifId = getQualificationListId();
      if (!qualifId) return json({ success: false, error: 'Liste Qualification non configurée' }, 500);

      // Champs propres à la Prospection, perdus au déplacement : notés avant
      const memo = [
        `🏆 RDV obtenu : prospect passé en projet depuis l'application par ${auteur}.`,
        valeurOption(lu.tache, champs.source) ? `Source : ${valeurOption(lu.tache, champs.source)}` : '',
        valeurTexte(lu.tache, champs.linkedin) ? `Profil LinkedIn : ${valeurTexte(lu.tache, champs.linkedin)}` : '',
        valeurOption(lu.tache, champs.resultat) ? `Dernier résultat d'appel : ${valeurOption(lu.tache, champs.resultat)}` : '',
        texte(corps.note, 1000) ? `\n${texte(corps.note, 1000)}` : '',
        '\nSuite : Visites à caler (le commercial fixe le relevé technique du chef de chantier).',
      ].filter(Boolean).join('\n');
      await commenter(token, id, memo);

      const dep = await fetch(`https://api.clickup.com/api/v3/workspaces/${equipe()}/tasks/${encodeURIComponent(id)}/home_list/${qualifId}`, {
        method: 'PUT',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (!dep.ok) {
        console.error('Déplacement vers la Qualification refusé', dep.status, await dep.text().catch(() => ''));
        return json({ success: false, error: `ClickUp a refusé le déplacement vers la Qualification (${dep.status}). Le prospect n’a pas bougé.` }, 502);
      }
      const typeOk = await poserType(token, id, 'projet');
      const statutsQ = await statutsDe(token, qualifId).catch(() => [] as { nom: string; type: string }[]);
      const depart = statutsQ.find((s) => normal(s.nom).includes('visiter')) || statutsQ.find((s) => s.type === 'open');
      const r = await modifier(token, id, { ...(depart ? { status: depart.nom } : {}), due_date: null });
      return json({
        success: true, preview, typeOk, statutOk: r.ok,
        fiche: { id, nom: String(lu.tache.name || ''), lien: adresses.affaire(id) },
      });
    }

    return json({ success: false, error: 'Action inconnue' }, 400);
  } catch (e) {
    console.error('Prospects (écriture)', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}
