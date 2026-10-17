import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';

// Annuaire Contacts 👥 de l'espace Commercial (validé par Matthieu le 17/10/2026), partagé avec le back-office. LECTURE SEULE.
// GET : tous les contacts ouverts, avec rôle (🎭 Rôle), société, téléphone et email, triés par nom.
// Droits : commercial, back-office ou direction. Preview : vraie liste, en lecture seule.

export const dynamic = 'force-dynamic';
const CONTACTS_ID = '1200630000008493';
const TEL_CONTACT = '9f8e22e3-656d-4d9b-b923-cfff21366e8f';
const EMAIL_CONTACT = 'fe270c78-ce53-427c-ad4f-73090f7c3252';
const PAGES_MAX = 10;

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const champs = (t: any): any[] => (Array.isArray(t?.custom_fields) ? t.custom_fields : []);
const valeur = (t: any, id: string) => champs(t).find((c) => c?.id === id)?.value;
const champNomme = (t: any, mot: string) => champs(t).find((c) => normal(c?.name).includes(mot));
const texte = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());
function optionDe(f: any): string {
  const v = f?.value;
  if (v === undefined || v === null || v === '') return '';
  const o = (f?.type_config?.options || []).find((x: any) => x.orderindex === Number(v) || x.id === v);
  return String(o?.name || '');
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  const session = await sessionDeRequete(request);
  if (!session?.id) return NextResponse.json({ error: 'Connexion requise : reconnecte-toi.' }, { status: 401 });

  try {
    const roles = await rolesDe(token, session.id);
    if (!roles.includes('direction') && !roles.includes('commercial') && !roles.includes('backOffice')) {
      return NextResponse.json({ error: 'L’annuaire est réservé au commercial et au back-office.' }, { status: 403 });
    }
    const toutes: any[] = [];
    for (let page = 0; page < PAGES_MAX; page++) {
      const res = await fetch(`https://api.clickup.com/api/v2/list/${CONTACTS_ID}/task?archived=false&include_closed=false&subtasks=false&page=${page}`, {
        headers: { Authorization: token },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`ClickUp a refusé la lecture (${res.status})`);
      const json = await res.json().catch(() => ({}));
      const lot: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
      toutes.push(...lot);
      if (json?.last_page !== false || lot.length === 0) break;
    }
    const contacts = toutes
      .map((t) => ({
        id: String(t.id),
        nom: texte(t.name),
        role: optionDe(champNomme(t, 'role')),
        societe: texte(champNomme(t, 'societe')?.value),
        tel: texte(valeur(t, TEL_CONTACT)),
        email: texte(valeur(t, EMAIL_CONTACT)),
        url: String(t?.url || `https://app.clickup.com/t/${t.id}`),
      }))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    return NextResponse.json({ moi: texte(session.email), contacts });
  } catch (error) {
    console.error('Erreur Contacts :', error);
    return NextResponse.json({ error: 'Lecture des contacts impossible' }, { status: 500 });
  }
}
