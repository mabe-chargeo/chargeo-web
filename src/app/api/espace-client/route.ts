// src/app/api/espace-client/route.ts
// Vérifie le couple n° de dossier + email, puis ouvre l'accès au suivi du dossier (cookie signé).
import { NextResponse } from 'next/server';
import {
  DOSSIER_REGEX,
  ESPACE_CLIENT_COOKIE,
  ESPACE_CLIENT_MAX_AGE,
  getClickUpTask,
  getTaskEmail,
  makeAccessToken,
} from '@/lib/espace-client';

const MESSAGE_ERREUR =
  "Nous n'avons pas trouvé de dossier correspondant. Vérifiez votre numéro de dossier et l'email utilisé lors de votre demande, ou appelez-nous au 04 85 69 22 04.";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: MESSAGE_ERREUR }, { status: 400 });
  }

  const dossier = String(body?.dossier || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();

  if (!DOSSIER_REGEX.test(dossier) || !email.includes('@')) {
    return NextResponse.json({ ok: false, error: MESSAGE_ERREUR }, { status: 400 });
  }

  const task = await getClickUpTask(dossier);
  const taskEmail = task ? getTaskEmail(task) : null;

  if (!task || !taskEmail || taskEmail !== email) {
    // Petite pause pour décourager les essais en série
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ ok: false, error: MESSAGE_ERREUR }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, redirect: `/suivi/${encodeURIComponent(dossier)}` });
  res.cookies.set(ESPACE_CLIENT_COOKIE, makeAccessToken(dossier), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ESPACE_CLIENT_MAX_AGE,
  });
  return res;
}
