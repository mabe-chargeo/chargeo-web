// Alertes qui doivent prevenir quelqu'un (decision Matthieu du 12/10/2026).
// Le site ecrit dans ClickUp avec le jeton API de Matthieu, et ClickUp ne notifie jamais l'auteur d'un commentaire
// (constate le 12/10, meme avec notify_all). Une alerte n'est donc pas postee en commentaire : elle est ecrite dans
// le champ 📣 Alerte site, et l'automatisation « Relais alerte site » de l'espace la recopie en commentaire avec la
// mention de l'equipe : COMMERCIAL -> @commercial, CHANTIERS & SAV -> @charge-doperation, BACK OFFICE -> @back-office.
// ClickBot etant l'auteur du commentaire, tout le monde est notifie, Matthieu compris.
// L'heure (a la seconde) est ajoutee pour que deux alertes identiques declenchent quand meme le relais.
// Un seul champ, partage par les 3 espaces. Secours si le champ est absent ou refuse : commentaire classique.

export const CHAMP_ALERTE_SITE = '42019c42-0af8-49de-a33d-8af0ddde3357';
const LONGUEUR_MAX = 1900;

function horodatage(d = new Date()): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d);
  const v = (t: string) => parts.find((x) => x.type === t)?.value || '';
  return `${v('day')}/${v('month')} ${v('hour')}:${v('minute')}:${v('second')}`;
}

export async function alerter(token: string, taskId: string, texte: string): Promise<boolean> {
  // Champ texte court : une seule ligne
  const ligne = String(texte || '').replace(/\s*\n\s*/g, ' ').trim().slice(0, LONGUEUR_MAX);
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
