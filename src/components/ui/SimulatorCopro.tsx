"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Building as BuildingIcon, Users as UsersIcon, Award as AwardIcon, Phone as PhoneIcon } from 'lucide-react';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';

export function SimulatorCopro() {
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
      
      <div className="grid lg:grid-cols-2 gap-10">
        <div className="bg-slate-50 p-10 rounded-[2.5rem] border shadow-sm space-y-8 transition-all hover:shadow-xl">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-lg font-black uppercase text-[#032b60] flex items-center gap-2">
                <BuildingIcon size={24} className="text-[#0097b2]" /> Taille du Parking
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase italic">Nombre total de places</p>
            </div>
            <span className="text-3xl font-black text-[#0097b2]">{parkingSpots} <span className="text-sm text-slate-400">places</span></span>
          </div>
          <input type="range" min="10" max="200" step="5" value={parkingSpots} onChange={(e) => setParkingSpots(parseInt(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
          
          <div className="flex justify-between items-end pt-4 border-t border-slate-200">
            <div>
              <h3 className="text-lg font-black uppercase text-[#032b60] flex items-center gap-2">
                <UsersIcon size={24} className="text-[#0097b2]" /> Résidents motivés
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase italic">Demandes de raccordement immédiat</p>
            </div>
            <span className="text-3xl font-black text-[#0097b2]">{interestedResidents} <span className="text-sm text-slate-400">demandes</span></span>
          </div>
          <input type="range" min="1" max={Math.min(50, parkingSpots)} step="1" value={interestedResidents} onChange={(e) => setInterestedResidents(parseInt(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
        </div>

        <div ref={resultsRef} className="bg-[#032b60] p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white flex flex-col justify-center gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#0097b2]/20 rounded-full blur-[80px] -mr-20 -mt-20"></div>
          <h3 className="text-sm font-black uppercase text-blue-200 flex items-center gap-3 relative z-10"><AwardIcon size={18}/> Aides Advenir Estimées</h3>
          <div className="relative z-10">
             <span className={`text-6xl font-black text-[#0097b2] transition-transform duration-300 ${isPulsing ? 'scale-105' : 'scale-100'} block`}>{Math.round(animatedSubventions).toLocaleString('fr-FR')} €</span>
             <p className="text-xs text-white/50 font-bold uppercase mt-2">*Jusqu'à 8000€ pour le collectif + 600€ par résident.</p>
          </div>
          <div className="space-y-3 relative z-10 pt-4 border-t border-white/10">
             <div className="flex justify-between text-xs font-bold uppercase"><span className="text-white/50">Infrastructure Collective</span><span>Max 8 000€</span></div>
             <div className="flex justify-between text-xs font-bold uppercase"><span className="text-white/50">Primes Individuelles</span><span>{interestedResidents * 600}€</span></div>
          </div>
          <button 
            onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
            className="relative overflow-hidden mt-6 bg-[#FF6B00] text-white py-4 rounded-full font-black text-base hover:scale-105 transition-all group z-10 active:scale-95"
          >
            <div className="animate-button-shine" />
            Étude technique AG <PhoneIcon size={18} className="inline ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}