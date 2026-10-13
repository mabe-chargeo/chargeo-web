import { NextResponse } from 'next/server';
import { LIEN_AVIS } from '@/lib/avisGoogle';

// Adresse courte chargeo.fr/avis (Phase 4, 11/10/2026) : renvoie vers la fenêtre de notation Google de CHARGéO.
// Pratique à dicter au client ou à mettre dans un email. Redirection temporaire : la cible peut changer sans casser le lien.
export function GET() {
  return NextResponse.redirect(LIEN_AVIS, 302);
}
