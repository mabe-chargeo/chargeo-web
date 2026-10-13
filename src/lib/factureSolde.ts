import { aujourdhuiParis, ajouterJoursOuvres, echeanceClickUp, libelleJour } from '@/lib/joursOuvres';
import { alerter } from '@/lib/alerteSite';

// Facture de solde (décision Matthieu du 12/10/2026) : au passage au Parc (réception confirmée, PV présent), le site
// crée « Solde · client · n° devis » dans Factures Clients (📄 à émettre, Type de pièce Solde, Réf. devis signé, Lien
// Costructor, 🔗 Affaire), échéance = rappel à J+1 ouvré pour émettre le solde dans Costructor.
// Montant laissé vide : total du devis moins l'acompte et les situations, selon les conditions du devis.
// Jamais en double : une tâche solde déjà présente pour ce n° de devis (ou reliée à ce chantier) est réutilisée.
// Client repris de la facture d'acompte du même devis, sinon du nom de la fiche.
// 13/10/2026 (décision Matthieu) : le solde, c'est le back-office, pas le chef de chantier. L'alerte est écrite sur la
// tâche de Factures Clients (espace BACK OFFICE, relais vers @back-office), jamais sur la fiche du chantier. Sans 📝 N° devis,
// la tâche est quand même créée, avec « N° devis à compléter » : c'est au back-office de le retrouver.
// Seul cas qui reste au chantier : création impossible (erreur ClickUp), il n'y a alors aucune tâche où écrire.

const FACTURES_ID = process.env.CLICKUP_FACTURES_LIST_ID || '1200630000003863';
const FACTURE = {
  type: '2885d2af-84ee-4c56-aa4d-3be5e2efd671',
  client: '00a44fea-ea64-4350-be16-9c6e505373b4',
  ref: '70524913-0dea-4ce4-828e-fea0338a6d1f',
  affaire: '70f095a0-d0ec-413a-9ed9-fbc763306869',
  lien: '87363f81-73a0-4928-b637-5a1c63fdc075',
};
const CHAMP_NUMERO = '4423a27f-ecc1-4107-9488-4784360178c0';
const CHAMP_MONTANT = '58a159c7-edbc-4d53-a81a-5ec48337c7eb';
const CHAMP_LIEN_CLIENT = 'd9f88e8f-4e20-4a98-aee8-3ded30fef5fc';
const CHAMP_LIEN_DEVIS = 'ae80f202-2ef3-4302-b778-f36075ee398f';

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const euros = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT`;

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c.id === id);
const valeur = (t: any, id: string): string => {
  const v = champ(t, id)?.value;
  return v === undefined || v === null ? '' : String(v).trim();
};
// 🔗 Affaire (relation) contient-elle ce chantier ?
const relieAuChantier = (t: any, chantierId: string) => {
  const v = champ(t, FACTURE.affaire)?.value;
  return (Array.isArray(v) ? v : []).some((x: any) => String(x?.id ?? x) === chantierId);
};

// Factures déjà créées pour ce devis (ou ce chantier) : acompte et solde. undefined si lecture impossible
async function facturesDuDevis(token: string, numero: string, chantierId: string): Promise<{ acompte: any | null; solde: any | null } | undefined> {
  let acompte: any = null;
  let solde: any = null;
  for (let page = 0; page < 10; page++) {
    const res = await api(token, `/list/${FACTURES_ID}/task?include_closed=true&subtasks=true&page=${page}`);
    if (!res.ok) return undefined;
    const json = await res.json().catch(() => ({}));
    const taches: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    for (const t of taches) {
      const memeDevis = !!numero && valeur(t, FACTURE.ref) === numero;
      if (!memeDevis && !relieAuChantier(t, chantierId)) continue;
      const n = normal(t.name);
      if (n.includes('solde') && !solde) solde = t;
      else if (n.includes('acompte') && !acompte) acompte = t;
    }
    if (json?.last_page !== false || taches.length === 0) break;
  }
  return { acompte, solde };
}

async function optionSolde(token: string): Promise<string | null> {
  const res = await api(token, `/list/${FACTURES_ID}/field`);
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  const f = (json?.fields || []).find((x: any) => x.id === FACTURE.type);
  const o = (f?.type_config?.options || []).find((x: any) => normal(x.name) === 'solde');
  return o ? String(o.id) : null;
}

// chantier = fiche lue avant son déplacement au Parc (champs de Planning Chantiers)
export async function creerSolde(token: string, chantier: any, simulation: boolean): Promise<any> {
  const numero = valeur(chantier, CHAMP_NUMERO);
  const chantierId = String(chantier.id);
  const f = await facturesDuDevis(token, numero, chantierId);
  if (f === undefined) return { solde: 'lecture_factures_impossible', numero };
  if (f.solde) return { solde: 'deja_cree', nom: f.solde.name, url: f.solde.url };

  const client = (f.acompte ? valeur(f.acompte, FACTURE.client) : '') || String(chantier.name || '');
  const estTest = normal(chantier.name).startsWith('test');
  const nom = `${estTest ? 'Test · ' : ''}Solde · ${client} · ${numero || 'N° devis à compléter'}`;
  const aujourdhui = aujourdhuiParis();
  const rappel = ajouterJoursOuvres(aujourdhui, 1);
  const base = { nom, numero, sansNumero: !numero, rappel: libelleJour(rappel), acompteTrouve: !!f.acompte };
  if (simulation) return { solde: 'creerait', ...base };

  const montant = Number(valeur(chantier, CHAMP_MONTANT));
  const lienDevis = valeur(chantier, CHAMP_LIEN_DEVIS);
  const lienClient = valeur(chantier, CHAMP_LIEN_CLIENT);
  const description = [
    numero
      ? `Facture de solde du devis ${numero}${montant > 0 ? ` (${euros(montant)} au devis)` : ''}${lienDevis ? ` : ${lienDevis}` : ''}`
      : `Facture de solde du chantier « ${chantier.name} » : 📝 N° devis vide sur le chantier, retrouve le devis signé dans Costructor et remplis Réf. devis signé.`,
    `Réception confirmée le ${libelleJour(aujourdhui)}, PV joint à la fiche du chantier.`,
    `Montant = total du devis moins l'acompte${f.acompte ? ` (« ${f.acompte.name} »)` : ''} et les éventuelles situations.`,
    `1. Émettre la facture de solde dans Costructor.`,
    `2. Remplir ici 🧾 N° facture Costructor, Montant HT et Date d'échéance.`,
    `3. Passer la tâche en 📤 émise : les rappels de relance se programment seuls.`,
  ].join('\n');
  const option = await optionSolde(token);
  const champs: any[] = [{ id: FACTURE.client, value: client }];
  if (numero) champs.push({ id: FACTURE.ref, value: numero });
  if (option) champs.push({ id: FACTURE.type, value: option });
  if (/^https?:\/\//.test(lienClient)) champs.push({ id: FACTURE.lien, value: lienClient });

  const res = await api(token, `/list/${FACTURES_ID}/task`, 'POST', {
    name: nom, description, due_date: echeanceClickUp(rappel), due_date_time: false, custom_fields: champs,
  });
  if (!res.ok) {
    console.error(`Création du solde refusée (${res.status})`, await res.text().catch(() => ''));
    return { solde: 'erreur_creation', ...base };
  }
  const creee = await res.json();
  const lien = await api(token, `/task/${creee.id}/field/${FACTURE.affaire}`, 'POST', { value: { add: [chantierId], rem: [] } });

  // Alerte au back-office, sur la tâche de facture (espace BACK OFFICE)
  const alerte = numero
    ? `🧾 Solde à émettre dans Costructor (devis ${numero}) : chantier « ${chantier.name} » réceptionné le ${libelleJour(aujourdhui)}. Rappel le ${libelleJour(rappel)}.`
    : `⚠️ Solde à émettre, mais 📝 N° devis vide sur le chantier « ${chantier.name} » : retrouve le devis signé dans Costructor, remplis Réf. devis signé, puis émets le solde. Rappel le ${libelleJour(rappel)}.`;
  const prevenu = await alerter(token, String(creee.id), alerte);
  return { solde: 'cree', ...base, url: creee.url, typeRempli: !!option, affaireReliee: lien.ok, backOfficePrevenu: prevenu };
}
