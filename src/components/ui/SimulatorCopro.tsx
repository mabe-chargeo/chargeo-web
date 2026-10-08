"use client";

// Simulateur Copropriétés, charte 2026. Barème, props et texte envoyé au CRM inchangés.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { NAVY, ORANGE, BLEU_CLAIR, CYAN_CLAIR, CARTE } from '@/components/charte/Charte';
import { Curseur, EnteteSimu } from '@/components/charte/Simu';

// Barème ADVENIR résidentiel collectif en vigueur depuis le 1er avril 2026 (source : advenir.mobi, communiqué du 23/03/2026)
// - Infrastructure collective : 50 % des coûts HT, plafond 12 500 € jusqu'à 100 places, + 125 € par place au-delà
// - Point de recharge individuel : 50 % des coûts HT, plafond 1 000 €
// Applicable si le vote en AG est intervenu à partir du 1er avril 2026 (PV d'AG faisant foi).
// 08/10/2026 (audit) : le résultat est présenté comme un PLAFOND d'aides, pas comme un montant acquis (calcul et texte CRM inchangés).
const ADVENIR_INFRA_PLAFOND = 12500;
const ADVENIR_INFRA_PAR_PLACE_SUP = 125;
const ADVENIR_PDC_INDIVIDUEL = 1000;

export function SimulatorCopro({ onResultChange }: { onResultChange?: (val: number, dataStr?: string) => void }) {
  const [parkingSpots, setParkingSpots] = useState(30);
  const [interestedResidents, setInterestedResidents] = useState(3);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [triggerKey, setTriggerKey] = useState(0);

  const resultsRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const safeParkingSpots = isNaN(parkingSpots) ? 0 : parkingSpots;
    const safeInterested = isNaN(interestedResidents) ? 0 : interestedResidents;
    const plafondInfra = ADVENIR_INFRA_PLAFOND + Math.max(0, safeParkingSpots - 100) * ADVENIR_INFRA_PAR_PLACE_SUP;
    const primesIndividuelles = safeInterested * ADVENIR_PDC_INDIVIDUEL;
    const totalSubventions = plafondInfra + primesIndividuelles;
    return { totalSubventions: Math.max(0, totalSubventions), plafondInfra, primesIndividuelles };
  }, [parkingSpots, interestedResidents]);

  useEffect(() => {
    if (onResultChange) onResultChange(results.totalSubventions, `Places parking: ${parkingSpots}, Résidents motivés: ${interestedResidents}`);
  }, [results.totalSubventions, onResultChange, parkingSpots, interestedResidents]);

  const animatedSubventions = useAnimatedValue(results.totalSubventions, 1200, isInView, triggerKey);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), { threshold: 0.2 });
    if (resultsRef.current) observer.observe(resultsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setTriggerKey(prev => prev + 1);
    setIsPulsing(true);
    const pulseTimer = setTimeout(() => setIsPulsing(false), 300);
    return () => clearTimeout(pulseTimer);
  }, [parkingSpots, interestedResidents]);

  const maxResidents = Math.min(50, parkingSpots);

  return (
    <div className="mx-auto max-w-7xl px-6" style={{ color: NAVY }}>
      <EnteteSimu titre="Évaluez vos subventions ADVENIR." texte="Calculez le potentiel d’aides pour votre infrastructure collective et pour les bornes de vos résidents." />

      <div className="mt-12 grid gap-7 lg:grid-cols-5">
        <div className="flex flex-col justify-center space-y-10 rounded-[24px] p-7 sm:p-9 lg:col-span-3" style={CARTE}>
          <Curseur label="Taille du parking" aide="Nombre total de places du parking." valeur={String(parkingSpots)} unite="places" min={10} max={200} step={5} value={parkingSpots} onChange={(v) => { const p = Math.round(v); setParkingSpots(p); if (interestedResidents > Math.min(50, p)) setInterestedResidents(Math.min(50, p)); }} gauche="Petit parking" droite="Grand parking" aria="Taille du parking" />
          <Curseur label="Résidents motivés" aide="Demandes de raccordement dès le départ." valeur={String(interestedResidents)} unite={interestedResidents > 1 ? "demandes" : "demande"} min={1} max={maxResidents} step={1} value={interestedResidents} onChange={(v) => setInterestedResidents(Math.round(v))} gauche="Initial" droite="Évolutif" aria="Résidents motivés" />
        </div>

        <div ref={resultsRef} className="flex flex-col justify-between rounded-[24px] p-7 sm:p-9 lg:col-span-2" style={{ backgroundColor: NAVY }}>
          <div>
            <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: CYAN_CLAIR }}>Plafond des aides ADVENIR</p>
            <p className={`mt-3 text-[52px] font-bold leading-none text-white transition-transform duration-300 sm:text-[60px] ${isPulsing ? 'scale-[1.03]' : ''}`}>
              {Math.round(animatedSubventions).toLocaleString('fr-FR')}<span className="text-[24px]"> € HT</span>
            </p>
            <div className="mt-6 space-y-3 border-t border-white/15 pt-5 text-[15px]">
              <div className="flex justify-between gap-4"><span style={{ color: BLEU_CLAIR }}>Infrastructure collective</span><span className="font-semibold text-white">max {results.plafondInfra.toLocaleString('fr-FR')} €</span></div>
              <div className="flex justify-between gap-4"><span style={{ color: BLEU_CLAIR }}>Primes individuelles</span><span className="font-semibold text-white">max {results.primesIndividuelles.toLocaleString('fr-FR')} €</span></div>
            </div>
            <p className="mt-5 text-[13px] leading-relaxed" style={{ color: BLEU_CLAIR }}>Plafonds HT du barème ADVENIR au 1er avril 2026. L’aide réelle est de 50 % des coûts éligibles, dans la limite de 12 500 € pour le collectif (+125 € par place au-delà de 100) et de 1 000 € par borne individuelle, sous réserve d’éligibilité et de validation du dossier avant travaux.</p>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })}
            className="group mt-8 inline-flex items-center justify-between rounded-full px-6 py-4 text-[16px] font-semibold text-white transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: ORANGE, boxShadow: '0 8px 22px rgba(255,107,0,0.28)' }}
          >
            Créer un dossier AG <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
