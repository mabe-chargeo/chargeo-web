import { NextResponse } from 'next/server';
import { getQualificationListId, QUALIFICATION_PROD_ID } from '@/lib/listesClickUp';
import { aujourdhuiParis, ajouterJoursOuvres, echeanceClickUp, libelleJour } from '@/lib/joursOuvres';

// Remontée du devis Costructor dans la fiche (Phase 4, validé par Matthieu le 11/10/2026).
// Appelé par les automatisations de Qualification : POST ?taskId=...&evenement=envoye | gagne
// - envoye (📩 devis envoyé) : si 🔗 Lien devis est déjà rempli, c'est ce devis qui compte. Sinon le site lit les devis
//   du client (🔗 Lien Costructor) et écarte versions révisées, brouillons, annulés et refusés. Un seul devis en cours :
//   N°, montant HT et lien sont remplis. Plusieurs : rien n'est choisi ni additionné, un commentaire liste les devis.
//   Lien Costructor mort (client supprimé, vu sur Bacchus le 11/10) : commentaire, avec les devis dont le client porte
//   le même nom que la fiche, sans en choisir un.
// - gagne (🏆 gagné) : relit le devis du lien, suit sa dernière version s'il a été révisé, met à jour le montant et
//   signale (sans bloquer) un devis pas encore signé dans Costructor.
//   Devis signé : crée la tâche « Acompte · client · n° devis » dans Factures Clients (📄 à émettre, Type de pièce Acompte,
//   Client, Réf. devis signé, Lien Costructor, 🔗 Affaire), échéance = rappel à J+1 ouvré pour émettre l'acompte dans
//   Costructor. Montant laissé vide : il dépend des conditions de chaque devis (décision Matthieu du 11/10). Jamais en
//   double : une tâche acompte déjà présente pour ce n° de devis est réutilisée.
// Montants : l'API externe renvoie des centimes (Bacchus D202600007 : 1959994 = 19 599,94 € HT, vérifié le 11/10).
// Champs lus par identifiant puis par nom (ils peuvent être renommés sans « signé »).
// Preview : GET ?taskId=...&evenement=...&simulation=1 (aussi sur une vraie fiche, lecture seule) ou &executer=1 (fiches TEST).
//   &forcerSigne=1 (preview seulement) : traite le devis comme signé, pour tester la création de l'acompte.

const COSTRUCTOR = 'https://api.costructor.co/external/v1';
const PLANNING_CHANTIERS_ID = '901520038258';
const FACTURES_ID = process.env.CLICKUP_FACTURES_LIST_ID || '1200630000003863';
const CHAMPS = {
  lienClient: { id: 'd9f88e8f-4e20-4a98-aee8-3ded30fef5fc', nom: 'lien costructor' },
  montant: { id: '58a159c7-edbc-4d53-a81a-5ec48337c7eb', nom: 'montant devis' },
  numero: { id: '4423a27f-ecc1-4107-9488-4784360178c0', nom: 'n devis' },
  lienDevis: { id: 'ae80f202-2ef3-4302-b778-f36075ee398f', nom: 'lien devis' },
};
// Champs de Factures Clients (v2)
const FACTURE = {
  type: '2885d2af-84ee-4c56-aa4d-3be5e2efd671',
  client: '00a44fea-ea64-4350-be16-9c6e505373b4',
  ref: '70524913-0dea-4ce4-828e-fea0338a6d1f',
  affaire: '70f095a0-d0ec-413a-9ed9-fbc763306869',
  lien: '87363f81-73a0-4928-b637-5a1c63fdc075',
};
const EVENEMENTS = ['envoye', 'gagne'] as const;
type Evenement = (typeof EVENEMENTS)[number];
const EXCLUS = ['revised', 'draft', 'cancelled', 'refused'];
const SIGNES = ['accepted', 'done'];

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const euros = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT`;
const urlDevis = (id: string) => `https://app.costructor.co/quotes/${id}/details`;

// Même nom de client, en ignorant les mots génériques (même règle que le webhook Costructor)
const MOTS_GENERIQUES = new Set(['test', 'sdc', 'copr', 'copro', 'copropriete', 'synd', 'syndic', 'syndicat', 'residence', 'res',
  'le', 'la', 'les', 'l', 'du', 'de', 'des', 'd', 'et', 'sarl', 'sas', 'sasu', 'eurl', 'sa', 'sci']);
function memeNom(a: string, b: string): boolean {
  const ma = normal(a).split(' ').filter((m) => m && !MOTS_GENERIQUES.has(m));
  const mb = normal(b).split(' ').filter((m) => m && !MOTS_GENERIQUES.has(m));
  if (!ma.length || !mb.length) return false;
  const [court, long] = ma.length <= mb.length ? [ma, mb] : [mb, ma];
  const dansLong = new Set(long);
  return court.every((m) => dansLong.has(m));
}

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

// Tous les devis (pagination _limit/_page). null = lecture impossible.
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

// Le client du lien existe-t-il encore ? true / false, ou null si Costructor ne répond pas
async function clientExiste(token: string, id: string): Promise<boolean | null> {
  const res = await costructor(token, `/contacts/${encodeURIComponent(id)}`);
  if (res.ok) return true;
  if (res.status === 404) return false;
  return null;
}

function trouverChamp(tache: any, c: { id: string; nom: string }): any {
  const champs: any[] = Array.isArray(tache?.custom_fields) ? tache.custom_fields : [];
  return champs.find((f) => f.id === c.id) || champs.find((f) => normal(f.name).includes(c.nom));
}
const valeur = (tache: any, c: { id: string; nom: string }) => {
  const v = trouverChamp(tache, c)?.value;
  return v === undefined || v === null ? '' : String(v).trim();
};

// Montant HT en euros. L'API externe renvoie des centimes ; variable Vercel COSTRUCTOR_MONTANTS_CENTIMES=0 si cela change.
function montantHT(d: any): { ht: number; brut: any; centimes: boolean } {
  const brut = d?.subtotal ?? d?.subTotal ?? d?.totalExclTax ?? d?.total_ht;
  if (typeof d?.subtotalDecimal === 'string') return { ht: Number(d.subtotalDecimal), brut, centimes: false };
  const n = Number(brut);
  const centimes = process.env.COSTRUCTOR_MONTANTS_CENTIMES !== '0';
  return { ht: centimes ? Math.round(n) / 100 : Math.round(n * 100) / 100, brut, centimes };
}

const clientDe = (d: any) => String(d?.customer?.id || d?.customerId || d?.customer_id || '');
const nomClientDe = (d: any) => String(d?.customer?.fullName || d?.customer?.companyName || '');
const statutDe = (d: any) => String(d?.status || '').toLowerCase();
const resumeDevis = (d: any) => {
  const m = montantHT(d);
  return { id: d.id, numero: d.number, nom: d.name || '', client: nomClientDe(d), statut: d.statusLabel || d.status, envoye: d.sent, ht: m.ht, brut: m.brut };
};
const ligneDevis = (d: any) => `• ${d.number}${d.name ? ` · ${d.name}` : ''} · ${euros(montantHT(d).ht)} : ${urlDevis(d.id)}`;

// Devis en cours d'une liste : hors révisés, brouillons, annulés, refusés ; les envoyés d'abord
function enCours(liste: any[]): any[] {
  const actifs = liste.filter((d) => !EXCLUS.includes(statutDe(d)));
  const envoyes = actifs.filter((d) => d.sent !== false);
  return envoyes.length ? envoyes : actifs;
}

// Dernière version d'un devis : même numéro et même client, hors révisé / brouillon
function derniereVersion(devis: any[], d: any): any {
  if (!EXCLUS.includes(statutDe(d))) return d;
  const memes = devis.filter((x) => x.number === d.number && clientDe(x) === clientDe(d) && !EXCLUS.includes(statutDe(x)));
  return memes[0] || d;
}

async function ecrire(token: string, taskId: string, tache: any, c: { id: string; nom: string }, v: any): Promise<boolean> {
  const f = trouverChamp(tache, c);
  if (!f) return false;
  const res = await clickup(token, `/task/${taskId}/field/${f.id}`, 'POST', { value: v });
  return res.ok;
}

async function commenter(token: string, taskId: string, texte: string, notifier = false) {
  const res = await clickup(token, `/task/${taskId}/comment`, 'POST', { comment_text: texte, notify_all: notifier });
  if (!res.ok) console.error(`Commentaire refusé (${res.status}) sur ${taskId}`);
}

// ---------- Facture d'acompte ----------

// Tâche acompte déjà présente pour ce n° de devis ? tâche, null, ou undefined si lecture impossible
async function acompteExistant(cu: string, numero: string): Promise<any | null | undefined> {
  for (let page = 0; page < 10; page++) {
    const res = await clickup(cu, `/list/${FACTURES_ID}/task?include_closed=true&subtasks=true&page=${page}`);
    if (!res.ok) return undefined;
    const json = await res.json().catch(() => ({}));
    const taches: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    const trouvee = taches.find((t) => {
      const ref = (t.custom_fields || []).find((c: any) => c.id === FACTURE.ref)?.value;
      return String(ref || '').trim() === numero && normal(t.name).includes('acompte');
    });
    if (trouvee) return trouvee;
    if (json?.last_page !== false || taches.length === 0) break;
  }
  return null;
}

async function optionAcompte(cu: string): Promise<string | null> {
  const res = await clickup(cu, `/list/${FACTURES_ID}/field`);
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  const f = (json?.fields || []).find((x: any) => x.id === FACTURE.type);
  const o = (f?.type_config?.options || []).find((x: any) => normal(x.name) === 'acompte');
  return o ? String(o.id) : null;
}

async function creerAcompte(cu: string, tache: any, devis: any, lienClient: string, simulation: boolean) {
  const numero = String(devis.number || '');
  const existant = await acompteExistant(cu, numero);
  if (existant === undefined) return { acompte: 'lecture_factures_impossible' };
  if (existant) return { acompte: 'deja_cree', nom: existant.name, url: existant.url };

  const client = nomClientDe(devis) || String(tache.name || '');
  const estTest = normal(tache.name).startsWith('test');
  const nom = `${estTest ? 'Test · ' : ''}Acompte · ${client} · ${numero}`;
  const rappel = ajouterJoursOuvres(aujourdhuiParis(), 1);
  const base = { nom, rappel: libelleJour(rappel) };
  if (simulation) return { acompte: 'creerait', ...base };

  const option = await optionAcompte(cu);
  const description = [
    `Facture d'acompte du devis ${numero} (${euros(montantHT(devis).ht)}) : ${urlDevis(devis.id)}`,
    `Montant selon les conditions de ce devis (pas de taux fixe).`,
    `1. Émettre la facture d'acompte dans Costructor.`,
    `2. Remplir ici 🧾 N° facture Costructor, Montant HT et Date d'échéance.`,
    `3. Passer la tâche en 📤 émise : les rappels de relance se programment seuls.`,
  ].join('\n');
  const champs: any[] = [
    { id: FACTURE.client, value: client },
    { id: FACTURE.ref, value: numero },
  ];
  if (option) champs.push({ id: FACTURE.type, value: option });
  if (/^https?:\/\//.test(lienClient)) champs.push({ id: FACTURE.lien, value: lienClient });

  const res = await clickup(cu, `/list/${FACTURES_ID}/task`, 'POST', {
    name: nom, description, due_date: echeanceClickUp(rappel), due_date_time: false, custom_fields: champs,
  });
  if (!res.ok) {
    console.error(`Création de l'acompte refusée (${res.status})`, await res.text().catch(() => ''));
    return { acompte: 'erreur_creation', ...base };
  }
  const creee = await res.json();
  const lien = await clickup(cu, `/task/${creee.id}/field/${FACTURE.affaire}`, 'POST', { value: { add: [String(tache.id)], rem: [] } });
  return { acompte: 'cree', ...base, url: creee.url, typeRempli: !!option, affaireReliee: lien.ok };
}

async function traiter(taskId: string, evenement: Evenement, simulation: boolean, forcerSigne = false) {
  const cu = process.env.CLICKUP_API_KEY;
  const co = process.env.COSTRUCTOR_API_KEY;
  if (!cu || !co) return { status: 500, body: { success: false, error: 'Configuration serveur incomplète' } };

  const res = await clickup(cu, `/task/${encodeURIComponent(taskId)}?custom_task_ids=true`);
  if (!res.ok) return { status: 404, body: { success: false, error: 'Fiche introuvable' } };
  const tache = await res.json();
  if (tache.parent) return { status: 200, body: { success: true, action: 'ignore_sous_tache', simulation } };

  const liste = String(tache?.list?.id ?? '');
  const listeQualif = getQualificationListId();
  const autorisees = [String(listeQualif || ''), QUALIFICATION_PROD_ID, PLANNING_CHANTIERS_ID].filter(Boolean);
  if (!autorisees.includes(liste)) return { status: 200, body: { success: true, action: 'ignore_hors_liste', simulation } };
  if (process.env.VERCEL_ENV !== 'production' && !simulation) {
    const estTest = (!!listeQualif && liste === String(listeQualif)) || normal(tache.name).startsWith('test');
    if (!estTest) return { status: 403, body: { success: false, error: 'En preview : exécution sur une fiche TEST uniquement, simulation partout' } };
  }

  const id = String(tache.id);
  const champsPresents = {
    montant: !!trouverChamp(tache, CHAMPS.montant), numero: !!trouverChamp(tache, CHAMPS.numero), lienDevis: !!trouverChamp(tache, CHAMPS.lienDevis),
  };
  const lienClient = valeur(tache, CHAMPS.lienClient);
  const clientId = (lienClient.match(/cnt_[a-z0-9]+/i) || [])[0] || '';
  const lienDevis = valeur(tache, CHAMPS.lienDevis);
  const devisIdLien = (lienDevis.match(/quote_[a-z0-9]+/i) || [])[0] || '';

  const devis = await listerDevis(co);
  if (!devis) {
    if (!simulation) await commenter(cu, id, '⚠️ Devis : lecture de Costructor impossible, montant non remonté. Réessaie plus tard.');
    return { status: 502, body: { success: false, error: 'Lecture Costructor impossible' } };
  }

  // Devis choisi par le lien (identifiant ou lien client partagé)
  let choisi: any = null;
  if (lienDevis) {
    choisi = devis.find((d) => d.id === devisIdLien) || devis.find((d) => d.hostedUrl && lienDevis.startsWith(String(d.hostedUrl).split('?')[0]));
  }
  const base = { evenement, clientId: clientId || null, lienDevis: lienDevis || null, champsPresents, simulation };
  const signaler = async (action: string, texte: string, extra: any = {}) => {
    if (!simulation) await commenter(cu, id, texte, true);
    return { status: 200, body: { success: true, action, ...base, ...extra, commentaire: texte } };
  };

  if (!choisi) {
    if (lienDevis) {
      return signaler('lien_devis_inconnu', '⚠️ Devis : le lien collé dans « 🔗 Lien devis » ne correspond à aucun devis Costructor. Colle le lien de la page du devis (app.costructor.co/quotes/…).');
    }
    if (evenement === 'gagne' && !clientId) return { status: 200, body: { success: true, action: 'ignore_sans_lien', ...base } };
    if (!clientId) {
      return signaler('sans_client', '⚠️ Devis : « 🔗 Lien Costructor » est vide, je ne peux pas retrouver le devis. Colle le lien du devis dans « 🔗 Lien devis ».');
    }
    const candidats = enCours(devis.filter((d) => clientDe(d) === clientId));
    if (!candidats.length) {
      // Lien mort ? On propose les devis d'un client du même nom, sans en choisir un
      const existe = await clientExiste(co, clientId);
      const homonymes = enCours(devis.filter((d) => memeNom(nomClientDe(d), tache.name)));
      const propositions = homonymes.length ? `\nDevis en cours d'un client du même nom :\n${homonymes.map(ligneDevis).join('\n')}` : '';
      if (existe === false) {
        return signaler('lien_client_mort',
          `⚠️ Devis : « 🔗 Lien Costructor » pointe vers un client supprimé dans Costructor. Corrige le lien, ou colle le lien du devis dans « 🔗 Lien devis ».${propositions}`,
          { propositions: homonymes.map(resumeDevis) });
      }
      return signaler('aucun_devis',
        `⚠️ Devis : aucun devis en cours trouvé dans Costructor pour ce client. Colle le lien du devis dans « 🔗 Lien devis ».${propositions}`,
        { clientExiste: existe, propositions: homonymes.map(resumeDevis) });
    }
    if (candidats.length > 1) {
      return signaler('plusieurs_devis',
        `⚠️ Devis : ${candidats.length} devis en cours pour ce client, aucun n'a été retenu ni additionné. Colle le bon lien dans « 🔗 Lien devis » :\n${candidats.map(ligneDevis).join('\n')}`,
        { candidats: candidats.map(resumeDevis) });
    }
    choisi = candidats[0];
  }

  const actuel = derniereVersion(devis, choisi);
  const m = montantHT(actuel);
  const signeReel = SIGNES.includes(statutDe(actuel));
  const signe = signeReel || forcerSigne;
  const nouvelleVersion = actuel.id !== choisi.id;
  let texte = '';
  if (evenement === 'envoye') {
    texte = `💶 Devis ${actuel.number} retenu : ${euros(m.ht)}. N°, montant et lien remplis sur la fiche.`;
  } else if (signe) {
    texte = `🏆 Devis signé ${actuel.number} : ${euros(m.ht)}${nouvelleVersion ? ' (dernière version, montant mis à jour)' : ''}${forcerSigne && !signeReel ? ' [test : signature simulée]' : ''}.`;
  } else {
    texte = `⚠️ Devis ${actuel.number} pas encore signé dans Costructor (statut « ${actuel.statusLabel || actuel.status} »). Montant ${euros(m.ht)} reporté quand même. Vérifie la signature avant de lancer le chantier.`;
  }
  const resume: any = { action: evenement === 'envoye' ? 'devis_retenu' : signe ? 'devis_signe' : 'devis_non_signe', devis: resumeDevis(actuel), nouvelleVersion, centimes: m.centimes, forcerSigne, commentaire: texte };
  const faireAcompte = evenement === 'gagne' && signe;
  if (simulation) {
    if (faireAcompte) Object.assign(resume, await creerAcompte(cu, tache, actuel, lienClient, true));
    return { status: 200, body: { success: true, ...base, ...resume } };
  }

  const ok = {
    montant: await ecrire(cu, id, tache, CHAMPS.montant, m.ht),
    numero: await ecrire(cu, id, tache, CHAMPS.numero, String(actuel.number || '')),
    lienDevis: await ecrire(cu, id, tache, CHAMPS.lienDevis, urlDevis(actuel.id)),
  };
  const rates = Object.entries(ok).filter(([, v]) => !v).map(([k]) => k);
  if (rates.length) texte += ` ⚠️ Non écrit : ${rates.join(', ')} (champ absent de la liste ou refusé), à remplir à la main.`;
  await commenter(cu, id, texte, evenement === 'gagne' && !signe);

  if (faireAcompte) {
    const a: any = await creerAcompte(cu, tache, actuel, lienClient, false);
    Object.assign(resume, a);
    if (a.acompte === 'cree') {
      await commenter(cu, id, `🧾 Facture d'acompte à émettre : tâche créée dans Factures Clients (montant selon les conditions du devis), rappel le ${a.rappel}. ${a.url}`);
    } else if (a.acompte !== 'deja_cree') {
      await commenter(cu, id, `⚠️ Facture d'acompte : je n'ai pas pu créer la tâche dans Factures Clients. Crée-la à la main (Type de pièce Acompte, Réf. devis signé ${actuel.number}).`, true);
    }
  }
  return { status: 200, body: { success: rates.length === 0, ...base, ...resume, ecrit: ok, commentaire: texte } };
}

function lireEvenement(p: URLSearchParams): Evenement | null {
  const e = p.get('evenement') as Evenement;
  return EVENEMENTS.includes(e) ? e : null;
}

export async function POST(request: Request) {
  try {
    const p = new URL(request.url).searchParams;
    const taskId = p.get('taskId');
    const evenement = lireEvenement(p);
    if (!taskId || !evenement) return NextResponse.json({ success: false, error: 'Il faut ?taskId=...&evenement=envoye|gagne' }, { status: 400 });
    const r = await traiter(taskId, evenement, false);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur montant devis :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Preview uniquement : ?taskId=...&evenement=...&simulation=1 ou &executer=1 (option &forcerSigne=1)
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === 'production') return NextResponse.json({ error: 'Non disponible' }, { status: 404 });
  try {
    const p = new URL(request.url).searchParams;
    const taskId = p.get('taskId');
    const evenement = lireEvenement(p);
    const executer = p.get('executer') === '1';
    const simulation = p.get('simulation') === '1';
    const forcerSigne = p.get('forcerSigne') === '1';
    if (!taskId || !evenement || (!executer && !simulation)) {
      return NextResponse.json({ error: 'Ajoute ?taskId=...&evenement=envoye|gagne&simulation=1 ou &executer=1' }, { status: 400 });
    }
    const r = await traiter(taskId, evenement, !executer, forcerSigne);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur montant devis (preview) :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
