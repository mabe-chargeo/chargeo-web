import { NextResponse } from 'next/server';

// Production : CLICKUP_LIST_QUALIFICATION_ID (variable existante, inchangée).
// Preview / test : UNIQUEMENT CLICKUP_LIST_QUALIFICATION_TEST_ID (liste 🧪 Qualification TEST),
// pour que le relevé terrain de test ne modifie jamais une vraie fiche client.
function getQualificationListId(): string | undefined {
  if (process.env.VERCEL_ENV === 'production') {
    return process.env.CLICKUP_LIST_QUALIFICATION_ID?.trim() || undefined;
  }
  return process.env.CLICKUP_LIST_QUALIFICATION_TEST_ID?.trim() || undefined;
}

export async function GET() {
  const token = process.env.CLICKUP_API_KEY;
  const listId = getQualificationListId();

  if (!token || !listId) {
    return NextResponse.json({ error: "Configuration ClickUp manquante" }, { status: 500 });
  }

  try {
    // On récupère les tâches de ta liste
    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false`, {
      headers: { 'Authorization': token },
      cache: 'no-store' // On veut tjs le planning à jour
    });

    const data = await res.json();

    if (!data.tasks) {
      return NextResponse.json([]);
    }

    // On garde les chantiers dont le statut contient le mot "VISITER" (ça ignore les accents/espaces)
    const chantiersAVisiter = data.tasks
      .filter((task: any) => {
        const statut = task.status?.status?.toUpperCase() || "";
        return statut.includes("VISITER");
      })
      .map((task: any) => ({
        id: task.id,
        nom: task.name,
        adresse: task.custom_fields?.find((f: any) => f.name.includes("Adresse"))?.value?.formatted_address || "Adresse non renseignée"
      }));

    return NextResponse.json(chantiersAVisiter);
  } catch (error) {
    return NextResponse.json({ error: "Erreur de connexion ClickUp" }, { status: 500 });
  }
}
