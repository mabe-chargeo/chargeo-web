import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const taskId = formData.get('taskId') as string;
    const token = process.env.CLICKUP_API_KEY as string;

    // 1. Récupération et formatage mathématique rigoureux
    // Électricité
    const terre = parseFloat(formData.get('terre') as string) || 0;
    const besoinDelesteur = formData.get('besoinDelesteur') === 'true';
    
    // Distances
    const distApparent = parseFloat(formData.get('distApparent') as string) || 0;
    const distVideSanitaire = parseFloat(formData.get('distVideSanitaire') as string) || 0;
    const distTranchee = parseFloat(formData.get('distTranchee') as string) || 0;
    const distEncastre = parseFloat(formData.get('distEncastre') as string) || 0;

    // Percements (séparés par type de mur)
    const percementPlaco = parseFloat(formData.get('percementPlaco') as string) || 0;
    const percementBrique = parseFloat(formData.get('percementBrique') as string) || 0;
    const percementBeton = parseFloat(formData.get('percementBeton') as string) || 0;
    const percementDalle = parseFloat(formData.get('percementDalle') as string) || 0;
    
    const murSupport = formData.get('murSupport') as string || "";
    const notesBrutes = formData.get('notes') as string || "";
    
    // On sécurise l'info du mur en l'intégrant aux notes
    const notesFinales = `SUPPORT PRÉVU : ${murSupport}\n\nOBSERVATIONS :\n${notesBrutes}`;

    // 2. Traduction des menus déroulants (Les bons index de ton ClickUp)
    const raccordementStr = formData.get('typeRaccordement') as string || "";
    let raccordementIndex = 0; // Mono (Index 0)
    if (raccordementStr.includes('Tri')) raccordementIndex = 1;

    const puissanceStr = formData.get('puissance') as string || "";
    let puissanceIndex = 1; // 6 kVA (Index 1)
    if (puissanceStr.includes('3')) puissanceIndex = 0;
    if (puissanceStr.includes('9')) puissanceIndex = 2;
    if (puissanceStr.includes('12')) puissanceIndex = 3;
    if (puissanceStr.includes('18')) puissanceIndex = 4;

    const etatStr = formData.get('etatTableau') as string || "";
    let etatIndex = 0; // OK (Index 0)
    if (etatStr.includes('remanier')) etatIndex = 1;
    if (etatStr.includes('remplacer')) etatIndex = 2;

    const reseauStr = formData.get('reseau') as string || "";
    let reseauIndex = 1; // 4G OK (Index 1)
    if (reseauStr.includes('WiFi')) reseauIndex = 0;
    if (reseauStr.includes('Câble')) reseauIndex = 2;

    // 3. Mise à jour de la description classique de la tâche
    await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      method: 'PUT',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: notesFinales })
    });

    // 4. Envoi des VRAIS champs personnalisés (ClickUp exige un POST par champ pour les mises à jour)
    const customFields = [
      { id: "f122fe49-8a32-4fbd-a374-f27eeb4e25c1", value: raccordementIndex }, // Type Raccordement
      { id: "586b30e6-c225-4ee1-a9cb-2f2dc332fab9", value: terre }, // Terre
      { id: "bbef17d5-bdb2-4c25-bacc-00accdcdcbbf", value: besoinDelesteur }, // Besoin Délesteur
      { id: "6a592626-ac8f-4a28-99a0-f1c6bdde09ea", value: puissanceIndex }, // Puissance
      { id: "965fbd93-9c39-4dc4-9d3e-17aa63f667df", value: etatIndex }, // Etat Tableau
      { id: "fe5e2142-8191-4e61-86ee-d1e88ed4dc44", value: reseauIndex }, // Réseau
      { id: "5370ee5e-8bed-435f-a924-70fa117ed78a", value: distApparent }, // Dist Apparent
      { id: "d938dd22-2f04-4aba-a6db-f8fa8b62d1ee", value: distVideSanitaire }, // Dist Vide Sanitaire
      { id: "47a7156e-0852-4690-b747-e583f2b560a7", value: distTranchee }, // Dist Tranchée
      { id: "c0c89b35-f1a2-41a8-8602-81391b421715", value: distEncastre }, // Dist Encastré
      { id: "8c57869c-447f-4350-b6d3-a02bc738bddd", value: percementPlaco }, // Percement Placo
      { id: "e6ec48b2-77c7-45ff-bcfa-6de603dc731b", value: percementBrique }, // Percement Brique
      { id: "77120088-4d88-4675-a7ac-d34f8eb5ffa7", value: percementBeton }, // Percement Béton
      { id: "bda05bcd-b5f1-424f-bda4-ad435f06e32f", value: percementDalle }, // Percement Dalle
      { id: "1442f71a-830e-4a77-8d78-0c30f45c4b23", value: notesFinales } // Notes
    ];

    // On tire toutes les requêtes en même temps pour gagner du temps
    await Promise.all(customFields.map(field => 
      fetch(`https://api.clickup.com/api/v2/task/${taskId}/field/${field.id}`, {
        method: 'POST',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: field.value })
      })
    ));

    // 5. Upload des photos dans le champ personnalisé spécifique "Photos Visite"
    const files = [
      formData.get('photoTableau') as File, 
      formData.get('photoBorne') as File
    ];

    // 5. Upload des photos (ClickUp API v2 oblige de les mettre dans les pièces jointes générales)
    for (const file of files) {
      // On vérifie que le fichier existe bien et n'est pas "vide"
      if (file && file.size > 0 && file.name !== 'undefined') {
        const fileData = new FormData();
        fileData.append('attachment', file);
        
        // On repasse sur l'URL d'attachement officielle de la tâche
        await fetch(`https://api.clickup.com/api/v2/task/${taskId}/attachment`, {
          method: 'POST',
          headers: { 'Authorization': token },
          body: fileData
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur Upload Métré:", error);
    return NextResponse.json({ success: false, error: "Erreur Serveur" }, { status: 500 });
  }
}