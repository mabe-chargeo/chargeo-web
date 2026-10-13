import { NextResponse } from 'next/server';
import { GET as advenirGET } from '@/app/api/advenir/alertes/route';
import { verifierWebhooks } from '@/lib/webhookClickUp';
import { controlerReglements } from '@/lib/controleReglements';
import { controlerEcheancierAchats } from '@/lib/echeancierAchats';
import { controlerMaintenance } from '@/lib/echeancierMaintenance';
import { rappelerDecomptes } from '@/lib/rappelDecomptes';

// Contrôle quotidien (cron Vercel, un seul appel par jour sur l'offre Hobby) :
// 1. alertes d'échéance des dossiers ADVENIR (/api/advenir/alertes, règles inchangées) ;
// 2. santé de l'abonnement ClickUp du site : réactivé s'il a été suspendu après des échecs ;
// 3. (13/10/2026) règlements Costructor des factures dont le rappel de relance tombe aujourd'hui
//    (src/lib/controleReglements.ts) : on ne relance pas un client qui a déjà payé ;
// 4. (13/10/2026) échéancier fournisseurs (src/lib/echeancierAchats.ts) : à payer sous 2 jours ouvrés, retards,
//    incohérences entre statut et montants payés. Le site ne paie rien et ne change aucun statut.
// 5. (13/10/2026) maintenance programmée (src/lib/echeancierMaintenance.ts) : visites créées 30 jours avant l'échéance,
//    anniversaire avancé d'un an, visites en retard, relance contrat à 11 mois. Remplace tout Super Agent.
// 6. (13/10/2026) rappel des décomptes énergétiques en mode Relevé (src/lib/rappelDecomptes.ts) : alerte back-office
//    à chaque fin de période, rien en Refacturation. Le site ne produit ni n'envoie aucun décompte.
// Production : appelé par le cron avec l'en-tête Authorization: Bearer CRON_SECRET (vercel.json).
// Preview : GET ?simulation=1 (rien n'est écrit ni réactivé).
// Jeton Vercel « Protection Bypass for Automation » créé par Matthieu le 12/10 (note « Webhooks ClickUp »).

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
      const reglements = await controlerReglements(false).catch((e) => ({ success: false, error: String(e) }));
      const achats = await controlerEcheancierAchats(false).catch((e) => ({ success: false, error: String(e) }));
      const maintenance = await controlerMaintenance(false).catch((e) => ({ success: false, error: String(e) }));
      const decomptes = await rappelerDecomptes(false).catch((e) => ({ success: false, error: String(e) }));
      return NextResponse.json({ advenir: await advenir.json().catch(() => null), webhooks, reglements, achats, maintenance, decomptes });
    }
    const p = new URL(request.url).searchParams;
    if (p.get('simulation') !== '1') return NextResponse.json({ error: 'Ajoute ?simulation=1' }, { status: 400 });
    const advenir = await advenirGET(new Request('https://site.interne/api/advenir/alertes?simulation=1'));
    const webhooks = await verifierWebhooks(token, false);
    const reglements = await controlerReglements(true).catch((e) => ({ success: false, error: String(e) }));
    const achats = await controlerEcheancierAchats(true).catch((e) => ({ success: false, error: String(e) }));
    const maintenance = await controlerMaintenance(true).catch((e) => ({ success: false, error: String(e) }));
    const decomptes = await rappelerDecomptes(true).catch((e) => ({ success: false, error: String(e) }));
    return NextResponse.json({ simulation: true, advenir: await advenir.json().catch(() => null), webhooks, reglements, achats, maintenance, decomptes });
  } catch (erreur) {
    console.error('Contrôle quotidien en erreur', erreur);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
