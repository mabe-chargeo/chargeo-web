import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { alerter } from '@/lib/alerteSite';

// Réception en deux temps (Phase 6, décision Matthieu du 13/10/2026, page « Qui fait quoi ») :
// - le technicien poseur collecte sur place (/interne/reception) : PV signé, photos, réserves déclarées, puis « envoyer » ;
// - le chargé d'opération / chef de chantier valide (/interne/validation) : contrôle, qualifie les réserves, « terminer ».
// Mêmes règles que le passage au Parc (src/app/api/chantiers/reception/route.ts), qui reste seul juge : l'écran met le
// statut, l'automatisation existante contrôle, refuse ou déplace au Parc.
// GET ?role=poseur (🚧 en cours et ✅ réalisé) | ?role=charge (✅ réalisé seulement).
// POST JSON { taskId, action } :
//   - 'reserves' + optionId : règle 🧾 Réserves ;
//   - 'reserve_ajout' + libelle + echeance (AAAA-MM-JJ) : sous-tâche « 🔧 Réserve : … », responsable = 👷 Technicien du
//     chantier (c'est en général lui qui revient la lever), à défaut la personne connectée ;
//   - 'envoyer' (poseur) : refusé s'il manque quelque chose ; sinon statut ✅ réalisé et alerte au chargé d'opération
//     (📣 Alerte site, relais @charge-doperation) ;
//   - 'terminer' (chargé d'opération) : statut 🏁 terminé si tout est en règle (sinon refus avec la liste).
// POST multipart { taskId, cible: 'pv' | 'photos', fichier } : fichier déposé dans 📂 PV Réception ou 📸 Photos Chantier
//   (API v3 des pièces jointes de champ, puis rattachement au champ). Un fichier par envoi (limite Vercel 4,5 Mo).
// Un seul compte ClickUp pour l'instant : les deux écrans sont ouverts à toute personne connectée.
// Preview : écriture uniquement sur les fiches dont le nom commence par « Test ».

const WORKSPACE_ID = process.env.CLICKUP_TEAM_ID?.trim() || '90151325642';
const PLANNING_CHANTIERS_ID = '901520038258';
const CHAMP_RESERVES = '1463a905-0b11-4693-b9d9-e8cca4f79eeb';
const CHAMP_PV = 'ea4cf46a-c8bc-41ad-a46e-c7d313099f1b';
const CHAMP_PHOTOS = 'e907f3f8-c702-47bd-b523-017e684e78c1';
const CHAMP_TECHNICIEN = 'b400c953-ae06-4336-b471-405296f9ff1c';
const PAGES_MAX = 10;

export const dynamic = 'force-dynamic';

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function api(token: string, chemin: string, methode = 'GET', corps?: any, version = 'v2'): Promise<Response> {
  return fetch(`https://api.clickup.com/api/${version}${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c.id === id);
const fichiers = (t: any, id: string): string[] => {
  const v = champ(t, id)?.value;
  return (Array.isArray(v) ? v : v ? [v] : []).map((f: any) => String(f?.title || f?.name || f?.extension || 'fichier'));
};

type Option = { id: string; nom: string; orderindex: number };

async function lireListe(token: string) {
  const [resListe, resChamps] = await Promise.all([
    api(token, `/list/${PLANNING_CHANTIERS_ID}`),
    api(token, `/list/${PLANNING_CHANTIERS_ID}/field`),
  ]);
  const liste = resListe.ok ? await resListe.json().catch(() => ({})) : {};
  const champs = resChamps.ok ? await resChamps.json().catch(() => ({})) : {};
  const statuts: any[] = Array.isArray(liste?.statuses) ? liste.statuses : [];
  const f = (Array.isArray(champs?.fields) ? champs.fields : []).find((c: any) => c.id === CHAMP_RESERVES);
  const optionsReserves: Option[] = (f?.type_config?.options || []).map((o: any) => ({ id: String(o.id), nom: String(o.name || ''), orderindex: Number(o.orderindex) }));
  return {
    optionsReserves,
    enCours: statuts.find((s) => normal(s.status).includes('en cours')),
    realise: statuts.find((s) => normal(s.status).includes('realise')),
    termine: statuts.find((s) => normal(s.status).includes('termine')) || statuts.find((s) => s.type === 'closed'),
  };
}

function niveauReserves(t: any, options: Option[]): { option: Option | null; niveau: 'aucune' | 'mineure' | 'bloquante' | '' } {
  const v = champ(t, CHAMP_RESERVES)?.value;
  if (v === undefined || v === null || v === '') return { option: null, niveau: '' };
  const o = options.find((x) => x.orderindex === Number(v) || x.id === v) || null;
  const n = normal(o?.nom || '');
  return { option: o, niveau: n.includes('aucune') ? 'aucune' : n.includes('mineure') ? 'mineure' : n.includes('bloquante') ? 'bloquante' : '' };
}

const estReserve = (s: any) => normal(s?.name).includes('reserve');
const techniciens = (t: any): { id: number; nom: string }[] => {
  const v = champ(t, CHAMP_TECHNICIEN)?.value;
  return (Array.isArray(v) ? v : []).filter((u: any) => u?.id).map((u: any) => ({ id: Number(u.id), nom: String(u.username || u.email || '') }));
};
const ecritureAutorisee = (t: any) => process.env.VERCEL_ENV === 'production' || normal(t?.name).trim().startsWith('test');

function decrire(t: any, sousTaches: any[], options: Option[]) {
  const pv = fichiers(t, CHAMP_PV);
  const photos = fichiers(t, CHAMP_PHOTOS);
  const r = niveauReserves(t, options);
  const reserves = sousTaches.filter(estReserve).map((s) => ({
    id: String(s.id),
    nom: String(s.name || ''),
    responsables: (Array.isArray(s.assignees) ? s.assignees : []).map((a: any) => String(a?.username || a?.email || '')).filter(Boolean),
    echeance: s.due_date ? Number(s.due_date) : null,
    faite: ['done', 'closed'].includes(String(s?.status?.type || '')),
  }));
  const incompletes = reserves.filter((x) => !x.responsables.length || !x.echeance).map((x) => x.nom);
  // Mêmes motifs de refus que la route de passage au Parc
  const motifs: string[] = [];
  if (!r.niveau) motifs.push('🧾 Réserves pas renseigné');
  if (r.niveau === 'bloquante') motifs.push('réserve 🔴 Bloquante : pas de mise en service');
  if (!pv.length) motifs.push('📂 PV Réception manquant');
  if (r.niveau === 'mineure' && !reserves.length) motifs.push('réserve mineure sans sous-tâche « 🔧 Réserve : … »');
  if (r.niveau === 'mineure' && incompletes.length) motifs.push(`réserve sans responsable ou sans échéance (${incompletes.join(', ')})`);
  return {
    id: String(t.id),
    nom: String(t.name || ''),
    statut: String(t?.status?.status || ''),
    couleurStatut: String(t?.status?.color || ''),
    url: String(t.url || `https://app.clickup.com/t/${t.id}`),
    pv,
    photos,
    techniciens: techniciens(t).map((u) => u.nom).filter(Boolean),
    reservesOptionId: r.option?.id ?? null,
    niveau: r.niveau,
    reserves,
    motifs,
    avertissements: photos.length ? [] : ['📸 Pas de photos chantier : utiles pour le SAV'],
    ecritureAutorisee: ecritureAutorisee(t),
    // Envoyé au chargé d'opération : ✅ réalisé et complet
    envoye: normal(t?.status?.status).includes('realise') && motifs.length === 0,
  };
}

async function lireChantier(token: string, id: string) {
  const res = await api(token, `/task/${encodeURIComponent(id)}?include_subtasks=true`);
  return res.ok ? res.json() : null;
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  try {
    const l = await lireListe(token);
    const role = new URL(request.url).searchParams.get('role') === 'charge' ? 'charge' : 'poseur';
    const ids = new Set((role === 'charge' ? [l.realise?.id] : [l.enCours?.id, l.realise?.id]).filter(Boolean).map(String));
    const toutes: any[] = [];
    for (let page = 0; page < PAGES_MAX; page++) {
      const res = await api(token, `/list/${PLANNING_CHANTIERS_ID}/task?archived=false&include_closed=false&subtasks=true&page=${page}`);
      if (!res.ok) {
        if (page === 0) return NextResponse.json({ error: `ClickUp a refusé la lecture du planning (${res.status})` }, { status: 502 });
        break;
      }
      const json = await res.json().catch(() => ({}));
      const lot: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
      toutes.push(...lot);
      if (json?.last_page !== false || lot.length === 0) break;
    }
    const chantiers = toutes
      .filter((t) => !t.parent && ids.has(String(t?.status?.id)))
      .map((t) => decrire(t, toutes.filter((s) => String(s.parent) === String(t.id)), l.optionsReserves));
    return NextResponse.json({ chantiers, optionsReserves: l.optionsReserves, preview: process.env.VERCEL_ENV !== 'production' });
  } catch (error) {
    console.error('Erreur écran réception (lecture) :', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Fichier dans un champ Fichiers : dépôt sur le champ (v3), puis rattachement à la tâche (v2)
async function deposer(token: string, taskId: string, champId: string, fichier: File): Promise<string | null> {
  const form = new FormData();
  form.append('attachment', fichier, fichier.name || 'fichier');
  const res = await fetch(`https://api.clickup.com/api/v3/workspaces/${WORKSPACE_ID}/custom_fields/${champId}/attachments`, {
    method: 'POST', headers: { Authorization: token }, body: form, cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  const attachmentId = json?.id || json?.attachment?.id || json?.data?.id;
  if (!res.ok || !attachmentId) return `dépôt refusé (${res.status}${json?.err ? ` ${json.err}` : ''})`;
  const lien = await api(token, `/task/${taskId}/field/${champId}`, 'POST', { value: { add: [String(attachmentId)], rem: [] } });
  if (!lien.ok) return `rattachement au champ refusé (${lien.status})`;
  return null;
}

async function chantierEcrivable(token: string, taskId: string) {
  const tache = await lireChantier(token, taskId);
  if (!tache) return { erreur: 'Fiche introuvable', status: 404 } as const;
  if (tache.parent || String(tache?.list?.id ?? '') !== PLANNING_CHANTIERS_ID) return { erreur: 'Cette fiche n\'est pas un chantier du planning', status: 400 } as const;
  if (!ecritureAutorisee(tache)) return { erreur: 'En preview, seules les fiches « Test » sont modifiables', status: 403 } as const;
  return { tache } as const;
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  try {
    const l = await lireListe(token);
    const multipart = (request.headers.get('content-type') || '').includes('multipart/form-data');
    let idEcrit = '';

    if (multipart) {
      const form = await request.formData();
      const taskId = String(form.get('taskId') || '');
      const cible = String(form.get('cible') || '');
      const fichier = form.get('fichier');
      if (!taskId || !['pv', 'photos'].includes(cible) || !(fichier instanceof File)) {
        return NextResponse.json({ error: 'Envoi incomplet' }, { status: 400 });
      }
      const c = await chantierEcrivable(token, taskId);
      if ('erreur' in c) return NextResponse.json({ error: c.erreur }, { status: c.status });
      idEcrit = String(c.tache.id);
      const echec = await deposer(token, idEcrit, cible === 'pv' ? CHAMP_PV : CHAMP_PHOTOS, fichier);
      if (echec) return NextResponse.json({ error: `Fichier non enregistré : ${echec}` }, { status: 502 });
    } else {
      const corps = await request.json().catch(() => ({}));
      const taskId = String(corps?.taskId || '');
      const action = String(corps?.action || '');
      if (!taskId || !['reserves', 'reserve_ajout', 'envoyer', 'terminer'].includes(action)) {
        return NextResponse.json({ error: 'Demande incomplète' }, { status: 400 });
      }
      const c = await chantierEcrivable(token, taskId);
      if ('erreur' in c) return NextResponse.json({ error: c.erreur }, { status: c.status });
      const id = String(c.tache.id);
      idEcrit = id;

      if (action === 'reserves') {
        const optionId = String(corps?.optionId || '');
        if (!l.optionsReserves.some((o) => o.id === optionId)) return NextResponse.json({ error: 'Valeur inconnue' }, { status: 400 });
        const res = await api(token, `/task/${id}/field/${CHAMP_RESERVES}`, 'POST', { value: optionId });
        if (!res.ok) return NextResponse.json({ error: `ClickUp a refusé la modification (${res.status})` }, { status: 502 });
      } else if (action === 'reserve_ajout') {
        const libelle = String(corps?.libelle || '').trim().slice(0, 200);
        const m = String(corps?.echeance || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!libelle || !m) return NextResponse.json({ error: 'Il faut un libellé et une échéance' }, { status: 400 });
        let responsables = techniciens(c.tache).map((u) => u.id);
        if (!responsables.length) {
          const session = await sessionDeRequete(request);
          if (!session?.id) return NextResponse.json({ error: 'Session expirée : reconnecte-toi' }, { status: 401 });
          responsables = [session.id];
        }
        const res = await api(token, `/list/${PLANNING_CHANTIERS_ID}/task`, 'POST', {
          name: `🔧 Réserve : ${libelle}`,
          parent: id,
          assignees: responsables,
          due_date: Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 10),
          due_date_time: false,
        });
        if (!res.ok) return NextResponse.json({ error: `La réserve n'a pas pu être créée (${res.status})` }, { status: 502 });
      } else if (action === 'envoyer') {
        const sousTaches = Array.isArray(c.tache.subtasks) ? c.tache.subtasks : [];
        const avant = decrire(c.tache, sousTaches, l.optionsReserves);
        if (avant.motifs.length) return NextResponse.json({ error: `Pas encore envoyable : ${avant.motifs.join(' ; ')}`, chantier: avant }, { status: 409 });
        if (!l.realise) return NextResponse.json({ error: 'Statut ✅ réalisé introuvable dans le planning' }, { status: 500 });
        if (String(c.tache?.status?.id) !== String(l.realise.id)) {
          const res = await api(token, `/task/${id}`, 'PUT', { status: l.realise.status });
          if (!res.ok) return NextResponse.json({ error: `Changement de statut refusé (${res.status})` }, { status: 502 });
        }
        const session = await sessionDeRequete(request);
        const par = avant.techniciens.join(', ') || session?.nom || 'le poseur';
        const reserves = avant.niveau === 'mineure' ? `${avant.reserves.length} réserve${avant.reserves.length > 1 ? 's' : ''} mineure${avant.reserves.length > 1 ? 's' : ''}` : 'aucune réserve';
        await alerter(token, id, `📋 Réception à valider : PV et ${avant.photos.length} photo${avant.photos.length > 1 ? 's' : ''} déposés par ${par}, ${reserves}. Contrôle et valide dans l'appli (Valider les réceptions).`);
      } else {
        const sousTaches = Array.isArray(c.tache.subtasks) ? c.tache.subtasks : [];
        const avant = decrire(c.tache, sousTaches, l.optionsReserves);
        if (avant.motifs.length) return NextResponse.json({ error: `Réception impossible : ${avant.motifs.join(' ; ')}`, chantier: avant }, { status: 409 });
        if (!l.termine) return NextResponse.json({ error: 'Statut 🏁 terminé introuvable dans le planning' }, { status: 500 });
        const res = await api(token, `/task/${id}`, 'PUT', { status: l.termine.status });
        if (!res.ok) return NextResponse.json({ error: `Changement de statut refusé (${res.status})` }, { status: 502 });
        return NextResponse.json({ success: true, termine: true, chantier: null });
      }
    }

    const relue = await lireChantier(token, idEcrit);
    const chantier = relue ? decrire(relue, Array.isArray(relue.subtasks) ? relue.subtasks : [], l.optionsReserves) : null;
    return NextResponse.json({ success: true, chantier });
  } catch (error) {
    console.error('Erreur écran réception (écriture) :', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
