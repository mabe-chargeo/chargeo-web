import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY as string; 
    const LIST_ID = "901519702632";

    // --- LA MAGIE : Formatage du téléphone pour ClickUp ---
    // 1. On enlève les espaces potentiels tapés par le client
    let telFormate = data.telephone.replace(/\s+/g, '');
    // 2. Si le numéro commence par 0, on le remplace par +33
    if (telFormate.startsWith('0')) {
      telFormate = '+33' + telFormate.substring(1);
    }

    // Traduction du type de client pour le menu déroulant ClickUp (0=Particulier, 1=Pro, 2=Syndic)
    let typeClientIndex = null; 
        if (data.typeClient === "Particulier") typeClientIndex = 0;
        if (data.typeClient === "Entreprise") typeClientIndex = 1; 
        if (data.typeClient === "Copropriété") typeClientIndex = 2;

    // Envoi des données vers ClickUp
    const response = await fetch(`https://api.clickup.com/api/v2/list/${LIST_ID}/task`, {
      method: 'POST',
      headers: {
        'Authorization': CLICKUP_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Lead Site Web : ${data.nom}`, 
        description: `Résultat du simulateur : ${data.simulation || "Aucune simulation"}\n\nMessage envoyé par le client :\n\n"${data.message}"`,
        
        custom_fields: [
          {
            id: "66aee5d1-7159-46a7-b986-3dd6c314fd80", 
            value: data.email
          },
          {
        id: "6a120794-23be-4c50-8d25-75993f0aece4", 
        value: telFormate
      },
      {
        id: "f6b45107-9ba0-406b-8fd7-d678e6ad11dc", 
        value: typeClientIndex
      }
        ]
      })
    });

    if (response.ok) {
      return NextResponse.json({ success: true });
    } else {
      const errorData = await response.json();
      console.error("Erreur renvoyée par ClickUp:", errorData);
      return NextResponse.json({ success: false, error: "Erreur ClickUp" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur Serveur" }, { status: 500 });
  }
}