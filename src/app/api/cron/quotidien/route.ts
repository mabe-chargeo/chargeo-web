import { NextResponse } from 'next/server';
import { GET as advenirGET } from '@/app/api/advenir/alertes/route';
import { verifierWebhooks } from '@/lib/webhookClickUp';

// Contrôle quotidien (cron Vercel, un seul appel par jour sur l'offre Hobby) :
// 1. alertes d'échéance des dossiers ADVENIR (/api/advenir/alertes, règles inchangées) ;
// 2. santé de l'abonnement ClickUp du site : réactivé s'il a été suspendu après des échecs.
// Production : appelé par le cron avec l'en-tête Authorization: Bearer CRON_SECRET (vercel.json).
// Preview : GET ?simulation=1 (rien n'est écrit ni réactivé).

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const token = process.env.CLICKUP_API_KEY;
    if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
    if (process.env.VERCEL_ENV === 'production') {
      const secret = process.env.CRON_SECRET;
      if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
      }
      const advenir = await advenirGET(new Request('https://site.interne/api/advenir/alertes', { headers: { authorization: `Bearer ${secret}` } }));
      const webhooks = await verifierWebhooks(token, true);
      return NextResponse.json({ advenir: await advenir.json().catch(() => null), webhooks });
    }
    const p = new URL(request.url).searchParams;
    if (p.get('simulation') !== '1') return NextResponse.json({ error: 'Ajoute ?simulation=1' }, { status: 400 });
    const advenir = await advenirGET(new Request('https://site.interne/api/advenir/alertes?simulation=1'));
    const webhooks = await verifierWebhooks(token, false);
    return NextResponse.json({ simulation: true, advenir: await advenir.json().catch(() => null), webhooks });
  } catch (erreur) {
    console.error('Contrôle quotidien en erreur', erreur);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
