// Commentaire posté une seule fois, même quand plusieurs appels arrivent en même temps (18/10/2026).
// Cas réel : « Marquer comme payée » dans l'application, puis les automatisations ClickUp de Factures Clients
// (statut modifié) appellent la même logique à quelques millisecondes d'écart : 3 fois « relances arrêtées ».
// Méthode : texte identique déjà posté dans la fenêtre → rien. Sinon chacun poste, attend, relit les commentaires :
// seul le plus ancien des textes identiques reste, les doublons qu'on vient de poster sont supprimés.

const API = 'https://api.clickup.com/api/v2';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const propre = (s: string) => String(s || '').replace(/\s+/g, ' ').trim();

async function recents(taskId: string, token: string, texte: string, fenetreMs: number): Promise<{ id: string; date: number }[]> {
  const res = await fetch(`${API}/task/${taskId}/comment`, { headers: { Authorization: token }, cache: 'no-store' });
  if (!res.ok) return [];
  const corps = await res.json().catch(() => null);
  const limite = Date.now() - fenetreMs;
  const cible = propre(texte);
  return (Array.isArray(corps?.comments) ? corps.comments : [])
    .filter((c: any) => propre(c?.comment_text) === cible && Number(c?.date) >= limite)
    .map((c: any) => ({ id: String(c.id), date: Number(c.date) }));
}

export async function commenterUneFois(taskId: string, token: string, texte: string, fenetreMs = 120000): Promise<boolean> {
  if ((await recents(taskId, token, texte, fenetreMs)).length) return true;
  const res = await fetch(`${API}/task/${taskId}/comment`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment_text: texte, notify_all: false }),
  });
  if (!res.ok) {
    console.error(`Commentaire refusé (${res.status}) sur ${taskId}`);
    return false;
  }
  const moi = String((await res.json().catch(() => null))?.id ?? '');
  if (!moi) return true;
  await pause(2500);
  const tous = await recents(taskId, token, texte, fenetreMs);
  if (tous.length > 1) {
    const garde = tous.reduce((a, b) => (b.date < a.date || (b.date === a.date && b.id < a.id) ? b : a));
    if (garde.id !== moi) {
      const del = await fetch(`${API}/comment/${moi}`, { method: 'DELETE', headers: { Authorization: token } });
      if (!del.ok) console.error(`Doublon non supprimé (${del.status}) sur ${taskId}`);
    }
  }
  return true;
}
