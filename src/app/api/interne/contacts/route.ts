import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { getQualificationListId } from '@/lib/listesClickUp';
import { CHAMPS } from '@/lib/champsClickUp';
import { LISTES } from '@/lib/espaces';
import { adresses } from '@/lib/adresses';

// Annuaire de l'espace Commercial (validé par Matthieu le 17/10/2026), partagé avec le back-office. LECTURE SEULE.
// GET : tous les contacts, triés par nom :
//   - la liste Contacts 👥 (syndics, conseils syndicaux, gestionnaires…), avec rôle (🎭 Rôle), société, téléphone, email ;
//   - 17/10, 13 h 13 (Matthieu : « je veux qu'il y ait tous les contacts y compris les clients ») : les clients, c'est-à-dire
//     les fiches principales de Qualification, du Planning Chantiers et du Parc, et les prospects de la Prospection, avec
//     le passeport (📞 Telephone, 📧 Email, mêmes identifiants sur ces listes) ; ils ouvrent la fiche affaire unique.
// Une liste illisible n'empêche pas les autres de s'afficher (avertissement).
// Droits : commercial, back-office ou direction. Preview : Qualification lue dans 🧪 TEST, le reste dans les vraies
// listes, en lecture seule.

export const dynamic = 'force-dynamic';
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
const sansEmoji = (s: string) => s.replace(/^[^A-Za-z0-9\u00C0-\u017F]+/, '').trim();

async function lister(token: string, listId: string): Promise<any[]> {
  const toutes: any[] = [];
  for (let page = 0; page < PAGES_MAX; page++) {
    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false&include_closed=false&subtasks=false&page=${page}`, {
      headers: { Authorization: token },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`ClickUp a refusé la lecture (${res.status})`);
    const json = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    toutes.push(...lot.filter((t) => !t?.parent));
    if (json?.last_page !== false || lot.length === 0) break;
  }
  return toutes;
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
    // Sources : la liste Contacts, puis les fiches clients de la Prospection au Parc
    const qualifId = getQualificationListId();
    const sources: { id: string | undefined; role: string; etape: string; nom: string }[] = [
      { id: LISTES.contacts, role: '', etape: '', nom: 'Contacts' },
      { id: LISTES.prospection, role: 'Prospect', etape: 'Prospection', nom: 'Prospection' },
      { id: qualifId, role: 'Client', etape: 'En vente', nom: 'Qualification' },
      { id: LISTES.planning, role: 'Client', etape: 'Chantier', nom: 'Planning Chantiers' },
      { id: LISTES.parc, role: 'Client', etape: 'Parc', nom: 'Parc' },
    ];
    const lus = await Promise.allSettled(sources.map((s) => (s.id ? lister(token, s.id) : Promise.reject(new Error('liste non configurée')))));

    const contacts: any[] = [];
    const avertissements: string[] = [];
    sources.forEach((s, i) => {
      const r = lus[i];
      if (r.status !== 'fulfilled') { avertissements.push(`${s.nom} illisible pour l’instant`); return; }
      for (const t of r.value) {
        if (!s.role) {
          contacts.push({
            id: String(t.id),
            nom: texte(t.name),
            role: sansEmoji(optionDe(champNomme(t, 'role'))) || 'Contact',
            societe: texte(champNomme(t, 'societe')?.value),
            tel: texte(valeur(t, TEL_CONTACT)),
            email: texte(valeur(t, EMAIL_CONTACT)),
            url: String(t?.url || `https://app.clickup.com/t/${t.id}`),
            fiche: '',
          });
        } else {
          const typeClient = sansEmoji(optionDe(champs(t).find((c) => c?.id === CHAMPS.typeClient)));
          contacts.push({
            id: String(t.id),
            nom: texte(t.name),
            role: s.role,
            societe: [typeClient, s.etape].filter(Boolean).join(' · '),
            tel: texte(valeur(t, CHAMPS.telephone)),
            email: texte(valeur(t, CHAMPS.email)),
            url: String(t?.url || `https://app.clickup.com/t/${t.id}`),
            fiche: adresses.affaire(String(t.id)),
          });
        }
      }
    });
    contacts.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    return NextResponse.json({ moi: texte(session.email), contacts, avertissements });
  } catch (error) {
    console.error('Erreur Contacts :', error);
    return NextResponse.json({ error: 'Lecture des contacts impossible' }, { status: 500 });
  }
}
