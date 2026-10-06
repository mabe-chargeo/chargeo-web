"use client";

// Simulateur Entreprises, charte 2026 : économies de la flotte (électricité contre carburant).
// Remplace l'ancien calcul de revenus de recharge (décision Matthieu du 05/10/2026).
// Props inchangées : onResultChange(valeur, réglages) alimente toujours la barre mobile et le ContactForm.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { NAVY, ORANGE, BLEU_CLAIR, CYAN_CLAIR, CARTE } from '@/components/charte/Charte';
import { Curseur, Reglages, EnteteSimu } from '@/components/charte/Simu';

export function SimulatorPro({ onResultChange }: { onResultChange?: (val: number, dataStr?: string) => void }) {
  const [vehicules, setVehicules] = useState(5);
  const [kmAn, setKmAn] = useState(25000);
  const [consoThermique, setConsoThermique] = useState(6.5);
  const [prixCarburant, setPrixCarburant] = useState(1.75);
  const [prixKwh, setPrixKwh] = useState(0.2);
  const [consoVe, setConsoVe] = useState(18);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [isPulsing, setIsPulsing] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [triggerKey, setTriggerKey] = useState(0);

  const resultsRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const n = isNaN(vehicules) ? 0 : vehicules;
    const km = isNaN(kmAn) ? 0 : kmAn;
    const coutCarburant = (km / 100) * (isNaN(consoThermique) ? 0 : consoThermique) * (isNaN(prixCarburant) ? 0 : prixCarburant);
    const coutElec = (km / 100) * (isNaN(consoVe) ? 0 : consoVe) * (isNaN(prixKwh) ? 0 : prixKwh);
    const parVehicule = Math.max(0, coutCarburant - coutElec);
    return { parVehicule, total: parVehicule * n, coutCarburant: coutCarburant * n, coutElec: coutElec * n };
  }, [vehicules, kmAn, consoThermique, prixCarburant, prixKwh, consoVe]);

  useEffect(() => {
    if (onResultChange) onResultChange(results.total, `Véhicules: ${vehicules}, Km/an/véhicule: ${kmAn}, Conso: ${consoThermique}L/100, Carburant: ${prixCarburant}€, Elec: ${prixKwh}€/kWh, Conso VE: ${consoVe}kWh/100`);
  }, [results.total, onResultChange, vehicules, kmAn, consoThermique, prixCarburant, prixKwh, consoVe]);

  const animatedTotal = useAnimatedValue(results.total, 1200, isInView, triggerKey);

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
  }, [vehicules, kmAn, consoThermique, prixCarburant, prixKwh, consoVe]);

  const fr = (n: number, d = 2) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const eur = (n: number) => Math.round(n).toLocaleString('fr-FR');

  return (
    <div className="mx-auto max-w-7xl px-6" style={{ color: NAVY }}>
      <EnteteSimu titre="Estimez les économies de votre flotte." texte="Électricité contre carburant : ce que votre flotte économise chaque année en rechargeant sur vos bornes." />

      <div className="mt-12 grid gap-7 lg:grid-cols-5">
        <div className="space-y-9 rounded-[24px] p-7 sm:p-9 lg:col-span-3" style={CARTE}>
          <Curseur label="Véhicules de la flotte" aide="Véhicules qui rechargeront sur vos bornes." valeur={String(vehicules)} unite={vehicules > 1 ? "véhicules" : "véhicule"} min={1} max={50} step={1} value={vehicules} onChange={(v) => setVehicules(Math.round(v))} gauche="1" droite="50" aria="Nombre de véhicules" />
          <Curseur label="Kilométrage annuel" aide="Par véhicule, en moyenne." valeur={kmAn.toLocaleString('fr-FR')} unite="km/an" min={5000} max={60000} step={1000} value={kmAn} onChange={(v) => setKmAn(Math.round(v))} gauche="5 000 km" droite="60 000 km" aria="Kilométrage annuel par véhicule" />
          <Curseur label="Consommation thermique" aide="Consommation actuelle des véhicules." valeur={fr(consoThermique, 1)} unite="L/100" min={4} max={12} step={0.5} value={consoThermique} onChange={setConsoThermique} gauche="Citadine (4 L)" droite="Utilitaire (12 L)" aria="Consommation thermique" />
          <Reglages ouvert={showAdvancedSettings} onToggle={() => setShowAdvancedSettings(!showAdvancedSettings)} libelle="Personnaliser les coûts (carburant, kWh…)">
            <Curseur label="Prix du carburant" valeur={fr(prixCarburant)} unite="€/L" min={1.3} max={2.5} step={0.01} value={prixCarburant} onChange={setPrixCarburant} gauche="1,30 €" droite="2,50 €" aria="Prix du carburant" />
            <Curseur label="Prix du kWh entreprise" valeur={fr(prixKwh)} unite="€/kWh" min={0.1} max={0.4} step={0.01} value={prixKwh} onChange={setPrixKwh} gauche="0,10 €" droite="0,40 €" aria="Prix de l'électricité" />
            <Curseur label="Consommation des VE" valeur={fr(consoVe, 1)} unite="kWh/100" min={12} max={30} step={0.5} value={consoVe} onChange={setConsoVe} gauche="Citadine (12)" droite="Utilitaire (30)" aria="Consommation véhicule électrique" />
          </Reglages>
        </div>

        <div ref={resultsRef} className="flex flex-col justify-between rounded-[24px] p-7 sm:p-9 lg:col-span-2" style={{ backgroundColor: NAVY }}>
          <div>
            <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: CYAN_CLAIR }}>Économies de la flotte</p>
            <p className={`mt-3 text-[52px] font-bold leading-none text-white transition-transform duration-300 sm:text-[60px] ${isPulsing ? 'scale-[1.03]' : ''}`}>
              +{eur(animatedTotal)}<span className="text-[24px]"> € / an</span>
            </p>
            <div className="mt-6 space-y-3 border-t border-white/15 pt-5 text-[15px]">
              <div className="flex justify-between gap-4"><span style={{ color: BLEU_CLAIR }}>Par véhicule</span><span className="font-semibold text-white">{eur(results.parVehicule)} € / an</span></div>
              <div className="flex justify-between gap-4"><span style={{ color: BLEU_CLAIR }}>Carburant aujourd’hui</span><span className="font-semibold text-white">{eur(results.coutCarburant)} € / an</span></div>
              <div className="flex justify-between gap-4"><span style={{ color: BLEU_CLAIR }}>Électricité demain</span><span className="font-semibold text-white">{eur(results.coutElec)} € / an</span></div>
            </div>
            <p className="mt-5 text-[13px] leading-relaxed" style={{ color: BLEU_CLAIR }}>Estimation indicative hors avantages fiscaux (ex-TVS, amortissement, TVA), à affiner lors de l’audit.</p>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })}
            className="group mt-8 inline-flex items-center justify-between rounded-full px-6 py-4 text-[16px] font-semibold text-white transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: ORANGE, boxShadow: '0 8px 22px rgba(255,107,0,0.28)' }}
          >
            Demander mon audit gratuit <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
