// Listes ClickUp utilisées par le site, selon l'environnement Vercel (lot 3.0 / 3.2, 10/10/2026).
// Production : CLICKUP_LIST_QUALIFICATION_ID (repli sur la vraie liste Qualification).
// Preview / test : UNIQUEMENT CLICKUP_LIST_QUALIFICATION_TEST_ID, sinon refus.
// Un test ne peut donc jamais lire ni écrire une vraie fiche client.
export const QUALIFICATION_PROD_ID = "901519702632";

export function getQualificationListId(): string | undefined {
  if (process.env.VERCEL_ENV === "production") {
    return process.env.CLICKUP_LIST_QUALIFICATION_ID?.trim() || QUALIFICATION_PROD_ID;
  }
  return process.env.CLICKUP_LIST_QUALIFICATION_TEST_ID?.trim() || undefined;
}

export type LectureTache =
  | { ok: true; tache: any }
  | { ok: false; status: number; erreur: string };

// Lit une fiche et vérifie qu'elle appartient bien à la liste Qualification autorisée pour cet environnement.
export async function lireTacheQualification(taskId: string, token: string): Promise<LectureTache> {
  const listId = getQualificationListId();
  if (!token || !listId) return { ok: false, status: 500, erreur: "Configuration serveur incomplète" };
  if (!taskId || !/^[a-z0-9]+$/i.test(taskId)) return { ok: false, status: 400, erreur: "Identifiant de fiche invalide" };

  const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
    headers: { Authorization: token },
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, status: res.status === 404 ? 404 : 502, erreur: "Fiche introuvable" };

  const tache = await res.json();
  if (String(tache?.list?.id ?? "") !== String(listId)) {
    return { ok: false, status: 403, erreur: "Fiche hors de la liste autorisée" };
  }
  return { ok: true, tache };
}
