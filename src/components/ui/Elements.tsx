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
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle, Archive, Camera, ChevronDown, ChevronUp, Copy, GitBranch, Layers,
  Pencil, Plus, RotateCcw, Send, X,
} from 'lucide-react';
import { Carte, TitreCarte, Alerte, BoutonPrincipal, Repere, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, LABEL, NAVY } from '@/components/charte/couleurs';
import { LIBELLE_NATURE_LONG, LIBELLE_SEGMENT, ORDRE_NATURE, SEGMENTS_BORNE, specsParDefaut, type Materiel } from '@/lib/elementsModele';
import {
  DISTANCES, PERCEMENTS, SAISIES, alerteTroisMetres, champsVisibles, coffretSuggere, contexteReleve, longueurTotale, manquants,
  type ContexteReleve, type ElementReleve,
} from '@/lib/releveElements';
import type { Nature, Segment } from '@/lib/champsClickUp';

type El = ElementReleve & { archive: boolean; photos: number };

type Donnees = {
  scenario: { id: string; nom: string; statut: string; segment: Segment | null; lienDevis: boolean; projetId: string };
  elements: El[];
  archives: El[];
  droits: { scenarios: boolean; elements: boolean };
};

type Demande = { texte: string; libelle: string; action: () => Promise<void> };
type Renommage = { id: string; valeur: string; type: 'element' | 'scenario' };
type Photo = { id: string; data: string };

const URL_ELEMENTS = '/api/interne/elements';
const URL_SCENARIO = '/api/interne/scenario';
const SEGMENTS = Object.keys(LIBELLE_SEGMENT) as Segment[];
const estSegment = (s: string): s is Segment => (SEGMENTS as string[]).includes(s);
const NATURES_AJOUT: Nature[] = ['borne', 'priseRenforcee', 'cheminement', 'tdIrveCoffret', 'raccordement', 'communication', 'autre', 'boiteDerivation'];
const TYPES_CHEMINEMENT: { cle: string; libelle: string }[] = [
  { cle: 'alimentation', libelle: 'Alimentation' },
  { cle: 'artere', libelle: 'Artère' },
  { cle: 'liaisonData', libelle: 'Liaison data' },
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
  const [v, setV] = useState<Record<string, string>>(() => ({ ...valeursServeur(e), ...(lireBrouillon(e.id)?.v || {}) }));
  const [dep, setDep] = useState<string>(() => lireBrouillon(e.id)?.depart ?? (e.depart || ''));
  const [arr, setArr] = useState<string>(() => lireBrouillon(e.id)?.arrivee ?? (e.arrivee || ''));
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => { lirePhotos(e.id).then(setPhotos); }, [e.id]);

  const garder = (nv: Record<string, string>, nd: string, na: string) => {
    try { localStorage.setItem(cleBrouillon, JSON.stringify({ v: nv, depart: nd, arrivee: na })); } catch { /* sans gravité */ }
    onBrouillon();
  };
  const changer = (k: string, val: string) => {
    const n = { ...v, [k]: val };
    setV(n);
    garder(n, dep, arr);
  };

  const visibles = champsVisibles(e.nature, v, ctx);
  const distances = visibles.filter((k) => DISTANCES.includes(k));
  const percements = visibles.filter((k) => PERCEMENTS.includes(k));
  const autres = visibles.filter((k) => !DISTANCES.includes(k) && !PERCEMENTS.includes(k) && k !== 'notesCheminement');
  const equipements = elements.filter((x) => x.nature !== 'cheminement' && x.id !== e.id);
  const troisMetres = alerteTroisMetres(e, elements, ctx.segment, v, dep || null, arr || null);
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
            {(s.options || []).map((o) => <option key={o.cle} value={o.cle}>{o.libelle}</option>)}
          </select>
        </div>
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
    setEnvoi(false);
    await onEnregistre(r.j);
  };

  return (
    <div className="mt-4 space-y-4 border-t-[1.5px] border-[#eceef1] pt-4">
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
          {ctx.segment === 'RIC' && (
            <p className="ml-1 text-[13px] leading-relaxed">Forfait RIC : 5 m de tube apparent préremplis. Si c’est plus long, mets la longueur réelle.</p>
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
  const [envoiTous, setEnvoiTous] = useState(false);
  // Création des éléments par défaut
  const [segment, setSegment] = useState('');
  const [materiel, setMateriel] = useState<Materiel>('borne');
  const [places, setPlaces] = useState('');
  // Ajout d'un élément
  const [nature, setNature] = useState<Nature>('borne');
  const [depart, setDepart] = useState('');
  const [arrivee, setArrivee] = useState('');
  const [typeCh, setTypeCh] = useState('alimentation');
  const [voirArchives, setVoirArchives] = useState(false);
  const refDemande = useRef<HTMLDivElement>(null);

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

  // Éléments qui ont une saisie ou des photos gardées sur le téléphone
  const recompterAttente = useCallback(async (els: El[]) => {
    const ids: string[] = [];
    for (const e of els) {
      if (lireBrouillon(e.id)) { ids.push(e.id); continue; }
      if ((await lirePhotos(e.id)).length) ids.push(e.id);
    }
    setEnAttente(ids);
  }, []);

  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { if (demande) refDemande.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [demande]);
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
  const incomplets = d.elements.map((e) => ({ e, m: manquants(e, ctx) })).filter((x) => x.m.length);
  const attente = d.elements.filter((e) => enAttente.includes(e.id));

  const segmentChoisi: Segment = estSegment(segment) ? segment : d.scenario.segment || (estSegment(segmentInitial) ? segmentInitial : 'RES');
  const nbPlaces = Math.max(0, parseInt(places, 10) || 0);
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
  const ajouter = async () => {
    const corps: any = { action: 'ajouter', scenarioId, nature };
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
  // Tous les éléments saisis sur le téléphone, envoyés l'un après l'autre (ce qui échoue reste sur le téléphone)
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
  const pret = async () => {
    const j = await agir(URL_ELEMENTS, { action: 'pret', scenarioId });
    if (j?.success) setMessage(`${(j.messages || ['Prêt à chiffrer']).join('. ')}.`);
  };

  // Scénario
  const dupliquerScenario = () => {
    setDemande({
      texte: `Dupliquer ce scénario avec ses ${d.elements.length} éléments ? Matériel recopié, mesures à refaire.`,
      libelle: 'Dupliquer',
      action: async () => {
        const j = await agir(URL_SCENARIO, { action: 'dupliquer', id: scenarioId }, false);
        if (j?.success && j.id) window.location.href = `/interne/metre/${j.id}`;
      },
    });
  };
  const archiverScenario = () => {
    const n = d.elements.length;
    const texte = `Archiver ${d.scenario.nom}${n ? ` et ses ${n} élément${n > 1 ? 's' : ''}` : ''} ? Restaurable depuis la fiche.`;
    archiverAvecGarde(URL_SCENARIO, { action: 'archiver', id: scenarioId }, texte,
      () => { window.location.href = `/interne/metre/${d.scenario.projetId}`; }, false);
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
        {enAttente.includes(e.id) ? (
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

  return (
    <div className="space-y-4">
      <Repere>Éléments du scénario</Repere>
      {demande && (
        <div ref={refDemande} className="rounded-[18px] bg-white p-4 ring-2 ring-[#FF6B00]">
          <p className="text-[15px] font-semibold leading-relaxed">{demande.texte}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <PetitBouton onClick={async () => { const a = demande.action; setDemande(null); await a(); }} disabled={occupe}>{demande.libelle}</PetitBouton>
            <PetitBouton onClick={() => setDemande(null)}>Annuler</PetitBouton>
          </div>
        </div>
      )}
      {message && <p className="px-1 text-[14px] font-semibold leading-relaxed" style={{ color: LABEL }}>{message}</p>}
      {erreur && <Alerte>{erreur}</Alerte>}

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
              <label className={ETIQUETTE} htmlFor={`places-${scenarioId}`}>Nombre de places</label>
              <input id={`places-${scenarioId}`} type="number" inputMode="numeric" min={0} className={CHAMP} value={places} onChange={(e) => setPlaces(e.target.value)} placeholder="Ex : 30" />
              <p className="ml-1 text-[13px] leading-relaxed">Une boîte de dérivation par tranche de 4 places.</p>
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
                <select id={`nature-${scenarioId}`} className={CHAMP} value={nature} onChange={(e) => setNature(e.target.value as Nature)}>
                  {NATURES_AJOUT.map((n) => <option key={n} value={n}>{LIBELLE_NATURE_LONG[n]}</option>)}
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

          {carteAEnvoyer}

          <Carte accent className="space-y-3">
            <TitreCarte icon={Send}>Prêt à chiffrer</TitreCarte>
            <p className="text-[14px] leading-relaxed">
              Vérifie qu&apos;il ne manque rien, puis passe le scénario en « devis à faire ». Statut actuel : <strong>{d.scenario.statut || '–'}</strong>.
            </p>
            {attente.length > 0 && (
              <p className="text-[14px] leading-relaxed" style={{ color: '#FF6B00' }}>
                Envoie d&apos;abord les relevés gardés sur le téléphone (bouton ci-dessus).
              </p>
            )}
            {incomplets.length > 0 && (
              <p className="text-[14px] leading-relaxed" style={{ color: '#FF6B00' }}>
                Encore à compléter : {incomplets.map((x) => `${x.e.nom} (${x.m.join(', ')})`).join(' ; ')}.
              </p>
            )}
            {peut && (
              <BoutonPrincipal type="button" onClick={pret} disabled={occupe || incomplets.length > 0} inactif={occupe || incomplets.length > 0}>
                <Send size={20} /> {incomplets.length > 0 ? 'Relevé incomplet' : 'Prêt à chiffrer'}
              </BoutonPrincipal>
            )}
          </Carte>
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
            Renommer garde la lettre. Dupliquer crée le scénario suivant avec les mêmes éléments, matériel recopié et mesures à refaire.
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
