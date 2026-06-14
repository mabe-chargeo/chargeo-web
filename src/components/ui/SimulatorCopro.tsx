"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Building as BuildingIcon, Users as UsersIcon, Award as AwardIcon, Phone as PhoneIcon, PiggyBank } from 'lucide-react';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';

export function SimulatorCopro({ onResultChange }: { onResultChange?: (val: number, dataStr?: string) => void }) {
    const [parkingSpots, setParkingSpots] = useState(30);
  const [interestedResidents, setInterestedResidents] = useState(3);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isInView, setIsInView] = useState(false); 
  const [triggerKey, setTriggerKey] = useState(0);

  const resultsRef = useRef<HTMLDivElement>(null);

  // Calcul Subventions Copro
  const results = useMemo(() => {
    const safeParkingSpots = isNaN(parkingSpots) ? 0 : parkingSpots;
    const safeInterested = isNaN(interestedResidents) ? 0 : interestedResidents;
    const totalSubventions = 8000 + (safeInterested * 600);
    return { totalSubventions: Math.max(0, totalSubventions) };
  }, [parkingSpots, interestedResidents]);
  useEffect(() => {
    if (onResultChange) onResultChange(results.totalSubventions, `Places parking: ${parkingSpots}, Résidents motivés: ${interestedResidents}`);
  }, [results.totalSubventions, onResultChange, parkingSpots, interestedResidents]);

  const animatedSubventions = useAnimatedValue(results.totalSubventions, 1200, isInView, triggerKey);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    }, { threshold: 0.2 });

    if (resultsRef.current) observer.observe(resultsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setTriggerKey(prev => prev + 1);
    setIsPulsing(true);
    const pulseTimer = setTimeout(() => setIsPulsing(false), 300);
    return () => clearTimeout(pulseTimer);
  }, [parkingSpots, interestedResidents]);

  return (
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-4xl md:text-6xl font-black text-[#032b60] uppercase tracking-tighter">Estimez vos <br className="md:hidden"/><span className="text-[#0097b2]">subventions Advenir</span></h2>
        <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">Calculer le potentiel d'aides pour votre infrastructure collective et vos installations individuelles.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        
        {/* Boîte de contrôle gauche 1 : Taille du Parking */}
        <div className="order-1 lg:row-start-1 lg:col-start-1 h-65 sm:h-70 flex flex-col justify-center bg-slate-50 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8 transition-all hover:shadow-xl hover:-translate-y-1">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 text-[#032b60]">
                <BuildingIcon size={24} className="text-[#0097b2]" /> Taille du Parking
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">Nombre total de places disponibles.</p>
            </div>
            <span className={`text-3xl font-black text-[#0097b2] transition-transform duration-300 ${isPulsing ? 'scale-110' : 'scale-100'}`}>
              {parkingSpots} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">places</span>
            </span>
          </div>
          <input type="range" aria-label="Taille du parking" min="10" max="200" step="5" value={parkingSpots} onChange={(e) => setParkingSpots(parseInt(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
          <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest"><span>Petit parking</span><span>Grand parking</span></div>
        </div>
        
        {/* Boîte de contrôle gauche 2 : Résidents motivés */}
        <div className="order-2 lg:row-start-2 lg:col-start-1 h-65 sm:h-70 flex flex-col justify-center bg-slate-50 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8 transition-all hover:shadow-xl hover:-translate-y-1">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 text-[#032b60]">
                <UsersIcon size={24} className="text-[#0097b2]" /> Résidents motivés
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">Demandes de raccordement immédiat.</p>
            </div>
            <span className={`text-3xl font-black text-[#0097b2] transition-transform duration-300 ${isPulsing ? 'scale-110' : 'scale-100'}`}>
              {interestedResidents} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">demandes</span>
            </span>
          </div>
          <input type="range" aria-label="Résidents motivés" min="1" max={Math.min(50, parkingSpots)} step="1" value={interestedResidents} onChange={(e) => setInterestedResidents(parseInt(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
          <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest"><span>Initial</span><span>Évolutif</span></div>
        </div>

        {/* Boîte de résultats droite */}
        <div ref={resultsRef} className="order-3 lg:row-start-1 lg:col-start-2 lg:row-span-2 h-full flex flex-col justify-center bg-linear-to-br from-green-50 to-emerald-100 p-8 md:p-10 rounded-[2.5rem] border border-green-200 shadow-xl relative overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1">
          <PiggyBank className="absolute -right-10 -bottom-10 opacity-10 text-green-600 transition-transform duration-1000 hover:rotate-12" size={200} />
          <h3 className="text-green-800 text-sm font-black uppercase tracking-widest mb-2 relative z-10">Aides Advenir Estimées</h3>
          <div className="relative z-10">
             <span className={`text-6xl font-black text-green-600 transition-transform duration-300 ${isPulsing ? 'scale-105 text-emerald-500' : 'scale-100'} block`}>{Math.round(animatedSubventions).toLocaleString('fr-FR')} €</span>
             <p className="text-xs text-green-800/60 font-bold uppercase mt-2">*Jusqu'à 8000€ pour le collectif + 600€ par résident.</p>
          </div>
          <div className="space-y-3 relative z-10 pt-4 border-t border-green-200">
             <div className="flex justify-between text-xs font-bold uppercase"><span className="text-green-800/60">Infrastructure Collective</span><span className="text-green-900 font-black">Max 8 000€</span></div>
             <div className="flex justify-between text-xs font-bold uppercase"><span className="text-green-800/60">Primes Individuelles</span><span className="text-green-900 font-black">{interestedResidents * 600}€</span></div>
          </div>
          <button 
            onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
            className="relative overflow-hidden mt-6 bg-[#FF6B00] text-white py-4 rounded-full font-black text-base hover:scale-105 transition-all group z-10 active:scale-95 text-center"
          >
            <div className="animate-button-shine" />
            Créer un dossier AG <PhoneIcon size={18} className="inline ml-2" />
          </button>
        </div>

      </div>
    </div>
  );
}