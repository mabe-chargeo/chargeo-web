import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { lireTacheQualification } from '@/lib/listesClickUp';
import { estScenarioOuRetenu, PREFIXE_RETENU } from '@/lib/scenarioRetenu';

// Vente depuis la fiche affaire (18/10/2026, 12 h, Matthieu : « je n'ai aucun emplacement pour renseigner la zone de
// déplacement et ensuite comment je fais pour passer la fiche en devis envoyé ? », puis « Construis les deux »).
// GET ?id=<fiche> : valeurs du projet (🚚 Zone Déplacement, 🅿️ Nb Places Parking, 🏛️ SIRET / N° RNIC, 🏛️ Date dépôt permis),
//   options des zones et des motifs de refus, statut de la fiche, scénarios avec leur 🔗 Lien devis.
// POST { id, action: 'projet', zone?, places?, siret?, permis? } : champs écrits (valeur vide = champ vidé), trace.
// POST { id, action: 'lien', scenarioId, lien } : 🔗 Lien devis du scénario (18/10, 12 h 25 : l'alerte demandait de coller
//   le lien du devis mais l'appli n'avait pas d'endroit pour le faire).
// POST { id, action: 'statut', statut: 'envoye' | 'negociation' | 'gagne' | 'perdu', motif?, retenu? } : statut de la fiche
//   (nom relu dans la liste), ⛔ Motif Refus obligatoire pour perdu, trace. Au gagné, le scénario retenu (choisi dans
//   la page, ou le seul qui a un lien) donne son lien au 🔗 Lien devis de la fiche AVANT le changement de statut : c'est
//   le choix manuel lu par src/lib/scenarioRetenu.ts. Sans aucun lien de devis, le gagné est refusé ici (au lieu d'être
//   bloqué après coup par une alerte). Les suites (relance J+3 et montant au devis envoyé, scénario retenu, acompte et
//   Planning au gagné) partent de l'aiguillage, comme un changement fait dans ClickUp.
// Droits : commercial et direction. Fiche de la Qualification de l'environnement (🧪 TEST en preview) ; en preview,
// seules les fiches avec « Test » dans le nom sont modifiées. L'envoi du devis par email viendra plus tard.
// Champs trouvés par leur identifiant, sinon par leur nom. Menus déroulants écrits par l'identifiant de l'option.

export const dynamic = 'force-dynamic';
const API = 'https://api.clickup.com/api/v2';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const texte = (v: unknown, max = 200) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const AUTORISES = ['direction', 'commercial'];

const CHAMPS = {
  zone: { id: '0f9043bf-ec87-4534-b8ea-af41734bdfed', mot: 'zone deplacement' },
  places: { id: 'dd19d42f-8d9f-4657-bac5-942de6822468', mot: 'places parking' },
  siret: { id: 'f840aa7d-0a85-4618-9e13-620c156355ed', mot: 'siret' },
  permis: { id: '39fa76fa-544d-4e0e-81ab-94822296cf85', mot: 'depot permis' },
  motif: { id: '77c78303-5c76-4b5c-874d-e811be2d4e38', mot: 'motif refus' },
  lien: { id: 'ae80f202-2ef3-4302-b778-f36075ee398f', mot: 'lien devis' },
};
type CleChamp = keyof typeof CHAMPS;
const STATUTS: Record<string, { mot: string; libelle: string }> = {
  envoye: { mot: 'devis envoy', libelle: '📩 devis envoyé' },
  negociation: { mot: 'negociation', libelle: '🔥 en négociation' },
  gagne: { mot: 'gagn', libelle: '🏆 gagné' },
  perdu: { mot: 'perdu', libelle: '❌ perdu' },
};

const champsDe = (t: any): any[] => (Array.isArray(t?.custom_fields) ? t.custom_fields : []);
function champ(t: any, cle: CleChamp): any | null {
  const c = CHAMPS[cle];
  return champsDe(t).find((f) => f.id === c.id) || champsDe(t).find((f) => normal(f?.name).includes(c.mot)) || null;
}
const optionsDe = (f: any): { id: string; nom: string; ordre: number }[] =>
  (Array.isArray(f?.type_config?.options) ? f.type_config.options : []).map((o: any) => ({ id: String(o?.id), nom: String(o?.name ?? o?.label ?? ''), ordre: Number(o?.orderindex) }));
function optionChoisie(f: any): string {
  const v = f?.value;
  if (v === undefined || v === null || v === '') return '';
  return optionsDe(f).find((o) => o.id === String(v) || o.ordre === Number(v))?.nom || '';
}
// « 💸 Trop cher / Budget » et « Trop cher / Budget » se valent
const sansEmoji = (s: string) => normal(s).replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const jourDe = (ms: unknown): string => {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(n));
};

async function autoriser(request: Request, token: string) {
  const session = await sessionDeRequete(request);
  if (!session?.id) return { ok: false as const, reponse: json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401) };
  const roles = await rolesDe(token, session.id);
  if (!AUTORISES.some((r) => (roles as string[]).includes(r))) return { ok: false as const, reponse: json({ success: false, error: 'La vente est réservée au commercial et à la direction.' }, 403) };
  return { ok: true as const, session };
}

type Scenario = { id: string; nom: string; statut: string; lien: string; retenu: boolean; tache: any };
// Scénarios directs de la fiche (pas les éléments), lus un par un pour avoir leurs champs
async function scenariosDe(fiche: any, token: string): Promise<Scenario[]> {
  const fid = String(fiche?.id || '');
  const sous = (Array.isArray(fiche?.subtasks) ? fiche.subtasks : [])
    .filter((s: any) => (!s?.parent || String(s.parent) === fid) && !s?.archived && estScenarioOuRetenu(String(s?.name || '')));
  const sortie: Scenario[] = [];
  for (const s of sous) {
    const r = await fetch(`${API}/task/${encodeURIComponent(String(s.id))}`, { headers: { Authorization: token }, cache: 'no-store' });
    const t = r.ok ? await r.json().catch(() => null) : null;
    const nom = String(t?.name || s?.name || '');
    sortie.push({ id: String(s.id), nom, statut: String(t?.status?.status || s?.status?.status || ''), lien: texte(champ(t || s, 'lien')?.value, 500), retenu: nom.startsWith(PREFIXE_RETENU), tache: t || s });
  }
  return sortie;
}
const publics = (l: Scenario[]) => l.map(({ tache, ...s }) => s);

function etat(t: any) {
  const z = champ(t, 'zone');
  const m = champ(t, 'motif');
  const p = champ(t, 'places');
  const placesBrut = p?.value;
  return {
    statut: String(t?.status?.status || ''),
    zone: optionChoisie(z),
    zones: optionsDe(z).map((o) => o.nom),
    places: placesBrut === undefined || placesBrut === null || placesBrut === '' ? null : Number(placesBrut),
    siret: texte(champ(t, 'siret')?.value, 60),
    permis: jourDe(champ(t, 'permis')?.value),
    motif: optionChoisie(m),
    motifs: optionsDe(m).map((o) => o.nom),
    lienFiche: texte(champ(t, 'lien')?.value, 500),
    manquants: (Object.keys(CHAMPS) as CleChamp[]).filter((k) => !champ(t, k)),
  };
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
  const a = await autoriser(request, token);
  if (!a.ok) return a.reponse;
  const lu = await lireTacheQualification(texte(new URL(request.url).searchParams.get('id'), 30), token, { sousTaches: true });
  if (!lu.ok) return json({ success: false, error: lu.erreur }, lu.status);
  if (lu.tache?.parent) return json({ success: false, error: 'Ouvre la fiche principale, pas un scénario' }, 400);
  const scenarios = publics(await scenariosDe(lu.tache, token));
  return json({ success: true, preview: process.env.VERCEL_ENV !== 'production', ...etat(lu.tache), scenarios });
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
  const a = await autoriser(request, token);
  if (!a.ok) return a.reponse;
  const auteur = texte((a.session as any).nom) || texte((a.session as any).email) || 'CHARGéO';
  const preview = process.env.VERCEL_ENV !== 'production';
  try {
    const corps = await request.json().catch(() => ({}));
    const lu = await lireTacheQualification(texte(corps?.id, 30), token, { sousTaches: true });
    if (!lu.ok) return json({ success: false, error: lu.erreur }, lu.status);
    const t = lu.tache;
    if (t?.parent) return json({ success: false, error: 'Ouvre la fiche principale, pas un scénario' }, 400);
    if (preview && !/\btest\b/i.test(String(t?.name || ''))) return json({ success: false, error: 'En preview, seules les fiches de test (avec « Test » dans le nom) peuvent être modifiées.' }, 403);
    const tid = encodeURIComponent(String(t.id));
    const ecrireSur = (tache: string, id: string, valeur: any) => fetch(`${API}/task/${encodeURIComponent(tache)}/field/${id}`, { method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify({ value: valeur }), cache: 'no-store' });
    const viderSur = (tache: string, id: string) => fetch(`${API}/task/${encodeURIComponent(tache)}/field/${id}`, { method: 'DELETE', headers: { Authorization: token }, cache: 'no-store' });
    const ecrire = (id: string, valeur: any) => ecrireSur(String(t.id), id, valeur);
    const vider = (id: string) => viderSur(String(t.id), id);
    const commenter = (lignes: string[]) => fetch(`${API}/task/${tid}/comment`, { method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify({ comment_text: lignes.filter(Boolean).join('\n'), notify_all: false }), cache: 'no-store' }).catch(() => null);
    const action = texte(corps?.action, 20);

    // Le projet : zone, places, SIRET / RNIC, date de dépôt du permis
    if (action === 'projet') {
      const faits: string[] = [];
      const rates: string[] = [];
      const pas = async (libelle: string, f: any, r: Promise<Response> | null) => {
        if (!f) { rates.push(`${libelle} (champ absent de la liste)`); return; }
        if (!r) return;
        const res = await r;
        if (res.ok) faits.push(libelle); else rates.push(libelle);
      };
      if ('zone' in corps) {
        const f = champ(t, 'zone');
        const nom = texte(corps.zone, 10);
        const o = f ? optionsDe(f).find((x) => normal(x.nom) === normal(nom)) : undefined;
        if (nom && f && !o) rates.push(`zone « ${nom} » inconnue`);
        else await pas(nom ? `zone ${nom}` : 'zone vidée', f, f ? (nom ? ecrire(f.id, o!.id) : vider(f.id)) : null);
      }
      if ('places' in corps) {
        const f = champ(t, 'places');
        const brut = corps.places;
        const n = brut === null || brut === '' || brut === undefined ? null : Math.round(Number(brut));
        if (n !== null && (!Number.isFinite(n) || n < 0 || n > 5000)) rates.push('nombre de places invalide');
        else await pas(n === null ? 'places vidées' : `${n} places`, f, f ? (n === null ? vider(f.id) : ecrire(f.id, n)) : null);
      }
      if ('siret' in corps) {
        const f = champ(t, 'siret');
        const s = texte(corps.siret, 40);
        await pas(s ? `SIRET / RNIC ${s}` : 'SIRET / RNIC vidé', f, f ? (s ? ecrire(f.id, s) : vider(f.id)) : null);
      }
      if ('permis' in corps) {
        const f = champ(t, 'permis');
        const d = /^\d{4}-\d{2}-\d{2}$/.test(texte(corps.permis, 10)) ? texte(corps.permis, 10) : '';
        if (texte(corps.permis, 10) && !d) rates.push('date du permis invalide');
        else {
          const [y, m, j] = d ? d.split('-').map(Number) : [0, 0, 0];
          await pas(d ? `permis déposé le ${j}/${m}/${y}` : 'date du permis vidée', f, f ? (d ? ecrire(f.id, Date.UTC(y, m - 1, j, 10)) : vider(f.id)) : null);
        }
      }
      if (faits.length) await commenter([`🏗️ Projet mis à jour depuis l'application par ${auteur} : ${faits.join(', ')}.`, rates.length ? `⚠️ Non enregistré : ${rates.join(', ')}.` : '']);
      const relu = await lireTacheQualification(String(t.id), token, { sousTaches: true });
      const scenarios = relu.ok ? publics(await scenariosDe(relu.tache, token)) : [];
      return json({ success: !rates.length, faits, rates, preview, ...(relu.ok ? { ...etat(relu.tache), scenarios } : {}) }, rates.length && !faits.length ? 400 : 200);
    }

    // Lien du devis d'un scénario
    if (action === 'lien') {
      const sid = texte(corps?.scenarioId, 30);
      const lien = texte(corps?.lien, 500);
      if (lien && !/^https?:\/\/\S+$/i.test(lien)) return json({ success: false, error: 'Colle le lien complet du devis (il commence par https://).' }, 400);
      const scenarios = await scenariosDe(t, token);
      const sc = scenarios.find((s) => s.id === sid);
      if (!sc) return json({ success: false, error: 'Scénario introuvable sur cette fiche' }, 404);
      const f = champ(sc.tache, 'lien');
      if (!f) return json({ success: false, error: 'Le champ 🔗 Lien devis est absent de cette liste' }, 500);
      const r = lien ? await ecrireSur(sc.id, f.id, lien) : await viderSur(sc.id, f.id);
      if (!r.ok) return json({ success: false, error: `ClickUp a refusé le lien (${r.status})` }, 502);
      await commenter([lien ? `🔗 Lien du devis du ${sc.nom} collé depuis l'application par ${auteur} : ${lien}` : `🔗 Lien du devis du ${sc.nom} retiré depuis l'application par ${auteur}.`]);
      const relu = await lireTacheQualification(String(t.id), token, { sousTaches: true });
      return json({ success: true, scenarios: relu.ok ? publics(await scenariosDe(relu.tache, token)) : publics(scenarios) });
    }

    // Suite de la vente : statut de la fiche
    if (action === 'statut') {
      const cle = texte(corps?.statut, 20);
      const cible = STATUTS[cle];
      if (!cible) return json({ success: false, error: 'Statut inconnu' }, 400);
      const actuel = normal(t?.status?.status);
      if (actuel.includes('visiter')) return json({ success: false, error: 'Le relevé n’est pas encore fait : la fiche est à visiter.' }, 400);
      if (actuel.includes(cible.mot)) return json({ success: false, error: `La fiche est déjà en « ${String(t?.status?.status || '')} ».` }, 400);
      if (actuel.includes('gagn') || actuel.includes('perdu') || actuel.includes('archiv')) return json({ success: false, error: `La vente est close (${String(t?.status?.status || '')}).` }, 400);
      // Nom exact du statut dans la liste
      const rl = await fetch(`${API}/list/${encodeURIComponent(String(t?.list?.id || ''))}`, { headers: { Authorization: token }, cache: 'no-store' });
      const jl = rl.ok ? await rl.json().catch(() => ({})) : {};
      const nomStatut = String((Array.isArray(jl?.statuses) ? jl.statuses : []).find((s: any) => normal(s?.status).includes(cible.mot))?.status || '');
      if (!nomStatut) return json({ success: false, error: `Statut « ${cible.libelle} » introuvable dans la liste` }, 500);
      let motif = '';
      if (cle === 'perdu') {
        const f = champ(t, 'motif');
        const demande = sansEmoji(texte(corps?.motif, 80));
        const o = f ? optionsDe(f).find((x) => sansEmoji(x.nom) === demande) : undefined;
        if (!o) return json({ success: false, error: 'Choisis le motif de refus' }, 400);
        const r = await ecrire(f.id, o.id);
        if (!r.ok) return json({ success: false, error: `ClickUp a refusé le motif (${r.status})` }, 502);
        motif = o.nom;
      }
      // Gagné : scénario retenu → son lien de devis sur la fiche, avant le statut
      let retenuNom = '';
      if (cle === 'gagne') {
        const aTrancher = (await scenariosDe(t, token)).filter((s) => !s.retenu);
        if (aTrancher.length) {
          const avecLien = aTrancher.filter((s) => s.lien);
          if (!avecLien.length) return json({ success: false, error: 'Colle d’abord le lien du devis du scénario retenu (« Devis des scénarios », juste au-dessus).' }, 400);
          const demande = texte(corps?.retenu, 30);
          const choisi = avecLien.find((s) => s.id === demande) || (avecLien.length === 1 && !demande ? avecLien[0] : undefined);
          if (!choisi) return json({ success: false, error: 'Choisis le scénario retenu.' }, 400);
          const f = champ(t, 'lien');
          if (!f) return json({ success: false, error: 'Le champ 🔗 Lien devis est absent de cette liste' }, 500);
          if (texte(champ(t, 'lien')?.value, 500) !== choisi.lien) {
            const r = await ecrire(f.id, choisi.lien);
            if (!r.ok) return json({ success: false, error: `ClickUp a refusé le lien du devis retenu (${r.status})` }, 502);
          }
          retenuNom = choisi.nom;
        }
      }
      const r = await fetch(`${API}/task/${tid}`, { method: 'PUT', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nomStatut }), cache: 'no-store' });
      if (!r.ok) return json({ success: false, error: `ClickUp a refusé le statut (${r.status})` }, 502);
      await commenter([`${nomStatut} : passé depuis l'application par ${auteur}${motif ? `, motif ${motif}` : ''}${retenuNom ? `, scénario retenu : ${retenuNom}` : ''}.`]);
      return json({ success: true, statut: nomStatut, motif, retenu: retenuNom, preview });
    }

    return json({ success: false, error: 'Action inconnue' }, 400);
  } catch (e) {
    console.error('Vente (écriture)', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}
