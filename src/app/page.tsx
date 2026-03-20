"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- ICÔNES VECTORIELLES PURES (Aucune bibliothèque externe = 0 conflit) ---
const ChevronDown = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 12 15 18 9"></polyline></svg>;
const ArrowRight = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
const Zap = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>;
const ShieldCheck = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>;
const Clock = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const CheckCircle = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const ChevronRight = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 18 15 12 9 6"></polyline></svg>;
const Star = ({ size = 24, className = "", fill = "none", stroke = "currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;
const Settings = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const MapPinIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const AwardIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>;
const FileTextIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const PiggyBankIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"></path><path d="M2 9v1c0 1.1.9 2 2 2h1"></path><path d="M16 11h.01"></path></svg>;
const CarIcon = ({ size = 24, color = "currentColor", className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>;
const FlameIcon = ({ size = 24, color = "currentColor", className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
const WrenchIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>;
const PhoneIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;

// --- COMPOSANT : APPARITION AU SCROLL (FADE-IN) ---
function FadeIn({ children, delay = 0, direction = 'up' }: { children: React.ReactNode, delay?: number, direction?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      { threshold: 0.15 }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, []);

  let startClass = 'translate-y-12 opacity-0';
  if (direction === 'left') startClass = '-translate-x-12 opacity-0';
  if (direction === 'right') startClass = 'translate-x-12 opacity-0';
  if (direction === 'scale') startClass = 'scale-90 opacity-0';

  return (
    <div 
      ref={ref} 
      className={`transition-all duration-1000 ease-out ${isVisible ? 'translate-y-0 translate-x-0 scale-100 opacity-100' : startClass}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// --- HOOK D'ANIMATION DES CHIFFRES ---
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

// --- COMPOSANT : BARRE DE PROGRESSION ANIMÉE ---
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
  const logoSrc = light ? "/CHARGEO_LOGO_BLANC.png" : "/CHARGEO_LOGO_COMPLET_FOND_TRANSPARENT_2026-01-24.png";
  return (
    <div className={`relative h-10 inline-flex items-center select-none cursor-pointer hover:scale-105 transition-transform duration-300 ${className}`}>
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
    <div className="flex items-center justify-center h-12 w-28 sm:w-32 group">
        {!error ? (
          <img 
            src={url} 
            alt={name} 
            onError={() => setError(true)}
            className="max-h-6 md:max-h-8 max-w-full object-contain opacity-40 grayscale transition-all duration-500 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-110" 
          />
        ) : (
          <span className="font-black text-[10px] uppercase opacity-20 text-center group-hover:opacity-100 transition-opacity">{name}</span>
        )}
    </div>
  );
};

export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [currentReview, setCurrentReview] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  const [dailyKm, setDailyKm] = useState(40);
  const [gasConsumption, setGasConsumption] = useState(6.5);
  const [gasPrice, setGasPrice] = useState(1.85);
  const [elecPrice, setElecPrice] = useState(0.25);
  const [evConsumption, setEvConsumption] = useState(16);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [isPulsing, setIsPulsing] = useState(false);
  const [isInView, setIsInView] = useState(false); 
  const [triggerKey, setTriggerKey] = useState(0);

  const simulatorRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const brandNavy = "#032b60";
  const brandTeal = "#0097b2";

  const reviews = useMemo(() => [
    {
      text: "Enfin un installateur qui explique les vraies économies. J'ai divisé mon budget carburant par 4 dès le premier mois.",
      author: "Jean-Philippe",
      location: "74200 Thonon",
      image: "https://images.unsplash.com/photo-1692052664566-477579a08e8c?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTc5fHxib3JuZSUyMGRlJTIwcmVjaGFyZ2V8ZW58MHx8MHx8fDA%3D"
    },
    {
      text: "La visite technique a été planifiée en 2 jours. Devis clair, sans surprise. La borne 7.4kW change tout par rapport à ma prise standard.",
      author: "Sophie",
      location: "74000 Annecy",
      image: "https://images.unsplash.com/photo-1760539068164-e7186a197d09?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTc1fHxib3JuZSUyMGRlJTIwcmVjaGFyZ2V8ZW58MHx8MHx8fDA%3D"
    },
    {
      text: "Devis reçu rapidement et pose effectuée en 10 jours. L'équipe est experte et gère directement les aides de l'État.",
      author: "Marc",
      location: "74100 Annemasse",
      image: "https://images.unsplash.com/photo-1765272088009-100c96a4cd4e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTY2fHxib3JuZSUyMGRlJTIwcmVjaGFyZ2V8ZW58MHx8MHx8fDA%3D"
    }
  ], []);

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
      
      if (simulatorRef.current && formRef.current) {
        const simRect = simulatorRef.current.getBoundingClientRect();
        const formRect = formRef.current.getBoundingClientRect();
        
        const isSimulatorVisible = simRect.top < window.innerHeight - 200;
        const isFormReachingBottom = formRect.top < window.innerHeight - 150;

        setShowStickyBar(isSimulatorVisible && !isFormReachingBottom);
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

  useEffect(() => {
    setTriggerKey(prev => prev + 1);
    setIsPulsing(true);
    const pulseTimer = setTimeout(() => setIsPulsing(false), 300);
    return () => clearTimeout(pulseTimer);
  }, [dailyKm, gasConsumption, gasPrice, elecPrice, evConsumption]);

  const faqs = [
    { q: "Quelles sont les aides de l'État ?", a: "En choisissant CHARGéO, installateur qualifié IRVE, bénéficiez de la Prime Advenir (jusqu'à 600€) et de la TVA réduite à 5,5%. Nous gérons tout l'administratif." },
    { q: "Quel est le délai d'installation ?", a: "Après votre demande de devis, une visite technique gratuite est planifiée. L'installation se fait généralement sous 10 à 15 jours après validation du devis." },
    { q: "Compatibilité véhicule ?", a: "Standard européen Type 2, compatible avec 100% des véhicules électriques et hybrides du marché." },
    { q: "Qualification IRVE ?", a: "Il s'agit d'une qualification obligatoire pour installer des points de charge dont la puissance est supérieure à 3,7kW. Elle garantit votre sécurité, la validité de votre assurance habitation et la garantie de votre véhicule." }
  ];

  return (
    // Ajout de pb-24 pour compenser la hauteur de la sticky bar permanente sur mobile
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#0097b2]/20 scroll-smooth pb-24 lg:pb-0">
      
      {/* INJECTION DES ANIMATIONS CSS COMPLEXES ET FORCAGE DU MODE CLAIR */}
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          color-scheme: light only !important;
        }
        html, body {
          background-color: #ffffff !important;
          color: #0f172a !important;
        }
        @keyframes slowPan {
          0% { transform: scale(1.05) translate(0, 0); }
          100% { transform: scale(1.15) translate(-1%, 1%); }
        }
        .animate-bg-pan {
          animation: slowPan 25s ease-in-out infinite alternate;
        }
        @keyframes shine {
          100% { left: 125%; }
        }
        .animate-button-shine {
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
          transform: skewX(-20deg);
          animation: shine 3s infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}} />

      {/* NAVIGATION avec STICKY CTA SUR ORDINATEUR */}
      <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled ? 'bg-white/95 shadow-lg py-3 backdrop-blur-md' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Logo light={!scrolled} />
          
          <div className={`hidden md:flex transition-all duration-500 ${scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
            <button 
              onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
              className="relative overflow-hidden bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 py-2.5 rounded-full font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 group"
            >
              <div className="animate-button-shine" />
              Être rappelé(e) gratuitement <PhoneIcon size={16} className="group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </div>
      </nav>

      {/* STICKY BOTTOM BAR FIXE (MOBILE ONLY) - Toujours visible */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex flex-col">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Mon estimation</p>
            <p className={`text-xl sm:text-2xl font-black text-green-600 transition-all duration-300 ${isPulsing ? 'scale-110' : 'scale-100'}`}>
              +{Math.round(results.annualSavings).toLocaleString('fr-FR')}€ / an
            </p>
          </div>
          <button 
            onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
            className="relative overflow-hidden bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 py-3 rounded-full font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 group"
          >
            <div className="animate-button-shine" />
            Me faire rappeler <PhoneIcon size={16} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>

      <main>
        {/* HERO SECTION */}
        <section className="relative h-[90vh] flex items-center overflow-hidden bg-[#032b60]">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1593941707882-a5bba14938c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
              className="w-full h-full object-cover opacity-40 animate-bg-pan" 
              alt="Hero Background" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#032b60]/95 via-[#032b60]/40 to-transparent"></div>
          </div>
          <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
            <div className="max-w-4xl mx-auto text-center flex flex-col items-center space-y-6">

              <FadeIn delay={200} direction="up">
                 <div className="flex items-center justify-center gap-2 text-[#0097b2] font-black text-sm sm:text-base uppercase tracking-widest bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm mt-2">
                   <MapPinIcon size={18} />
                   <span>Intervention sur le Chablais et la Haute-Savoie</span>
                 </div>
              </FadeIn>
              
              <FadeIn delay={300} direction="up">
                <h1 className="text-5xl md:text-[6.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase mt-4">
                  La recharge <br/><span style={{ color: brandTeal }}>ultra-rentable.</span>
                </h1>
              </FadeIn>
              
              <FadeIn delay={500} direction="up">
                <p className="text-lg md:text-xl text-white/80 leading-relaxed font-medium max-w-2xl text-balance">
                  Simulez vos économies en passant à l&apos;électrique et demandez une visite technique gratuite pour l&apos;installation de votre borne certifiée IRVE.
                </p>
              </FadeIn>
              
              <FadeIn delay={700} direction="up">
                <div className="flex flex-col items-center gap-4 mt-4 animate-float">
                  <button 
                    onClick={() => simulatorRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                    className="relative overflow-hidden inline-flex items-center justify-center gap-3 bg-[#FF6B00] hover:bg-[#E66000] text-white px-8 sm:px-12 py-4 sm:py-5 rounded-full font-black text-base sm:text-lg shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 active:scale-95 transition-all w-fit group text-center"
                  >
                    <div className="animate-button-shine" />
                    Être rappelé(e) pour une visite <PhoneIcon size={20} className="group-hover:rotate-12 transition-transform"/>
                  </button>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-white/50 font-bold uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle size={14} className="text-[#0097b2]"/> Visite technique gratuite
                    </p>
                  </div>
                </div>
              </FadeIn>

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
                <p className="text-lg text-slate-500 font-medium leading-relaxed mt-6">Le réseau CHARGéO repose sur une transparence absolue. Nos experts IRVE locaux se déplacent gratuitement pour vous fournir un devis précis et sans surprise.</p>
                
                <div className="space-y-6">
                  {[
                    { i: <Zap/>, t: "Borne Intelligente", d: "7.4kW pour une charge 3x plus rapide qu'une prise standard." },
                    { i: <FileTextIcon/>, t: "Devis Transparent", d: "Obtenez un devis clair après une visite technique gratuite." },
                    { i: <ShieldCheck/>, t: "Qualification IRVE", d: "Il s'agit d'une qualification obligatoire pour installer des points de charge dont la puissance est supérieure à 3,7kW." }
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-5 group hover:-translate-y-1 transition-transform duration-300 bg-white p-4 rounded-3xl shadow-sm hover:shadow-md border border-slate-100">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-[#0097b2] group-hover:text-white transition-colors duration-500 shrink-0 text-[#0097b2]">
                        {item.i}
                      </div>
                      <div className="flex flex-col justify-center">
                        <h4 className="font-black text-sm uppercase tracking-wider" style={{ color: brandNavy }}>{item.t}</h4>
                        <p className="text-xs text-slate-400 font-medium">{item.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
             
             <div className="relative">
                <div className="absolute -inset-4 bg-slate-100 rounded-[3rem] -rotate-3 shadow-sm transition-transform duration-700 hover:rotate-0"></div>
                
                <div className="relative w-full rounded-[2.5rem] shadow-2xl aspect-[4/5] bg-slate-200 overflow-hidden border-8 border-white group">
                  {reviews.map((review, idx) => (
                    <img 
                      key={idx}
                      src={review.image} 
                      loading="lazy"
                      className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1000 ease-in-out ${idx === currentReview ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-110'}`}
                      alt={`Témoignage de ${review.author}`}
                    />
                  ))}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#032b60]/80 via-transparent to-transparent z-10 opacity-60 mix-blend-multiply"></div>
                </div>

                <div className="absolute -bottom-10 -left-4 md:-left-10 bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 w-[90%] sm:max-w-md min-h-[220px] flex flex-col justify-between z-20 hover:-translate-y-2 transition-transform duration-500">
                  <div>
                      <div className="flex gap-1 text-yellow-400 mb-4">
                         {[1,2,3,4,5].map(s => (
                           <Star key={s} size={14} fill="currentColor" stroke="none" />
                         ))}
                      </div>
                      <div className="relative overflow-hidden h-32">
                        {reviews.map((review, idx) => (
                          <div key={idx} className={`absolute inset-0 transition-all duration-700 ${idx === currentReview ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                            <p className="text-sm font-bold text-slate-700 italic leading-relaxed">&quot;{review.text}&quot;</p>
                            <p className="mt-3 font-black text-[10px] uppercase tracking-widest text-[#0097b2]">&mdash; {review.author}, {review.location}</p>
                          </div>
                        ))}
                      </div>
                  </div>
                  <div className="flex gap-2 mt-4 justify-center">
                      {reviews.map((_, idx) => (
                          <button 
                              key={idx} 
                              onClick={() => setCurrentReview(idx)}
                              aria-label={`Voir le témoignage ${idx + 1}`}
                              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentReview ? 'w-6 bg-[#0097b2]' : 'w-2 bg-slate-200 hover:bg-slate-300'}`} 
                          ></button>
                      ))}
                  </div>
                </div>
             </div>
          </div>
        </section>

        {/* BLOC EXPERTISE / CONFIANCE (QUI SOMMES-NOUS) */}
        <section className="py-20 bg-white border-t border-slate-100 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-[#032b60] rounded-[2.5rem] p-10 md:p-16 flex flex-col md:flex-row items-center gap-12 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#0097b2]/30 rounded-full blur-[100px] -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000 ease-in-out"></div>

              <div className="md:w-1/2 space-y-6 relative z-10 text-white">
                <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
                  <MapPinIcon size={16} className="text-[#0097b2]" />
                  <span className="text-xs font-black uppercase tracking-widest text-blue-100">Vos Experts Locaux</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight">
                  L&apos;excellence d&apos;un service <span className="text-[#0097b2]">de proximité.</span>
                </h2>
                <p className="text-lg text-blue-100/80 font-medium leading-relaxed">
                  Basés en Haute-Savoie, nous ne sommes pas une plateforme nationale impersonnelle. CHARGéO, c&apos;est une équipe locale d&apos;artisans qualifiés IRVE qui vous accompagne de la visite technique jusqu&apos;à l&apos;installation.
                </p>
                <div className="flex items-center gap-6 pt-4">
                  <div className="flex -space-x-4">
                    <img className="w-12 h-12 rounded-full border-2 border-[#032b60] object-cover hover:-translate-y-1 transition-transform" src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=faces" alt="Technicien CHARGéO" />
                    <img className="w-12 h-12 rounded-full border-2 border-[#032b60] object-cover hover:-translate-y-1 transition-transform" src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces" alt="Expert CHARGéO" />
                    <div className="w-12 h-12 rounded-full border-2 border-[#032b60] bg-[#0097b2] flex items-center justify-center text-white font-black text-[10px] hover:-translate-y-1 transition-transform">IRVE</div>
                  </div>
                  <div className="text-sm font-bold">
                    <p className="text-white">Visite gratuite</p>
                    <p className="text-[#0097b2]">74200 Thonon-les-Bains</p>
                  </div>
                </div>
              </div>

              {/* GRILLE À 3 CARTES (Certification, Administratif, SAV) */}
              <div className="md:w-1/2 w-full grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl hover:bg-white/20 transition-colors duration-300">
                  <AwardIcon className="text-[#0097b2] mb-4" size={32} />
                  <h4 className="text-white font-black uppercase tracking-wider mb-2">Qualification IRVE</h4>
                  <p className="text-blue-100/70 text-xs font-medium leading-relaxed">Il s&apos;agit d&apos;une qualification obligatoire pour installer des points de charge dont la puissance est supérieure à 3,7kW. Indispensable pour votre assurance.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl sm:mt-8 hover:bg-white/20 transition-colors duration-300">
                  <FileTextIcon className="text-[#0097b2] mb-4" size={32} />
                  <h4 className="text-white font-black uppercase tracking-wider mb-2">Administratif Inclus</h4>
                  <p className="text-blue-100/70 text-xs font-medium leading-relaxed">Nous montons de A à Z vos dossiers de Prime Advenir (jusqu&apos;à 600€) et la demande de TVA réduite.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl hover:bg-white/20 transition-colors duration-300 sm:col-span-2">
                  <WrenchIcon className="text-[#0097b2] mb-4" size={32} />
                  <h4 className="text-white font-black uppercase tracking-wider mb-2">SAV & Maintenance</h4>
                  <p className="text-blue-100/70 text-xs font-medium leading-relaxed">Un problème ? Notre équipe locale intervient rapidement. Nous assurons le suivi de tout notre parc installé pour vous garantir une tranquillité d&apos;esprit totale sur le long terme.</p>
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
                Simulez vos <br className="md:hidden"/><span className="text-[#0097b2]">économies</span>
              </h2>
              <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto text-balance">
                Découvrez à quel point rouler à l&apos;électrique est rentable face aux prix du carburant, puis demandez votre devis personnalisé.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
              
              {/* CARTE 1 : TRAJET */}
              <div className="order-1 lg:row-start-1 lg:col-start-1 h-full flex flex-col justify-center bg-slate-50 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 text-[#032b60]">
                      <CarIcon color={brandTeal} size={24}/> Trajet Quotidien
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

              {/* CARTE 2 : CONSO THERMIQUE */}
              <div className="order-2 lg:row-start-2 lg:col-start-1 h-full flex flex-col justify-center bg-slate-50 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 text-[#032b60]">
                      <FlameIcon color={brandTeal} size={24}/> Conso. Thermique
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">Le carburant pèse lourd dans budget.</p>
                  </div>
                  <span className={`text-3xl font-black text-[#0097b2] transition-transform duration-300 ${isPulsing ? 'scale-110' : 'scale-100'}`}>
                    {gasConsumption} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">L/100</span>
                  </span>
                </div>
                <input type="range" aria-label="Consommation thermique" min="4" max="12" step="0.5" value={gasConsumption} onChange={(e) => setGasConsumption(parseFloat(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-tighter font-black"><span>Citadine (4L)</span><span>Grand SUV (12L)</span></div>
              </div>

              {/* CARTE 3 : RÉGLAGES AVANCÉS */}
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

                 <div className={`transition-all duration-500 overflow-hidden ${showAdvancedSettings ? 'max-h-[800px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
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

              {/* CARTE 4 : ÉCONOMIES */}
              <div ref={resultsRef} className="order-4 lg:row-start-1 lg:col-start-2 h-full flex flex-col justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-8 md:p-10 rounded-[2.5rem] border border-green-200 shadow-xl relative overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1">
                <PiggyBankIcon className="absolute -right-10 -bottom-10 opacity-10 text-green-600 transition-transform duration-1000 hover:rotate-12" size={200} />
                <h3 className="text-green-800 text-sm font-black uppercase tracking-widest mb-2 relative z-10">Vos économies estimées</h3>
                <div className={`flex items-baseline gap-2 relative z-10 transition-all duration-300 ${isPulsing ? 'scale-105 text-emerald-500 translate-x-2' : 'scale-100 text-green-600'}`}>
                  <span className="text-6xl md:text-7xl font-black tracking-tighter">+{Math.round(animatedSavings).toLocaleString('fr-FR')}</span>
                  <span className="text-2xl font-black text-green-700">€ / an</span>
                </div>
              </div>

              {/* CARTE 5 : TEMPS DE CHARGE */}
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

            {/* === NOUVEAU BLOC FORMULAIRE : DEVIS & VISITE TECHNIQUE === */}
            <div id="formulaire-devis" ref={formRef} className="w-full mt-16 lg:mt-24 bg-white p-4 sm:p-8 md:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col relative z-10 mx-auto">
              <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0 shadow-inner">
                    <PhoneIcon size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-[#032b60] uppercase tracking-widest text-xs sm:text-sm leading-tight">Demander à être rappelé</h3>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Un conseiller qualifie votre projet avant la visite technique</p>
                  </div>
                </div>
              </div>
              
              <div className="w-full relative h-[850px] sm:h-[800px] lg:h-[900px]">
                <iframe 
                  className="w-full h-full border-none rounded-2xl" 
                  src="https://forms.clickup.com/90151325642/f/2kyq03ya-7815/I5ELJ3PBRLRC158WLS" 
                  title="Formulaire CHARGéO" 
                  style={{ background: 'transparent' }}
                />
              </div>

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
                <div key={idx} className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white">
                  <button 
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)} 
                    aria-expanded={openFaq === idx ? "true" : "false"}
                    className="w-full flex items-center justify-between p-6 md:p-8 text-left transition-colors hover:bg-slate-50 focus:outline-none"
                  >
                    <span className="font-black text-lg" style={{ color: brandNavy }}>{faq.q}</span>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ml-4 transition-colors duration-300 ${openFaq === idx ? 'bg-[#0097b2] text-white' : 'bg-slate-50 text-[#0097b2]'}`}>
                      <ChevronDown className={`transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`} size={20} />
                    </div>
                  </button>
                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openFaq === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    {openFaq === idx && (
                      <div className="p-6 md:p-8 bg-slate-50 text-slate-500 font-medium leading-relaxed border-t border-slate-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#032B60] py-24 border-t border-white/5 text-white font-bold overflow-hidden relative">
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#0097b2] rounded-full blur-[150px] opacity-30 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-16 relative z-10">
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
                    <li className="hover:text-[#0097b2] cursor-pointer transition-colors font-medium hover:translate-x-2 inline-block">Devenir Franchisé</li>
                 </ul>
              </div>
              <div className="space-y-6">
                 <h4 className="text-white/20 font-black text-[10px] uppercase tracking-[0.3em]">Assistance</h4>
                 <ul className="text-white space-y-4 text-sm font-bold">
                    <li className="text-[#0097b2] font-black hover:text-white transition-colors cursor-pointer">contact@chargeo.fr</li>
                 </ul>
              </div>
           </div>
        </div>
      </footer>

    </div>
  );
}