import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { CHAMPS, OPTIONS, cleOption, indexMenu, LIBELLE_NATURE, type Nature } from '@/lib/champsClickUp';
import { chargerTypes, estScenario } from '@/lib/typesTaches';
import { PREFIXE_RETENU } from '@/lib/scenarioRetenu';
import { adresseDe } from '@/lib/vuesFiches';
import { LISTES } from '@/lib/espaces';

// Saisie à la pose (étape 2, fiche intervention validée par Matthieu le 17/10/2026 à 13 h).
// GET ?id=<chantier> : le matériel prévu = les éléments du scénario retenu (« ✅ Retenu · … », à défaut tous les
//   scénarios non archivés), avec pour chaque borne et chaque coffret ce qui est déjà saisi (n° de série, photos).
// POST JSON { cle, chantierId, elementId, numeroSerie?, puissance? } : sur l'élément, 🆔 Numéro de Série (si le champ
//   est sur la liste : Matthieu l'ajoute au Planning en « champ existant ») et un commentaire « 🔧 Saisie à la pose » qui
//   garde n° de série, puissance configurée, auteur et heure (aucun champ puissance configurée n'existe au Planning).
// POST multipart { cle, chantierId, elementId, etape, fichier } : photo en pièce jointe de l'élément, nommée
//   « Pose · <élément> · <étape> » : elle suit la borne jusqu'au Parc avec la tâche voyageuse.
// Rejouable : la clé de l'envoi (file d'envoi du téléphone) est écrite dans le commentaire et le nom de la photo ; un
//   envoi déjà reçu n'est pas refait.
// Preview : lecture de tout le planning, écriture seulement sur les chantiers « Test … » (comme la réception).

export const dynamic = 'force-dynamic';

const NUMERO_SERIE = '3b583c66-e4ac-4313-a60b-fd397b9f4923'; // 🆔 Numéro de Série (Parc, à ajouter au Planning)
const PUISSANCES = ['3,7', '7,4', '11', '22'];
const ETAPES_PHOTO: Record<string, string> = { etiquette: 'étiquette', posee: 'posée', coffret: 'coffret', autre: 'photo' };

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c?.id === id);
const ecritureAutorisee = (t: any) => process.env.VERCEL_ENV === 'production' || normal(t?.name).trim().startsWith('test');
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const cleValide = (c: string) => /^[a-z0-9]{6,40}$/i.test(c);

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}
async function lire(token: string, id: string, sousTaches = false): Promise<any | null> {
  const res = await api(token, `/task/${encodeURIComponent(id)}${sousTaches ? '?include_subtasks=true' : ''}`);
  return res.ok ? res.json() : null;
}

function natureDe(e: any): Nature | null {
  return (cleOption(OPTIONS.nature, indexMenu(e, CHAMPS.nature)) as Nature | null) || null;
}

// Scénarios du chantier qui portent le matériel : le retenu, sinon tous ceux qui ne sont pas archivés
async function scenariosDe(token: string, chantier: any): Promise<any[]> {
  const { carte } = await chargerTypes(token);
  const directes = (Array.isArray(chantier?.subtasks) ? chantier.subtasks : [])
    .filter((s: any) => !s?.archived && String(s?.parent || '') === String(chantier.id));
  const retenus = directes.filter((s: any) => String(s?.name || '').startsWith(PREFIXE_RETENU));
  return retenus.length ? retenus : directes.filter((s: any) => estScenario(s, carte));
}

async function chantierDuPlanning(token: string, id: string) {
  if (!/^[a-z0-9]+$/i.test(id)) return { erreur: 'Identifiant de chantier invalide', status: 400 } as const;
  const t = await lire(token, id, true);
  if (!t) return { erreur: 'Chantier introuvable', status: 404 } as const;
  if (t.parent || String(t?.list?.id || '') !== LISTES.planning) return { erreur: 'Ce n’est pas un chantier du Planning', status: 400 } as const;
  return { tache: t } as const;
}

// Saisies déjà faites sur un élément (photos « Pose · … », dernier commentaire de pose)
function photosDe(e: any): { etape: string; nom: string }[] {
  return (Array.isArray(e?.attachments) ? e.attachments : [])
    .map((a: any) => String(a?.title || ''))
    .filter((n: string) => n.startsWith('Pose · '))
    .map((n: string) => ({ nom: n, etape: Object.keys(ETAPES_PHOTO).find((k) => normal(n).includes(normal(ETAPES_PHOTO[k]))) || 'autre' }));
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Connexion requise : reconnecte-toi.' }, 401);
  try {
    const c = await chantierDuPlanning(token, new URL(request.url).searchParams.get('id') || '');
    if ('erreur' in c) return json({ error: c.erreur }, c.status);
    const t = c.tache;
    const scenarios = await scenariosDe(token, t);
    const lus = await Promise.all(scenarios.map((s: any) => lire(token, String(s.id), true)));
    const elements: any[] = [];
    for (const s of lus) {
      for (const e of Array.isArray(s?.subtasks) ? s.subtasks : []) {
        if (!e?.archived && String(e?.parent || '') === String(s.id)) elements.push(e);
      }
    }
    // Bornes, prises et coffrets : lus en entier (pièces jointes et n° de série)
    const aSaisir = (n: Nature | null) => n === 'borne' || n === 'priseRenforcee' || n === 'tdIrveCoffret';
    const complets = await Promise.all(elements.map((e) => (aSaisir(natureDe(e)) ? lire(token, String(e.id)) : Promise.resolve(null))));
    const sortie = elements.map((e, i) => {
      const n = natureDe(e);
      const plein = complets[i] || e;
      const serie = champ(plein, NUMERO_SERIE);
      return {
        id: String(e.id),
        nom: String(e.name || ''),
        nature: n || 'autre',
        libelleNature: n ? LIBELLE_NATURE[n] : 'Autre',
        aSaisir: aSaisir(n),
        numeroSerie: serie?.value ? String(serie.value) : '',
        champSerie: !!serie,
        photos: complets[i] ? photosDe(plein) : [],
      };
    });
    return json({
      chantier: {
        id: String(t.id),
        nom: String(t.name || ''),
        statut: String(t?.status?.status || ''),
        couleurStatut: String(t?.status?.color || ''),
        adresse: adresseDe(t),
        url: String(t.url || `https://app.clickup.com/t/${t.id}`),
        ecritureAutorisee: ecritureAutorisee(t),
      },
      scenarios: scenarios.map((s: any) => String(s.name || '')),
      elements: sortie,
      puissances: PUISSANCES,
      lu: Date.now(),
      preview: process.env.VERCEL_ENV !== 'production',
    });
  } catch (error) {
    console.error('Saisie à la pose (lecture) :', error);
    return json({ error: 'Lecture du chantier impossible' }, 500);
  }
}

// L'élément doit être sous un scénario du chantier (élément → scénario → chantier)
async function elementDuChantier(token: string, chantier: any, elementId: string): Promise<any | null> {
  if (!/^[a-z0-9]+$/i.test(elementId)) return null;
  const e = await lire(token, elementId);
  if (!e?.parent) return null;
  const s = await lire(token, String(e.parent));
  return s && String(s.parent || '') === String(chantier.id) ? e : null;
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Session expirée : reconnecte-toi, rien n’est perdu sur le téléphone.' }, 401);
  try {
    const multipart = (request.headers.get('content-type') || '').includes('multipart/form-data');
    const form = multipart ? await request.formData() : null;
    const corps = multipart ? null : await request.json().catch(() => ({}));
    const lireChamp = (k: string) => String((form ? form.get(k) : corps?.[k]) ?? '').trim();
    const cle = lireChamp('cle');
    if (!cleValide(cle)) return json({ error: 'Envoi sans clé valide' }, 400);

    const c = await chantierDuPlanning(token, lireChamp('chantierId'));
    if ('erreur' in c) return json({ error: c.erreur }, c.status);
    if (!ecritureAutorisee(c.tache)) return json({ error: 'En preview, seuls les chantiers « Test » sont modifiables' }, 403);
    const e = await elementDuChantier(token, c.tache, lireChamp('elementId'));
    if (!e) return json({ error: 'Cet élément n’appartient pas au chantier' }, 400);
    const nomElement = String(e.name || 'élément');

    if (form) {
      // Photo
      const fichier = form.get('fichier');
      const etape = ETAPES_PHOTO[lireChamp('etape')] ? lireChamp('etape') : 'autre';
      if (!(fichier instanceof File)) return json({ error: 'Photo absente' }, 400);
      if (fichier.size > 4 * 1024 * 1024) return json({ error: 'Photo trop lourde (4 Mo maximum)' }, 413);
      const deja = (Array.isArray(e?.attachments) ? e.attachments : []).some((a: any) => String(a?.title || '').includes(cle));
      if (deja) return json({ success: true, deja: true });
      const extension = (fichier.name.match(/\.[a-z0-9]+$/i) || ['.jpg'])[0];
      const envoi = new FormData();
      envoi.append('attachment', fichier, `Pose · ${nomElement} · ${ETAPES_PHOTO[etape]} · ${cle}${extension}`);
      const res = await fetch(`https://api.clickup.com/api/v2/task/${e.id}/attachment`, {
        method: 'POST', headers: { Authorization: token }, body: envoi, cache: 'no-store',
      });
      if (!res.ok) return json({ error: `ClickUp a refusé la photo (${res.status})` }, 502);
      return json({ success: true });
    }

    // Saisie : n° de série et puissance configurée
    const numeroSerie = lireChamp('numeroSerie').slice(0, 80);
    const puissance = lireChamp('puissance');
    if (!numeroSerie && !puissance) return json({ error: 'Rien à enregistrer' }, 400);
    if (puissance && !PUISSANCES.includes(puissance)) return json({ error: 'Puissance inconnue' }, 400);
    const resCom = await api(token, `/task/${e.id}/comment`);
    const commentaires: any[] = resCom.ok ? (await resCom.json().catch(() => ({})))?.comments || [] : [];
    if (commentaires.some((x: any) => String(x?.comment_text || '').includes(`réf. ${cle}`))) return json({ success: true, deja: true });

    const avertissements: string[] = [];
    if (numeroSerie) {
      if (champ(e, NUMERO_SERIE)) {
        const r = await api(token, `/task/${e.id}/field/${NUMERO_SERIE}`, 'POST', { value: numeroSerie });
        if (!r.ok) avertissements.push(`n° de série non écrit dans le champ (${r.status}), gardé dans le commentaire`);
      } else {
        avertissements.push('champ 🆔 Numéro de Série absent du Planning : n° gardé dans le commentaire');
      }
    }
    const quand = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date());
    const lignes = [
      `🔧 Saisie à la pose · ${nomElement} (${session.nom || 'installateur'}, ${quand})`,
      numeroSerie ? `🆔 N° de série : ${numeroSerie}` : '',
      puissance ? `⚡ Puissance configurée : ${puissance} kW` : '',
      avertissements.length ? `⚠️ ${avertissements.join(' ; ')}` : '',
      `réf. ${cle}`,
    ].filter(Boolean);
    const r = await api(token, `/task/${e.id}/comment`, 'POST', { comment_text: lignes.join('\n'), notify_all: false });
    if (!r.ok) return json({ error: `ClickUp a refusé l’enregistrement (${r.status})` }, 502);
    return json({ success: true, avertissements });
  } catch (error) {
    console.error('Saisie à la pose (écriture) :', error);
    return json({ error: 'Erreur serveur : nouvel essai automatique' }, 500);
  }
}
