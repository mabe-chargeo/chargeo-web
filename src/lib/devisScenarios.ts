import { getQualificationListId, QUALIFICATION_PROD_ID } from '@/lib/listesClickUp';
import { alerter } from '@/lib/alerteSite';
import { CHAMPS, OPTIONS, cleOption, indexMenu } from '@/lib/champsClickUp';
import { chargerTypes, estDuType, estScenario } from '@/lib/typesTaches';
import type { DevisMail } from '@/lib/modelesMails';

// Report automatique du devis de chaque scénario (Phase 8, étape 7, PR #59).
// Mathieu, 02/11/2026, 20 h 19 : « On ne peut pas reporter automatiquement le lien du devis ? Il faudrait limiter
// l'utilisation de ClickUp au commercial, au back office et à la direction. » Choix du 02/11 à 21 h 05 : intégré à la
// PR #59. Remplace le report par Brain de la décision Q2 du 02/11 (Brain contrôle toujours, sans toucher au devis).
// Costructor ne prévient pas le site à la finalisation (pas de webhook dans son API) et le cron Vercel Hobby ne passe
// qu'une fois par jour : le report se fait au passage en 📩 devis envoyé, de la fiche ou du scénario (aiguillage).
// Règles :
// - devis d'un scénario = devis Costructor finalisé (ni brouillon, ni annulé, ni refusé, ni révisé) dont le nom contient
//   « Scénario X » et commence par le nom de la fiche (nom donné par le brief, src/lib/briefSaisie.ts), ou appartient
//   au client du 🔗 Lien Costructor de la fiche ;
// - 🔗 Lien devis déjà collé sur le scénario : c'est ce devis qui compte (dernière version s'il a été révisé) ;
// - mauvaise affaire (règle du 12/10, src/app/api/devis/montant/route.ts) : un devis d'un autre client Costructor que
//   celui de la fiche n'est jamais reporté ;
// - devis AMO (nom avec « AMO ») : jamais additionné ni mis dans les champs, noté en commentaire sur le scénario ;
// - plusieurs devis de travaux pour un scénario : rien n'est choisi ni additionné, alerte avec la liste ;
// - tarif type résident (scénario RIC d'une fiche syndic ou pro) : N° et lien reportés, montant laissé vide, jamais
//   additionné au pipeline (compétence Site appli et ERP) ;
// - fiche à un seul scénario : les 3 champs sont aussi remplis sur la fiche (comme avant, un seul devis) ; plusieurs
//   scénarios : la fiche les reçoit au 🏆 gagné, du scénario retenu (src/lib/scenarioRetenu.ts) ;
// - déjà à jour : rien n'est réécrit ni commenté (le passage des scénarios en devis envoyé rappelle ce report).
// Montants : centimes dans l'API externe, comme src/app/api/devis/montant/route.ts.
// Preview : écritures sur la liste TEST seulement, simulation partout.
// 06/11/2026 (Phase 9, lot 3, accord de Mathieu à 21 h 16) : devisPourMail, en bas de ce fichier, lit avec les mêmes
// règles les devis finalisés de la fiche pour remplir le mail « Devis · envoi » (n°, HT, TTC, TVA, lien de la page
// client Costructor, validité). Lecture seule : il n'écrit rien.

const COSTRUCTOR = 'https://api.costructor.co/external/v1';
const EXCLUS = ['revised', 'draft', 'cancelled', 'refused'];
const LIBELLES_STATUT: Record<string, string> = { draft: 'en brouillon', cancelled: 'annulé', refused: 'refusé', revised: 'révisé' };

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const mots = (s: unknown) => normal(s).replace(/[^a-z0-9]+/g, ' ').trim();
const euros = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT`;
const urlDevis = (id: string) => `https://app.costructor.co/quotes/${id}/details`;
const statutDe = (d: any) => String(d?.status || '').toLowerCase();
const clientDe = (d: any) => String(d?.customer?.id || d?.customerId || d?.customer_id || '');
const estAmo = (d: any) => ` ${mots(d?.name)} `.includes(' amo ');

// Montant HT en euros (l'API externe renvoie des centimes ; COSTRUCTOR_MONTANTS_CENTIMES=0 si cela change)
function montantHT(d: any): number {
  if (typeof d?.subtotalDecimal === 'string') return Number(d.subtotalDecimal);
  const n = Number(d?.subtotal ?? d?.subTotal ?? d?.totalExclTax ?? d?.total_ht);
  return process.env.COSTRUCTOR_MONTANTS_CENTIMES !== '0' ? Math.round(n) / 100 : Math.round(n * 100) / 100;
}
const ligne = (d: any) => `${d?.number || 'sans n°'}${d?.name ? ` · ${d.name}` : ''} · ${euros(montantHT(d))} : ${urlDevis(String(d?.id))}`;

async function api(token: string, chemin: string, methode = 'GET', corps?: any): Promise<Response> {
  return fetch(`https://api.clickup.com/api/v2${chemin}`, {
    method: methode,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
}

async function lireTache(token: string, id: string, sousTaches = false): Promise<any | null> {
  const res = await api(token, `/task/${encodeURIComponent(id)}${sousTaches ? '?include_subtasks=true' : ''}`);
  return res.ok ? res.json() : null;
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

// Tous les devis (même lecture que src/app/api/devis/montant/route.ts). null = lecture impossible
async function listerDevis(token: string): Promise<any[] | null> {
  const tous: any[] = [];
  const vus = new Set<string>();
  for (let page = 1; page <= 20; page++) {
    const res = await costructor(token, `/quotes?_limit=100&limit=100&_page=${page}&page=${page}`);
    if (!res.ok) return page === 1 ? null : tous;
    const json = await res.json().catch(() => ({}));
    const lot: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    const nouveaux = lot.filter((d) => d?.id && !vus.has(d.id));
    if (!nouveaux.length) break;
    for (const d of nouveaux) { vus.add(d.id); tous.push(d); }
  }
  return tous;
}

const champs = (t: any): any[] => (Array.isArray(t?.custom_fields) ? t.custom_fields : []);
const valeur = (t: any, id: string): string => {
  const v = champs(t).find((c) => c?.id === id)?.value;
  return v === undefined || v === null ? '' : String(v).trim();
};
// Sous-tâches directes non archivées
const directes = (t: any): any[] => (Array.isArray(t?.subtasks) ? t.subtasks : [])
  .filter((s: any) => !s?.archived && (!s?.parent || String(s.parent) === String(t?.id)));

// Dernière version d'un devis révisé : même numéro et même client, hors révisé et brouillon
function derniereVersion(devis: any[], d: any): any {
  if (!EXCLUS.includes(statutDe(d))) return d;
  return devis.find((x) => x.number === d.number && clientDe(x) === clientDe(d) && !EXCLUS.includes(statutDe(x))) || d;
}

async function ecrire(token: string, taskId: string, champId: string, v: any): Promise<boolean> {
  const res = await api(token, `/task/${encodeURIComponent(taskId)}/field/${champId}`, 'POST', { value: v });
  if (!res.ok) console.error(`Champ ${champId} refusé (${res.status}) sur ${taskId}`, await res.text().catch(() => ''));
  return res.ok;
}

async function commenter(token: string, taskId: string, texte: string) {
  const res = await api(token, `/task/${encodeURIComponent(taskId)}/comment`, 'POST', { comment_text: texte, notify_all: false });
  if (!res.ok) console.error(`Commentaire refusé (${res.status}) sur ${taskId}`);
}

// Liste Qualification de cet environnement (TEST en preview) ; simulation aussi sur la vraie liste en preview
function garde(t: any, simulation: boolean): string | null {
  const liste = String(t?.list?.id ?? '');
  const qualif = String(getQualificationListId() || '');
  if (qualif && liste === qualif) return null;
  if (process.env.VERCEL_ENV !== 'production' && simulation && liste === QUALIFICATION_PROD_ID) return null;
  return 'ignore_hors_liste';
}

type Contexte = { token: string; fiche: any; devis: any[]; seul: boolean; simulation: boolean };

async function reporter(ctx: Contexte, s: any): Promise<any> {
  const { token, fiche, devis, seul, simulation } = ctx;
  const id = String(s.id);
  const nom = String(s.name || '');
  const lettre = (nom.match(/Sc[ée]nario\s+([A-Za-z0-9]+)/i)?.[1] || '').toLowerCase();
  const ficheNom = mots(fiche?.name);
  const clientId = (valeur(fiche, CHAMPS.lienCostructor).match(/cnt_[a-z0-9]+/i) || [])[0] || '';
  const lienScenario = valeur(s, CHAMPS.lienDevis);
  const qid = (lienScenario.match(/quote_[a-z0-9]+/i) || [])[0] || '';
  const segment = cleOption(OPTIONS.segment, indexMenu(s, CHAMPS.segment));
  const typeClient = cleOption(OPTIONS.typeClient, indexMenu(fiche, CHAMPS.typeClient));
  const tarifType = segment === 'RIC' && (typeClient === 'syndic' || typeClient === 'pro');
  const signaler = async (action: string, texte: string, extra: Record<string, unknown> = {}) => {
    if (!simulation) await alerter(token, id, texte);
    return { scenario: nom, action, commentaire: texte, ...extra };
  };

  // Devis du scénario : « Scénario X » dans le nom, et nom de la fiche en tête ou client de la fiche
  const duScenario = (d: any) => {
    if (!lettre) return false;
    const n = mots(d?.name);
    if (!` ${n} `.includes(` scenario ${lettre} `)) return false;
    return (!!ficheNom && (n === ficheNom || n.startsWith(`${ficheNom} `))) || (!!clientId && clientDe(d) === clientId);
  };
  const autreClient = (d: any) => !!clientId && !!clientDe(d) && clientDe(d) !== clientId;
  const trouves = devis.filter(duScenario);
  const finalises = trouves.filter((d) => !EXCLUS.includes(statutDe(d)));
  const ecartes = finalises.filter(autreClient);
  const retenus = finalises.filter((d) => !autreClient(d));
  const amo = retenus.filter(estAmo);
  const travaux = retenus.filter((d) => !estAmo(d));

  let choisi: any = null;
  if (qid) {
    const d0 = devis.find((d) => d.id === qid);
    if (!d0) {
      return signaler('lien_inconnu', `⚠️ Devis : le lien collé dans « 🔗 Lien devis » de ${nom} ne correspond à aucun devis Costructor. Colle le lien de la page du devis (app.costructor.co/quotes/…), ou vide le champ pour que le site le retrouve par son nom.`);
    }
    choisi = derniereVersion(devis, d0);
    if (EXCLUS.includes(statutDe(choisi))) {
      return signaler('lien_non_finalise', `⚠️ Devis : le devis collé dans « 🔗 Lien devis » de ${nom} est ${LIBELLES_STATUT[statutDe(choisi)] || statutDe(choisi)} dans Costructor. Rien n'a été reporté.`);
    }
    if (autreClient(choisi)) {
      return signaler('devis_autre_client', `⚠️ Devis : le devis ${choisi.number} collé dans « 🔗 Lien devis » de ${nom} appartient à un autre client Costructor que celui de la fiche. Rien n'a été écrit : vérifie que c'est la bonne affaire, puis corrige l'un des deux liens.`);
    }
  } else if (travaux.length === 1) {
    choisi = travaux[0];
  } else if (travaux.length > 1) {
    return signaler('plusieurs_devis', `⚠️ Devis : ${travaux.length} devis finalisés pour ${nom}, aucun n'a été retenu ni additionné. Colle le bon lien dans « 🔗 Lien devis » du scénario : ${travaux.map(ligne).join(' ; ')}`, { devis: travaux.map((d) => d.number) });
  } else {
    const brouillons = trouves.filter((d) => statutDe(d) === 'draft' && !autreClient(d) && !estAmo(d));
    const plusieurs = brouillons.length > 1;
    const raison = brouillons.length
      ? ` ${plusieurs ? 'Ses devis sont' : 'Son devis est'} encore en brouillon : finalise-${plusieurs ? 'les' : 'le'} dans Costructor, puis repasse en 📩 devis envoyé.`
      : ecartes.length
        ? ` ${ecartes.length > 1 ? 'Des devis portent' : 'Un devis porte'} son nom, mais pour un autre client Costructor : ${ecartes.map(ligne).join(' ; ')}.`
        : ` Son nom doit commencer par « ${String(fiche?.name || '').trim()} · Scénario ${lettre.toUpperCase()} » (nom donné par le brief), ou colle le lien dans « 🔗 Lien devis » du scénario.`;
    const amoTexte = amo.length ? ` Devis AMO trouvé, jamais mis dans les champs : ${amo.map(ligne).join(' ; ')}.` : '';
    return signaler('aucun_devis', `⚠️ Devis : aucun devis de travaux finalisé trouvé pour ${nom}.${raison}${amoTexte}`);
  }

  const ht = montantHT(choisi);
  const numero = String(choisi.number || '');
  const lien = urlDevis(String(choisi.id));
  const amoAutres = amo.filter((d) => d.id !== choisi.id);
  const montantActuel = Number(valeur(s, CHAMPS.montantDevisHT).replace(',', '.'));
  const aJour = valeur(s, CHAMPS.numeroDevis) === numero && lienScenario.includes(String(choisi.id))
    && (tarifType || (valeur(s, CHAMPS.montantDevisHT) !== '' && Math.abs(montantActuel - ht) < 0.005));
  const ficheAussi = seul && !tarifType;
  const resume = { scenario: nom, devis: numero, ht, tarifType, amo: amoAutres.map((d) => d.number), ficheAussi };
  if (aJour) return { ...resume, action: 'deja_a_jour' };
  if (simulation) return { ...resume, action: 'reporterait' };

  const cibles = ficheAussi ? [id, String(fiche.id)] : [id];
  const rates: string[] = [];
  for (const cible of cibles) {
    const ou = cible === id ? 'scénario' : 'fiche';
    if (!(await ecrire(token, cible, CHAMPS.numeroDevis, numero))) rates.push(`📝 N° devis (${ou})`);
    if (!(await ecrire(token, cible, CHAMPS.lienDevis, lien))) rates.push(`🔗 Lien devis (${ou})`);
    if (!tarifType && !(await ecrire(token, cible, CHAMPS.montantDevisHT, ht))) rates.push(`💶 Montant devis HT (${ou})`);
  }
  const lignes = [
    `💶 Devis ${numero} reporté par le site : ${tarifType ? 'tarif type résident, montant laissé vide (jamais additionné au pipeline)' : euros(ht)}. ${tarifType ? '📝 N° et 🔗 lien remplis' : '📝 N°, 💶 montant et 🔗 lien remplis'} sur le scénario${ficheAussi ? ' et sur la fiche' : ''}.`,
  ];
  if (amoAutres.length) lignes.push(`Devis AMO à part, jamais additionné : ${amoAutres.map(ligne).join(' ; ')}.`);
  if (ecartes.length) lignes.push(`⚠️ Écarté (autre client Costructor que celui de la fiche) : ${ecartes.map(ligne).join(' ; ')}.`);
  if (rates.length) {
    lignes.push(`⚠️ Non écrit, à remplir à la main : ${rates.join(', ')}.`);
    await alerter(token, id, lignes.join(' '));
  } else {
    await commenter(token, id, lignes.join('\n'));
  }
  return { ...resume, action: 'reporte', rates };
}

// Appelé par l'aiguillage au passage en 📩 devis envoyé d'une fiche à scénarios ou d'un scénario
export async function reporterDevisScenarios(taskId: string, simulation: boolean) {
  const token = process.env.CLICKUP_API_KEY;
  const co = process.env.COSTRUCTOR_API_KEY;
  if (!token || !co) return { success: false, error: 'Configuration serveur incomplète' };
  const t = await lireTache(token, taskId, true);
  if (!t) return { success: false, error: 'Tâche introuvable' };
  const refus = garde(t, simulation);
  if (refus) return { success: true, action: refus, simulation };
  const { carte } = await chargerTypes(token);
  if (estDuType(t, 'element', carte)) return { success: true, action: 'ignore_element', simulation };

  let fiche: any = t;
  let scenarios: any[] = [];
  let total = 0;
  if (t.parent) {
    if (!estScenario(t, carte)) return { success: true, action: 'ignore_sous_tache', simulation };
    fiche = await lireTache(token, String(t.parent), true);
    if (!fiche) return { success: false, error: 'Fiche du scénario introuvable' };
    scenarios = [t];
    total = directes(fiche).filter((x) => estScenario(x, carte)).length || 1;
  } else {
    const liste = directes(t).filter((x) => estScenario(x, carte));
    if (!liste.length) return { success: true, action: 'sans_scenario', simulation };
    scenarios = (await Promise.all(liste.map((x) => lireTache(token, String(x.id))))).filter(Boolean);
    total = liste.length;
  }

  const devis = await listerDevis(co);
  if (!devis) {
    const texte = "⚠️ Devis : lecture de Costructor impossible, devis des scénarios non reportés. Repasse en 📩 devis envoyé dans quelques minutes, ou colle les liens dans « 🔗 Lien devis » des scénarios.";
    if (!simulation) await alerter(token, String(fiche.id), texte);
    return { success: false, error: 'Lecture Costructor impossible', commentaire: texte, simulation };
  }
  const ctx: Contexte = { token, fiche, devis, seul: total === 1, simulation };
  const resultats: any[] = [];
  for (const s of scenarios) resultats.push(await reporter(ctx, s));
  const ok = resultats.every((r) => ['reporte', 'deja_a_jour', 'reporterait'].includes(String(r?.action)) && !(r?.rates || []).length);
  return { success: ok, action: 'scenarios', resultats, simulation };
}

// ── Devis pour le mail « Devis · envoi » (Phase 9, lot 3, 06/11/2026) ──
// Mêmes règles que reporter() pour retrouver le devis de chaque scénario, sans rien écrire. Le mail a besoin de ce que
// voit le client : TTC, TVA, page client Costructor (consultation et signature en ligne) et date de validité.
// Un champ absent de l'API n'est jamais inventé : le texte du mail met alors un [crochet] qui bloque l'envoi.
const centimes = (n: number) => (process.env.COSTRUCTOR_MONTANTS_CENTIMES !== '0' ? Math.round(n) / 100 : Math.round(n * 100) / 100);
function montantTTC(d: any): number | null {
  if (typeof d?.totalDecimal === 'string' && d.totalDecimal.trim()) return Number(d.totalDecimal);
  const n = Number(d?.total ?? d?.totalInclTax ?? d?.netToPay ?? d?.total_ttc);
  return Number.isFinite(n) && n > 0 ? centimes(n) : null;
}
function tauxTva(d: any): string {
  const ht = Number(d?.subtotal ?? d?.subTotal ?? d?.totalExclTax);
  const taxe = Number(d?.taxTotal ?? d?.tax_total ?? d?.totalTax ?? d?.vatTotal);
  if (!(ht > 0) || !Number.isFinite(taxe)) return '';
  const r = (taxe / ht) * 100;
  const connu = [5.5, 10, 20].find((x) => Math.abs(x - r) < 0.3);
  return connu ? `${String(connu).replace('.', ',')} %` : '';
}
const lienClient = (d: any) => {
  const l = String(d?.hostedUrl || d?.hosted_url || d?.publicUrl || d?.public_url || d?.shareUrl || d?.share_url || '').trim();
  return /^https:\/\/\S+$/i.test(l) ? l : '';
};
const expireDe = (d: any) => {
  const v = String(d?.expireAt || d?.expire_at || d?.expiresAt || d?.validUntil || d?.valid_until || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
};

export async function devisPourMail(ficheId: string): Promise<{ devis: DevisMail[]; problemes: string[] }> {
  const token = process.env.CLICKUP_API_KEY;
  const co = process.env.COSTRUCTOR_API_KEY;
  if (!token || !co) return { devis: [], problemes: ['configuration serveur incomplète (clé Costructor absente)'] };
  const t = await lireTache(token, ficheId, true);
  if (!t) return { devis: [], problemes: ['fiche introuvable'] };
  const fiche = t.parent ? await lireTache(token, String(t.parent), true) : t;
  if (!fiche) return { devis: [], problemes: ['fiche introuvable'] };
  const { carte } = await chargerTypes(token);
  const scenarios = (await Promise.all(directes(fiche).filter((x) => estScenario(x, carte)).map((x) => lireTache(token, String(x.id))))).filter(Boolean);
  if (!scenarios.length) return { devis: [], problemes: ['aucun scénario sur la fiche'] };
  const tous = await listerDevis(co);
  if (!tous) return { devis: [], problemes: ['lecture de Costructor impossible : réessaie dans quelques minutes'] };

  const ficheNom = mots(fiche?.name);
  const clientId = (valeur(fiche, CHAMPS.lienCostructor).match(/cnt_[a-z0-9]+/i) || [])[0] || '';
  const typeClient = cleOption(OPTIONS.typeClient, indexMenu(fiche, CHAMPS.typeClient));
  const autreClient = (d: any) => !!clientId && !!clientDe(d) && clientDe(d) !== clientId;
  const choisis: { d: any; scenario: string; amo: boolean; tarifType: boolean }[] = [];
  const problemes: string[] = [];

  for (const s of scenarios) {
    const nom = String(s.name || '');
    const lettre = (nom.match(/Sc[ée]nario\s+([A-Za-z0-9]+)/i)?.[1] || '').toLowerCase();
    const segment = cleOption(OPTIONS.segment, indexMenu(s, CHAMPS.segment));
    const tarifType = segment === 'RIC' && (typeClient === 'syndic' || typeClient === 'pro');
    const qid = (valeur(s, CHAMPS.lienDevis).match(/quote_[a-z0-9]+/i) || [])[0] || '';
    const duScenario = (d: any) => {
      if (!lettre) return false;
      const n = mots(d?.name);
      if (!` ${n} `.includes(` scenario ${lettre} `)) return false;
      return (!!ficheNom && (n === ficheNom || n.startsWith(`${ficheNom} `))) || (!!clientId && clientDe(d) === clientId);
    };
    const retenus = tous.filter(duScenario).filter((d) => !EXCLUS.includes(statutDe(d)) && !autreClient(d));
    for (const a of retenus.filter(estAmo)) {
      if (!choisis.some((c) => c.d.id === a.id)) choisis.push({ d: a, scenario: nom, amo: true, tarifType: false });
    }
    const travaux = retenus.filter((d) => !estAmo(d));
    let choisi: any = null;
    if (qid) {
      const d0 = tous.find((d) => d.id === qid);
      const v = d0 ? derniereVersion(tous, d0) : null;
      if (!v) problemes.push(`${nom} : le lien collé dans « 🔗 Lien devis » ne correspond à aucun devis Costructor`);
      else if (EXCLUS.includes(statutDe(v))) problemes.push(`${nom} : le devis ${v.number || ''} est ${LIBELLES_STATUT[statutDe(v)] || statutDe(v)} dans Costructor`);
      else if (autreClient(v)) problemes.push(`${nom} : le devis ${v.number || ''} appartient à un autre client Costructor que celui de la fiche`);
      else choisi = v;
    } else if (travaux.length === 1) choisi = travaux[0];
    else if (travaux.length > 1) problemes.push(`${nom} : ${travaux.length} devis finalisés (${travaux.map((d) => d.number).join(', ')}), colle le bon dans « 🔗 Lien devis » du scénario`);
    else {
      const brouillon = tous.filter(duScenario).some((d) => statutDe(d) === 'draft' && !estAmo(d));
      problemes.push(`${nom} : ${brouillon ? 'devis encore en brouillon, finalise-le dans Costructor' : `aucun devis finalisé trouvé (son nom doit commencer par « ${String(fiche?.name || '').trim()} · Scénario ${lettre.toUpperCase()} »)`}`);
    }
    if (choisi && !choisis.some((c) => c.d.id === choisi.id)) choisis.push({ d: choisi, scenario: nom, amo: estAmo(choisi), tarifType });
  }

  // Page client absente de la liste : relue sur le devis lui-même
  const devis: DevisMail[] = [];
  for (const c of choisis) {
    let d = c.d;
    if (!lienClient(d) || montantTTC(d) === null || !expireDe(d)) {
      const r = await costructor(co, `/quotes/${encodeURIComponent(String(d.id))}`);
      const j = r.ok ? await r.json().catch(() => null) : null;
      const detail = j?.data && typeof j.data === 'object' && !Array.isArray(j.data) ? j.data : j;
      if (detail?.id) d = { ...d, ...detail };
    }
    devis.push({
      scenario: c.scenario,
      numero: String(d.number || ''),
      nom: String(d.name || ''),
      ht: montantHT(d),
      ttc: montantTTC(d),
      tva: tauxTva(d),
      lien: lienClient(d),
      expire: expireDe(d),
      amo: c.amo,
      tarifType: c.tarifType,
    });
    if (!lienClient(d)) problemes.push(`devis ${d.number || ''} : lien de signature en ligne introuvable dans Costructor, à copier à la main`);
  }
  return { devis, problemes };
}
