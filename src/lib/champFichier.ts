// Dépôt d'un fichier généré par l'appli dans un champ Fichiers d'une tâche ClickUp (API v3 des pièces jointes de champ,
// puis rattachement au champ en v2). Partagé par le rapport de mise en service et le PV de réception (18/10/2026).
const WORKSPACE_ID = process.env.CLICKUP_TEAM_ID?.trim() || '90151325642';

export async function deposerDansChamp(token: string, taskId: string, champId: string, octets: Uint8Array, nom: string, type = 'application/pdf'): Promise<string | null> {
  const form = new FormData();
  form.append('attachment', new Blob([octets as BlobPart], { type }), nom);
  const res = await fetch(`https://api.clickup.com/api/v3/workspaces/${WORKSPACE_ID}/custom_fields/${champId}/attachments`, {
    method: 'POST', headers: { Authorization: token }, body: form, cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  const id = json?.id || json?.attachment?.id || json?.data?.id;
  if (!res.ok || !id) return `dépôt refusé (${res.status})`;
  const lien = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/field/${champId}`, {
    method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: { add: [String(id)], rem: [] } }), cache: 'no-store',
  });
  return lien.ok ? null : `rattachement au champ refusé (${lien.status})`;
}

// Nom de fichier à la charte de nommage (capitales, sans accent), « Test · … » devient « TEST-… »
export const slugFichier = (s: unknown) => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/^test\s*·\s*/i, 'TEST-')
  .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase().slice(0, 60);

// Date et heure de Paris
export function horodatage(d = new Date()) {
  const fr = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ...o }).format(d);
  return {
    jour: new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d),
    date: fr({ day: '2-digit', month: '2-digit', year: 'numeric' }),
    heure: fr({ hour: '2-digit', minute: '2-digit' }),
    lisible: fr({ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  };
}
