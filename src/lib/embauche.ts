import { LISTES } from '@/lib/espaces';
import { champ, nomOption } from '@/lib/vuesFiches';
import { champType } from '@/lib/typesTaches';
import { CANDIDAT, ONBOARDING, POSTES_SALARIE, SALARIE, poserChecklist } from '@/lib/rh';

// Candidat embauché → fiche salarié (18/10/2026, 9 h 40, choix de Matthieu : « toute seule au passage en embauché »).
// Déclenché par l'aiguillage du webhook ClickUp (src/lib/aiguillage.ts) quand une fiche de Recrutement Installateurs 👷
// passe au statut « embauché », qu'on le fasse dans ClickUp ou ailleurs.
// Crée dans Vie des Salariés 👥 (statut de départ 👋 nouvel arrivant, type de tâche Salarié) :
// - nom du candidat ; 🔧 Poste : Électricien ou Poseur → Installateur, Chef d'équipe → Chef de chantier ;
// - 📅 Date d'entrée = disponibilité du candidat si elle est renseignée ; 🛡️ Habilitations = celle déclarée (à vérifier) ;
// - description : téléphone, email, diplôme, permis, repère « candidature <id> », et ce qui reste à compléter (contrat) ;
// - checklist ONBOARDING (12 points, src/lib/rh.ts), puis un commentaire de trace sur le candidat.
// Déjà fait : une fiche salarié qui porte le repère de la candidature, ou le même nom, arrête tout (ClickUp peut
// renvoyer le même changement). Sous-tâches ignorées. Preview : seulement les fiches avec « Test » dans le nom.

const API = 'https://api.clickup.com/api/v2';
const PAGES_MAX = 10;
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

async function listerTout(token: string, listId: string): Promise<any[]> {
  const toutes: any[] = [];
  for (let page = 0; page < PAGES_MAX; page++) {
    const res = await fetch(`${API}/list/${listId}/task?archived=false&include_closed=true&subtasks=false&page=${page}`, { headers: { Authorization: token }, cache: 'no-store' });
    if (!res.ok) throw new Error(`ClickUp a refusé la lecture de Vie des Salariés (${res.status})`);
    const corps = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(corps?.tasks) ? corps.tasks : [];
    toutes.push(...lot);
    if (corps?.last_page !== false || lot.length === 0) break;
  }
  return toutes;
}

// Poste du salarié (index de 🔧 Poste) d'après le poste visé par le candidat
function posteSalarie(posteCandidat: string): number {
  const n = normal(posteCandidat);
  if (n.includes('chef')) return POSTES_SALARIE.indexOf('Chef de chantier');
  return POSTES_SALARIE.indexOf('Installateur');
}

export async function traiterEmbauche(taskId: string, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return { success: false, error: 'Configuration serveur incomplète' };
  const r = await fetch(`${API}/task/${encodeURIComponent(taskId)}`, { headers: { Authorization: token }, cache: 'no-store' });
  if (!r.ok) return { success: false, error: `Candidat illisible (${r.status})` };
  const t = await r.json().catch(() => null);
  if (!t) return { success: false, error: 'Candidat illisible' };
  if (t?.parent) return { success: true, action: 'ignore_sous_tache' };
  if (String(t?.list?.id) !== LISTES.recrutement) return { success: true, action: 'ignore_liste' };
  if (!normal(t?.status?.status).includes('embauche')) return { success: true, action: 'ignore_pas_embauche' };
  const nom = String(t?.name || '').trim();
  if (process.env.VERCEL_ENV !== 'production' && !/\btest\b/i.test(nom)) return { success: true, action: 'ignore_preview_pas_test' };

  // Déjà fait ?
  const repere = `candidature ${t.id}`;
  const salaries = await listerTout(token, LISTES.salaries);
  const deja = salaries.find((s) => String(s?.description || s?.text_content || '').includes(repere))
    || salaries.find((s) => normal(s?.name) === normal(nom));
  if (deja) return { success: true, action: 'deja_fait', salarie: String(deja.id) };

  const poste = nomOption(t, CANDIDAT.poste);
  const tel = String(champ(t, CANDIDAT.telephone)?.value || '').trim();
  const email = String(champ(t, CANDIDAT.email)?.value || '').trim();
  const diplome = nomOption(t, CANDIDAT.diplome);
  const habilitation = nomOption(t, CANDIDAT.habilitation);
  const permis = champ(t, CANDIDAT.permis)?.value;
  const dispo = Number(champ(t, CANDIDAT.disponibilite)?.value);
  const indexPoste = posteSalarie(poste);

  const champs: any[] = [{ id: SALARIE.poste, value: indexPoste }];
  if (Number.isFinite(dispo) && dispo > 0) champs.push({ id: SALARIE.entree, value: dispo });
  if (habilitation && !normal(habilitation).includes('aucune')) champs.push({ id: SALARIE.habilitations, value: `Habilitation électrique : ${habilitation.toLowerCase()} (à vérifier)` });
  const description = [
    `Fiche créée automatiquement au passage du candidat en « embauché » (${repere}).`,
    `Poste visé : ${poste || 'non précisé'} · Poste : ${POSTES_SALARIE[indexPoste]}`,
    tel ? `Téléphone : ${tel}` : '',
    email ? `Email : ${email}` : '',
    diplome ? `Diplôme : ${diplome}` : '',
    permis === true || permis === 'true' ? 'Permis B : oui' : permis === false || permis === 'false' ? 'Permis B : non' : '',
    habilitation ? `Habilitation électrique déclarée : ${habilitation}` : '',
    '',
    `À compléter : type de contrat${Number.isFinite(dispo) && dispo > 0 ? '' : ', date d’entrée'}, habilitations et leur expiration.`,
  ].filter((x, i, a) => x || (i > 0 && a[i - 1])).join('\n');

  if (simulation) return { success: true, action: 'creerait', nom, poste: POSTES_SALARIE[indexPoste], champs: champs.length };

  const type = await champType(token, 'salarie');
  const c = await fetch(`${API}/list/${LISTES.salaries}/task`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nom, description, ...type, custom_fields: champs }),
    cache: 'no-store',
  });
  const cree = await c.json().catch(() => ({}));
  if (!c.ok || !cree?.id) return { success: false, error: `ClickUp a refusé la création de la fiche salarié (${c.status})` };
  const checklist = await poserChecklist(token, String(cree.id), 'ONBOARDING', ONBOARDING);

  await fetch(`${API}/task/${encodeURIComponent(String(t.id))}/comment`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comment_text: [
        `👥 Fiche salarié créée automatiquement dans Vie des Salariés : ${nom} (${POSTES_SALARIE[indexPoste]}).`,
        checklist ? 'Checklist ONBOARDING posée (12 points).' : '⚠️ La checklist ONBOARDING n’a pas pu être posée entièrement.',
        `À compléter sur la fiche salarié : type de contrat${Number.isFinite(dispo) && dispo > 0 ? '' : ', date d’entrée'}, habilitations.`,
        cree?.url ? `Fiche : ${cree.url}` : '',
      ].filter(Boolean).join('\n'),
      notify_all: false,
    }),
    cache: 'no-store',
  }).catch(() => null);

  return { success: true, action: 'cree', salarie: String(cree.id), checklist };
}
