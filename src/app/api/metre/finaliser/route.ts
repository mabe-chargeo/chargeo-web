import { NextResponse } from 'next/server';
import { lireTacheQualification, estAVisiter } from '@/lib/listesClickUp';

// Dernière étape du relevé (lots 3.2 et 3.3, 10/10/2026), appelée par le formulaire SEULEMENT
// après l'enregistrement des mesures ET la réception de toutes les photos.
// 1. Passe la fiche (ou le scénario) en « 📝 devis à faire » si elle est encore « à visiter ».
//    Un relevé renvoyé plus tard ne fait jamais reculer une fiche déjà plus avancée.
// 2. Règle « tous reçus » : si c'est un scénario, la fiche principale passe en « devis à faire »
//    quand TOUS ses scénarios sont reçus (et seulement si elle est encore « à visiter »).
const STATUT_DEVIS_A_FAIRE = '📝 devis à faire';

async function passerEnDevisAFaire(taskId: string, token: string): Promise<boolean> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
    method: 'PUT',
    headers: { 'Authorization': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: STATUT_DEVIS_A_FAIRE })
  });
  if (!res.ok) console.error(`Changement de statut refusé (${res.status}) pour ${taskId}`, await res.text().catch(() => ''));
  return res.ok;
}

export async function POST(request: Request) {
  try {
    const corps = await request.json().catch(() => ({}));
    const taskId = String(corps?.taskId || '');
    const token = process.env.CLICKUP_API_KEY as string;

    const verif = await lireTacheQualification(taskId, token);
    if (!verif.ok) {
      return NextResponse.json({ success: false, error: verif.erreur }, { status: verif.status });
    }

    // 1. La fiche ou le scénario lui-même
    let change = false;
    if (estAVisiter(verif.tache?.status?.status)) {
      if (!(await passerEnDevisAFaire(taskId, token))) {
        return NextResponse.json({ success: false, error: "Le statut de la fiche n'a pas pu être changé" }, { status: 502 });
      }
      change = true;
    }

    // 2. Scénario : la fiche principale avance quand tous ses scénarios sont reçus
    let affaire: { id: string; tousRecus: boolean; change: boolean } | null = null;
    const parentId = verif.tache?.parent ? String(verif.tache.parent) : '';
    if (parentId) {
      const p = await lireTacheQualification(parentId, token, { sousTaches: true });
      if (p.ok) {
        const scenarios: any[] = Array.isArray(p.tache?.subtasks) ? p.tache.subtasks : [];
        // Le scénario courant compte comme reçu, même si ClickUp renvoie encore son ancien statut
        const tousRecus = scenarios.length > 0 && scenarios.every((s) => String(s.id) === taskId || !estAVisiter(s?.status?.status));
        let parentChange = false;
        if (tousRecus && estAVisiter(p.tache?.status?.status)) {
          if (!(await passerEnDevisAFaire(parentId, token))) {
            return NextResponse.json({ success: false, error: "Scénario reçu, mais la fiche principale n'a pas pu changer de statut" }, { status: 502 });
          }
          parentChange = true;
        }
        affaire = { id: parentId, tousRecus, change: parentChange };
      }
    }

    return NextResponse.json({ success: true, change, affaire });
  } catch (error) {
    console.error('Erreur finalisation relevé :', error);
    return NextResponse.json({ success: false, error: 'Erreur Serveur' }, { status: 500 });
  }
}
