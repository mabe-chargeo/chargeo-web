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
    
    // Fonction magique qui ignore les accents/majuscules et extrait le texte des listes déroulantes
    const getField = (fieldName: string) => {
      const clean = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      const target = clean(fieldName);
      const field = taskData.custom_fields?.find((f: any) => f.name && clean(f.name) === target);
      
      if (!field || field.value === undefined) return undefined;
      
      // Si c'est une liste déroulante (comme Type Client), on récupère le vrai texte au lieu de l'ID
      if (field.type === 'drop_down' && field.type_config?.options) {
        const option = field.type_config.options.find((o: any) => o.orderindex === field.value || o.id === field.value);
        return option ? option.name : field.value;
      }
      return field.value;
    };

    const clientEmail = getField("Email");
    const clientPhone = getField("Telephone"); // Repère "Telephone" sans accent
    const clientType = getField("Type Client");   // Repère "Type Client" sans le "de"
    const clientAddress = getField("Adresse");

    // 4. On prépare le paquet de données formaté pour l'API de Costructor
    const nameParts = clientName ? clientName.trim().split(' ') : [];
    const lastName = nameParts[0] || '';
    const firstName = nameParts.slice(1).join(' ') || '';

    const isCompany = clientType && (
      clientType.toLowerCase().includes('pro') || 
      clientType.toLowerCase().includes('b2b') || 
      clientType.toLowerCase().includes('professionnel')
    );

    const costructorPayload = {
      type: 'client',
      legalStatus: isCompany ? 'company' : 'individual',
      name: clientName,
      firstName: firstName,
      lastName: lastName,
      
      // On structure les e-mails et téléphones sous forme d'objets dans le tableau
      emails: clientEmail ? [{ email: clientEmail }] : undefined,
      phones: clientPhone ? [{ phone: clientPhone }] : undefined,
      
      // Structure standard pour l'adresse
      address: clientAddress ? { text: clientAddress } : undefined
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