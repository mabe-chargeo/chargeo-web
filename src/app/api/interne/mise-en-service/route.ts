import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { LISTES } from '@/lib/espaces';
import { adresseDe } from '@/lib/vuesFiches';
import { appareilDe, defauts, etapesDe, texteResultats, type Resultats } from '@/lib/protocoleMaintenance';
import { ENTETE_MES, commentairesDe, etatMiseEnService, pointsDuChantier } from '@/lib/miseEnService';

// Mise en service à la réception (décision de Matthieu du 18/10/2026, 14 h 41), protocole Sefram MW9665.
// GET ?id=<chantier du Planning> : points à mesurer (bornes du scénario retenu, sinon TD IRVE) et ce qui est déjà mesuré.
// POST JSON { cle, chantierId, elementId, resultats } : commentaire « ⚡ Mise en service · <élément> » sur l'élément
//   (il suit la borne au Parc) et copie sur le chantier ; notification si un défaut est noté.
// POST multipart { cle, chantierId, elementId, etape, fichier } : photo en pièce jointe de l'élément.
// Rejouable (file d'envoi hors ligne) : la clé est écrite dans le commentaire et le nom de la photo.
// Preview : écriture seulement sur les chantiers « Test … ».

export const dynamic = 'force-dynamic';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const ecritureAutorisee = (t: any) => process.env.VERCEL_ENV === 'production' || normal(t?.name).trim().startsWith('test');
const cleValide = (c: string) => /^[a-z0-9]{6,40}$/i.test(c);
const ETAPES_PHOTO: Record<string, string> = { visuel: 'contrôle visuel', synthese: 'synthèse MW9665', autre: 'photo' };

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
async function chantierDuPlanning(token: string, id: string) {
  if (!/^[a-z0-9]+$/i.test(id)) return { erreur: 'Identifiant de chantier invalide', status: 400 } as const;
  const t = await lire(token, id, true);
  if (!t) return { erreur: 'Chantier introuvable', status: 404 } as const;
  if (t.parent || String(t?.list?.id || '') !== LISTES.planning) return { erreur: 'Ce n’est pas un chantier du Planning', status: 400 } as const;
  return { tache: t } as const;
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
    const points = await etatMiseEnService(token, String(t.id), Array.isArray(t.subtasks) ? t.subtasks : []);
    return json({
      chantier: {
        id: String(t.id),
        nom: String(t.name || ''),
        statut: String(t?.status?.status || ''),
        adresse: adresseDe(t),
        ecritureAutorisee: ecritureAutorisee(t),
      },
      points,
      preview: process.env.VERCEL_ENV !== 'production',
    });
  } catch (error) {
    console.error('Mise en service (lecture) :', error);
    return json({ error: 'Lecture du chantier impossible' }, 500);
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
    const c = await chantierDuPlanning(token, lireChamp('chantierId'));
    if ('erreur' in c) return json({ error: c.erreur }, c.status);
    const t = c.tache;
    if (!ecritureAutorisee(t)) return json({ error: 'En preview, seuls les chantiers « Test » sont modifiables' }, 403);
    const points = await pointsDuChantier(token, String(t.id), Array.isArray(t.subtasks) ? t.subtasks : []);
    const p = points.find((x) => x.id === lireChamp('elementId'));
    if (!p) return json({ error: 'Cet élément n’est pas à mettre en service sur ce chantier' }, 400);

    if (form) {
      const fichier = form.get('fichier');
      const etape = ETAPES_PHOTO[lireChamp('etape')] ? lireChamp('etape') : 'autre';
      if (!(fichier instanceof File)) return json({ error: 'Photo absente' }, 400);
      if (fichier.size > 4 * 1024 * 1024) return json({ error: 'Photo trop lourde (4 Mo maximum)' }, 413);
      const e = await lire(token, p.id);
      const deja = (Array.isArray(e?.attachments) ? e.attachments : []).some((a: any) => String(a?.title || '').includes(cle));
      if (deja) return json({ success: true, deja: true });
      const extension = (fichier.name.match(/\.[a-z0-9]+$/i) || ['.jpg'])[0];
      const envoi = new FormData();
      envoi.append('attachment', fichier, `Mise en service · ${p.nom} · ${ETAPES_PHOTO[etape]} · ${cle}${extension}`);
      const res = await fetch(`https://api.clickup.com/api/v2/task/${p.id}/attachment`, { method: 'POST', headers: { Authorization: token }, body: envoi, cache: 'no-store' });
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
    const deja = (await commentairesDe(token, p.id)).some((x: any) => String(x?.comment_text || '').includes(`réf. ${cle}`));
    if (deja) return json({ success: true, deja: true });
    const etapes = etapesDe(p.mode);
    const d = defauts(resultats, etapes);
    const quand = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());
    const texte = [
      `${ENTETE_MES} ${p.nom} (${session.nom || 'installateur'}, ${quand})`,
      texteResultats(resultats, etapes, appareilDe(p.mode)),
      `réf. ${cle}`,
    ].join('\n');
    const r = await api(token, `/task/${p.id}/comment`, 'POST', { comment_text: texte, notify_all: false });
    if (!r.ok) return json({ error: `ClickUp a refusé l’enregistrement (${r.status})` }, 502);
    await api(token, `/task/${t.id}/comment`, 'POST', { comment_text: texte, notify_all: d.length > 0 }).catch(() => null);
    return json({ success: true, defauts: d });
  } catch (error) {
    console.error('Mise en service (écriture) :', error);
    return json({ error: 'Erreur serveur : nouvel essai automatique' }, 500);
  }
}
