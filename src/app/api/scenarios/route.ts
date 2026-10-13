import { NextResponse } from 'next/server';
import { lireTacheQualification } from '@/lib/listesClickUp';
import { typeDesSousReleves, type TypeSousReleve } from '@/lib/scenarios';

// Création d'un sous-relevé depuis l'outil terrain : scénario (point 12 règle 2) ou emplacement (point 21).
// - Scénario : autre façon de raccorder, « Scénario A : nom » (lettre suivant la plus haute déjà utilisée,
//   un ancien « Scénario 3 » compte comme C).
// - Emplacement : une borne physique du site, « Emplacement 1 : nom » (numéro suivant le plus haut).
// - Pas de mélange sur une même fiche (décision du 11/10/2026).
// La sous-tâche naît avec le statut par défaut de la liste (« 📍 à visiter »).
// À vérifier avant la mise en production : les automatisations de Qualification déclenchées par une création.
const LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function prochaineLettre(sousTaches: any[]): string {
  let plusHaut = -1;
  for (const s of sousTaches) {
    const m = String(s?.name || '').match(/^\s*Sc[ée]nario\s+([A-Za-z]|\d+)\b/i);
    if (!m) continue;
    const rang = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) - 1 : LETTRES.indexOf(m[1].toUpperCase());
    if (rang > plusHaut) plusHaut = rang;
  }
  const rang = Math.max(plusHaut + 1, sousTaches.length);
  return rang < LETTRES.length ? LETTRES[rang] : String(rang + 1);
}

function prochainNumero(sousTaches: any[]): number {
  let plusHaut = 0;
  for (const s of sousTaches) {
    const m = String(s?.name || '').match(/^\s*Emplacement\s+(\d+)\b/i);
    if (m) plusHaut = Math.max(plusHaut, parseInt(m[1], 10));
  }
  return Math.max(plusHaut, sousTaches.length) + 1;
}

export async function POST(request: Request) {
  try {
    const corps = await request.json().catch(() => ({}));
    const affaireId = String(corps?.affaireId || '');
    const type: TypeSousReleve = corps?.type === 'emplacement' ? 'emplacement' : 'scenario';
    const nom = String(corps?.nom || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const token = process.env.CLICKUP_API_KEY as string;

    if (!nom) {
      return NextResponse.json({ success: false, error: type === 'emplacement' ? "Donne un nom à l'emplacement" : 'Donne un nom au scénario' }, { status: 400 });
    }

    const verif = await lireTacheQualification(affaireId, token, { sousTaches: true });
    if (!verif.ok) {
      return NextResponse.json({ success: false, error: verif.erreur }, { status: verif.status });
    }
    if (verif.tache?.parent) {
      return NextResponse.json({ success: false, error: "Un scénario ou un emplacement ne peut pas avoir de sous-relevé" }, { status: 400 });
    }

    const sousTaches: any[] = Array.isArray(verif.tache?.subtasks) ? verif.tache.subtasks : [];
    const existant = typeDesSousReleves(sousTaches.map((s) => ({ nom: String(s?.name || '') })));
    if (existant && existant !== type) {
      return NextResponse.json({
        success: false,
        error: existant === 'scenario'
          ? 'Cette fiche a déjà des scénarios : on ne mélange pas scénarios et emplacements'
          : 'Cette fiche a déjà des emplacements : on ne mélange pas emplacements et scénarios',
      }, { status: 400 });
    }

    const nomComplet = type === 'emplacement'
      ? `Emplacement ${prochainNumero(sousTaches)} : ${nom}`
      : `Scénario ${prochaineLettre(sousTaches)} : ${nom}`;
    const description = type === 'emplacement'
      ? "Emplacement créé depuis l'outil terrain : une borne physique du site (une borne double compte pour une). Il porte son matériel, son support, son cheminement et ses photos. Les données du site sont sur la fiche principale."
      : "Scénario de relevé créé depuis l'outil terrain. Il porte ses propres mesures, son segment et sa source de raccordement.";
    const listId = String(verif.tache.list.id);

    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
      method: 'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nomComplet, parent: affaireId, description }),
    });
    if (!res.ok) {
      console.error(`Création du sous-relevé refusée (${res.status})`, await res.text().catch(() => ''));
      return NextResponse.json({ success: false, error: type === 'emplacement' ? "L'emplacement n'a pas pu être créé dans ClickUp" : "Le scénario n'a pas pu être créé dans ClickUp" }, { status: 502 });
    }
    const cree = await res.json();
    return NextResponse.json({ success: true, id: String(cree.id) });
  } catch (error) {
    console.error('Erreur création sous-relevé :', error);
    return NextResponse.json({ success: false, error: 'Erreur Serveur' }, { status: 500 });
  }
}
