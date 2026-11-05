"use client";

// Éléments d'un scénario dans l'outil terrain (étapes 3 et 4 du plan du 15/10/2026, PR #51).
// Étape 3 : éléments créés d'office selon le segment, noms automatiques, archiver et restaurer en cascade, dupliquer
// (branche, borne seule, scénario), droits par rôle contrôlés côté serveur.
// Étape 4 : relevé élément par élément (matrice src/lib/releveElements.ts), photos par élément, brouillon gardé sur le
// téléphone (hors ligne), alerte orange au-delà de 3 m, coffret suggéré, bouton « Prêt à chiffrer »,
// confirmations et renommages dans la page (plus de fenêtres du navigateur, plus sûr sur téléphone).
// Le bloc 📇 Contact est dans src/components/ui/BlocContact.tsx (l'ancienne version de ce fichier a été retirée le 16/10).
// 18/10/2026, 11 h 43 (Matthieu : « quand je retrouve le réseau, il faut que je retourne ouvrir chaque élément pour
// l'enregistrer. Est-ce qu'on ne peut pas faire un bouton enregistrer tous les éléments ? ») : carte « Relevés à
// envoyer » dès qu'un élément a une saisie ou des photos gardées sur le téléphone, avec « Enregistrer tous les
// éléments » : même envoi que le bouton de chaque élément (envoyerReleve), élément par élément ; ce qui échoue reste
// sur le téléphone. Recompté à chaque saisie, au retour du réseau et au retour sur la page.
// 01/11/2026 (Phase 8, étape 4) : menus réduits à ce qui a un ouvrage (optionsVisibles : bornes, prises, TD IRVE en
// PAR/FLT/TER, Colonne Enedis en RIC, 35 mm² masqué en mono), cases à cocher (passage en façade), choix d'un TD IRVE
// = gestionnaire de grappe posé d'office, élément « Dépose d'une borne existante » dans « Ajouter un élément ».
// 01/11/2026, 20 h 50 (Mathieu : « quand je clique sur Prêt à chiffrer, ça ne fait rien ») : la réponse s'affichait en
// haut de la page, hors de vue ; elle s'affiche maintenant sous le bouton, et l'écran y descend.
// 03/11/2026 (passe 2 de la recette, idées et écarts de Mathieu) :
// - « Dupliquer le scénario » demande « Recopier les distances ? » (Oui / Non, je remesure, écart 38) ;
// - le brief de chiffrage s'affiche dans l'appli, sous « Prêt à chiffrer » (écart 24) ;
// - bouton « Relevé de la fiche » pour revenir à la liste des scénarios (écart 76) ;
// - RIC : 🏢 Type Client demandé au relevé s'il est vide sur la fiche (écart 69) ;
// - places de la COP préremplies avec celles du site (écart 44) ; la borne s'affiche avant le coffret (écart 29).
// 05/11/2026 (passe 3, cas 4, choix de Mathieu à 6 h 44) : un brouillon resté sur le téléphone depuis le 03/11 avait
// écrasé la source du raccordement. Le brouillon garde sa date (le) et les valeurs de la fiche au moment où il a commencé
// (base). Si la fiche a changé depuis, ou si le brouillon n'a pas de repère (fait avant ce jour), il ne part plus tout
// seul : carte « Brouillons plus anciens que la fiche », avec sa date, « Envoyer quand même » ou « Le jeter » ; l'élément
// ouvert montre la fiche, avec « Reprendre le brouillon » ou « Le jeter ». « Prêt à chiffrer » attend que les relevés
// gardés sur le téléphone soient envoyés ou jetés (le brief du cas 4 avait été calculé sans le brouillon).
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle, Archive, ArrowLeft, Camera, ChevronDown, ChevronUp, Copy, FileText, GitBranch, Layers,
  Pencil, Plus, RotateCcw, Send, UserCheck, X,
} from 'lucide-react';
import { Carte, TitreCarte, Alerte, BoutonPrincipal, Repere, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, LABEL, NAVY } from '@/components/charte/couleurs';
import { LIBELLE_NATURE_LONG, LIBELLE_SEGMENT, ORDRE_NATURE, SEGMENTS_BORNE, specsParDefaut, type Materiel } from '@/lib/elementsModele';
import {
  DISTANCES, PERCEMENTS, SAISIES, alerteTroisMetres, champsVisibles, coffretSuggere, contexteReleve, estCoffretTd, longueurTotale, manquants, optionsVisibles,
  type ContexteReleve, type ElementReleve,
} from '@/lib/releveElements';
import type { Nature, Segment } from '@/lib/champsClickUp';
import { adresses } from '@/lib/adresses';

type El = ElementReleve & { archive: boolean; photos: number };

type Donnees = {
  scenario: { id: string; nom: string; statut: string; segment: Segment | null; lienDevis: boolean; projetId: string };
  site?: { places: number | null; typeClient: string | null };
  elements: El[];
  archives: El[];
  droits: { scenarios: boolean; elements: boolean };
};

// autre : deuxième choix (ex. « Non, je remesure »), en plus d'Annuler
type Demande = { texte: string; libelle: string; action: () => Promise<void>; autre?: { libelle: string; action: () => Promise<void> } };
type Renommage = { id: string; valeur: string; type: 'element' | 'scenario' };
type Photo = { id: string; data: string };

const URL_ELEMENTS = '/api/interne/elements';
const URL_SCENARIO = '/api/interne/scenario';
const SEGMENTS = Object.keys(LIBELLE_SEGMENT) as Segment[];
const estSegment = (s: string): s is Segment => (SEGMENTS as string[]).includes(s);
const NATURES_AJOUT: Nature[] = ['borne', 'priseRenforcee', 'cheminement', 'tdIrveCoffret', 'raccordement', 'communication', 'autre', 'boiteDerivation'];
// Choix « Ajouter un élément » : les natures, plus la dépose (élément « Autre » nommé d'office, photos et notes)
type ChoixAjout = Nature | 'depose';
const LIBELLE_DEPOSE = "Dépose d'une borne existante";
const TYPES_CHEMINEMENT: { cle: string; libelle: string }[] = [
  { cle: 'alimentation', libelle: 'Alimentation' },
  { cle: 'artere', libelle: 'Artère' },
  { cle: 'liaisonData', libelle: 'Liaison data' },
];
const TYPES_CLIENT: { cle: string; libelle: string }[] = [
  { cle: 'particulier', libelle: 'Particulier (vrai devis résident)' },
  { cle: 'syndic', libelle: 'Syndic (tarif type)' },
  { cle: 'pro', libelle: 'Pro (tarif type)' },
];
const libelleType = (cle: string | null) => TYPES_CHEMINEMENT.find((t) => t.cle === cle)?.libelle || '';
const libelleScenario = (nom: string) => nom.replace(/^.*?Sc[ée]nario\s+[A-Za-z0-9]+\s*:\s*/, '').trim();

// ---- Photos d'un élément : gardées sur le téléphone (même base que le relevé actuel) jusqu'à leur envoi ----
const nouvelId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function ouvrirBase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('MetrePhotosDB', 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('photos')) r.result.createObjectStore('photos'); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function lirePhotos(id: string): Promise<Photo[]> {
  try {
    const db = await ouvrirBase();
    return await new Promise((resolve) => {
      const req = db.transaction('photos', 'readonly').objectStore('photos').get(`${id}_element`);
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
}
async function ecrirePhotos(id: string, liste: Photo[]) {
  try {
    const db = await ouvrirBase();
    db.transaction('photos', 'readwrite').objectStore('photos').put(liste, `${id}_element`);
  } catch { /* sans gravité */ }
}
function compresser(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (ev) => {
      const img = new Image();
      img.src = ev.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > 2500) { h = Math.round((h * 2500) / w); w = 2500; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
    };
  });
}
function versBlob(dataurl: string): Blob {
  const [entete, corps] = dataurl.split(',');
  const mime = entete.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bin = atob(corps);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}
const cleEnvoyees = (id: string) => `elementPhotosEnvoyees_${id}`;
function lireEnvoyees(id: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(cleEnvoyees(id)) || '[]')); } catch { return new Set(); }
}

// ---- Saisie gardée sur le téléphone (brouillon) et envoi d'un élément ----
const cleBrouillonDe = (id: string) => `elementReleve_${id}`;
function lireBrouillon(id: string): any {
  try { return JSON.parse(localStorage.getItem(cleBrouillonDe(id)) || 'null'); } catch { return null; }
}
function valeursServeur(e: El): Record<string, string> {
  const v: Record<string, string> = {};
  for (const [k, val] of Object.entries(e.valeurs)) v[k] = val === null || val === undefined ? '' : String(val);
  return v;
}
// Brouillon plus ancien que la fiche (05/11) : la fiche a changé depuis le début du brouillon, ou le brouillon n'a pas
// de repère (fait avant le 05/11). Il ne part alors plus tout seul.
function brouillonPerime(e: El): boolean {
  const b = lireBrouillon(e.id);
  if (!b) return false;
  if (!b.base || typeof b.base !== 'object') return true;
  const serveur = valeursServeur(e);
  const cles = new Set([...Object.keys(b.base), ...Object.keys(serveur)]);
  for (const k of Array.from(cles)) if (String(b.base[k] ?? '') !== String(serveur[k] ?? '')) return true;
  if (e.nature === 'cheminement' && (String(b.baseDepart ?? '') !== (e.depart || '') || String(b.baseArrivee ?? '') !== (e.arrivee || ''))) return true;
  return false;
}
function dateBrouillon(id: string): string {
  const le = lireBrouillon(id)?.le;
  return le ? new Date(le).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'date inconnue';
}
function jeterBrouillon(id: string) {
  try { localStorage.removeItem(cleBrouillonDe(id)); } catch { /* sans gravité */ }
}

async function poster(url: string, corps: any): Promise<{ ok: boolean; j: any }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    const j = await res.json().catch(() => ({}));
    return { ok: res.ok && !!j?.success, j };
  } catch {
    return { ok: false, j: { error: "Pas de réseau : rien n'a été modifié" } };
  }
}

// Envoi du relevé d'un élément : valeurs visibles et liens du cheminement, puis photos pas encore reçues, une par une.
// La saisie et les photos ne sont effacées du téléphone que si tout est parti.
async function envoyerReleve(e: El, v: Record<string, string>, dep: string, arr: string, ctx: ContexteReleve, photos: Photo[]): Promise<{ ok: boolean; j: any; echecs: number }> {
  const visibles = champsVisibles(e.nature, v, ctx);
  const valeurs: Record<string, string> = {};
  for (const k of visibles) valeurs[k] = v[k] ?? '';
  const corps: any = { action: 'releve', id: e.id, valeurs };
  if (e.nature === 'cheminement') corps.liens = { depart: dep || null, arrivee: arr || null };
  const { ok, j } = await poster(URL_ELEMENTS, corps);
  if (!ok) return { ok: false, j, echecs: 0 };
  const envoyees = lireEnvoyees(e.id);
  let echecs = 0;
  for (const ph of photos) {
    if (envoyees.has(ph.id)) continue;
    const fd = new FormData();
    fd.append('taskId', e.id);
    fd.append('photo', versBlob(ph.data), `${e.nom.replace(/[^\w-]+/g, '_')}_${ph.id.slice(0, 8)}.jpg`);
    try {
      const r = await fetch('/api/metre/photo', { method: 'POST', body: fd });
      if (r.ok) { envoyees.add(ph.id); localStorage.setItem(cleEnvoyees(e.id), JSON.stringify(Array.from(envoyees))); } else echecs++;
    } catch { echecs++; }
  }
  if (!echecs) {
    try { localStorage.removeItem(cleBrouillonDe(e.id)); localStorage.removeItem(cleEnvoyees(e.id)); } catch { /* sans gravité */ }
    await ecrirePhotos(e.id, []);
  }
  return { ok: true, j, echecs };
}

// ---- Briques ----
function PetitBouton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold ring-[1.5px] ring-[#dfe3e8] disabled:opacity-50"
      style={{ color: LABEL }}
    >
      {children}
    </button>
  );
}

function Choix({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold ring-[1.5px] ${actif ? 'bg-[#0097b2] text-white ring-[#0097b2]' : 'bg-white ring-[#dfe3e8]'}`}
      style={actif ? undefined : { color: LABEL }}
    >
      {children}
    </button>
  );
}

function Ligne({ titre, sousTitre, children, apres }: { titre: string; sousTitre: ReactNode; children?: ReactNode; apres?: ReactNode }) {
  return (
    <div className="rounded-[18px] bg-white p-4 ring-[1.5px] ring-[#eceef1]">
      <p className="text-[16px] font-bold leading-tight">{titre}</p>
      <div className="mt-1 text-[13px]">{sousTitre}</div>
      {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
      {apres}
    </div>
  );
}

// ---- Relevé d'un élément ----
function FormulaireElement({
  e, elements, ctx, peut, onEnregistre, onBrouillon,
}: { e: El; elements: El[]; ctx: ContexteReleve; peut: boolean; onEnregistre: (j: any) => Promise<void>; onBrouillon: () => void }) {
  const cleBrouillon = cleBrouillonDe(e.id);
  // Brouillon plus ancien que la fiche (05/11) : la fiche s'affiche, le brouillon attend la décision
  const [perime, setPerime] = useState<boolean>(() => brouillonPerime(e));
  const [v, setV] = useState<Record<string, string>>(() => (perime ? valeursServeur(e) : { ...valeursServeur(e), ...(lireBrouillon(e.id)?.v || {}) }));
  const [dep, setDep] = useState<string>(() => (perime ? (e.depart || '') : lireBrouillon(e.id)?.depart ?? (e.depart || '')));
  const [arr, setArr] = useState<string>(() => (perime ? (e.arrivee || '') : lireBrouillon(e.id)?.arrivee ?? (e.arrivee || '')));
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => { lirePhotos(e.id).then(setPhotos); }, [e.id]);

  // Le brouillon garde sa date et les valeurs de la fiche au moment où il a commencé (base). Une saisie sur un brouillon
  // périmé repart de la fiche affichée : l'ancien brouillon est remplacé.
  const garder = (nv: Record<string, string>, nd: string, na: string) => {
    const avant = lireBrouillon(e.id);
    const reprendBase = !perime && avant?.base && typeof avant.base === 'object';
    try {
      localStorage.setItem(cleBrouillon, JSON.stringify({
        v: nv, depart: nd, arrivee: na, le: Date.now(),
        base: reprendBase ? avant.base : valeursServeur(e),
        baseDepart: reprendBase ? avant.baseDepart : (e.depart || ''),
        baseArrivee: reprendBase ? avant.baseArrivee : (e.arrivee || ''),
      }));
    } catch { /* sans gravité */ }
    if (perime) setPerime(false);
    onBrouillon();
  };
  const changer = (k: string, val: string) => {
    const n = { ...v, [k]: val };
    // TD IRVE (PAR, FLT, TER) : gestionnaire de grappe posé d'office (D15) ; la connectivité « intégrée au TD IRVE »
    // est posée par le serveur sur l'élément Communication à l'enregistrement
    if (k === 'coffretIrve' && estCoffretTd(val)) n.gestionCharge = 'gestionnaireGrappe';
    setV(n);
    garder(n, dep, arr);
  };
  // Brouillon périmé : le reprendre (il devient le brouillon en cours, sur la fiche d'aujourd'hui) ou le jeter
  const reprendre = () => {
    const b = lireBrouillon(e.id);
    const nv = { ...valeursServeur(e), ...(b?.v || {}) };
    const nd = b?.depart ?? (e.depart || '');
    const na = b?.arrivee ?? (e.arrivee || '');
    setPerime(false);
    setV(nv);
    setDep(nd);
    setArr(na);
    try {
      localStorage.setItem(cleBrouillon, JSON.stringify({
        v: nv, depart: nd, arrivee: na, le: Date.now(), base: valeursServeur(e), baseDepart: e.depart || '', baseArrivee: e.arrivee || '',
      }));
    } catch { /* sans gravité */ }
    onBrouillon();
  };
  const jeter = () => {
    jeterBrouillon(e.id);
    setPerime(false);
    onBrouillon();
  };

  const visibles = champsVisibles(e.nature, v, ctx);
  const distances = visibles.filter((k) => DISTANCES.includes(k));
  const percements = visibles.filter((k) => PERCEMENTS.includes(k));
  const autres = visibles.filter((k) => !DISTANCES.includes(k) && !PERCEMENTS.includes(k) && k !== 'notesCheminement');
  const equipements = elements.filter((x) => x.nature !== 'cheminement' && x.id !== e.id);
  const troisMetres = alerteTroisMetres(e, elements, ctx.segment, v, dep || null, arr || null);
  // Liaison data : la longueur vient de l'alimentation du même tronçon quand il y en a une (écart 48)
  const alimJumelle = e.nature === 'cheminement' && v.typeCheminement === 'liaisonData' && dep && arr
    ? elements.find((c) => c.nature === 'cheminement' && (c.typeCheminement || 'alimentation') === 'alimentation' && c.depart === dep && c.arrivee === arr)
    : undefined;
  const borneDuCoffret = e.nature === 'tdIrveCoffret'
    ? elements.find((b) => (b.nature === 'borne' || b.nature === 'priseRenforcee')
      && elements.some((c) => c.nature === 'cheminement' && c.depart === e.id && c.arrivee === b.id))
    : undefined;
  const suggestion = e.nature === 'tdIrveCoffret' && ctx.segment !== 'COP' && !v.coffretIrve
    ? coffretSuggere(borneDuCoffret?.valeurs.puissanceVisee, v.mesurePuissance)
    : null;

  const champ = (k: string) => {
    const s = SAISIES[k];
    if (!s) return null;
    const id = `${k}-${e.id}`;
    if (s.type === 'menu') {
      return (
        <div key={k} className="space-y-2">
          <label className={ETIQUETTE} htmlFor={id}>{s.libelle}</label>
          <select id={id} className={CHAMP} value={v[k] || ''} onChange={(ev) => changer(k, ev.target.value)} disabled={!peut}>
            <option value="">À préciser</option>
            {optionsVisibles(k, v, ctx, e.nature).map((o) => <option key={o.cle} value={o.cle}>{o.libelle}</option>)}
          </select>
        </div>
      );
    }
    if (s.type === 'case') {
      return (
        <label key={k} htmlFor={id} className="flex items-center gap-3 text-[15px] font-semibold" style={{ color: LABEL }}>
          <input id={id} type="checkbox" className="h-5 w-5 accent-[#0097b2]" checked={v[k] === 'oui'} onChange={(ev) => changer(k, ev.target.checked ? 'oui' : '')} disabled={!peut} />
          {s.libelle}
        </label>
      );
    }
    if (s.type === 'nombre') {
      return (
        <div key={k} className="space-y-2">
          <label className={ETIQUETTE} htmlFor={id}>{s.libelle}</label>
          <input id={id} type="number" inputMode="decimal" step="0.1" min={0} className={CHAMP} value={v[k] || ''} placeholder="–" onChange={(ev) => changer(k, ev.target.value)} disabled={!peut} />
        </div>
      );
    }
    return (
      <div key={k} className="space-y-2">
        <label className={ETIQUETTE} htmlFor={id}>{s.libelle}</label>
        <textarea id={id} rows={3} className={`${CHAMP} resize-none`} value={v[k] || ''} onChange={(ev) => changer(k, ev.target.value)} disabled={!peut} />
      </div>
    );
  };

  const ajouterPhotos = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const fichiers = Array.from(ev.target.files || []);
    ev.target.value = '';
    if (!fichiers.length) return;
    const nouvelles: Photo[] = [];
    for (const f of fichiers) nouvelles.push({ id: nouvelId(), data: await compresser(f) });
    const liste = [...photos, ...nouvelles];
    setPhotos(liste);
    await ecrirePhotos(e.id, liste);
    onBrouillon();
  };
  const retirerPhoto = async (i: number) => {
    const liste = photos.filter((_, n) => n !== i);
    setPhotos(liste);
    await ecrirePhotos(e.id, liste);
    onBrouillon();
  };

  const enregistrer = async () => {
    setEnvoi(true);
    setErreur('');
    const r = await envoyerReleve(e, v, dep, arr, ctx, photos);
    if (!r.ok) {
      setErreur(r.j?.error ? `${r.j.error}. Ta saisie est gardée sur le téléphone.` : "Relevé non enregistré. Ta saisie est gardée sur le téléphone, réessaie avec du réseau.");
      setEnvoi(false);
      return;
    }
    if (r.echecs) {
      setErreur(`Relevé enregistré, mais ${r.echecs} photo${r.echecs > 1 ? 's' : ''} non envoyée${r.echecs > 1 ? 's' : ''}. Réessaie avec du réseau : seules les photos manquantes partiront.`);
    } else {
      setPhotos([]);
    }
    setPerime(false);
    setEnvoi(false);
    await onEnregistre(r.j);
  };

  return (
    <div className="mt-4 space-y-4 border-t-[1.5px] border-[#eceef1] pt-4">
      {perime && (
        <div className="space-y-3 rounded-[14px] bg-white p-4 text-[14px] leading-relaxed ring-[1.5px] ring-[#FF6B00]">
          <p className="font-semibold">
            Un brouillon du {dateBrouillon(e.id)} attend sur ce téléphone, mais la fiche a changé depuis. Ci-dessous : ce qui est enregistré sur la fiche.
          </p>
          {peut && (
            <div className="flex flex-wrap gap-2">
              <PetitBouton onClick={reprendre}>Reprendre le brouillon</PetitBouton>
              <PetitBouton onClick={jeter}><X size={14} /> Le jeter</PetitBouton>
            </div>
          )}
        </div>
      )}

      {e.nature === 'cheminement' && (
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label className={ETIQUETTE} htmlFor={`dep-${e.id}`}>🔌 Départ</label>
            <select id={`dep-${e.id}`} className={CHAMP} value={dep} disabled={!peut} onChange={(ev) => { setDep(ev.target.value); garder(v, ev.target.value, arr); }}>
              <option value="">À choisir</option>
              {equipements.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className={ETIQUETTE} htmlFor={`arr-${e.id}`}>🏁 Arrivée</label>
            <select id={`arr-${e.id}`} className={CHAMP} value={arr} disabled={!peut} onChange={(ev) => { setArr(ev.target.value); garder(v, dep, ev.target.value); }}>
              <option value="">{v.typeCheminement === 'artere' ? "Fin d'artère" : 'À choisir'}</option>
              {equipements.filter((x) => x.id !== dep).map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
            </select>
          </div>
        </div>
      )}

      {e.nature === 'priseRenforcee' && <p className="text-[14px]"><strong>Puissance :</strong> 3,7 kW (verrouillée pour une prise renforcée).</p>}

      {autres.map(champ)}

      {suggestion && peut && (
        <div className="flex flex-wrap items-center gap-2 text-[14px]">
          <span>Suggéré d'après {borneDuCoffret?.nom} : <strong>{suggestion}</strong></span>
          <PetitBouton onClick={() => changer('coffretIrve', suggestion)}>Mettre {suggestion}</PetitBouton>
        </div>
      )}

      {distances.length > 0 && (
        <div className="space-y-3">
          <p className={ETIQUETTE}>Distances (total : {longueurTotale(v).toLocaleString('fr-FR')} m)</p>
          {ctx.segment === 'RIC' && ctx.source !== 'colonneEnedis' && (
            <p className="ml-1 text-[13px] leading-relaxed">Forfait RIC : 5 m de tube apparent préremplis. Si c’est plus long, mets la longueur réelle.</p>
          )}
          {alimJumelle && (
            <p className="ml-1 text-[13px] leading-relaxed">Recopiées de {alimJumelle.nom} à chaque enregistrement de l’alimentation : tu n’as rien à saisir.</p>
          )}
          <p className="ml-1 text-[13px] leading-relaxed">Laisse vide si non mesuré. Saisis 0 pour « aucun ».</p>
          <div className="grid grid-cols-2 gap-4">{distances.map(champ)}</div>
        </div>
      )}

      {troisMetres && (
        <div className="flex gap-3 rounded-[14px] bg-white p-4 text-[14px] font-semibold leading-relaxed ring-[1.5px] ring-[#FF6B00]">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" color="#FF6B00" />
          <p>Plus de 3 m entre le raccordement et le coffret : protection en tête à prévoir. Rapproche le coffret si tu peux.</p>
        </div>
      )}

      {percements.length > 0 && (
        <div className="space-y-3">
          <p className={ETIQUETTE}>Percements</p>
          <div className="grid grid-cols-2 gap-4">{percements.map(champ)}</div>
        </div>
      )}

      {visibles.includes('notesCheminement') && champ('notesCheminement')}

      <div className="space-y-3">
        <p className={ETIQUETTE}>Photos {e.photos > 0 ? `(${e.photos} déjà sur la fiche)` : ''}</p>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={p.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.data} alt={`Photo ${i + 1}`} className="h-24 w-full rounded-[10px] object-cover" />
                <button type="button" onClick={() => retirerPhoto(i)} aria-label="Retirer la photo" className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ backgroundColor: NAVY }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {peut && (
          <div className="relative w-full overflow-hidden rounded-full bg-white p-3 text-center ring-[1.5px] ring-[#dfe3e8]">
            <span className="flex items-center justify-center gap-2 text-[14px] font-semibold" style={{ color: LABEL }}>
              <Camera size={18} /> Prendre une photo
            </span>
            <input type="file" accept="image/*" capture="environment" multiple className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={ajouterPhotos} />
          </div>
        )}
      </div>

      {erreur && <Alerte>{erreur}</Alerte>}
      {peut && (
        <BoutonPrincipal type="button" onClick={enregistrer} disabled={envoi} inactif={envoi}>
          <Send size={20} /> {envoi ? 'Envoi…' : 'Enregistrer cet élément'}
        </BoutonPrincipal>
      )}
    </div>
  );
}

// ---- Brief de chiffrage affiché dans l'appli (écart 24) ----
function CarteBrief({ scenarioId, texte, onTexte }: { scenarioId: string; texte: string | null; onTexte: (t: string | null) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [lecture, setLecture] = useState(false);
  const [erreur, setErreur] = useState('');
  const lire = async () => {
    setLecture(true);
    setErreur('');
    try {
      const res = await fetch(`${URL_ELEMENTS}?scenarioId=${encodeURIComponent(scenarioId)}&brief=1`, { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) setErreur(j?.error ? `${j.error}.` : 'Brief illisible pour l’instant.');
      else { onTexte(j.brief ?? null); setOuvert(true); if (!j.brief) setErreur('Pas encore de brief : clique sur « Prêt à chiffrer ».'); }
    } catch {
      setErreur('Pas de réseau : le brief ne peut pas être lu.');
    }
    setLecture(false);
  };
  return (
    <Carte className="space-y-3">
      <TitreCarte icon={FileText}>Brief de chiffrage</TitreCarte>
      <div className="flex flex-wrap gap-2">
        {texte && (
          <PetitBouton onClick={() => setOuvert(!ouvert)}>
            {ouvert ? <><ChevronUp size={14} /> Masquer</> : <><ChevronDown size={14} /> Afficher</>}
          </PetitBouton>
        )}
        <PetitBouton onClick={lire} disabled={lecture}>{lecture ? 'Lecture…' : texte ? 'Relire le dernier brief' : 'Voir le dernier brief'}</PetitBouton>
      </div>
      {erreur && <p className="text-[14px]">{erreur}</p>}
      {ouvert && texte && (
        <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-[14px] bg-white p-3 text-[12.5px] leading-relaxed ring-[1.5px] ring-[#eceef1]" style={{ fontFamily: 'inherit' }}>
          {texte}
        </pre>
      )}
    </Carte>
  );
}

// ---- Écran des éléments d'un scénario ----
export function ElementsScenario({ scenarioId, segmentInitial = '' }: { scenarioId: string; segmentInitial?: string }) {
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [demande, setDemande] = useState<Demande | null>(null);
  const [renommage, setRenommage] = useState<Renommage | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  // Saisies gardées sur le téléphone, pas encore envoyées (ids des éléments)
  const [enAttente, setEnAttente] = useState<string[]>([]);
  // Dont les brouillons plus anciens que la fiche (05/11), qui ne partent plus tout seuls
  const [perimes, setPerimes] = useState<string[]>([]);
  const [envoiTous, setEnvoiTous] = useState(false);
  // Réponse de « Prêt à chiffrer », affichée sous le bouton
  const [retourPret, setRetourPret] = useState<{ ok: boolean; texte: string } | null>(null);
  // Dernier brief de chiffrage (écart 24)
  const [brief, setBrief] = useState<string | null>(null);
  // Création des éléments par défaut
  const [segment, setSegment] = useState('');
  const [materiel, setMateriel] = useState<Materiel>('borne');
  const [places, setPlaces] = useState('');
  // Ajout d'un élément
  const [nature, setNature] = useState<ChoixAjout>('borne');
  const [depart, setDepart] = useState('');
  const [arrivee, setArrivee] = useState('');
  const [typeCh, setTypeCh] = useState('alimentation');
  const [voirArchives, setVoirArchives] = useState(false);
  const refDemande = useRef<HTMLDivElement>(null);
  const refPret = useRef<HTMLDivElement>(null);

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`${URL_ELEMENTS}?scenarioId=${encodeURIComponent(scenarioId)}`, { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) { setErreur(j?.error ? `${j.error}.` : 'Les éléments ne peuvent pas être lus.'); return; }
      setD(j as Donnees);
    } catch {
      setErreur('Pas de réseau : les éléments ne peuvent pas être lus.');
    }
  }, [scenarioId]);

  // Éléments qui ont une saisie ou des photos gardées sur le téléphone, et brouillons plus anciens que la fiche
  const recompterAttente = useCallback(async (els: El[]) => {
    const ids: string[] = [];
    const vieux: string[] = [];
    for (const e of els) {
      if (lireBrouillon(e.id)) { ids.push(e.id); if (brouillonPerime(e)) vieux.push(e.id); continue; }
      if ((await lirePhotos(e.id)).length) ids.push(e.id);
    }
    setEnAttente(ids);
    setPerimes(vieux);
  }, []);

  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { if (demande) refDemande.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [demande]);
  useEffect(() => { if (retourPret) refPret.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [retourPret]);
  useEffect(() => { if (d) recompterAttente(d.elements); }, [d, ouvert, recompterAttente]);
  // Retour du réseau ou retour sur la page : on recompte (et on relit les éléments si la lecture avait échoué)
  useEffect(() => {
    const auRetour = () => { if (d) recompterAttente(d.elements); else charger(); };
    window.addEventListener('online', auRetour);
    window.addEventListener('focus', auRetour);
    return () => { window.removeEventListener('online', auRetour); window.removeEventListener('focus', auRetour); };
  }, [d, charger, recompterAttente]);

  // Action sur le serveur, puis relecture. Renvoie la réponse (ou null en cas d'échec).
  const agir = async (url: string, corps: any, recharger = true): Promise<any | null> => {
    setOccupe(true);
    setErreur('');
    setMessage('');
    const { ok, j } = await poster(url, corps);
    if (j?.aConfirmer) { setOccupe(false); return j; }
    if (!ok) { setErreur(j?.error ? `${j.error}.` : "L'action n'a pas abouti."); setOccupe(false); return null; }
    if (Array.isArray(j?.erreurs) && j.erreurs.length) setErreur(`À reprendre à la main dans ClickUp : ${j.erreurs.join(', ')}.`);
    if (recharger) await charger();
    setOccupe(false);
    return j;
  };

  // Confirmation dans la page, puis avertissement devis si le serveur le demande
  const archiverAvecGarde = (url: string, corps: any, texte: string, apres: (j: any) => void, recharger = true) => {
    setDemande({
      texte,
      libelle: 'Archiver',
      action: async () => {
        const j = await agir(url, corps, recharger);
        if (j?.aConfirmer) {
          setDemande({
            texte: String(j.avertissement || 'Continuer ?'),
            libelle: 'Archiver quand même',
            action: async () => { const k = await agir(url, { ...corps, confirme: true }, recharger); if (k?.success) apres(k); },
          });
          return;
        }
        if (j?.success) apres(j);
      },
    });
  };

  if (!d) {
    return (
      <div className="space-y-3">
        <Repere>Éléments du scénario</Repere>
        {erreur ? <Alerte>{erreur}</Alerte> : <p className="px-1 text-[14px]">Chargement des éléments…</p>}
      </div>
    );
  }

  const peut = d.droits.elements;
  const cop = d.scenario.segment === 'COP';
  const ctx = contexteReleve(d.scenario.segment, d.elements);
  const nomDe = (id: string | null) => (id ? d.elements.find((e) => e.id === id)?.nom || 'archivé' : '');
  const ordre = (n: Nature | null) => ORDRE_NATURE[n ?? 'autre'];
  const equipements = d.elements
    .filter((e) => e.nature !== 'cheminement')
    .sort((a, b) => ordre(a.nature) - ordre(b.nature) || a.nom.localeCompare(b.nom, 'fr', { numeric: true }));
  const cheminements = d.elements
    .filter((e) => e.nature === 'cheminement')
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }));
  const liesA = (id: string) => cheminements.filter((c) => c.depart === id || c.arrivee === id).length;
  // RIC : le Type Client de la fiche choisit le modèle (tarif type ou vrai devis résident), demandé ici (écart 69)
  const typeClientManque = d.scenario.segment === 'RIC' && !d.site?.typeClient;
  const incomplets = [
    ...(typeClientManque ? [{ e: { nom: 'Fiche' } as El, m: ['🏢 Type Client'] }] : []),
    ...d.elements.map((e) => ({ e, m: manquants(e, ctx) })).filter((x) => x.m.length),
  ];
  // Relevés à envoyer d'un coup : les brouillons plus anciens que la fiche en sont exclus (05/11)
  const attente = d.elements.filter((e) => enAttente.includes(e.id) && !perimes.includes(e.id));
  const vieuxBrouillons = d.elements.filter((e) => perimes.includes(e.id));
  const aTrancher = attente.length + vieuxBrouillons.length;

  const segmentChoisi: Segment = estSegment(segment) ? segment : d.scenario.segment || (estSegment(segmentInitial) ? segmentInitial : 'RES');
  // Places : celles du site (fiche) par défaut, plus redemandées d'un scénario à l'autre (écart 44)
  const placesSite = d.site?.places ? String(d.site.places) : '';
  const placesSaisies = places !== '' ? places : placesSite;
  const nbPlaces = Math.max(0, parseInt(placesSaisies, 10) || 0);
  const apercu = specsParDefaut(segmentChoisi, materiel, nbPlaces).map((s) => s.nom);

  const validerRenommage = async () => {
    if (!renommage) return;
    const nom = renommage.valeur.trim();
    const r = renommage;
    setRenommage(null);
    if (!nom) return;
    if (r.type === 'scenario') {
      const j = await agir(URL_SCENARIO, { action: 'renommer', id: scenarioId, nom }, false);
      if (j?.success) window.location.reload();
      return;
    }
    const j = await agir(URL_ELEMENTS, { action: 'renommer', id: r.id, nom });
    if (j) setMessage(`Renommé en « ${nom} ».`);
  };
  const archiver = (e: El) => {
    const n = e.nature === 'cheminement' ? 0 : liesA(e.id);
    const suite = n === 0 ? '' : n === 1 ? ' Le cheminement relié sera archivé aussi.' : ` Les ${n} cheminements reliés seront archivés aussi.`;
    archiverAvecGarde(URL_ELEMENTS, { action: 'archiver', id: e.id }, `Archiver ${e.nom} ?${suite} Restaurable.`,
      (j) => setMessage(`Archivé : ${(j.crees || []).join(', ')}.`));
  };
  const restaurer = async (e: El) => {
    const j = await agir(URL_ELEMENTS, { action: 'restaurer', id: e.id });
    if (j?.success) setMessage(`Restauré : ${(j.crees || []).join(', ')}.`);
  };
  const dupliquer = async (e: El, action: 'dupliquerBranche' | 'dupliquerBorne') => {
    const j = await agir(URL_ELEMENTS, { action, id: e.id });
    if (j?.success) setMessage(`Créé : ${(j.crees || []).join(', ')}. Matériel recopié, mesures à refaire.`);
  };
  const creerDefaut = async () => {
    const j = await agir(URL_ELEMENTS, { action: 'defaut', scenarioId, segment: segmentChoisi, materiel, nbPlaces });
    if (j?.success) setMessage(`${(j.crees || []).length} éléments créés.`);
  };
  const choisirTypeClient = async (cle: string) => {
    const j = await agir(URL_ELEMENTS, { action: 'typeClient', scenarioId, typeClient: cle });
    if (j?.success) setMessage(`${(j.messages || ['Type Client enregistré']).join('. ')}.`);
  };
  const ajouter = async () => {
    const corps: any = nature === 'depose' ? { action: 'ajouter', scenarioId, nature: 'autre', modele: 'depose' } : { action: 'ajouter', scenarioId, nature };
    if (nature === 'cheminement') Object.assign(corps, { depart: depart || undefined, arrivee: arrivee || undefined, typeCheminement: typeCh });
    const j = await agir(URL_ELEMENTS, corps);
    if (j?.success) { setMessage(`Ajouté : ${(j.crees || []).join(', ')}.`); setDepart(''); setArrivee(''); }
  };
  // Proposition d'archivage renvoyée par le serveur après un relevé (liaison devenue inutile)
  const proposer = (p: any) => {
    if (!p) return;
    setDemande({
      texte: `Archiver ${p.nom} ? (${p.raison})`,
      libelle: 'Archiver la liaison',
      action: async () => { const k = await agir(URL_ELEMENTS, { action: 'archiver', id: p.id, confirme: true }); if (k?.success) setMessage(`Archivé : ${p.nom}.`); },
    });
  };
  // Après le relevé d'un élément : messages des automatismes, propositions d'archivage, relecture
  const apresReleve = async (j: any) => {
    const msgs = [...(j?.crees?.length ? [`Enregistré : ${j.crees.join(', ')}`] : ['Rien de nouveau à enregistrer']), ...(j?.messages || [])];
    setMessage(`${msgs.join('. ')}.`);
    if (Array.isArray(j?.erreurs) && j.erreurs.length) setErreur(`Non enregistré : ${j.erreurs.join(', ')}.`);
    proposer(Array.isArray(j?.propositions) ? j.propositions[0] : null);
    await charger();
  };
  // Tous les éléments saisis sur le téléphone, envoyés l'un après l'autre (ce qui échoue reste sur le téléphone).
  // Les brouillons plus anciens que la fiche n'en font pas partie (05/11).
  const enregistrerTous = async () => {
    if (envoiTous || !attente.length) return;
    setOuvert(null);
    setEnvoiTous(true);
    setErreur('');
    setMessage('');
    const envoyes: string[] = [];
    const rates: string[] = [];
    const messages: string[] = [];
    const erreursServeur: string[] = [];
    const propositions: any[] = [];
    let photosRatees = 0;
    for (const e of attente) {
      if (brouillonPerime(e)) continue;
      const b = lireBrouillon(e.id);
      const v = { ...valeursServeur(e), ...(b?.v || {}) };
      const dep = b?.depart ?? (e.depart || '');
      const arr = b?.arrivee ?? (e.arrivee || '');
      const r = await envoyerReleve(e, v, dep, arr, ctx, await lirePhotos(e.id));
      if (!r.ok) { rates.push(e.nom); continue; }
      envoyes.push(e.nom);
      photosRatees += r.echecs;
      messages.push(...(Array.isArray(r.j?.messages) ? r.j.messages : []));
      erreursServeur.push(...(Array.isArray(r.j?.erreurs) ? r.j.erreurs : []));
      propositions.push(...(Array.isArray(r.j?.propositions) ? r.j.propositions : []));
    }
    const n = envoyes.length;
    setMessage([
      n ? `${n} élément${n > 1 ? 's' : ''} enregistré${n > 1 ? 's' : ''} : ${envoyes.join(', ')}` : '',
      ...messages,
    ].filter(Boolean).join('. ') + (n || messages.length ? '.' : ''));
    setErreur([
      rates.length ? `Pas envoyé (gardé sur le téléphone, réessaie avec du réseau) : ${rates.join(', ')}.` : '',
      photosRatees ? `${photosRatees} photo${photosRatees > 1 ? 's' : ''} non envoyée${photosRatees > 1 ? 's' : ''} : réessaie, seules les photos manquantes partiront.` : '',
      erreursServeur.length ? `Non enregistré : ${erreursServeur.join(', ')}.` : '',
    ].filter(Boolean).join(' '));
    proposer(propositions[0]);
    await charger();
    setEnvoiTous(false);
  };
  // Brouillon plus ancien que la fiche : envoyé seulement sur demande, ou jeté (05/11)
  const envoyerQuandMeme = async (e: El) => {
    setOccupe(true);
    setErreur('');
    setMessage('');
    const b = lireBrouillon(e.id);
    const v = { ...valeursServeur(e), ...(b?.v || {}) };
    const r = await envoyerReleve(e, v, b?.depart ?? (e.depart || ''), b?.arrivee ?? (e.arrivee || ''), ctx, await lirePhotos(e.id));
    setOccupe(false);
    if (!r.ok) {
      setErreur(r.j?.error ? `${r.j.error}. Le brouillon reste sur le téléphone.` : 'Pas envoyé : le brouillon reste sur le téléphone, réessaie avec du réseau.');
      return;
    }
    await apresReleve(r.j);
  };
  const jeterVieux = async (e: El) => {
    jeterBrouillon(e.id);
    setErreur('');
    setMessage(`Brouillon de ${e.nom} jeté : la fiche garde ce qui est enregistré.`);
    await recompterAttente(d.elements);
  };
  // « Prêt à chiffrer » : la réponse (brief posté, statuts passés, ou erreur) s'affiche sous le bouton, et le brief juste
  // en dessous (écart 24)
  const pret = async () => {
    setOccupe(true);
    setRetourPret(null);
    const { ok, j } = await poster(URL_ELEMENTS, { action: 'pret', scenarioId });
    if (!ok) {
      setRetourPret({ ok: false, texte: j?.error ? `${j.error}.` : "Pas abouti. Réessaie avec du réseau." });
      setOccupe(false);
      return;
    }
    const reprises = Array.isArray(j?.erreurs) && j.erreurs.length ? ` À reprendre à la main dans ClickUp : ${j.erreurs.join(', ')}.` : '';
    setRetourPret({ ok: true, texte: `${(j.messages || ['Prêt à chiffrer']).join('. ')}.${reprises}` });
    if (typeof j?.brief === 'string') setBrief(j.brief);
    await charger();
    setOccupe(false);
  };

  // Scénario : duplication avec la question « Recopier les distances ? » (écart 38)
  const dupliquerScenario = () => {
    const lancer = (distances: boolean) => async () => {
      const j = await agir(URL_SCENARIO, { action: 'dupliquer', id: scenarioId, distances }, false);
      if (j?.success && j.id) window.location.href = adresses.releve(String(j.id));
    };
    setDemande({
      texte: `Dupliquer ce scénario avec ses ${d.elements.length} éléments, matériel recopié ? Recopier aussi les distances ?`,
      libelle: 'Oui, recopier les distances',
      action: lancer(true),
      autre: { libelle: 'Non, je remesure', action: lancer(false) },
    });
  };
  const archiverScenario = () => {
    const n = d.elements.length;
    const texte = `Archiver ${d.scenario.nom}${n ? ` et ses ${n} élément${n > 1 ? 's' : ''}` : ''} ? Restaurable depuis la fiche.`;
    archiverAvecGarde(URL_SCENARIO, { action: 'archiver', id: scenarioId }, texte,
      () => { window.location.href = adresses.releve(d.scenario.projetId); }, false);
  };

  const champRenommage = (id: string) => renommage && renommage.id === id && (
    <div className="mt-3 space-y-2">
      <input className={CHAMP} value={renommage.valeur} maxLength={80} autoFocus onChange={(ev) => setRenommage({ ...renommage, valeur: ev.target.value })} />
      <div className="flex flex-wrap gap-2">
        <PetitBouton onClick={validerRenommage} disabled={occupe}>Enregistrer le nom</PetitBouton>
        <PetitBouton onClick={() => setRenommage(null)}>Annuler</PetitBouton>
      </div>
    </div>
  );

  const etat = (e: El) => {
    const m = manquants(e, ctx);
    const base = e.nature === 'cheminement'
      ? [libelleType(e.typeCheminement), `${nomDe(e.depart) || 'départ ?'} → ${nomDe(e.arrivee) || (e.typeCheminement === 'artere' ? "fin d'artère" : 'arrivée ?')}`].filter(Boolean).join(' · ')
      : (e.nature ? LIBELLE_NATURE_LONG[e.nature] : 'Nature à renseigner');
    return (
      <>
        <span>{base}</span>
        {perimes.includes(e.id) ? (
          <span className="ml-1 font-semibold" style={{ color: '#FF6B00' }}> · brouillon du {dateBrouillon(e.id)} plus ancien que la fiche, à trancher</span>
        ) : enAttente.includes(e.id) ? (
          <span className="ml-1 font-semibold" style={{ color: '#FF6B00' }}> · saisi sur le téléphone, pas encore envoyé</span>
        ) : (
          <span className="ml-1 font-semibold" style={{ color: m.length ? '#FF6B00' : CYAN }}>
            {m.length ? ` · à compléter : ${m.join(', ')}` : ' · complet'}
          </span>
        )}
      </>
    );
  };

  const ligneElement = (e: El) => (
    <Ligne
      key={e.id}
      titre={e.nom}
      sousTitre={etat(e)}
      apres={(
        <>
          {champRenommage(e.id)}
          {ouvert === e.id && <FormulaireElement e={e} elements={d.elements} ctx={ctx} peut={peut} onEnregistre={apresReleve} onBrouillon={() => recompterAttente(d.elements)} />}
        </>
      )}
    >
      <PetitBouton onClick={() => setOuvert(ouvert === e.id ? null : e.id)}>
        {ouvert === e.id ? <><ChevronUp size={14} /> Fermer</> : <><ChevronDown size={14} /> Relever</>}
      </PetitBouton>
      {peut && (
        <>
          <PetitBouton onClick={() => setRenommage({ id: e.id, valeur: e.nom, type: 'element' })} disabled={occupe}><Pencil size={14} /> Renommer</PetitBouton>
          {e.nature === 'tdIrveCoffret' && !cop && (
            <PetitBouton onClick={() => dupliquer(e, 'dupliquerBranche')} disabled={occupe}><Copy size={14} /> Dupliquer la branche</PetitBouton>
          )}
          {(e.nature === 'borne' || e.nature === 'priseRenforcee') && (
            <PetitBouton onClick={() => dupliquer(e, 'dupliquerBorne')} disabled={occupe}><Copy size={14} /> Dupliquer la borne seule</PetitBouton>
          )}
          <PetitBouton onClick={() => archiver(e)} disabled={occupe}><Archive size={14} /> Archiver</PetitBouton>
        </>
      )}
    </Ligne>
  );

  // Carte « Relevés à envoyer » (en tête et avant « Prêt à chiffrer »)
  const carteAEnvoyer = peut && attente.length > 0 && (
    <Carte accent className="space-y-3">
      <TitreCarte icon={Send} extra={<span className="text-[13px] font-bold">{attente.length}</span>}>Relevés à envoyer</TitreCarte>
      <p className="text-[14px] leading-relaxed">
        Saisi{attente.length > 1 ? 's' : ''} sur le téléphone, pas encore envoyé{attente.length > 1 ? 's' : ''} : {attente.map((e) => e.nom).join(', ')}. Avec du réseau, envoie tout d&apos;un coup.
      </p>
      <BoutonPrincipal type="button" onClick={enregistrerTous} disabled={envoiTous || occupe} inactif={envoiTous || occupe}>
        <Send size={20} /> {envoiTous ? 'Envoi…' : `Enregistrer tous les éléments (${attente.length})`}
      </BoutonPrincipal>
    </Carte>
  );

  // Carte « Brouillons plus anciens que la fiche » (05/11) : rien ne part tout seul, chaque brouillon se tranche
  const carteVieux = peut && vieuxBrouillons.length > 0 && (
    <Carte accent className="space-y-3">
      <TitreCarte icon={AlertTriangle} extra={<span className="text-[13px] font-bold">{vieuxBrouillons.length}</span>}>Brouillons plus anciens que la fiche</TitreCarte>
      <p className="text-[14px] leading-relaxed">
        La fiche a changé depuis ces saisies gardées sur le téléphone : elles ne partent pas toutes seules. Pour chacune, envoie-la quand même ou jette-la.
      </p>
      {vieuxBrouillons.map((e) => (
        <Ligne key={e.id} titre={e.nom} sousTitre={`Brouillon du ${dateBrouillon(e.id)}`}>
          <PetitBouton onClick={() => envoyerQuandMeme(e)} disabled={occupe}><Send size={14} /> Envoyer quand même</PetitBouton>
          <PetitBouton onClick={() => jeterVieux(e)} disabled={occupe}><X size={14} /> Le jeter</PetitBouton>
        </Ligne>
      ))}
    </Carte>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <PetitBouton onClick={() => { window.location.href = adresses.releve(d.scenario.projetId); }}><ArrowLeft size={14} /> Relevé de la fiche (scénarios)</PetitBouton>
      </div>
      <Repere>Éléments du scénario</Repere>
      {demande && (
        <div ref={refDemande} className="rounded-[18px] bg-white p-4 ring-2 ring-[#FF6B00]">
          <p className="text-[15px] font-semibold leading-relaxed">{demande.texte}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <PetitBouton onClick={async () => { const a = demande.action; setDemande(null); await a(); }} disabled={occupe}>{demande.libelle}</PetitBouton>
            {demande.autre && (
              <PetitBouton onClick={async () => { const a = demande.autre?.action; setDemande(null); if (a) await a(); }} disabled={occupe}>{demande.autre.libelle}</PetitBouton>
            )}
            <PetitBouton onClick={() => setDemande(null)}>Annuler</PetitBouton>
          </div>
        </div>
      )}
      {message && <p className="px-1 text-[14px] font-semibold leading-relaxed" style={{ color: LABEL }}>{message}</p>}
      {erreur && <Alerte>{erreur}</Alerte>}

      {typeClientManque && peut && (
        <Carte accent className="space-y-3">
          <TitreCarte icon={UserCheck}>🏢 Type Client de la fiche</TitreCarte>
          <p className="text-[14px] leading-relaxed">En RIC, il choisit le devis : vrai devis au nom du résident, ou tarif type au nom du syndic.</p>
          <div className="flex flex-wrap gap-2">
            {TYPES_CLIENT.map((t) => <Choix key={t.cle} actif={false} onClick={() => choisirTypeClient(t.cle)}>{t.libelle}</Choix>)}
          </div>
        </Carte>
      )}

      {d.elements.length === 0 ? (
        <Carte accent className="space-y-4">
          <TitreCarte icon={Layers}>Créer les éléments</TitreCarte>
          <div className="space-y-2">
            <label className={ETIQUETTE} htmlFor={`segment-${scenarioId}`}>Segment du scénario</label>
            <select id={`segment-${scenarioId}`} className={CHAMP} value={segmentChoisi} onChange={(e) => setSegment(e.target.value)}>
              {SEGMENTS.map((s) => <option key={s} value={s}>{LIBELLE_SEGMENT[s]}</option>)}
            </select>
          </div>
          {SEGMENTS_BORNE.includes(segmentChoisi) && (
            <div className="flex flex-wrap gap-2">
              <Choix actif={materiel === 'borne'} onClick={() => setMateriel('borne')}>Borne</Choix>
              <Choix actif={materiel === 'prise'} onClick={() => setMateriel('prise')}>Prise renforcée</Choix>
            </div>
          )}
          {segmentChoisi === 'COP' && (
            <div className="space-y-2">
              <label className={ETIQUETTE} htmlFor={`places-${scenarioId}`}>Nombre de places du site</label>
              <input id={`places-${scenarioId}`} type="number" inputMode="numeric" min={0} className={CHAMP} value={placesSaisies} onChange={(e) => setPlaces(e.target.value)} placeholder="Ex : 30" />
              <p className="ml-1 text-[13px] leading-relaxed">
                {placesSite ? 'Repris de la fiche (donnée du site). ' : ''}Une boîte de dérivation par tranche de 4 places, HUB choisi selon les points de charge.
              </p>
            </div>
          )}
          <p className="text-[14px] leading-relaxed"><strong>Seront créés :</strong> {apercu.join(' ; ')}.</p>
          {peut ? (
            <BoutonPrincipal type="button" onClick={creerDefaut} disabled={occupe} inactif={occupe}>
              <Plus size={20} /> {occupe ? 'Création…' : `Créer les ${apercu.length} éléments`}
            </BoutonPrincipal>
          ) : (
            <p className="text-[14px]">Réservé au commercial, au chargé d'opération et à la direction.</p>
          )}
        </Carte>
      ) : (
        <>
          {carteVieux}
          {carteAEnvoyer}

          <Carte className="space-y-3">
            <TitreCarte icon={Layers} extra={<span className="text-[13px] font-bold">{equipements.length}</span>}>Équipements</TitreCarte>
            {equipements.map(ligneElement)}
          </Carte>

          <Carte className="space-y-3">
            <TitreCarte icon={GitBranch} extra={<span className="text-[13px] font-bold">{cheminements.length}</span>}>Cheminements</TitreCarte>
            {cheminements.length === 0 && <p className="text-[14px]">Aucun cheminement.</p>}
            {cheminements.map(ligneElement)}
          </Carte>

          {peut && (
            <Carte className="space-y-4">
              <TitreCarte icon={Plus}>Ajouter un élément</TitreCarte>
              <div className="space-y-2">
                <label className={ETIQUETTE} htmlFor={`nature-${scenarioId}`}>Nature</label>
                <select id={`nature-${scenarioId}`} className={CHAMP} value={nature} onChange={(e) => setNature(e.target.value as ChoixAjout)}>
                  {NATURES_AJOUT.map((n) => <option key={n} value={n}>{LIBELLE_NATURE_LONG[n]}</option>)}
                  <option value="depose">{LIBELLE_DEPOSE}</option>
                </select>
              </div>
              {nature === 'cheminement' && (
                <>
                  <div className="space-y-2">
                    <label className={ETIQUETTE} htmlFor={`type-${scenarioId}`}>Type de cheminement</label>
                    <select id={`type-${scenarioId}`} className={CHAMP} value={typeCh} onChange={(e) => setTypeCh(e.target.value)}>
                      {TYPES_CHEMINEMENT.map((t) => <option key={t.cle} value={t.cle}>{t.libelle}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={ETIQUETTE} htmlFor={`depart-${scenarioId}`}>🔌 Départ</label>
                    <select id={`depart-${scenarioId}`} className={CHAMP} value={depart} onChange={(e) => setDepart(e.target.value)}>
                      <option value="">À choisir plus tard</option>
                      {equipements.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={ETIQUETTE} htmlFor={`arrivee-${scenarioId}`}>🏁 Arrivée</label>
                    <select id={`arrivee-${scenarioId}`} className={CHAMP} value={arrivee} onChange={(e) => setArrivee(e.target.value)}>
                      <option value="">{typeCh === 'artere' ? "Fin d'artère" : 'À choisir plus tard'}</option>
                      {equipements.filter((e) => e.id !== depart).map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                    </select>
                  </div>
                </>
              )}
              <BoutonPrincipal type="button" onClick={ajouter} disabled={occupe} inactif={occupe}>
                <Plus size={20} /> {occupe ? 'En cours…' : 'Ajouter'}
              </BoutonPrincipal>
            </Carte>
          )}

          {carteVieux}
          {carteAEnvoyer}

          <Carte accent className="space-y-3">
            <TitreCarte icon={Send}>Prêt à chiffrer</TitreCarte>
            <p className="text-[14px] leading-relaxed">
              Vérifie qu&apos;il ne manque rien, puis passe le scénario en « devis à faire ». Statut actuel : <strong>{d.scenario.statut || '–'}</strong>.
            </p>
            {aTrancher > 0 && (
              <p className="text-[14px] leading-relaxed" style={{ color: '#FF6B00' }}>
                Envoie ou jette d&apos;abord les relevés gardés sur le téléphone (cartes ci-dessus) : sinon le brief serait calculé sans eux.
              </p>
            )}
            {incomplets.length > 0 && (
              <p className="text-[14px] leading-relaxed" style={{ color: '#FF6B00' }}>
                Encore à compléter : {incomplets.map((x) => `${x.e.nom} (${x.m.join(', ')})`).join(' ; ')}.
              </p>
            )}
            {peut && (
              <BoutonPrincipal type="button" onClick={pret} disabled={occupe || incomplets.length > 0 || aTrancher > 0} inactif={occupe || incomplets.length > 0 || aTrancher > 0}>
                <Send size={20} /> {occupe ? 'Envoi…' : incomplets.length > 0 ? 'Relevé incomplet' : aTrancher > 0 ? 'Relevés à envoyer d’abord' : 'Prêt à chiffrer'}
              </BoutonPrincipal>
            )}
            {retourPret && (
              <div ref={refPret}>
                {retourPret.ok
                  ? <p className="text-[14px] font-semibold leading-relaxed" style={{ color: CYAN }}>✅ {retourPret.texte}</p>
                  : <Alerte>{retourPret.texte}</Alerte>}
              </div>
            )}
          </Carte>

          <CarteBrief scenarioId={scenarioId} texte={brief} onTexte={setBrief} />
        </>
      )}

      {d.archives.length > 0 && (
        <Carte className="space-y-3">
          <button type="button" onClick={() => setVoirArchives(!voirArchives)} className="w-full text-left">
            <TitreCarte icon={Archive} extra={<span className="text-[13px] font-bold">{voirArchives ? 'Masquer' : 'Afficher'}</span>}>
              Éléments archivés ({d.archives.length})
            </TitreCarte>
          </button>
          {voirArchives && d.archives.map((e) => (
            <Ligne key={e.id} titre={e.nom} sousTitre={e.nature ? LIBELLE_NATURE_LONG[e.nature] : ''}>
              {peut && <PetitBouton onClick={() => restaurer(e)} disabled={occupe}><RotateCcw size={14} /> Restaurer</PetitBouton>}
            </Ligne>
          ))}
        </Carte>
      )}

      {d.droits.scenarios && (
        <Carte className="space-y-3">
          <TitreCarte icon={GitBranch}>Ce scénario</TitreCarte>
          <p className="text-[14px] leading-relaxed">
            Renommer garde la lettre. Dupliquer crée le scénario suivant avec les mêmes éléments et le matériel recopié ; tu choisis de recopier les distances ou de remesurer.
          </p>
          <div className="flex flex-wrap gap-2">
            <PetitBouton onClick={() => setRenommage({ id: scenarioId, valeur: libelleScenario(d.scenario.nom), type: 'scenario' })} disabled={occupe}><Pencil size={14} /> Renommer</PetitBouton>
            <PetitBouton onClick={dupliquerScenario} disabled={occupe}><Copy size={14} /> Dupliquer le scénario</PetitBouton>
            <PetitBouton onClick={archiverScenario} disabled={occupe}><Archive size={14} /> Archiver le scénario</PetitBouton>
          </div>
          {champRenommage(scenarioId)}
        </Carte>
      )}
    </div>
  );
}

// Scénarios archivés d'une fiche, avec Restaurer (commercial et direction)
export function ScenariosArchives({ affaireId }: { affaireId: string }) {
  const [liste, setListe] = useState<{ id: string; nom: string }[]>([]);
  const [peut, setPeut] = useState(false);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${URL_SCENARIO}?affaireId=${encodeURIComponent(affaireId)}`, { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j?.success) { setListe(Array.isArray(j.archives) ? j.archives : []); setPeut(!!j?.droits?.scenarios); }
      } catch {
        // hors ligne : la liste reste vide
      }
    })();
  }, [affaireId]);

  if (!liste.length) return null;

  const restaurer = async (id: string) => {
    setOccupe(true);
    setErreur('');
    const { ok, j } = await poster(URL_SCENARIO, { action: 'restaurer', id });
    if (!ok) { setErreur(j?.error ? `${j.error}.` : "Le scénario n'a pas pu être restauré."); setOccupe(false); return; }
    window.location.reload();
  };

  return (
    <div className="space-y-3">
      <Repere>Scénarios archivés</Repere>
      {erreur && <Alerte>{erreur}</Alerte>}
      {liste.map((s) => (
        <Ligne key={s.id} titre={s.nom} sousTitre="Archivé avec ses éléments">
          {peut && <PetitBouton onClick={() => restaurer(s.id)} disabled={occupe}><RotateCcw size={14} /> Restaurer</PetitBouton>}
        </Ligne>
      ))}
    </div>
  );
}
