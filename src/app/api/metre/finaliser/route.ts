import { NextResponse } from 'next/server';
import { lireTacheQualification } from '@/lib/listesClickUp';

// Dernière étape du relevé (lot 3.2, 10/10/2026) : appelée par le formulaire SEULEMENT
// après l'enregistrement des mesures ET la réception de toutes les photos.
// Passe la fiche en « 📝 devis à faire » uniquement si elle est encore « à visiter » :
// un relevé renvoyé plus tard ne fait jamais reculer une fiche déjà en devis envoyé ou en négociation.
const STATUT_DEVIS_A_FAIRE = '📝 devis à faire';

export async function POST(request: Request) {
  try {
    const corps = await request.json().catch(() => ({}));
    const taskId = String(corps?.taskId || '');
    const token = process.env.CLICKUP_API_KEY as string;

    const verif = await lireTacheQualification(taskId, token);
    if (!verif.ok) {
      return NextResponse.json({ success: false, error: verif.erreur }, { status: verif.status });
    }

    const statutActuel = String(verif.tache?.status?.status || '');
    if (!statutActuel.toUpperCase().includes('VISITER')) {
      return NextResponse.json({ success: true, statut: statutActuel, change: false });
    }

    const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      method: 'PUT',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: STATUT_DEVIS_A_FAIRE })
    });
    if (!res.ok) {
      console.error(`Changement de statut refusé (${res.status})`, await res.text().catch(() => ''));
      return NextResponse.json({ success: false, error: "Le statut de la fiche n'a pas pu être changé" }, { status: 502 });
    }

    return NextResponse.json({ success: true, statut: STATUT_DEVIS_A_FAIRE, change: true });
  } catch (error) {
    console.error('Erreur finalisation relevé :', error);
    return NextResponse.json({ success: false, error: 'Erreur Serveur' }, { status: 500 });
  }
}
