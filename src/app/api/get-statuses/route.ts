import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.CLICKUP_API_KEY;
  
  // On cible directement l'ID de la liste Planning Chantiers que tu viens de me donner
  const listId = "901520038258"; 

  if (!token || !listId) {
    return NextResponse.json({ error: "Clé API ou ID de liste manquant" }, { status: 500 });
  }

  try {
    // On interroge les paramètres généraux de la liste
    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}`, {
      headers: { 'Authorization': token },
      cache: 'no-store'
    });

    const data = await res.json();

    if (!data.statuses) {
      return NextResponse.json({ error: "Aucun statut trouvé", details: data });
    }

    // On nettoie la réponse pour extraire uniquement la chronologie des statuts
    const statutsChronologiques = data.statuses.map((s: any) => ({
      nom: s.status,
      couleur: s.color,
      ordre: s.orderindex,
      type: s.type // open, custom, closed...
    }));

    // On trie le tableau pour qu'il soit dans le même ordre que ton tunnel sur ClickUp
    statutsChronologiques.sort((a: any, b: any) => a.ordre - b.ordre);

    return NextResponse.json(statutsChronologiques);
  } catch (error) {
    return NextResponse.json({ error: "Erreur Serveur" }, { status: 500 });
  }
}