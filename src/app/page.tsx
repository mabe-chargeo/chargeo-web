"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ChevronDown, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Clock, 
  CheckCircle2,
  ChevronRight,
  Star,
  PiggyBank,
  CarFront,
  Fuel,
  Settings
} from 'lucide-react';

// --- HOOK D'ANIMATION DES CHIFFRES (SÉCURISÉ & PERSISTANT) ---
function useAnimatedValue(target: number, duration: number = 1000, isVisible: boolean, triggerKey: number) {
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    setDisplayValue(0);
    hasAnimatedRef.current = false;
  }, [triggerKey]);

  useEffect(() => {
    if (!isVisible || hasAnimatedRef.current) return;

    let startTimestamp: number | null = null;
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 4);
      
      setDisplayValue(target * easeOut);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        hasAnimatedRef.current = true;
      }
    };

    const timer = setTimeout(() => {
      animationFrame = window.requestAnimationFrame(step);
    }, 50);

    return () => {
      clearTimeout(timer);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [isVisible, target, triggerKey, duration]);

  return displayValue;
}

// --- COMPOSANT : BARRE DE PROGRESSION ANIMÉE (SÉCURISÉE & PERSISTANTE) ---
function AnimatedBar({ percent, isVisible, triggerKey, wrapperClass, innerClass, delay = 0 }: { 
  percent: number, isVisible: boolean, triggerKey: number, wrapperClass: string, innerClass: string, delay?: number 
}) {
  const [width, setWidth] = useState(0);
  const hasAppearedRef = useRef(false);

  useEffect(() => {
    setWidth(0);
    hasAppearedRef.current = false;
  }, [triggerKey]);

  useEffect(() => {
    if (!isVisible || hasAppearedRef.current) return;

    const t = setTimeout(() => {
      setWidth(percent);
      hasAppearedRef.current = true;
    }, 50 + delay);

    return () => clearTimeout(t);
  }, [percent, isVisible, triggerKey, delay]);

  return (
    <div className={wrapperClass}>
      <div
        className={innerClass}
        style={{
          width: `${width}%`,
          transition: width === 0 ? 'none' : `width 2.5s cubic-bezier(0.16, 1, 0.3, 1)`
        }}
      ></div>
    </div>
  );
}

// --- LOGO COMPOSANT ---
const Logo = ({ light = false, className = "" }: { light?: boolean, className?: string }) => {
  const [imgError, setImgError] = useState(false);
  const logoSrc = light 
    ? "/CHARGEO_LOGO_BLANC.png" 
    : "/CHARGEO_LOGO_COMPLET_FOND_TRANSPARENT_2026-01-24.png";

  return (
    <div className={`relative h-10 inline-flex items-center select-none cursor-pointer ${className}`}>
      {!imgError ? (
        <img src={logoSrc} alt="Logo CHARGéO" onError={() => setImgError(true)} className="h-full w-auto object-contain transition-all duration-300" />
      ) : (
        <span className={`text-xl md:text-2xl font-black tracking-tighter ${light ? 'text-white' : 'text-[#032b60]'}`}>
          CHARG<span className="text-[#0097b2]">é</span>O
        </span>
      )}
    </div>
  );
};

// --- COMPOSANT BRAND LOGO ---
const BrandLogo = ({ name, url }: { name: string, url: string }) => {
  const [error, setError] = useState(false); 
  return (
    <div className="flex items-center justify-center h-12 w-28 sm:w-32">
        {!error ? (
          <img 
            src={url} 
            alt={name} 
            onError={() => setError(true)}
            className="max-h-6 md:max-h-8 max-w-full object-contain opacity-40 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0" 
          />
        ) : (
          <span className="font-black text-[10px] uppercase opacity-20 text-center">{name}</span>
        )}
    </div>
  );
};

export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [currentReview, setCurrentReview] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // États de contrôle du simulateur (Basiques)
  const [dailyKm, setDailyKm] = useState(40);
  const [gasConsumption, setGasConsumption] = useState(6.5);
  
  // Nouveaux états de contrôle du simulateur (Avancés)
  const [gasPrice, setGasPrice] = useState(1.85);
  const [elecPrice, setElecPrice] = useState(0.25);
  const [evConsumption, setEvConsumption] = useState(16);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [isInView, setIsInView] = useState(false); 
  const [triggerKey, setTriggerKey] = useState(0);

  const simulatorRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const brandNavy = "#032b60";
  const brandTeal = "#0097b2";

  // Avis clients
  const reviews = useMemo(() => [
    {
      text: "Enfin un installateur qui explique les vraies économies. J'ai divisé mon budget carburant par 4 dès le premier mois.",
      author: "Jean-Philippe",
      location: "74200 Thonon",
      image: "https://images.unsplash.com/photo-1692052664566-477579a08e8c?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTc5fHxib3JuZSUyMGRlJTIwcmVjaGFyZ2V8ZW58MHx8MHx8fDA%3D"
    },
    {
      text: "Le simulateur de temps de charge est d'une précision incroyable. La borne 7.4kW change tout par rapport à ma prise standard.",
      author: "Sophie",
      location: "74000 Annecy",
      image: "https://images.unsplash.com/photo-1760539068164-e7186a197d09?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTc1fHxib3JuZSUyMGRlJTIwcmVjaGFyZ2V8ZW58MHx8MHx8fDA%3D"
    },
    {
      text: "Rentabilité calculée, devis reçu et pose effectuée en 10 jours. L'équipe est experte et très pédagogue sur l'aide Advenir.",
      author: "Marc",
      location: "74100 Annemasse",
      image: "https://images.unsplash.com/photo-1765272088009-100c96a4cd4e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTY2fHxib3JuZSUyMGRlJTIwcmVjaGFyZ2V8ZW58MHx8MHx8fDA%3D"
    }
  ], []);

  // --- CALCULS LOGIQUES MIS À JOUR ET SÉCURISÉS ---
  const results = useMemo(() => {
    // Garantir des nombres valides pour éviter les erreurs de calcul (NaN)
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

  // --- VALEURS ANIMÉES ---
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
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      if (simulatorRef.current) {
        const rect = simulatorRef.current.getBoundingClientRect();
        setShowStickyBar(rect.top < window.innerHeight - 200 && rect.bottom > 200);
      }
    };
    window.addEventListener('scroll', handleScroll);
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.2 }
    );

    const currentResultsRef = resultsRef.current;
    if (currentResultsRef) observer.observe(currentResultsRef);

    const timer = setInterval(() => {
        setCurrentReview((prev) => (prev + 1) % reviews.length);
    }, 5000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (currentResultsRef) observer.unobserve(currentResultsRef);
      observer.disconnect();
      clearInterval(timer);
    };
  }, [reviews.length]);

  // Déclencheur de reset incluant les nouveaux curseurs
  useEffect(() => {
    setTriggerKey(prev => prev + 1);
  }, [dailyKm, gasConsumption, gasPrice, elecPrice, evConsumption]);

  const faqs = [
    { q: "Quelles sont les aides de l'État ?", a: "En choisissant CHARGéO, certifié IRVE, bénéficiez de la Prime Advenir (jusqu'à 600€) et de la TVA réduite à 5,5%. Nous gérons tout l'administratif." },
    { q: "Quel est le délai d'installation ?", a: "Pose et mise en service sous 10 à 15 jours en moyenne après validation du devis par un expert local certifié." },
    { q: "Compatibilité véhicule ?", a: "Standard européen Type 2, compatible avec 100% des véhicules électriques et hybrides du marché." },
    { q: "Obligation IRVE ?", a: "C'est une obligation légale au-delà de 3,7kW. Elle garantit votre sécurité et la validité de votre assurance habitation." }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#0097b2]/20 scroll-smooth">
      
      {/* NAVIGATION */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 shadow-lg py-2 backdrop-blur-md' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Logo light={!scrolled} />
        </div>
      </nav>

      {/* STICKY BOTTOM BAR (MOBILE ONLY) */}
      <div className={`lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 z-[60] shadow-2xl transition-transform duration-500 transform ${showStickyBar ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex flex-col">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Économies / an</p>
            <p className="text-2xl font-black text-green-600 transition-all duration-75">
              +{Math.round(results.annualSavings).toLocaleString('fr-FR')}€
            </p>
          </div>
          <button 
            onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
            className="bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-[0_4px_14px_rgba(255,107,0,0.3)]"
          >
            Etre rappelé par un expert<ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="relative h-[90vh] flex items-center overflow-hidden bg-[#032b60]">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1593941707882-a5bba14938c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" className="w-full h-full object-cover scale-105 opacity-40" alt="Hero Background" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#032b60]/95 via-[#032b60]/40 to-transparent"></div>
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="inline-block bg-[#0097b2]/20 border border-[#0097b2]/30 text-blue-100 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-2 backdrop-blur-sm">
              Fini le plein à 80€ ⛽
            </div>
            <h1 className="text-5xl md:text-[6.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase">
              La recharge <br/><span style={{ color: brandTeal }}>ultra-rentable.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 leading-relaxed font-medium max-w-2xl text-balance">
              Les prix du carburant détruisent votre pouvoir d'achat. Découvrez au centime près combien vous allez économiser chaque année en passant à l'électrique, et sécurisez votre installation certifiée IRVE.
            </p>
            <div className="flex flex-col items-center gap-4 mt-4">
              <button 
                onClick={() => simulatorRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                className="inline-flex items-center justify-center gap-3 bg-[#FF6B00] hover:bg-[#E66000] text-white px-12 py-5 rounded-full font-black text-lg shadow-[0_0_30px_rgba(255,107,0,0.3)] hover:shadow-[0_0_40px_rgba(255,107,0,0.5)] hover:scale-105 transition-all w-fit group"
              >
                Débloquer mes économies <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform"/>
              </button>
              <div className="flex flex-col gap-1">
                <p className="text-xs text-white/50 font-bold uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#0097b2]"/> Gratuit et sans engagement
                </p>
                <p className="text-sm text-yellow-400 font-black italic tracking-tight">
                  Déjà +1 200 installations certifiées ⭐ 4.9/5
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BANDEAU CONFIANCE */}
      <div className="bg-white border-y border-slate-100 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center md:justify-between items-center gap-8 md:gap-12 text-slate-400">
          <BrandLogo name="HAGER" url="https://upload.wikimedia.org/wikipedia/commons/d/d1/Hagerlogo.jpg" />
          <BrandLogo name="AUTEL" url="https://mms.businesswire.com/media/20230321006038/fr/1595853/4/AUTEL_New_Energy_Logo.jpg" />
          <BrandLogo name="WALLBOX" url="https://data.ladn.eu/wp-content/uploads/2022/12/Nomination-Wallbox-Myriam-Lhermurier-Boublil-1280x467.jpg" />
          <BrandLogo name="ALFEN" url="https://upload.wikimedia.org/wikipedia/commons/3/39/Alfen_logo.svg" />
          <BrandLogo name="LEGRAND" url="https://upload.wikimedia.org/wikipedia/fr/3/3e/Logo_Legrand.svg" />
          <BrandLogo name="ABB" url="https://upload.wikimedia.org/wikipedia/commons/0/00/ABB_logo.svg" />
        </div>
      </div>

      {/* MÉTHODOLOGIE + CARROUSEL AVIS */}
      <section id="concept" className="py-24 bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
           <div className="space-y-8">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none" style={{ color: brandNavy }}>Une Méthode <br/><span style={{ color: brandTeal }}>Standardisée</span></h2>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">Le réseau CHARGéO repose sur une transparence absolue. Chaque installation est optimisée pour votre rentabilité. Nos experts IRVE locaux assurent une pose sécurisée.</p>
              <div className="space-y-6">
                {[
                  { i: <Zap/>, t: "Borne Intelligente", d: "7.4kW pour une charge 3x plus rapide qu'une prise standard." },
                  { i: <PiggyBank/>, t: "Rentabilité Immédiate", d: "Économisez jusqu'à 1500€ par an sur votre budget carburant." },
                  { i: <ShieldCheck/>, t: "Sécurité IRVE", d: "Installation certifiée pour votre assurance et les aides d'État." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-5 group">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center group-hover:bg-[#0097b2]/10 transition-colors shrink-0 shadow-sm" style={{ color: brandTeal }}>{item.i}</div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-wider" style={{ color: brandNavy }}>{item.t}</h4>
                      <p className="text-xs text-slate-400 font-medium">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>
           
           <div className="relative">
              <div className="absolute -inset-4 bg-slate-100 rounded-[3rem] -rotate-3 shadow-sm"></div>
              
              <div className="relative w-full rounded-[2.5rem] shadow-2xl aspect-[4/5] bg-slate-200 overflow-hidden border-8 border-white">
                {reviews.map((review, idx) => (
                  <img 
                    key={idx}
                    src={review.image} 
                    className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-in-out ${idx === currentReview ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105'}`}
                    alt={review.author}
                  />
                ))}
              </div>

              <div className="absolute -bottom-10 -left-4 md:-left-10 bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 w-[90%] sm:max-w-md min-h-[220px] flex flex-col justify-between z-20">
                <div>
                    <div className="flex gap-1 text-yellow-400 mb-4">
                       {[1,2,3,4,5].map(s => <Star key={s} size={14} fill="currentColor" stroke="none"/>)}
                    </div>
                    <div className="relative overflow-hidden h-32">
                      {reviews.map((review, idx) => (
                        <div key={idx} className={`absolute inset-0 transition-all duration-700 ${idx === currentReview ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                          <p className="text-sm font-bold text-slate-700 italic leading-relaxed">"{review.text}"</p>
                          <p className="mt-3 font-black text-[10px] uppercase tracking-widest text-[#0097b2]">— {review.author}, {review.location}</p>
                        </div>
                      ))}
                    </div>
                </div>
                <div className="flex gap-2 mt-4 justify-center">
                    {reviews.map((_, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => setCurrentReview(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentReview ? 'w-6 bg-[#0097b2]' : 'w-2 bg-slate-200 hover:bg-slate-300'}`} 
                        />
                    ))}
                </div>
              </div>
           </div>
        </div>
      </section>

      {/* SIMULATEUR DE RENTABILITÉ */}
      <section ref={simulatorRef} id="simulateur" className="py-24 bg-white scroll-mt-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-6xl font-black text-[#032b60] uppercase tracking-tighter leading-tight">
              Vos habitudes <br className="md:hidden"/><span className="text-[#0097b2]">de conduite</span>
            </h2>
            <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto text-balance">
              Vous payez votre carburant au prix fort. Découvrez à quel point rouler à l'électrique est économique. Ajustez ces curseurs pour calculer votre rentabilité exacte.
            </p>
          </div>

          {/* GRILLE CSS : LES INPUTS SONT À GAUCHE (ordre 1, 2, 3), LES RÉSULTATS À DROITE (ordre 4, 5) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
            
            {/* CARTE 1 : TRAJET (Colonne Gauche) */}
            <div className="order-1 lg:row-start-1 lg:col-start-1 h-full flex flex-col justify-center bg-slate-50 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8 transition-all hover:shadow-md">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 text-[#032b60]"><CarFront color={brandTeal} size={24}/> Trajet Quotidien</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">Plus vous roulez, plus la borne est rentable.</p>
                </div>
                <span className="text-3xl font-black text-[#0097b2]">{dailyKm} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">km/j</span></span>
              </div>
              <input type="range" min="5" max="150" step="5" value={dailyKm} onChange={(e) => setDailyKm(parseInt(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest"><span>Petit rouleur</span><span>Gros rouleur</span></div>
            </div>

            {/* CARTE 2 : CONSO THERMIQUE (Colonne Gauche) */}
            <div className="order-2 lg:row-start-2 lg:col-start-1 h-full flex flex-col justify-center bg-slate-50 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8 transition-all hover:shadow-md">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 text-[#032b60]"><Fuel color={brandTeal} size={24}/> Conso. Thermique</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">Le carburant pèse lourd dans votre budget.</p>
                </div>
                <span className="text-3xl font-black text-[#0097b2]">{gasConsumption} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">L/100</span></span>
              </div>
              <input type="range" min="4" max="12" step="0.5" value={gasConsumption} onChange={(e) => setGasConsumption(parseFloat(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-tighter font-black"><span>Citadine (4L)</span><span>Grand SUV (12L)</span></div>
            </div>

            {/* CARTE 3 : RÉGLAGES AVANCÉS (Colonne Gauche - S'insère AVANT les résultats) */}
            <div className="order-3 lg:row-start-3 lg:col-start-1 w-full">
               <button 
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-[#0097b2] text-slate-500 hover:text-[#0097b2] px-6 py-4 rounded-full font-bold text-sm transition-all shadow-sm"
               >
                  <Settings size={18} />
                  {showAdvancedSettings ? "Masquer les réglages avancés" : "Personnaliser les coûts (Électricité, VE...)"}
                  <ChevronDown size={18} className={`transition-transform duration-300 ${showAdvancedSettings ? 'rotate-180' : ''}`} />
               </button>

               <div className={`transition-all duration-500 overflow-hidden ${showAdvancedSettings ? 'max-h-[800px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                  <div className="bg-slate-50 border border-slate-100 p-6 md:p-8 rounded-[2.5rem] shadow-inner flex flex-col gap-8">
                     
                     {/* Prix Carburant */}
                     <div className="space-y-4">
                       <div className="flex justify-between items-end">
                         <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Prix moyen au litre</span>
                         <span className="text-lg font-black text-[#0097b2]">{gasPrice.toFixed(2)}<span className="text-xs"> €/L</span></span>
                       </div>
                       <input type="range" min="1.4" max="2.5" step="0.01" value={gasPrice} onChange={(e) => setGasPrice(parseFloat(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
                       <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest"><span>1.40 €</span><span>2.50 €</span></div>
                     </div>

                     {/* Prix Électricité */}
                     <div className="space-y-4">
                       <div className="flex justify-between items-end">
                         <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Prix moyen du kWh</span>
                         <span className="text-lg font-black text-[#0097b2]">{elecPrice.toFixed(2)}<span className="text-xs"> €/kWh</span></span>
                       </div>
                       <input type="range" min="0.10" max="0.40" step="0.01" value={elecPrice} onChange={(e) => setElecPrice(parseFloat(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
                       <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest"><span>Heures Creuses</span><span>Heures Pleines</span></div>
                     </div>

                     {/* Consommation VE */}
                     <div className="space-y-4">
                       <div className="flex justify-between items-end">
                         <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Consommation du VE</span>
                         <span className="text-lg font-black text-[#0097b2]">{evConsumption.toFixed(1)}<span className="text-xs"> kWh/100</span></span>
                       </div>
                       <input type="range" min="10" max="30" step="0.5" value={evConsumption} onChange={(e) => setEvConsumption(parseFloat(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
                       <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest"><span>Citadine (12)</span><span>Gros SUV (25+)</span></div>
                     </div>

                  </div>
               </div>
            </div>

            {/* CARTE 4 : ÉCONOMIES (Colonne Droite - Apparaît en 4ème sur mobile) */}
            <div ref={resultsRef} className="order-4 lg:row-start-1 lg:col-start-2 h-full flex flex-col justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-8 md:p-10 rounded-[2.5rem] border border-green-200 shadow-lg relative overflow-hidden">
              <PiggyBank className="absolute -right-10 -bottom-10 opacity-10 text-green-600" size={200} />
              <h3 className="text-green-800 text-sm font-black uppercase tracking-widest mb-2 relative z-10">Vos économies estimées</h3>
              <div className="flex items-baseline gap-2 relative z-10">
                <span className="text-6xl md:text-7xl font-black text-green-600 tracking-tighter">+{Math.round(animatedSavings).toLocaleString('fr-FR')}</span>
                <span className="text-2xl font-black text-green-700">€ / an</span>
              </div>
            </div>

            {/* CARTE 5 : TEMPS DE CHARGE (Colonne Droite) */}
            <div className="order-5 lg:row-start-2 lg:col-start-2 h-full flex flex-col justify-center bg-[#032b60] p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white border border-white/5">
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

          {/* FORMULAIRE IN-PAGE INTÉGRÉ (AVEC HAUTEUR DE SÉCURITÉ) */}
          <div id="formulaire-devis" className="max-w-4xl mx-auto mt-16 lg:mt-24 bg-white sm:p-6 md:p-8 sm:rounded-[2.5rem] shadow-2xl border-y sm:border border-slate-100 flex flex-col relative z-10 -mx-6 sm:mx-auto">
            {/* Header du formulaire avec padding latéral sur mobile pour aligner le texte */}
            <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-slate-100 pb-4 px-6 sm:px-0 pt-6 sm:pt-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-black text-[#032b60] uppercase tracking-widest text-xs sm:text-sm leading-tight">Valider mon étude de rentabilité</h3>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gratuit et sans engagement</p>
                </div>
              </div>
            </div>
            
            {/* L'iframe sans script externe pour assurer le fonctionnement du Canvas, avec une hauteur minimale généreuse */}
            <div className="w-full relative h-[800px] min-h-[800px]">
              <iframe 
                className="w-full h-full border-none sm:rounded-2xl" 
                src="https://forms.clickup.com/90151325642/f/2kyq03ya-7815/I5ELJ3PBRLRC158WLS" 
                title="Formulaire CHARGéO" 
                style={{ background: 'transparent' }}
              />
            </div>

            {/* MICRO-COPY DE SÉCURITÉ */}
            <p className="text-center text-[10px] text-slate-400 mt-4 sm:mt-6 px-4 font-medium flex justify-center items-center gap-1.5">
               <span className="flex items-center justify-center text-green-500 shrink-0"><ShieldCheck size={12} /></span>
               Vos données sont strictement confidentielles, chiffrées, et ne seront jamais revendues à des tiers.
            </p>
          </div>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase" style={{ color: brandNavy }}>Questions <span style={{ color: brandTeal }}>Fréquentes</span></h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full flex items-center justify-between p-6 md:p-8 bg-white text-left transition-colors hover:bg-slate-50">
                  <span className="font-black text-lg" style={{ color: brandNavy }}>{faq.q}</span>
                  <ChevronDown className={`transition-transform duration-300 shrink-0 ml-4 ${openFaq === idx ? 'rotate-180' : ''}`} style={{ color: brandTeal }} size={24} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {openFaq === idx && <div className="p-6 md:p-8 bg-slate-50 text-slate-500 font-medium leading-relaxed border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">{faq.a}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#032B60] py-24 border-t border-white/5 text-white font-bold">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-16">
           <div className="space-y-8 text-left">
              <Logo light={true} className="scale-100 sm:scale-110 md:scale-125 origin-left" />
              <div className="space-y-3 mt-4">
                 <p className="text-white font-black text-2xl tracking-tighter uppercase leading-none">74200 Thonon-les-Bains</p>
                 <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2">Entreprise en cours de création</p>
              </div>
           </div>
           <div className="flex flex-wrap gap-12 md:gap-20 text-left">
              <div className="space-y-6">
                 <h4 className="text-white/20 font-black text-[10px] uppercase tracking-[0.3em]">Réseau</h4>
                 <ul className="text-white space-y-4 text-sm font-bold">
                    <li className="hover:text-[#0097b2] cursor-pointer transition-colors font-medium">Devenir Franchisé</li>
                 </ul>
              </div>
              <div className="space-y-6">
                 <h4 className="text-white/20 font-black text-[10px] uppercase tracking-[0.3em]">Assistance</h4>
                 <ul className="text-white space-y-4 text-sm font-bold">
                    <li className="text-[#0097b2] font-black">contact@chargeo.fr</li>
                 </ul>
              </div>
           </div>
        </div>
      </footer>

    </div>
  );
}