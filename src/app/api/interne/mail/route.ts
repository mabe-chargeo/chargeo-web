import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe, type Role } from '@/lib/roles';
import { CHAMPS } from '@/lib/champsClickUp';
import { EXPEDITEUR, MAX_DESTINATAIRES, adressesValides, enPreversion, envoyerMail, estEmail, expediteur, mailBranche, type Expediteur } from '@/lib/mails';

// Écrire un mail depuis l'appli (Phase 9, lot 1, 05/11/2026 ; envoi : src/lib/mails.ts).
// GET ?fiche=<id> : nom de la fiche, 📧 Email du passeport, nom d'envoi et signature Gmail de contact@chargeo.fr,
// branchement, préversion et droits.
// POST { ficheId, a, cc, objet, texte } : le mail relu par la personne connectée part de contact@chargeo.fr, signature
// Gmail ajoutée sous le texte, puis une copie est postée en commentaire sur la fiche (décision du 04/11, 21 h 58).
// Jamais d'envoi automatique : seul le clic « Envoyer » appelle cette route.
// Préversion : le mail part seulement à l'adresse ClickUp de la personne connectée, avec [TEST] dans l'objet et les
// destinataires prévus en tête du texte. Aucun client ne le reçoit.
// Droits : direction, commercial, chargé d'opération et back-office ; l'installateur seul n'envoie pas.
// Mail parti mais copie refusée par ClickUp : succès avec un avertissement (jamais un échec, le mail est bien parti).
export const dynamic = 'force-dynamic';

const PEUVENT: Role[] = ['direction', 'commercial', 'chargeOperation', 'backOffice'];
const MAX_OBJET = 200;
const MAX_TEXTE = 20000;
const MAX_COPIE = 9000;

const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const texte = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());
const valeur = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c?.id === id)?.value;

async function lireTache(token: string, id: string): Promise<any | null> {
  if (!id || !/^[a-z0-9]+$/i.test(id)) return null;
  const r = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(id)}`, { headers: { Authorization: token }, cache: 'no-store' });
  return r.ok ? r.json().catch(() => null) : null;
}

async function acces(request: Request) {
  const session = await sessionDeRequete(request);
  if (!session) return { erreur: json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401) } as const;
  const token = process.env.CLICKUP_API_KEY as string;
  if (!token) return { erreur: json({ success: false, error: 'Configuration serveur incomplète' }, 500) } as const;
  const roles = await rolesDe(token, session.id);
  return { session, token, peut: roles.some((r) => PEUVENT.includes(r)) } as const;
}

export async function GET(request: Request) {
  try {
    const a = await acces(request);
    if ('erreur' in a) return a.erreur;
    const id = new URL(request.url).searchParams.get('fiche') || '';
    const tache = await lireTache(a.token, id);
    if (!tache) return json({ success: false, error: 'Fiche introuvable' }, 404);
    const email = texte(valeur(tache, CHAMPS.email));
    const exp = await expediteur();
    return json({
      success: true,
      branche: mailBranche(),
      preview: enPreversion(),
      expediteur: EXPEDITEUR,
      nomExpediteur: exp.nom,
      signature: exp.signatureHtml ? { html: exp.signatureHtml, texte: exp.signatureTexte } : null,
      signatureProbleme: exp.probleme || '',
      moi: texte(a.session.email),
      nom: texte(a.session.nom),
      peutEnvoyer: a.peut,
      fiche: { id: String(tache.id), nom: texte(tache.name), email: estEmail(email) ? email : '' },
    });
  } catch (e) {
    console.error('Mail (lecture)', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const a = await acces(request);
    if ('erreur' in a) return a.erreur;
    if (!a.peut) return json({ success: false, error: 'Envoi réservé à la direction, au commercial, au chargé d’opération et au back-office.' }, 403);
    if (!mailBranche()) return json({ success: false, error: 'Envoi des mails pas encore branché (clé Google absente dans Vercel). Rien n’est parti.' }, 503);
    const corps = await request.json().catch(() => ({}));
    const tache = await lireTache(a.token, texte(corps?.ficheId));
    if (!tache) return json({ success: false, error: 'Fiche introuvable. Rien n’est parti.' }, 404);

    const objet = texte(corps?.objet).replace(/[\r\n]+/g, ' ');
    const message = String(corps?.texte ?? '').replace(/\s+$/, '');
    if (!objet) return json({ success: false, error: 'Objet vide. Rien n’est parti.' }, 400);
    if (objet.length > MAX_OBJET) return json({ success: false, error: `Objet trop long (${MAX_OBJET} caractères au plus).` }, 400);
    if (!message.trim()) return json({ success: false, error: 'Message vide. Rien n’est parti.' }, 400);
    if (message.length > MAX_TEXTE) return json({ success: false, error: 'Message trop long.' }, 400);
    const dest = adressesValides(corps?.a);
    const copie = adressesValides(corps?.cc);
    const refusees = [...dest.refusees, ...copie.refusees];
    if (refusees.length) return json({ success: false, error: `Adresse mal écrite : ${refusees.join(', ')}. Rien n’est parti.` }, 400);
    if (!dest.ok.length) return json({ success: false, error: 'Aucun destinataire. Rien n’est parti.' }, 400);
    const cc = copie.ok.filter((x) => !dest.ok.includes(x));
    if (dest.ok.length + cc.length > MAX_DESTINATAIRES) return json({ success: false, error: `${MAX_DESTINATAIRES} destinataires au plus.` }, 400);

    // Préversion : seulement la personne connectée
    const preview = enPreversion();
    const moi = texte(a.session.email).toLowerCase();
    if (preview && !estEmail(moi)) return json({ success: false, error: 'Préversion : ton adresse ClickUp est introuvable, le mail de test ne peut pas partir.' }, 400);
    const prevus = `À : ${dest.ok.join(', ')}${cc.length ? ` · Cc : ${cc.join(', ')}` : ''}`;
    const envoi = preview
      ? { a: [moi], cc: [] as string[], objet: `[TEST] ${objet}`, texte: `⚠️ Mail de test (préversion de l'appli). En production, il partirait ainsi : ${prevus}\n\n${message}` }
      : { a: dest.ok, cc, objet, texte: message };

    let exp: Expediteur;
    try {
      exp = (await envoyerMail(envoi)).exp;
    } catch (e: any) {
      console.error('Mail (envoi)', e);
      return json({ success: false, error: `Mail non envoyé : ${e?.message || 'erreur Google'}. Rien n’est parti.` }, 502);
    }

    // Copie sur la fiche
    const quand = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });
    const lignes = [
      `✉️ Mail envoyé depuis l'appli par ${texte(a.session.nom) || 'l’équipe'} · ${quand}`,
      `De : ${exp.nom} <${EXPEDITEUR}>`,
      `À : ${dest.ok.join(', ')}`,
      ...(cc.length ? [`Cc : ${cc.join(', ')}`] : []),
      `Objet : ${objet}`,
      ...(preview ? [`Préversion : mail de test envoyé seulement à ${moi}, aucun client ne l'a reçu.`] : []),
      '',
      message.length > MAX_COPIE ? `${message.slice(0, MAX_COPIE)}\n[… texte coupé dans la copie]` : message,
      ...(exp.signatureTexte ? ['', exp.signatureTexte] : exp.signatureHtml ? [] : ['', `(Parti sans signature : ${exp.probleme || 'signature Gmail introuvable'}.)`]),
    ];
    let avertissement: string | undefined;
    try {
      const r = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(String(tache.id))}/comment`, {
        method: 'POST',
        headers: { Authorization: a.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_text: lignes.join('\n'), notify_all: false }),
      });
      if (!r.ok) avertissement = `Mail envoyé, mais la copie sur la fiche a été refusée par ClickUp (${r.status}) : colle-la à la main.`;
    } catch {
      avertissement = 'Mail envoyé, mais la copie sur la fiche n’a pas pu être postée : colle-la à la main.';
    }
    return json({ success: true, preview, envoyeA: envoi.a, avertissement });
  } catch (e) {
    console.error('Mail', e);
    return json({ success: false, error: 'Erreur serveur. Vérifie dans Gmail (contact@chargeo.fr, Envoyés) avant de renvoyer.' }, 500);
  }
}
