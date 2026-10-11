// Relevé commun du site d'une fiche à emplacements (point 21, 11/10/2026). Côté serveur uniquement.
// La fiche reste « à visiter » tant que tous les emplacements ne sont pas reçus : sa réception est donc
// marquée par un commentaire sur la fiche, lisible aussi par le commercial.
// Posé seulement après réception complète des mesures et des photos du site (/api/metre/finaliser).
export const MARQUE_SITE_RECU = 'Relevé du site reçu';

export async function lireSiteRecu(taskId: string, token: string): Promise<boolean> {
  let suite = '';
  // ClickUp renvoie les commentaires par paquets de 25, du plus récent au plus ancien
  for (let page = 0; page < 10; page++) {
    const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/comment${suite}`, {
      headers: { 'Authorization': token },
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    const commentaires: any[] = Array.isArray(data?.comments) ? data.comments : [];
    if (commentaires.some((c) => String(c?.comment_text || '').includes(MARQUE_SITE_RECU))) return true;
    if (commentaires.length < 25) return false;
    const plusAncien = commentaires[commentaires.length - 1];
    suite = `?start=${encodeURIComponent(String(plusAncien.date))}&start_id=${encodeURIComponent(String(plusAncien.id))}`;
  }
  return false;
}

export async function marquerSiteRecu(taskId: string, token: string): Promise<boolean> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/comment`, {
    method: 'POST',
    headers: { 'Authorization': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comment_text: `✅ ${MARQUE_SITE_RECU} depuis l'outil terrain (mesures et photos).`,
      notify_all: false,
    }),
  });
  if (!res.ok) console.error(`Commentaire « site reçu » refusé (${res.status}) pour ${taskId}`, await res.text().catch(() => ''));
  return res.ok;
}
