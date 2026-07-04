import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY as string; 
    const LIST_ID = process.env.CLICKUP_SAV_LIST_ID;

    if (!data.message || !data.clientId) {
      return NextResponse.json({ success: false, error: "Champs manquants" }, { status: 400 });
    }

    // 1️⃣ ÉTAPE 1 : Création de la tâche de base avec les menus déroulants
    const response = await fetch(`https://api.clickup.com/api/v2/list/${LIST_ID}/task`, {
      method: 'POST',
      headers: {
        'Authorization': CLICKUP_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `SAV - ${data.nomClient}`, 
        description: `Message du client :\n\n"${data.message}"`,
        custom_fields: [
          ...(data.severite ? [{
            id: "c2ae4e08-6903-4698-af96-a40082c11b39", 
            value: data.severite
          }] : []),
          ...(data.typePanne ? [{
            id: "cb7bb1fe-6e64-4e1f-ab85-05860871d854", 
            value: data.typePanne
          }] : [])
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erreur Création ClickUp:", errorData);
      return NextResponse.json({ success: false, error: "Erreur ClickUp Création" }, { status: 500 });
    }

    // On récupère la tâche toute fraîche qui vient d'être créée
    const newTask = await response.json();

    // 2️⃣ ÉTAPE 2 : Forcer la relation (ClickUp exige la commande "add" pour lier des dossiers)
    await fetch(`https://api.clickup.com/api/v2/task/${newTask.id}/field/3804df6e-a2e1-4058-913c-447189c73d35`, {
      method: 'POST',
      headers: {
        'Authorization': CLICKUP_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: {
          add: [data.clientId] // 👈 La syntaxe exacte exigée par ClickUp pour les relations
        }
      })
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur Serveur" }, { status: 500 });
  }
}