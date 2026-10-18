import { NextResponse, after } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { rolesDe } from '@/lib/roles';
import { installerWebhook } from '@/lib/webhookClickUp';

// Personne connectée et ses rôles (src/lib/roles.ts), pour afficher les bons onglets de la barre de navigation.
// L'affichage ne donne aucun droit : chaque route contrôle les rôles elle-même.
// 17/10/2026, 22 h 42 : + son email CHARGéO (pour ouvrir Gmail sur le bon compte depuis l'écran Caler).
// 18/10/2026, 12 h 10 (Matthieu : « je comprends rien à ce que tu me racontes, quel lien d'installation ») : en preview,
// l'adresse change à chaque mise en ligne et l'abonnement ClickUp devait être réinstallé à la main (?action=installer).
// Il l'est maintenant tout seul, une fois par instance du serveur, après la réponse (after) : la première ouverture de
// l'appli suffit. installerWebhook ne fait rien si l'abonnement de ce déploiement existe déjà, sinon il remplace celui
// de l'ancien déploiement. Production : rien ne change (adresse fixe, contrôle quotidien).
export const dynamic = 'force-dynamic';

let branchement: Promise<unknown> | null = null;

function brancherPreview(token: string) {
  if (process.env.VERCEL_ENV !== 'preview' || branchement) return;
  branchement = installerWebhook(token)
    .then((r) => {
      if (!r?.success) { branchement = null; console.error('Abonnement ClickUp de preview non installé', r); }
      return r;
    })
    .catch((e) => { branchement = null; console.error('Abonnement ClickUp de preview en erreur', e); });
  after(() => branchement as Promise<unknown>);
}

export async function GET(request: Request) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  const session = await sessionDeRequete(request);
  if (!session?.id) return NextResponse.json({ error: 'Connexion requise : reconnecte-toi.' }, { status: 401 });
  brancherPreview(token);
  const roles = await rolesDe(token, session.id);
  return NextResponse.json({ nom: session.nom || '', email: session.email || '', roles });
}
