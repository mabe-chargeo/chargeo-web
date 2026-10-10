import { NextResponse } from 'next/server';
import { getQualificationListId } from '@/lib/listesClickUp';

// Planning terrain (lot 3.2, 10/10/2026) :
// - liste choisie selon l'environnement (vraie Qualification en production, TEST en preview) ;
// - toutes les pages ClickUp lues (100 fiches par page), plus seulement la première ;
// - adresse lue par identifiant de champ : Lieu du chantier d'abord, puis Adresse du client.
const LIEU_CHANTIER_ID = '5b9cbfd6-535c-4416-b530-776f949ce432';
const ADRESSE_ID = '990a7f3b-989f-416d-9a80-eba5654b228d';
const PAGES_MAX = 20;

function lireAdresse(task: any): string {
  for (const id of [LIEU_CHANTIER_ID, ADRESSE_ID]) {
    const champ = task.custom_fields?.find((f: any) => f.id === id);
    const v = champ?.value;
    const adresse = v?.formatted_address || (typeof v === 'string' ? v : '');
    if (adresse) return adresse;
  }
  return 'Adresse non renseignée';
}

export async function GET() {
  const token = process.env.CLICKUP_API_KEY;
  const listId = getQualificationListId();

  if (!token || !listId) {
    return NextResponse.json({ error: "Configuration ClickUp manquante" }, { status: 500 });
  }

  try {
    const toutes: any[] = [];
    for (let page = 0; page < PAGES_MAX; page++) {
      const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false&page=${page}`, {
        headers: { 'Authorization': token },
        cache: 'no-store' // On veut tjs le planning à jour
      });
      if (!res.ok) {
        return NextResponse.json({ error: "Lecture du planning ClickUp impossible" }, { status: 502 });
      }
      const data = await res.json();
      const taches = Array.isArray(data.tasks) ? data.tasks : [];
      toutes.push(...taches);
      // ClickUp indique la dernière page avec last_page : true
      if (data.last_page !== false || taches.length === 0) break;
    }

    // On garde les chantiers dont le statut contient le mot "VISITER"
    const chantiersAVisiter = toutes
      .filter((task: any) => {
        const statut = task.status?.status?.toUpperCase() || "";
        return statut.includes("VISITER");
      })
      .map((task: any) => ({
        id: task.id,
        nom: task.name,
        adresse: lireAdresse(task),
      }));

    return NextResponse.json(chantiersAVisiter);
  } catch (error) {
    return NextResponse.json({ error: "Erreur de connexion ClickUp" }, { status: 500 });
  }
}
