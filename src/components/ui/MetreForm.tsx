"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Send, CheckCircle, Zap, Ruler, Hammer, FileText, Building2, Tag } from 'lucide-react';

const INFRA_SEGMENTS = ['COP', 'FLT', 'TER'];

export function MetreForm({ taskId, taskName, initialSegment }: { taskId: string, taskName: string, initialSegment?: string }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [segment, setSegment] = useState(initialSegment || '');
  const formRef = useRef<HTMLFormElement>(null);

  const [previewTableau, setPreviewTableau] = useState<string | null>(null);
  const [previewBorne, setPreviewBorne] = useState<string | null>(null);

  const showInfra = INFRA_SEGMENTS.includes(segment);

  // IndexedDB pour les photos
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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>, setPreview: React.Dispatch<React.SetStateAction<string | null>>, photoKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        try {
          const db = await initDB();
          db.transaction('photos', 'readwrite').objectStore('photos').put(dataUrl, `${taskId}_${photoKey}`);
        } catch (err) {
          console.error("Erreur IndexedDB:", err);
        }
      };
    };
  };

  // Restauration hors-ligne
  useEffect(() => {
    localStorage.setItem('last_visited_task', taskId);
    const savedData = localStorage.getItem(`metreForm_${taskId}`);
    if (savedData && formRef.current) {
      const parsed = JSON.parse(savedData);
      // Restaurer le segment sauvegard\u00e9 s'il n'y a pas de valeur ClickUp
      if (parsed.segment && !initialSegment) {
        setSegment(parsed.segment);
      }
      Object.keys(parsed).forEach(key => {
        if (key === 'segment') return; // G\u00e9r\u00e9 via useState
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
        const fileTableau = await getPhoto('photoTableau');
        if (typeof fileTableau === 'string') setPreviewTableau(fileTableau);
        else if (fileTableau instanceof File || fileTableau instanceof Blob) setPreviewTableau(URL.createObjectURL(fileTableau));
        const fileBorne = await getPhoto('photoBorne');
        if (typeof fileBorne === 'string') setPreviewBorne(fileBorne);
        else if (fileBorne instanceof File || fileBorne instanceof Blob) setPreviewBorne(URL.createObjectURL(fileBorne));
      } catch (e) { console.error("Erreur chargement DB", e); }
    };
    loadPhotos();
  }, [taskId, initialSegment]);

  // Sauvegarde hors-ligne (textes + segment)
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
    localStorage.setItem(`metreForm_${taskId}`, JSON.stringify(dataObj));
  };

  // Sauvegarder quand le segment change
  useEffect(() => {
    handleFormChange();
  }, [segment]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("uploading");
    const formData = new FormData(e.currentTarget);
    formData.append("taskId", taskId);
    formData.append("segment", segment);
    const checkbox = formRef.current?.elements.namedItem('besoinDelesteur') as HTMLInputElement;
    if (checkbox) formData.append('besoinDelesteur', checkbox.checked ? 'true' : 'false');

    const dataURLtoBlob = (dataurl: string) => {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      return new Blob([u8arr], { type: mime });
    };

    try {
      const db = await initDB();
      const getPhoto = (key: string): Promise<any> => new Promise(resolve => {
        const req = db.transaction('photos', 'readonly').objectStore('photos').get(`${taskId}_${key}`);
        req.onsuccess = () => resolve(req.result);
      });
      const fileTableau = await getPhoto('photoTableau');
      const fileBorne = await getPhoto('photoBorne');
      if (typeof fileTableau === 'string') formData.set('photoTableau', dataURLtoBlob(fileTableau), 'tableau.jpg');
      else if (fileTableau) formData.set('photoTableau', fileTableau);
      if (typeof fileBorne === 'string') formData.set('photoBorne', dataURLtoBlob(fileBorne), 'borne.jpg');
      else if (fileBorne) formData.set('photoBorne', fileBorne);

      const res = await fetch('/api/metre', { method: 'POST', body: formData });
      if (res.ok) {
        setStatus("success");
        localStorage.removeItem(`metreForm_${taskId}`);
        db.transaction('photos', 'readwrite').objectStore('photos').delete(`${taskId}_photoTableau`);
        db.transaction('photos', 'readwrite').objectStore('photos').delete(`${taskId}_photoBorne`);
      } else {
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="bg-green-50 text-green-700 p-8 rounded-3xl text-center space-y-4 shadow-sm border border-green-100">
        <CheckCircle size={48} className="mx-auto" />
        <h2 className="text-2xl font-black uppercase tracking-tight">Relev\u00e9 Transmis !</h2>
        <p className="font-medium text-sm">Le dossier de {taskName} a \u00e9t\u00e9 mis \u00e0 jour dans ClickUp avec succ\u00e8s.</p>
      </div>
    );
  }

  const inputClass = "w-full font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-[#0097b2]";
  const labelClass = "text-[10px] font-bold text-slate-500 uppercase";

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
          <option value="RES">RES \u2014 R\u00e9sidentiel (maison)</option>
          <option value="DAP">DAP \u2014 Droit \u00e0 la prise</option>
          <option value="COP">COP \u2014 Copro infrastructure</option>
          <option value="PAR">PAR \u2014 Borne partag\u00e9e</option>
          <option value="FLT">FLT \u2014 Flotte entreprise</option>
          <option value="TER">TER \u2014 Tertiaire / ERP</option>
        </select>
      </div>

      {/* \u00c9LECTRICIT\u00c9 */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><Zap size={18} className="text-[#0097b2]"/> \u00c9lectricit\u00e9</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelClass}>Raccordement</label>
            <select name="typeRaccordement" className={inputClass}>
              <option value="Monophas\u00e9">Monophas\u00e9</option>
              <option value="Triphas\u00e9">Triphas\u00e9</option>
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
          <label className={labelClass}>Puissance Vis\u00e9e PDC</label>
          <select name="puissanceVisee" className={inputClass}>
            <option value="">\u00c0 d\u00e9terminer</option>
            <option value="3.7">3,7 kW (prise renforc\u00e9e)</option>
            <option value="7.4">7,4 kW (mono)</option>
            <option value="11">11 kW (tri)</option>
            <option value="22">22 kW (tri)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelClass}>Terre (Ohms)</label>
            <input type="number" step="0.1" name="terre" required className={inputClass} placeholder="Ex: 45" />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>R\u00e9seau</label>
            <select name="reseau" className={inputClass}>
              <option value="4G OK">4G OK</option>
              <option value="WiFi OK">WiFi OK</option>
              <option value="C\u00e2ble requis">Zone Blanche</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className={labelClass}>\u00c9tat Tableau</label>
          <select name="etatTableau" className={inputClass}>
            <option value="OK">OK (Conforme)</option>
            <option value="A remanier">\u00c0 remanier (Manque de place)</option>
            <option value="A remplacer">\u00c0 remplacer / V\u00e9tuste</option>
          </select>
        </div>

        <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
          <input type="checkbox" name="besoinDelesteur" className="w-5 h-5 accent-[#FF6B00]" />
          <span className="text-sm font-bold text-slate-800">Besoin d'un module D\u00e9lesteur</span>
        </label>
      </div>

      {/* CHEMINEMENT : 7 DISTANCES */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><Ruler size={18} className="text-[#0097b2]"/> Cheminement</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelClass}>Tube apparent (m)</label>
            <input type="number" name="distApparent" defaultValue="0" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Goulotte (m)</label>
            <input type="number" name="distGoulotte" defaultValue="0" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Encastr\u00e9 (m)</label>
            <input type="number" name="distEncastre" defaultValue="0" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Vide sanitaire (m)</label>
            <input type="number" name="distVideSanitaire" defaultValue="0" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Chemin de c\u00e2bles (m)</label>
            <input type="number" name="distCDC" defaultValue="0" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Tirage existant (m)</label>
            <input type="number" name="distTirage" defaultValue="0" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Tranch\u00e9e (m)</label>
            <input type="number" name="distTranchee" defaultValue="0" className={inputClass} />
          </div>
        </div>

        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">Percements \u00e0 r\u00e9aliser</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelClass}>Placo / Bois</label>
            <input type="number" name="percementPlaco" defaultValue="0" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Brique / Parpaing</label>
            <input type="number" name="percementBrique" defaultValue="0" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>B\u00e9ton / Pierre</label>
            <input type="number" name="percementBeton" defaultValue="0" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Dalle / Sol</label>
            <input type="number" name="percementDalle" defaultValue="0" className={inputClass} />
          </div>
        </div>
      </div>

      {/* INFRASTRUCTURE COPRO (conditionnel) */}
      {showInfra && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
          <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><Building2 size={18} className="text-[#0097b2]"/> Infrastructure</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={labelClass}>Nb Places Parking</label>
              <input type="number" name="nbPlacesParking" defaultValue="0" className={inputClass} placeholder="Ex: 24" />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Longueur Art\u00e8re (m)</label>
              <input type="number" name="longueurArtere" defaultValue="0" className={inputClass} placeholder="Ex: 45" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={labelClass}>Dist. TGBT \u2192 TD (m)</label>
              <input type="number" name="distTGBT" defaultValue="0" className={inputClass} placeholder="Ex: 12" />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Dist. Routeur \u2192 TD (m)</label>
              <input type="number" name="distRouteur" defaultValue="0" className={inputClass} placeholder="Ex: 5" />
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelClass}>Taille HUB</label>
            <select name="tailleHUB" className={inputClass}>
              <option value="">Non concern\u00e9</option>
              <option value="10">HUB 10</option>
              <option value="20">HUB 20</option>
              <option value="150">HUB 150</option>
            </select>
          </div>
        </div>
      )}

      {/* INSTALLATION */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><Hammer size={18} className="text-[#0097b2]"/> Installation</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelClass}>Support de Borne</label>
            <select name="murSupport" required className={inputClass}>
              <option value="Mur B\u00e9ton/Parpaing">Mur B\u00e9ton / Parpaing</option>
              <option value="Mur Placo">Mur Placo</option>
              <option value="Mur Bois">Mur Bois</option>
              <option value="Sur Pied">Sur Pied</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Zone D\u00e9placement</label>
            <select name="zoneDepl" className={inputClass}>
              <option value="">\u2014</option>
              <option value="Z1">Z1 (\u2264 30 min)</option>
              <option value="Z2">Z2 (30 min \u00e0 1h)</option>
              <option value="Z3">Z3 (1h \u00e0 1h30)</option>
            </select>
          </div>
        </div>
      </div>

      {/* PHOTOS */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><Camera size={18} className="text-[#0097b2]"/> Photos Terrain</h3>
        <div className="space-y-4">
          <div className="relative overflow-hidden w-full bg-[#032b60]/5 border-2 border-dashed border-[#032b60]/30 rounded-2xl p-4 text-center active:bg-[#032b60]/10 transition-colors">
            {previewTableau ? (
              <img src={previewTableau} alt="Aper\u00e7u Tableau" className="w-full h-40 object-cover rounded-xl mb-3 shadow-sm" />
            ) : (
              <Camera size={32} className="mx-auto text-[#032b60] mb-2" />
            )}
            <span className="font-black text-sm text-[#032b60]">
              {previewTableau ? "\ud83d\udcf8 Reprendre la photo" : "Tableau Ouvert (Obligatoire)"}
            </span>
            <input type="file" name="photoTableau" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handlePhotoChange(e, setPreviewTableau, 'photoTableau')} />
          </div>
          <div className="relative overflow-hidden w-full bg-[#032b60]/5 border-2 border-dashed border-[#032b60]/30 rounded-2xl p-4 text-center active:bg-[#032b60]/10 transition-colors">
            {previewBorne ? (
              <img src={previewBorne} alt="Aper\u00e7u Borne" className="w-full h-40 object-cover rounded-xl mb-3 shadow-sm" />
            ) : (
              <Camera size={32} className="mx-auto text-[#032b60] mb-2" />
            )}
            <span className="font-black text-sm text-[#032b60]">
              {previewBorne ? "\ud83d\udcf8 Reprendre la photo" : "Emplacement Borne"}
            </span>
            <input type="file" name="photoBorne" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handlePhotoChange(e, setPreviewBorne, 'photoBorne')} />
          </div>
        </div>
      </div>

      {/* NOTES */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><FileText size={18} className="text-[#0097b2]"/> Notes Cheminement</h3>
        <textarea name="notes" rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none text-sm font-medium" placeholder="Ex: Cheminement via les garages en sous-sol..."></textarea>
      </div>

      <button type="submit" disabled={status === "uploading" || !segment} className={`w-full text-white font-black text-lg p-5 rounded-full flex items-center justify-center gap-3 active:scale-95 transition-all ${!segment ? 'bg-slate-300 shadow-none' : 'bg-[#FF6B00] shadow-[0_4px_14px_rgba(255,107,0,0.3)]'}`}>
        {status === "uploading" ? "Upload en cours..." : !segment ? "Choisir un segment pour valider" : <><Send size={20} /> Valider le Relev\u00e9</>}
      </button>

      {status === "error" && <p className="text-red-500 font-bold text-center text-sm bg-red-50 border border-red-200 p-3 rounded-lg">Erreur r\u00e9seau. Ne fermez pas la page, retrouvez du r\u00e9seau et r\u00e9essayez.</p>}
    </form>
  );
}
