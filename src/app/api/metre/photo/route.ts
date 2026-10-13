import { NextResponse } from 'next/server';
import { lireTacheQualification } from '@/lib/listesClickUp';

// Upload d'UNE seule photo en pièce jointe de la tâche.
// Séparé de /api/metre pour que chaque requête reste sous la limite de corps de Vercel (~4,5 Mo).
// Lot 3.2 (10/10/2026) : la fiche doit appartenir à la liste autorisée (TEST en preview).
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const taskId = String(formData.get('taskId') || '');
    const file = formData.get('photo') as File;
    const token = process.env.CLICKUP_API_KEY as string;

    if (!taskId || !file || typeof file === 'string' || file.size === 0) {
      return NextResponse.json({ success: false, error: 'Photo ou tâche manquante' }, { status: 400 });
    }

    const verif = await lireTacheQualification(taskId, token);
    if (!verif.ok) {
      return NextResponse.json({ success: false, error: verif.erreur }, { status: verif.status });
    }

    const fileData = new FormData();
    fileData.append('attachment', file);

    const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/attachment`, {
      method: 'POST',
      headers: { 'Authorization': token },
      body: fileData
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, error: 'Upload ClickUp échoué' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur upload photo:', error);
    return NextResponse.json({ success: false, error: 'Erreur Serveur' }, { status: 500 });
  }
}
