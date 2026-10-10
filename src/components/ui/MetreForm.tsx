"use client";

// Relevé terrain. Matrice d'affichage par segment inchangée (validée avec Matthieu).
// 10/10/2026 : habillage charte 2026 (briques communes src/components/charte/Appli.tsx).
// Lot 3.2 (10/10/2026) :
// - envoi en 3 temps : mesures (/api/metre), puis photos une par une, puis finalisation du statut
//   (/api/metre/finaliser) SEULEMENT si tout est reçu ;
// - délesteur envoyé en une seule valeur (set, plus append) ;
// - distances et percements : vide = non mesuré, 0 = zéro ;
// - chaque photo a un identifiant stable : un nouvel essai ne renvoie que les photos manquantes ;
// - copie locale gardée 7 jours après confirmation, jamais purgée si l'envoi est incomplet.
// Les attributs value des menus ne changent pas (la route /api/metre les convertit en index ClickUp).
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Send, CheckCircle, Zap, Ruler, Hammer, FileText, Building2, Tag, X, Plug } from 'lucide-react';
import { Carte, TitreCarte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { NAVY, CYAN, LABEL, CYAN_PALE } from '@/components/charte/couleurs';
import { noterModification, noterConfirmation, relevesAPurger, retirerDeIndex } from '@/lib/releveLocal';

// Regle de depart : COP = toujours infra ; FLT/TER = borne complete
const INFRA_SEGMENTS = ['COP'];
const COPRO_PHOTO_SEGMENTS = ['COP', 'PAR', 'FLT', 'TER'];

// Checklist photos : les 5 premieres pour tous, les 4 suivantes pour copro/flotte/tertiaire
// (les clés ne changent pas, seuls les libellés affichés sont accentués)
const PHOTOS = [
  { key: 'photoTableauFerme', label: 'Tableau fermé', scope: 'all' },
  { key: 'photoTableauOuvert', label: 'Tableau ouvert', scope: 'all' },
  { key: 'photoEmplacementBorne', label: 'Emplacement borne', scope: 'all' },
  { key: 'photoCompteurPDL', label: 'Compteur / PDL', scope: 'all' },
  { key: 'photoPriseTerre', label: 'Prise de terre', scope: 'all' },
  { key: 'photoTGBT', label: 'TGBT parties communes', scope: 'copro' },
  { key: 'photoArtere', label: 'Cheminement artère', scope: 'copro' },
  { key: 'photoParking', label: 'Vue parking', scope: 'copro' },
  { key: 'photoLocalTech', label: 'Local technique / TD', scope: 'copro' },
];

// Une photo = un identifiant stable + l'image compressée (base64)
type Photo = { id: string; data: string };

const nouvelId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Accepte l'ancien format (tableau de chaînes base64) et le nouveau (objets avec id)
const normaliser = (brut: any): { photos: Photo[]; converti: boolean } => {
  let converti = false;
  const liste = Array.isArray(brut) ? brut : (typeof brut === 'string' ? [brut] : []);
  const photos: Photo[] = [];
  for (const x of liste) {
    if (typeof x === 'string') { photos.push({ id: nouvelId(), data: x }); converti = true; }
    else if (x && typeof x.data === 'string' && typeof x.id === 'string') photos.push(x);
  }
  if (!Array.isArray(brut) && brut) converti = true;
  return { photos, converti };
};

export function MetreForm({ taskId, taskName, initialSegment }: { taskId: string, taskName: string, initialSegment?: string }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [erreurMsg, setErreurMsg] = useState('');
  const [segment, setSegment] = useState(initialSegment || '');
  const [sourceRacc, setSourceRacc] = useState('');
  // Chaque emplacement -> liste de photos
  const [photos, setPhotos] = useState<Record<string, Photo[]>>({});
  const formRef = useRef<HTMLFormElement>(null);

  // --- MATRICE D'AFFICHAGE (validee avec Matthieu) ---
  const isCopInfra = segment === 'COP';
  const showInfra = INFRA_SEGMENTS.includes(segment);
  const showEtatTableau = sourceRacc !== 'PDL dedie';               // masque si PDL dedie (neuf)
  const showPuissanceVisee = !!segment && !isCopInfra;              // pas de borne en COP infra
  const showReseau = ['PAR', 'COP', 'FLT', 'TER'].includes(segment); // supervision/HUB
  const showDelesteur = ['RES', 'DAP', 'PAR'].includes(segment);     // borne seule
  const showCheminement = !!segment && !isCopInfra;                  // pas de cheminement borne en COP infra
  const showSupportBorne = !!segment && !isCopInfra;                 // pas de borne en COP infra
  const showCoproPhotos = COPRO_PHOTO_SEGMENTS.includes(segment);
  const visiblePhotos = PHOTOS.filter(p => p.scope === 'all' || (p.scope === 'copro' && showCoproPhotos));

  // Photos déjà reçues par ClickUp (identifiants), pour ne jamais les renvoyer
  const cleEnvoyees = `metreEnvoyees_${taskId}`;
  const lireEnvoyees = (): Set<string> => {
    try { return new Set(JSON.parse(localStorage.getItem(cleEnvoyees) || '[]')); } catch { return new Set(); }
  };
  const sauverEnvoyees = (ids: Set<string>) => {
    try { localStorage.setItem(cleEnvoyees, JSON.stringify(Array.from(ids))); } catch { /* sans gravité */ }
  };

  // IndexedDB : une entree par emplacement = liste de photos
  const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MetrePhotosDB', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('photos')) {
          request.result.createObjectStore('photos');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const savePhotoArray = async (photoKey: string, arr: Photo[]) => {
    try {
      const db = await initDB();
      db.transaction('photos', 'readwrite').objectStore('photos').put(arr, `${taskId}_${photoKey}`);
    } catch (err) {
      console.error("Erreur IndexedDB:", err);
    }
  };

  // Compresse un fichier en dataURL base64
  const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > 2500) {
          height = Math.round((height * 2500) / width);
          width = 2500;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
    };
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>, photoKey: string) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const nouvelles: Photo[] = [];
    for (const file of files) {
      nouvelles.push({ id: nouvelId(), data: await fileToDataUrl(file) });
    }
    setPhotos(prev => {
      const updated = { ...prev, [photoKey]: [...(prev[photoKey] || []), ...nouvelles] };
      savePhotoArray(photoKey, updated[photoKey]);
      return updated;
    });
    noterModification(taskId, taskName);
    e.target.value = '';
  };

  const removePhoto = (photoKey: string, index: number) => {
    setPhotos(prev => {
      const arr = [...(prev[photoKey] || [])];
      arr.splice(index, 1);
      const updated = { ...prev, [photoKey]: arr };
      savePhotoArray(photoKey, arr);
      return updated;
    });
    noterModification(taskId, taskName);
  };

  // Purge des relevés confirmés depuis plus de 7 jours (jamais des relevés incomplets)
  const purgerAnciensReleves = async () => {
    const ids = relevesAPurger();
    if (ids.length === 0) return;
    try {
      const db = await initDB();
      for (const id of ids) {
        localStorage.removeItem(`metreForm_${id}`);
        localStorage.removeItem(`metreEnvoyees_${id}`);
        for (const p of PHOTOS) {
          db.transaction('photos', 'readwrite').objectStore('photos').delete(`${id}_${p.key}`);
        }
        retirerDeIndex(id);
      }
    } catch (e) { console.error("Erreur purge relevés", e); }
  };

  // Restauration hors-ligne
  useEffect(() => {
    const demarrer = async () => {
      await purgerAnciensReleves();
      localStorage.setItem('last_visited_task', taskId);
      const savedData = localStorage.getItem(`metreForm_${taskId}`);
      if (savedData && formRef.current) {
        const parsed = JSON.parse(savedData);
        if (parsed.segment && !initialSegment) {
          setSegment(parsed.segment);
        }
        if (parsed.sourceRacc) {
          setSourceRacc(parsed.sourceRacc);
        }
        Object.keys(parsed).forEach(key => {
          if (key === 'segment' || key === 'sourceRacc') return;
          const input = formRef.current?.elements.namedItem(key) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          if (input && input.type !== 'file' && input.type !== 'checkbox') input.value = parsed[key];
          if (input && input.type === 'checkbox') (input as HTMLInputElement).checked = parsed[key] === 'true';
        });
      }
      try {
        const db = await initDB();
        const getPhoto = (key: string): Promise<any> => new Promise(resolve => {
          const req = db.transaction('photos', 'readonly').objectStore('photos').get(`${taskId}_${key}`);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(undefined);
        });
        const restored: Record<string, Photo[]> = {};
        for (const p of PHOTOS) {
          const { photos: liste, converti } = normaliser(await getPhoto(p.key));
          if (liste.length > 0) restored[p.key] = liste;
          // Ancien format converti : on réenregistre pour garder des identifiants stables
          if (converti) db.transaction('photos', 'readwrite').objectStore('photos').put(liste, `${taskId}_${p.key}`);
        }
        setPhotos(restored);
      } catch (e) { console.error("Erreur chargement DB", e); }
    };
    demarrer();
  }, [taskId, initialSegment]);

  // Sauvegarde hors-ligne (textes + segment + source). parUtilisateur = vraie saisie (rend le relevé « à terminer »)
  const handleFormChange = (parUtilisateur: boolean) => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const dataObj: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === 'string') dataObj[key] = value;
    });
    const checkbox = formRef.current.elements.namedItem('besoinDelesteur') as HTMLInputElement;
    if (checkbox) dataObj['besoinDelesteur'] = checkbox.checked ? 'true' : 'false';
    dataObj['segment'] = segment;
    dataObj['sourceRacc'] = sourceRacc;
    localStorage.setItem(`metreForm_${taskId}`, JSON.stringify(dataObj));
    if (parUtilisateur) noterModification(taskId, taskName);
  };

  useEffect(() => {
    handleFormChange(false);
  }, [segment, sourceRacc]);

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("uploading");
    setErreurMsg('');
    const formData = new FormData(e.currentTarget);
    formData.set("taskId", taskId);
    formData.set("segment", segment);
    formData.set("sourceRacc", sourceRacc);
    // Délesteur : UNE seule valeur (la case HTML envoie "on", on la remplace)
    const checkbox = formRef.current?.elements.namedItem('besoinDelesteur') as HTMLInputElement;
    if (checkbox) formData.set('besoinDelesteur', checkbox.checked ? 'true' : 'false');
    else formData.delete('besoinDelesteur');
    // Les photos partent séparément
    for (const p of PHOTOS) formData.delete(p.key);

    try {
      // 1) Mesures
      const res = await fetch('/api/metre', { method: 'POST', body: formData });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErreurMsg(
          Array.isArray(d?.echecs) && d.echecs.length > 0
            ? `Champs non enregistrés : ${d.echecs.join(', ')}. Appuie à nouveau sur Valider.`
            : (d?.error ? `${d.error}. Appuie à nouveau sur Valider.` : "Les mesures n'ont pas été enregistrées. Appuie à nouveau sur Valider.")
        );
        setStatus("error");
        return;
      }

      // 2) Photos manquantes uniquement, une par une
      const db = await initDB();
      const getPhoto = (key: string): Promise<any> => new Promise(resolve => {
        const req = db.transaction('photos', 'readonly').objectStore('photos').get(`${taskId}_${key}`);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
      });

      const envoyees = lireEnvoyees();
      let enEchec = 0;
      for (const p of PHOTOS) {
        const { photos: liste } = normaliser(await getPhoto(p.key));
        for (const ph of liste) {
          if (envoyees.has(ph.id)) continue;
          const photoData = new FormData();
          photoData.append('taskId', taskId);
          photoData.append('photo', dataURLtoBlob(ph.data), `${p.key}_${ph.id.slice(0, 8)}.jpg`);
          try {
            const pr = await fetch('/api/metre/photo', { method: 'POST', body: photoData });
            if (pr.ok) {
              envoyees.add(ph.id);
              sauverEnvoyees(envoyees);
            } else {
              enEchec++;
            }
          } catch {
            enEchec++;
          }
        }
      }

      if (enEchec > 0) {
        setErreurMsg(`Mesures enregistrées, mais ${enEchec} photo${enEchec > 1 ? 's' : ''} non envoyée${enEchec > 1 ? 's' : ''}. Retrouve du réseau et appuie à nouveau sur Valider : seules les photos manquantes partiront.`);
        setStatus("error");
        return;
      }

      // 3) Tout est reçu : passage en « devis à faire » (si la fiche est encore « à visiter »)
      const fin = await fetch('/api/metre/finaliser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });
      if (!fin.ok) {
        setErreurMsg("Mesures et photos reçues, mais le statut de la fiche n'a pas changé. Appuie à nouveau sur Valider.");
        setStatus("error");
        return;
      }

      // 4) Succès complet : la copie locale est gardée 7 jours
      noterConfirmation(taskId, taskName);
      setStatus("success");
    } catch (error) {
      setErreurMsg("Erreur réseau. Ne ferme pas la page, retrouve du réseau et appuie à nouveau sur Valider.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <Carte className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[16px] text-white" style={{ backgroundColor: CYAN }}>
          <CheckCircle size={32} />
        </div>
        <h2 className="text-[24px] font-bold">Relevé transmis !</h2>
        <p className="text-[15px] leading-relaxed">Mesures et photos bien reçues dans la fiche de {taskName}.</p>
        <p className="text-[13px] leading-relaxed">Une copie reste sur ce téléphone pendant 7 jours.</p>
        <a href="/interne" className="mt-2 text-[15px] font-semibold underline underline-offset-4" style={{ color: LABEL }}>Retour au planning</a>
      </Carte>
    );
  }

  const inputClass = CHAMP;
  const labelClass = ETIQUETTE;
  const photosPrises = visiblePhotos.filter(p => (photos[p.key] || []).length > 0).length;
  const aideVide = <p className="text-[13px] leading-relaxed">Laisse vide si non mesuré. Saisis 0 pour « aucun ».</p>;

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={() => handleFormChange(true)} className="space-y-5 pb-12" style={{ color: NAVY }}>
      
      {/* SEGMENT */}
      <Carte accent className="space-y-4">
        <TitreCarte icon={Tag}>Type de projet</TitreCarte>
        <select
          name="segment"
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="block w-full rounded-[14px] border-0 bg-white px-4 py-4 text-[17px] font-bold text-[#032b60] outline-none ring-2 ring-[#0097b2]"
        >
          <option value="">Choisir le segment...</option>
          <option value="RES">RES · Résidentiel (maison)</option>
          <option value="DAP">DAP · Droit à la prise</option>
          <option value="COP">COP · Copro infrastructure</option>
          <option value="PAR">PAR · Borne partagée</option>
          <option value="FLT">FLT · Flotte entreprise</option>
          <option value="TER">TER · Tertiaire / ERP</option>
        </select>
      </Carte>

      {/* ELECTRICITE */}
      <Carte className="space-y-5">
        <TitreCarte icon={Zap}>Électricité</TitreCarte>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelClass}>Raccordement</label>
            <select name="typeRaccordement" className={inputClass}>
              <option value="Monophase">Monophasé</option>
              <option value="Triphase">Triphasé</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Puissance dispo</label>
            <select name="puissance" className={inputClass}>
              <option value="3 kVA">3 kVA</option>
              <option value="6 kVA">6 kVA</option>
              <option value="9 kVA">9 kVA</option>
              <option value="12 kVA">12 kVA</option>
              <option value="18 kVA et plus">18 kVA et plus</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className={labelClass}>Source de raccordement</label>
          <select name="sourceRacc" value={sourceRacc} onChange={(e) => setSourceRacc(e.target.value)} className={inputClass}>
            <option value="">À préciser</option>
            <option value="Tableau individuel existant">Tableau individuel existant</option>
            <option value="TGBT services generaux existant">TGBT services généraux existant</option>
            <option value="PDL dedie">PDL dédié</option>
          </select>
        </div>

        {showPuissanceVisee && (
          <div className="space-y-2">
            <label className={labelClass}>Puissance visée PDC</label>
            <select name="puissanceVisee" className={inputClass}>
              <option value="">À déterminer</option>
              <option value="3.7">3,7 kW (prise renforcée)</option>
              <option value="7.4">7,4 kW (mono)</option>
              <option value="11">11 kW (tri)</option>
              <option value="22">22 kW (tri)</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelClass}>Terre (ohms)</label>
            <input type="number" step="0.1" name="terre" required className={inputClass} placeholder="Ex : 45" />
          </div>
          {showReseau && (
            <div className="space-y-2">
              <label className={labelClass}>Réseau</label>
              <select name="reseau" className={inputClass}>
                <option value="4G OK">4G OK</option>
                <option value="WiFi OK">WiFi OK</option>
                <option value="Cable requis">Zone blanche</option>
              </select>
            </div>
          )}
        </div>

        {showEtatTableau && (
          <div className="space-y-2">
            <label className={labelClass}>État tableau</label>
            <select name="etatTableau" className={inputClass}>
              <option value="OK">OK (conforme)</option>
              <option value="A remanier">À remanier (manque de place)</option>
              <option value="A remplacer">À remplacer / vétuste</option>
            </select>
          </div>
        )}

        {showDelesteur && (
          <label className="flex cursor-pointer items-center gap-3 rounded-[14px] bg-white p-4 ring-[1.5px] ring-[#dfe3e8]">
            <input type="checkbox" name="besoinDelesteur" className="h-5 w-5 accent-[#0097b2]" />
            <span className="text-[15px] font-semibold">Besoin d'un module délesteur</span>
          </label>
        )}
      </Carte>

      {/* CHEMINEMENT : 7 DISTANCES (masque en COP infra) */}
      {showCheminement && (
        <Carte className="space-y-5">
          <TitreCarte icon={Ruler}>Cheminement</TitreCarte>
          {aideVide}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className={labelClass}>Tube apparent (m)</label><input type="number" step="0.1" name="distApparent" placeholder="–" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Goulotte (m)</label><input type="number" step="0.1" name="distGoulotte" placeholder="–" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Encastré (m)</label><input type="number" step="0.1" name="distEncastre" placeholder="–" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Vide sanitaire (m)</label><input type="number" step="0.1" name="distVideSanitaire" placeholder="–" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Chemin de câbles (m)</label><input type="number" step="0.1" name="distCDC" placeholder="–" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Tirage existant (m)</label><input type="number" step="0.1" name="distTirage" placeholder="–" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Tranchée (m)</label><input type="number" step="0.1" name="distTranchee" placeholder="–" className={inputClass} /></div>
          </div>
        </Carte>
      )}

      {/* PERCEMENTS (tous) */}
      <Carte className="space-y-5">
        <TitreCarte icon={Hammer}>Percements à réaliser</TitreCarte>
        {aideVide}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><label className={labelClass}>Placo / bois</label><input type="number" name="percementPlaco" placeholder="–" className={inputClass} /></div>
          <div className="space-y-2"><label className={labelClass}>Brique / parpaing</label><input type="number" name="percementBrique" placeholder="–" className={inputClass} /></div>
          <div className="space-y-2"><label className={labelClass}>Béton / pierre</label><input type="number" name="percementBeton" placeholder="–" className={inputClass} /></div>
          <div className="space-y-2"><label className={labelClass}>Dalle / sol</label><input type="number" name="percementDalle" placeholder="–" className={inputClass} /></div>
        </div>
      </Carte>

      {/* INFRASTRUCTURE (COP infra) */}
      {showInfra && (
        <Carte className="space-y-5">
          <TitreCarte icon={Building2}>Infrastructure</TitreCarte>
          {aideVide}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className={labelClass}>Nb places parking</label><input type="number" name="nbPlacesParking" className={inputClass} placeholder="Ex : 24" /></div>
            <div className="space-y-2"><label className={labelClass}>Longueur artère (m)</label><input type="number" step="0.1" name="longueurArtere" className={inputClass} placeholder="Ex : 45" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className={labelClass}>TGBT vers TD (m)</label><input type="number" step="0.1" name="distTGBT" className={inputClass} placeholder="Ex : 12" /></div>
            <div className="space-y-2"><label className={labelClass}>Routeur vers TD (m)</label><input type="number" step="0.1" name="distRouteur" className={inputClass} placeholder="Ex : 5" /></div>
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Taille HUB</label>
            <select name="tailleHUB" className={inputClass}>
              <option value="">Non concerné</option>
              <option value="10">HUB 10</option>
              <option value="20">HUB 20</option>
              <option value="150">HUB 150</option>
            </select>
          </div>
        </Carte>
      )}

      {/* INSTALLATION : Support Borne (masque COP infra) + Zone Deplacement (tous) */}
      <Carte className="space-y-5">
        <TitreCarte icon={Plug}>Installation</TitreCarte>
        <div className="grid grid-cols-2 gap-4">
          {showSupportBorne && (
            <div className="space-y-2">
              <label className={labelClass}>Support de borne</label>
              <select name="murSupport" className={inputClass}>
                <option value="Mur Beton/Parpaing">Mur béton / parpaing</option>
                <option value="Mur Placo">Mur placo</option>
                <option value="Mur Bois">Mur bois</option>
                <option value="Sur Pied">Sur pied</option>
              </select>
            </div>
          )}
          <div className="space-y-2">
            <label className={labelClass}>Zone déplacement</label>
            <select name="zoneDepl" className={inputClass}>
              <option value="">À préciser</option>
              <option value="Z1">Z1 (max 30 min)</option>
              <option value="Z2">Z2 (30 min à 1 h)</option>
              <option value="Z3">Z3 (1 h à 1 h 30)</option>
            </select>
          </div>
        </div>
      </Carte>

      {/* PHOTOS TERRAIN : checklist guidee, multi-photos par emplacement */}
      <Carte className="space-y-5">
        <TitreCarte
          icon={Camera}
          extra={<span className="rounded-full bg-white px-3 py-1 text-[13px] font-bold" style={{ color: CYAN }}>{photosPrises}/{visiblePhotos.length}</span>}
        >
          Photos terrain
        </TitreCarte>
        <p className="text-[14px] leading-relaxed">Une ou plusieurs photos par emplacement, autant que nécessaire.</p>
        
        <div className="space-y-4">
          {visiblePhotos.map(p => {
            const shots = photos[p.key] || [];
            return (
              <div
                key={p.key}
                className={`space-y-3 rounded-[16px] bg-white p-4 ${shots.length > 0 ? '' : 'border-[1.5px] border-dashed border-[#c5ccd4]'}`}
                style={shots.length > 0 ? { boxShadow: `inset 5px 0 0 ${CYAN}` } : undefined}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[15px] font-bold">
                    {shots.length > 0 && <CheckCircle size={18} color={CYAN} />}
                    {p.label}
                  </span>
                  {shots.length > 0 && <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white" style={{ backgroundColor: CYAN }}>{shots.length} photo{shots.length > 1 ? 's' : ''}</span>}
                </div>

                {shots.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {shots.map((shot, i) => (
                      <div key={shot.id} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={shot.data} alt={`${p.label} ${i + 1}`} className="h-24 w-full rounded-[10px] object-cover" />
                        <button type="button" onClick={() => removePhoto(p.key, i)} aria-label="Supprimer la photo" className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-md active:scale-90" style={{ backgroundColor: NAVY }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative w-full overflow-hidden rounded-full p-3 text-center transition-colors" style={{ backgroundColor: CYAN_PALE }}>
                  <span className="flex items-center justify-center gap-2 text-[14px] font-semibold" style={{ color: LABEL }}>
                    <Camera size={18} /> {shots.length > 0 ? 'Ajouter une photo' : 'Prendre une photo'}
                  </span>
                  <input type="file" accept="image/*" capture="environment" multiple className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={(e) => handlePhotoChange(e, p.key)} />
                </div>
              </div>
            );
          })}
        </div>
      </Carte>

      {/* NOTES */}
      <Carte className="space-y-4">
        <TitreCarte icon={FileText}>Notes cheminement</TitreCarte>
        <textarea name="notes" rows={3} className={`${inputClass} resize-none`} placeholder="Ex : cheminement via les garages en sous-sol..."></textarea>
      </Carte>

      <BoutonPrincipal type="submit" disabled={status === "uploading" || !segment} inactif={!segment}>
        {status === "uploading" ? "Envoi en cours..." : !segment ? "Choisir un segment pour valider" : <><Send size={20} /> Valider le relevé</>}
      </BoutonPrincipal>

      {status === "error" && (
        <Alerte className="text-center">{erreurMsg || "Erreur réseau. Ne ferme pas la page, retrouve du réseau et appuie à nouveau sur Valider."}</Alerte>
      )}
    </form>
  );
}
