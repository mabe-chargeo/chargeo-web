import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ESPACE_CLIENT_COOKIE, getClickUpTask, tokenAllowsDossier } from '@/lib/espace-client';

// Ticket SAV envoyé depuis le suivi de dossier (lot 3.4, 12/10/2026).
// - Le dossier doit être ouvert dans l'Espace client (cookie signé) : impossible de créer un ticket pour le dossier d'un autre.
// - Le nom du client est relu dans ClickUp, il n'est plus pris du formulaire.
// - Le lien vers l'installation est contrôlé. S'il échoue (dossier pas encore au Parc, champ refusé), le ticket est gardé
//   (le client a bien signalé sa panne) et un commentaire prévient l'équipe avec le lien du dossier, pour le relier à la main.
// - Preview : dossiers « Test » uniquement.
const CHAMP_INSTALLATION = '3804df6e-a2e1-4058-913c-447189c73d35';
const CHAMP_SEVERITE = 'c2ae4e08-6903-4698-af96-a40082c11b39';
const CHAMP_PANNE = 'cb7bb1fe-6e64-4e1f-ab85-05860871d854';
const MESSAGE_MAX = 5000;

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

async function clickup(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

export async function POST(request: Request) {
  try {
    const data = await request.json().catch(() => ({}));
    const token = process.env.CLICKUP_API_KEY as string;
    const listId = process.env.CLICKUP_SAV_LIST_ID;
    if (!token || !listId) return NextResponse.json({ success: false, error: 'Configuration serveur incomplète' }, { status: 500 });

    const message = String(data?.message || '').trim().slice(0, MESSAGE_MAX);
    const dossierId = String(data?.clientId || '').trim();
    if (!message || !dossierId) {
      return NextResponse.json({ success: false, error: 'Champs manquants' }, { status: 400 });
    }

    // Le client doit avoir ouvert CE dossier dans l'Espace client
    const jar = await cookies();
    if (!tokenAllowsDossier(jar.get(ESPACE_CLIENT_COOKIE)?.value, dossierId)) {
      return NextResponse.json({ success: false, error: 'Session expirée : reconnectez-vous à votre Espace client.' }, { status: 403 });
    }

    const dossier = await getClickUpTask(dossierId);
    if (!dossier) return NextResponse.json({ success: false, error: 'Dossier introuvable' }, { status: 404 });
    if (process.env.VERCEL_ENV !== 'production' && !normal(dossier.name).startsWith('test')) {
      return NextResponse.json({ success: false, error: 'En preview : dossiers « Test » uniquement' }, { status: 403 });
    }

    const nom = String(dossier.name || 'Client');
    const champs: any[] = [];
    if (data?.severite) champs.push({ id: CHAMP_SEVERITE, value: data.severite });
    if (data?.typePanne) champs.push({ id: CHAMP_PANNE, value: data.typePanne });

    // 1. Création du ticket
    const res = await clickup(token, `/list/${listId}/task`, 'POST', {
      name: `SAV - ${nom}`,
      description: `Message du client :\n\n"${message}"\n\nDossier : ${dossier.url || dossier.id}`,
      custom_fields: champs,
    });
    if (!res.ok) {
      console.error('Création du ticket SAV refusée', res.status, await res.text().catch(() => ''));
      return NextResponse.json({ success: false, error: 'Erreur ClickUp Création' }, { status: 502 });
    }
    const ticket = await res.json();

    // 2. Lien vers l'installation, contrôlé
    const lien = await clickup(token, `/task/${ticket.id}/field/${CHAMP_INSTALLATION}`, 'POST', {
      value: { add: [String(dossier.id)], rem: [] },
    });
    const relie = lien.ok;
    if (!relie) {
      console.error('Lien SAV vers installation refusé', lien.status, await lien.text().catch(() => ''));
      const statut = String(dossier?.status?.status || '');
      await clickup(token, `/task/${ticket.id}/comment`, 'POST', {
        comment_text: `⚠️ Ticket non relié automatiquement à l'installation (dossier « ${nom} », statut « ${statut} »). Relie-le à la bonne fiche du Parc à la main : ${dossier.url || dossier.id}`,
        notify_all: true,
      });
    }

    return NextResponse.json({ success: true, relie });
  } catch (error) {
    console.error('Erreur SAV :', error);
    return NextResponse.json({ success: false, error: 'Erreur Serveur' }, { status: 500 });
  }
}
