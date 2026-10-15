import { NextResponse } from 'next/server';
import { sessionDeRequete } from '@/lib/session';
import { lireTacheQualification } from '@/lib/listesClickUp';
import { CHAMPS } from '@/lib/champsClickUp';

// Bloc 📇 Contact du relevé (étape 4 du plan du 15/10/2026, synthèse du 14/10, section 10).
// GET ?affaireId=… (la fiche, ou un scénario : on remonte à la fiche) : adresse, téléphone et email du passeport,
// 📍 Contact sur place et 👔 Gestionnaire (fiches de la liste Contacts 👥 reliées à la fiche). Rien à ressaisir.
// Les deux champs relation existent sur Qualification ; sur 🧪 TEST ils sont absents, le bloc montre alors le passeport.
// 15/10, 15 h 23 : renvoie aussi l'email de la personne connectée (« moi »), pour ouvrir Google Voice et Gmail sur le
// compte CHARGéO (et pas sur le premier compte Google du navigateur ni sur Apple Mail).
export const dynamic = 'force-dynamic';

const CONTACT_SUR_PLACE = '7d20a03c-f9b5-4395-9114-362e194a9a85';
const GESTIONNAIRE = '0a6a88d4-1d1a-4034-8e7b-bf6213b1d9c3';
// Liste Contacts 👥
const TEL_CONTACT = '9f8e22e3-656d-4d9b-b923-cfff21366e8f';
const EMAIL_CONTACT = 'fe270c78-ce53-427c-ad4f-73090f7c3252';

const json = (corps: any, status = 200) => NextResponse.json(corps, { status });
const champs = (t: any): any[] => (Array.isArray(t?.custom_fields) ? t.custom_fields : []);
const valeur = (t: any, id: string) => champs(t).find((c) => c?.id === id)?.value;
const texte = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());

async function lire(token: string, id: string): Promise<any | null> {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(id)}`, { headers: { Authorization: token }, cache: 'no-store' });
  return res.ok ? res.json() : null;
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
    const id = new URL(request.url).searchParams.get('affaireId') || '';
    const lecture = await lireTacheQualification(id, token);
    if (!lecture.ok) return json({ success: false, error: lecture.erreur }, lecture.status);
    // Scénario ou élément : on remonte jusqu'à la fiche (deux niveaux au plus)
    let fiche: any = lecture.tache;
    for (let i = 0; i < 2 && fiche?.parent; i++) {
      const p = await lireTacheQualification(String(fiche.parent), token);
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
