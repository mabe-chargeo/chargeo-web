import { NextResponse } from 'next/server';
import { getQualificationListId, QUALIFICATION_PROD_ID } from '@/lib/listesClickUp';

// Remontée du devis Costructor dans la fiche (Phase 4, validé par Matthieu le 11/10/2026).
// Appelé par les automatisations de Qualification : POST ?taskId=...&evenement=envoye | gagne
// - envoye (📩 devis envoyé) : si 🔗 Lien devis est déjà rempli, c'est ce devis qui compte. Sinon le site lit les devis
//   du client (🔗 Lien Costructor) et écarte versions révisées, brouillons, annulés et refusés. Un seul devis en cours :
//   N°, montant HT et lien sont remplis. Plusieurs : rien n'est choisi ni additionné, un commentaire liste les devis.
// - gagne (🏆 gagné) : relit le devis du lien, suit sa dernière version s'il a été révisé, met à jour le montant et
//   signale (sans bloquer) un devis pas encore signé dans Costructor.
// Champs lus par identifiant puis par nom (ils peuvent être renommés sans « signé »).
// Preview : GET ?taskId=...&evenement=...&simulation=1 (aussi sur une vraie fiche, lecture seule) ou &executer=1 (fiches TEST).

const COSTRUCTOR = 'https://api.costructor.co/external/v1';
const PLANNING_CHANTIERS_ID = '901520038258';
const CHAMPS = {
  lienClient: { id: 'd9f88e8f-4e20-4a98-aee8-3ded30fef5fc', nom: 'lien costructor' },
  montant: { id: '58a159c7-edbc-4d53-a81a-5ec48337c7eb', nom: 'montant devis' },
  numero: { id: '4423a27f-ecc1-4107-9488-4784360178c0', nom: 'n devis' },
  lienDevis: { id: 'ae80f202-2ef3-4302-b778-f36075ee398f', nom: 'lien devis' },
};
const EVENEMENTS = ['envoye', 'gagne'] as const;
type Evenement = (typeof EVENEMENTS)[number];
const EXCLUS = ['revised', 'draft', 'cancelled', 'refused'];
const SIGNES = ['accepted', 'done'];

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const euros = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT`;
const urlDevis = (id: string) => `https://app.costructor.co/quotes/${id}/details`;

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

function trouverChamp(tache: any, c: { id: string; nom: string }): any {
  const champs: any[] = Array.isArray(tache?.custom_fields) ? tache.custom_fields : [];
  return champs.find((f) => f.id === c.id) || champs.find((f) => normal(f.name).includes(c.nom));
}
const valeur = (tache: any, c: { id: string; nom: string }) => {
  const v = trouverChamp(tache, c)?.value;
  return v === undefined || v === null ? '' : String(v).trim();
};

// Montant HT en euros. L'API externe peut renvoyer des centimes (entier) : on le détecte avec la TVA et le TTC.
function montantHT(d: any): { ht: number; brut: any; centimes: boolean } {
  const brut = d?.subtotal ?? d?.subTotal ?? d?.totalExclTax ?? d?.total_ht;
  const n = Number(brut);
  const tva = Number(d?.taxTotal ?? 0);
  const ttc = Number(d?.total ?? 0);
  let centimes = false;
  if (typeof d?.subtotalDecimal === 'string') return { ht: Number(d.subtotalDecimal), brut, centimes };
  if (Number.isInteger(n) && Number.isInteger(ttc) && ttc > 0 && Math.abs(n + tva - ttc) <= 2 && n >= 10000) centimes = !!process.env.COSTRUCTOR_MONTANTS_CENTIMES || false;
  if (process.env.COSTRUCTOR_MONTANTS_CENTIMES === '1') centimes = true;
  return { ht: centimes ? Math.round(n) / 100 : Math.round(n * 100) / 100, brut, centimes };
}

const clientDe = (d: any) => String(d?.customer?.id || d?.customerId || d?.customer_id || '');
const statutDe = (d: any) => String(d?.status || '').toLowerCase();
const resumeDevis = (d: any) => ({
  id: d.id, numero: d.number, nom: d.name || '', statut: d.statusLabel || d.status, envoye: d.sent, ...(() => { const m = montantHT(d); return { ht: m.ht, brut: m.brut }; })(),
});

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

async function traiter(taskId: string, evenement: Evenement, simulation: boolean) {
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

  if (!choisi) {
    if (lienDevis) {
      const texte = '⚠️ Devis : le lien collé dans « 🔗 Lien devis » ne correspond à aucun devis Costructor. Colle le lien de la page du devis (app.costructor.co/quotes/…).';
      if (!simulation) await commenter(cu, id, texte, true);
      return { status: 200, body: { success: true, action: 'lien_devis_inconnu', ...base, commentaire: texte } };
    }
    if (evenement === 'gagne' && !clientId) return { status: 200, body: { success: true, action: 'ignore_sans_lien', ...base } };
    if (!clientId) {
      const texte = '⚠️ Devis : « 🔗 Lien Costructor » est vide, je ne peux pas retrouver le devis. Colle le lien du devis dans « 🔗 Lien devis ».';
      if (!simulation) await commenter(cu, id, texte, true);
      return { status: 200, body: { success: true, action: 'sans_client', ...base, commentaire: texte } };
    }
    const enCours = devis.filter((d) => clientDe(d) === clientId && !EXCLUS.includes(statutDe(d)));
    const envoyes = enCours.filter((d) => d.sent !== false);
    const candidats = envoyes.length ? envoyes : enCours;
    if (!candidats.length) {
      const texte = '⚠️ Devis : aucun devis en cours trouvé dans Costructor pour ce client. Colle le lien du devis dans « 🔗 Lien devis ».';
      if (!simulation) await commenter(cu, id, texte, true);
      return { status: 200, body: { success: true, action: 'aucun_devis', ...base, commentaire: texte } };
    }
    if (candidats.length > 1) {
      const lignes = candidats.map((d) => `• ${d.number}${d.name ? ` · ${d.name}` : ''} · ${euros(montantHT(d).ht)} : ${urlDevis(d.id)}`);
      const texte = `⚠️ Devis : ${candidats.length} devis en cours pour ce client, aucun n'a été retenu ni additionné. Colle le bon lien dans « 🔗 Lien devis » :\n${lignes.join('\n')}`;
      if (!simulation) await commenter(cu, id, texte, true);
      return { status: 200, body: { success: true, action: 'plusieurs_devis', ...base, candidats: candidats.map(resumeDevis), commentaire: texte } };
    }
    choisi = candidats[0];
  }

  const actuel = derniereVersion(devis, choisi);
  const m = montantHT(actuel);
  const signe = SIGNES.includes(statutDe(actuel));
  const nouvelleVersion = actuel.id !== choisi.id;
  let texte = '';
  if (evenement === 'envoye') {
    texte = `💶 Devis ${actuel.number} retenu : ${euros(m.ht)}. N°, montant et lien remplis sur la fiche.`;
  } else if (signe) {
    texte = `🏆 Devis signé ${actuel.number} : ${euros(m.ht)}${nouvelleVersion ? ' (dernière version, montant mis à jour)' : ''}.`;
  } else {
    texte = `⚠️ Devis ${actuel.number} pas encore signé dans Costructor (statut « ${actuel.statusLabel || actuel.status} »). Montant ${euros(m.ht)} reporté quand même. Vérifie la signature avant de lancer le chantier.`;
  }
  const resume = { action: evenement === 'envoye' ? 'devis_retenu' : signe ? 'devis_signe' : 'devis_non_signe', devis: resumeDevis(actuel), nouvelleVersion, centimes: m.centimes, commentaire: texte };
  if (simulation) return { status: 200, body: { success: true, ...base, ...resume } };

  const ok = {
    montant: await ecrire(cu, id, tache, CHAMPS.montant, m.ht),
    numero: await ecrire(cu, id, tache, CHAMPS.numero, String(actuel.number || '')),
    lienDevis: await ecrire(cu, id, tache, CHAMPS.lienDevis, urlDevis(actuel.id)),
  };
  const rates = Object.entries(ok).filter(([, v]) => !v).map(([k]) => k);
  if (rates.length) texte += ` ⚠️ Non écrit : ${rates.join(', ')} (champ absent de la liste ou refusé), à remplir à la main.`;
  await commenter(cu, id, texte, evenement === 'gagne' && !signe);
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

// Preview uniquement : ?taskId=...&evenement=...&simulation=1 ou &executer=1
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === 'production') return NextResponse.json({ error: 'Non disponible' }, { status: 404 });
  try {
    const p = new URL(request.url).searchParams;
    const taskId = p.get('taskId');
    const evenement = lireEvenement(p);
    const executer = p.get('executer') === '1';
    const simulation = p.get('simulation') === '1';
    if (!taskId || !evenement || (!executer && !simulation)) {
      return NextResponse.json({ error: 'Ajoute ?taskId=...&evenement=envoye|gagne&simulation=1 ou &executer=1' }, { status: 400 });
    }
    const r = await traiter(taskId, evenement, !executer);
    return NextResponse.json(r.body, { status: r.status });
  } catch (error) {
    console.error('Erreur montant devis (preview) :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
