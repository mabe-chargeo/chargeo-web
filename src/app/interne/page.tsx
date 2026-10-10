"use client";

// Planning terrain : logique inchangée (/api/chantiers, redirection window.location pour le hors-ligne).
// 10/10/2026 : habillage charte 2026 via les briques communes de l'application (src/components/charte/Appli.tsx).
import { useEffect, useState } from 'react';
import { ChevronRight, ClipboardList, MapPin, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte } from '@/components/charte/Appli';
import { CYAN, GRIS } from '@/components/charte/couleurs';

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

  const boutonActualiser = (
    <button
      onClick={chargerPlanning}
      aria-label="Actualiser le planning"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-transform active:scale-95"
    >
      <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
    </button>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Espace technique" titre="Mon planning" action={boutonActualiser} />

      <ContenuAppli className="space-y-4">
        <Repere>Visites à réaliser</Repere>

        {loading && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement du planning terrain...</p>
          </Carte>
        )}

        {!loading && erreur && <Alerte>{erreur}</Alerte>}

        {!loading && !erreur && chantiers.length === 0 && (
          <Carte className="p-8 text-center">
            <ClipboardList className="mx-auto mb-3" size={40} color={CYAN} strokeWidth={1.6} />
            <p className="text-[15px] font-semibold">Aucune visite technique à l'ordre du jour.</p>
          </Carte>
        )}

        {!loading && !erreur && chantiers.map((chantier) => (
          <button
            key={chantier.id}
            onClick={() => handleSelectChantier(chantier.id)}
            className="flex w-full items-center gap-4 rounded-[20px] p-5 text-left transition-transform active:scale-[0.98]"
            style={{ backgroundColor: GRIS }}
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
      </ContenuAppli>
    </PageAppli>
  );
}
