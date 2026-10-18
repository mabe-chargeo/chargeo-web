import { aujourdhuiParis, libelleJour } from '@/lib/joursOuvres';
import { alerter } from '@/lib/alerteSite';
import { commenterUneFois } from '@/lib/commentaireUnique';

// Synchro Tickets SAV ↔ Parc installé : remplace les Super Agents « Nouveau Ticket SAV → Sous Surveillance » et
// « SAV Résolu → En Service » (crédits IA, bascule du 12/10/2026). Appelé par l'aiguillage des webhooks :
// ticket créé, statut modifié ou 🔗 Fiche Installation modifié.
// - Ticket en 🚨 NOUVEAU TICKET : chaque installation liée passe en ⚠️ SOUS SURVEILLANCE (commentaire sur la fiche du Parc).
// - Ticket en ✅ PROBLÈME RÉSOLU : l'installation liée repasse en 🟢 EN SERVICE, sauf si un autre ticket ouvert la
//   concerne encore (elle reste sous surveillance). Plusieurs installations liées : rien n'est changé, un commentaire
//   demande de corriger le lien (même règle que l'agent).
// - Un ticket qui quitte « résolu » ne remet jamais le Parc en arrière (cas humain).
// - Champ 🔗 Fiche Installation vide : rien à la création ni dans les 2 minutes qui suivent (le lien arrive juste
//   après), alerte sinon (une seule fois).
// Preview : vrai passage sur un ticket et une installation « Test… » (« SAV - Test… » accepté), simulation partout.
// 18/10/2026, 22 h 37 (test du rapport d'intervention) : deux webhooks « statut modifié » arrivent ensemble, d'où deux
// fois « Installation remise en service ». Les commentaires de bascule passent par commenterUneFois (un seul reste).

const SAV_IDS = Array.from(new Set([process.env.CLICKUP_SAV_LIST_ID || '', '901520038282'].filter(Boolean)));
const PARC_ID = '901520038290';
const CHAMP_INSTALLATION = '3804df6e-a2e1-4058-913c-447189c73d35';
const MARQUE_SANS_LIEN = '« 🔗 Fiche Installation » est vide';

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const estTest = (nom: string) => /^(sav\s*-\s*)?test/.test(normal(nom).trim());

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

async function lireTache(id: string, token: string): Promise<any | null> {
  const res = await api(token, `/task/${encodeURIComponent(id)}?custom_task_ids=true`);
  return res.ok ? res.json() : null;
}

async function commenter(token: string, id: string, texte: string): Promise<boolean> {
  const res = await api(token, `/task/${id}/comment`, 'POST', { comment_text: texte, notify_all: false });
  if (!res.ok) console.error(`Commentaire refusé (${res.status}) sur ${id}`);
  return res.ok;
}

// Un des 3 derniers commentaires contient déjà ce texte (alerte du site ou relais ClickBot)
async function dejaDit(token: string, id: string, marque: string): Promise<boolean> {
  const res = await api(token, `/task/${id}/comment`);
  if (!res.ok) return false;
  const json = await res.json().catch(() => ({}));
  return (Array.isArray(json?.comments) ? json.comments.slice(0, 3) : []).some((c: any) => String(c?.comment_text || '').includes(marque));
}

const installations = (t: any): string[] => {
  const v = (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c.id === CHAMP_INSTALLATION)?.value;
  return (Array.isArray(v) ? v : []).map((x: any) => String(x?.id ?? x)).filter(Boolean);
};

function sensDuTicket(statut: any): 'surveillance' | 'service' | null {
  const s = normal(statut?.status || '');
  if (s.includes('nouveau')) return 'surveillance';
  if (s.includes('resolu')) return 'service';
  return null;
}

const ticketOuvert = (t: any) => {
  const type = String(t?.status?.type || '');
  return type !== 'closed' && type !== 'done' && !normal(t?.status?.status || '').includes('resolu');
};

// Autres tickets encore ouverts sur la même installation. null = lecture impossible
async function autresTicketsOuverts(token: string, listeSav: string, parcId: string, ticketId: string): Promise<string[] | null> {
  const noms: string[] = [];
  for (let page = 0; page < 10; page++) {
    const res = await api(token, `/list/${listeSav}/task?archived=false&page=${page}`);
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const taches: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    for (const t of taches) {
      if (String(t.id) === ticketId || t.parent || !ticketOuvert(t)) continue;
      if (installations(t).includes(parcId)) noms.push(String(t.name));
    }
    if (json?.last_page !== false || taches.length === 0) break;
  }
  return noms;
}

export async function synchroniserSav(ticketId: string, simulation: boolean, declencheur = 'statut') {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { success: false, error: 'Configuration serveur incomplète' };
  const ticket = await lireTache(ticketId, token);
  if (!ticket) return { success: false, error: 'Ticket introuvable' };
  if (ticket.parent) return { success: true, action: 'ignore_sous_tache', simulation };
  const listeSav = String(ticket?.list?.id ?? '');
  if (!SAV_IDS.includes(listeSav)) return { success: true, action: 'ignore_hors_sav', simulation };
  const preview = process.env.VERCEL_ENV !== 'production';
  if (preview && !simulation && !estTest(ticket.name)) {
    return { success: false, action: 'refuse_preview_ticket_reel', error: 'En preview : ticket « Test » uniquement, simulation partout' };
  }

  const id = String(ticket.id);
  const sens = sensDuTicket(ticket.status);
  const base = { ticket: ticket.name, statut: ticket?.status?.status, declencheur, simulation };
  if (!sens) return { success: true, action: 'ignore_statut', ...base };

  const lies = installations(ticket);
  if (!lies.length) {
    // Ticket tout juste créé : le lien arrive juste après (formulaire du site ou saisie à la main), pas d'alerte
    const age = Date.now() - Number(ticket?.date_created || 0);
    if (declencheur === 'creation' || age < 2 * 60 * 1000) return { success: true, action: 'ignore_sans_lien_creation', ...base };
    const texte = `⚠️ SAV : ${MARQUE_SANS_LIEN}, la fiche du Parc installé n'a pas été mise à jour. Relie le ticket à la bonne installation.`;
    if (!simulation && !(await dejaDit(token, id, MARQUE_SANS_LIEN))) await alerter(token, id, texte);
    return { success: true, action: 'sans_installation', ...base, commentaire: texte };
  }
  if (sens === 'service' && lies.length > 1) {
    const texte = `⚠️ SAV : ticket résolu, mais ${lies.length} installations sont liées dans « 🔗 Fiche Installation ». Rien n'a été changé dans le Parc pour éviter une erreur : garde seulement la bonne installation, puis repasse le ticket en résolu.`;
    if (!simulation) await commenter(token, id, texte);
    return { success: true, action: 'plusieurs_installations', ...base, commentaire: texte };
  }

  const resStatuts = await api(token, `/list/${PARC_ID}`);
  const statuts: any[] = resStatuts.ok ? ((await resStatuts.json().catch(() => ({})))?.statuses || []) : [];
  const cible = statuts.find((s: any) => normal(s.status).includes(sens === 'service' ? 'en service' : 'surveillance'));
  if (!cible) {
    if (!simulation) await alerter(token, id, '⚠️ SAV : statut cible introuvable dans Parc installé (🟢 EN SERVICE ou ⚠️ SOUS SURVEILLANCE). Mets la fiche du Parc à jour à la main.');
    return { success: false, action: 'statut_parc_introuvable', ...base };
  }

  const jour = libelleJour(aujourdhuiParis());
  const resultats: any[] = [];
  for (const pid of lies.slice(0, 10)) {
    const parc = await lireTache(pid, token);
    if (!parc) {
      if (!simulation) await commenter(token, id, `⚠️ SAV : l'installation liée (${pid}) est introuvable. Aucune fiche du Parc n'a été modifiée.`);
      resultats.push({ id: pid, action: 'introuvable' });
      continue;
    }
    const r = { id: pid, nom: parc.name, statut: parc?.status?.status };
    if (String(parc?.list?.id ?? '') !== PARC_ID) {
      if (!simulation) await commenter(token, id, `⚠️ SAV : « ${parc.name} » est liée au ticket mais n'est pas dans Parc installé. Rien n'a été modifié, corrige « 🔗 Fiche Installation ».`);
      resultats.push({ ...r, action: 'hors_parc' });
      continue;
    }
    if (normal(parc?.status?.status) === normal(cible.status)) { resultats.push({ ...r, action: 'deja_a_jour' }); continue; }
    if (preview && !simulation && !estTest(parc.name)) { resultats.push({ ...r, action: 'refuse_preview_installation_reelle' }); continue; }

    if (sens === 'service') {
      const autres = await autresTicketsOuverts(token, listeSav, pid, id);
      if (autres === null) { resultats.push({ ...r, action: 'erreur_lecture_tickets' }); continue; }
      if (autres.length) {
        const texte = `ℹ️ SAV : ticket résolu, mais « ${parc.name} » reste sous surveillance : ${autres.length > 1 ? 'd\'autres tickets sont ouverts' : 'un autre ticket est ouvert'} (${autres.join(', ')}).`;
        if (!simulation) await commenter(token, id, texte);
        resultats.push({ ...r, action: 'reste_sous_surveillance', autres });
        continue;
      }
    }
    if (simulation) { resultats.push({ ...r, action: 'changerait', vers: cible.status }); continue; }

    const maj = await api(token, `/task/${pid}`, 'PUT', { status: cible.status });
    if (!maj.ok) {
      await alerter(token, id, `⚠️ SAV : je n'ai pas pu passer « ${parc.name} » en ${cible.status}. Fais-le à la main dans Parc installé.`);
      resultats.push({ ...r, action: 'erreur_ecriture' });
      continue;
    }
    if (sens === 'surveillance') {
      await commenterUneFois(pid, token, `⚠️ Installation passée en ${cible.status} : ticket SAV « ${ticket.name} » ouvert le ${jour}. ${ticket.url || ''}`.trim());
    } else {
      await commenterUneFois(id, token, `🟢 Installation « ${parc.name} » remise en ${cible.status} (ticket résolu le ${jour}). ${parc.url || ''}`.trim());
    }
    resultats.push({ ...r, action: 'change', vers: cible.status });
  }
  return { success: resultats.every((x) => !String(x.action).startsWith('erreur')), action: sens, ...base, installations: resultats };
}
