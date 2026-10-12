// Equipes ClickUp (Parametres > Equipes), creees le 12/10/2026 d'apres la page wiki « Qui fait quoi ».
// Le site previent une equipe, jamais une personne en dur : quand quelqu'un arrive, on l'ajoute a l'equipe,
// sans toucher au code ni aux automatisations.
export const EQUIPES = {
  direction: 'a8153e95-7bc1-4cc4-8064-88fe6d9dd9df',
  commercial: 'c51262b1-146d-49ae-8cf4-bb69baa16ecd',
  chargeOperation: 'ca425184-7c71-4f9a-b279-49c968621e81',
  installateurs: 'f11a3250-a56a-4488-9e0c-07df8db99401',
  backOffice: '58612ed4-05e0-4f98-b1cf-e0794c7017e5',
} as const;

export type Equipe = keyof typeof EQUIPES;

// Poste un commentaire assigne a l'equipe : chaque membre le recoit dans sa boite de reception
// et le resout une fois traite.
// notify_all = true : le jeton API est celui de Matthieu, donc sans ca l'auteur (lui) ne serait pas prevenu.
// Ne leve jamais d'erreur : une notif ratee ne doit pas faire echouer la creation du lead ou du ticket.
export async function notifierEquipe(token: string, taskId: string, equipe: Equipe, texte: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}/comment`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_text: texte, group_assignee: EQUIPES[equipe], notify_all: true }),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`Notif equipe ${equipe} refusee (${res.status}) sur ${taskId}`, await res.text().catch(() => ''));
    }
    return res.ok;
  } catch (error) {
    console.error(`Notif equipe ${equipe} en erreur sur ${taskId}`, error);
    return false;
  }
}
