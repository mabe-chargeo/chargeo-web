"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, MapPin, RefreshCw } from 'lucide-react';

interface Chantier {
  id: string;
  nom: string;
  adresse: string;
}

export default function InternePage() {
  const router = useRouter();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);

  const [erreur, setErreur] = useState<string | null>(null);

  const chargerPlanning = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch('/api/chantiers');
      const data = await res.json();
      if (Array.isArray(data)) {
        setChantiers(data);
      } else if (data.error) {
        setErreur(data.error); // On capte l'erreur envoyée par l'API
      }
    } catch (e) {
      setErreur("Impossible de joindre le serveur.");
    } finally {
      setLoading(false); // C'est ÇA qui manquait pour arrêter la roue infinie !
    }
  };

  // On charge juste le planning au démarrage
  useEffect(() => {
    chargerPlanning();
  }, []);

  const handleSelectChantier = (id: string) => {
    // 🚨 ASTUCE ANTI-APPLE : On utilise window.location au lieu de router.push
    // Ça force le téléphone à télécharger la page complète, ce qui permet au Service Worker de la capturer pour le mode hors-ligne !
    window.location.href = `/interne/metre/${id}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <RefreshCw className="animate-spin text-[#0097b2] mx-auto" size={32} />
          <p className="text-sm font-bold text-slate-500">Chargement du planning terrain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      {/* Header */}
      <div className="bg-[#032b60] text-white px-6 pb-6 pt-12 shadow-lg rounded-b-[2rem] mb-6 flex justify-between items-end">
        <div>
          <p className="text-cyan-300 font-black uppercase tracking-widest text-[10px]">Espace Technique</p>
          <h1 className="text-2xl font-black leading-tight">Mon Planning</h1>
        </div>
        <button onClick={chargerPlanning} className="p-3 bg-white/10 rounded-full active:scale-95 transition-all">
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Liste des chantiers */}
      <main className="px-4 max-w-lg mx-auto space-y-4">
        {erreur && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-bold text-sm border border-red-200">
            {erreur}
          </div>
        )}
        
        {!erreur && chantiers.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-slate-200 text-slate-400 font-medium">
            <ClipboardList className="mx-auto mb-2 text-slate-300" size={40} />
            Aucune visite technique à l'ordre du jour.
          </div>
        ) : (
          chantiers.map((chantier) => (
            <button
              key={chantier.id}
              onClick={() => handleSelectChantier(chantier.id)}
              className="w-full bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-left flex flex-col gap-2 active:scale-[0.98] active:bg-slate-50 transition-all"
            >
              <div className="flex justify-between items-start w-full">
                <span className="font-black text-slate-800 text-lg leading-tight">{chantier.nom}</span>
                <span className="bg-cyan-50 text-[#0097b2] font-black text-[10px] uppercase px-2 py-1 rounded-md tracking-wider">Métré</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                <MapPin size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">{chantier.adresse}</span>
              </div>
            </button>
          ))
        )}
      </main>
    </div>
  );
}