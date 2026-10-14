import { NextResponse } from 'next/server';
import { traiterScenarios } from '@/lib/scenarioRetenu';

// Preview uniquement : test du scénario retenu au passage en gagné (src/lib/scenarioRetenu.ts).
// ?taskId=...&simulation=1 (rien n'est écrit) ou &executer=1 (fiche de la liste TEST ou fiche « Test… »).
// &forcerSigne=<id de la sous-fiche> : son devis est traité comme signé.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === 'production') return NextResponse.json({ error: 'Non disponible' }, { status: 404 });
  try {
    const p = new URL(request.url).searchParams;
    const taskId = p.get('taskId') || '';
    const executer = p.get('executer') === '1';
    if (!/^[a-z0-9]+$/i.test(taskId) || (!executer && p.get('simulation') !== '1')) {
      return NextResponse.json({ error: 'Ajoute ?taskId=...&simulation=1 ou &executer=1 (option &forcerSigne=<id sous-fiche>)' }, { status: 400 });
    }
    return NextResponse.json(await traiterScenarios(taskId, !executer, p.get('forcerSigne') || ''));
  } catch (error) {
    console.error('Erreur scénario retenu (preview) :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
