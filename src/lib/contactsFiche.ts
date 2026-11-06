// Contacts reliés à une fiche Qualification (liste Contacts 👥) : 📍 Contact sur place et 👔 Gestionnaire.
// Sorti de /api/interne/fiche-contact le 05/11/2026 (Phase 9, lot 2) pour servir aussi aux mails de l'appli
// (src/app/api/interne/mail/route.ts). Les deux champs relation existent sur Qualification ; sur 🧪 TEST ils sont
// absents (liste vide).
import type { Personne } from '@/lib/modelesMails';

export const CONTACT_SUR_PLACE = '7d20a03c-f9b5-4395-9114-362e194a9a85';
export const GESTIONNAIRE = '0a6a88d4-1d1a-4034-8e7b-bf6213b1d9c3';
// Liste Contacts 👥
const TEL_CONTACT = '9f8e22e3-656d-4d9b-b923-cfff21366e8f';
const EMAIL_CONTACT = 'fe270c78-ce53-427c-ad4f-73090f7c3252';

const valeur = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c?.id === id)?.value;
const texte = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());

// Personnes d'un champ relation de la fiche (5 au plus), avec le nom, le téléphone et l'email de leur fiche Contacts
export async function personnesLiees(token: string, fiche: any, champId: string): Promise<Personne[]> {
  const brut = valeur(fiche, champId);
  const liens: any[] = Array.isArray(brut) ? brut : [];
  const sortie: Personne[] = [];
  for (const lien of liens.slice(0, 5)) {
    if (!lien?.id) continue;
    const r = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(String(lien.id))}`, { headers: { Authorization: token }, cache: 'no-store' });
    const c = r.ok ? await r.json().catch(() => null) : null;
    sortie.push({ nom: texte(c?.name || lien?.name), tel: texte(valeur(c, TEL_CONTACT)), email: texte(valeur(c, EMAIL_CONTACT)) });
  }
  return sortie;
}
