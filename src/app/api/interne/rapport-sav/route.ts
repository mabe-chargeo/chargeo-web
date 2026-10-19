import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { LISTES, estAMoi } from '@/lib/espaces';
import { rolesDe } from '@/lib/roles';
import { lireJpeg } from '@/lib/pdfCharte';
import { alerter } from '@/lib/alerteSite';
import { CAUSES, PRISES_EN_CHARGE, RESULTATS, etatTicket, genererRapportSav, type Resultat } from '@/lib/rapportSav';

// Rapport d'intervention SAV signé au doigt (maquette validée par Matthieu le 18/10/2026 à 22 h 15).
// GET ?id=<ticket SAV> : ce que le rapport reprend du ticket (installation du Parc, adresse, demande du client, sévérité,
//   panne, PDC, date du dépannage, techniciens) et les choix de l'écran.
// POST JSON { cle, chantierId (= le ticket), constat, cause, travaux, pieces (JSON [{ designation, quantite }]), essai
//   ('ok' | 'pas-ok'), priseEnCharge, resultat ('resolu' | 'piece' | 'revenir'), signataire, technicien,
//   signatureClient, signatureTechnicien } (file d'envoi hors ligne, src/lib/fileEnvoi.ts). Génère le PDF, le dépose dans
//   📄 Rapport d'intervention, laisse un commentaire « 🛠️ Rapport d'intervention signé… » avec la clé (rejouer la file
//   ne crée pas de doublon), puis selon le résultat :
//   - Problème résolu : ticket en ✅ problème résolu ; l'installation repasse en 🟢 EN SERVICE au Parc par la synchro
//     existante (src/lib/syncSavParc.ts), sauf si un autre ticket la concerne encore.
//   - Pièce à commander : ticket en 📦 attente pièce sav, alerte avec les pièces (📣 Alerte site, relayée à l'équipe).
//   - À revenir : ticket laissé ouvert, alerte « dépannage à recaler ».
//   - Prise en charge « À facturer » : alerte pour faire la facture dans Costructor.
// Droits : direction, chef de chantier, ou l'installateur assigné au ticket. Preview : tickets « Test » seulement.

export const dynamic = 'force-dynamic';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const estTest = (nom: unknown) => /^(sav\s*-\s*)?test/.test(normal(nom).trim());
const ecritureAutorisee = (t: any) => process.env.VERCEL_ENV === 'production' || estTest(t?.name);
const cleValide = (c: string) => /^[a-z0-9]{6,40}$/i.test(c);
const TAILLE_MAX = 600 * 1024;
const MARQUE = '🛠️ Rapport d’intervention signé';

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}
async function ticketSav(token: string, id: string) {
  if (!/^[a-z0-9]+$/i.test(id)) return { erreur: 'Identifiant de ticket invalide', status: 400 } as const;
  const res = await api(token, `/task/${encodeURIComponent(id)}`);
  const t = res.ok ? await res.json().catch(() => null) : null;
  if (!t) return { erreur: 'Ticket introuvable', status: 404 } as const;
  if (t.parent || String(t?.list?.id || '') !== LISTES.sav) return { erreur: 'Ce n’est pas un ticket SAV', status: 400 } as const;
  return { tache: t } as const;
}
// Direction, chef de chantier, ou installateur assigné au ticket
async function peutFaire(token: string, session: { id: number }, t: any): Promise<boolean> {
  const roles: string[] = await rolesDe(token, session.id);
  if (roles.includes('direction') || roles.includes('chargeOperation')) return true;
  return roles.includes('poseur') && estAMoi(t, null, Number(session.id));
}
function image(b64: string) {
  const brut = String(b64 || '').replace(/^data:image\/jpe?g;base64,/, '');
  if (!brut || brut.length > TAILLE_MAX * 1.4) return null;
  try { return lireJpeg(new Uint8Array(Buffer.from(brut, 'base64'))); } catch { return null; }
}
function pieces(brut: string): { designation: string; quantite: string }[] {
  try {
    const l = JSON.parse(brut || '[]');
    return (Array.isArray(l) ? l : [])
      .map((p: any) => ({ designation: String(p?.designation ?? '').trim().slice(0, 120), quantite: String(p?.quantite ?? '1').trim().slice(0, 10) || '1' }))
      .filter((p) => p.designation.length > 0)
      .slice(0, 20);
  } catch {
    return [];
  }
}
// Statut de la liste Tickets SAV dont le nom contient ce mot (nom exact avec son emoji)
async function statutSav(token: string, mot: string): Promise<string | null> {
  const res = await api(token, `/list/${LISTES.sav}`);
  const l = res.ok ? await res.json().catch(() => null) : null;
  const s = (Array.isArray(l?.statuses) ? l.statuses : []).find((x: any) => normal(x?.status).includes(mot));
  return s ? String(s.status) : null;
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Connexion requise : reconnecte-toi.' }, 401);
  try {
    const c = await ticketSav(token, new URL(request.url).searchParams.get('id') || '');
    if ('erreur' in c) return json({ error: c.erreur }, c.status);
    const t = c.tache;
    if (!(await peutFaire(token, session, t))) return json({ error: 'Le rapport d’intervention est réservé au technicien du ticket et au chef de chantier.' }, 403);
    const ticket = await etatTicket(token, t);
    return json({
      ticket: { id: String(t.id), ...ticket, ecritureAutorisee: ecritureAutorisee(t) },
      causes: CAUSES,
      prisesEnCharge: PRISES_EN_CHARGE,
      resultats: RESULTATS,
      technicienParDefaut: String(session.nom || ticket.techniciens[0] || ''),
      preview: process.env.VERCEL_ENV !== 'production',
    });
  } catch (error) {
    console.error('Rapport SAV (lecture) :', error);
    return json({ error: 'Lecture du ticket impossible' }, 500);
  }
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Session expirée : reconnecte-toi, le rapport reste sur le téléphone.' }, 401);
  try {
    const corps = await request.json().catch(() => ({}));
    const lire = (k: string, max = 2000) => String(corps?.[k] ?? '').trim().slice(0, max);
    const cle = lire('cle', 60);
    if (!cleValide(cle)) return json({ error: 'Envoi sans clé valide' }, 400);
    const c = await ticketSav(token, lire('chantierId', 30));
    if ('erreur' in c) return json({ error: c.erreur }, c.status);
    const t = c.tache;
    if (!ecritureAutorisee(t)) return json({ error: 'En preview, seuls les tickets « Test » sont modifiables' }, 403);
    if (!(await peutFaire(token, session, t))) return json({ error: 'Le rapport d’intervention est réservé au technicien du ticket et au chef de chantier.' }, 403);

    // Déjà reçu (file rejouée) : rien de plus
    const commentaires: any = await api(token, `/task/${t.id}/comment`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    if ((commentaires?.comments || []).some((x: any) => String(x?.comment_text || '').includes(`réf. ${cle}`))) return json({ success: true, deja: true });

    const e = await etatTicket(token, t);
    if (e.ferme) return json({ error: 'Ce ticket est déjà résolu ou archivé.' }, 409);

    const constat = lire('constat');
    const travaux = lire('travaux');
    const cause = lire('cause', 80);
    const priseEnCharge = lire('priseEnCharge', 80);
    const resultat = lire('resultat', 20) as Resultat;
    const essai = lire('essai', 10);
    if (constat.length < 3) return json({ error: 'Décris le constat sur place.' }, 400);
    if (travaux.length < 3) return json({ error: 'Décris les travaux réalisés.' }, 400);
    if (!CAUSES.includes(cause)) return json({ error: 'Choisis la cause.' }, 400);
    if (!PRISES_EN_CHARGE.includes(priseEnCharge)) return json({ error: 'Choisis la prise en charge.' }, 400);
    if (!(resultat in RESULTATS)) return json({ error: 'Choisis le résultat.' }, 400);
    if (essai !== 'ok' && essai !== 'pas-ok') return json({ error: 'Indique le résultat de l’essai de charge.' }, 400);
    if (resultat === 'resolu' && essai !== 'ok') return json({ error: 'Essai de charge pas conforme : le problème n’est pas résolu.' }, 400);
    const liste = pieces(lire('pieces', 5000));
    if (resultat === 'piece' && !liste.length) return json({ error: 'Indique la pièce à commander.' }, 400);
    const signataire = lire('signataire', 80);
    const technicien = (lire('technicien', 80) || String(session.nom || '')).slice(0, 80);
    if (signataire.length < 2) return json({ error: 'Il faut le nom du client présent.' }, 400);
    if (technicien.length < 2) return json({ error: 'Il faut le nom du technicien.' }, 400);
    const sigClient = image(lire('signatureClient', TAILLE_MAX * 2));
    const sigTech = image(lire('signatureTechnicien', TAILLE_MAX * 2));
    if (!sigClient || !sigTech) return json({ error: 'Signature illisible : fais signer à nouveau.' }, 400);

    const g = await genererRapportSav(token, t, e, {
      constat, cause, travaux, pieces: liste, essaiOk: essai === 'ok', priseEnCharge, resultat, signataire, technicien, client: sigClient, tech: sigTech,
    });
    if (!g.ok) return json({ error: `Rapport non créé : ${g.erreur}` }, 502);

    // Trace (la clé évite le doublon si la file rejoue l'envoi)
    const textePieces = liste.map((p) => `${p.designation} x ${p.quantite}`).join(', ');
    await api(token, `/task/${t.id}/comment`, 'POST', {
      comment_text: [
        `${MARQUE} dans l’appli par ${signataire} et ${technicien}, le ${g.quand} : ${g.nom}.`,
        `Résultat : ${RESULTATS[resultat]} · Cause : ${cause} · Prise en charge : ${priseEnCharge}${textePieces ? ` · Pièces : ${textePieces}` : ''}.`,
        `réf. ${cle}`,
      ].join('\n'),
      notify_all: false,
    }).catch(() => null);

    // Statut du ticket selon le résultat
    let statut: string | null = null;
    let statutOk = true;
    if (resultat !== 'revenir') {
      statut = await statutSav(token, resultat === 'resolu' ? 'resolu' : 'attente piece');
      if (statut) {
        const maj = await api(token, `/task/${t.id}`, 'PUT', { status: statut });
        statutOk = maj.ok;
      } else statutOk = false;
    }

    // Une seule alerte (le relais de l'espace ne garde que la dernière valeur du champ)
    const alertes: string[] = [];
    if (resultat === 'piece') alertes.push(`📦 Pièce à commander pour « ${e.installation?.nom || e.nom} » : ${textePieces}. Commande à passer, puis recaler le dépannage.`);
    if (resultat === 'revenir') alertes.push(`🔁 Dépannage à recaler pour « ${e.installation?.nom || e.nom} » : intervention pas terminée (voir le rapport ${g.nom}).`);
    if (priseEnCharge === 'À facturer') alertes.push(`💶 Intervention SAV à facturer : « ${e.installation?.nom || e.nom} », rapport ${g.nom}. Faire la facture dans Costructor.`);
    if (!statutOk) alertes.push(`⚠️ Rapport créé, mais le ticket n’a pas pu passer en ${resultat === 'resolu' ? '✅ problème résolu' : '📦 attente pièce sav'} : fais-le à la main.`);
    if (alertes.length) await alerter(token, String(t.id), alertes.join(' · '));

    return json({ success: true, nom: g.nom, resultat, statut: statutOk ? statut : null });
  } catch (error) {
    console.error('Rapport SAV (écriture) :', error);
    return json({ error: 'Erreur serveur : nouvel essai automatique' }, 500);
  }
}
