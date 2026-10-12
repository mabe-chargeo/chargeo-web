import { Jour, aujourdhuiParis, echeanceClickUp } from '@/lib/joursOuvres';

// Contrat de maintenance vendu (Phase 4, prestations vendues, demandé par Matthieu le 12/10/2026).
// Au passage au Parc, le site lit les lignes du devis signé (🔗 Lien devis du chantier) et remplit la fiche Parc :
// - 📜 Type de Contrat selon la référence Costructor retenue :
//   SERV-MAINTENANCE → Maintenance ; SERV-MAINTENANCE-RELEVE → Maintenance + relevé ; SERV-MAINTENANCE-VISITE → Visite seule ;
//   aucune de ces lignes → Aucun. Une référence peut aussi être un élément d'un ouvrage (pack).
// - Lignes ou groupes en option non acceptés par le client : ignorés (option non souscrite).
// - Plusieurs contrats différents, ou une référence SERV-MAINTENANCE-… inconnue : rien n'est choisi, commentaire.
// - 📅 Date de Mise en Service = jour de la réception si vide ; 🔄 Echéance annuelle = mise en service + 1 an si vide
//   (wiki Parc : la première échéance part de la mise en service, jamais de la signature).
// - 🔢 Nb points de charge = quantité de la ligne contrat (prix par point de charge et par an) si vide.
// Aucune visite n'est créée ici : sa préparation 30 jours avant l'échéance relève du circuit maintenance (Phase 5).
// Champs déjà remplis : jamais écrasés ; un écart avec le devis est signalé.

const COSTRUCTOR = 'https://api.costructor.co/external/v1';
const PARC_ID = '901520038290';
export const CHAMPS_CONTRAT = {
  contrat: 'a0505dec-e32f-485d-b501-2288a4c5f150',
  echeance: '837dd2a3-2b7c-4ce8-b62f-6f0884c53ec1',
  miseEnService: '5e301b44-b0b8-478a-90c2-86e0201ef9d5',
  nbPdc: '56a64d37-0a10-4a5a-84d5-d6123ec47364',
};
const CONTRATS: Record<string, string> = {
  'SERV-MAINTENANCE': 'Maintenance',
  'SERV-MAINTENANCE-RELEVE': 'Maintenance + relevé',
  'SERV-MAINTENANCE-VISITE': 'Visite seule',
};
const PREFIXE = 'SERV-MAINTENANCE';

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
const dateFr = (d: Jour) => `${String(d.j).padStart(2, '0')}/${String(d.m).padStart(2, '0')}/${d.a}`;
const plusUnAn = (d: Jour): Jour => ({ a: d.a + 1, m: d.m, j: d.m === 2 && d.j === 29 ? 28 : d.j });
const vide = (v: any) => v === undefined || v === null || v === '';

export const devisIdDe = (lien: string) => (String(lien || '').match(/quote_[a-z0-9]+/i) || [])[0] || '';

async function clickup(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

async function costructor(token: string, chemin: string): Promise<Response> {
  let res: Response | null = null;
  for (let essai = 0; essai < 3; essai++) {
    res = await fetch(`${COSTRUCTOR}${chemin}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (res.status !== 429) return res;
    await new Promise((r) => setTimeout(r, 1500 * (essai + 1)));
  }
  return res as Response;
}

type Ref = { ref: string; qte: number };

// Références retenues du devis. null = pas de lignes lisibles.
// Une même ligne peut apparaître dans son groupe et à plat : elle n'est comptée qu'une fois (même id).
function referencesRetenues(lignesDevis: any): Ref[] | null {
  if (!Array.isArray(lignesDevis)) return null;
  const gardees = new Map<string, Ref[]>();
  const exclues = new Set<string>();
  let n = 0;
  const refDe = (x: any) => String(x?.reference || '').trim().toUpperCase();
  const parcourir = (lignes: any[], horsOption: boolean) => {
    for (const l of lignes) {
      if (!l || typeof l !== 'object') continue;
      const cle = String(l.id || `ligne-${n++}`);
      const nonRetenue = horsOption || (l.optional === true && l.accepted !== true);
      if (nonRetenue) exclues.add(cle);
      else if (l.type !== 'group' && !gardees.has(cle)) {
        const qte = Number(l.quantity) || 1;
        const parRef = new Map<string, number>();
        const ref = refDe(l) || refDe(l.product);
        if (ref) parRef.set(ref, qte);
        // Contrat inclus dans un ouvrage : éléments du produit, ou fournitures de la ligne
        const elements = [...(Array.isArray(l.product?.elements) ? l.product.elements : []), ...(Array.isArray(l.supplies) ? l.supplies : [])];
        for (const e of elements) {
          const r = refDe(e?.element);
          if (r.startsWith(PREFIXE) && !parRef.has(r)) parRef.set(r, qte * (Number(e?.quantity) || 1));
        }
        gardees.set(cle, [...parRef].map(([r, q]) => ({ ref: r, qte: q })));
      }
      if (Array.isArray(l.lines) && l.lines.length) parcourir(l.lines, nonRetenue);
    }
  };
  parcourir(lignesDevis, false);
  for (const c of exclues) gardees.delete(c);
  return [...gardees.values()].flat();
}

export type Contrat = {
  etat: 'souscrit' | 'aucun' | 'ambigu' | 'inconnu' | 'illisible';
  option?: string;
  refs?: string[];
  qte?: number;
  numero?: string;
  payeur?: string;
  raison?: string;
  references?: string[];
  cles?: string[];
};

export async function lireContrat(co: string, devisId: string): Promise<Contrat> {
  if (!devisId) return { etat: 'illisible', raison: 'sans_lien_devis' };
  const res = await costructor(co, `/quotes/${encodeURIComponent(devisId)}`);
  if (!res.ok) return { etat: 'illisible', raison: `costructor_http_${res.status}` };
  const json = await res.json().catch(() => null);
  const d = json?.data && !Array.isArray(json.data) ? json.data : json;
  let refs = referencesRetenues(d?.lines);
  if (!refs) {
    const r2 = await costructor(co, `/quotes/${encodeURIComponent(devisId)}/lines`);
    if (r2.ok) {
      const j2 = await r2.json().catch(() => null);
      refs = referencesRetenues(Array.isArray(j2) ? j2 : j2?.data ?? j2?.lines);
    }
  }
  const base = { numero: String(d?.number || ''), payeur: String(d?.customer?.fullName || d?.customer?.companyName || '') };
  if (!refs) return { etat: 'illisible', raison: 'lignes_absentes', ...base, cles: d && typeof d === 'object' ? Object.keys(d).slice(0, 40) : [] };
  const references = [...new Set(refs.map((r) => r.ref))];
  const contrats = refs.filter((r) => r.ref.startsWith(PREFIXE));
  const trouves = [...new Set(contrats.map((r) => r.ref))];
  if (!trouves.length) return { etat: 'aucun', ...base, references };
  if (trouves.some((r) => !CONTRATS[r])) return { etat: 'inconnu', refs: trouves, ...base, references };
  if (trouves.length > 1) return { etat: 'ambigu', refs: trouves, ...base, references };
  const qte = Math.round(contrats.reduce((s, r) => s + r.qte, 0) * 100) / 100;
  return { etat: 'souscrit', option: CONTRATS[trouves[0]], refs: trouves, qte, ...base, references };
}

const RAISONS: Record<string, string> = {
  sans_lien_devis: '« 🔗 Lien devis » était vide sur le chantier',
  lignes_absentes: 'Costructor ne renvoie pas les lignes du devis',
};
const raisonLisible = (r = '') => RAISONS[r] || (r.startsWith('costructor_http_') ? 'Costructor ne répond pas' : r);

// Remplit la fiche Parc à partir du contrat lu. simulation : rien n'est écrit.
export async function traiterContrat(cu: string, co: string, taskId: string, devisId: string, jour: Jour, simulation: boolean) {
  const c = await lireContrat(co, devisId);
  const [tRes, fRes] = await Promise.all([
    clickup(cu, `/task/${encodeURIComponent(taskId)}`),
    clickup(cu, `/list/${PARC_ID}/field`),
  ]);
  const fiche = tRes.ok ? await tRes.json().catch(() => null) : null;
  const defs: any[] = fRes.ok ? (await fRes.json().catch(() => ({})))?.fields || [] : [];
  const valeur = (id: string) => (Array.isArray(fiche?.custom_fields) ? fiche.custom_fields : []).find((f: any) => f.id === id)?.value;
  const options: any[] = defs.find((f: any) => f.id === CHAMPS_CONTRAT.contrat)?.type_config?.options || [];
  const optionNom = (v: any) => options.find((o: any) => o.id === v || o.orderindex === Number(v))?.name || '';
  const optionId = (nom: string) => options.find((o: any) => normal(o.name) === normal(nom))?.id;

  const actuel = vide(valeur(CHAMPS_CONTRAT.contrat)) ? '' : optionNom(valeur(CHAMPS_CONTRAT.contrat));
  const mesVal = valeur(CHAMPS_CONTRAT.miseEnService);
  const mes: Jour = vide(mesVal) ? jour : aujourdhuiParis(new Date(Number(mesVal)));
  const ecritures: { champ: string; id: string; corps: any; libelle: string }[] = [];
  const dateCorps = (d: Jour) => ({ value: echeanceClickUp(d), value_options: { time: false } });
  if (vide(mesVal)) ecritures.push({ champ: '📅 Date de Mise en Service', id: CHAMPS_CONTRAT.miseEnService, corps: dateCorps(mes), libelle: dateFr(mes) });

  const nomDevis = c.numero ? `le devis ${c.numero}` : 'le devis';
  let texte = '';
  let notifier = false;
  const ecrireContrat = (nom: string) => {
    const oid = optionId(nom);
    if (oid) ecritures.push({ champ: '📜 Type de Contrat', id: CHAMPS_CONTRAT.contrat, corps: { value: oid }, libelle: nom });
    return !!oid;
  };

  if (c.etat === 'souscrit') {
    let note = '';
    if (!actuel || normal(actuel) === 'aucun') {
      if (!ecrireContrat(c.option!)) { note = ` ⚠️ Option « ${c.option} » introuvable dans 📜 Type de Contrat : à remplir à la main.`; notifier = true; }
    } else if (normal(actuel) !== normal(c.option!)) {
      note = ` ⚠️ La fiche indiquait déjà « ${actuel} » : non modifié, vérifie lequel est juste.`;
      notifier = true;
    }
    const echVal = valeur(CHAMPS_CONTRAT.echeance);
    const ech: Jour = vide(echVal) ? plusUnAn(mes) : aujourdhuiParis(new Date(Number(echVal)));
    if (vide(echVal)) ecritures.push({ champ: '🔄 Echéance annuelle', id: CHAMPS_CONTRAT.echeance, corps: dateCorps(ech), libelle: dateFr(ech) });
    if (vide(valeur(CHAMPS_CONTRAT.nbPdc)) && c.qte) ecritures.push({ champ: '🔢 Nb points de charge', id: CHAMPS_CONTRAT.nbPdc, corps: { value: c.qte }, libelle: String(c.qte) });
    const pdc = c.qte ? `, ${c.qte} point${c.qte > 1 ? 's' : ''} de charge` : '';
    const payeur = c.payeur ? `, payeur « ${c.payeur} »` : '';
    texte = `📜 Contrat de maintenance vendu dans ${nomDevis} : ${c.option}${pdc}${payeur}. Mise en service le ${dateFr(mes)}, 1re échéance annuelle le ${dateFr(ech)}.${note}`;
  } else if (c.etat === 'aucun') {
    let note = '';
    if (!actuel) ecrireContrat('Aucun');
    else if (normal(actuel) !== 'aucun') {
      note = ` ⚠️ La fiche indique pourtant « ${actuel} » : non modifié, vérifie s'il a été signé à part.`;
      notifier = true;
    }
    texte = `📜 Aucun contrat de maintenance dans ${nomDevis} : 📜 Type de Contrat = Aucun. Mise en service le ${dateFr(mes)} ; un contrat sera à reproposer un mois avant le premier anniversaire.${note}`;
  } else if (c.etat === 'ambigu') {
    notifier = true;
    texte = `⚠️ Contrat de maintenance : ${nomDevis} contient plusieurs contrats (${c.refs!.join(', ')}). Rien n'a été choisi : remplis 📜 Type de Contrat, 🔄 Echéance annuelle et 🔢 Nb points de charge à la main.`;
  } else if (c.etat === 'inconnu') {
    notifier = true;
    texte = `⚠️ Contrat de maintenance : référence ${c.refs!.join(', ')} dans ${nomDevis}, non reconnue. Rien n'a été choisi : remplis 📜 Type de Contrat et 🔄 Echéance annuelle à la main.`;
  } else {
    notifier = true;
    texte = `⚠️ Contrat de maintenance : impossible de lire le devis (${raisonLisible(c.raison)}). Remplis 📜 Type de Contrat à la main (Aucun si rien n'a été vendu) et, s'il y a un contrat, 🔄 Echéance annuelle = mise en service + 1 an.`;
  }

  const resume = { action: `contrat_${c.etat}`, contrat: c, ficheAvant: { typeContrat: actuel || null, miseEnService: vide(mesVal) ? null : dateFr(mes) } };
  const prevues = ecritures.map((e) => ({ champ: e.champ, valeur: e.libelle }));
  if (simulation) return { ...resume, ecrirait: prevues, commentaire: texte, simulation: true };

  const rates: string[] = [];
  for (const e of ecritures) {
    const r = await clickup(cu, `/task/${taskId}/field/${e.id}`, 'POST', e.corps);
    if (!r.ok) rates.push(e.champ);
  }
  if (rates.length) { texte += ` ⚠️ Non écrit : ${rates.join(', ')}, à remplir à la main.`; notifier = true; }
  const com = await clickup(cu, `/task/${taskId}/comment`, 'POST', { comment_text: texte, notify_all: notifier });
  return { ...resume, ecrit: prevues.filter((p) => !rates.includes(p.champ)), rates, commentaire: texte, commente: com.ok };
}
