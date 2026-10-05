"use client";

// Simulateur Particuliers, charte 2026. Calculs, props et texte envoyé au CRM inchangés.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowRight, Clock, Zap } from 'lucide-react';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { AnimatedBar } from '@/components/ui/AnimatedBar';
import { NAVY, ORANGE, BLEU_CLAIR, CYAN_CLAIR, CARTE } from '@/components/charte/Charte';
import { Curseur, Reglages, EnteteSimu } from '@/components/charte/Simu';

export function SimulatorParticuliers({ onResultChange }: { onResultChange?: (val: number, dataStr?: string) => void }) {
  const [dailyKm, setDailyKm] = useState(40);
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

    return { annualSavings: Math.max(0, annualSavings), timeStandard, timeWallbox, wallboxTimePercent };
  }, [dailyKm, gasConsumption, gasPrice, elecPrice, evConsumption]);

  useEffect(() => {
    if (onResultChange) onResultChange(results.annualSavings, `Trajets: ${dailyKm}km/j, Conso: ${gasConsumption}L/100, Essence: ${gasPrice}€, Elec: ${elecPrice}€, Conso VE: ${evConsumption}kWh/100`);
  }, [results.annualSavings, onResultChange, dailyKm, gasConsumption, gasPrice, elecPrice, evConsumption]);

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

  const fr = (n: number, d = 2) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="mx-auto max-w-7xl px-6" style={{ color: NAVY }}>
      <EnteteSimu titre="Calculez vos économies." texte="Découvrez ce que rouler à l’électrique vous fait gagner face au carburant, puis demandez votre devis personnalisé." />

      <div className="mt-12 grid gap-7 lg:grid-cols-5">
        <div className="space-y-9 rounded-[24px] p-7 sm:p-9 lg:col-span-3" style={CARTE}>
          <Curseur label="Trajet quotidien" aide="Plus vous roulez, plus la borne est rentable." valeur={String(dailyKm)} unite="km/j" min={5} max={150} step={5} value={dailyKm} onChange={(v) => setDailyKm(Math.round(v))} gauche="Petit rouleur" droite="Gros rouleur" aria="Distance quotidienne" />
          <Curseur label="Consommation thermique" aide="Le carburant pèse lourd dans le budget." valeur={fr(gasConsumption, 1)} unite="L/100" min={4} max={12} step={0.5} value={gasConsumption} onChange={setGasConsumption} gauche="Citadine (4 L)" droite="Grand SUV (12 L)" aria="Consommation thermique" />
          <Reglages ouvert={showAdvancedSettings} onToggle={() => setShowAdvancedSettings(!showAdvancedSettings)} libelle="Personnaliser les coûts (électricité, VE…)">
            <Curseur label="Prix moyen au litre" valeur={fr(gasPrice)} unite="€/L" min={1.4} max={2.5} step={0.01} value={gasPrice} onChange={setGasPrice} gauche="1,40 €" droite="2,50 €" aria="Prix du carburant" />
            <Curseur label="Prix moyen du kWh" valeur={fr(elecPrice)} unite="€/kWh" min={0.1} max={0.4} step={0.01} value={elecPrice} onChange={setElecPrice} gauche="Heures creuses" droite="Heures pleines" aria="Prix de l'électricité" />
            <Curseur label="Consommation du VE" valeur={fr(evConsumption, 1)} unite="kWh/100" min={10} max={30} step={0.5} value={evConsumption} onChange={setEvConsumption} gauche="Citadine (12)" droite="Gros SUV (25+)" aria="Consommation véhicule électrique" />
          </Reglages>
        </div>

        <div ref={resultsRef} className="flex flex-col gap-7 lg:col-span-2">
          <div className="flex flex-col justify-between rounded-[24px] p-7 sm:p-9" style={{ backgroundColor: NAVY }}>
            <div>
              <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: CYAN_CLAIR }}>Vos économies estimées</p>
              <p className={`mt-3 text-[52px] font-bold leading-none text-white transition-transform duration-300 sm:text-[60px] ${isPulsing ? 'scale-[1.03]' : ''}`}>
                +{Math.round(animatedSavings).toLocaleString('fr-FR')}<span className="text-[24px]"> € / an</span>
              </p>
              <p className="mt-4 text-[15px] leading-relaxed" style={{ color: BLEU_CLAIR }}>Estimation indicative, jointe automatiquement à votre demande de rappel.</p>
            </div>
            <button
              type="button"
              onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })}
              className="group mt-8 inline-flex items-center justify-between rounded-full px-6 py-4 text-[16px] font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: ORANGE, boxShadow: '0 8px 22px rgba(255,107,0,0.28)' }}
            >
              Demander à être rappelé(e) <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="rounded-[24px] p-7 sm:p-9" style={CARTE}>
            <p className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: '#007f96' }}>
              <Clock size={16} /> Temps de charge pour vos {dailyKm} km
            </p>
            <div className="mt-6 space-y-6">
              <div>
                <div className="flex justify-between text-[15px] font-semibold"><span>Prise standard</span><span>{formatTime(animatedTimeStd)}</span></div>
                <AnimatedBar percent={100} isVisible={isInView} triggerKey={triggerKey} delay={800} wrapperClass="mt-2 w-full bg-white rounded-full h-2.5 overflow-hidden" innerClass="bg-[#a9b4c2] h-full rounded-full" />
              </div>
              <div>
                <div className="flex justify-between text-[15px] font-semibold"><span className="flex items-center gap-2"><Zap size={16} color="#0097b2" /> Borne 7,4 kW</span><span className="text-[20px] font-bold" style={{ color: '#007f96' }}>{formatTime(animatedTimeWallbox)}</span></div>
                <AnimatedBar percent={results.wallboxTimePercent} isVisible={isInView} triggerKey={triggerKey} delay={950} wrapperClass="mt-2 w-full bg-white rounded-full h-2.5 overflow-hidden" innerClass="bg-[#0097b2] h-full rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
