import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.CLICKUP_API_KEY;
  // On utilise bien l'ID de la liste SAV que tu as mis dans ton fichier .env.local
  const listId = process.env.CLICKUP_SAV_LIST_ID; 

  if (!token || !listId) {
    return NextResponse.json({ error: "Clé API ou ID de la liste SAV manquant" }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/field`, {
      headers: { 'Authorization': token },
      cache: 'no-store'
    });

    const data = await res.json();

    if (!data.fields) {
      return NextResponse.json({ error: "Aucun champ trouvé ou erreur ClickUp", details: data });
    }

    // On nettoie la réponse pour n'afficher que ce qui nous intéresse pour coder le formulaire
    const champsSimplifies = data.fields.map((field: any) => ({
      nom: field.name,
      id: field.id,
      type: field.type,
      // Si c'est un menu déroulant, on affiche les options et leurs IDs
      options: field.type_config?.options?.map((opt: any) => ({
        nomOption: opt.name,
        idOption: opt.id
      }))
    }));

    return NextResponse.json(champsSimplifies);
  } catch (error) {
    return NextResponse.json({ error: "Erreur Serveur" }, { status: 500 });
  }
}