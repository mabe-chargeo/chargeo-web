import { NextResponse } from 'next/server';
import { traiterRelance } from '@/lib/relancesFacture';

// Relances impayés (Phase 4, décision Matthieu du 11/10/2026 : aucun email automatique au client).
// Appelé par les automatisations ClickUp de Factures Clients v2 (statut modifié, Date d'échéance modifiée,
// Relances envoyées modifié) : POST ?taskId=...
// 18/10/2026 : la logique est dans src/lib/relancesFacture.ts (partagée avec l'écran facture de l'application).
// Preview : GET ?taskId=...&simulation=1 (rien n'est écrit) ou &executer=1 (tâches dont le nom commence par « Test »).

export async function POST(request: Request) {
  try {
    const taskId = new URL(request.url).searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ success: false, error: 'Aucun taskId reçu' }, { status: 400 });
    const r = await traiterRelance(taskId, false);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur relance impayé :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Preview uniquement : ?taskId=...&simulation=1 (rien n'est écrit) ou ?taskId=...&executer=1 (vrai passage, tâche Test)
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ error: 'Non disponible' }, { status: 404 });
  }
  try {
    const p = new URL(request.url).searchParams;
    const taskId = p.get('taskId');
    const executer = p.get('executer') === '1';
    const simulation = p.get('simulation') === '1';
    if (!taskId || (!executer && !simulation)) {
      return NextResponse.json({ error: 'Ajoute ?taskId=...&simulation=1 ou &executer=1' }, { status: 400 });
    }
    const r = await traiterRelance(taskId, !executer);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur relance impayé (preview) :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
