import { NextResponse } from 'next/server';
import { lireTacheQualification, estAVisiter } from '@/lib/listesClickUp';
import { typeSousReleve } from '@/lib/scenarios';
import { lireSiteRecu, marquerSiteRecu } from '@/lib/releveSite';

// Dernière étape du relevé (lots 3.2 et 3.3, point 21), appelée par le formulaire SEULEMENT
// après l'enregistrement des mesures ET la réception de toutes les photos.
// Un relevé renvoyé plus tard ne fait jamais reculer une fiche déjà plus avancée.
// - Fiche simple ou scénario/emplacement : passe en « 📝 devis à faire » si encore « à visiter ».
// - Scénarios : la fiche principale avance quand TOUS ses scénarios sont reçus.
// - Emplacements (point 21) : la fiche principale avance quand son relevé du site ET tous ses emplacements
//   sont reçus. Le relevé du site est marqué par un commentaire sur la fiche (src/lib/releveSite.ts).
const STATUT_DEVIS_A_FAIRE = '📝 devis à faire';

async function passerEnDevisAFaire(taskId: string, token: string): Promise<boolean> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
    method: 'PUT',
    headers: { 'Authorization': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: STATUT_DEVIS_A_FAIRE })
  });
  if (!res.ok) console.error(`Changement de statut refusé (${res.status}) pour ${taskId}`, await res.text().catch(() => ''));
  return res.ok;
}

export async function POST(request: Request) {
  try {
    const corps = await request.json().catch(() => ({}));
    const taskId = String(corps?.taskId || '');
    const token = process.env.CLICKUP_API_KEY as string;

    const verif = await lireTacheQualification(taskId, token, { sousTaches: true });
    if (!verif.ok) {
      return NextResponse.json({ success: false, error: verif.erreur }, { status: verif.status });
    }
    const tache = verif.tache;
    const parentId = tache?.parent ? String(tache.parent) : '';
    const sousTaches: any[] = Array.isArray(tache?.subtasks) ? tache.subtasks : [];

    // A. Relevé du site d'une fiche à emplacements : on marque le site reçu, la fiche n'avance
    //    que si tous les emplacements sont déjà reçus
    const emplacements = !parentId ? sousTaches.filter((s) => typeSousReleve(String(s?.name || '')) === 'emplacement') : [];
    if (emplacements.length > 0) {
      if (!(await lireSiteRecu(taskId, token))) {
        if (!(await marquerSiteRecu(taskId, token))) {
          return NextResponse.json({ success: false, error: "Relevé du site enregistré, mais la fiche n'a pas pu être marquée. Appuie à nouveau sur Valider" }, { status: 502 });
        }
      }
      const tousRecus = emplacements.every((s) => !estAVisiter(String(s?.status?.status || '')));
      let change = false;
      if (tousRecus && estAVisiter(String(tache?.status?.status || ''))) {
        if (!(await passerEnDevisAFaire(taskId, token))) {
          return NextResponse.json({ success: false, error: "Le statut de la fiche n'a pas pu être changé" }, { status: 502 });
        }
        change = true;
      }
      return NextResponse.json({ success: true, site: true, tousRecus, change });
    }

    // B. La fiche, le scénario ou l'emplacement lui-même
    let change = false;
    if (estAVisiter(String(tache?.status?.status || ''))) {
      if (!(await passerEnDevisAFaire(taskId, token))) {
        return NextResponse.json({ success: false, error: "Le statut de la fiche n'a pas pu être changé" }, { status: 502 });
      }
      change = true;
    }

    // C. Scénario ou emplacement : la fiche principale avance quand tout est reçu
    let affaire: { id: string; tousRecus: boolean; change: boolean } | null = null;
    if (parentId) {
      const p = await lireTacheQualification(parentId, token, { sousTaches: true });
      if (p.ok) {
        const freres: any[] = Array.isArray(p.tache?.subtasks) ? p.tache.subtasks : [];
        // Le sous-relevé courant compte comme reçu, même si ClickUp renvoie encore son ancien statut
        let tousRecus = freres.length > 0 && freres.every((s) => String(s.id) === taskId || !estAVisiter(String(s?.status?.status || '')));
        // Emplacement : il faut aussi le relevé du site
        if (tousRecus && typeSousReleve(String(tache?.name || '')) === 'emplacement') {
          tousRecus = await lireSiteRecu(parentId, token);
        }
        let parentChange = false;
        if (tousRecus && estAVisiter(String(p.tache?.status?.status || ''))) {
          if (!(await passerEnDevisAFaire(parentId, token))) {
            return NextResponse.json({ success: false, error: "Relevé reçu, mais la fiche principale n'a pas pu changer de statut" }, { status: 502 });
          }
          parentChange = true;
        }
        affaire = { id: parentId, tousRecus, change: parentChange };
      }
    }

    return NextResponse.json({ success: true, change, affaire });
  } catch (error) {
    console.error('Erreur finalisation relevé :', error);
    return NextResponse.json({ success: false, error: 'Erreur Serveur' }, { status: 500 });
  }
}
