// Mails obligatoires en attente sur une fiche Qualification (Phase 9, décision de Mathieu du 05/11/2026, 21 h 56 à
// 21 h 58 : « l'envoi du bon modèle de mail [doit être] proposé au moment opportun dans l'application […] l'envoi du
// mail doit être obligatoire »).
// Champ « ✉️ Mail à envoyer » (texte court) créé le 05/11/2026 : 4bd046c5-0379-4388-8ebf-821a2ff10649 sur Qualification,
// 72bc4c2c-846a-430e-9a69-09e61aa79d20 sur 🧪 Qualification TEST. Identifiants différents : lu et écrit PAR NOM (comme
// ⏳ Durée relevé). Valeur = clé d'un texte de src/lib/modelesMails.ts. Personne ne le remplit à la main.
// Posé au moment où le mail devient obligatoire :
//   - création de la fiche (Nouveau projet, formulaire du site) → prise-en-charge (prise-en-charge-gestionnaire en
//     copropriété avec un gestionnaire) ;
//   - Caler → visite-confirmation, ou visite-deplacee en cas de décalage ;
//   - veille ouvrée de la visite (contrôle quotidien, src/lib/rappelVeille.ts) → visite-rappel-veille ;
//   - date de relance d'un devis envoyé (contrôle quotidien, src/lib/relancesDevis.ts) → devis-relance, puis
//     devis-derniere-relance à la 3e tentative (Phase 9, lot 4, accord de Mathieu du 06/11/2026 à 22 h 20).
// Effacé quand le mail part depuis l'appli avec l'un des textes qui le règlent (textesPour), ou quand le commercial note
// « Prévenu par téléphone » (seulement sans adresse mail). Tant qu'il est posé, la fiche affaire montre le mail en tête
// et la fiche remonte dans « Mails à envoyer » (Pipeline et Ma journée).
// Bloquant : tous les mails bloquent la suite de la fiche, SAUF les relances de devis (06/11, 22 h 20 : la relance ne
// bloque jamais le bouton Gagné). Une relance en attente s'efface aussi quand 🔁 Suivi relance est noté à la main
// (téléphone, AG, date convenue), quand un autre mail de devis part (envoi, validé), et au contrôle quotidien quand la
// fiche n'est plus en devis envoyé ni en négociation.
// Fichier sans import : lu par l'écran (textesPour, bloquant) comme par les routes.

const API = 'https://api.clickup.com/api/v2';
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const MOT = 'mail a envoyer';

export const champMailAFaire = (t: any) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => normal(c?.name).includes(MOT));
export const mailAFaire = (t: any): string => {
  const v = champMailAFaire(t)?.value;
  return v === undefined || v === null ? '' : String(v).trim();
};

// Relances de devis (lot 4) : non bloquantes
export const RELANCES = ['devis-relance', 'devis-derniere-relance'];
export const estRelance = (cle: string | null | undefined) => RELANCES.includes(String(cle || ''));
export const bloquant = (cle: string | null | undefined) => !!cle && !estRelance(cle);
// Fiche en vente où l'on relance : 📩 devis envoyé ou 🔥 en négociation
export const enRelance = (statut: unknown) => {
  const s = normal(statut);
  return s.includes('devis envoy') || s.includes('negociation');
};

// Textes qui règlent un mail obligatoire, au choix du commercial (le premier est celui qu'on propose d'abord)
const PRISE_EN_CHARGE = ['prise-en-charge', 'prise-en-charge-gestionnaire', 'hors-zone'];
const CONFIRMATION = ['visite-confirmation', 'visite-deplacee'];
export function textesPour(attendu: string): string[] {
  if (PRISE_EN_CHARGE.includes(attendu)) return PRISE_EN_CHARGE;
  if (CONFIRMATION.includes(attendu)) return attendu === 'visite-deplacee' ? ['visite-deplacee', 'visite-confirmation'] : CONFIRMATION;
  return attendu ? [attendu] : [];
}
export const regle = (attendu: string, envoye: string) => !!attendu && !!envoye && textesPour(attendu).includes(envoye);

// Pose (cle) ou efface ('') le mail obligatoire de la fiche. La tâche fournie sert à trouver le champ ; s'il n'y est pas
// (tâche tout juste créée), elle est relue. false si le champ manque ou si ClickUp refuse.
export async function poserMailAFaire(token: string, t: any, cle: string): Promise<boolean> {
  const id = String(t?.id || '');
  if (!id) return false;
  let champ = champMailAFaire(t);
  if (!champ?.id) {
    const r = await fetch(`${API}/task/${encodeURIComponent(id)}`, { headers: { Authorization: token }, cache: 'no-store' });
    champ = champMailAFaire(r.ok ? await r.json().catch(() => null) : null);
  }
  if (!champ?.id) return false;
  const url = `${API}/task/${encodeURIComponent(id)}/field/${encodeURIComponent(String(champ.id))}`;
  const r = cle
    ? await fetch(url, { method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify({ value: cle }), cache: 'no-store' })
    : await fetch(url, { method: 'DELETE', headers: { Authorization: token }, cache: 'no-store' });
  return r.ok;
}
export const effacerMailAFaire = (token: string, t: any) => poserMailAFaire(token, t, '');
// Relance en attente devenue inutile : effacée (rien si la fiche attend un autre mail)
export async function effacerRelanceEnAttente(token: string, t: any): Promise<boolean> {
  return estRelance(mailAFaire(t)) ? effacerMailAFaire(token, t) : false;
}
