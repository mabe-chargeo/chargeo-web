"use client";

// Planning terrain : logique inchangée (/api/chantiers, redirection window.location pour le hors-ligne).
// 10/10/2026 : habillage charte 2026 (en-tête navy + logo blanc, cartes #eceef1, Poppins).
import { useEffect, useState } from 'react';
import { ChevronRight, ClipboardList, MapPin, RefreshCw } from 'lucide-react';

const NAVY = '#032b60';
const CYAN = '#0097b2';

interface Chantier {
  id: string;
  nom: string;
  adresse: string;
}

export default function InternePage() {
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
      setLoading(false); // Arrête la roue de chargement dans tous les cas
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

  return (
    <div className="min-h-screen bg-white pb-12 font-sans antialiased" style={{ color: NAVY }}>
      {/* En-tête */}
      <header className="px-6 pb-8 pt-10" style={{ backgroundColor: NAVY }}>
        <div className="mx-auto flex max-w-lg items-start justify-between gap-4">
          <div>
            <img src="/logo-chargeo-blanc.svg" alt="CHARGéO" className="h-9 w-auto" />
            <p className="mt-6 text-[12px] font-extrabold uppercase tracking-[0.14em]" style={{ color: '#7fd3e2' }}>Espace technique</p>
            <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.015em] text-white">Mon planning</h1>
          </div>
          <button
            onClick={chargerPlanning}
            aria-label="Actualiser le planning"
            className="mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-transform active:scale-95"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 pt-6">
        <div className="flex items-center gap-3 px-1">
          <span className="block h-[8px] w-[64px] rounded-[4px]" style={{ backgroundColor: CYAN }} />
          <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]">Visites à réaliser</p>
        </div>

        {loading && (
          <div className="rounded-[20px] p-8 text-center" style={{ backgroundColor: '#eceef1' }}>
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement du planning terrain...</p>
          </div>
        )}

        {!loading && erreur && (
          <p role="alert" className="rounded-[14px] bg-white px-4 py-3 text-[15px] font-semibold leading-relaxed ring-[1.5px] ring-[#dfe3e8]" style={{ boxShadow: 'inset 4px 0 0 #FF6B00' }}>
            {erreur}
          </p>
        )}

        {!loading && !erreur && chantiers.length === 0 && (
          <div className="rounded-[20px] p-8 text-center" style={{ backgroundColor: '#eceef1' }}>
            <ClipboardList className="mx-auto mb-3" size={40} color={CYAN} strokeWidth={1.6} />
            <p className="text-[15px] font-semibold">Aucune visite technique à l'ordre du jour.</p>
          </div>
        )}

        {!loading && !erreur && chantiers.map((chantier) => (
          <button
            key={chantier.id}
            onClick={() => handleSelectChantier(chantier.id)}
            className="flex w-full items-center gap-4 rounded-[20px] p-5 text-left transition-transform active:scale-[0.98]"
            style={{ backgroundColor: '#eceef1' }}
          >
            <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: CYAN }}>
              <ClipboardList size={22} color="#ffffff" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 grow">
              <p className="text-[17px] font-bold leading-tight">{chantier.nom}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[13px]">
                <MapPin size={14} className="shrink-0" color={CYAN} />
                <span className="truncate">{chantier.adresse}</span>
              </p>
            </div>
            <ChevronRight size={22} className="shrink-0" color={CYAN} />
          </button>
        ))}
      </main>
    </div>
  );
}
