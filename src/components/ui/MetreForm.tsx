"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Send, CheckCircle, Zap, Ruler, Hammer, FileText } from 'lucide-react';

export function MetreForm({ taskId, taskName }: { taskId: string, taskName: string }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const formRef = useRef<HTMLFormElement>(null);

  // Stockage temporaire des aperçus photo
  const [previewTableau, setPreviewTableau] = useState<string | null>(null);
  const [previewBorne, setPreviewBorne] = useState<string | null>(null);

  // INITIALISATION DE LA BASE LOCALE POUR SAUVER LES PHOTOS
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
    const file = e.target.files?.[0];
    const photoKey = e.target.name; // Récupère automatiquement 'photoTableau' ou 'photoBorne'
    if (file) {
      setPreview(URL.createObjectURL(file)); 
      
      // Sauvegarde l'image en texte brut (Base64) pour empêcher Apple de l'effacer
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async (event) => {
        const base64String = event.target?.result as string;
        try {
          const db = await initDB();
          db.transaction('photos', 'readwrite').objectStore('photos').put(base64String, `${taskId}_${photoKey}`);
        } catch (err) {
          console.error("Erreur IndexedDB:", err);
        }
      };
    }
  };

  // 💾 MAGIE HORS-LIGNE : Chargement des données quand on rouvre la page
  useEffect(() => {
    // On mémorise cet ID pour que l'app s'ouvre dessus directement depuis l'écran d'accueil !
    localStorage.setItem('last_visited_task', taskId);

    const savedData = localStorage.getItem(`metreForm_${taskId}`);
    if (savedData && formRef.current) {
      const parsed = JSON.parse(savedData);
      Object.keys(parsed).forEach(key => {
        const input = formRef.current?.elements.namedItem(key) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        // On restaure tout, sauf les photos (sécurité des navigateurs)
        if (input && input.type !== 'file') input.value = parsed[key];
      });
    }

    // Restauration des photos depuis la base locale
    const loadPhotos = async () => {
      try {
        const db = await initDB();
        const getPhoto = (key: string): Promise<string | undefined> => new Promise(resolve => {
          const req = db.transaction('photos', 'readonly').objectStore('photos').get(`${taskId}_${key}`);
          req.onsuccess = () => resolve(req.result);
        });

        const photoTab = await getPhoto('photoTableau');
        if (photoTab) setPreviewTableau(photoTab);

        const photoBorne = await getPhoto('photoBorne');
        if (photoBorne) setPreviewBorne(photoBorne);
      } catch (e) { console.error("Erreur chargement DB", e); }
    };
    loadPhotos();
  }, [taskId]);

  // 💾 MAGIE HORS-LIGNE : Sauvegarde invisible à chaque fois qu'on tape une lettre
  const handleFormChange = () => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const dataObj: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === 'string') dataObj[key] = value;
    });
    localStorage.setItem(`metreForm_${taskId}`, JSON.stringify(dataObj));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("uploading");
    
    const formData = new FormData(e.currentTarget);
    formData.append("taskId", taskId);

    // Outil pour retransformer le texte Base64 en vrai fichier (sans changer le poids)
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
      // On récupère les photos figées dans la mémoire
      const db = await initDB();
      const getPhoto = (key: string): Promise<string | undefined> => new Promise(resolve => {
        const req = db.transaction('photos', 'readonly').objectStore('photos').get(`${taskId}_${key}`);
        req.onsuccess = () => resolve(req.result);
      });

      const photoTab = await getPhoto('photoTableau');
      if (photoTab) formData.set('photoTableau', dataURLtoBlob(photoTab), 'tableau.jpg');

      const photoBorne = await getPhoto('photoBorne');
      if (photoBorne) formData.set('photoBorne', dataURLtoBlob(photoBorne), 'borne.jpg');

      const res = await fetch('/api/metre', {
        method: 'POST',
        body: formData, 
      });

      if (res.ok) {
        setStatus("success");
        // On vide la mémoire du téléphone une fois que c'est envoyé avec succès !
        localStorage.removeItem(`metreForm_${taskId}`);
        try {
          db.transaction('photos', 'readwrite').objectStore('photos').delete(`${taskId}_photoTableau`);
          db.transaction('photos', 'readwrite').objectStore('photos').delete(`${taskId}_photoBorne`);
        } catch(e) {}
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
        <h2 className="text-2xl font-black uppercase tracking-tight">Relevé Transmis !</h2>
        <p className="font-medium text-sm">Le dossier de {taskName} a été mis à jour dans ClickUp avec succès.</p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={handleFormChange} className="space-y-6 pb-12">
      
      {/* SECTION ÉLECTRICITÉ */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><Zap size={18} className="text-[#0097b2]"/> Électricité</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Terre (Ohms)</label>
            <input type="number" step="0.1" name="terre" required className="w-full font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-[#0097b2]" placeholder="Ex: 45" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Puissance Dispo</label>
            <select name="puissance" className="w-full font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none">
              <option value="6 kVA">6 kVA</option>
              <option value="9 kVA">9 kVA</option>
              <option value="12 kVA">12 kVA</option>
              <option value="18 kVA et plus">18 kVA et plus</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">État Tableau</label>
            <select name="etatTableau" className="w-full font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none">
              <option value="OK">OK</option>
              <option value="A remanier">À remanier</option>
              <option value="A remplacer">À remplacer / Saturé</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Réseau</label>
            <select name="reseau" className="w-full font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none">
              <option value="4G OK">4G OK</option>
              <option value="WiFi OK">WiFi OK</option>
              <option value="Câble requis">Zone Blanche (Câble requis)</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION DISTANCES */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><Ruler size={18} className="text-[#0097b2]"/> Câblage (mètres)</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Apparent / Tube</label>
            <input type="number" name="distApparent" defaultValue="0" className="w-full font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Vide Sanitaire</label>
            <input type="number" name="distVideSanitaire" defaultValue="0" className="w-full font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Tranchée</label>
            <input type="number" name="distTranchee" defaultValue="0" className="w-full font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase">PERCEMENTS (BÉTON)</label>
            <input type="number" name="nbPercements" defaultValue="1" className="w-full font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none" />
          </div>
        </div>
      </div>

      {/* SECTION INSTALLATION */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><Hammer size={18} className="text-[#0097b2]"/> Installation</h3>
        
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Support de Borne</label>
          <select name="murSupport" required className="w-full font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none">
            <option value="Mur Béton/Parpaing">Mur Béton / Parpaing</option>
            <option value="Mur Placo">Mur Placo</option>
            <option value="Mur Bois">Mur Bois</option>
            <option value="Sur Pied (Pied à sceller)">Sur Pied (Pied à sceller)</option>
          </select>
        </div>
      </div>

      {/* SECTION PHOTOS AVEC APERÇU */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><Camera size={18} className="text-[#0097b2]"/> Photos Terrain</h3>
        
        <div className="space-y-4">
          {/* Photo Tableau */}
          <div className="relative overflow-hidden w-full bg-[#032b60]/5 border-2 border-dashed border-[#032b60]/30 rounded-2xl p-4 text-center active:bg-[#032b60]/10 transition-colors">
            {previewTableau ? (
              <img src={previewTableau} alt="Aperçu Tableau" className="w-full h-40 object-cover rounded-xl mb-3 shadow-sm" />
            ) : (
              <Camera size={32} className="mx-auto text-[#032b60] mb-2" />
            )}
            <span className="font-black text-sm text-[#032b60]">
              {previewTableau ? "📸 Reprendre la photo" : "Tableau Ouvert (Obligatoire)"}
            </span>
            <input type="file" name="photoTableau" accept="image/*" capture="environment" required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handlePhotoChange(e, setPreviewTableau)} />
          </div>

          {/* Photo Borne */}
          <div className="relative overflow-hidden w-full bg-[#032b60]/5 border-2 border-dashed border-[#032b60]/30 rounded-2xl p-4 text-center active:bg-[#032b60]/10 transition-colors">
            {previewBorne ? (
              <img src={previewBorne} alt="Aperçu Borne" className="w-full h-40 object-cover rounded-xl mb-3 shadow-sm" />
            ) : (
              <Camera size={32} className="mx-auto text-[#032b60] mb-2" />
            )}
            <span className="font-black text-sm text-[#032b60]">
              {previewBorne ? "📸 Reprendre la photo" : "Emplacement Borne"}
            </span>
            <input type="file" name="photoBorne" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handlePhotoChange(e, setPreviewBorne)} />
          </div>
        </div>
      </div>

      {/* SECTION NOTES */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-3"><FileText size={18} className="text-[#0097b2]"/> Notes Cheminement</h3>
        <textarea name="notes" rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none text-sm font-medium" placeholder="Ex: Cheminement via les garages en sous-sol..."></textarea>
      </div>

      <button type="submit" disabled={status === "uploading"} className="w-full bg-[#FF6B00] text-white font-black text-lg p-5 rounded-full shadow-[0_4px_14px_rgba(255,107,0,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all">
        {status === "uploading" ? "Upload en cours..." : <><Send size={20} /> Valider le Relevé</>}
      </button>

      {status === "error" && <p className="text-red-500 font-bold text-center text-sm bg-red-50 border border-red-200 p-3 rounded-lg">Erreur réseau. Ne fermez pas la page, retrouvez du réseau et réessayez.</p>}
    </form>
  );
}