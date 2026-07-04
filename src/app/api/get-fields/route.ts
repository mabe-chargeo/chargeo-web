import { NextResponse } from 'next/server';

export async function GET() {
  // Remplace par un ID de tâche valide de ta liste Qualification si celui-ci est vieux
  const taskId = "86caett4u"; 
  const token = process.env.CLICKUP_API_KEY as string;

  try {
    const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      headers: { 'Authorization': token }
    });
    
    const data = await res.json();

    if (!data.custom_fields) {
      return NextResponse.json({ error: "Aucun champ trouvé ou mauvaise tâche", data });
    }

    // On extrait uniquement ce qui nous intéresse pour coder
    const champsNettoyes = data.custom_fields.map((champ: any) => {
      let options = "Pas d'options";
      
      // Si c'est un menu déroulant, on récupère l'index exact attendu par ClickUp
      if (champ.type === 'drop_down' || champ.type === 'labels') {
        options = champ.type_config?.options?.map((opt: any) => 
          `[Index: ${opt.orderindex}] = ${opt.name || opt.label}`
        );
      }

      return {
        NOM_DU_CHAMP: champ.name,
        ID_SECRET: champ.id,
        TYPE: champ.type,
        OPTIONS_DEROULANTES: options
      };
    });

    return NextResponse.json(champsNettoyes);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" });
  }
}