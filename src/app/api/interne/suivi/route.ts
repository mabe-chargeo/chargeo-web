import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { LISTES } from '@/lib/espaces';
import { SUIVIS, VALIDE_PAR, type DefAction, type DefChamp, type DefSuivi, type SourceSuivi } from '@/lib/suivi';

// Suivi d'une commande de matériel ou d'un dossier ADVENIR depuis la fiche de l'application (19/10/2026, maquette
// MAQUETTE_SUIVI-COMMANDE-ADVENIR_2026-10-19_v2.png validée par Matthieu à 11 h 03). Champs, étapes et boutons :
// src/lib/suivi.ts. Même façon de faire que /api/interne/vente (lecture, écriture champ par champ, trace en commentaire).
// GET ?id=<tâche> : champs de l'étape avec leur valeur, boutons de l'étape (avec ce qui manque), validation de l'achat.
// POST { id, action: 'champs', valeurs: { <cle>: <valeur> } } : champs écrits (valeur vide = champ vidé), trace.
// POST { id, action: 'valider' } : 👤 Validé par = la personne connectée (direction seulement, commande à commander).
// POST { id, action: 'statut', cible } : seulement un bouton de l'étape actuelle, et seulement si rien ne manque
//   (« commandé » demande l'achat validé et la date de livraison prévue, comme le garde-fou de la liste). Nom du statut
//   relu dans la liste. Les suites (garde-fous, alertes) partent comme un changement fait dans ClickUp.
// Droits : src/lib/suivi.ts (commandes : chef de chantier, back-office, direction ; ADVENIR : back-office, direction).
// En preview, seules les tâches avec « Test » dans le nom sont modifiées.

export const dynamic = 'force-dynamic';
const API = 'https://api.clickup.com/api/v2';
const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const texte = (v: unknown, max = 200) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const champsDe = (t: any): any[] => (Array.isArray(t?.custom_fields) ? t.custom_fields : []);
const champ = (t: any, c: { id: string; mot: string }): any | null =>
  champsDe(t).find((f) => f.id === c.id) || champsDe(t).find((f) => normal(f?.name).includes(c.mot)) || null;
const optionsDe = (f: any): { id: string; nom: string; ordre: number }[] =>
  (Array.isArray(f?.type_config?.options) ? f.type_config.options : []).map((o: any) => ({ id: String(o?.id), nom: String(o?.name ?? o?.label ?? ''), ordre: Number(o?.orderindex) }));
const jourParis = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const jourDe = (ms: unknown): string => {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? jourParis(new Date(n)) : '';
};
const ecart = (de: string, a: string) => Math.round((Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)) - Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10))) / 86400000);
const francais = (j: string) => (j ? `${j.slice(8, 10)}/${j.slice(5, 7)}/${j.slice(0, 4)}` : '');

function valeurDe(f: any, c: DefChamp): string {
  const v = f?.value;
  if (v === undefined || v === null || v === '') return '';
  if (c.genre === 'choix') return optionsDe(f).find((o) => o.id === String(v) || o.ordre === Number(v))?.nom || '';
  if (c.genre === 'date') return jourDe(v);
  if (c.genre === 'nombre') { const n = Number(v); return Number.isFinite(n) ? String(n) : ''; }
  return texte(v, 500);
}
const personnes = (f: any): string[] => (Array.isArray(f?.value) ? f.value : []).map((u: any) => String(u?.username || u?.email || '').trim()).filter(Boolean);

// Ce qui manque pour un bouton (null = rien)
function manqueDe(a: DefAction, def: DefSuivi, t: any): string | null {
  const parts: string[] = [];
  if (a.valide && !personnes(champ(t, VALIDE_PAR)).length) parts.push('l’achat validé (direction)');
  for (const cle of a.exige || []) {
    const c = def.champs.find((x) => x.cle === cle);
    if (c && !valeurDe(champ(t, c), c)) parts.push(`« ${c.libelle} »`);
  }
  return parts.length ? `Il faut ${parts.join(' et ')}.` : null;
}

// Aide sous un champ : livraison prévue dépassée, jours avant la date limite ADVENIR
function aideDe(def: DefSuivi, c: DefChamp, valeur: string, etat: string, auj: string): { texte: string; orange?: boolean } | undefined {
  if (!valeur || def.fermes.includes(etat)) return undefined;
  if (def.source === 'commandes' && c.cle === 'livraison' && (etat === 'commande' || etat === 'en-livraison') && valeur < auj) {
    return { texte: 'Livraison prévue dépassée : décale la date si le fournisseur en a donné une nouvelle.', orange: true };
  }
  if (def.source === 'advenir' && c.cle === 'limite') {
    const n = ecart(auj, valeur);
    if (n < 0) return { texte: `Date limite dépassée de ${-n} jour${n < -1 ? 's' : ''}.`, orange: true };
    return { texte: n === 0 ? 'C’est aujourd’hui.' : `Dans ${n} jour${n > 1 ? 's' : ''}.`, orange: n <= 30 };
  }
  return undefined;
}

function etatPublic(def: DefSuivi, t: any, roles: string[]) {
  const statut = String(t?.status?.status || '');
  const etat = def.etat(normal(statut));
  const auj = jourParis(new Date());
  const champs = def.champs.filter((c) => !c.etats || c.etats.includes(etat)).map((c) => {
    const f = champ(t, c);
    const valeur = valeurDe(f, c);
    return {
      cle: c.cle, libelle: c.libelle, genre: c.genre, exemple: c.exemple, valeur, absent: !f,
      options: c.genre === 'choix' ? optionsDe(f).map((o) => o.nom) : undefined,
      aide: aideDe(def, c, valeur, etat, auj),
    };
  });
  const actions = (def.actions[etat] || []).map((a) => ({ cible: a.cible, libelle: a.libelle, principal: !!a.principal, confirmer: a.confirmer, manque: manqueDe(a, def, t) }));
  const validation = def.source === 'commandes'
    ? { par: personnes(champ(t, VALIDE_PAR)).join(', '), peutValider: roles.includes('direction') && etat === 'a-commander' }
    : null;
  return {
    source: def.source, titre: def.titre, titreSuite: def.titreSuite, enregistrer: def.enregistrer, enregistre: def.enregistre,
    statut, close: def.fermes.includes(etat) ? def.close : '', champs, actions, validation,
  };
}

async function lire(token: string, id: string): Promise<any | null> {
  if (!/^[a-z0-9]+$/i.test(id)) return null;
  const r = await fetch(`${API}/task/${encodeURIComponent(id)}`, { headers: { Authorization: token }, cache: 'no-store' });
  return r.ok ? r.json().catch(() => null) : null;
}
const sourceDe = (t: any): SourceSuivi | null =>
  (Object.keys(SUIVIS) as SourceSuivi[]).find((s) => String(t?.list?.id || '') === LISTES[s]) || null;

async function ouvrir(request: Request, token: string, id: string) {
  const session = await sessionDeRequete(request);
  if (!session?.id) return { ok: false as const, reponse: json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401) };
  const t = await lire(token, id);
  if (!t) return { ok: false as const, reponse: json({ success: false, error: 'Fiche introuvable' }, 404) };
  const source = sourceDe(t);
  if (!source) return { ok: false as const, reponse: json({ success: false, error: 'Ni une commande de matériel, ni un dossier ADVENIR' }, 400) };
  const def = SUIVIS[source];
  const roles = ((await rolesDe(token, session.id).catch(() => [])) as string[]).map(String);
  if (!def.roles.some((r) => roles.includes(r))) return { ok: false as const, reponse: json({ success: false, error: 'Suivi réservé à d’autres rôles.' }, 403) };
  return { ok: true as const, session, t, def, roles };
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
  const o = await ouvrir(request, token, texte(new URL(request.url).searchParams.get('id'), 30));
  if (!o.ok) return o.reponse;
  return json({ success: true, ...etatPublic(o.def, o.t, o.roles) });
}

export async function POST(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
  try {
    const corps = await request.json().catch(() => ({}));
    const o = await ouvrir(request, token, texte(corps?.id, 30));
    if (!o.ok) return o.reponse;
    const { t, def, roles } = o;
    const preview = process.env.VERCEL_ENV !== 'production';
    if (preview && !/\btest\b/i.test(String(t?.name || ''))) return json({ success: false, error: 'En preview, seules les fiches de test (avec « Test » dans le nom) peuvent être modifiées.' }, 403);
    const auteur = texte((o.session as any).nom) || texte((o.session as any).email) || 'CHARGéO';
    const tid = encodeURIComponent(String(t.id));
    const ecrire = (id: string, valeur: any) => fetch(`${API}/task/${tid}/field/${id}`, { method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify({ value: valeur }), cache: 'no-store' });
    const vider = (id: string) => fetch(`${API}/task/${tid}/field/${id}`, { method: 'DELETE', headers: { Authorization: token }, cache: 'no-store' });
    const commenter = (lignes: string[]) => fetch(`${API}/task/${tid}/comment`, { method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify({ comment_text: lignes.filter(Boolean).join('\n'), notify_all: false }), cache: 'no-store' }).catch(() => null);
    const relire = async () => etatPublic(def, (await lire(token, String(t.id))) || t, roles);
    const action = texte(corps?.action, 20);
    const etat = def.etat(normal(t?.status?.status));

    // Champs de la carte « La commande » / « Le dossier »
    if (action === 'champs') {
      const valeurs = corps?.valeurs && typeof corps.valeurs === 'object' ? corps.valeurs : {};
      const faits: string[] = [];
      const rates: string[] = [];
      for (const c of def.champs.filter((x) => x.cle in valeurs)) {
        const f = champ(t, c);
        if (!f) { rates.push(`${c.libelle} (champ absent de la liste)`); continue; }
        const brut = texte(valeurs[c.cle], 500);
        let r: Response | null = null;
        let lu = brut;
        if (!brut) r = await vider(f.id);
        else if (c.genre === 'choix') {
          const opt = optionsDe(f).find((x) => normal(x.nom) === normal(brut));
          if (!opt) { rates.push(`${c.libelle} « ${brut} » inconnu`); continue; }
          r = await ecrire(f.id, opt.id);
        } else if (c.genre === 'date') {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(brut)) { rates.push(`${c.libelle} invalide`); continue; }
          const [y, m, j] = brut.split('-').map(Number);
          r = await ecrire(f.id, Date.UTC(y, m - 1, j, 10));
          lu = francais(brut);
        } else if (c.genre === 'nombre') {
          const n = Number(brut.replace(',', '.').replace(/\s/g, ''));
          if (!Number.isFinite(n) || n < 0) { rates.push(`${c.libelle} invalide`); continue; }
          r = await ecrire(f.id, n);
          lu = String(n);
        } else if (c.genre === 'url') {
          if (!/^https?:\/\/\S+$/i.test(brut)) { rates.push(`${c.libelle} : colle le lien complet (https://…)`); continue; }
          r = await ecrire(f.id, brut);
        } else r = await ecrire(f.id, brut.slice(0, 120));
        if (r && r.ok) faits.push(brut ? `${c.libelle} ${lu}` : `${c.libelle} vidé`);
        else rates.push(c.libelle);
      }
      if (faits.length) await commenter([`✏️ ${def.titre} mise à jour depuis l'application par ${auteur} : ${faits.join(', ')}.`, rates.length ? `⚠️ Non enregistré : ${rates.join(', ')}.` : '']);
      return json({ success: !rates.length, faits, rates, error: rates.length ? `Non enregistré : ${rates.join(', ')}.` : undefined, ...(await relire()) }, rates.length && !faits.length ? 400 : 200);
    }

    // Validation de l'achat (commande à commander, direction)
    if (action === 'valider') {
      if (def.source !== 'commandes' || etat !== 'a-commander') return json({ success: false, error: 'La validation de l’achat se fait sur une commande à commander.' }, 400);
      if (!roles.includes('direction')) return json({ success: false, error: 'La validation de l’achat est réservée à la direction.' }, 403);
      const f = champ(t, VALIDE_PAR);
      if (!f) return json({ success: false, error: 'Le champ 👤 Validé par est absent de cette liste' }, 500);
      const r = await ecrire(f.id, { add: [Number(o.session.id)], rem: [] });
      if (!r.ok) return json({ success: false, error: `ClickUp a refusé la validation (${r.status})` }, 502);
      await commenter([`✅ Achat validé depuis l'application par ${auteur}.`]);
      return json({ success: true, ...(await relire()) });
    }

    // Suite : statut de l'étape suivante
    if (action === 'statut') {
      const cible = texte(corps?.cible, 30);
      const a = (def.actions[etat] || []).find((x) => x.cible === cible);
      if (!a) return json({ success: false, error: `Pas possible depuis « ${String(t?.status?.status || '')} ».` }, 400);
      const manque = manqueDe(a, def, t);
      if (manque) return json({ success: false, error: manque }, 400);
      const rl = await fetch(`${API}/list/${encodeURIComponent(String(t?.list?.id || ''))}`, { headers: { Authorization: token }, cache: 'no-store' });
      const jl = rl.ok ? await rl.json().catch(() => ({})) : {};
      const nomStatut = String((Array.isArray(jl?.statuses) ? jl.statuses : []).find((s: any) => def.etat(normal(s?.status)) === cible)?.status || '');
      if (!nomStatut) return json({ success: false, error: `Statut « ${a.libelle} » introuvable dans la liste` }, 500);
      const r = await fetch(`${API}/task/${tid}`, { method: 'PUT', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nomStatut }), cache: 'no-store' });
      if (!r.ok) return json({ success: false, error: `ClickUp a refusé le statut (${r.status})` }, 502);
      await commenter([`${nomStatut} : passé depuis l'application par ${auteur}.`]);
      return json({ success: true, ...(await relire()) });
    }

    return json({ success: false, error: 'Action inconnue' }, 400);
  } catch (e) {
    console.error('Suivi (écriture)', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}
