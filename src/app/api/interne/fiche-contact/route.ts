import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { getQualificationListId } from '@/lib/listesClickUp';
import { CHAMPS } from '@/lib/champsClickUp';

// Bloc 📇 Contact (étape 4 du plan du 15/10/2026, synthèse du 14/10, section 10). LECTURE SEULE.
// GET ?affaireId=… (la fiche, ou un scénario : on remonte à la fiche) : adresse, téléphone et email du passeport,
// 📍 Contact sur place et 👔 Gestionnaire (fiches de la liste Contacts 👥 reliées à la fiche). Rien à ressaisir.
// Les deux champs relation existent sur Qualification ; sur 🧪 TEST, au Planning et au Parc ils sont absents, le bloc
// montre alors le passeport.
// 15/10, 15 h 23 : renvoie aussi l'email de la personne connectée (« moi »), pour ouvrir Google Voice et Gmail sur le
// compte CHARGéO (et pas sur le premier compte Google du navigateur ni sur Apple Mail).
// 17/10, 10 h 26 (Matthieu : « tu ajoutes le bloc contact partout ») : la tâche voyageuse est aussi lue au Planning
// Chantiers et au Parc Installé, qui portent les mêmes champs 📞 Telephone, 📧 Email et 📍 Adresse (mêmes
// identifiants, vérifiés le 17/10). Qualification reste lue dans 🧪 TEST en preview ; Planning et Parc sont lus dans
// les vraies listes, en lecture seule, comme les écrans Feu vert et Réception.
export const dynamic = 'force-dynamic';

const CONTACT_SUR_PLACE = '7d20a03c-f9b5-4395-9114-362e194a9a85';
const GESTIONNAIRE = '0a6a88d4-1d1a-4034-8e7b-bf6213b1d9c3';
// Liste Contacts 👥
const TEL_CONTACT = '9f8e22e3-656d-4d9b-b923-cfff21366e8f';
const EMAIL_CONTACT = 'fe270c78-ce53-427c-ad4f-73090f7c3252';
// Planning Chantiers 🚧 et Parc Installé (Maintenance) 🔄
const PLANNING_CHANTIERS_ID = '901520038258';
const PARC_ID = '901520038290';

const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const champs = (t: any): any[] => (Array.isArray(t?.custom_fields) ? t.custom_fields : []);
const valeur = (t: any, id: string) => champs(t).find((c) => c?.id === id)?.value;
const texte = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());

async function lire(token: string, id: string): Promise<any | null> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(id)}`, { headers: { Authorization: token }, cache: 'no-store' });
  return res.ok ? res.json() : null;
}

// Fiche d'une liste autorisée (Qualification de l'environnement, Planning Chantiers, Parc)
async function lireAffaire(token: string, id: string): Promise<{ ok: true; tache: any } | { ok: false; status: number; erreur: string }> {
  if (!id || !/^[a-z0-9]+$/i.test(id)) return { ok: false, status: 400, erreur: 'Identifiant de fiche invalide' };
  const autorisees = [getQualificationListId(), PLANNING_CHANTIERS_ID, PARC_ID].filter(Boolean).map(String);
  const tache = await lire(token, id);
  if (!tache) return { ok: false, status: 404, erreur: 'Fiche introuvable' };
  if (!autorisees.includes(String(tache?.list?.id ?? ''))) return { ok: false, status: 403, erreur: 'Fiche hors des listes autorisées' };
  return { ok: true, tache };
}

async function personnes(token: string, fiche: any, champId: string) {
  const brut = valeur(fiche, champId);
  const liens: any[] = Array.isArray(brut) ? brut : [];
  const sortie: { nom: string; tel: string; email: string }[] = [];
  for (const lien of liens.slice(0, 5)) {
    if (!lien?.id) continue;
    const c = await lire(token, String(lien.id));
    sortie.push({
      nom: texte(c?.name || lien?.name),
      tel: texte(valeur(c, TEL_CONTACT)),
      email: texte(valeur(c, EMAIL_CONTACT)),
    });
  }
  return sortie;
}

export async function GET(request: Request) {
  try {
    const session = await sessionDeRequete(request);
    if (!session) return json({ success: false, error: 'Connexion requise : reconnecte-toi.' }, 401);
    const token = process.env.CLICKUP_API_KEY as string;
    if (!token) return json({ success: false, error: 'Configuration serveur incomplète' }, 500);
    const id = new URL(request.url).searchParams.get('affaireId') || '';
    const lecture = await lireAffaire(token, id);
    if (!lecture.ok) return json({ success: false, error: lecture.erreur }, lecture.status);
    // Scénario ou élément : on remonte jusqu'à la fiche (deux niveaux au plus)
    let fiche: any = lecture.tache;
    for (let i = 0; i < 2 && fiche?.parent; i++) {
      const p = await lireAffaire(token, String(fiche.parent));
      if (!p.ok) break;
      fiche = p.tache;
    }
    const adresse: any = valeur(fiche, CHAMPS.adresse);
    return json({
      success: true,
      moi: texte(session.email),
      fiche: { id: String(fiche?.id || ''), nom: texte(fiche?.name) },
      client: { tel: texte(valeur(fiche, CHAMPS.telephone)), email: texte(valeur(fiche, CHAMPS.email)) },
      adresse: adresse?.formatted_address
        ? { texte: String(adresse.formatted_address), lat: adresse?.location?.lat ?? null, lng: adresse?.location?.lng ?? null }
        : null,
      contactSurPlace: await personnes(token, fiche, CONTACT_SUR_PLACE),
      gestionnaire: await personnes(token, fiche, GESTIONNAIRE),
    });
  } catch (e) {
    console.error('Bloc Contact', e);
    return json({ success: false, error: 'Erreur serveur' }, 500);
  }
}
