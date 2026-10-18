import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { LISTES } from '@/lib/espaces';
import { rolesDe } from '@/lib/roles';
import { lireJpeg } from '@/lib/pdfCharte';
import { etatPv, genererPv } from '@/lib/pvReception';

// PV de réception signé au doigt (décisions de Matthieu du 18/10/2026, 16 h 02 et 16 h 04).
// GET ?id=<chantier du Planning> : ce que le PV va contenir et ce qui bloque encore la signature.
// POST JSON { cle, chantierId, signataire, qualite, technicien, signatureClient, signatureTechnicien, motif } :
//   signatures en JPEG base64 (canvas du téléphone). Génère le PDF, le dépose dans 📂 PV Réception et laisse un
//   commentaire « 📂 PV de réception signé dans l'appli … » (avec la clé : rejouer la file d'envoi ne crée pas de doublon).
//   PV déjà signé et envoyé (✅ réalisé) : seul le chef de chantier (ou la direction) refait signer, avec un motif gardé en
//   commentaire « ✏️ Correction après signature du PV » (règle du 17/10, 15 h 34).
// Preview : écriture seulement sur les chantiers « Test … ».

export const dynamic = 'force-dynamic';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const ecritureAutorisee = (t: any) => process.env.VERCEL_ENV === 'production' || normal(t?.name).trim().startsWith('test');
const cleValide = (c: string) => /^[a-z0-9]{6,40}$/i.test(c);
const TAILLE_MAX = 600 * 1024;

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}
async function chantierDuPlanning(token: string, id: string) {
  if (!/^[a-z0-9]+$/i.test(id)) return { erreur: 'Identifiant de chantier invalide', status: 400 } as const;
  const res = await api(token, `/task/${encodeURIComponent(id)}?include_subtasks=true`);
  const t = res.ok ? await res.json().catch(() => null) : null;
  if (!t) return { erreur: 'Chantier introuvable', status: 404 } as const;
  if (t.parent || String(t?.list?.id || '') !== LISTES.planning) return { erreur: 'Ce n’est pas un chantier du Planning', status: 400 } as const;
  return { tache: t } as const;
}
function image(b64: string) {
  const brut = String(b64 || '').replace(/^data:image\/jpe?g;base64,/, '');
  if (!brut || brut.length > TAILLE_MAX * 1.4) return null;
  try { return lireJpeg(new Uint8Array(Buffer.from(brut, 'base64'))); } catch { return null; }
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
    const pv = await etatPv(token, t);
    return json({
      chantier: { id: String(t.id), nom: String(t.name || ''), statut: String(t?.status?.status || ''), ecritureAutorisee: ecritureAutorisee(t) },
      pv,
      technicienParDefaut: pv.techniciens[0] || String(session.nom || ''),
      preview: process.env.VERCEL_ENV !== 'production',
    });
  } catch (error) {
    console.error('PV (lecture) :', error);
    return json({ error: 'Lecture du chantier impossible' }, 500);
  }
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Session expirée : reconnecte-toi, le PV reste sur le téléphone.' }, 401);
  try {
    const corps = await request.json().catch(() => ({}));
    const lireChamp = (k: string) => String(corps?.[k] ?? '').trim();
    const cle = lireChamp('cle');
    if (!cleValide(cle)) return json({ error: 'Envoi sans clé valide' }, 400);
    const c = await chantierDuPlanning(token, lireChamp('chantierId'));
    if ('erreur' in c) return json({ error: c.erreur }, c.status);
    const t = c.tache;
    if (!ecritureAutorisee(t)) return json({ error: 'En preview, seuls les chantiers « Test » sont modifiables' }, 403);

    const commentaires = await api(token, `/task/${t.id}/comment`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    if ((commentaires?.comments || []).some((x: any) => String(x?.comment_text || '').includes(`réf. ${cle}`))) return json({ success: true, deja: true });

    const e = await etatPv(token, t);
    if (e.blocages.length) return json({ error: `PV pas encore signable : ${e.blocages.join(' ; ')}` }, 409);

    const motif = lireChamp('motif');
    let correcteur: string | null = null;
    if (e.verrouille) {
      const roles = await rolesDe(token, session.id);
      if (!roles.includes('chargeOperation') && !roles.includes('direction')) {
        return json({ error: '🔒 PV signé et envoyé : seul le chef de chantier peut le refaire signer.' }, 403);
      }
      if (motif.length < 5) return json({ error: 'PV déjà signé : indique le motif de la correction.' }, 400);
      correcteur = String(session.nom || 'chef de chantier');
    }

    const signataire = lireChamp('signataire').slice(0, 80);
    const qualite = lireChamp('qualite').slice(0, 80);
    const technicien = (lireChamp('technicien') || String(session.nom || '')).slice(0, 80);
    if (signataire.length < 2 || qualite.length < 2) return json({ error: 'Il faut le nom et la qualité du signataire.' }, 400);
    const sigClient = image(lireChamp('signatureClient'));
    const sigTech = image(lireChamp('signatureTechnicien'));
    if (!sigClient || !sigTech) return json({ error: 'Signature illisible : fais signer à nouveau.' }, 400);

    const g = await genererPv(token, t, e, { signataire, qualite, technicien, client: sigClient, tech: sigTech });
    if (!g.ok) return json({ error: `PV non créé : ${g.erreur}` }, 502);

    const reserves = e.reserves.length ? `${e.reserves.length} réserve${e.reserves.length > 1 ? 's' : ''} mineure${e.reserves.length > 1 ? 's' : ''}` : 'sans réserve';
    await api(token, `/task/${t.id}/comment`, 'POST', {
      comment_text: `📂 PV de réception signé dans l’appli par ${signataire} (${qualite}) et ${technicien}, le ${g.quand}, ${reserves} : ${g.nom}.\nréf. ${cle}`,
      notify_all: false,
    }).catch(() => null);
    if (correcteur) {
      await api(token, `/task/${t.id}/comment`, 'POST', {
        comment_text: `✏️ Correction après signature du PV : PV refait et signé à nouveau dans l’appli (« ${g.nom} »), l’ancien reste dans le champ. Motif : ${motif.slice(0, 500)}. Par ${correcteur}, le ${g.quand}.`,
        notify_all: false,
      }).catch(() => null);
    }
    return json({ success: true, nom: g.nom });
  } catch (error) {
    console.error('PV (écriture) :', error);
    return json({ error: 'Erreur serveur : nouvel essai automatique' }, 500);
  }
}
