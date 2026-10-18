import { aujourdhuiParis, comparer, libelleJour, type Jour } from '@/lib/joursOuvres';
import { FACTURES_ID, CHAMP_ECHEANCE, CHAMP_RELANCES, PALIERS, jourPalier, lireStatut, type EtatFacture } from '@/lib/relancesFacture';

// Écran facture de l'application (maquette validée par Matthieu le 18/10/2026, 18 h 19, après sa demande de 18 h 12 :
// « pour un écran facture, je pense qu'on pourrait faire quelque chose de bien plus joli »).
// Lit une tâche de Factures Clients pour la fiche /interne/element/<id> : type de pièce, statut, montant, dates utiles
// (rappel, paiement dû, prochaine relance), parcours en 4 étapes, alerte raccourcie, relances J+3 / J+10 / J+15 datées,
// chantier relié et autres factures du même devis. Serveur uniquement (jetons ClickUp).

const CHAMP = {
  type: '2885d2af-84ee-4c56-aa4d-3be5e2efd671',
  montant: 'b1ed211d-fa1a-452a-a955-a45cbc57ebe7',
  client: '00a44fea-ea64-4350-be16-9c6e505373b4',
  lien: '87363f81-73a0-4928-b637-5a1c63fdc075',
  affaire: '70f095a0-d0ec-413a-9ed9-fbc763306869',
  numero: 'acb6da97-630a-4421-8a0b-1533b1cc0338',
  ref: '70524913-0dea-4ce4-828e-fea0338a6d1f',
  alerte: '42019c42-0af8-49de-a33d-8af0ddde3357',
};
export const A_COMPLETER = 'N° devis à compléter';

export type RelanceFiche = { palier: number; libelle: string; date: string; etat: 'faite' | 'prochaine' | 'a_venir' };
export type Facture = {
  type: string; // Acompte, Solde, Situation intermédiaire ou ''
  etat: EtatFacture;
  statut: string; // libellé sans emoji
  couleurStatut: string;
  titre: string;
  sousTitre: string;
  test: boolean;
  montant: number | null;
  client: string;
  numero: string;
  refDevis: string;
  lienCostructor: string;
  rappel: string; // échéance de la tâche (rappel pour émettre, ou prochaine relance)
  paiementDu: string;
  paiementDuIso: string; // AAAA-MM-JJ, pour préremplir
  joursRetard: number;
  relancesEnvoyees: number;
  relances: RelanceFiche[];
  alerte: { texte: string; aussi: string } | null;
  affaires: { id: string; nom: string }[];
  autres: { id: string; nom: string; statut: string }[];
};

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c.id === id);
const texte = (t: any, id: string) => { const v = champ(t, id)?.value; return v === undefined || v === null ? '' : String(v).trim(); };
const sansEmoji = (s: string) => s.replace(/^[^A-Za-z0-9\u00C0-\u017F]+/, '').trim();
// « Test · » retiré partout pour l'affichage (le solde de la fiche test en avait deux)
export const sansTest = (s: string) => String(s || '').replace(/(^|·\s*)test\s*·\s*/gi, '$1').replace(/^\s*·\s*/, '').trim();
const jourDe = (ms: unknown): Jour | null => (ms ? aujourdhuiParis(new Date(Number(ms))) : null);
const iso = (d: Jour) => `${d.a}-${String(d.m).padStart(2, '0')}-${String(d.j).padStart(2, '0')}`;
const ecart = (a: Jour, b: Jour) => Math.round((Date.UTC(b.a, b.m - 1, b.j) - Date.UTC(a.a, a.m - 1, a.j)) / 86400000);

function typeDe(t: any): string {
  const f = champ(t, CHAMP.type);
  const v = f?.value;
  const options: any[] = f?.type_config?.options || [];
  const o = options.find((x: any) => String(x.id) === String(v) || Number(x.orderindex) === Number(v));
  if (o?.name) return String(o.name);
  const n = normal(t?.name);
  return n.includes('acompte') ? 'Acompte' : n.includes('solde') ? 'Solde' : n.includes('situation') ? 'Situation intermédiaire' : '';
}

// Alerte site raccourcie : sans liens ni horodatage, « Aussi : » sur une seconde ligne
function alerteDe(brut: string): Facture['alerte'] {
  if (!brut) return null;
  const propre = brut
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\(\d{2}\/\d{2}[^)]*\)\s*$/, '')
    .replace(/Fiche (Parc|du chantier)\s*:\s*/gi, '')
    .replace(/^[⚠️🧾\s]+/u, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!propre) return null;
  const [texteA, ...reste] = propre.split(/\s*Aussi\s*:\s*/);
  return { texte: texteA.replace(/[.\s]*$/, '.'), aussi: reste.join(' ').replace(/[.\s]*$/, reste.length ? '.' : '') };
}

const relies = (t: any): { id: string; nom: string }[] =>
  (Array.isArray(champ(t, CHAMP.affaire)?.value) ? champ(t, CHAMP.affaire).value : [])
    .map((x: any) => ({ id: String(x?.id ?? x), nom: String(x?.name || '') }))
    .filter((x: any) => x.id);

// Autres factures du même devis ou du même chantier (lecture de Factures Clients, 10 pages au plus)
async function autresFactures(token: string, t: any, ref: string, affaires: string[]): Promise<Facture['autres']> {
  if (!ref && !affaires.length) return [];
  const trouvees: Facture['autres'] = [];
  for (let page = 0; page < 10; page++) {
    const res = await fetch(`https://api.clickup.com/api/v2/list/${FACTURES_ID}/task?include_closed=true&page=${page}`, { headers: { Authorization: token }, cache: 'no-store' });
    if (!res.ok) break;
    const json = await res.json().catch(() => ({}));
    const taches: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    for (const x of taches) {
      if (String(x.id) === String(t.id)) continue;
      const memeDevis = !!ref && texte(x, CHAMP.ref) === ref;
      const memeChantier = relies(x).some((r) => affaires.includes(r.id));
      if (memeDevis || memeChantier) trouvees.push({ id: String(x.id), nom: sansTest(String(x.name || '')), statut: sansEmoji(String(x?.status?.status || '')) });
    }
    if (json?.last_page !== false || taches.length === 0) break;
  }
  return trouvees.slice(0, 6);
}

export async function lireFacture(token: string, t: any): Promise<Facture> {
  const statutBrut = String(t?.status?.status || '');
  const etat = lireStatut(statutBrut);
  const type = typeDe(t);
  const numero = texte(t, CHAMP.numero);
  const refDevis = texte(t, CHAMP.ref);
  const montantBrut = champ(t, CHAMP.montant)?.value;
  const montant = montantBrut === undefined || montantBrut === null || montantBrut === '' ? null : Number(montantBrut);
  const nom = String(t?.name || '');
  const test = /^\s*test\b/i.test(nom);

  // Titre : « Solde · client » ; sous-titre : test, devis, facture
  const morceaux = sansTest(nom).split(/\s*·\s*/).filter(Boolean);
  const fin = morceaux[morceaux.length - 1] || '';
  const finEstNumero = morceaux.length > 2 && (fin === A_COMPLETER || (!!refDevis && fin === refDevis) || /^[A-Z]{1,3}\d{6,}$/.test(fin));
  const titre = (finEstNumero ? morceaux.slice(0, -1) : morceaux).join(' · ');
  const sousTitre = [
    test ? 'Test' : '',
    refDevis ? `Devis ${refDevis}` : 'devis n° à compléter',
    numero ? `facture ${numero}` : '',
  ].filter(Boolean).join(' · ');

  const aujourdhui = aujourdhuiParis();
  const rappel = jourDe(t?.due_date);
  const du = jourDe(champ(t, CHAMP_ECHEANCE)?.value);
  const n = Math.max(0, Math.floor(Number(champ(t, CHAMP_RELANCES)?.value ?? 0) || 0));
  const ouverte = etat === 'emise' || etat === 'partielle';
  const joursRetard = ouverte && du && comparer(du, aujourdhui) < 0 ? ecart(du, aujourdhui) : 0;

  const relances: RelanceFiche[] = du && (ouverte || etat === 'litige' || n > 0)
    ? PALIERS.map((p, i) => ({
      palier: p,
      libelle: i === 0 ? 'Relance 1' : i === 1 ? 'Relance 2' : 'Dernière relance, le back-office appelle',
      // Prochaine : la date réellement programmée (échéance de la tâche), sinon le calcul du palier
      date: libelleJour(i === n && rappel && ouverte ? rappel : jourPalier(du, i)),
      etat: i < n ? 'faite' : i === n && ouverte ? 'prochaine' : 'a_venir',
    }))
    : [];

  const affaires = relies(t);
  const autres = await autresFactures(token, t, refDevis, affaires.map((a) => a.id)).catch(() => []);
  const fermee = etat === 'payee' || etat === 'annulee' || etat === 'fermee';

  return {
    type,
    etat,
    statut: sansEmoji(statutBrut),
    couleurStatut: String(t?.status?.color || ''),
    titre: titre || sansTest(nom),
    sousTitre,
    test,
    montant: Number.isFinite(montant as number) ? montant : null,
    client: sansTest(texte(t, CHAMP.client)),
    numero,
    refDevis,
    lienCostructor: /^https?:\/\//.test(texte(t, CHAMP.lien)) ? texte(t, CHAMP.lien) : '',
    rappel: rappel ? libelleJour(rappel) : '',
    paiementDu: du ? libelleJour(du) : '',
    paiementDuIso: du ? iso(du) : '',
    joursRetard,
    relancesEnvoyees: n,
    relances,
    alerte: fermee ? null : alerteDe(texte(t, CHAMP.alerte)),
    affaires,
    autres,
  };
}
