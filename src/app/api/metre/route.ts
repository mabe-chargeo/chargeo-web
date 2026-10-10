import { NextResponse } from 'next/server';
import { lireTacheQualification } from '@/lib/listesClickUp';

// Enregistrement des MESURES du relevé (lots 3.2 et 3.3, 10/10/2026).
// - La fiche (ou le scénario) doit appartenir à la liste autorisée (vraie Qualification en production, TEST en preview).
// - Chaque écriture ClickUp est contrôlée : succès seulement si TOUT est enregistré.
// - La description de la fiche n'est plus touchée (le message du client reste intact).
// - Champ vide = non mesuré = rien écrit ; 0 = zéro, écrit (une correction 12 -> 0 passe).
// - Matériels à chiffrer (point 12 règle 1) : choix multiple ; Puissance Visée PDC seulement si un seul matériel.
// - Le statut n'est plus changé ici : /api/metre/finaliser s'en charge après réception des photos.
// Les menus restent écrits PAR INDEX (ne jamais réordonner les options dans ClickUp).

// Matériels à chiffrer : champ à étiquettes, écrit par identifiant d'option (stable, pas d'index)
const MATERIELS_CHAMP_ID = '784191c5-4252-47a4-af57-a7c5a54ca16b';
const MATERIELS_OPTIONS: Record<string, string> = {
  '3.7': 'b93f4cf9-15d0-4ff5-9e2e-4aa42640bb2e', // PR 3,7 kW
  '7.4': '9e82a938-74ca-43ee-a4cc-c3c437afcf19', // Borne 7,4 kW
  '11': '582c9ab0-ac96-47ca-8550-1bccc26e91ed',  // Borne 11 kW
  '22': '9b5a6497-8de0-44e6-bff7-b2206fd2f436',  // Borne 22 kW
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const taskId = String(formData.get('taskId') || '');
    const token = process.env.CLICKUP_API_KEY as string;

    const verif = await lireTacheQualification(taskId, token);
    if (!verif.ok) {
      return NextResponse.json({ success: false, error: verif.erreur }, { status: verif.status });
    }

    const texte = (cle: string): string => {
      const v = formData.get(cle);
      return typeof v === 'string' ? v : '';
    };
    // null = champ absent ou vide (non mesuré) ; nombre >= 0 sinon
    const nombre = (cle: string): number | null => {
      const brut = texte(cle).trim().replace(',', '.');
      if (brut === '') return null;
      const n = parseFloat(brut);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };

    const murSupport = texte('murSupport');
    const notesBrutes = texte('notes');
    const notesFinales = `SUPPORT PRÉVU : ${murSupport}\n\nOBSERVATIONS :\n${notesBrutes}`;

    // Traduction des menus déroulants par index
    // Segment : RES=0, DAP=1, COP=2, PAR=3, FLT=4, TER=5
    const segmentMap: Record<string, number> = { 'RES': 0, 'DAP': 1, 'COP': 2, 'PAR': 3, 'FLT': 4, 'TER': 5 };
    const segmentIndex = segmentMap[texte('segment')] ?? null;

    // Source de raccordement : Tableau individuel=0, TGBT services generaux=1, PDL dedie=2
    const sourceRaccStr = texte('sourceRacc');
    let sourceRaccIndex: number | null = null;
    if (sourceRaccStr.includes('individuel')) sourceRaccIndex = 0;
    else if (sourceRaccStr.includes('TGBT')) sourceRaccIndex = 1;
    else if (sourceRaccStr.includes('PDL')) sourceRaccIndex = 2;

    // Matériels à chiffrer (cases à cocher) et Puissance Visée PDC : 3.7=0, 7.4=1, 11=2, 22=3
    const puissanceViseeMap: Record<string, number> = { '3.7': 0, '7.4': 1, '11': 2, '22': 3 };
    const materiels = Array.from(new Set(
      formData.getAll('materiels').filter((v): v is string => typeof v === 'string' && v in MATERIELS_OPTIONS)
    ));
    // Puissance Visée ne porte qu'une valeur : écrite seulement si un seul matériel est coché
    // (ancien formulaire en cache : on accepte encore le champ puissanceVisee)
    const puissanceViseeIndex = materiels.length === 1
      ? (puissanceViseeMap[materiels[0]] ?? null)
      : (materiels.length === 0 ? (puissanceViseeMap[texte('puissanceVisee')] ?? null) : null);

    // Support Borne : Mur Beton/Parpaing=0, Mur Placo=1, Mur Bois=2, Sur Pied=3
    let murSupportIndex: number | null = null;
    if (murSupport.includes('Béton') || murSupport.includes('Beton') || murSupport.includes('Parpaing')) murSupportIndex = 0;
    else if (murSupport.includes('Placo')) murSupportIndex = 1;
    else if (murSupport.includes('Bois')) murSupportIndex = 2;
    else if (murSupport.includes('Pied')) murSupportIndex = 3;

    // Type Raccordement : Mono=0, Tri=1
    const raccordementIndex = texte('typeRaccordement').includes('Tri') ? 1 : 0;

    // Puissance Dispo : 3=0, 6=1, 9=2, 12=3, 18+=4
    const puissanceStr = texte('puissance');
    let puissanceIndex = 1; // 6 kVA par défaut
    if (puissanceStr.includes('3')) puissanceIndex = 0;
    if (puissanceStr.includes('9')) puissanceIndex = 2;
    if (puissanceStr.includes('12')) puissanceIndex = 3;
    if (puissanceStr.includes('18')) puissanceIndex = 4;

    // État Tableau : OK=0, remanier=1, remplacer=2
    const etatStr = texte('etatTableau');
    let etatIndex: number | null = null;
    if (etatStr === 'OK') etatIndex = 0;
    else if (etatStr.includes('remanier')) etatIndex = 1;
    else if (etatStr.includes('remplacer')) etatIndex = 2;

    // Réseau : WiFi=0, 4G=1, Câble=2
    const reseauStr = texte('reseau');
    let reseauIndex: number | null = null;
    if (reseauStr.includes('WiFi')) reseauIndex = 0;
    else if (reseauStr.includes('4G')) reseauIndex = 1;
    else if (reseauStr.includes('Cable') || reseauStr.includes('Câble')) reseauIndex = 2;

    // Taille HUB : 10=0, 20=1, 150=2
    const hubMap: Record<string, number> = { '10': 0, '20': 1, '150': 2 };
    const tailleHUBIndex = hubMap[texte('tailleHUB')] ?? null;

    // Zone Déplacement : Z1=0, Z2=1, Z3=2
    const zoneMap: Record<string, number> = { 'Z1': 0, 'Z2': 1, 'Z3': 2 };
    const zoneDeplIndex = zoneMap[texte('zoneDepl')] ?? null;

    // Délesteur : une seule valeur "true" / "false", envoyée seulement si la case est affichée
    const delesteurStr = texte('besoinDelesteur');
    const delesteur = delesteurStr === 'true' ? true : delesteurStr === 'false' ? false : null;

    // Liste des écritures : rien n'est écrit pour une valeur absente (null)
    const champs: { id: string; nom: string; value: any }[] = [];
    const pousser = (id: string, nom: string, value: any) => {
      if (value !== null && value !== undefined) champs.push({ id, nom, value });
    };

    pousser("f122fe49-8a32-4fbd-a374-f27eeb4e25c1", "Type raccordement", raccordementIndex);
    pousser("6a592626-ac8f-4a28-99a0-f1c6bdde09ea", "Puissance dispo", puissanceIndex);
    pousser("1442f71a-830e-4a77-8d78-0c30f45c4b23", "Notes cheminement", notesFinales);
    pousser("965fbd93-9c39-4dc4-9d3e-17aa63f667df", "État tableau", etatIndex);
    pousser("fe5e2142-8191-4e61-86ee-d1e88ed4dc44", "Réseau", reseauIndex);
    pousser("bbef17d5-bdb2-4c25-bacc-00accdcdcbbf", "Délesteur", delesteur);
    pousser("2db3f8ea-8fae-4f9f-80ca-3ea9a512ebbb", "Source de raccordement", sourceRaccIndex);
    if (materiels.length > 0) {
      pousser(MATERIELS_CHAMP_ID, "Matériels à chiffrer", materiels.map((m) => MATERIELS_OPTIONS[m]));
    }

    // Terre + distances + percements + infrastructure (vide = rien, 0 = zéro)
    pousser("586b30e6-c225-4ee1-a9cb-2f2dc332fab9", "Terre", nombre('terre'));
    pousser("5370ee5e-8bed-435f-a924-70fa117ed78a", "Tube apparent", nombre('distApparent'));
    pousser("cccfa938-5bec-459c-85b8-6574a32ef89d", "Goulotte", nombre('distGoulotte'));
    pousser("c0c89b35-f1a2-41a8-8602-81391b421715", "Encastré", nombre('distEncastre'));
    pousser("d938dd22-2f04-4aba-a6db-f8fa8b62d1ee", "Vide sanitaire", nombre('distVideSanitaire'));
    pousser("b89814c1-e0e9-4997-886e-d8637006afc0", "Chemin de câbles", nombre('distCDC'));
    pousser("ae081f1f-0a23-4a3d-918e-a8396e091214", "Tirage existant", nombre('distTirage'));
    pousser("47a7156e-0852-4690-b747-e583f2b560a7", "Tranchée", nombre('distTranchee'));
    pousser("8c57869c-447f-4350-b6d3-a02bc738bddd", "Percements placo", nombre('percementPlaco'));
    pousser("e6ec48b2-77c7-45ff-bcfa-6de603dc731b", "Percements brique", nombre('percementBrique'));
    pousser("77120088-4d88-4675-a7ac-d34f8eb5ffa7", "Percements béton", nombre('percementBeton'));
    pousser("bda05bcd-b5f1-424f-bda4-ad435f06e32f", "Percements dalle", nombre('percementDalle'));
    pousser("dd19d42f-8d9f-4657-bac5-942de6822468", "Places parking", nombre('nbPlacesParking'));
    pousser("dc5878d3-dac5-4426-bfae-43c3ba3eaacc", "Longueur artère", nombre('longueurArtere'));
    pousser("c555210d-1b5e-4ab8-ba7f-ffc7811ebc14", "TGBT vers TD", nombre('distTGBT'));
    pousser("0ebc0cc5-97ae-4525-bc8d-ab98c3a3bd81", "Routeur vers TD", nombre('distRouteur'));

    // Menus affichés selon le segment (masqué = non transmis = rien écrit)
    pousser("02d61a39-eb1d-417c-953a-c1504dbfae50", "Support borne", murSupportIndex);
    pousser("dbdacf18-1d26-4c58-9bbb-b4a9e443daa2", "Segment", segmentIndex);
    pousser("ddadfb52-ea48-4aca-9e85-86a4eca6615b", "Puissance visée", puissanceViseeIndex);
    pousser("85f237d4-792e-4851-89f9-675ae1144a73", "Taille HUB", tailleHUBIndex);
    pousser("0f9043bf-ec87-4534-b8ea-af41734bdfed", "Zone déplacement", zoneDeplIndex);

    // Envoi en parallèle, chaque réponse contrôlée
    const resultats = await Promise.all(champs.map(async (champ) => {
      try {
        const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/field/${champ.id}`, {
          method: 'POST',
          headers: { 'Authorization': token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: champ.value })
        });
        if (!res.ok) {
          console.error(`Écriture refusée (${res.status}) : ${champ.nom}`, await res.text().catch(() => ''));
          return champ.nom;
        }
        return null;
      } catch {
        return champ.nom;
      }
    }));

    const echecs = resultats.filter((r): r is string => r !== null);
    if (echecs.length > 0) {
      return NextResponse.json({ success: false, error: "Certains champs n'ont pas été enregistrés", echecs }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur relevé :", error);
    return NextResponse.json({ success: false, error: "Erreur Serveur" }, { status: 500 });
  }
}
