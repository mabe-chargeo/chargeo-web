import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { echeanceClickUp, libelleJour } from '@/lib/joursOuvres';
import { FACTURES_ID, CHAMP_ECHEANCE, lireStatut, traiterRelance } from '@/lib/relancesFacture';
import { retrouverFacture } from '@/lib/factureAuto';

// Écran facture de l'application (maquette validée par Matthieu le 18/10/2026, 18 h 19).
// POST { id, numero, montant, echeance: 'AAAA-MM-JJ' } : « Marquer comme émise ». Back-office et direction seulement.
// Remplit 🧾 N° facture Costructor, Montant HT et Date d'échéance, passe la facture en 📤 émise, puis programme tout de
// suite la première relance (src/lib/relancesFacture.ts, la même que l'automatisation ClickUp : pas de doublon, la
// seconde trouve le rappel déjà posé). Seulement depuis 📄 à émettre. En preview : factures « Test… » uniquement.
// 18/10/2026, 18 h 57 : POST { id, action: 'retrouver' } (appelé à l'ouverture de l'écran) cherche la facture finalisée
// dans Costructor et la reporte toute seule (src/lib/factureAuto.ts) ; le formulaire reste en secours.

export const dynamic = 'force-dynamic';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const CHAMP_NUMERO = 'acb6da97-630a-4421-8a0b-1533b1cc0338';
const CHAMP_MONTANT = 'b1ed211d-fa1a-452a-a955-a45cbc57ebe7';
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const euros = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT`;

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

// Statut « émise » de la liste (nom exact avec son emoji)
async function statutEmise(token: string): Promise<string> {
  const res = await api(token, `/list/${FACTURES_ID}`);
  const liste = res.ok ? await res.json().catch(() => null) : null;
  const s = (Array.isArray(liste?.statuses) ? liste.statuses : []).find((x: any) => lireStatut(String(x?.status || '')) === 'emise');
  return String(s?.status || '📤 émise');
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Connexion requise : reconnecte-toi.' }, 401);
  const roles = await rolesDe(token, session.id);
  if (!roles.includes('direction') && !roles.includes('backOffice')) return json({ error: 'Réservé au back-office et à la direction.' }, 403);

  const corps = await request.json().catch(() => ({}));
  const id = String(corps?.id || '');
  if (corps?.action === 'retrouver') {
    if (!/^[a-z0-9]+$/i.test(id)) return json({ error: 'Identifiant invalide' }, 400);
    const r = await retrouverFacture(id).catch((e) => ({ success: false, error: String(e) }));
    return json(r, r.success ? 200 : 502);
  }
  const numero = String(corps?.numero || '').trim();
  const montant = Number(String(corps?.montant ?? '').replace(/\s/g, '').replace(',', '.'));
  const m = String(corps?.echeance || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!/^[a-z0-9]+$/i.test(id)) return json({ error: 'Identifiant invalide' }, 400);
  if (!numero) return json({ error: 'Indique le n° de la facture émise dans Costructor.' }, 400);
  if (!Number.isFinite(montant) || montant <= 0) return json({ error: 'Indique le montant HT de la facture.' }, 400);
  if (!m) return json({ error: 'Indique la date de paiement dû.' }, 400);
  const jour = { a: Number(m[1]), m: Number(m[2]), j: Number(m[3]) };

  try {
    const res = await api(token, `/task/${encodeURIComponent(id)}`);
    if (!res.ok) return json({ error: 'Facture introuvable' }, 404);
    const t = await res.json();
    if (String(t?.list?.id || '') !== String(FACTURES_ID)) return json({ error: 'Cette tâche n’est pas une facture client.' }, 400);
    if (process.env.VERCEL_ENV !== 'production' && !normal(t.name).trim().startsWith('test')) {
      return json({ error: 'En preview : seulement sur une facture « Test… ».' }, 403);
    }
    if (lireStatut(String(t?.status?.status || '')) !== 'a_emettre') return json({ error: 'Cette facture est déjà émise.' }, 409);

    const ecrits = await Promise.all([
      api(token, `/task/${t.id}/field/${CHAMP_NUMERO}`, 'POST', { value: numero }),
      api(token, `/task/${t.id}/field/${CHAMP_MONTANT}`, 'POST', { value: Math.round(montant * 100) / 100 }),
      api(token, `/task/${t.id}/field/${CHAMP_ECHEANCE}`, 'POST', { value: echeanceClickUp(jour), value_options: { time: false } }),
    ]);
    if (ecrits.some((r) => !r.ok)) {
      console.error('Facture émise : champ refusé', await Promise.all(ecrits.map((r) => r.ok ? '' : r.text().catch(() => ''))));
      return json({ error: 'Enregistrement incomplet : réessaie, rien n’a changé de statut.' }, 502);
    }
    const statut = await statutEmise(token);
    const maj = await api(token, `/task/${t.id}`, 'PUT', { status: statut });
    if (!maj.ok) return json({ error: 'Champs enregistrés, mais le statut n’a pas pu passer en émise. Réessaie.' }, 502);

    await api(token, `/task/${t.id}/comment`, 'POST', {
      comment_text: `📤 Facture émise, saisie depuis l'application par ${session.nom || 'l’équipe'} : n° ${numero}, ${euros(montant)}, paiement dû le ${libelleJour(jour)}.`,
      notify_all: false,
    });
    const relance = await traiterRelance(String(t.id), false).catch((e) => ({ status: 500, body: { success: false, error: String(e) } }));
    return json({ success: true, statut, relance: relance.body });
  } catch (error) {
    console.error('Facture émise :', error);
    return json({ error: 'Enregistrement impossible pour l’instant' }, 500);
  }
}
