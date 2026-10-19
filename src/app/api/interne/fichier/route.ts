import { sessionDeRequete } from '@/lib/session';

// Aperçu des fichiers de réception (Phase 6, test du 13/10/2026) : le chargé d'opération doit voir le PV, le rapport de
// mesures et les photos avant de valider. Le site relit la fiche, retrouve le fichier dans son champ et le renvoie
// tel quel (le lien ClickUp n'est pas donné au navigateur). Réservé aux personnes connectées.
// 19/10/2026 (passe de cohérence validée par Matthieu) : aussi le 📄 Rapport d'intervention d'un ticket SAV, montré sur
// la fiche du ticket par la même ligne document que le PV (src/components/appli/LigneDocument.tsx).
// 19/10/2026, 11 h 39 : et le 📎 Bon de livraison d'une commande de matériel (photo prise au « Reçu / vérifié »).
// GET ?taskId=...&cible=pv|photos|rapport|rapportSav|bonLivraison&id=<id du fichier>[&mini=1 : miniature]

const CHANTIER = ['901520038258', '901520038290']; // Planning Chantiers, Parc installé
const CIBLES: Record<string, { champ: string; listes: string[] }> = {
  pv: { champ: 'ea4cf46a-c8bc-41ad-a46e-c7d313099f1b', listes: CHANTIER },
  photos: { champ: 'e907f3f8-c702-47bd-b523-017e684e78c1', listes: CHANTIER },
  rapport: { champ: '463edfd0-faf9-40e6-b37a-9ee126c2b449', listes: CHANTIER }, // 📊 Rapport de mesures
  rapportSav: { champ: '8dbf671d-4a53-4870-be35-d2e866c73ede', listes: ['901520038282'] }, // 📄 Rapport d'intervention, Tickets SAV
  bonLivraison: { champ: '1606d8d7-265a-477a-800c-387c6bf611c9', listes: ['901520038249'] }, // 📎 Bon de livraison, Commandes Matériel
};

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await sessionDeRequete(request);
  if (!session) return new Response('Connexion requise', { status: 401 });
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return new Response('Configuration serveur incomplète', { status: 500 });
  try {
    const p = new URL(request.url).searchParams;
    const taskId = p.get('taskId') || '';
    const cible = CIBLES[p.get('cible') || ''];
    const id = p.get('id') || '';
    if (!taskId || !cible || !id) return new Response('Demande incomplète', { status: 400 });

    const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}`, { headers: { Authorization: token }, cache: 'no-store' });
    if (!res.ok) return new Response('Fiche introuvable', { status: 404 });
    const tache = await res.json().catch(() => ({}));
    if (!cible.listes.includes(String(tache?.list?.id ?? ''))) return new Response('Fiche hors liste', { status: 403 });
    const valeur = (Array.isArray(tache?.custom_fields) ? tache.custom_fields : []).find((c: any) => c.id === cible.champ)?.value;
    const f = (Array.isArray(valeur) ? valeur : valeur ? [valeur] : []).find((x: any) => String(x?.id) === id);
    if (!f) return new Response('Fichier introuvable', { status: 404 });

    const mini = p.get('mini') === '1';
    const source = String((mini && (f.thumbnail_large || f.thumbnail_medium)) || f.url_w_query || f.url || '');
    if (!source) return new Response('Lien du fichier absent', { status: 404 });
    // Lien signé d'abord (sans en-tête, sinon le stockage refuse), puis avec la clé si ClickUp l'exige
    let fichier = await fetch(source, { cache: 'no-store' });
    if (fichier.status === 401 || fichier.status === 403) fichier = await fetch(source, { headers: { Authorization: token }, cache: 'no-store' });
    if (!fichier.ok || !fichier.body) return new Response(`Lecture du fichier refusée (${fichier.status})`, { status: 502 });

    const nom = String(f.title || f.name || 'fichier');
    return new Response(fichier.body, {
      headers: {
        'Content-Type': fichier.headers.get('content-type') || String(f.mimetype || 'application/octet-stream'),
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(nom)}`,
        'Cache-Control': 'private, max-age=600',
      },
    });
  } catch (error) {
    console.error('Erreur aperçu fichier :', error);
    return new Response('Erreur interne du serveur', { status: 500 });
  }
}
