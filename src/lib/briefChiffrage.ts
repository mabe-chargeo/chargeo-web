// Brief de chiffrage (étape 5 du plan du 15/10/2026, PR #51).
// Décision de Matthieu (15/10, 10 h 51) : au clic « Prêt à chiffrer », le site calcule et poste un commentaire
// « 📋 Brief de chiffrage » sur le scénario. Brain chiffre ensuite à partir de ce brief et des éléments, sans refaire
// les calculs. Ce n'est pas le site qui fait le devis (synthèse du 14/10, section 8).
// Calculs (synthèse du 14/10, sections 4, 6 et 7) :
// - réserve IRVE au barème (arrêté du 23/12/2020) en COP, avec le plafond ADVENIR infra ;
// - puissance à demander à Enedis si PDL dédié (réserve IRVE en COP, somme des puissances visées sinon), toujours
//   « à valider » ; en COP sur le TGBT SG : abonnement actuel + réserve IRVE ;
// - alerte « > 36 kVA : tarif jaune, étude spécifique » ;
// - section et chute de tension de chaque cheminement d'alimentation, 🔧 Section forcée prioritaire ;
// - artère COP : 63 A tri, 16 mm², ou 25 mm² si la chute dépasse la limite ;
// - RIC : boîte → coffret à la section de l'artère, forfait 5 + 5 m de tube apparent, dépassement = devis détaillé ;
// - « protection en tête » si Raccordement → coffret > 3 m (hors COP et RIC) ;
// - « exclusion Enedis » dès qu'Enedis intervient (PDL dédié, passage en tri, augmentation de puissance).
// Hypothèses de calcul, à valider par Matthieu : cuivre ρ = 0,0225 Ω·mm²/m, cos φ = 1, 230 V mono / 400 V tri,
// protection = calibre normalisé ≥ 1,2 × le courant, chute ≤ 3 % par tronçon et ≤ 5 % cumulée jusqu'à la borne.
import { CHAMPS, OPTIONS, cleOption, indexMenu, type Segment } from '@/lib/champsClickUp';
import { LIBELLE_SEGMENT, ORDRE_NATURE, FORFAIT_RIC_TUBE_APPARENT } from '@/lib/elementsModele';
import { DISTANCES, PERCEMENTS, SAISIES, alerteTroisMetres, longueurTotale, type ElementReleve } from '@/lib/releveElements';

const RHO = 0.0225;
const LIMITE_TRONCON = 3;
const LIMITE_CUMULEE = 5;
const TARIF_JAUNE_KVA = 36;
const SECTIONS = [2.5, 4, 6, 10, 16, 25, 35];
const CALIBRES = [16, 20, 25, 32, 40, 50, 63];
const SECTION_MIN: Record<number, number> = { 16: 2.5, 20: 2.5, 25: 4, 32: 6, 40: 10, 50: 10, 63: 16 };
const KW: Record<string, number> = { '3.7': 3.7, '7.4': 7.4, '11': 11, '22': 22 };
const DISPO_KVA: Record<string, number> = { '3': 3, '6': 6, '9': 9, '12': 12, '18+': 18 };

const texte = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const fr = (n: number, d = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: d });
const libelle = (cle: string, v: unknown) => {
  const t = texte(v);
  if (!t) return '';
  return SAISIES[cle]?.options?.find((o) => o.cle === t)?.libelle ?? t;
};
const typeDe = (c: ElementReleve) => c.typeCheminement || texte(c.valeurs.typeCheminement) || 'alimentation';
const kwDe = (e: ElementReleve) => (e.nature === 'priseRenforcee' ? 3.7 : KW[texte(e.valeurs.puissanceVisee)] ?? 0);

// Réserve IRVE (kVA) selon le nombre de places, barème de l'arrêté du 23/12/2020. null : moins de 10 places
export function reserveIrve(places: number): number | null {
  if (places < 10) return null;
  if (places <= 20) return 15;
  if (places <= 40) return 22;
  if (places <= 50) return 30;
  if (places <= 100) return 30 + 6 * Math.ceil((places - 50) / 10);
  if (places <= 200) return 60 + 3.6 * Math.ceil((places - 100) / 10);
  return 96 + 0.2 * (places - 200);
}

// Plafond ADVENIR infra : 12 500 € HT jusqu'à 100 places, + 125 € par place au-delà
export const plafondAdvenirInfra = (places: number) => (places <= 100 ? 12500 : 12500 + 125 * (places - 100));

type Circuit = { tri: boolean; courant: number; calibre: number; sectionMin: number };

function circuit(kw: number, tri: boolean): Circuit {
  const courant = tri ? (kw * 1000) / (Math.sqrt(3) * 400) : (kw * 1000) / 230;
  const calibre = CALIBRES.find((c) => c >= courant * 1.2) ?? 63;
  return { tri, courant, calibre, sectionMin: SECTION_MIN[calibre] ?? 16 };
}

// Chute de tension en %, cuivre, cos φ = 1
export function chute(tri: boolean, longueur: number, courant: number, section: number): number {
  const k = tri ? Math.sqrt(3) : 2;
  const u = tri ? 400 : 230;
  return ((k * RHO * longueur * courant) / section / u) * 100;
}

// Plus petite section normalisée ≥ minimum du calibre qui tient la limite de chute
function sectionPour(c: Circuit, longueur: number, limite: number): number {
  for (const s of SECTIONS) {
    if (s < c.sectionMin) continue;
    if (chute(c.tri, longueur, c.courant, s) <= limite) return s;
  }
  return SECTIONS[SECTIONS.length - 1];
}

// Puissance en aval d'un équipement (bornes et prises alimentées par les cheminements qui en partent)
function puissanceAval(id: string, els: ElementReleve[], vus = new Set<string>()): { kw: number; tri: boolean } {
  if (vus.has(id)) return { kw: 0, tri: false };
  vus.add(id);
  const e = els.find((x) => x.id === id);
  if (!e) return { kw: 0, tri: false };
  if (e.nature === 'borne' || e.nature === 'priseRenforcee') {
    const kw = kwDe(e);
    return { kw, tri: kw >= 11 };
  }
  let kw = 0;
  let tri = false;
  for (const c of els.filter((x) => x.nature === 'cheminement' && x.depart === id && x.arrivee && typeDe(x) !== 'liaisonData')) {
    const a = puissanceAval(String(c.arrivee), els, vus);
    kw += a.kw;
    tri = tri || a.tri;
  }
  return { kw, tri };
}

export type EntreeBrief = {
  scenarioNom: string;
  segment: Segment | null;
  nbPlaces: number | null;
  zone: string | null;
  elements: ElementReleve[];
};

export function genererBrief(b: EntreeBrief): { texte: string; alertes: string[] } {
  const els = b.elements;
  const seg = b.segment;
  const cop = seg === 'COP';
  const ric = seg === 'RIC';
  const alertes: string[] = [];
  const protections: string[] = [];
  const exclusions: string[] = [];
  const nomDe = (id: string | null) => (id ? els.find((e) => e.id === id)?.nom ?? '?' : '');
  const ordre = (e: ElementReleve | undefined) => ORDRE_NATURE[e?.nature ?? 'autre'];
  const cheminements = els.filter((e) => e.nature === 'cheminement')
    .sort((x, y) => ordre(els.find((e) => e.id === x.depart)) - ordre(els.find((e) => e.id === y.depart)) || x.nom.localeCompare(y.nom, 'fr', { numeric: true }));
  const equipements = els.filter((e) => e.nature !== 'cheminement')
    .sort((x, y) => ordre(x) - ordre(y) || x.nom.localeCompare(y.nom, 'fr', { numeric: true }));
  const racc = els.find((e) => e.nature === 'raccordement');
  const source = texte(racc?.valeurs.sourceRaccordement);
  const dispoCle = texte(racc?.valeurs.puissanceDispo);
  const dispo = DISPO_KVA[dispoCle] ?? null;
  const cible = texte(racc?.valeurs.raccordementCible);
  const bornes = els.filter((e) => e.nature === 'borne' || e.nature === 'priseRenforcee');
  const kwBornes = bornes.reduce((s, e) => s + kwDe(e), 0);

  // En-tête
  const quand = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });
  const entete = [
    `📋 Brief de chiffrage · ${b.scenarioNom}`,
    `Calculé par le site au clic « Prêt à chiffrer » (${quand}). Les puissances et sections sont à valider avant l'envoi du devis.`,
    '',
    `Segment : ${seg ? LIBELLE_SEGMENT[seg] : 'à renseigner'}`,
    ...(cop || b.nbPlaces ? [`Places de parking : ${b.nbPlaces ?? 'à renseigner'}`] : []),
    `Zone de déplacement : ${b.zone ?? 'à renseigner'}`,
  ];
  if (!b.zone) alertes.push('Zone de déplacement non renseignée (scénario et fiche)');

  // Puissance
  const puissance: string[] = ['', '⚡ PUISSANCE'];
  if (racc) {
    puissance.push(`Source : ${libelle('sourceRaccordement', source) || 'à renseigner'} · ${libelle('typeRaccordement', racc.valeurs.typeRaccordement) || 'mono ou tri à renseigner'}${dispo !== null ? ` · puissance dispo ${libelle('puissanceDispo', dispoCle)}` : ''}`);
    if (cible && cible !== 'inchange') puissance.push(`Raccordement cible : ${libelle('raccordementCible', cible)}`);
  }
  if (bornes.length) puissance.push(`Points de charge : ${bornes.length}, ${fr(kwBornes)} kW au total`);
  let demandee: number | null = null;
  if (cop) {
    const r = b.nbPlaces ? reserveIrve(b.nbPlaces) : null;
    if (r === null) puissance.push(`Réserve IRVE : ${b.nbPlaces ? 'moins de 10 places, hors barème' : 'nombre de places à renseigner'}`);
    else {
      puissance.push(`Réserve IRVE (barème de l'arrêté du 23/12/2020) : ${fr(r)} kVA pour ${b.nbPlaces} places`);
      if (source === 'pdlDedie') {
        demandee = r;
        puissance.push(`Puissance à demander à Enedis (PDL dédié) : ${fr(r)} kVA, à valider`);
      } else if (source === 'tgbtServicesGeneraux') {
        if (dispo !== null) {
          demandee = dispo + r;
          puissance.push(`Puissance cible du PDL services généraux : ${fr(dispo)} kVA (abonnement actuel) + ${fr(r)} kVA = ${fr(demandee)} kVA, à valider (abonnement souscrit ≠ consommation réelle)`);
        } else puissance.push('Puissance cible du PDL services généraux : abonnement actuel à renseigner, + réserve IRVE');
      }
    }
    if (b.nbPlaces && b.nbPlaces >= 10) {
      puissance.push(`ADVENIR infra : 50 % plafonné à ${fr(plafondAdvenirInfra(b.nbPlaces), 0)} € HT. Éligibilité selon la date du permis (avant 2017 : complète ; 2017 → 10/03/2021 : réduite ; après : non éligible), à vérifier`);
    }
    puissance.push('TD IRVE : protection 63 A');
  } else if (ric) {
    puissance.push("Raccordement sur l'infra collective CHARGéO : pas de puissance à demander");
  } else if (source === 'pdlDedie') {
    demandee = kwBornes;
    puissance.push(`Puissance à demander à Enedis (PDL dédié) : ${fr(kwBornes)} kVA (somme des puissances visées), à valider`);
  } else if (dispo !== null && dispoCle !== '18+' && kwBornes > dispo) {
    alertes.push(`Points de charge (${fr(kwBornes)} kW) au-dessus de la puissance dispo (${fr(dispo)} kVA) : gestion de charge ou augmentation de puissance à prévoir`);
  }
  if (demandee !== null && demandee > TARIF_JAUNE_KVA) {
    alertes.push(`> ${TARIF_JAUNE_KVA} kVA (${fr(demandee)} kVA) : tarif jaune, étude spécifique, chiffrage à la main`);
  }
  if (source === 'pdlDedie' || cible === 'passageTri' || cible === 'augmentation' || (cop && demandee !== null && dispo !== null && demandee > dispo)) {
    exclusions.push("Exclusion Enedis : génie civil et travaux Enedis (création ou modification du branchement) non compris, ligne d'exclusion au devis");
  }

  // Équipements
  const materiel: string[] = ['', '🧰 ÉQUIPEMENTS'];
  for (const e of equipements) {
    const v = (k: string) => libelle(k, e.valeurs[k]);
    let d: string[] = [];
    switch (e.nature) {
      case 'raccordement':
        d = [v('sourceRaccordement'), v('typeRaccordement'), v('puissanceDispo'), v('etatTableau') && `tableau ${v('etatTableau')}`,
          v('raccordementCible') && `cible ${v('raccordementCible')}`, e.valeurs.terre !== null && e.valeurs.terre !== undefined ? `terre ${fr(Number(e.valeurs.terre))} Ω` : ''];
        break;
      case 'tdIrveCoffret':
        d = [v('coffretIrve'), v('gestionCharge') && `gestion de charge : ${v('gestionCharge')}`, v('mesurePuissance') && `mesure : ${v('mesurePuissance')}`,
          v('emplacement') && `emplacement : ${v('emplacement')}`];
        break;
      case 'borne':
        d = [v('puissanceVisee'), v('marqueBorne'), v('supportBorne')];
        break;
      case 'priseRenforcee':
        d = ['3,7 kW', v('marqueBorne'), v('supportBorne')];
        break;
      case 'communication':
        d = [v('connectivite'), v('reseau') && `réseau : ${v('reseau')}`, v('tailleHub')];
        break;
      case 'boiteDerivation':
        d = ['borniers + switch, 4 PDC'];
        break;
      case 'autre':
        d = [e.valeurs.quantite ? `quantité ${fr(Number(e.valeurs.quantite))}` : ''];
        break;
      default:
        d = [];
    }
    materiel.push(`• ${e.nom} : ${d.filter(Boolean).join(' · ') || 'rien de saisi'}`);
  }

  // Cheminements : longueurs, sections, chutes de tension
  const chemins: string[] = ['', '🛤️ CHEMINEMENTS'];
  const totaux: Record<string, Record<string, number>> = { alimentation: {}, artere: {}, liaisonData: {} };
  const percements: Record<string, number> = {};
  const chutes = new Map<string, number>();
  for (const c of cheminements) {
    const type = typeDe(c);
    const long = longueurTotale(c.valeurs);
    const modes: string[] = [];
    for (const k of DISTANCES) {
      const m = Number(c.valeurs[k]) || 0;
      if (m <= 0) continue;
      modes.push(`${SAISIES[k].libelle.replace(' (m)', '').toLowerCase()} ${fr(m)} m`);
      totaux[type] = totaux[type] || {};
      totaux[type][k] = (totaux[type][k] || 0) + m;
    }
    const percs: string[] = [];
    for (const k of PERCEMENTS) {
      const n = Number(c.valeurs[k]) || 0;
      if (n <= 0) continue;
      percs.push(`${SAISIES[k].libelle.replace('Percements ', '')} × ${fr(n, 0)}`);
      percements[k] = (percements[k] || 0) + n;
    }
    const forcee = Number(texte(c.valeurs.sectionForcee).replace(',', '.')) || null;
    let section = '';
    if (type === 'liaisonData') {
      section = 'câble data';
    } else if (type === 'artere') {
      const calcule = chute(true, long, 63, 16) <= LIMITE_TRONCON ? 16 : 25;
      const s = forcee ?? calcule;
      const du = chute(true, long, 63, s);
      chutes.set(c.id, du);
      section = `${fr(s)} mm²${forcee ? ` (forcée, calcul : ${calcule} mm²)` : ''}, 63 A tri, chute ${fr(du, 2)} %`;
      if (du > LIMITE_TRONCON) alertes.push(`${c.nom} : chute de ${fr(du, 2)} % en ${fr(s)} mm², au-dessus de ${LIMITE_TRONCON} %`);
    } else {
      const dep = els.find((e) => e.id === c.depart);
      const arr = els.find((e) => e.id === c.arrivee);
      if (ric && dep?.nature === 'raccordement') {
        section = forcee ? `${fr(forcee)} mm² (forcée)` : "section de l'artère de l'infra (16 ou 25 mm², voir le brief de l'infra)";
      } else {
        const ci: Circuit | null = cop && arr?.nature === 'tdIrveCoffret'
          ? { tri: true, courant: 63, calibre: 63, sectionMin: 16 }
          : (() => { const a = c.arrivee ? puissanceAval(String(c.arrivee), els) : { kw: 0, tri: false }; return a.kw > 0 ? circuit(a.kw, a.tri) : null; })();
        if (!ci) section = 'puissance en aval inconnue, section non calculée';
        else if (long <= 0) section = `longueur à renseigner (minimum ${fr(ci.sectionMin)} mm² pour ${ci.calibre} A)`;
        else {
          const calcule = sectionPour(ci, long, LIMITE_TRONCON);
          const s = forcee ?? calcule;
          const du = chute(ci.tri, long, ci.courant, s);
          chutes.set(c.id, du);
          section = `${fr(s)} mm²${forcee ? ` (forcée, calcul : ${fr(calcule)} mm²)` : ''}, ${ci.tri ? 'tri' : 'mono'} ${fr(ci.courant)} A, protection ${ci.calibre} A, chute ${fr(du, 2)} %`;
          if (forcee && forcee < ci.sectionMin) alertes.push(`${c.nom} : section forcée ${fr(forcee)} mm² sous le minimum de ${fr(ci.sectionMin)} mm² pour ${ci.calibre} A`);
          if (du > LIMITE_TRONCON) alertes.push(`${c.nom} : chute de ${fr(du, 2)} % en ${fr(s)} mm², au-dessus de ${LIMITE_TRONCON} %`);
        }
      }
    }
    chemins.push(`• ${c.nom} (${libelle('typeCheminement', type) || type}) : ${long > 0 ? `${fr(long)} m` : 'longueur à renseigner'}${modes.length ? ` (${modes.join(', ')})` : ''}`);
    if (section) chemins.push(`  Section : ${section}`);
    if (percs.length) chemins.push(`  Percements : ${percs.join(', ')}`);
    if (ric && type !== 'liaisonData') {
      const tube = Number(c.valeurs.distTubeApparent) || 0;
      const forfait = tube <= FORFAIT_RIC_TUBE_APPARENT && long - tube <= 0;
      chemins.push(`  Forfait RIC : ${forfait ? `dans le forfait (${FORFAIT_RIC_TUBE_APPARENT} m de tube apparent)` : `dépassement (${fr(long)} m) : devis détaillé, pas de supplément au mètre`}`);
    }
    if (alerteTroisMetres(c, els, seg)) {
      protections.push(`Protection en tête : ${nomDe(c.depart)} → ${nomDe(c.arrivee)} fait ${fr(long)} m (plus de 3 m)`);
    }
  }
  if (!cheminements.length) chemins.push('Aucun cheminement');

  // Chute cumulée de l'origine jusqu'à chaque point de charge
  for (const bo of bornes) {
    let total = 0;
    let manque = false;
    let id: string | null = bo.id;
    const vus = new Set<string>();
    while (id && !vus.has(id)) {
      vus.add(id);
      const cour: string = id;
      const amont = cheminements.find((c) => c.arrivee === cour && typeDe(c) !== 'liaisonData');
      if (!amont) break;
      const du = chutes.get(amont.id);
      if (du === undefined) manque = true; else total += du;
      id = amont.depart;
    }
    if (total > 0) chemins.push(`Chute cumulée jusqu'à ${bo.nom} : ${fr(total, 2)} %${manque ? ' (un tronçon sans calcul)' : ''}`);
    if (total > LIMITE_CUMULEE) alertes.push(`Chute cumulée de ${fr(total, 2)} % jusqu'à ${bo.nom}, au-dessus de ${LIMITE_CUMULEE} % : augmenter une section`);
  }

  // Totaux par mode de pose et percements
  const recap: string[] = ['', '📏 TOTAUX PAR MODE DE POSE'];
  for (const type of ['alimentation', 'artere', 'liaisonData']) {
    const t = totaux[type] || {};
    const lignes = DISTANCES.filter((k) => (t[k] || 0) > 0).map((k) => `${SAISIES[k].libelle.replace(' (m)', '').toLowerCase()} ${fr(t[k])} m`);
    if (!lignes.length) continue;
    const somme = Object.values(t).reduce((s, m) => s + m, 0);
    recap.push(`• ${libelle('typeCheminement', type)} : ${lignes.join(', ')} (total ${fr(somme)} m)`);
  }
  if (recap.length === 2) recap.push('Aucune longueur saisie');
  const totalPercs = PERCEMENTS.filter((k) => (percements[k] || 0) > 0).map((k) => `${SAISIES[k].libelle.replace('Percements ', '')} × ${fr(percements[k], 0)}`);
  recap.push(`Percements : ${totalPercs.length ? totalPercs.join(', ') : 'aucun'}`);

  // Protection, exclusions, alertes, notes
  const fin: string[] = ['', '🛡️ PROTECTION ET EXCLUSIONS'];
  fin.push(...protections, ...exclusions);
  if (!protections.length && !cop && !ric && racc) fin.push('Pas de protection en tête (Raccordement → coffret de 3 m ou moins)');
  if (fin.length === 2) fin.push('Rien à signaler');
  fin.push('', '⚠️ ALERTES', ...(alertes.length ? alertes.map((a) => `• ${a}`) : ['Aucune']));
  const notes = els.filter((e) => texte(e.valeurs.notesCheminement).trim()).map((e) => `• ${e.nom} : ${texte(e.valeurs.notesCheminement).trim()}`);
  if (notes.length) fin.push('', '📝 NOTES DU RELEVÉ', ...notes);
  fin.push('', `Hypothèses : cuivre 0,0225 Ω·mm²/m, cos φ = 1, 230 V mono / 400 V tri, protection = calibre ≥ 1,2 × courant, chute ≤ ${LIMITE_TRONCON} % par tronçon et ≤ ${LIMITE_CUMULEE} % cumulée.`);

  return { texte: [...entete, ...puissance, ...materiel, ...chemins, ...recap, ...fin].join('\n'), alertes };
}

// Calcule le brief d'un scénario et le poste en commentaire sur le scénario (places et zone : scénario, sinon fiche)
export async function posterBrief(token: string, scenario: any, elements: ElementReleve[]): Promise<{ ok: boolean; alertes: number }> {
  const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c?.id === id);
  let fiche: any = null;
  if (scenario?.parent) {
    const r = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(String(scenario.parent))}`, { headers: { Authorization: token }, cache: 'no-store' });
    if (r.ok) fiche = await r.json().catch(() => null);
  }
  const places = (t: any): number | null => {
    const v = Number(champ(t, CHAMPS.nbPlacesParking)?.value);
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const zone = (t: any): string | null => (t ? ((cleOption(OPTIONS.zoneDeplacement, indexMenu(t, CHAMPS.zoneDeplacement)) as string | null) ?? null) : null);
  const segment = cleOption(OPTIONS.segment, indexMenu(scenario, CHAMPS.segment)) as Segment | null;
  const brief = genererBrief({
    scenarioNom: String(scenario?.name || ''),
    segment,
    nbPlaces: places(scenario) ?? places(fiche),
    zone: zone(scenario) ?? zone(fiche),
    elements,
  });
  const res = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(String(scenario.id))}/comment`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment_text: brief.texte, notify_all: false }),
  });
  if (!res.ok) console.error(`Brief de chiffrage refusé (${res.status}) sur ${scenario?.id}`, await res.text().catch(() => ''));
  return { ok: res.ok, alertes: brief.alertes.length };
}
