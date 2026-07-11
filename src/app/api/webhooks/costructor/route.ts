import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Récupération de l'ID de la tâche que ClickUp a glissé dans l'URL
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    const clickUpToken = process.env.CLICKUP_API_KEY;
    const costructorToken = process.env.COSTRUCTOR_API_KEY;

    if (!taskId) {
      return NextResponse.json({ error: "Aucun taskId reçu" }, { status: 400 });
    }

    if (!clickUpToken || !costructorToken) {
      console.error("Clés API manquantes dans le .env.local");
      return NextResponse.json({ error: "Configuration serveur incomplète" }, { status: 500 });
    }

    // 2. On va chercher les détails de la tâche chez ClickUp avec ce taskId
    const clickUpRes = await fetch(`https://api.clickup.com/api/v2/task/${taskId}?custom_task_ids=true`, {
      method: 'GET',
      headers: { 'Authorization': clickUpToken },
      cache: 'no-store'
    });

    if (!clickUpRes.ok) {
      throw new Error("Impossible de lire la tâche sur ClickUp");
    }

    const taskData = await clickUpRes.json();

    // 3. Extraction du nom et des champs personnalisés (Email, Téléphone)
    const clientName = taskData.name;
    
    // Fonction utilitaire pour trouver un champ personnalisé par son nom
    const getField = (fieldName: string) => {
      const field = taskData.custom_fields?.find((f: any) => f.name === fieldName);
      return field ? field.value : undefined;
    };

    const clientEmail = getField("Email");
    const clientPhone = getField("Téléphone");
    const clientType = getField("Type de client"); // Ex: "Pro" ou "Particulier"

    // 4. On prépare le paquet de données formaté exactement comme Costructor le demande
    const costructorPayload = {
      type: 'client',
      legalStatus: (clientType === 'Pro' || clientType === 'B2B') ? 'company' : 'individual',
      // Selon l'API Costructor, les infos de contact vont souvent dans un objet 'address' ou à la racine.
      // À ajuster si besoin en fonction de la création de contact.
    };

    // 5. On envoie l'ordre de création à Costructor
    const costructorRes = await fetch('https://api.costructor.co/external/v1/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${costructorToken}`
      },
      body: JSON.stringify(costructorPayload)
    });

    if (!costructorRes.ok) {
      const errorText = await costructorRes.text();
      console.error("L'API Costructor a refusé la requête :", errorText);
      throw new Error("Erreur lors de la création dans Costructor");
    }

    // Si tout s'est bien passé
    return NextResponse.json({ success: true, message: `Fiche de ${clientName} créée avec succès !` });

  } catch (error) {
    console.error("Erreur Webhook Costructor :", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}