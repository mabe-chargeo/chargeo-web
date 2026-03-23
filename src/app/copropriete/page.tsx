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
const SettingsIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const MapPinIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const AwardIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>;
const FileTextIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const PiggyBankIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"></path><path d="M2 9v1c0 1.1.9 2 2 2h1"></path><path d="M16 11h.01"></path></svg>;
const BuildingIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>;
const UsersIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const ServerIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>;
const WrenchIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>;
const PhoneIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
const MailIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>;
const MenuIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;

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
    <a href="/" className={`relative h-12 sm:h-14 md:h-16 inline-flex items-center select-none cursor-pointer hover:scale-105 transition-transform duration-300 ${className}`}>
      {!imgError ? (
        <img src={logoSrc} alt="Logo CHARGéO" onError={() => setImgError(true)} className="h-full w-auto object-contain transition-all duration-300" />
      ) : (
        <span className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter ${light ? 'text-white' : 'text-[#032b60]'}`}>
          CHARG<span className="text-[#0097b2]">é</span>O
        </span>
      )}
    </a>
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

export default function CoproprietePage() {
  const [scrolled, setScrolled] = useState(false);
  const [currentReview, setCurrentReview] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Variables Simulateur Copro
  const [parkingSpots, setParkingSpots] = useState(30);
  const [interestedResidents, setInterestedResidents] = useState(3);

  const [isPulsing, setIsPulsing] = useState(false);
  const [isInView, setIsInView] = useState(false); 
  const [triggerKey, setTriggerKey] = useState(0);

  const simulatorRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const simulatorCtaRef = useRef<HTMLButtonElement>(null);

  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isSimulatorCtaVisible, setIsSimulatorCtaVisible] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const brandNavy = "#032b60";
  const brandTeal = "#0097b2";

  // Calcul Subventions Copro
  const results = useMemo(() => {
    const safeParkingSpots = isNaN(parkingSpots) ? 0 : parkingSpots;
    const safeInterested = isNaN(interestedResidents) ? 0 : interestedResidents;
    
    const totalSubventions = 8000 + (safeInterested * 600);
    
    return { totalSubventions: Math.max(0, totalSubventions) };
  }, [parkingSpots, interestedResidents]);

  const animatedSubventions = useAnimatedValue(results.totalSubventions, 1200, isInView, triggerKey);

  const reviews = useMemo(() => [
    {
      text: "L'IRVE collective était la seule solution pérenne pour notre parking. CHARGéO a monté le dossier Advenir pour subventionner massivement l'artère principale.",
      author: "Président du CS",
      location: "Résidence 50 lots",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=900&auto=format&fit=crop"
    },
    {
      text: "L'artère principale a été tirée. Aujourd'hui, n'importe quel résident peut demander le raccordement de sa place sans faire disjoncter l'immeuble.",
      author: "Copropriétaire",
      location: "Thonon",
      image: "https://images.unsplash.com/photo-1545601445-4d6a0a0565f0?q=80&w=900&auto=format&fit=crop"
    },
    {
      text: "L'accompagnement et le logiciel de supervision nous déchargent totalement. Chacun est facturé au kWh consommé, et le syndic n'a plus rien à gérer.",
      author: "Syndic",
      location: "Annecy",
      image: "https://images.unsplash.com/photo-1556761175-5973dc0f32b7?q=80&w=900&auto=format&fit=crop"
    }
  ], []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
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

  // Observer intelligent pour cacher les CTA flottants si un bouton natif est à l'écran
  useEffect(() => {
    const observerOptions = { threshold: 0 };

    const heroObserver = new IntersectionObserver(([entry]) => setIsHeroVisible(entry.isIntersecting), observerOptions);
    const simCtaObserver = new IntersectionObserver(([entry]) => setIsSimulatorCtaVisible(entry.isIntersecting), observerOptions);
    const formObserver = new IntersectionObserver(([entry]) => setIsFormVisible(entry.isIntersecting), observerOptions);

    if (heroRef.current) heroObserver.observe(heroRef.current);
    if (simulatorCtaRef.current) simCtaObserver.observe(simulatorCtaRef.current);
    if (formRef.current) formObserver.observe(formRef.current);

    return () => {
      heroObserver.disconnect();
      simCtaObserver.disconnect();
      formObserver.disconnect();
    };
  }, []);

  const showFloatingCta = !isHeroVisible && !isSimulatorCtaVisible && !isFormVisible;

  useEffect(() => {
    setTriggerKey(prev => prev + 1);
    setIsPulsing(true);
    const pulseTimer = setTimeout(() => setIsPulsing(false), 300);
    return () => clearTimeout(pulseTimer);
  }, [parkingSpots, interestedResidents]);

  const faqs = [
    { q: "L'infrastructure IRVE collective a-t-elle un coût pour l'immeuble ?", a: "L'installation est lourdement subventionnée (jusqu'à 50% par la Prime Advenir avec un plafond de 8 000€). Le reste à charge éventuel dépend de la complexité technique du parking et de sa configuration, et peut parfois faire l'objet de solutions de préfinancement selon le dossier." },
    { q: "Comment est facturée l'électricité ?", a: "Notre solution de supervision gère tout de A à Z. Chaque résident équipé dispose de son propre sous-compteur intelligent et d'un badge RFID. Les factures lui sont envoyées directement (prélèvement automatique), en fonction de sa consommation réelle. Le syndic ne gère ni les factures d'énergie, ni les impayés." },
    { q: "Et si l'infrastructure collective n'est pas votée en AG ?", a: "En dernier recours, s'il n'est pas envisageable de créer une IRVE collective, il est toujours possible d'envisager un branchement individuel de type 'Droit à la Prise'. C'est une démarche légale où le résident paie l'intégralité de son tirage de câble depuis les parties communes, mais elle est souvent plus coûteuse pour le particulier à long terme." },
    { q: "L'immeuble risque-t-il de disjoncter si tous les résidents chargent ?", a: "Absolument pas. L'infrastructure collective intègre par défaut un système de 'Délestage Dynamique' (Load Balancing). L'ordinateur de supervision répartit intelligemment la puissance disponible entre tous les véhicules branchés, garantissant la sécurité électrique totale du bâtiment et évitant une surchauffe." },
    { q: "Accompagnez-vous les syndics lors des Assemblées Générales (AG) ?", a: "Oui, c'est indispensable. Une fois l'étude technique gratuite réalisée, un expert CHARGéO participe à votre Assemblée Générale pour présenter la solution aux copropriétaires, expliquer le montage financier avec les subventions, et répondre aux inquiétudes de l'assemblée." }
  ];

  return (
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

      {/* NAVIGATION AVEC SÉLECTEUR DE CIBLES */}
      <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled ? 'bg-white/95 shadow-lg py-2 sm:py-3 backdrop-blur-md' : 'bg-transparent py-4 sm:py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center gap-2">
          
          <div className="flex-shrink-0">
            <Logo light={!scrolled} className="scale-75 sm:scale-100 origin-left -ml-2 sm:ml-0" />
          </div>

          <div className={`flex items-center p-1 rounded-full border transition-colors duration-300 ${scrolled ? 'bg-slate-100 border-slate-200' : 'bg-white/10 border-white/20 backdrop-blur-md'}`}>
            <a href="/" className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-bold transition-all ${scrolled ? 'text-slate-500 hover:text-[#032b60]' : 'text-white/70 hover:text-white'}`}>Particuliers</a>
            <a href="/pro" className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-bold transition-all ${scrolled ? 'text-slate-500 hover:text-[#032b60]' : 'text-white/70 hover:text-white'}`}>Pros</a>
            <a href="/copropriete" className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-black bg-[#0097b2] text-white shadow-md">Copros</a>
          </div>

          <div className={`hidden lg:flex flex-shrink-0 transition-all duration-500 ${showFloatingCta ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
            <button 
              onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
              className="relative overflow-hidden bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 py-2.5 rounded-full font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 group"
            >
              <div className="animate-button-shine" />
              Étude pour AG <PhoneIcon size={16} className="group-hover:rotate-12 transition-transform" />
            </button>
          </div>

        </div>
      </nav>

      {/* STICKY BOTTOM BAR FIXE (MOBILE ONLY) - Intelligente */}
      <div className={`lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-500 ${showFloatingCta ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex flex-col">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Aides Débloquées</p>
            <p className={`text-xl sm:text-2xl font-black text-green-600 transition-all duration-300 ${isPulsing ? 'scale-110' : 'scale-100'}`}>
              +{Math.round(results.totalSubventions).toLocaleString('fr-FR')}€
            </p>
          </div>
          <button 
            onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
            className="relative overflow-hidden bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 py-3 rounded-full font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 group"
          >
            <div className="animate-button-shine" />
            Étude pour AG <PhoneIcon size={16} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>

      <main>
        {/* HERO SECTION */}
        <section className="relative h-[90vh] flex items-center overflow-hidden bg-[#032b60]">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2000&auto=format&fit=crop" 
              className="w-full h-full object-cover opacity-30 animate-bg-pan" 
              alt="Parking de copropriété" 
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
                  L'infrastructure <br/><span style={{ color: brandTeal }}>collective.</span>
                </h1>
              </FadeIn>
              
              <FadeIn delay={500} direction="up">
                <p className="text-lg md:text-xl text-white/80 leading-relaxed font-medium max-w-2xl text-balance">
                  Infrastructure subventionnée, préfinancement possible et supervision complète. Équipez votre parking partagé en toute transparence.
                </p>
              </FadeIn>
              
              <FadeIn delay={700} direction="up">
                <div ref={heroRef} className="flex flex-col items-center gap-4 mt-4 animate-float">
                  <button 
                    onClick={() => simulatorRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                    className="relative overflow-hidden inline-flex items-center justify-center gap-3 bg-[#FF6B00] hover:bg-[#E66000] text-white px-8 sm:px-12 py-4 sm:py-5 rounded-full font-black text-base sm:text-lg shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 active:scale-95 transition-all w-fit group text-center"
                  >
                    <div className="animate-button-shine" />
                    Évaluer les subventions <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                  </button>
                  <div className="flex flex-col gap-2 items-center">
                    <button 
                      onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
                      className="text-sm text-white/80 hover:text-white font-bold underline underline-offset-4 decoration-white/30 hover:decoration-white transition-all flex items-center gap-2 mt-2"
                    >
                      <PhoneIcon size={14} /> Ou planifier une étude pour l'AG
                    </button>
                    <p className="text-xs text-white/50 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                      <CheckCircle size={14} className="text-[#0097b2]"/> Présentation en AG par un expert IRVE
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
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none" style={{ color: brandNavy }}>L'infrastructure <br/><span style={{ color: brandTeal }}>Maîtrisée</span></h2>
                <p className="text-lg text-slate-500 font-medium leading-relaxed mt-6">La recharge de véhicules électriques en copropriété ne doit plus être un frein. Notre solution IRVE collective protège juridiquement et sécurise le syndicat des copropriétaires.</p>
                
                <div className="space-y-6">
                  {[
                    { i: <BuildingIcon/>, t: "Infrastructure Subventionnée", d: "Installation de l'artère électrique. Coût allégé grâce aux aides Advenir et à nos solutions de préfinancement." },
                    { i: <ServerIcon/>, t: "Supervision & Facturation", d: "Notre logiciel gère tout : facturation automatique au résident et prélèvements. Gestion administrative simplifiée pour le syndic." },
                    { i: <FileTextIcon/>, t: "Accompagnement AG", d: "Nous montons le dossier technique et un expert est présent lors de votre AG pour rassurer l'assemblée." }
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-5 group hover:-translate-y-1 transition-transform duration-300 bg-white p-4 rounded-3xl shadow-sm hover:shadow-md border border-slate-100">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-[#0097b2] group-hover:text-white transition-colors duration-500 shrink-0 text-[#0097b2]">
                        {item.i}
                      </div>
                      <div className="flex flex-col justify-center">
                        <h4 className="font-black text-sm uppercase tracking-wider" style={{ color: brandNavy }}>{item.t}</h4>
                        <p className="text-xs text-slate-400 font-medium mt-1">{item.d}</p>
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
                      <div className="flex gap-1 text-[#0097b2] mb-4">
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

        {/* BLOC EXPERTISE / CONFIANCE */}
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
                  La garantie de la <br/><span className="text-[#0097b2]">conformité légale.</span>
                </h2>
                <p className="text-lg text-blue-100/80 font-medium leading-relaxed">
                  L'installation en milieu collectif souterrain exige une maîtrise stricte des normes de sécurité incendie et de dimensionnement électrique. Nos artisans IRVE s'en portent garants.
                </p>
                <div className="flex items-center gap-6 pt-4">
                  <div className="flex -space-x-4">
                    <img className="w-12 h-12 rounded-full border-2 border-[#032b60] object-cover hover:-translate-y-1 transition-transform" src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=faces" alt="Technicien CHARGéO" />
                    <img className="w-12 h-12 rounded-full border-2 border-[#032b60] object-cover hover:-translate-y-1 transition-transform" src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces" alt="Expert CHARGéO" />
                    <div className="w-12 h-12 rounded-full border-2 border-[#032b60] bg-[#0097b2] flex items-center justify-center text-white font-black text-[10px] hover:-translate-y-1 transition-transform">IRVE</div>
                  </div>
                  <div className="text-sm font-bold">
                    <p className="text-white">Experts Copropriété</p>
                    <p className="text-[#0097b2]">Réseau certifié</p>
                  </div>
                </div>
              </div>

              <div className="md:w-1/2 w-full grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl hover:bg-white/20 transition-colors duration-300 h-full flex flex-col">
                  <AwardIcon className="text-[#0097b2] mb-4" size={32} />
                  <h4 className="text-white font-black uppercase tracking-wider mb-2">Qualification IRVE</h4>
                  <p className="text-blue-100/70 text-xs font-medium leading-relaxed flex-grow">Certification stricte garantissant la validité de l'assurance multirisque immeuble de la copropriété.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl hover:bg-white/20 transition-colors duration-300 h-full flex flex-col">
                  <PiggyBankIcon className="text-[#0097b2] mb-4" size={32} />
                  <h4 className="text-white font-black uppercase tracking-wider mb-2">Aides Collectives</h4>
                  <p className="text-blue-100/70 text-xs font-medium leading-relaxed flex-grow">Nous sommes agréés pour monter les dossiers "Infrastructure Collective" de la Prime Advenir (jusqu'à 8 000€).</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl hover:bg-white/20 transition-colors duration-300 sm:col-span-2">
                  <BuildingIcon className="text-[#0097b2] mb-4" size={32} />
                  <h4 className="text-white font-black uppercase tracking-wider mb-2">Délestage Dynamique (Sécurité)</h4>
                  <p className="text-blue-100/70 text-xs font-medium leading-relaxed">Notre architecture intègre une gestion intelligente de la puissance pour ne jamais faire disjoncter l'immeuble, même si tous les résidents se rechargent en même temps.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SIMULATEUR */}
        <section ref={simulatorRef} id="simulateur" className="py-24 bg-white scroll-mt-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-50 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-6xl font-black text-[#032b60] uppercase tracking-tighter leading-tight">
                Estimez les <br className="md:hidden"/><span className="text-[#0097b2]">subventions du projet</span>
              </h2>
              <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto text-balance">
                Découvrez la valeur de l'infrastructure et des aides débloquées pour votre copropriété grâce au programme Advenir.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
              
              {/* CARTE 1 : PLACES DE PARKING */}
              <div className="order-1 lg:row-start-1 lg:col-start-1 h-[260px] sm:h-[280px] flex flex-col justify-center bg-slate-50 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 text-[#032b60]">
                      <BuildingIcon className="text-[#0097b2]"/> Taille du Parking
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">Nombre total de places dans la résidence.</p>
                  </div>
                  <span className={`text-3xl font-black text-[#0097b2] transition-transform duration-300 ${isPulsing ? 'scale-110' : 'scale-100'}`}>
                    {parkingSpots} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">places</span>
                  </span>
                </div>
                <input 
                  type="range" min="10" max="200" step="5" value={parkingSpots} 
                  onChange={(e) => { setParkingSpots(parseInt(e.target.value)); if(interestedResidents > parseInt(e.target.value)) setInterestedResidents(parseInt(e.target.value)); }} 
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" 
                />
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <span>Petit (10)</span><span>Grand (200+)</span>
                </div>
              </div>

              {/* CARTE 2 : RÉSIDENTS INTÉRESSÉS */}
              <div className="order-2 lg:row-start-2 lg:col-start-1 h-[260px] sm:h-[280px] flex flex-col justify-center bg-slate-50 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 text-[#032b60]">
                      <UsersIcon className="text-[#0097b2]"/> Premières demandes
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">Résidents souhaitant une borne sur leur place.</p>
                  </div>
                  <span className={`text-3xl font-black text-[#0097b2] transition-transform duration-300 ${isPulsing ? 'scale-110' : 'scale-100'}`}>
                    {interestedResidents} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">demandes</span>
                  </span>
                </div>
                <input 
                  type="range" min="1" max={Math.min(50, parkingSpots)} step="1" value={interestedResidents} 
                  onChange={(e) => setInterestedResidents(parseInt(e.target.value))} 
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" 
                />
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-tighter font-black">
                  <span>Juste moi (1)</span><span>Plusieurs résidents</span>
                </div>
              </div>

              {/* CARTE 3 : BUDGET COPRO */}
              <div ref={resultsRef} className="order-3 lg:row-start-1 lg:col-start-2 h-full flex flex-col justify-center bg-slate-50 p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden hover:-translate-y-1 transition-all">
                <ShieldCheck className="absolute -right-10 -bottom-10 opacity-5 text-slate-400 transition-transform duration-1000 hover:rotate-12" size={200} />
                <h3 className="text-[#032b60] text-sm font-black uppercase tracking-widest mb-2 relative z-10">Budget Copropriété</h3>
                <div className={`flex items-baseline gap-2 relative z-10 transition-all duration-300`}>
                  <span className="text-5xl md:text-6xl font-black tracking-tighter text-[#032b60]">Sur Devis</span>
                </div>
                <p className="text-xs text-slate-500 font-bold mt-2 relative z-10">L'artère collective est subventionnée à 50%. Obtenez un chiffrage précis déduction faite des aides.</p>
                
                <button 
                  ref={simulatorCtaRef}
                  onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
                  className="relative overflow-hidden mt-8 w-full inline-flex items-center justify-center gap-3 bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-black text-sm sm:text-base shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 active:scale-95 transition-all group z-10"
                >
                  <div className="animate-button-shine" />
                  Planifier l'étude technique (AG) <PhoneIcon size={18} className="group-hover:rotate-12 transition-transform" />
                </button>
              </div>

              {/* CARTE 4 : SUBVENTIONS DYNAMIQUES */}
              <div className="order-4 lg:row-start-2 lg:col-start-2 h-full flex flex-col justify-center bg-[#032b60] p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white border border-white/5 hover:shadow-[0_20px_50px_rgba(3,43,96,0.5)] transition-all hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#0097b2]/20 rounded-full blur-[80px] -mr-20 -mt-20"></div>
                
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-200 mb-6 flex items-center gap-3 relative z-10"><AwardIcon size={18}/> Aides Advenir débloquées</h3>
                
                <div className="flex flex-col mb-6 relative z-10">
                   <span className={`text-4xl md:text-5xl font-black tracking-tighter text-[#0097b2] transition-transform duration-300 ${isPulsing ? 'scale-105' : 'scale-100'}`}>
                      {Math.round(animatedSubventions).toLocaleString('fr-FR')} €
                   </span>
                   <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1">Valeur totale des aides estimées</span>
                </div>

                <div className="space-y-4 relative z-10">
                  <div className="bg-white/10 border border-white/20 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-blue-200 font-bold uppercase tracking-widest">Part Copropriété</p>
                      <p className="text-[10px] text-white/50 font-medium">L'infrastructure collective</p>
                    </div>
                    <p className="text-white font-black text-sm">Jusqu'à 8 000€</p>
                  </div>
                  <div className="bg-white/10 border border-white/20 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-blue-200 font-bold uppercase tracking-widest">Part Individuelle</p>
                      <p className="text-[10px] text-white/50 font-medium">Déduite des devis résidents</p>
                    </div>
                    <p className="text-white font-black text-sm">{interestedResidents * 600}€</p>
                  </div>
                </div>
              </div>

            </div>

            {/* === BLOC FORMULAIRE : DEVIS & VISITE TECHNIQUE === */}
            <div id="formulaire-devis" ref={formRef} className="w-full mt-16 lg:mt-24 bg-white p-4 sm:p-8 md:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col relative z-10 mx-auto">
              <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0 shadow-inner">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-[#032b60] uppercase tracking-widest text-xs sm:text-sm leading-tight">Planifier la visite technique (Pré-AG)</h3>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Un expert qualifie la faisabilité technique de votre parking</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-sm">
                 <span className="text-orange-500 mt-0.5 text-lg leading-none">⚠️</span>
                 <p className="text-xs sm:text-sm text-orange-800 font-medium leading-relaxed">
                   Nos plannings d'installation se remplissent vite. <span className="font-black">Réservez votre visite technique gratuite aujourd'hui pour bloquer votre créneau.</span>
                 </p>
              </div>

              <div className="w-full relative h-[850px] sm:h-[800px] lg:h-[900px]">
                <iframe 
                  className="w-full h-full border-none rounded-2xl" 
                  src="https://forms.clickup.com/90151325642/f/2kyq03ya-7815/I5ELJ3PBRLRC158WLS?Source=Site%20Web%20Copro" 
                  title="Formulaire CHARGéO Copropriété" 
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
                    <span className="font-black text-lg pr-8" style={{ color: brandNavy }}>{faq.q}</span>
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
      <footer className="bg-[#032B60] py-16 md:py-24 border-t border-white/5 overflow-hidden relative">
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#0097b2] rounded-full blur-[150px] opacity-30 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-12 md:gap-16 relative z-10">
           
           <div className="space-y-6 text-left max-w-sm">
              <Logo light={true} className="scale-100 sm:scale-110 origin-left" />
              <div className="space-y-2 mt-4">
                 <p className="text-white/80 font-medium text-sm sm:text-base leading-relaxed">
                   8, Avenue du général De Gaulle<br />
                   74200 THONON-LES-BAINS
                 </p>
                 <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-4">Entreprise en cours de création</p>
              </div>
           </div>
           
           <div className="flex flex-col sm:flex-row gap-12 md:gap-24 text-left">
              <div className="space-y-5">
                 <h4 className="text-white/40 font-bold text-xs uppercase tracking-[0.2em]">Navigation</h4>
                 <ul className="space-y-3">
                    <li><a href="/" className="text-white/80 text-sm font-medium hover:text-[#0097b2] hover:translate-x-1 transition-all inline-block">Offre Particuliers</a></li>
                    <li><a href="/pro" className="text-white/80 text-sm font-medium hover:text-[#0097b2] hover:translate-x-1 transition-all inline-block">Offre Professionnels</a></li>
                    <li><a href="/copropriete" className="text-[#0097b2] font-black text-sm hover:translate-x-1 transition-all inline-block">Offre Copropriétés</a></li>
                    <li className="pt-2 border-t border-white/10 mt-2"><a href="#" className="text-white/80 text-sm font-medium hover:text-[#0097b2] hover:translate-x-1 transition-all inline-block">Devenir Franchisé</a></li>
                 </ul>
              </div>
              
              <div className="space-y-5">
                 <h4 className="text-white/40 font-bold text-xs uppercase tracking-[0.2em]">Assistance</h4>
                 <ul className="space-y-4">
                    <li>
                      <a href="tel:0485692204" className="text-white font-bold text-base sm:text-lg hover:text-[#0097b2] transition-colors flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"><PhoneIcon size={14} /></span>
                        04 85 69 22 04
                      </a>
                    </li>
                    <li>
                      <a href="mailto:contact@chargeo.fr" className="text-white font-bold text-base sm:text-lg hover:text-[#0097b2] transition-colors flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"><MailIcon size={14} /></span>
                        contact@chargeo.fr
                      </a>
                    </li>
                    <li className="pt-2 flex gap-4">
                      <a href="#" className="text-white/40 text-[10px] font-bold uppercase tracking-wider hover:text-[#0097b2] transition-colors">Mentions Légales</a>
                      <a href="#" className="text-white/40 text-[10px] font-bold uppercase tracking-wider hover:text-[#0097b2] transition-colors">CGV</a>
                    </li>
                 </ul>
              </div>
           </div>

        </div>
      </footer>

    </div>
  );
}