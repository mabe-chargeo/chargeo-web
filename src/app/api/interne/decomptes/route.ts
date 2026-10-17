import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { LISTES } from '@/lib/espaces';
import { adresseDe } from '@/lib/vuesFiches';
import { aujourdhuiParis } from '@/lib/joursOuvres';
import { MARQUE_ENVOYE, MARQUE_PREPARE, cleJour, libellePeriode, reperePdf, suiviDecompte, texteMarque } from '@/lib/decomptes';

// Décomptes énergétiques (décision de Matthieu du 17/10/2026, 15 h 22 : depuis le Parc, sans nouvelle liste).
// GET : bornes du Parc suivies en relevé, avec leur dernière période écoulée et son étape :
//   a-preparer (rien pour la période), a-valider (🧾 Décompte préparé + PDF joint), envoyes (🧾 Décompte validé et
//   envoyé), a-completer (fiche sans mode ou sans fréquence).
// POST multipart { borneId, debut, fin, fichier } : joint le PDF préparé et laisse « 🧾 Décompte préparé ».
// POST JSON { borneId, debut, fin, destinataire } : « 🧾 Décompte validé et envoyé » (le site n'envoie rien).
// La période envoyée doit être celle que le serveur calcule : pas de décompte sur une autre période. Rejouable sans
// doublon. Droits : back-office et direction. Preview : écriture seulement sur les bornes « Test … ».

export const dynamic = 'force-dynamic';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const ecritureAutorisee = (t: any) => process.env.VERCEL_ENV === 'production' || normal(t?.name).trim().startsWith('test');

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}
async function commentaires(token: string, id: string): Promise<string[]> {
  const res = await api(token, `/task/${id}/comment`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return (Array.isArray(data?.comments) ? data.comments : []).map((c: any) => String(c?.comment_text || ''));
}
async function autorise(token: string, session: any): Promise<boolean> {
  const roles = await rolesDe(token, session.id);
  return roles.includes('direction') || roles.includes('backOffice');
}
const quand = () => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Connexion requise : reconnecte-toi.' }, 401);
  try {
    if (!(await autorise(token, session))) return json({ error: 'Les décomptes sont réservés au back-office et à la direction.' }, 403);
    const aujourdhui = aujourdhuiParis();
    const items: any[] = [];
    for (let page = 0; page < 20; page++) {
      const res = await api(token, `/list/${LISTES.parc}/task?archived=false&subtasks=false&page=${page}`);
      if (!res.ok) return json({ error: 'Lecture du Parc installé impossible' }, 502);
      const data = await res.json().catch(() => ({}));
      const taches: any[] = Array.isArray(data?.tasks) ? data.tasks : [];
      for (const t of taches) {
        if (t.parent) continue;
        const s = suiviDecompte(t, aujourdhui);
        if (s.etat === 'hors') continue;
        const base = { id: String(t.id), nom: String(t.name || ''), adresse: adresseDe(t), lien: `/interne/fiches/${t.id}`, ecritureAutorisee: ecritureAutorisee(t) };
        if (s.etat === 'a-completer') { items.push({ ...base, etape: 'a-completer', manque: s.manque }); continue; }
        const textes = await commentaires(token, String(t.id));
        const envoi = textes.find((x) => x.includes(texteMarque(MARQUE_ENVOYE, s.debut, s.fin)));
        const prepare = textes.find((x) => x.includes(texteMarque(MARQUE_PREPARE, s.debut, s.fin)));
        let pdf: { nom: string; url: string } | null = null;
        if (prepare && !envoi) {
          const resT = await api(token, `/task/${t.id}`);
          const complet = resT.ok ? await resT.json().catch(() => null) : null;
          const pj = (Array.isArray(complet?.attachments) ? complet.attachments : []).filter((a: any) => String(a?.title || '').includes(reperePdf(s.debut, s.fin)));
          const dernier = pj[pj.length - 1];
          if (dernier) pdf = { nom: String(dernier.title || 'Décompte'), url: String(dernier.url || '') };
        }
        items.push({
          ...base,
          etape: envoi ? 'envoyes' : prepare ? 'a-valider' : 'a-preparer',
          periode: { debut: cleJour(s.debut), fin: cleJour(s.fin), libelle: libellePeriode(s.debut, s.fin), ajuste: s.ajuste },
          frequence: s.frequence,
          tarif: s.tarif,
          avertissements: s.avertissements,
          prepare: prepare ? prepare.split('\n')[0] : '',
          envoi: envoi ? envoi.split('\n')[0] : '',
          pdf,
        });
      }
      if (data?.last_page !== false || taches.length === 0) break;
    }
    return json({ items, preview: process.env.VERCEL_ENV !== 'production' });
  } catch (error) {
    console.error('Décomptes (lecture) :', error);
    return json({ error: 'Lecture des décomptes impossible' }, 500);
  }
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Connexion requise : reconnecte-toi.' }, 401);
  try {
    if (!(await autorise(token, session))) return json({ error: 'Les décomptes sont réservés au back-office et à la direction.' }, 403);
    const multipart = (request.headers.get('content-type') || '').includes('multipart/form-data');
    const form = multipart ? await request.formData() : null;
    const corps = multipart ? null : await request.json().catch(() => ({}));
    const lire = (k: string) => String((form ? form.get(k) : corps?.[k]) ?? '').trim();
    const borneId = lire('borneId');
    if (!/^[a-z0-9]+$/i.test(borneId)) return json({ error: 'Borne invalide' }, 400);
    const resT = await api(token, `/task/${borneId}`);
    if (!resT.ok) return json({ error: 'Borne introuvable' }, 404);
    const t = await resT.json();
    if (String(t?.list?.id || '') !== LISTES.parc) return json({ error: 'Ce n’est pas une borne du Parc' }, 400);
    if (!ecritureAutorisee(t)) return json({ error: 'En preview, seules les bornes « Test » sont modifiables' }, 403);
    const s = suiviDecompte(t, aujourdhuiParis());
    if (s.etat !== 'periode') return json({ error: 'Cette borne n’a pas de décompte à faire (relevé non suivi ou fiche à compléter)' }, 400);
    if (lire('debut') !== cleJour(s.debut) || lire('fin') !== cleJour(s.fin)) return json({ error: 'La période a changé : actualise l’écran' }, 409);
    const textes = await commentaires(token, borneId);
    const marquePrepare = texteMarque(MARQUE_PREPARE, s.debut, s.fin);
    const marqueEnvoi = texteMarque(MARQUE_ENVOYE, s.debut, s.fin);
    const qui = session.nom || 'back-office';

    if (form) {
      const fichier = form.get('fichier');
      if (!(fichier instanceof File)) return json({ error: 'PDF absent' }, 400);
      if (!/\.pdf$/i.test(fichier.name) && fichier.type !== 'application/pdf') return json({ error: 'Le décompte doit être un PDF' }, 400);
      if (fichier.size > 4 * 1024 * 1024) return json({ error: 'PDF trop lourd (4 Mo maximum)' }, 413);
      if (textes.some((x) => x.includes(marqueEnvoi))) return json({ error: 'Décompte déjà envoyé pour cette période : pour le corriger, passe par ClickUp' }, 409);
      const envoi = new FormData();
      envoi.append('attachment', fichier, `${reperePdf(s.debut, s.fin)} · ${String(t.name || 'borne').slice(0, 60)}.pdf`);
      const res = await fetch(`https://api.clickup.com/api/v2/task/${borneId}/attachment`, { method: 'POST', headers: { Authorization: token }, body: envoi, cache: 'no-store' });
      if (!res.ok) return json({ error: `ClickUp a refusé le PDF (${res.status})` }, 502);
      if (!textes.some((x) => x.includes(marquePrepare))) {
        const texte = `${marquePrepare} (${qui}, ${quand()})${s.ajuste ? ', début = mise en service' : ''}. PDF joint à la borne, à valider avant envoi au gestionnaire.`;
        const r = await api(token, `/task/${borneId}/comment`, 'POST', { comment_text: texte, notify_all: false });
        if (!r.ok) return json({ error: `PDF joint, mais ClickUp a refusé le commentaire (${r.status})` }, 502);
      }
      return json({ success: true });
    }

    if (textes.some((x) => x.includes(marqueEnvoi))) return json({ success: true, deja: true });
    if (!textes.some((x) => x.includes(marquePrepare))) return json({ error: 'Joins d’abord le décompte préparé (PDF)' }, 400);
    const destinataire = lire('destinataire').slice(0, 120);
    if (!destinataire) return json({ error: 'Indique à qui le décompte a été envoyé' }, 400);
    const texte = `${marqueEnvoi} · à ${destinataire} (validé par ${qui}, ${quand()})`;
    const r = await api(token, `/task/${borneId}/comment`, 'POST', { comment_text: texte, notify_all: false });
    if (!r.ok) return json({ error: `ClickUp a refusé l’enregistrement (${r.status})` }, 502);
    return json({ success: true });
  } catch (error) {
    console.error('Décomptes (écriture) :', error);
    return json({ error: 'Erreur serveur' }, 500);
  }
}
