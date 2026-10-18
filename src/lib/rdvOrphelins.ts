import { membresDuRole } from '@/lib/roles';
import { agendaBranche, ficheDeEvenement, nosEvenementsAVenir, retirerEvenement, retirerReleve } from '@/lib/googleAgenda';
import { dateVisiteDe } from '@/lib/vuesFiches';

// Rendez-vous Google devenus caducs (18/10/2026, 11 h 26, Matthieu : « tu n'as pas dit aussi que tu devais construire
// quelque chose quand la fiche calée est archivée ou perdue, son rendez-vous Google disparaît »). Cas vu le 18/10 :
// une fiche test archivée, son relevé du mardi 20 resté dans l'agenda du chef, et invisible dans Caler (l'appli ignore
// ses propres événements Google, qu'elle lit dans ClickUp).
// 1. Tout de suite (aiguillage, src/lib/aiguillage.ts) : fiche de Qualification passée à ❌ perdu ou 🏁 archivé → relevé
//    retiré de l'agenda Google des chefs de chantier, trace en commentaire. La date de visite reste sur la fiche
//    (historique).
//    18/10/2026, 22 h 05 (Matthieu : « quoi qu'il arrive la visite technique elle a eu lieu même si le devis après le
//    projet il est perdu et archivé ») : seul un relevé À VENIR est retiré. Relevé déjà passé (📅 Date Visite Technique
//    passée) : la visite a eu lieu, le rendez-vous reste dans l'agenda.
// 2. Chaque jour (contrôle quotidien, src/app/api/cron/quotidien) : nos événements à venir (releve…, pose…, visite…,
//    depan…) dans l'agenda principal des chefs de chantier et des installateurs ; retirés si la tâche est supprimée,
//    archivée, ou à un statut qui annule le rendez-vous (relevé : perdu, archivé ; pose et visite : annulé ;
//    dépannage : résolu, archivé). Couvre ce que ClickUp ne signale pas au site (archivage, suppression).
//    Seuls les rendez-vous à venir sont lus : un rendez-vous passé n'est jamais retiré.
//    Une tâche illisible pour une autre raison n'est jamais traitée comme supprimée : l'événement reste, c'est signalé.
// En preview, l'aiguillage ne traite que les fiches « Test » et le contrôle quotidien est en simulation (rien n'est
// retiré, la liste de ce qui le serait est renvoyée).

const API = 'https://api.clickup.com/api/v2';
const JOURS = 120;
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

type LectureTache = { etat: 'ok'; tache: any } | { etat: 'supprimee' } | { etat: 'illisible'; detail: string };

async function lireTache(token: string, id: string): Promise<LectureTache> {
  try {
    const r = await fetch(`${API}/task/${encodeURIComponent(id)}`, { headers: { Authorization: token }, cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.id) return j?.deleted ? { etat: 'supprimee' } : { etat: 'ok', tache: j };
    const err = normal(j?.err);
    if (r.status === 404 || err.includes('deleted') || err.includes('not found')) return { etat: 'supprimee' };
    return { etat: 'illisible', detail: `${r.status} ${String(j?.err || '').slice(0, 80)}`.trim() };
  } catch (e) {
    return { etat: 'illisible', detail: String(e).slice(0, 80) };
  }
}

// Raison pour laquelle le rendez-vous n'a plus lieu d'être ('' : il est maintenu)
export function raisonCaduc(prefixe: string, t: any): string {
  if (t?.archived) return 'tâche archivée';
  const s = normal(t?.status?.status);
  if (prefixe === 'releve') {
    if (s.includes('perdu')) return 'fiche perdue';
    if (s.includes('archiv')) return 'fiche archivée';
    return '';
  }
  if (prefixe === 'pose' || prefixe === 'visite') return s.includes('annul') ? 'annulé' : '';
  if (prefixe === 'depan') return s.includes('resolu') ? 'ticket résolu' : s.includes('archiv') ? 'ticket archivé' : '';
  return '';
}

async function commenter(token: string, taskId: string, texte: string) {
  await fetch(`${API}/task/${encodeURIComponent(taskId)}/comment`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment_text: texte, notify_all: false }),
    cache: 'no-store',
  }).catch(() => null);
}

const libelleJour = (ms: number) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));

// 1. Fiche de Qualification perdue ou archivée : son relevé À VENIR sort de l'agenda Google des chefs de chantier
export async function retirerReleveCaduc(taskId: string, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { success: false, error: 'CLICKUP_API_KEY manquant' };
  if (!agendaBranche()) return { success: true, action: 'agenda_non_branche' };
  const lu = await lireTache(token, taskId);
  if (lu.etat !== 'ok') return { success: false, error: 'Fiche illisible' };
  const t = lu.tache;
  if (t?.parent) return { success: true, action: 'ignore_sous_tache' };
  if (process.env.VERCEL_ENV !== 'production' && !/\btest\b/i.test(String(t?.name || ''))) return { success: true, action: 'ignore_preview_non_test' };
  const raison = raisonCaduc('releve', t);
  if (!raison) return { success: true, action: 'ignore_rdv_maintenu' };
  // Visite déjà passée : elle a eu lieu, le rendez-vous reste dans l'agenda (historique)
  const visite = dateVisiteDe(t);
  if (visite && visite <= Date.now()) return { success: true, action: 'ignore_releve_passe', raison };
  const chefs = (await membresDuRole(token, 'chargeOperation')).filter((c) => c.email);
  if (simulation) return { success: true, action: 'retirerait', raison, chefs: chefs.map((c) => c.nom) };
  const lus = await Promise.allSettled(chefs.map((c) => retirerReleve(c.email, String(t.id))));
  const retires = chefs.filter((_, i) => lus[i].status === 'fulfilled' && (lus[i] as PromiseFulfilledResult<boolean>).value).map((c) => c.nom);
  const echecs = chefs.filter((_, i) => lus[i].status === 'rejected').map((c) => c.nom);
  if (retires.length || echecs.length) {
    const lignes = [
      retires.length ? `📅 Relevé technique retiré de l'agenda Google de ${retires.join(', ')} (${raison}).` : '',
      echecs.length ? `⚠️ Relevé non retiré de l'agenda Google de ${echecs.join(', ')} : à supprimer à la main.` : '',
    ].filter(Boolean);
    await commenter(token, String(t.id), lignes.join('\n'));
  }
  return { success: !echecs.length, action: retires.length ? 'retire' : echecs.length ? 'erreur' : 'deja_absent', raison, retires, echecs };
}

// Agendas à contrôler : chefs de chantier et installateurs (ceux dans lesquels l'appli écrit), sans doublon
async function agendasEquipe(token: string): Promise<{ email: string; nom: string }[]> {
  const [chefs, poseurs] = await Promise.all([membresDuRole(token, 'chargeOperation'), membresDuRole(token, 'poseur')]);
  const vus = new Map<string, string>();
  for (const m of [...chefs, ...poseurs]) if (m.email && !vus.has(m.email)) vus.set(m.email, m.nom);
  return [...vus].map(([email, nom]) => ({ email, nom }));
}

// 2. Contrôle quotidien : nos rendez-vous à venir dont la tâche est supprimée, archivée ou annulée
export async function balayerRdvCaducs(simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { success: false, error: 'CLICKUP_API_KEY manquant' };
  if (!agendaBranche()) return { success: true, action: 'agenda_non_branche' };
  const personnes = await agendasEquipe(token);
  const jusque = new Date(Date.now() + JOURS * 86400000);
  const taches = new Map<string, LectureTache>();
  const retires: { personne: string; tache: string; quand: string; raison: string }[] = [];
  const erreurs: string[] = [];
  let lus = 0;
  for (const p of personnes) {
    let evenements: { id: string; debutMs: number; titre: string }[] = [];
    try {
      evenements = await nosEvenementsAVenir(p.email, jusque);
    } catch (e) {
      erreurs.push(`Agenda de ${p.nom} illisible : ${String((e as any)?.message || e).slice(0, 120)}`);
      continue;
    }
    for (const e of evenements) {
      const f = ficheDeEvenement(e.id);
      if (!f) continue;
      lus++;
      if (!taches.has(f.ficheId)) taches.set(f.ficheId, await lireTache(token, f.ficheId));
      const lu = taches.get(f.ficheId) as LectureTache;
      if (lu.etat === 'illisible') {
        erreurs.push(`Tâche ${f.ficheId} illisible (${lu.detail}) : rendez-vous « ${e.titre} » laissé dans l'agenda de ${p.nom}.`);
        continue;
      }
      const raison = lu.etat === 'supprimee' ? 'tâche supprimée' : raisonCaduc(f.prefixe, lu.tache);
      if (!raison) continue;
      const nom = lu.etat === 'ok' ? String(lu.tache?.name || f.ficheId) : f.ficheId;
      const quand = libelleJour(e.debutMs);
      if (simulation) {
        retires.push({ personne: p.nom, tache: nom, quand, raison });
        continue;
      }
      try {
        await retirerEvenement(p.email, e.id);
        retires.push({ personne: p.nom, tache: nom, quand, raison });
        if (lu.etat === 'ok') await commenter(token, f.ficheId, `🗓️ Rendez-vous du ${quand} retiré de l'agenda Google de ${p.nom} par le contrôle quotidien (${raison}).`);
      } catch (x) {
        erreurs.push(`Rendez-vous « ${e.titre} » non retiré de l'agenda de ${p.nom} : ${String((x as any)?.message || x).slice(0, 120)}`);
      }
    }
  }
  if (erreurs.length) console.error('RDV caducs :', erreurs.join(' ; '));
  return { success: !erreurs.length, simulation, agendas: personnes.length, evenements: lus, retires, erreurs };
}
