"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plug, Users, Settings, PiggyBank, Phone } from 'lucide-react';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';

export function SimulatorPro() {
  const [chargePoints, setChargePoints] = useState(4);
  const [sessionsPerDay, setSessionsPerDay] = useState(2);
  const [marginPerKwh, setMarginPerKwh] = useState(0.20);
  const [kwhPerSession, setKwhPerSession] = useState(25);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [isPulsing, setIsPulsing] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [triggerKey, setTriggerKey] = useState(0);

  const resultsRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const safeChargePoints = isNaN(chargePoints) ? 0 : chargePoints;
    const safeSessions = isNaN(sessionsPerDay) ? 0 : sessionsPerDay;
    const safeMargin = isNaN(marginPerKwh) ? 0 : marginPerKwh;
    const safeKwh = isNaN(kwhPerSession) ? 0 : kwhPerSession;
    const annualRevenue = safeChargePoints * safeSessions * safeKwh * safeMargin * 300;
    return { annualRevenue: Math.max(0, annualRevenue) };
  }, [chargePoints, sessionsPerDay, marginPerKwh, kwhPerSession]);

  const animatedRevenue = useAnimatedValue(results.annualRevenue, 1200, isInView, triggerKey);

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
  }, [chargePoints, sessionsPerDay, marginPerKwh, kwhPerSession]);

  return (
    <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
      <h2 className="text-4xl md:text-6xl font-black text-[#032b60] uppercase tracking-tighter mb-16">
        Estimez vos <br className="md:hidden"/><span className="text-[#0097b2]">revenus de recharge</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-8 bg-slate-50 p-8 md:p-10 rounded-[2.5rem] border border-slate-100">
          <div className="flex justify-between items-end">
            <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 text-[#032b60]">
              <Plug className="text-[#0097b2]" size={24}/> Points de charge
            </h3>
            <span className={`text-3xl font-black text-[#0097b2] transition-transform duration-300 ${isPulsing ? 'scale-110' : ''}`}>
              {chargePoints} <span className="text-sm text-slate-400 font-bold">places</span>
            </span>
          </div>
          <input type="range" min="1" max="20" value={chargePoints} onChange={(e) => setChargePoints(parseInt(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />

          <div className="flex justify-between items-end pt-4 border-t border-slate-200">
            <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 text-[#032b60]">
              <Users className="text-[#0097b2]" size={24}/> Taux de rotation
            </h3>
            <span className={`text-3xl font-black text-[#0097b2] transition-transform duration-300 ${isPulsing ? 'scale-110' : ''}`}>
              {sessionsPerDay} <span className="text-sm text-slate-400 font-bold">sessions/j</span>
            </span>
          </div>
          <input type="range" min="1" max="10" value={sessionsPerDay} onChange={(e) => setSessionsPerDay(parseInt(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />

          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="w-full flex items-center justify-center gap-2 text-slate-400 font-bold text-sm pt-4"
          >
            <Settings size={14} /> {showAdvancedSettings ? "Masquer les réglages" : "Ajuster la marge (kWh)"}
          </button>

          {showAdvancedSettings && (
            <div className="pt-4 space-y-6">
              <div className="flex justify-between text-xs font-black uppercase text-slate-500"><span>Marge nette</span><span>{marginPerKwh.toFixed(2)} €/kWh</span></div>
              <input type="range" min="0.05" max="0.50" step="0.01" value={marginPerKwh} onChange={(e) => setMarginPerKwh(parseFloat(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-[#0097b2]" />
            </div>
          )}
        </div>

        <div ref={resultsRef} className="bg-linear-to-br from-green-50 to-emerald-100 p-8 md:p-10 rounded-[2.5rem] border border-green-200 shadow-xl flex flex-col justify-center relative overflow-hidden">
          <PiggyBank className="absolute -right-10 -bottom-10 opacity-10 text-green-600" size={200} />
          <h3 className="text-green-800 text-sm font-black uppercase tracking-widest mb-2 relative z-10">Revenus nets générés</h3>
          <div className={`flex items-baseline justify-center gap-2 relative z-10 transition-all duration-300 ${isPulsing ? 'scale-105' : ''}`}>
            <span className="text-6xl md:text-7xl font-black text-green-600 tracking-tighter">+{Math.round(animatedRevenue).toLocaleString('fr-FR')}</span>
            <span className="text-2xl font-black text-green-700">€ / an</span>
          </div>
          <p className="text-xs text-green-800/70 font-bold mt-4 relative z-10">*Basé sur 300 jours d'ouverture par an.</p>
          <button
            onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })}
            className="relative overflow-hidden mt-8 w-full bg-[#FF6B00] hover:bg-[#E66000] text-white py-4 rounded-full font-black text-lg shadow-lg group z-10 transition-all"
          >
            <div className="animate-button-shine" />
            Audit B2B Gratuit <Phone size={18} className="inline ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}