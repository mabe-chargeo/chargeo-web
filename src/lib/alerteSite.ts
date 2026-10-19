// Alertes qui doivent prevenir quelqu'un (decision Matthieu du 12/10/2026).
// Le site ecrit dans ClickUp avec le jeton API de Matthieu, et ClickUp ne notifie jamais l'auteur d'un commentaire
// (constate le 12/10, meme avec notify_all). Une alerte n'est donc pas postee en commentaire : elle est ecrite dans
// le champ 📣 Alerte site, et l'automatisation « Relais alerte site » de l'espace la recopie en commentaire avec la
// mention de l'equipe : COMMERCIAL -> @commercial, CHANTIERS & SAV -> @charge-doperation, BACK OFFICE -> @back-office.
// ClickBot etant l'auteur du commentaire, tout le monde est notifie, Matthieu compris.
// L'heure (a la seconde) est ajoutee pour que deux alertes identiques declenchent quand meme le relais.
// Un seul champ, partage par les 3 espaces. Secours si le champ est absent ou refuse : commentaire classique.
// 19/10/2026, 13 h (Matthieu : « Fais ce qu'il y a à faire », après les alertes en double sur la commande de test) :
// ClickUp envoie parfois deux webhooks pour un même changement, à une seconde d'écart ; chacun écrivait l'alerte avec
// son heure, donc le relais la recopiait deux fois (« Commande sans chantier lié » à 10:34:32 et 10:34:33). Une même
// alerte sur une même tâche n'est plus réécrite pendant 2 minutes : mémoire de l'instance, puis relecture du champ
// (même texte et tâche modifiée il y a moins de 2 minutes). Passé ce délai, la même alerte repart normalement.

export const CHAMP_ALERTE_SITE = '42019c42-0af8-49de-a33d-8af0ddde3357';
const LONGUEUR_MAX = 1900;
const FENETRE_MS = 2 * 60 * 1000;
const HEURE_FIN = /\s\(\d{2}\/\d{2} \d{2}:\d{2}:\d{2}\)$/;
const recentes = new Map<string, number>();

function horodatage(d = new Date()): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d);
  const v = (t: string) => parts.find((x) => x.type === t)?.value || '';
  return `${v('day')}/${v('month')} ${v('hour')}:${v('minute')}:${v('second')}`;
}

// La même alerte vient d'être écrite sur cette tâche (deuxième webhook du même changement)
async function dejaAlerte(token: string, taskId: string, ligne: string): Promise<boolean> {
  const maintenant = Date.now();
  for (const [cle, quand] of recentes) if (maintenant - quand > FENETRE_MS) recentes.delete(cle);
  const cle = `${taskId}|${ligne}`;
  if (recentes.has(cle)) return true;
  recentes.set(cle, maintenant);
  try {
    const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}`, { headers: { Authorization: token }, cache: 'no-store' });
    if (!res.ok) return false;
    const t = await res.json().catch(() => null);
    const valeur = String((Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c?.id === CHAMP_ALERTE_SITE)?.value || '');
    return valeur.replace(HEURE_FIN, '') === ligne && maintenant - Number(t?.date_updated || 0) < FENETRE_MS;
  } catch {
    return false;
  }
}

export async function alerter(token: string, taskId: string, texte: string): Promise<boolean> {
  // Champ texte court : une seule ligne
  const ligne = String(texte || '').replace(/\s*\n\s*/g, ' ').trim().slice(0, LONGUEUR_MAX);
  if (await dejaAlerte(token, taskId, ligne)) return true;
  try {
    const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}/field/${CHAMP_ALERTE_SITE}`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: `${ligne} (${horodatage()})` }),
      cache: 'no-store',
    });
    if (res.ok) return true;
    console.error(`Alerte site refusee (${res.status}) sur ${taskId}`, await res.text().catch(() => ''));
  } catch (error) {
    console.error(`Alerte site en erreur sur ${taskId}`, error);
  }
  // Secours : commentaire classique (garde la trace, mais ne notifie pas l'auteur du jeton)
  const c = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}/comment`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment_text: texte, notify_all: true }),
    cache: 'no-store',
  }).catch(() => null);
  if (!c?.ok) console.error(`Commentaire de secours refuse sur ${taskId}`);
  return !!c?.ok;
}
