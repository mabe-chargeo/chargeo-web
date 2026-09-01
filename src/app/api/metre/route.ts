import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const taskId = formData.get('taskId') as string;
    const token = process.env.CLICKUP_API_KEY as string;

    // 1. Récupération et formatage
    // Électricité
    const terre = parseFloat(formData.get('terre') as string) || 0;
    const besoinDelesteur = formData.get('besoinDelesteur') === 'true';
    
    // Distances (7 méthodes de pose Costructor)
    const distApparent = parseFloat(formData.get('distApparent') as string) || 0;
    const distGoulotte = parseFloat(formData.get('distGoulotte') as string) || 0;
    const distEncastre = parseFloat(formData.get('distEncastre') as string) || 0;
    const distVideSanitaire = parseFloat(formData.get('distVideSanitaire') as string) || 0;
    const distCDC = parseFloat(formData.get('distCDC') as string) || 0;
    const distTirage = parseFloat(formData.get('distTirage') as string) || 0;
    const distTranchee = parseFloat(formData.get('distTranchee') as string) || 0;

    // Percements
    const percementPlaco = parseFloat(formData.get('percementPlaco') as string) || 0;
    const percementBrique = parseFloat(formData.get('percementBrique') as string) || 0;
    const percementBeton = parseFloat(formData.get('percementBeton') as string) || 0;
    const percementDalle = parseFloat(formData.get('percementDalle') as string) || 0;

    // Infrastructure Copro
    const nbPlacesParking = parseFloat(formData.get('nbPlacesParking') as string) || 0;
    const longueurArtere = parseFloat(formData.get('longueurArtere') as string) || 0;
    const distTGBT = parseFloat(formData.get('distTGBT') as string) || 0;
    const distRouteur = parseFloat(formData.get('distRouteur') as string) || 0;
    
    const murSupport = formData.get('murSupport') as string || "";
    const notesBrutes = formData.get('notes') as string || "";
    const notesFinales = `SUPPORT PR\u00c9VU : ${murSupport}\n\nOBSERVATIONS :\n${notesBrutes}`;

    // 2. Traduction des menus déroulants par index
    const raccordementStr = formData.get('typeRaccordement') as string || "";
    let raccordementIndex = 0;
    if (raccordementStr.includes('Tri')) raccordementIndex = 1;

    const puissanceStr = formData.get('puissance') as string || "";
    let puissanceIndex = 1;
    if (puissanceStr.includes('3')) puissanceIndex = 0;
    if (puissanceStr.includes('9')) puissanceIndex = 2;
    if (puissanceStr.includes('12')) puissanceIndex = 3;
    if (puissanceStr.includes('18')) puissanceIndex = 4;

    const etatStr = formData.get('etatTableau') as string || "";
    let etatIndex = 0;
    if (etatStr.includes('remanier')) etatIndex = 1;
    if (etatStr.includes('remplacer')) etatIndex = 2;

    const reseauStr = formData.get('reseau') as string || "";
    let reseauIndex = 1;
    if (reseauStr.includes('WiFi')) reseauIndex = 0;
    if (reseauStr.includes('C\u00e2ble')) reseauIndex = 2;

    // Taille HUB : 10 = index 0, 20 = index 1, 150 = index 2
    const tailleHUBStr = formData.get('tailleHUB') as string || "";
    let tailleHUBIndex: number | null = null;
    if (tailleHUBStr === '10') tailleHUBIndex = 0;
    if (tailleHUBStr === '20') tailleHUBIndex = 1;
    if (tailleHUBStr === '150') tailleHUBIndex = 2;

    // Zone Déplacement : Z1 = index 0, Z2 = index 1, Z3 = index 2
    const zoneDeplStr = formData.get('zoneDepl') as string || "";
    let zoneDeplIndex: number | null = null;
    if (zoneDeplStr === 'Z1') zoneDeplIndex = 0;
    if (zoneDeplStr === 'Z2') zoneDeplIndex = 1;
    if (zoneDeplStr === 'Z3') zoneDeplIndex = 2;

    // 3. Mise à jour de la description
    await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      method: 'PUT',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: notesFinales })
    });

    // 4. Champs personnalisés communs (électricité + distances + percements + notes)
    const customFields: { id: string; value: any }[] = [
      { id: "f122fe49-8a32-4fbd-a374-f27eeb4e25c1", value: raccordementIndex }, // Type Raccordement
      { id: "586b30e6-c225-4ee1-a9cb-2f2dc332fab9", value: terre }, // Terre
      { id: "bbef17d5-bdb2-4c25-bacc-00accdcdcbbf", value: besoinDelesteur }, // Besoin Délesteur
      { id: "6a592626-ac8f-4a28-99a0-f1c6bdde09ea", value: puissanceIndex }, // Puissance Dispo
      { id: "965fbd93-9c39-4dc4-9d3e-17aa63f667df", value: etatIndex }, // Etat Tableau
      { id: "fe5e2142-8191-4e61-86ee-d1e88ed4dc44", value: reseauIndex }, // Réseau
      // 7 distances
      { id: "5370ee5e-8bed-435f-a924-70fa117ed78a", value: distApparent }, // Dist Tube Apparent
      { id: "cccfa938-5bec-459c-85b8-6574a32ef89d", value: distGoulotte }, // Dist Goulotte
      { id: "c0c89b35-f1a2-41a8-8602-81391b421715", value: distEncastre }, // Dist Encastré
      { id: "d938dd22-2f04-4aba-a6db-f8fa8b62d1ee", value: distVideSanitaire }, // Dist Vide Sanitaire
      { id: "b89814c1-e0e9-4997-886e-d8637006afc0", value: distCDC }, // Dist Chemin de Câbles
      { id: "ae081f1f-0a23-4a3d-918e-a8396e091214", value: distTirage }, // Dist Tirage Existant
      { id: "47a7156e-0852-4690-b747-e583f2b560a7", value: distTranchee }, // Dist Tranchée
      // Percements
      { id: "8c57869c-447f-4350-b6d3-a02bc738bddd", value: percementPlaco },
      { id: "e6ec48b2-77c7-45ff-bcfa-6de603dc731b", value: percementBrique },
      { id: "77120088-4d88-4675-a7ac-d34f8eb5ffa7", value: percementBeton },
      { id: "bda05bcd-b5f1-424f-bda4-ad435f06e32f", value: percementDalle },
      // Notes
      { id: "1442f71a-830e-4a77-8d78-0c30f45c4b23", value: notesFinales },
    ];

    // Champs infra : n'écrire QUE si au moins une valeur infra est > 0 (ne pas polluer les relevés RES/DAP)
    const hasInfra = nbPlacesParking > 0 || longueurArtere > 0 || distTGBT > 0 || distRouteur > 0;
    if (hasInfra) {
      customFields.push(
        { id: "dd19d42f-8d9f-4657-bac5-942de6822468", value: nbPlacesParking },
        { id: "dc5878d3-dac5-4426-bfae-43c3ba3eaacc", value: longueurArtere },
        { id: "c555210d-1b5e-4ab8-ba7f-ffc7811ebc14", value: distTGBT },
        { id: "0ebc0cc5-97ae-4525-bc8d-ab98c3a3bd81", value: distRouteur },
      );
    }

    // Taille HUB : seulement si sélectionné
    if (tailleHUBIndex !== null) {
      customFields.push({ id: "85f237d4-792e-4851-89f9-675ae1144a73", value: tailleHUBIndex });
    }

    // Zone Déplacement : seulement si sélectionné explicitement
    if (zoneDeplIndex !== null) {
      customFields.push({ id: "0f9043bf-ec87-4534-b8ea-af41734bdfed", value: zoneDeplIndex });
    }

    // Envoi en parallèle
    await Promise.all(customFields.map(field => 
      fetch(`https://api.clickup.com/api/v2/task/${taskId}/field/${field.id}`, {
        method: 'POST',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: field.value })
      })
    ));

    // 5. Upload des photos
    const files = [
      formData.get('photoTableau') as File, 
      formData.get('photoBorne') as File
    ];

    for (const file of files) {
      if (file && file.size > 0 && file.name !== 'undefined') {
        const fileData = new FormData();
        fileData.append('attachment', file);
        await fetch(`https://api.clickup.com/api/v2/task/${taskId}/attachment`, {
          method: 'POST',
          headers: { 'Authorization': token },
          body: fileData
        });
      }
    }

    // 6. Changement automatique de statut : la t\u00e2che passe en "devis \u00e0 faire"
    // Cela la retire de /interne (qui filtre sur "VISITER") et cr\u00e9e la to-do bureau
    await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      method: 'PUT',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: "\ud83d\udcdd devis \u00e0 faire" })
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur Upload M\u00e9tr\u00e9:", error);
    return NextResponse.json({ success: false, error: "Erreur Serveur" }, { status: 500 });
  }
}
