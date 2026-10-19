import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { LISTES } from '@/lib/espaces';
import { champType } from '@/lib/typesTaches';
import { adresseDe } from '@/lib/vuesFiches';

// Créations du bouton + (lot C des écrans manquants, 17/10/2026) : Ticket SAV et Idée Kaizen (carte des menus).
// GET ?installations=1 : installations du Parc (nom, adresse) pour rattacher le ticket.
// POST { type: 'sav', installationId, severite, typePanne, pdc?, description }
//   → Tickets SAV 🔧, nom « <installation> · <type de panne> », 🔥 Sévérité, 🏷️ Type de Panne, 🔌 PDC concerné (menus écrits PAR
//   INDEX, ordre relu le 17/10), 🔗 Fiche Installation (relation vers le Parc).
// POST { type: 'kaizen', titre, description } → Kaizen (Amélioration) 💡 (aucun champ personnalisé sur la liste).
// Preview : nom préfixé « Test · » et aucune relation posée vers une vraie installation (notée dans la description).

export const dynamic = 'force-dynamic';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const texte = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());
const estPreview = () => process.env.VERCEL_ENV !== 'production';

const SAV = {
  severite: 'c2ae4e08-6903-4698-af96-a40082c11b39', // Mineure 0, Gênante 1, Critique (Borne HS) 2
  typePanne: 'cb7bb1fe-6e64-4e1f-ab85-05860871d854', // Réseau/Wifi 0, Matériel 1, Logiciel 2, Électrique 3
  pdc: '20dabf35-cb09-4a80-9c5c-9a806aa642fb', // PDC 1 0, PDC 2 1
  installation: '3804df6e-a2e1-4058-913c-447189c73d35',
};
const SEVERITES = ['Mineure', 'Gênante', 'Critique (Borne HS)'];
const PANNES = ['Réseau/Wifi', 'Matériel (Borne/Câble)', 'Logiciel (App)', 'Électrique (Disjoncteur)'];

async function lister(token: string, listId: string): Promise<any[]> {
  const toutes: any[] = [];
  for (let page = 0; page < 10; page++) {
    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false&include_closed=false&subtasks=false&page=${page}`, { headers: { Authorization: token }, cache: 'no-store' });
    if (!res.ok) throw new Error(`ClickUp a refusé la lecture (${res.status})`);
    const corps = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(corps?.tasks) ? corps.tasks : [];
    toutes.push(...lot.filter((t) => !t?.parent));
    if (corps?.last_page !== false || lot.length === 0) break;
  }
  return toutes;
}

async function creerTache(token: string, listId: string, corps: any) {
  const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
    cache: 'no-store',
  });
  const t = await res.json().catch(() => ({}));
  return res.ok && t?.id ? { ok: true as const, tache: t } : { ok: false as const, status: res.status };
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Connexion requise : reconnecte-toi.' }, 401);
  try {
    const installations = (await lister(token, LISTES.parc)).map((t) => ({ id: String(t.id), nom: String(t.name || ''), adresse: adresseDe(t), statut: String(t?.status?.status || '') }));
    installations.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    return json({ installations, severites: SEVERITES, pannes: PANNES, preview: estPreview() });
  } catch (e) {
    console.error('Créations (lecture)', e);
    return json({ error: 'Lecture du Parc impossible pour l’instant' }, 500);
  }
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ error: 'Configuration serveur incomplète' }, 500);
  const session = await sessionDeRequete(request);
  if (!session?.id) return json({ error: 'Connexion requise : reconnecte-toi.' }, 401);
  const preview = estPreview();
  const auteur = texte((session as any).nom) || texte((session as any).email) || 'l’équipe';
  const prefixe = (nom: string) => (preview && !/^test/i.test(nom) ? `Test · ${nom}` : nom);
  try {
    const roles = await rolesDe(token, session.id);
    const corps = await request.json().catch(() => ({}));

    if (corps?.type === 'kaizen') {
      const titre = texte(corps.titre).slice(0, 200);
      if (!titre) return json({ error: 'Donne un titre à ton idée' }, 400);
      const description = `${texte(corps.description)}\n\nProposée depuis l'application équipe par ${auteur}.`.trim();
      const r = await creerTache(token, LISTES.kaizen, { name: prefixe(titre), description });
      if (!r.ok) return json({ error: `ClickUp a refusé la création (${r.status})` }, 502);
      return json({ success: true, preview, cree: { id: String(r.tache.id), nom: String(r.tache.name), lien: `/interne/element/${r.tache.id}` } });
    }

    if (corps?.type === 'sav') {
      if (!['direction', 'chargeOperation', 'poseur', 'backOffice'].some((x) => roles.includes(x as any))) return json({ error: 'Droits insuffisants' }, 403);
      const installationId = texte(corps.installationId);
      const severite = Number(corps.severite);
      const typePanne = Number(corps.typePanne);
      const pdc = corps.pdc === null || corps.pdc === undefined || corps.pdc === '' ? null : Number(corps.pdc);
      if (!/^[a-z0-9]+$/i.test(installationId)) return json({ error: 'Choisis l’installation concernée' }, 400);
      if (!Number.isInteger(severite) || severite < 0 || severite >= SEVERITES.length) return json({ error: 'Choisis la sévérité' }, 400);
      if (!Number.isInteger(typePanne) || typePanne < 0 || typePanne >= PANNES.length) return json({ error: 'Choisis le type de panne' }, 400);
      // L'installation doit être au Parc
      const resI = await fetch(`https://api.clickup.com/api/v2/task/${installationId}`, { headers: { Authorization: token }, cache: 'no-store' });
      const inst = resI.ok ? await resI.json().catch(() => null) : null;
      if (!inst || String(inst?.list?.id || '') !== LISTES.parc) return json({ error: 'Installation introuvable au Parc' }, 400);

      const champs: any[] = [
        { id: SAV.severite, value: severite },
        { id: SAV.typePanne, value: typePanne },
      ];
      if (pdc !== null && Number.isInteger(pdc) && pdc >= 0 && pdc <= 1) champs.push({ id: SAV.pdc, value: pdc });
      if (!preview) champs.push({ id: SAV.installation, value: { add: [installationId], rem: [] } });
      const description = [
        texte(corps.description),
        '',
        `Ticket créé depuis l'application équipe par ${auteur}.`,
        `Installation : ${String(inst.name || '')}${adresseDe(inst) ? ` (${adresseDe(inst)})` : ''}`,
        preview ? 'Preview : la relation 🔗 Fiche Installation n’est pas posée vers la vraie installation.' : '',
      ].filter((l, i) => l !== '' || i === 1).join('\n').trim();
      const type = await champType(token, 'ticketSav');
      const nom = `${String(inst.name || 'Installation')} · ${PANNES[typePanne]}`;
      const r = await creerTache(token, LISTES.sav, { name: prefixe(nom), description, ...type, custom_fields: champs, ...(severite === 2 ? { priority: 1 } : {}) });
      if (!r.ok) return json({ error: `ClickUp a refusé la création du ticket (${r.status})` }, 502);
      return json({ success: true, preview, cree: { id: String(r.tache.id), nom: String(r.tache.name), lien: `/interne/element/${r.tache.id}` } });
    }

    return json({ error: 'Création inconnue' }, 400);
  } catch (e) {
    console.error('Créations (écriture)', e);
    return json({ error: 'Erreur serveur' }, 500);
  }
}
