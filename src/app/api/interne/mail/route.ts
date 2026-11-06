import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe, type Role } from '@/lib/roles';
import { CHAMPS, OPTIONS, indexMenu } from '@/lib/champsClickUp';
import { adresseDe, dateVisiteDe, normal } from '@/lib/vuesFiches';
import { CONTACT_SUR_PLACE, GESTIONNAIRE, personnesLiees } from '@/lib/contactsFiche';
import { modeleDe, nettoyerAdresse, remplir, villeDe, type Donnees } from '@/lib/modelesMails';
import { effacerMailAFaire, mailAFaire, regle } from '@/lib/mailsAFaire';
import {
  EXPEDITEUR,
  MAX_DESTINATAIRES,
  adressesValides,
  enPreversion,
  envoyerMail,
  estEmail,
  expediteur,
  filsAvec,
  mailBranche,
  mailPourReponse,
  type Expediteur,
  type Fil,
} from '@/lib/mails';

// Écrire un mail depuis l'appli (Phase 9, lot 1, 05/11/2026 ; envoi : src/lib/mails.ts ; écran :
// src/components/ui/EcrireMail.tsx).
// GET ?fiche=<id> : nom de la fiche, 📧 Email du passeport, nom d'envoi et signature Gmail de contact@chargeo.fr,
// branchement, préversion et droits.
// POST { ficheId, a, cc, objet, texte, filId?, modele? } : le mail relu par la personne connectée part de
// contact@chargeo.fr, signature Gmail ajoutée sous le texte, puis une copie est postée en commentaire sur la fiche
// (décision du 04/11, 21 h 58). Jamais d'envoi automatique : seul le clic « Envoyer » appelle cette route.
// Lot 2 (05/11/2026, décisions de Mathieu à 20 h 57 et 21 h 22) : GET renvoie aussi les données de la fiche qui
// remplissent les textes (src/lib/modelesMails.ts) et les derniers fils échangés avec ses adresses ; POST refuse un mail
// où il reste un « [ » et répond dans le fil choisi (filId, relu dans Gmail avant l'envoi).
// Mails obligatoires (décision de Mathieu du 05/11 de 21 h 56 à 21 h 58, src/lib/mailsAFaire.ts) : GET renvoie le mail
// en attente (aFaire) ; un envoi avec l'un des textes qui le règlent l'efface ; POST { ficheId, action: 'telephone',
// phrase } note « Prévenu par téléphone » sur la fiche et l'efface, seulement quand la fiche n'a pas d'adresse pour ce
// mail.
// Préversion : le mail part seulement à l'adresse ClickUp de la personne connectée, avec [TEST] dans l'objet et les
// destinataires prévus en tête du texte. Aucun client ne le reçoit. La réponse dans le fil et l'effacement du mail
// obligatoire n'y sont faits que sur une fiche de test (« Test » dans le nom).
// Droits : direction, commercial, chargé d'opération et back-office ; l'installateur seul n'envoie pas.
// Mail parti mais copie refusée par ClickUp : succès avec un avertissement (jamais un échec, le mail est bien parti).
export const dynamic = 'force-dynamic';

const PEUVENT: Role[] = ['direction', 'commercial', 'chargeOperation', 'backOffice'];
const MAX_OBJET = 200;
const MAX_TEXTE = 20000;
const MAX_COPIE = 9000;

const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const texte = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());
const champs = (t: any): any[] => (Array.isArray(t?.custom_fields) ? t.custom_fields : []);
const valeur = (t: any, id: string) => champs(t).find((c: any) => c?.id === id)?.value;
const ficheDeTest = (t: any) => /\btest\b/i.test(String(t?.name || ''));
const maintenantParis = () => new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });

async function lireTache(token: string, id: string): Promise<any | null> {
  if (!id || !/^[a-z0-9]+$/i.test(id)) return null;
  const r = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(id)}`, { headers: { Authorization: token }, cache: 'no-store' });
  return r.ok ? r.json().catch(() => null) : null;
}

async function commenter(token: string, id: string, contenu: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(id)}/comment`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_text: contenu, notify_all: false }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function acces(request: Request) {
  const session = await sessionDeRequete(request);
  if (!session) return { erreur: json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401) } as const;
  const token = process.env.CLICKUP_API_KEY as string;
  if (!token) return { erreur: json({ success: false, error: 'Configuration serveur incomplète' }, 500) } as const;
  const roles = await rolesDe(token, session.id);
  return { session, token, peut: roles.some((r) => PEUVENT.includes(r)) } as const;
}

// Champ lu par son nom (⏳ Durée relevé et 🔑 Accès site n'ont pas le même identifiant sur Qualification et sur TEST)
function parNom(t: any, morceau: string): string {
  const f = champs(t).find((c: any) => normal(c?.name).includes(morceau));
  const v = f?.value;
  if (!f || v === undefined || v === null || v === '') return '';
  if (f.type === 'drop_down') {
    const o = (Array.isArray(f?.type_config?.options) ? f.type_config.options : []).find((x: any) => x?.id === v || Number(x?.orderindex) === Number(v));
    return texte(o?.name);
  }
  return typeof v === 'string' || typeof v === 'number' ? texte(v) : '';
}

// Ce que la fiche sait déjà, pour remplir les textes
async function donneesDe(token: string, t: any): Promise<Donnees> {
  const segment = indexMenu(t, CHAMPS.segment);
  const typeClient = indexMenu(t, CHAMPS.typeClient);
  const copro = segment === OPTIONS.segment.COP || segment === OPTIONS.segment.PAR || typeClient === OPTIONS.typeClient.syndic;
  const particulier =
    !copro &&
    (typeClient === OPTIONS.typeClient.particulier ||
      (typeClient === null && (segment === OPTIONS.segment.RES || segment === OPTIONS.segment.DAP || segment === OPTIONS.segment.RIC)));
  const adresse = nettoyerAdresse(adresseDe(t));
  const email = texte(valeur(t, CHAMPS.email));
  const [gestionnaires, contacts] = await Promise.all([personnesLiees(token, t, GESTIONNAIRE), personnesLiees(token, t, CONTACT_SUR_PLACE)]);
  return {
    nomFiche: texte(t?.name),
    commune: villeDe(adresse),
    adresse,
    email: estEmail(email) ? email : '',
    telephone: texte(valeur(t, CHAMPS.telephone)),
    duree: parNom(t, 'duree releve'),
    dateVisite: dateVisiteDe(t),
    acces: parNom(t, 'acces site'),
    copro,
    particulier,
    gestionnaire: gestionnaires[0] || null,
    contactSurPlace: contacts[0] || null,
  };
}

export async function GET(request: Request) {
  try {
    const a = await acces(request);
    if ('erreur' in a) return a.erreur;
    const id = new URL(request.url).searchParams.get('fiche') || '';
    const tache = await lireTache(a.token, id);
    if (!tache) return json({ success: false, error: 'Fiche introuvable' }, 404);
    const donnees = await donneesDe(a.token, tache);
    const [exp, lus] = await Promise.all([
      expediteur(),
      filsAvec([donnees.email, donnees.gestionnaire?.email || '', donnees.contactSurPlace?.email || '']),
    ]);
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
      fiche: { id: String(tache.id), nom: texte(tache.name), email: donnees.email },
      donnees,
      // Sans les identifiants techniques du fil (relus côté serveur à l'envoi)
      fils: lus.fils.map((f) => ({ id: f.id, objet: f.objet, de: f.de, date: f.date })),
      filsProbleme: lus.probleme || '',
      aFaire: mailAFaire(tache),
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
    const corps = await request.json().catch(() => ({}));
    const tache = await lireTache(a.token, texte(corps?.ficheId));
    if (!tache) return json({ success: false, error: 'Fiche introuvable. Rien n’est parti.' }, 404);
    const preview = enPreversion();
    const auteur = texte(a.session.nom) || 'l’équipe';

    // ── Prévenu par téléphone (seule sortie d'un mail obligatoire sans adresse mail) ──
    if (texte(corps?.action) === 'telephone') {
      const attendu = mailAFaire(tache);
      if (!attendu) return json({ success: false, error: 'Aucun mail obligatoire en attente sur cette fiche.' }, 400);
      if (preview && !ficheDeTest(tache)) return json({ success: false, error: 'En préversion, seules les fiches de test (« Test » dans le nom) peuvent être modifiées.' }, 403);
      const phrase = texte(corps?.phrase).replace(/\s+/g, ' ').slice(0, 1000);
      if (phrase.length < 10) return json({ success: false, error: 'Écris en une phrase ce que tu as dit au client.' }, 400);
      const m = modeleDe(attendu);
      if (m && remplir(m, await donneesDe(a.token, tache)).a.length) return json({ success: false, error: 'La fiche a une adresse mail pour ce mail : il doit partir par mail.' }, 400);
      const note = await commenter(a.token, String(tache.id), `📞 Prévenu par téléphone à la place du mail « ${m?.nom || attendu} », par ${auteur} · ${maintenantParis()}\n${phrase}`);
      if (!note) return json({ success: false, error: 'ClickUp a refusé la note : rien n’est réglé, réessaie.' }, 502);
      const ok = await effacerMailAFaire(a.token, tache);
      return json({ success: true, telephone: true, avertissement: ok ? undefined : 'Appel noté, mais le mail reste marqué comme à envoyer : réessaie ou préviens Mathieu.' });
    }

    if (!mailBranche()) return json({ success: false, error: 'Envoi des mails pas encore branché (clé Google absente dans Vercel). Rien n’est parti.' }, 503);
    const objet = texte(corps?.objet).replace(/[\r\n]+/g, ' ');
    const message = String(corps?.texte ?? '').replace(/\s+$/, '');
    if (!objet) return json({ success: false, error: 'Objet vide. Rien n’est parti.' }, 400);
    if (objet.length > MAX_OBJET) return json({ success: false, error: `Objet trop long (${MAX_OBJET} caractères au plus).` }, 400);
    if (!message.trim()) return json({ success: false, error: 'Message vide. Rien n’est parti.' }, 400);
    if (message.length > MAX_TEXTE) return json({ success: false, error: 'Message trop long.' }, 400);
    if (objet.includes('[') || message.includes('[')) return json({ success: false, error: 'Il reste un passage entre [crochets] : complète-le ou supprime-le. Rien n’est parti.' }, 400);
    const dest = adressesValides(corps?.a);
    const copie = adressesValides(corps?.cc);
    const refusees = [...dest.refusees, ...copie.refusees];
    if (refusees.length) return json({ success: false, error: `Adresse mal écrite : ${refusees.join(', ')}. Rien n’est parti.` }, 400);
    if (!dest.ok.length) return json({ success: false, error: 'Aucun destinataire. Rien n’est parti.' }, 400);
    const cc = copie.ok.filter((x) => !dest.ok.includes(x));
    if (dest.ok.length + cc.length > MAX_DESTINATAIRES) return json({ success: false, error: `${MAX_DESTINATAIRES} destinataires au plus.` }, 400);

    // Préversion : seulement la personne connectée
    const moi = texte(a.session.email).toLowerCase();
    if (preview && !estEmail(moi)) return json({ success: false, error: 'Préversion : ton adresse ClickUp est introuvable, le mail de test ne peut pas partir.' }, 400);

    // Réponse dans un fil : le mail auquel on répond est relu dans contact@chargeo.fr
    const filId = texte(corps?.filId);
    let fil: Fil | null = null;
    if (filId) {
      fil = await mailPourReponse(filId);
      if (!fil || !fil.threadId) return json({ success: false, error: 'Le mail auquel tu réponds est introuvable dans contact@chargeo.fr. Rien n’est parti.' }, 400);
    }
    const dansLeFil = !!fil && (!preview || ficheDeTest(tache));
    const reponse = fil && dansLeFil ? { threadId: fil.threadId, messageId: fil.messageId, references: fil.references } : undefined;

    const prevus = `À : ${dest.ok.join(', ')}${cc.length ? ` · Cc : ${cc.join(', ')}` : ''}`;
    const envoi = preview
      ? { a: [moi], cc: [] as string[], objet: `[TEST] ${objet}`, texte: `⚠️ Mail de test (préversion de l'appli). En production, il partirait ainsi : ${prevus}\n\n${message}`, reponse }
      : { a: dest.ok, cc, objet, texte: message, reponse };

    let exp: Expediteur;
    try {
      exp = (await envoyerMail(envoi)).exp;
    } catch (e: any) {
      console.error('Mail (envoi)', e);
      return json({ success: false, error: `Mail non envoyé : ${e?.message || 'erreur Google'}. Rien n’est parti.` }, 502);
    }

    // Mail obligatoire réglé par ce texte : effacé de la fiche (en préversion, seulement sur une fiche de test)
    const cleTexte = texte(corps?.modele);
    const texteUtilise = modeleDe(cleTexte);
    const attendu = mailAFaire(tache);
    const aRegler = regle(attendu, cleTexte) && (!preview || ficheDeTest(tache));
    const regleOk = aRegler ? await effacerMailAFaire(a.token, tache) : false;

    // Copie sur la fiche
    const lignes = [
      `✉️ Mail envoyé depuis l'appli par ${auteur} · ${maintenantParis()}`,
      `De : ${exp.nom} <${EXPEDITEUR}>`,
      `À : ${dest.ok.join(', ')}`,
      ...(cc.length ? [`Cc : ${cc.join(', ')}`] : []),
      `Objet : ${objet}`,
      ...(texteUtilise ? [`Texte : ${texteUtilise.nom}`] : []),
      ...(regleOk ? [`✅ Mail obligatoire réglé : ${modeleDe(attendu)?.nom || attendu}`] : []),
      ...(fil ? [`En réponse à : ${fil.objet || '(sans objet)'}${dansLeFil ? '' : ' (préversion sur une vraie fiche : parti comme un nouveau mail)'}`] : []),
      ...(preview ? [`Préversion : mail de test envoyé seulement à ${moi}, aucun client ne l'a reçu.`] : []),
      '',
      message.length > MAX_COPIE ? `${message.slice(0, MAX_COPIE)}\n[… texte coupé dans la copie]` : message,
      ...(exp.signatureTexte ? ['', exp.signatureTexte] : exp.signatureHtml ? [] : ['', `(Parti sans signature : ${exp.probleme || 'signature Gmail introuvable'}.)`]),
    ];
    const avertissements: string[] = [];
    if (!(await commenter(a.token, String(tache.id), lignes.join('\n')))) avertissements.push('Mail envoyé, mais la copie sur la fiche a été refusée par ClickUp : colle-la à la main.');
    if (aRegler && !regleOk) avertissements.push('Mail envoyé, mais il reste marqué comme à envoyer sur la fiche : préviens Mathieu.');
    return json({ success: true, preview, envoyeA: envoi.a, dansLeFil, regle: regleOk, avertissement: avertissements.join(' ') || undefined });
  } catch (e) {
    console.error('Mail', e);
    return json({ success: false, error: 'Erreur serveur. Vérifie dans Gmail (contact@chargeo.fr, Envoyés) avant de renvoyer.' }, 500);
  }
}
