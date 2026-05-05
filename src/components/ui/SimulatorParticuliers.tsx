"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, ChevronDown, Car, Flame, PiggyBank, Phone, Clock, Zap } from 'lucide-react';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { AnimatedBar } from '@/components/ui/AnimatedBar';

export function SimulatorParticuliers({ onResultChange }: { onResultChange?: (val: number) => void }) {  const [dailyKm, setDailyKm] = useState(40);
  const [gasConsumption, setGasConsumption] = useState(6.5);
  const [gasPrice, setGasPrice] = useState(1.85);
  const [elecPrice, setElecPrice] = useState(0.25);
  const [evConsumption, setEvConsumption] = useState(16);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [isPulsing, setIsPulsing] = useState(false);
  const [isInView, setIsInView] = useState(false); 
  const [triggerKey, setTriggerKey] = useState(0);

  const resultsRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const safeDailyKm = isNaN(dailyKm) ? 0 : dailyKm;
    const safeGasCons = isNaN(gasConsumption) ? 0 : gasConsumption;
    const safeGasPrice = isNaN(gasPrice) ? 0 : gasPrice;
    const safeEvCons = isNaN(evConsumption) ? 0 : evConsumption;
    const safeElecPrice = isNaN(elecPrice) ? 0 : elecPrice;

    const dailyGasCost = (safeDailyKm / 100) * safeGasCons * safeGasPrice;
    const dailyEvCost = (safeDailyKm / 100) * safeEvCons * safeElecPrice;
    const annualSavings = (dailyGasCost - dailyEvCost) * 365;
    
    const energyNeeded = (safeDailyKm / 100) * safeEvCons;
    const timeStandard = energyNeeded / 2.3; 
    const timeWallbox = energyNeeded / 7.4; 
    const wallboxTimePercent = timeStandard > 0 ? (timeWallbox / timeStandard) * 100 : 0;

    return { 
      annualSavings: Math.max(0, annualSavings), 
      timeStandard, 
      timeWallbox, 
      wallboxTimePercent 
    };
  }, [dailyKm, gasConsumption, gasPrice, elecPrice, evConsumption]);
  useEffect(() => {
    if (onResultChange) onResultChange(results.annualSavings);
  }, [results.annualSavings, onResultChange]);

  const animatedSavings = useAnimatedValue(results.annualSavings, 1200, isInView, triggerKey);
  const animatedTimeStd = useAnimatedValue(results.timeStandard, 1200, isInView, triggerKey);
  const animatedTimeWallbox = useAnimatedValue(results.timeWallbox, 1200, isInView, triggerKey);

  const formatTime = (decimalHours: number) => {
    if (isNaN(decimalHours) || decimalHours === Infinity) return "0 min";
    const hrs = Math.floor(decimalHours);
    const mins = Math.round((decimalHours - hrs) * 60);
    if (mins === 60) return `${hrs + 1} h 00`;
    if (hrs === 0 && mins === 0) return `0 min`;
    if (hrs === 0) return `${mins} min`;
    if (mins === 0) return `${hrs} h`;
    return `${hrs} h ${mins.toString().padStart(2, '0')}`;
  };

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
  }, [dailyKm, gasConsumption, gasPrice, elecPrice, evConsumption]);

  return (
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-4xl md:text-6xl font-black text-[#032b60] uppercase tracking-tighter leading-tight">
          Simulez vos <br className="md:hidden"/><span className="text-[#0097b2]">économies</span>
        </h2>
        <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto text-balance">
          Découvrez à quel point rouler à l'électrique est rentable face aux prix du carburant, puis demandez votre devis personnalisé.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        
        <div className="order-1 lg:row-start-1 lg:col-start-1 h-65 sm:h-70 flex flex-col justify-center bg-slate-50 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8 transition-all hover:shadow-xl hover:-translate-y-1">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 text-[#032b60]">
                <Car className="text-[#0097b2]" size={24}/> Trajet Quotidien
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">Plus vous roulez, plus la borne est rentable.</p>
            </div>
            <span className={`text-3xl font-black text-[#0097b2] transition-transform duration-300 ${isPulsing ? 'scale-110' : 'scale-100'}`}>
              {dailyKm} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">km/j</span>
            </span>
          </div>
          <input type="range" aria-label="Distance quotidienne" min="5" max="150" step="5" value={dailyKm} onChange={(e) => setDailyKm(parseInt(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
          <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest"><span>Petit rouleur</span><span>Gros rouleur</span></div>
        </div>

        <div className="order-2 lg:row-start-2 lg:col-start-1 h-65 sm:h-70 flex flex-col justify-center bg-slate-50 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8 transition-all hover:shadow-xl hover:-translate-y-1">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 text-[#032b60]">
                <Flame className="text-[#0097b2]" size={24}/> Conso. Thermique
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">Le carburant pèse lourd dans le budget.</p>
            </div>
            <span className={`text-3xl font-black text-[#0097b2] transition-transform duration-300 ${isPulsing ? 'scale-110' : 'scale-100'}`}>
              {gasConsumption} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">L/100</span>
            </span>
          </div>
          <input type="range" aria-label="Consommation thermique" min="4" max="12" step="0.5" value={gasConsumption} onChange={(e) => setGasConsumption(parseFloat(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
          <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-tighter"><span>Citadine (4L)</span><span>Grand SUV (12L)</span></div>
        </div>

        <div className="order-3 lg:row-start-3 lg:col-start-1 w-full">
           <button 
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              aria-expanded={showAdvancedSettings ? "true" : "false"}
              className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-[#0097b2] text-slate-500 hover:text-[#0097b2] hover:shadow-md px-6 py-4 rounded-full font-bold text-sm transition-all shadow-sm"
           >
              <Settings size={18} className={`transition-transform duration-700 ${showAdvancedSettings ? 'rotate-90' : 'rotate-0'}`} />
              {showAdvancedSettings ? "Masquer les réglages avancés" : "Personnaliser les coûts (Électricité, VE...)"}
              <ChevronDown size={18} className={`transition-transform duration-300 ${showAdvancedSettings ? 'rotate-180' : ''}`} />
           </button>

           <div className={`transition-all duration-500 overflow-hidden ${showAdvancedSettings ? 'max-h-200 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className="bg-slate-50 border border-slate-100 p-6 md:p-8 rounded-[2.5rem] shadow-inner flex flex-col gap-8">
                 
                 <div className="space-y-4">
                   <div className="flex justify-between items-end">
                     <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Prix moyen au litre</span>
                     <span className="text-lg font-black text-[#0097b2]">{gasPrice.toFixed(2)}<span className="text-xs"> €/L</span></span>
                   </div>
                   <input type="range" aria-label="Prix du carburant" min="1.4" max="2.5" step="0.01" value={gasPrice} onChange={(e) => setGasPrice(parseFloat(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
                   <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest"><span>1.40 €</span><span>2.50 €</span></div>
                 </div>

                 <div className="space-y-4">
                   <div className="flex justify-between items-end">
                     <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Prix moyen du kWh</span>
                     <span className="text-lg font-black text-[#0097b2]">{elecPrice.toFixed(2)}<span className="text-xs"> €/kWh</span></span>
                   </div>
                   <input type="range" aria-label="Prix de l'électricité" min="0.10" max="0.40" step="0.01" value={elecPrice} onChange={(e) => setElecPrice(parseFloat(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
                   <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest"><span>Heures Creuses</span><span>Heures Pleines</span></div>
                 </div>

                 <div className="space-y-4">
                   <div className="flex justify-between items-end">
                     <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Consommation du VE</span>
                     <span className="text-lg font-black text-[#0097b2]">{evConsumption.toFixed(1)}<span className="text-xs"> kWh/100</span></span>
                   </div>
                   <input type="range" aria-label="Consommation véhicule électrique" min="10" max="30" step="0.5" value={evConsumption} onChange={(e) => setEvConsumption(parseFloat(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
                   <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest"><span>Citadine (12)</span><span>Gros SUV (25+)</span></div>
                 </div>

              </div>
           </div>
        </div>

        <div ref={resultsRef} className="order-4 lg:row-start-1 lg:col-start-2 h-full flex flex-col justify-center bg-linear-to-br from-green-50 to-emerald-100 p-8 md:p-10 rounded-[2.5rem] border border-green-200 shadow-xl relative overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1">
          <PiggyBank className="absolute -right-10 -bottom-10 opacity-10 text-green-600 transition-transform duration-1000 hover:rotate-12" size={200} />
          <h3 className="text-green-800 text-sm font-black uppercase tracking-widest mb-2 relative z-10">Vos économies estimées</h3>
          <div className={`flex items-baseline gap-2 relative z-10 transition-all duration-300 ${isPulsing ? 'scale-105 text-emerald-500 translate-x-2' : 'scale-100 text-green-600'}`}>
            <span className="text-6xl md:text-7xl font-black tracking-tighter">+{Math.round(animatedSavings).toLocaleString('fr-FR')}</span>
            <span className="text-2xl font-black text-green-700">€ / an</span>
          </div>
          <button 
            onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
            className="relative overflow-hidden mt-8 w-full inline-flex items-center justify-center gap-3 bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-black text-sm sm:text-base shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 active:scale-95 transition-all group z-10"
          >
            <div className="animate-button-shine" />
            Demander à être rappelé(e) <Phone size={18} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>

        <div className="order-5 lg:row-start-2 lg:col-start-2 h-full flex flex-col justify-center bg-[#032b60] p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white border border-white/5 hover:shadow-[0_20px_50px_rgba(3,43,96,0.5)] transition-all hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#0097b2]/20 rounded-full blur-[80px] -mr-20 -mt-20"></div>
          <h3 className="text-sm font-black uppercase tracking-widest text-blue-200 mb-8 flex items-center gap-3 relative z-10"><Clock size={18}/> Temps de charge pour vos {dailyKm} km</h3>
          <div className="space-y-8 relative z-10">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold"><span className="text-slate-400">Prise standard (Maison)</span><span className="text-red-400 font-black">{formatTime(animatedTimeStd)}</span></div>
              <AnimatedBar percent={100} isVisible={isInView} triggerKey={triggerKey} delay={800} wrapperClass="w-full bg-white/10 rounded-full h-3 overflow-hidden p-[1px]" innerClass="bg-red-500 h-full rounded-full" />
            </div>
            <div className="space-y-2 pt-4 border-t border-white/10">
              <div className="flex justify-between text-sm font-bold"><span className="text-white flex items-center gap-2 font-black uppercase tracking-wider italic text-xs"><Zap size={16} className="text-[#0097b2]"/> Borne Intelligente (7.4kW)</span><span className="text-[#0097b2] text-xl font-black">{formatTime(animatedTimeWallbox)}</span></div>
              <AnimatedBar percent={results.wallboxTimePercent} isVisible={isInView} triggerKey={triggerKey} delay={950} wrapperClass="w-full bg-white/10 rounded-full h-4 overflow-hidden p-[2px]" innerClass="bg-gradient-to-r from-[#0097b2] to-cyan-300 h-full rounded-full shadow-[0_0_20px_rgba(0,151,178,0.4)]" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}