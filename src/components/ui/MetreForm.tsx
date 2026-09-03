"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Send, CheckCircle, Zap, Ruler, Hammer, FileText, Building2, Tag, X, Plug } from 'lucide-react';

// Regle de depart : COP = toujours infra ; FLT/TER = borne complete
const INFRA_SEGMENTS = ['COP'];
const COPRO_PHOTO_SEGMENTS = ['COP', 'PAR', 'FLT', 'TER'];

// Checklist photos : les 5 premieres pour tous, les 4 suivantes pour copro/flotte/tertiaire
const PHOTOS = [
  { key: 'photoTableauFerme', label: 'Tableau ferme', scope: 'all' },
  { key: 'photoTableauOuvert', label: 'Tableau ouvert', scope: 'all' },
  { key: 'photoEmplacementBorne', label: 'Emplacement borne', scope: 'all' },
  { key: 'photoCompteurPDL', label: 'Compteur / PDL', scope: 'all' },
  { key: 'photoPriseTerre', label: 'Prise de terre', scope: 'all' },
  { key: 'photoTGBT', label: 'TGBT parties communes', scope: 'copro' },
  { key: 'photoArtere', label: 'Cheminement artere', scope: 'copro' },
  { key: 'photoParking', label: 'Vue parking', scope: 'copro' },
  { key: 'photoLocalTech', label: 'Local technique / TD', scope: 'copro' },
];

export function MetreForm({ taskId, taskName, initialSegment }: { taskId: string, taskName: string, initialSegment?: string }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [segment, setSegment] = useState(initialSegment || '');
  const [sourceRacc, setSourceRacc] = useState('');
  // Chaque emplacement -> tableau de photos (base64)
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
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

  // IndexedDB : une entree par emplacement = tableau de dataURLs base64
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

  const savePhotoArray = async (photoKey: string, arr: string[]) => {
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
    const newDataUrls: string[] = [];
    for (const file of files) {
      newDataUrls.push(await fileToDataUrl(file));
    }
    setPhotos(prev => {
      const updated = { ...prev, [photoKey]: [...(prev[photoKey] || []), ...newDataUrls] };
      savePhotoArray(photoKey, updated[photoKey]);
      return updated;
    });
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
  };

  // Restauration hors-ligne
  useEffect(() => {
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
    const loadPhotos = async () => {
      try {
        const db = await initDB();
        const getPhoto = (key: string): Promise<any> => new Promise(resolve => {
          const req = db.transaction('photos', 'readonly').objectStore('photos').get(`${taskId}_${key}`);
          req.onsuccess = () => resolve(req.result);
        });
        const restored: Record<string, string[]> = {};
        for (const p of PHOTOS) {
          const f = await getPhoto(p.key);
          if (Array.isArray(f)) restored[p.key] = f;
          else if (typeof f === 'string') restored[p.key] = [f];
        }
        setPhotos(restored);
      } catch (e) { console.error("Erreur chargement DB", e); }
    };
    loadPhotos();
  }, [taskId, initialSegment]);

  // Sauvegarde hors-ligne (textes + segment + source)
  const handleFormChange = () => {
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
  };

  useEffect(() => {
    handleFormChange();
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
    const formData = new FormData(e.currentTarget);
    formData.append("taskId", taskId);
    formData.append("segment", segment);
    formData.append("sourceRacc", sourceRacc);
    const checkbox = formRef.current?.elements.namedItem('besoinDelesteur') as HTMLInputElement;
    if (checkbox) formData.append('besoinDelesteur', checkbox.checked ? 'true' : 'false');
    // On retire tout eventuel champ fichier du POST principal (les photos partent separement)
    for (const p of PHOTOS) formData.delete(p.key);

    try {
      // 1) Envoi des CHAMPS (corps leger)
      const res = await fetch('/api/metre', { method: 'POST', body: formData });
      if (!res.ok) { setStatus("error"); return; }

      // 2) Envoi des PHOTOS une par une (depuis IndexedDB)
      const db = await initDB();
      const getPhoto = (key: string): Promise<any> => new Promise(resolve => {
        const req = db.transaction('photos', 'readonly').objectStore('photos').get(`${taskId}_${key}`);
        req.onsuccess = () => resolve(req.result);
      });

      let toutesEnvoyees = true;
      for (const p of PHOTOS) {
        const f = await getPhoto(p.key);
        const arr: string[] = Array.isArray(f) ? f : (typeof f === 'string' ? [f] : []);
        for (let i = 0; i < arr.length; i++) {
          const photoData = new FormData();
          photoData.append('taskId', taskId);
          photoData.append('photo', dataURLtoBlob(arr[i]), `${p.key}_${i}.jpg`);
          const pr = await fetch('/api/metre/photo', { method: 'POST', body: photoData });
          if (!pr.ok) toutesEnvoyees = false;
        }
      }

      if (!toutesEnvoyees) { setStatus("error"); return; }

      // 3) Succes complet : on purge le stockage local
      setStatus("success");
      localStorage.removeItem(`metreForm_${taskId}`);
      for (const p of PHOTOS) {
        db.transaction('photos', 'readwrite').objectStore('photos').delete(`${taskId}_${p.key}`);
      }
    } catch (error) {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="bg-green-50 text-green-700 p-8 rounded-3xl text-center space-y-4 shadow-sm border border-green-100">
        <CheckCircle size={48} className="mx-auto" />
        <h2 className="text-2xl font-black uppercase tracking-tight">Releve Transmis !</h2>
        <p className="font-medium text-sm">Le dossier de {taskName} a ete mis a jour dans ClickUp avec succes.</p>
      </div>
    );
  }

  const inputClass = "w-full font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-[#0097b2]";
  const labelClass = "text-[10px] font-bold text-slate-500 uppercase";
  const photosPrises = visiblePhotos.filter(p => (photos[p.key] || []).length > 0).length;

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={handleFormChange} className="space-y-6 pb-12">
      
      {/* SEGMENT */}
      <div className="bg-[#0097b2]/10 p-6 rounded-3xl border-2 border-[#0097b2]/30 space-y-3">
        <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2"><Tag size={18} className="text-[#0097b2]"/> Type de projet</h3>
        <select
          name="segment"
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="w-full font-black text-lg bg-white border-2 border-[#0097b2] rounded-xl p-4 outline-none text-[#032b60]"
        >
          <option value="">Choisir le segment...</option>
          <option value="RES">RES — Residentiel (maison)</option>
          <option value="DAP">DAP — Droit a la prise</option>
          <option value="COP">COP — Copro infrastructure</option>
          <option value="PAR">PAR — Borne partagee</option>
          <option value="FLT">FLT — Flotte entreprise</option>
          <option value="TER">TER — Tertiaire / ERP</option>
        </select>
      </div>

      {/* ELECTRICITE */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><Zap size={18} className="text-[#0097b2]"/> Electricite</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelClass}>Raccordement</label>
            <select name="typeRaccordement" className={inputClass}>
              <option value="Monophase">Monophase</option>
              <option value="Triphase">Triphase</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Puissance Dispo</label>
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
            <option value="">A preciser</option>
            <option value="Tableau individuel existant">Tableau individuel existant</option>
            <option value="TGBT services generaux existant">TGBT services generaux existant</option>
            <option value="PDL dedie">PDL dedie</option>
          </select>
        </div>

        {showPuissanceVisee && (
          <div className="space-y-2">
            <label className={labelClass}>Puissance Visee PDC</label>
            <select name="puissanceVisee" className={inputClass}>
              <option value="">A determiner</option>
              <option value="3.7">3,7 kW (prise renforcee)</option>
              <option value="7.4">7,4 kW (mono)</option>
              <option value="11">11 kW (tri)</option>
              <option value="22">22 kW (tri)</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelClass}>Terre (Ohms)</label>
            <input type="number" step="0.1" name="terre" required className={inputClass} placeholder="Ex: 45" />
          </div>
          {showReseau && (
            <div className="space-y-2">
              <label className={labelClass}>Reseau</label>
              <select name="reseau" className={inputClass}>
                <option value="4G OK">4G OK</option>
                <option value="WiFi OK">WiFi OK</option>
                <option value="Cable requis">Zone Blanche</option>
              </select>
            </div>
          )}
        </div>

        {showEtatTableau && (
          <div className="space-y-2">
            <label className={labelClass}>Etat Tableau</label>
            <select name="etatTableau" className={inputClass}>
              <option value="OK">OK (Conforme)</option>
              <option value="A remanier">A remanier (Manque de place)</option>
              <option value="A remplacer">A remplacer / Vetuste</option>
            </select>
          </div>
        )}

        {showDelesteur && (
          <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
            <input type="checkbox" name="besoinDelesteur" className="w-5 h-5 accent-[#FF6B00]" />
            <span className="text-sm font-bold text-slate-800">Besoin d'un module Delesteur</span>
          </label>
        )}
      </div>

      {/* CHEMINEMENT : 7 DISTANCES (masque en COP infra) */}
      {showCheminement && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
          <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><Ruler size={18} className="text-[#0097b2]"/> Cheminement</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className={labelClass}>Tube apparent (m)</label><input type="number" name="distApparent" defaultValue="0" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Goulotte (m)</label><input type="number" name="distGoulotte" defaultValue="0" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Encastre (m)</label><input type="number" name="distEncastre" defaultValue="0" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Vide sanitaire (m)</label><input type="number" name="distVideSanitaire" defaultValue="0" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Chemin de cables (m)</label><input type="number" name="distCDC" defaultValue="0" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Tirage existant (m)</label><input type="number" name="distTirage" defaultValue="0" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Tranchee (m)</label><input type="number" name="distTranchee" defaultValue="0" className={inputClass} /></div>
          </div>
        </div>
      )}

      {/* PERCEMENTS (tous) */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><Hammer size={18} className="text-[#0097b2]"/> Percements a realiser</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><label className={labelClass}>Placo / Bois</label><input type="number" name="percementPlaco" defaultValue="0" className={inputClass} /></div>
          <div className="space-y-2"><label className={labelClass}>Brique / Parpaing</label><input type="number" name="percementBrique" defaultValue="0" className={inputClass} /></div>
          <div className="space-y-2"><label className={labelClass}>Beton / Pierre</label><input type="number" name="percementBeton" defaultValue="0" className={inputClass} /></div>
          <div className="space-y-2"><label className={labelClass}>Dalle / Sol</label><input type="number" name="percementDalle" defaultValue="0" className={inputClass} /></div>
        </div>
      </div>

      {/* INFRASTRUCTURE (COP infra) */}
      {showInfra && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
          <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><Building2 size={18} className="text-[#0097b2]"/> Infrastructure</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className={labelClass}>Nb Places Parking</label><input type="number" name="nbPlacesParking" defaultValue="0" className={inputClass} placeholder="Ex: 24" /></div>
            <div className="space-y-2"><label className={labelClass}>Longueur Artere (m)</label><input type="number" name="longueurArtere" defaultValue="0" className={inputClass} placeholder="Ex: 45" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className={labelClass}>Dist. TGBT vers TD (m)</label><input type="number" name="distTGBT" defaultValue="0" className={inputClass} placeholder="Ex: 12" /></div>
            <div className="space-y-2"><label className={labelClass}>Dist. Routeur vers TD (m)</label><input type="number" name="distRouteur" defaultValue="0" className={inputClass} placeholder="Ex: 5" /></div>
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Taille HUB</label>
            <select name="tailleHUB" className={inputClass}>
              <option value="">Non concerne</option>
              <option value="10">HUB 10</option>
              <option value="20">HUB 20</option>
              <option value="150">HUB 150</option>
            </select>
          </div>
        </div>
      )}

      {/* INSTALLATION : Support Borne (masque COP infra) + Zone Deplacement (tous) */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><Plug size={18} className="text-[#0097b2]"/> Installation</h3>
        <div className="grid grid-cols-2 gap-4">
          {showSupportBorne && (
            <div className="space-y-2">
              <label className={labelClass}>Support de Borne</label>
              <select name="murSupport" className={inputClass}>
                <option value="Mur Beton/Parpaing">Mur Beton / Parpaing</option>
                <option value="Mur Placo">Mur Placo</option>
                <option value="Mur Bois">Mur Bois</option>
                <option value="Sur Pied">Sur Pied</option>
              </select>
            </div>
          )}
          <div className="space-y-2">
            <label className={labelClass}>Zone Deplacement</label>
            <select name="zoneDepl" className={inputClass}>
              <option value="">A preciser</option>
              <option value="Z1">Z1 (max 30 min)</option>
              <option value="Z2">Z2 (30 min a 1h)</option>
              <option value="Z3">Z3 (1h a 1h30)</option>
            </select>
          </div>
        </div>
      </div>

      {/* PHOTOS TERRAIN : checklist guidee, multi-photos par emplacement */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2"><Camera size={18} className="text-[#0097b2]"/> Photos Terrain</h3>
          <span className="text-[11px] font-black text-[#0097b2] bg-[#0097b2]/10 px-2 py-1 rounded-md">{photosPrises}/{visiblePhotos.length}</span>
        </div>
        <p className="text-[11px] text-slate-400 font-medium">Prends une ou plusieurs photos par emplacement. Tu peux en cumuler autant que necessaire.</p>
        
        <div className="space-y-5">
          {visiblePhotos.map(p => {
            const shots = photos[p.key] || [];
            return (
              <div key={p.key} className={`rounded-2xl border-2 p-4 space-y-3 ${shots.length > 0 ? 'bg-green-50 border-green-300' : 'bg-[#032b60]/5 border-dashed border-[#032b60]/30'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-[#032b60] flex items-center gap-2">
                    {shots.length > 0 && <CheckCircle size={16} className="text-green-600" />}
                    {p.label}
                  </span>
                  {shots.length > 0 && <span className="text-[10px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-md">{shots.length} photo{shots.length > 1 ? 's' : ''}</span>}
                </div>

                {shots.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {shots.map((src, i) => (
                      <div key={i} className="relative">
                        <img src={src} alt={`${p.label} ${i + 1}`} className="w-full h-24 object-cover rounded-lg shadow-sm" />
                        <button type="button" onClick={() => removePhoto(p.key, i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md active:scale-90">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative overflow-hidden w-full bg-white border border-[#0097b2]/40 rounded-xl p-3 text-center active:bg-[#0097b2]/5 transition-colors">
                  <span className="font-bold text-xs text-[#0097b2] flex items-center justify-center gap-2">
                    <Camera size={16} /> {shots.length > 0 ? 'Ajouter une photo' : 'Prendre une photo'}
                  </span>
                  <input type="file" accept="image/*" capture="environment" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handlePhotoChange(e, p.key)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* NOTES */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><FileText size={18} className="text-[#0097b2]"/> Notes Cheminement</h3>
        <textarea name="notes" rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none text-sm font-medium" placeholder="Ex: Cheminement via les garages en sous-sol..."></textarea>
      </div>

      <button type="submit" disabled={status === "uploading" || !segment} className={`w-full text-white font-black text-lg p-5 rounded-full flex items-center justify-center gap-3 active:scale-95 transition-all ${!segment ? 'bg-slate-300 shadow-none' : 'bg-[#FF6B00] shadow-[0_4px_14px_rgba(255,107,0,0.3)]'}`}>
        {status === "uploading" ? "Upload en cours..." : !segment ? "Choisir un segment pour valider" : <><Send size={20} /> Valider le Releve</>}
      </button>

      {status === "error" && <p className="text-red-500 font-bold text-center text-sm bg-red-50 border border-red-200 p-3 rounded-lg">Erreur reseau. Ne fermez pas la page, retrouvez du reseau et reessayez.</p>}
    </form>
  );
}
