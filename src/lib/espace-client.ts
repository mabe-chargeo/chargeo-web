// src/lib/espace-client.ts
// Accès sécurisé à l'Espace client (pages /suivi/[id]).
// Le client saisit son n° de dossier (ID de la tâche ClickUp) + son email.
// Si l'email correspond au champ "📧 Email" de la tâche, on pose un cookie signé qui ouvre ce dossier pendant 30 jours.
// Le cookie est signé avec ESPACE_CLIENT_SECRET (à ajouter dans Vercel), à défaut avec la clé ClickUp (jamais envoyée au navigateur).
import { createHmac, timingSafeEqual } from 'crypto';

export const ESPACE_CLIENT_COOKIE = 'chargeo_espace_client';
export const ESPACE_CLIENT_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

// Un n° de dossier = un ID de tâche ClickUp (lettres, chiffres, tirets). On refuse tout le reste.
export const DOSSIER_REGEX = /^[A-Za-z0-9_-]{4,40}$/;

function getSecret(): string {
  return process.env.ESPACE_CLIENT_SECRET || process.env.CLICKUP_API_KEY || '';
}

function sign(dossierId: string): string {
  return createHmac('sha256', getSecret()).update(`espace-client:${dossierId}`).digest('hex');
}

export function makeAccessToken(dossierId: string): string {
  return `${dossierId}.${sign(dossierId)}`;
}

export function tokenAllowsDossier(token: string | undefined, dossierId: string): boolean {
  if (!token || !getSecret()) return false;
  const sep = token.lastIndexOf('.');
  if (sep <= 0) return false;
  const tokenId = token.slice(0, sep);
  const tokenSig = token.slice(sep + 1);
  if (tokenId !== dossierId) return false;
  const expected = Buffer.from(sign(dossierId));
  const received = Buffer.from(tokenSig);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

// Lecture sécurisée d'une tâche ClickUp côté serveur (Qualification, Planning Chantiers, Parc Installé...)
export async function getClickUpTask(taskId: string): Promise<any | null> {
  const token = process.env.CLICKUP_API_KEY;
  if (!token || !DOSSIER_REGEX.test(taskId)) return null;

  try {
    const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}?custom_task_ids=true`, {
      headers: { Authorization: token },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function normalize(s: string): string {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Récupère l'email du client sur la tâche : champ de type email en priorité, sinon champ dont le nom contient "email".
export function getTaskEmail(task: any): string | null {
  const fields: any[] = task?.custom_fields || [];
  const field =
    fields.find((f) => f.type === 'email' && typeof f.value === 'string' && f.value.trim()) ||
    fields.find((f) => normalize(f.name).includes('email') && typeof f.value === 'string' && f.value.trim());
  return field ? String(field.value).trim().toLowerCase() : null;
}
