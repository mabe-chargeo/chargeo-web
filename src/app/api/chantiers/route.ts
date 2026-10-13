import { NextResponse } from 'next/server';
import { getQualificationListId, estAVisiter } from '@/lib/listesClickUp';
import { typeDesSousReleves } from '@/lib/scenarios';

// Planning terrain (lots 3.2, 3.3 et point 21) :
// - liste choisie selon l'environnement (vraie Qualification en production, TEST en preview) ;
// - toutes les pages ClickUp lues (100 fiches par page), sous-tâches comprises ;
// - seules les fiches principales « à visiter » sont listées, avec le compte de leurs scénarios ou emplacements ;
// - adresse lue par identifiant de champ : Lieu du chantier d'abord, puis Adresse du client.
// 13/10/2026 (Matthieu) : le commercial cale le relevé en remplissant 📅 Date Visite Technique. Chaque fiche porte sa
//   date (dateVisite, en millisecondes, null si pas encore calée) ; tri par date, les fiches sans date à la fin.
//   Mêmes règles que les vues ClickUp « 👷 Relevés planifiés » et « 📞 Visites à caler ».
const LIEU_CHANTIER_ID = '5b9cbfd6-535c-4416-b530-776f949ce432';
const ADRESSE_ID = '990a7f3b-989f-416d-9a80-eba5654b228d';
const DATE_VISITE_ID = '3e633a82-89e3-4895-80d6-04ad25bbccd4';
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

function lireDateVisite(task: any): number | null {
  const v = task.custom_fields?.find((f: any) => f.id === DATE_VISITE_ID)?.value;
  const n = Number(v);
  return v !== undefined && v !== null && v !== '' && Number.isFinite(n) && n > 0 ? n : null;
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
      const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false&subtasks=true&page=${page}`, {
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

    // Sous-relevés (scénarios ou emplacements) regroupés par fiche principale
    const sousRelevesParFiche = new Map<string, any[]>();
    for (const t of toutes) {
      if (!t.parent) continue;
      const cle = String(t.parent);
      sousRelevesParFiche.set(cle, [...(sousRelevesParFiche.get(cle) || []), t]);
    }

    const chantiersAVisiter = toutes
      .filter((task: any) => !task.parent && estAVisiter(task.status?.status))
      .map((task: any) => {
        const sousReleves = sousRelevesParFiche.get(String(task.id)) || [];
        return {
          id: task.id,
          nom: task.name,
          adresse: lireAdresse(task),
          dateVisite: lireDateVisite(task),
          scenarios: sousReleves.length,
          scenariosRecus: sousReleves.filter((s) => !estAVisiter(s.status?.status)).length,
          typeSousReleves: typeDesSousReleves(sousReleves.map((s) => ({ nom: String(s.name || '') }))),
        };
      })
      .sort((a, b) => (a.dateVisite ?? Number.MAX_SAFE_INTEGER) - (b.dateVisite ?? Number.MAX_SAFE_INTEGER));

    return NextResponse.json(chantiersAVisiter);
  } catch (error) {
    return NextResponse.json({ error: "Erreur de connexion ClickUp" }, { status: 500 });
  }
}
