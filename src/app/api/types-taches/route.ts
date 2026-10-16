import { NextResponse } from 'next/server';
import { chargerTypes, estScenario, estReserve, estElement, estEmplacement, idTypeDe, TYPES, type CleType } from '@/lib/typesTaches';
import { CHAMPS, OPTIONS, indexMenu, cleOption } from '@/lib/champsClickUp';

// Preview uniquement : contrôle de l'étape 1 (types de tâches retrouvés par leur nom).
// Sans paramètre : liste des types trouvés et manquants.
// ?taskId=... : comment le site classe cette fiche et ses sous-tâches (type lu, scénario, élément, réserve, nature).
// Rien n'est jamais écrit.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === 'production') return NextResponse.json({ error: 'Non disponible' }, { status: 404 });
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  try {
    const { carte, manquants } = await chargerTypes(token, true);
    const nomDuType = (id: number | null) => {
      if (id === null) return 'Tâche (par défaut)';
      const cle = (Object.keys(carte) as CleType[]).find((k) => carte[k] === id);
      return cle ? TYPES[cle] : `autre type (${id})`;
    };
    const types = Object.fromEntries((Object.keys(TYPES) as CleType[]).map((k) => [TYPES[k], carte[k] ?? null]));

    const taskId = new URL(request.url).searchParams.get('taskId') || '';
    if (!taskId) return NextResponse.json({ success: manquants.length === 0, types, manquants: manquants.map((k) => TYPES[k]) });
    if (!/^[a-z0-9]+$/i.test(taskId)) return NextResponse.json({ error: 'taskId invalide' }, { status: 400 });

    const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}?include_subtasks=true`, {
      headers: { Authorization: token },
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ error: 'Fiche introuvable' }, { status: 404 });
    const fiche = await res.json();
    const classer = (t: any) => ({
      id: String(t?.id || ''),
      nom: String(t?.name || ''),
      type: nomDuType(idTypeDe(t)),
      scenario: estScenario(t, carte),
      element: estElement(t, carte),
      reserve: estReserve(t, carte),
      emplacement: estEmplacement(t, carte),
      nature: cleOption(OPTIONS.nature, indexMenu(t, CHAMPS.nature)),
      parent: t?.parent ? String(t.parent) : null,
    });
    const sous: any[] = Array.isArray(fiche?.subtasks) ? fiche.subtasks : [];
    return NextResponse.json({
      success: true,
      types,
      manquants: manquants.map((k) => TYPES[k]),
      fiche: classer(fiche),
      sousTaches: sous.map(classer),
    });
  } catch (error) {
    console.error('Erreur contrôle des types :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
