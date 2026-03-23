"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- ICÔNES VECTORIELLES PURES ---
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
const CarIcon = ({ size = 24, color = "currentColor", className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>;
const WrenchIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>;
const PhoneIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
const MailIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>;
const MenuIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const BuildingIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>;
const UsersIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const HomeIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const CreditCardIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
const PlugIcon = ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22v-5"></path><path d="M9 8V2"></path><path d="M15 8V2"></path><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"></path></svg>;

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

export default function ProPage() {
  const [scrolled, setScrolled] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [currentReview, setCurrentReview] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Variables Simulateur Pro (Monétisation)
  const [chargePoints, setChargePoints] = useState(4);
  const [sessionsPerDay, setSessionsPerDay] = useState(2);
  const [marginPerKwh, setMarginPerKwh] = useState(0.20);
  const [kwhPerSession, setKwhPerSession] = useState(25);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

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

  // Calculs Pro (Revenus de monétisation)
  const results = useMemo(() => {
    const safeChargePoints = isNaN(chargePoints) ? 0 : chargePoints;
    const safeSessions = isNaN(sessionsPerDay) ? 0 : sessionsPerDay;
    const safeMargin = isNaN(marginPerKwh) ? 0 : marginPerKwh;
    const safeKwh = isNaN(kwhPerSession) ? 0 : kwhPerSession;

    // Base conservatrice de 300 jours d'ouverture par an
    const annualRevenue = safeChargePoints * safeSessions * safeKwh * safeMargin * 300;
    
    return { 
      annualRevenue: Math.max(0, annualRevenue) 
    };
  }, [chargePoints, sessionsPerDay, marginPerKwh, kwhPerSession]);

  const animatedRevenue = useAnimatedValue(results.annualRevenue, 1200, isInView, triggerKey);

  const reviews = useMemo(() => [
    {
      text: "Nous voulions offrir un service de recharge à notre clientèle. CHARGéO a géré l'installation, et la borne génère aujourd'hui des revenus chaque mois.",
      author: "Directeur d'Hôtel",
      location: "74500 Évian",
      image: "https://images.unsplash.com/photo-1621293954908-907159247fc8?q=80&w=900&auto=format&fit=crop"
    },
    {
      text: "Pour nos commerciaux, la solution à domicile est parfaite. Le logiciel relève automatiquement leurs recharges pro. Gain de temps énorme.",
      author: "DRH",
      location: "74000 Annecy",
      image: "https://images.unsplash.com/photo-1572097034177-8d0fc65507d8?q=80&w=900&auto=format&fit=crop"
    },
    {
      text: "Nous avons équipé notre parking avec délestage dynamique. Parfait pour respecter la Loi LOM, et l'amortissement comptable est un vrai plus.",
      author: "Gérant",
      location: "74200 Thonon",
      image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=900&auto=format&fit=crop"
    }
  ], []);

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
  }, [chargePoints, sessionsPerDay, marginPerKwh, kwhPerSession]);

  const faqs = [
    { q: "Comment fonctionne la monétisation ?", a: "C'est très simple : nous installons des bornes communicantes. Vous décidez du tarif appliqué au kWh. Notre logiciel s'occupe de facturer l'utilisateur final par QR Code et vous reverse les revenus mensuellement." },
    { q: "Domicile Collaborateurs : Comment rembourser l'électricité ?", a: "Notre logiciel isole la consommation liée au véhicule professionnel grâce au badge RFID du salarié. Chaque mois, un relevé certifié permet le remboursement en note de frais." },
    { q: "Quelles sont les obligations de la Loi LOM ?", a: "La Loi LOM oblige les entreprises (parc > 100 véhicules) à intégrer un pourcentage de véhicules à faibles émissions. Équiper vos parkings devient une nécessité légale." },
    { q: "Quels sont les avantages fiscaux ?", a: "L'électrification permet une exonération totale de la TVS. De plus, l'entreprise bénéficie d'un plafond d'amortissement rehaussé et la TVA sur l'électricité consommée est récupérable." }
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

      {/* NAVIGATION ULTRA COMPACTE */}
      <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled ? 'bg-white/95 shadow-lg py-2 sm:py-3 backdrop-blur-md' : 'bg-transparent py-4 sm:py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center gap-2">
          
          {/* LOGO (Légèrement réduit sur mobile pour gagner de la place) */}
          <div className="flex-shrink-0">
            <Logo light={!scrolled} className="scale-75 sm:scale-100 origin-left -ml-2 sm:ml-0" />
          </div>

          {/* SÉLECTEUR TOUJOURS VISIBLE SANS CLIC */}
          <div className={`flex items-center p-1 rounded-full border transition-colors duration-300 ${scrolled ? 'bg-slate-100 border-slate-200' : 'bg-white/10 border-white/20 backdrop-blur-md'}`}>
            <a href="/" className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-bold transition-all ${scrolled ? 'text-slate-500 hover:text-[#032b60]' : 'text-white/70 hover:text-white'}`}>Particuliers</a>
            <a href="/pro" className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-black bg-[#0097b2] text-white shadow-md">Pros</a>
            <a href="/copropriete" className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-bold transition-all ${scrolled ? 'text-slate-500 hover:text-[#032b60]' : 'text-white/70 hover:text-white'}`}>Copros</a>
          </div>

          {/* CTA DESKTOP (Apparaît uniquement sur PC, et se cache si un autre bouton est visible) */}
          <div className={`hidden lg:flex flex-shrink-0 transition-all duration-500 ${showFloatingCta ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
            <button 
              onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
              className="relative overflow-hidden bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 py-2.5 rounded-full font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 group"
            >
              <div className="animate-button-shine" />
              Audit B2B Gratuit <PhoneIcon size={16} className="group-hover:rotate-12 transition-transform" />
            </button>
          </div>

        </div>
      </nav>

      {/* STICKY BOTTOM BAR FIXE (MOBILE ONLY) - Intelligente (Se cache si un autre bouton est visible) */}
      <div className={`lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-500 ${showFloatingCta ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex flex-col">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Revenus Potentiels</p>
            <p className={`text-xl sm:text-2xl font-black text-green-600 transition-all duration-300 ${isPulsing ? 'scale-110' : 'scale-100'}`}>
              +{Math.round(results.annualRevenue).toLocaleString('fr-FR')}€ / an
            </p>
          </div>
          <button 
            onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
            className="relative overflow-hidden bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 py-3 rounded-full font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 group"
          >
            <div className="animate-button-shine" />
            Audit B2B <PhoneIcon size={16} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>

      <main>
        {/* HERO SECTION */}
        <section className="relative h-[90vh] flex items-center overflow-hidden bg-[#032b60]">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1554200876-56c2f25224fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
              className="w-full h-full object-cover opacity-40 animate-bg-pan" 
              alt="Bâtiment entreprise et recharge" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#032b60]/95 via-[#032b60]/40 to-transparent"></div>
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center space-y-6">

            <FadeIn delay={200} direction="up">
                 <div className="flex items-center justify-center gap-2 text-[#0097b2] font-black text-sm sm:text-base uppercase tracking-widest bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm mt-2">
                   <BuildingIcon size={18} />
                   <span>Solutions pour Entreprises & B2B</span>
                 </div>
              </FadeIn>
              
              <FadeIn delay={300} direction="up">
                <h1 className="text-5xl md:text-[6.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase mt-4">
                  L'infrastructure <br/><span style={{ color: brandTeal }}>pour les Pros.</span>
                </h1>
              </FadeIn>
              
              <FadeIn delay={500} direction="up">
                <p className="text-lg md:text-xl text-white/80 leading-relaxed font-medium max-w-2xl text-balance">
                  Électrifiez votre flotte, équipez vos collaborateurs à domicile ou monétisez votre parking client. Nous gérons votre projet de A à Z.
                </p>
              </FadeIn>
              
              <FadeIn delay={700} direction="up">
                <div ref={heroRef} className="flex flex-col items-center gap-4 mt-4 animate-float">
                  <button 
                    onClick={() => simulatorRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                    className="relative overflow-hidden inline-flex items-center justify-center gap-3 bg-[#FF6B00] hover:bg-[#E66000] text-white px-8 sm:px-12 py-4 sm:py-5 rounded-full font-black text-base sm:text-lg shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 active:scale-95 transition-all w-fit group text-center"
                  >
                    <div className="animate-button-shine" />
                    Estimer mes revenus <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                  </button>
                  <div className="flex flex-col gap-2 items-center">
                    <button 
                      onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
                      className="text-sm text-white/80 hover:text-white font-bold underline underline-offset-4 decoration-white/30 hover:decoration-white transition-all flex items-center gap-2 mt-2"
                    >
                      <PhoneIcon size={14} /> Ou demander un Audit B2B directement
                    </button>
                    <p className="text-xs text-white/50 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                      <CheckCircle size={14} className="text-[#0097b2]"/> Étude de rentabilité incluse
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

        {/* CAS D'USAGE B2B + CARROUSEL AVIS */}
        <section id="concept" className="py-24 bg-slate-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
             <div className="space-y-8">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none" style={{ color: brandNavy }}>Chaque entreprise <br/><span style={{ color: brandTeal }}>est unique.</span></h2>
                <p className="text-lg text-slate-500 font-medium leading-relaxed mt-6">Nous avons segmenté nos offres pour répondre aux exigences comptables, fiscales et RH propres à votre modèle économique.</p>
                
                <div className="space-y-6">
                  {[
                    { i: <CarIcon/>, t: "Cas n°1 : La Flotte d'Entreprise", d: "Électrifiez votre parking. Supervision logicielle, badges RFID pour le suivi des consos et délestage pour la sécurité de l'entreprise." },
                    { i: <HomeIcon/>, t: "Cas n°2 : Domicile Collaborateurs", d: "Offrez la recharge à la maison. Notre logiciel isole la conso pro : vous remboursez le salarié sur note de frais, sans gestion." },
                    { i: <CreditCardIcon/>, t: "Cas n°3 : Monétisation Clientèle", d: "Attirez une clientèle premium. Fixez votre marge au kWh, le client paie par QR Code, vous générez des revenus." }
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

        {/* BLOC EXPERTISE / FISCALITÉ PRO */}
        <section className="py-20 bg-white border-t border-slate-100 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-[#032b60] rounded-[2.5rem] p-10 md:p-16 flex flex-col md:flex-row items-center gap-12 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#0097b2]/30 rounded-full blur-[100px] -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000 ease-in-out"></div>

              <div className="md:w-1/2 space-y-6 relative z-10 text-white">
                <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
                  <ShieldCheck size={16} className="text-[#0097b2]" />
                  <span className="text-xs font-black uppercase tracking-widest text-blue-100">Votre Partenaire B2B</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight">
                  Tirez parti des <span className="text-[#0097b2]">leviers financiers.</span>
                </h2>
                <p className="text-lg text-blue-100/80 font-medium leading-relaxed">
                  L'électrification de vos parkings n'est pas qu'une contrainte légale. C'est une opportunité fiscale puissante. Nos experts gèrent l'administratif pour que vous récupériez chaque euro auquel vous avez droit.
                </p>
                <div className="flex items-center gap-6 pt-4">
                  <div className="flex -space-x-4">
                    <img className="w-12 h-12 rounded-full border-2 border-[#032b60] object-cover hover:-translate-y-1 transition-transform" src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=faces" alt="Technicien CHARGéO" />
                    <img className="w-12 h-12 rounded-full border-2 border-[#032b60] object-cover hover:-translate-y-1 transition-transform" src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces" alt="Expert CHARGéO" />
                    <div className="w-12 h-12 rounded-full border-2 border-[#032b60] bg-[#0097b2] flex items-center justify-center text-white font-black text-[10px] hover:-translate-y-1 transition-transform">IRVE</div>
                  </div>
                  <div className="text-sm font-bold">
                    <p className="text-white">Audit gratuit</p>
                    <p className="text-[#0097b2]">74200 Thonon-les-Bains</p>
                  </div>
                </div>
              </div>

              <div className="md:w-1/2 w-full grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl hover:bg-white/20 transition-colors duration-300 h-full flex flex-col">
                  <BuildingIcon className="text-[#0097b2] mb-4" size={32} />
                  <h4 className="text-white font-black uppercase tracking-wider mb-2">Conformité Loi LOM</h4>
                  <p className="text-blue-100/70 text-xs font-medium leading-relaxed flex-grow">Nous vous accompagnons dans la mise aux normes de vos parkings pour respecter vos quotas obligatoires.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl hover:bg-white/20 transition-colors duration-300 h-full flex flex-col">
                  <FileTextIcon className="text-[#0097b2] mb-4" size={32} />
                  <h4 className="text-white font-black uppercase tracking-wider mb-2">Exonération TVS</h4>
                  <p className="text-blue-100/70 text-xs font-medium leading-relaxed flex-grow">Les véhicules 100% électriques de votre flotte bénéficient d'une exonération totale de la Taxe sur les Véhicules de Société.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl hover:bg-white/20 transition-colors duration-300 sm:col-span-2">
                  <AwardIcon className="text-[#0097b2] mb-4" size={32} />
                  <h4 className="text-white font-black uppercase tracking-wider mb-2">Amortissement & TVA</h4>
                  <p className="text-blue-100/70 text-xs font-medium leading-relaxed">Les entreprises bénéficient d'un plafond d'amortissement rehaussé (jusqu'à 30 000€) et la récupération totale de la TVA sur l'électricité consommée par la flotte.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SIMULATEUR DE MONÉTISATION */}
        <section ref={simulatorRef} id="simulateur" className="py-24 bg-white scroll-mt-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-6xl font-black text-[#032b60] uppercase tracking-tighter leading-tight">
                Estimez vos <br className="md:hidden"/><span className="text-[#0097b2]">revenus de recharge</span>
              </h2>
              <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto text-balance">
                Vendez la recharge à vos clients ou visiteurs. Découvrez combien votre parking peut vous rapporter chaque année.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
              
              {/* CARTE 1 : POINTS DE CHARGE */}
              <div className="order-1 lg:row-start-1 lg:col-start-1 h-[260px] sm:h-[280px] flex flex-col justify-center bg-slate-50 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 text-[#032b60]">
                      <PlugIcon className="text-[#0097b2]" size={24}/> Points de charge
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">Combien de places équipées de bornes ?</p>
                  </div>
                  <span className={`text-3xl font-black text-[#0097b2] transition-transform duration-300 ${isPulsing ? 'scale-110' : 'scale-100'}`}>
                    {chargePoints} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">places</span>
                  </span>
                </div>
                <input type="range" aria-label="Points de charge" min="1" max="20" step="1" value={chargePoints} onChange={(e) => setChargePoints(parseInt(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest"><span>1 borne</span><span>20 bornes</span></div>
              </div>

              {/* CARTE 2 : ROTATION */}
              <div className="order-2 lg:row-start-2 lg:col-start-1 h-[260px] sm:h-[280px] flex flex-col justify-center bg-slate-50 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 text-[#032b60]">
                      <UsersIcon className="text-[#0097b2]" size={24}/> Taux de rotation
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">Recharges moyennes par place et par jour.</p>
                  </div>
                  <span className={`text-3xl font-black text-[#0097b2] transition-transform duration-300 ${isPulsing ? 'scale-110' : 'scale-100'}`}>
                    {sessionsPerDay} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">sessions</span>
                  </span>
                </div>
                <input type="range" aria-label="Taux de rotation" min="1" max="10" step="1" value={sessionsPerDay} onChange={(e) => setSessionsPerDay(parseInt(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-tighter font-black"><span>Faible (1/j)</span><span>Très actif (10/j)</span></div>
              </div>

              {/* CARTE 3 : RÉGLAGES AVANCÉS B2B */}
              <div className="order-3 lg:row-start-3 lg:col-start-1 w-full">
                 <button 
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    aria-expanded={showAdvancedSettings ? "true" : "false"}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-[#0097b2] text-slate-500 hover:text-[#0097b2] hover:shadow-md px-6 py-4 rounded-full font-bold text-sm transition-all shadow-sm"
                 >
                    <SettingsIcon size={18} className={`transition-transform duration-700 ${showAdvancedSettings ? 'rotate-90' : 'rotate-0'}`} />
                    {showAdvancedSettings ? "Masquer les marges" : "Ajuster votre marge de revente (kWh)"}
                    <ChevronDown size={18} className={`transition-transform duration-300 ${showAdvancedSettings ? 'rotate-180' : ''}`} />
                 </button>

                 <div className={`transition-all duration-500 overflow-hidden ${showAdvancedSettings ? 'max-h-[800px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-slate-50 border border-slate-100 p-6 md:p-8 rounded-[2.5rem] shadow-inner flex flex-col gap-8">
                       
                       <div className="space-y-4">
                         <div className="flex justify-between items-end">
                           <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Marge nette par kWh revendu</span>
                           <span className="text-lg font-black text-[#0097b2]">{marginPerKwh.toFixed(2)}<span className="text-xs"> €</span></span>
                         </div>
                         <input type="range" aria-label="Marge par kWh" min="0.05" max="0.50" step="0.01" value={marginPerKwh} onChange={(e) => setMarginPerKwh(parseFloat(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
                         <p className="text-[10px] text-slate-400 font-medium italic">*La différence entre le prix facturé au client final et le coût de votre électricité.</p>
                       </div>

                       <div className="space-y-4">
                         <div className="flex justify-between items-end">
                           <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Énergie moyenne (Session)</span>
                           <span className="text-lg font-black text-[#0097b2]">{kwhPerSession}<span className="text-xs"> kWh</span></span>
                         </div>
                         <input type="range" aria-label="Energie moyenne" min="10" max="50" step="5" value={kwhPerSession} onChange={(e) => setKwhPerSession(parseInt(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0097b2]" />
                       </div>

                    </div>
                 </div>
              </div>

              {/* CARTE 4 : REVENUS GÉNÉRÉS */}
              <div ref={resultsRef} className="order-4 lg:row-start-1 lg:col-start-2 h-full flex flex-col justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-8 md:p-10 rounded-[2.5rem] border border-green-200 shadow-xl relative overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1">
                <PiggyBankIcon className="absolute -right-10 -bottom-10 opacity-10 text-green-600 transition-transform duration-1000 hover:rotate-12" size={200} />
                <h3 className="text-green-800 text-sm font-black uppercase tracking-widest mb-2 relative z-10">Revenus nets générés</h3>
                <div className={`flex items-baseline gap-2 relative z-10 transition-all duration-300 ${isPulsing ? 'scale-105 text-emerald-500 translate-x-2' : 'scale-100 text-green-600'}`}>
                  <span className="text-6xl md:text-7xl font-black tracking-tighter">+{Math.round(animatedRevenue).toLocaleString('fr-FR')}</span>
                  <span className="text-2xl font-black text-green-700">€ / an</span>
                </div>
                <p className="text-xs text-green-800/70 font-bold mt-2 relative z-10">*Estimation sur une base conservatrice de 300 jours d'ouverture par an.</p>
                
                {/* BOUTON DANS LE SIMULATEUR POUR FAIRE LE PONT VERS LE FORMULAIRE */}
                <button 
                  ref={simulatorCtaRef}
                  onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
                  className="relative overflow-hidden mt-8 w-full inline-flex items-center justify-center gap-3 bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-black text-sm sm:text-base shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 active:scale-95 transition-all group z-10"
                >
                  <div className="animate-button-shine" />
                  Audit B2B Gratuit <PhoneIcon size={18} className="group-hover:rotate-12 transition-transform" />
                </button>
              </div>

              {/* CARTE 5 : FACTURATION AUTOMATISÉE */}
              <div className="order-5 lg:row-start-2 lg:col-start-2 h-full flex flex-col justify-center bg-[#032b60] p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white border border-white/5 hover:shadow-[0_20px_50px_rgba(3,43,96,0.5)] transition-all hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#0097b2]/20 rounded-full blur-[80px] -mr-20 -mt-20"></div>
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-200 mb-8 flex items-center gap-3 relative z-10"><CreditCardIcon size={18}/> Une facturation automatisée</h3>
                
                <div className="space-y-6 relative z-10">
                  <div className="bg-white/10 border border-white/20 rounded-2xl p-4 flex flex-col gap-1">
                    <p className="text-xs text-[#0097b2] font-bold uppercase tracking-widest flex items-center gap-2"><CheckCircle size={14}/> 1. Fixez votre tarif</p>
                    <p className="text-xs text-white/70 font-medium">Vous définissez librement le prix de vente au kWh via notre plateforme.</p>
                  </div>
                  <div className="bg-white/10 border border-white/20 rounded-2xl p-4 flex flex-col gap-1">
                    <p className="text-xs text-[#0097b2] font-bold uppercase tracking-widest flex items-center gap-2"><CheckCircle size={14}/> 2. Encaissement direct</p>
                    <p className="text-xs text-white/70 font-medium">Les clients scannent un QR Code et paient par carte. Aucun terminal physique requis.</p>
                  </div>
                  <div className="bg-white/10 border border-white/20 rounded-2xl p-4 flex flex-col gap-1">
                    <p className="text-xs text-[#0097b2] font-bold uppercase tracking-widest flex items-center gap-2"><CheckCircle size={14}/> 3. Versement des revenus</p>
                    <p className="text-xs text-white/70 font-medium">Notre logiciel s'occupe de la facturation et vous reverse les fonds mensuellement.</p>
                  </div>
                </div>
              </div>

            </div>

            {/* === BLOC FORMULAIRE : DEVIS & VISITE TECHNIQUE === */}
            <div id="formulaire-devis" ref={formRef} className="w-full mt-16 lg:mt-24 bg-white p-4 sm:p-8 md:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col relative z-10 mx-auto">
              <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0 shadow-inner">
                    <PhoneIcon size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-[#032b60] uppercase tracking-widest text-xs sm:text-sm leading-tight">Demander un Audit B2B</h3>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Un chargé d'affaires qualifie votre projet</p>
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
                  src="https://forms.clickup.com/90151325642/f/2kyq03ya-7815/I5ELJ3PBRLRC158WLS?Source=Site%20Web%20Pro" 
                  title="Formulaire CHARGéO Pro" 
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
                    <li><a href="/pro" className="text-[#0097b2] font-black text-sm hover:translate-x-1 transition-all inline-block">Offre Professionnels</a></li>
                    <li><a href="/copropriete" className="text-white/80 text-sm font-medium hover:text-[#0097b2] hover:translate-x-1 transition-all inline-block">Offre Copropriétés</a></li>
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