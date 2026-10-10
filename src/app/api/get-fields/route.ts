import { NextResponse } from 'next/server';

// Lot 3.1 (10/10/2026) : route de diagnostic fermée.
// Elle exposait publiquement les noms, identifiants et options des champs ClickUp,
// et renvoyait la réponse ClickUp brute en cas d'erreur.
// Les identifiants de champs sont dans le dictionnaire des champs (tâche Phase 2 de la restructuration ERP).
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
