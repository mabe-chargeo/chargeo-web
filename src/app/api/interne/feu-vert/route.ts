import { NextResponse } from 'next/server';
import { blocageResident, estResident, lireTache } from '@/lib/residentInfra';
import { sessionDeRequete } from '@/lib/session';

// Écran Feu vert du chargé d'opération (Phase 6, 13/10/2026), /chantiers/feu-vert (src/lib/adresses.ts).
// Accès réservé aux personnes connectées avec leur compte ClickUp (src/proxy.ts). Les écritures passent par la clé du
// site ; 👤 Validé par reçoit la personne connectée.
// GET : fiches principales ouvertes de Planning Chantiers, avec les 5 prérequis, le blocage borne résident, 👤 Validé par
//   et 🟢 Feu vert.
// POST { taskId, action: 'prerequis', fieldId, optionId } : change un prérequis (l'automatisation « prérequis » existante
//   retire le feu vert si besoin).
// POST { taskId, action: 'feu_vert' } : refusé tant qu'un prérequis manque. Sinon 👤 Validé par = personne connectée si
//   vide, puis 🟢 Feu vert coché. Le commentaire « Feu vert donné » vient de l'automatisation existante
//   (src/app/api/chantiers/feu-vert/route.ts), qui revérifie tout.
// Preview : écriture uniquement sur les fiches dont le nom commence par « Test ».

const PLANNING_CHANTIERS_ID = '901520038258';
const CHAMP_FEU_VERT = 'c27f8084-e2f2-4eaf-83bd-d75e082e0d0a';
const CHAMP_VALIDE_PAR = '85d92954-e954-451c-bb14-405ba83de4f4';
const PREREQUIS: { id: string; libelle: string }[] = [
  { id: '348cc59d-5adc-4ed4-b07d-5da40a9e6abc', libelle: '📝 Devis signé' },
  { id: 'ba4a2025-43ec-44a0-8938-1cbc497f7bbf', libelle: '💶 Acompte' },
  { id: '8074d071-24d4-4711-8726-4c20098321fd', libelle: '📜 Autorisations et aides' },
  { id: '7ac103cd-7b52-40ca-a2d4-939e59427f56', libelle: '📦 Matériel reçu conforme' },
  { id: '24f63f50-0839-416b-8f07-9c60ee56e308', libelle: '👷 Équipe, date et accès' },
];
const PAGES_MAX = 5;

export const dynamic = 'force-dynamic';

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
type Option = { id: string; nom: string; orderindex: number };

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c.id === id);

// Options des 5 prérequis, lues sur la liste (même ordre que dans ClickUp)
async function optionsPrerequis(token: string): Promise<Record<string, Option[]>> {
  const res = await api(token, `/list/${PLANNING_CHANTIERS_ID}/field`);
  const json = res.ok ? await res.json().catch(() => ({})) : {};
  const champs: any[] = Array.isArray(json?.fields) ? json.fields : [];
  const sortie: Record<string, Option[]> = {};
  for (const p of PREREQUIS) {
    const f = champs.find((c) => c.id === p.id);
    sortie[p.id] = (f?.type_config?.options || []).map((o: any) => ({ id: String(o.id), nom: String(o.name || ''), orderindex: Number(o.orderindex) }));
  }
  return sortie;
}

function valeurOption(t: any, id: string, options: Option[]): Option | null {
  const v = champ(t, id)?.value;
  if (v === undefined || v === null || v === '') return null;
  return options.find((o) => o.orderindex === Number(v) || o.id === v) || null;
}

const estOk = (nom: string) => { const n = normal(nom); return n.includes('confirme') || n.includes('non applicable'); };
const feuVertCoche = (t: any) => { const v = champ(t, CHAMP_FEU_VERT)?.value; return v === true || v === 'true'; };
const validePar = (t: any): string[] => {
  const v = champ(t, CHAMP_VALIDE_PAR)?.value;
  return (Array.isArray(v) ? v : []).map((u: any) => String(u?.username || u?.email || '')).filter(Boolean);
};

async function decrire(t: any, options: Record<string, Option[]>, token: string) {
  const prerequis = PREREQUIS.map((p) => {
    const o = valeurOption(t, p.id, options[p.id] || []);
    return { id: p.id, libelle: p.libelle, optionId: o?.id ?? null, valeur: o?.nom ?? null, ok: !!o && estOk(o.nom) };
  });
  // Borne résident : relecture complète (liens de tâche) seulement pour ces fiches
  let blocage: string | null = null;
  if (estResident(t)) {
    const complete = Array.isArray(t?.linked_tasks) ? t : await lireTache(String(t.id), token);
    blocage = await blocageResident(complete || t, token);
  }
  const manquants = [...prerequis.filter((p) => !p.ok).map((p) => p.libelle), ...(blocage ? [blocage] : [])];
  return {
    id: String(t.id),
    nom: String(t.name || ''),
    statut: String(t?.status?.status || ''),
    couleurStatut: String(t?.status?.color || ''),
    url: String(t.url || `https://app.clickup.com/t/${t.id}`),
    prerequis,
    blocage,
    manquants,
    validePar: validePar(t),
    feuVert: feuVertCoche(t),
    ecritureAutorisee: ecritureAutorisee(t),
  };
}

function ecritureAutorisee(t: any): boolean {
  return process.env.VERCEL_ENV === 'production' || normal(t?.name).trim().startsWith('test');
}

export async function GET() {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  try {
    const options = await optionsPrerequis(token);
    const taches: any[] = [];
    for (let page = 0; page < PAGES_MAX; page++) {
      const res = await api(token, `/list/${PLANNING_CHANTIERS_ID}/task?archived=false&include_closed=false&subtasks=false&page=${page}`);
      if (!res.ok) {
        if (page === 0) return NextResponse.json({ error: `ClickUp a refusé la lecture du planning (${res.status})` }, { status: 502 });
        break;
      }
      const json = await res.json().catch(() => ({}));
      const lot: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
      taches.push(...lot.filter((t) => !t.parent));
      if (json?.last_page !== false || lot.length === 0) break;
    }
    const chantiers = await Promise.all(taches.map((t) => decrire(t, options, token)));
    return NextResponse.json({ chantiers, options, preview: process.env.VERCEL_ENV !== 'production' });
  } catch (error) {
    console.error('Erreur écran feu vert (lecture) :', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  try {
    const corps = await request.json().catch(() => ({}));
    const taskId = String(corps?.taskId || '');
    const action = String(corps?.action || '');
    if (!taskId || !['prerequis', 'feu_vert'].includes(action)) {
      return NextResponse.json({ error: 'Demande incomplète' }, { status: 400 });
    }
    const tache = await lireTache(taskId, token);
    if (!tache) return NextResponse.json({ error: 'Fiche introuvable' }, { status: 404 });
    if (tache.parent || String(tache?.list?.id ?? '') !== PLANNING_CHANTIERS_ID) {
      return NextResponse.json({ error: 'Cette fiche n\'est pas un chantier du planning' }, { status: 400 });
    }
    if (!ecritureAutorisee(tache)) {
      return NextResponse.json({ error: 'En preview, seules les fiches « Test » sont modifiables' }, { status: 403 });
    }
    const id = String(tache.id);
    const options = await optionsPrerequis(token);

    if (action === 'prerequis') {
      const fieldId = String(corps?.fieldId || '');
      const optionId = String(corps?.optionId || '');
      if (!PREREQUIS.some((p) => p.id === fieldId) || !(options[fieldId] || []).some((o) => o.id === optionId)) {
        return NextResponse.json({ error: 'Prérequis ou valeur inconnue' }, { status: 400 });
      }
      const res = await api(token, `/task/${id}/field/${fieldId}`, 'POST', { value: optionId });
      if (!res.ok) return NextResponse.json({ error: `ClickUp a refusé la modification (${res.status})` }, { status: 502 });
    } else {
      const avant = await decrire(tache, options, token);
      if (avant.manquants.length) {
        return NextResponse.json({ error: `Feu vert impossible : il manque ${avant.manquants.join(', ')}`, chantier: avant }, { status: 409 });
      }
      if (!avant.validePar.length) {
        const session = await sessionDeRequete(request);
        const userId = session?.id;
        if (!userId) return NextResponse.json({ error: 'Session expirée : reconnecte-toi pour donner le feu vert' }, { status: 401 });
        const res = await api(token, `/task/${id}/field/${CHAMP_VALIDE_PAR}`, 'POST', { value: { add: [userId], rem: [] } });
        if (!res.ok) return NextResponse.json({ error: `👤 Validé par n'a pas pu être rempli (${res.status})` }, { status: 502 });
      }
      if (!avant.feuVert) {
        const res = await api(token, `/task/${id}/field/${CHAMP_FEU_VERT}`, 'POST', { value: true });
        if (!res.ok) return NextResponse.json({ error: `🟢 Feu vert n'a pas pu être coché (${res.status})` }, { status: 502 });
      }
    }

    const relue = await lireTache(id, token);
    return NextResponse.json({ success: true, chantier: relue ? await decrire(relue, options, token) : null });
  } catch (error) {
    console.error('Erreur écran feu vert (écriture) :', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
