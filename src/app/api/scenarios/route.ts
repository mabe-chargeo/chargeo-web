import { NextResponse } from 'next/server';
import { lireTacheQualification } from '@/lib/listesClickUp';

// Création d'un scénario de relevé (lot 3.3, 10/10/2026), point 12 règle 2 des Décisions ERP :
// « autre façon de raccorder, même client » = une sous-tâche de relevé par scénario technique,
// dans la même liste que la fiche, avec ses propres mesures, son segment et sa source.
// La sous-tâche naît avec le statut par défaut de la liste (« 📍 à visiter »).
// À vérifier avant la mise en production : les automatisations de Qualification déclenchées par une création.
export async function POST(request: Request) {
  try {
    const corps = await request.json().catch(() => ({}));
    const affaireId = String(corps?.affaireId || '');
    const nom = String(corps?.nom || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const token = process.env.CLICKUP_API_KEY as string;

    if (!nom) {
      return NextResponse.json({ success: false, error: 'Donne un nom au scénario' }, { status: 400 });
    }

    const verif = await lireTacheQualification(affaireId, token, { sousTaches: true });
    if (!verif.ok) {
      return NextResponse.json({ success: false, error: verif.erreur }, { status: verif.status });
    }
    if (verif.tache?.parent) {
      return NextResponse.json({ success: false, error: 'Un scénario ne peut pas avoir de sous-scénario' }, { status: 400 });
    }

    const numero = (Array.isArray(verif.tache?.subtasks) ? verif.tache.subtasks.length : 0) + 1;
    const listId = String(verif.tache.list.id);

    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
      method: 'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Scénario ${numero} : ${nom}`,
        parent: affaireId,
        description: "Scénario de relevé créé depuis l'outil terrain. Il porte ses propres mesures, son segment et sa source de raccordement.",
      }),
    });
    if (!res.ok) {
      console.error(`Création du scénario refusée (${res.status})`, await res.text().catch(() => ''));
      return NextResponse.json({ success: false, error: "Le scénario n'a pas pu être créé dans ClickUp" }, { status: 502 });
    }
    const cree = await res.json();
    return NextResponse.json({ success: true, id: String(cree.id) });
  } catch (error) {
    console.error('Erreur création scénario :', error);
    return NextResponse.json({ success: false, error: 'Erreur Serveur' }, { status: 500 });
  }
}
