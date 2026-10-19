import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { CHAMPS_INTERVENTION, LISTES, estAMoi } from '@/lib/espaces';
import { adresseDe } from '@/lib/vuesFiches';
import { PROTOCOLE, defauts, texteResultats, type Resultats } from '@/lib/protocoleMaintenance';

// Visite de maintenance (lot D, protocole Sefram MW9665 + A1532-XA décidé par Matthieu le 17/10/2026 à 14 h 50).
// GET ?id=<visite> : la visite (liste Maintenance 🛠️), la borne visitée (🔋 Borne visitée → Parc : modèle, nombre de
//   points de charge) et les points de charge déjà saisis.
// POST JSON { cle, chantierId: <visite>, elementId: 'pdc-<n>', resultats } : commentaire « 🔧 Visite de maintenance ·
//   PDC n » avec toutes les mesures, lisible par le chef de chantier et le back-office (aucun nouveau champ).
// POST multipart { cle, chantierId, elementId, etape, fichier } : photo en pièce jointe de la visite, nommée
//   « Maintenance · PDC n · <étape> ».
// Rejouable (file d'envoi hors ligne) : la clé est écrite dans le commentaire et le nom de la photo.
// Droits : l'installateur de la visite (👷 Technicien ou assigné), le chef de chantier, la direction.
// Preview : lecture réelle, écriture seulement sur les visites « Test … ».
// 18/10/2026, 21 h 29 (choix de Matthieu, après le test : la visite restait « rdv confirmé ») : quand tous les points de
//   charge de la borne ont leur compte rendu, une visite « à planifier » ou « rdv confirmé » passe en « réalisée ». La
//   suite reste celle de la liste (rapport à valider, rapport envoyé). Réponse : realisee = true si le statut a changé.

export const dynamic = 'force-dynamic';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c?.id === id);
const champNomme = (t: any, mot: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => normal(c?.name).includes(mot));
const ecritureAutorisee = (t: any) => process.env.VERCEL_ENV === 'production' || normal(t?.name).trim().startsWith('test');
const cleValide = (c: string) => /^[a-z0-9]{6,40}$/i.test(c);
const ETAPES_PHOTO: Record<string, string> = { visuel: 'contrôle visuel', synthese: 'synthèse MW9665', autre: 'photo' };
const STATUT_REALISEE = 'réalisée';

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}
async function lire(token: string, id: string): Promise<any | null> {
  const res = await api(token, `/task/${encodeURIComponent(id)}`);
  return res.ok ? res.json() : null;
}

// Borne visitée (Parc) et son nombre de points de charge (1 si non renseigné)
async function borneDe(token: string, t: any): Promise<{ borne: any | null; points: number }> {
  const liees: any[] = Array.isArray(champ(t, CHAMPS_INTERVENTION.borneVisitee)?.value) ? champ(t, CHAMPS_INTERVENTION.borneVisitee).value : [];
  const borne = liees[0]?.id ? await lire(token, String(liees[0].id)) : null;
  const nb = Number(champNomme(borne, 'nb points')?.value);
  return { borne, points: Number.isInteger(nb) && nb > 0 && nb <= 40 ? nb : 1 };
}
// Points de charge déjà saisis, d'après les commentaires de la visite
const pointsSaisis = (commentaires: any[]): number[] =>
  commentaires
    .map((c: any) => String(c?.comment_text || '').match(/^🔧 Visite de maintenance · PDC (\d+)/))
    .filter(Boolean)
    .map((m: any) => Number(m[1]))
    .filter((n: number, i: number, tab: number[]) => tab.indexOf(n) === i);

async function visiteAutorisee(token: string, id: string, session: any) {
  if (!/^[a-z0-9]+$/i.test(id)) return { erreur: 'Identifiant de visite invalide', status: 400 } as const;
  const t = await lire(token, id);
  if (!t) return { erreur: 'Visite introuvable', status: 404 } as const;
  if (String(t?.list?.id || '') !== LISTES.maintenance) return { erreur: 'Ce n’est pas une visite de maintenance', status: 400 } as const;
  const roles = await rolesDe(token, session.id);
  const moi = Number(session.id);
  const aMoi = estAMoi(t, CHAMPS_INTERVENTION.technicienVisite, moi) || estAMoi(t, null, moi);
  if (!roles.includes('direction') && !roles.includes('chargeOperation') && !aMoi) return { erreur: 'Cette visite ne t’est pas affectée.', status: 403 } as const;
  return { tache: t } as const;
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Connexion requise : reconnecte-toi.' }, 401);
  try {
    const v = await visiteAutorisee(token, new URL(request.url).searchParams.get('id') || '', session);
    if ('erreur' in v) return json({ error: v.erreur }, v.status);
    const t = v.tache;
    // Borne visitée (Parc) : nombre de points de charge et modèle
    const { borne, points } = await borneDe(token, t);
    const modele = borne ? String(champNomme(borne, 'modele')?.value ?? '') : '';
    // Points de charge déjà saisis (commentaires de visite)
    const resCom = await api(token, `/task/${t.id}/comment`);
    const commentaires: any[] = resCom.ok ? (await resCom.json().catch(() => ({})))?.comments || [] : [];
    const saisis = pointsSaisis(commentaires);
    return json({
      visite: {
        id: String(t.id),
        nom: String(t.name || ''),
        statut: String(t?.status?.status || ''),
        couleurStatut: String(t?.status?.color || ''),
        adresse: adresseDe(t) || (borne ? adresseDe(borne) : ''),
        url: String(t.url || `https://app.clickup.com/t/${t.id}`),
        ecritureAutorisee: ecritureAutorisee(t),
      },
      borne: borne ? { id: String(borne.id), nom: String(borne.name || ''), modele, lien: `/interne/fiches/${borne.id}` } : null,
      points,
      saisis,
      protocole: PROTOCOLE.length,
      preview: process.env.VERCEL_ENV !== 'production',
    });
  } catch (error) {
    console.error('Visite de maintenance (lecture) :', error);
    return json({ error: 'Lecture de la visite impossible' }, 500);
  }
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
    const v = await visiteAutorisee(token, lireChamp('chantierId'), session);
    if ('erreur' in v) return json({ error: v.erreur }, v.status);
    const t = v.tache;
    if (!ecritureAutorisee(t)) return json({ error: 'En preview, seules les visites « Test » sont modifiables' }, 403);
    const m = lireChamp('elementId').match(/^pdc-(\d{1,2})$/);
    if (!m) return json({ error: 'Point de charge inconnu' }, 400);
    const pdc = Number(m[1]);

    if (form) {
      const fichier = form.get('fichier');
      const etape = ETAPES_PHOTO[lireChamp('etape')] ? lireChamp('etape') : 'autre';
      if (!(fichier instanceof File)) return json({ error: 'Photo absente' }, 400);
      if (fichier.size > 4 * 1024 * 1024) return json({ error: 'Photo trop lourde (4 Mo maximum)' }, 413);
      const deja = (Array.isArray(t?.attachments) ? t.attachments : []).some((a: any) => String(a?.title || '').includes(cle));
      if (deja) return json({ success: true, deja: true });
      const extension = (fichier.name.match(/\.[a-z0-9]+$/i) || ['.jpg'])[0];
      const envoi = new FormData();
      envoi.append('attachment', fichier, `Maintenance · PDC ${pdc} · ${ETAPES_PHOTO[etape]} · ${cle}${extension}`);
      const res = await fetch(`https://api.clickup.com/api/v2/task/${t.id}/attachment`, { method: 'POST', headers: { Authorization: token }, body: envoi, cache: 'no-store' });
      if (!res.ok) return json({ error: `ClickUp a refusé la photo (${res.status})` }, 502);
      return json({ success: true });
    }

    let resultats: Resultats;
    try {
      const brut = JSON.parse(lireChamp('resultats') || '{}');
      const valeurs: Record<string, string> = {};
      for (const [k, val] of Object.entries(brut?.valeurs || {})) {
        if (/^[a-z0-9]+\.[a-z0-9]+$/i.test(k)) valeurs[k] = String(val ?? '').slice(0, 30);
      }
      resultats = { tri: !!brut?.tri, valeurs, remarque: String(brut?.remarque || '').slice(0, 1000) };
    } catch {
      return json({ error: 'Mesures illisibles' }, 400);
    }
    const resCom = await api(token, `/task/${t.id}/comment`);
    const commentaires: any[] = resCom.ok ? (await resCom.json().catch(() => ({})))?.comments || [] : [];
    if (commentaires.some((x: any) => String(x?.comment_text || '').includes(`réf. ${cle}`))) return json({ success: true, deja: true });
    const quand = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());
    const texte = [
      `🔧 Visite de maintenance · PDC ${pdc} (${session.nom || 'installateur'}, ${quand})`,
      texteResultats(resultats),
      `réf. ${cle}`,
    ].join('\n');
    const r = await api(token, `/task/${t.id}/comment`, 'POST', { comment_text: texte, notify_all: defauts(resultats).length > 0 });
    if (!r.ok) return json({ error: `ClickUp a refusé l’enregistrement (${r.status})` }, 502);

    // Tous les points de charge ont leur compte rendu : la visite passe en « réalisée » (21 h 29). Un échec ici
    // n'annule pas la saisie, déjà enregistrée.
    let realisee = false;
    const statut = normal(t?.status?.status);
    if (statut.includes('a planifier') || statut.includes('rdv confirme')) {
      try {
        const { points } = await borneDe(token, t);
        const saisis = pointsSaisis(commentaires).concat(pdc);
        const complets = Array.from({ length: points }, (_, i) => i + 1).every((n) => saisis.includes(n));
        if (complets) {
          const rs = await api(token, `/task/${t.id}`, 'PUT', { status: STATUT_REALISEE });
          realisee = rs.ok;
          if (!rs.ok) console.error('Visite de maintenance : statut « réalisée » refusé', rs.status);
        }
      } catch (e) {
        console.error('Visite de maintenance : passage en réalisée impossible', e);
      }
    }
    return json({ success: true, defauts: defauts(resultats), realisee });
  } catch (error) {
    console.error('Visite de maintenance (écriture) :', error);
    return json({ error: 'Erreur serveur : nouvel essai automatique' }, 500);
  }
}
