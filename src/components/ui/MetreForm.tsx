"use client";

// Relevé terrain : LOGIQUE INCHANGÉE (matrice d'affichage, hors-ligne, envoi /api/metre puis photos).
// 10/10/2026 : habillage charte 2026 via les briques communes (src/components/charte/Appli.tsx).
// Les attributs value des menus ne changent pas (la route /api/metre les convertit en index ClickUp) :
// seuls les libellés affichés retrouvent leurs accents.
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Send, CheckCircle, Zap, Ruler, Hammer, FileText, Building2, Tag, X, Plug } from 'lucide-react';
import { Carte, TitreCarte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { NAVY, CYAN, LABEL, CYAN_PALE } from '@/components/charte/couleurs';

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
      <Carte className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[16px] text-white" style={{ backgroundColor: CYAN }}>
          <CheckCircle size={32} />
        </div>
        <h2 className="text-[24px] font-bold">Relevé transmis !</h2>
        <p className="text-[15px] leading-relaxed">Le dossier de {taskName} a été mis à jour dans ClickUp.</p>
        <a href="/interne" className="mt-2 text-[15px] font-semibold underline underline-offset-4" style={{ color: LABEL }}>Retour au planning</a>
      </Carte>
    );
  }

  const inputClass = CHAMP;
  const labelClass = ETIQUETTE;
  const photosPrises = visiblePhotos.filter(p => (photos[p.key] || []).length > 0).length;

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={handleFormChange} className="space-y-5 pb-12" style={{ color: NAVY }}>
      
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
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className={labelClass}>Tube apparent (m)</label><input type="number" name="distApparent" defaultValue="0" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Goulotte (m)</label><input type="number" name="distGoulotte" defaultValue="0" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Encastré (m)</label><input type="number" name="distEncastre" defaultValue="0" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Vide sanitaire (m)</label><input type="number" name="distVideSanitaire" defaultValue="0" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Chemin de câbles (m)</label><input type="number" name="distCDC" defaultValue="0" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Tirage existant (m)</label><input type="number" name="distTirage" defaultValue="0" className={inputClass} /></div>
            <div className="space-y-2"><label className={labelClass}>Tranchée (m)</label><input type="number" name="distTranchee" defaultValue="0" className={inputClass} /></div>
          </div>
        </Carte>
      )}

      {/* PERCEMENTS (tous) */}
      <Carte className="space-y-5">
        <TitreCarte icon={Hammer}>Percements à réaliser</TitreCarte>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><label className={labelClass}>Placo / bois</label><input type="number" name="percementPlaco" defaultValue="0" className={inputClass} /></div>
          <div className="space-y-2"><label className={labelClass}>Brique / parpaing</label><input type="number" name="percementBrique" defaultValue="0" className={inputClass} /></div>
          <div className="space-y-2"><label className={labelClass}>Béton / pierre</label><input type="number" name="percementBeton" defaultValue="0" className={inputClass} /></div>
          <div className="space-y-2"><label className={labelClass}>Dalle / sol</label><input type="number" name="percementDalle" defaultValue="0" className={inputClass} /></div>
        </div>
      </Carte>

      {/* INFRASTRUCTURE (COP infra) */}
      {showInfra && (
        <Carte className="space-y-5">
          <TitreCarte icon={Building2}>Infrastructure</TitreCarte>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className={labelClass}>Nb places parking</label><input type="number" name="nbPlacesParking" defaultValue="0" className={inputClass} placeholder="Ex : 24" /></div>
            <div className="space-y-2"><label className={labelClass}>Longueur artère (m)</label><input type="number" name="longueurArtere" defaultValue="0" className={inputClass} placeholder="Ex : 45" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className={labelClass}>TGBT vers TD (m)</label><input type="number" name="distTGBT" defaultValue="0" className={inputClass} placeholder="Ex : 12" /></div>
            <div className="space-y-2"><label className={labelClass}>Routeur vers TD (m)</label><input type="number" name="distRouteur" defaultValue="0" className={inputClass} placeholder="Ex : 5" /></div>
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
                    {shots.map((src, i) => (
                      <div key={i} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`${p.label} ${i + 1}`} className="h-24 w-full rounded-[10px] object-cover" />
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
        <Alerte className="text-center">Erreur réseau. Ne fermez pas la page, retrouvez du réseau et réessayez.</Alerte>
      )}
    </form>
  );
}
