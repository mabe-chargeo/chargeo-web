"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
// Utilisation de lucide-react pour toutes les icônes
import { 
  ChevronDown, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Clock, 
  CheckCircle, 
  Star, 
  Settings as SettingsIcon, 
  MapPin as MapPinIcon, 
  Award as AwardIcon, 
  FileText as FileTextIcon, 
  PiggyBank as PiggyBankIcon, 
  Building as BuildingIcon, 
  Users as UsersIcon, 
  Server as ServerIcon, 
  Wrench as WrenchIcon, 
  Phone as PhoneIcon, 
  Mail as MailIcon, 
  Menu as MenuIcon 
} from 'lucide-react';

// --- COMPOSANTS INTERNES (Intégrés pour garantir la compilation) ---

/**
 * Hook personnalisé pour l'animation des nombres
 */
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

/**
 * Composant pour l'apparition fluide au scroll
 */
function FadeIn({ children, delay = 0, direction = 'up' }: { children: React.ReactNode, delay?: number, direction?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold: 0.15 }
    );
    
    if (ref.current) observer.observe(ref.current);
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

/**
 * Composant Logo
 */
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

/**
 * Composant BrandLogo pour les marques partenaires
 */
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

// --- COMPOSANT PRINCIPAL : PAGE COPROPRIÉTÉ ---

export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [currentReview, setCurrentReview] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
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

  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const brandNavy = "#032b60";
  const brandTeal = "#0097b2";

  // Calcul Subventions Copro (Logique métier)
  const results = useMemo(() => {
    const safeParkingSpots = isNaN(parkingSpots) ? 0 : parkingSpots;
    const safeInterested = isNaN(interestedResidents) ? 0 : interestedResidents;
    
    // Base 8000€ pour l'infrastructure collective + 600€ par résident intéressé
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

    if (resultsRef.current) observer.observe(resultsRef.current);

    const timer = setInterval(() => {
        setCurrentReview((prev) => (prev + 1) % reviews.length);
    }, 5000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
      clearInterval(timer);
    };
  }, [reviews.length]);

  useEffect(() => {
    const observerOptions = { threshold: 0 };
    const heroObserver = new IntersectionObserver(([entry]) => setIsHeroVisible(entry.isIntersecting), observerOptions);
    const formObserver = new IntersectionObserver(([entry]) => setIsFormVisible(entry.isIntersecting), observerOptions);

    if (heroRef.current) heroObserver.observe(heroRef.current);
    if (formRef.current) formObserver.observe(formRef.current);

    return () => {
      heroObserver.disconnect();
      formObserver.disconnect();
    };
  }, []);

  const showFloatingCta = !isHeroVisible && !isFormVisible;

  useEffect(() => {
    setTriggerKey(prev => prev + 1);
    setIsPulsing(true);
    const pulseTimer = setTimeout(() => setIsPulsing(false), 300);
    return () => clearTimeout(pulseTimer);
  }, [parkingSpots, interestedResidents]);

  const faqs = [
    { q: "L'infrastructure IRVE collective a-t-elle un coût pour l'immeuble ?", a: "L'installation est lourdement subventionnée (jusqu'à 50% par la Prime Advenir avec un plafond de 8 000€). Le reste à charge éventuel dépend de la complexité technique du parking et de sa configuration." },
    { q: "Comment est facturée l'électricité ?", a: "Notre solution de supervision gère tout de A à Z. Chaque résident équipé dispose de son propre sous-compteur intelligent. Les factures lui sont envoyées directement (prélèvement automatique), en fonction de sa consommation réelle." },
    { q: "Et si l'infrastructure collective n'est pas votée en AG ?", a: "En dernier recours, il est possible d'envisager un branchement individuel 'Droit à la Prise'. C'est une démarche légale où le résident paie son propre tirage, mais elle est souvent moins évolutive que le collectif." },
    { q: "L'immeuble risque-t-il de disjoncter ?", a: "Absolument pas. L'infrastructure collective intègre un système de délestage dynamique (Load Balancing) qui répartit intelligemment la puissance disponible entre tous les véhicules branchés." }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#0097b2]/20 scroll-smooth pb-24 lg:pb-0">
      
      {/* INJECTION DES ANIMATIONS CSS COMPLEXES ET FORCAGE DU MODE CLAIR */}
      <style dangerouslySetInnerHTML={{__html: `
        :root { color-scheme: light only !important; }
        html, body { background-color: #ffffff !important; color: #0f172a !important; }
        @keyframes slowPan { 0% { transform: scale(1.05) translate(0, 0); } 100% { transform: scale(1.15) translate(-1%, 1%); } }
        .animate-bg-pan { animation: slowPan 25s ease-in-out infinite alternate; }
        @keyframes shine { 100% { left: 125%; } }
        .animate-button-shine { position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%); transform: skewX(-20deg); animation: shine 3s infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-float { animation: float 4s ease-in-out infinite; }
      `}} />

      {/* NAVIGATION (Modifiée en mode Landing Page fermée) */}
      <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled ? 'bg-white/95 shadow-lg py-2 sm:py-3 backdrop-blur-md' : 'bg-transparent py-4 sm:py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center gap-2">
          
          <div className="flex-shrink-0">
            <Logo light={!scrolled} className="scale-75 sm:scale-100 origin-left -ml-2 sm:ml-0" />
          </div>

          {/* LIENS INTERNES UNIQUEMENT */}
          <div className={`hidden md:flex items-center p-1 rounded-full border transition-colors duration-300 ${scrolled ? 'bg-slate-100 border-slate-200' : 'bg-white/10 border-white/20 backdrop-blur-md'}`}>
            <a href="#simulateur" className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-bold transition-all ${scrolled ? 'text-slate-500 hover:text-[#032b60]' : 'text-white/80 hover:text-white'}`}>Subventions</a>
            <a href="#concept" className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-bold transition-all ${scrolled ? 'text-slate-500 hover:text-[#032b60]' : 'text-white/80 hover:text-white'}`}>Notre Méthode</a>
            <a href="#formulaire-devis" className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-bold transition-all ${scrolled ? 'text-slate-500 hover:text-[#032b60]' : 'text-white/80 hover:text-white'}`}>Demander une Étude</a>
          </div>

          {/* CTA APPARAISSANT AU SCROLL */}
          <div className={`hidden lg:flex flex-shrink-0 transition-all duration-500 ${showFloatingCta ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
            <button 
              onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })} 
              className="relative overflow-hidden bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 py-2.5 rounded-full font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:scale-105 group"
            >
              <div className="animate-button-shine" />
              Étude pour AG <PhoneIcon size={16} className="group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </div>
      </nav>

      {/* STICKY BOTTOM BAR (MOBILE) */}
      <div className={`lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-500 ${showFloatingCta ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex flex-col">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Aides Débloquées</p>
            <p className={`text-xl sm:text-2xl font-black text-green-600 transition-all duration-300 ${isPulsing ? 'scale-110' : 'scale-100'}`}>
              +{Math.round(results.totalSubventions).toLocaleString('fr-FR')}€
            </p>
          </div>
          <button 
            onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })} 
            className="relative overflow-hidden bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 py-3 rounded-full font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 group"
          >
            <div className="animate-button-shine" />
            Étude AG <PhoneIcon size={16} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>

      <main>
        {/* HERO SECTION COPRO */}
        <section className="relative h-[90vh] flex items-center overflow-hidden bg-[#032b60]">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2000&auto=format&fit=crop" 
              className="w-full h-full object-cover opacity-30 animate-bg-pan" 
              alt="Immeuble moderne" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#032b60]/95 via-[#032b60]/40 to-transparent"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10 w-full text-center flex flex-col items-center gap-6">
            <FadeIn delay={200} direction="up">
                 <div className="flex items-center justify-center gap-2 text-[#0097b2] font-black text-sm sm:text-base uppercase tracking-widest bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm mt-2">
                   <UsersIcon size={18} />
                   <span>Solutions pour Résidentiel Collectif</span>
                 </div>
              </FadeIn>
              
              <FadeIn delay={300} direction="up">
                <h1 className="text-5xl md:text-[6.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase mt-4">
                  La recharge <br/><span style={{ color: brandTeal }}>en copropriété.</span>
                </h1>
              </FadeIn>
              
              <FadeIn delay={500} direction="up">
                <p className="text-lg md:text-xl text-white/80 leading-relaxed font-medium max-w-2xl text-balance">
                  Déploiement d'une infrastructure subventionnée, préfinancement possible et supervision complète. Équipez votre parking partagé sans toucher au budget du syndic.
                </p>
              </FadeIn>
              
              <FadeIn delay={700} direction="up">
                <div ref={heroRef} className="flex flex-col items-center gap-4 mt-4 animate-float">
                  <button 
                    onClick={() => simulatorRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                    className="relative overflow-hidden inline-flex items-center justify-center gap-3 bg-[#FF6B00] hover:bg-[#E66000] text-white px-8 sm:px-12 py-4 sm:py-5 rounded-full font-black text-base sm:text-lg shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:scale-105 active:scale-95 transition-all w-fit group text-center"
                  >
                    <div className="animate-button-shine" />
                    Évaluer les subventions <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                  </button>
                  <p className="text-xs text-white/50 font-bold uppercase tracking-widest flex items-center gap-2 mt-2">
                    <CheckCircle size={14} className="text-[#0097b2]"/> Présentation en AG par un expert IRVE
                  </p>
                </div>
              </FadeIn>
          </div>
        </section>

        {/* LOGOS CONFIANCE */}
        <div className="bg-white border-y border-slate-100 py-10">
          <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center items-center gap-12 text-slate-400">
            <BrandLogo name="HAGER" url="https://upload.wikimedia.org/wikipedia/commons/d/d1/Hagerlogo.jpg" />
            <BrandLogo name="WALLBOX" url="https://data.ladn.eu/wp-content/uploads/2022/12/Nomination-Wallbox-Myriam-Lhermurier-Boublil-1280x467.jpg" />
            <BrandLogo name="ABB" url="https://upload.wikimedia.org/wikipedia/commons/0/00/ABB_logo.svg" />
          </div>
        </div>

        {/* SECTION ARGUMENTS COPRO */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 transition-all hover:shadow-lg hover:-translate-y-1">
              <Zap className="text-[#0097b2] mb-6" size={40} />
              <h3 className="text-xl font-black text-[#032b60] mb-3 uppercase tracking-wider">Le droit à la prise</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">La loi vous autorise à équiper votre place de parking. Nous vous fournissons tous les documents nécessaires pour la présentation en Assemblée Générale.</p>
            </div>
            <div className="bg-[#032b60] p-8 rounded-3xl text-white shadow-2xl transition-all hover:shadow-[0_20px_50px_rgba(3,43,96,0.5)] hover:-translate-y-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#0097b2]/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <PiggyBankIcon className="text-[#0097b2] mb-6 relative z-10" size={40} />
              <h3 className="text-xl font-black mb-3 uppercase tracking-wider relative z-10">Zéro reste à charge</h3>
              <p className="text-white/70 font-medium text-sm leading-relaxed relative z-10">Déploiement d'une infrastructure collective 100% financée par des acteurs tiers et les primes ADVENIR. La copropriété n'a rien à décaisser.</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 transition-all hover:shadow-lg hover:-translate-y-1">
              <FileTextIcon className="text-[#0097b2] mb-6" size={40} />
              <h3 className="text-xl font-black text-[#032b60] mb-3 uppercase tracking-wider">Facturation individuelle</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">Chaque utilisateur paie uniquement l'électricité qu'il consomme via un sous-compteur. Aucune répercussion sur les charges communes de l'immeuble.</p>
            </div>
          </div>
        </section>

        {/* MÉTHODOLOGIE + CARROUSEL AVIS */}
        <section id="concept" className="py-24 bg-slate-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
             <div className="space-y-8">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none" style={{ color: brandNavy }}>L'infrastructure <br/><span style={{ color: brandTeal }}>Maîtrisée</span></h2>
                <p className="text-lg text-slate-500 font-medium leading-relaxed mt-6">Nous offrons une tranquillité d'esprit aux syndics de copropriété tout en garantissant un service optimal pour les résidents utilisateurs.</p>
                
                <div className="space-y-6">
                  {[
                    { i: <ShieldCheck />, t: "Gestion des sous-compteurs", d: "Finis les calculs d'apothicaire en fin d'année. Notre solution logicielle divise précisément les factures." },
                    { i: <AwardIcon />, t: "Qualification IRVE", d: "C'est l'assurance pour le syndicat que l'infrastructure répond à toutes les normes de sécurité en vigueur." },
                    { i: <UsersIcon />, t: "Évolutivité garantie", d: "Nous installons une colonne vertébrale capable d'accueillir de nouveaux résidents au fil des années." }
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

        {/* SIMULATEUR SUBVENTIONS */}
        <section ref={simulatorRef} id="simulateur" className="py-24 bg-white scroll-mt-24 relative overflow-hidden">
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
                  onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                  className="relative overflow-hidden mt-6 bg-[#FF6B00] text-white py-4 rounded-full font-black text-base hover:scale-105 transition-all group z-10 active:scale-95"
                >
                  <div className="animate-button-shine" />
                  Étude technique AG <PhoneIcon size={18} className="inline ml-2" />
                </button>
              </div>
            </div>

            {/* FORMULAIRE AG */}
            <div id="formulaire-devis" ref={formRef} className="w-full mt-24 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col relative z-10 mx-auto">
              <div className="flex items-center gap-3 mb-6 border-b pb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-inner">
                  <MapPinIcon size={20} />
                </div>
                <div>
                  <h3 className="font-black text-[#032b60] uppercase tracking-widest text-sm">Étude Gratuite Copropriété</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Analyse de faisabilité technique et montage financier</p>
                </div>
              </div>
              <div className="w-full relative h-[900px]">
                <iframe 
                  className="w-full h-full border-none rounded-2xl" 
                  src="https://forms.clickup.com/90151325642/f/2kyq03ya-7815/I5ELJ3PBRLRC158WLS?Source=Copro" 
                  title="Formulaire" 
                  style={{ background: 'transparent' }} 
                />
              </div>
              <p className="text-center text-[10px] text-slate-400 mt-6 font-medium flex justify-center items-center gap-1.5">
                <ShieldCheck size={12} className="text-green-500" /> Vos données sont strictement confidentielles.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="py-24 bg-slate-50 border-t border-slate-100">
          <div className="max-w-4xl mx-auto px-6 space-y-12">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-center" style={{ color: brandNavy }}>Questions <span style={{ color: brandTeal }}>Fréquentes</span></h2>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-white">
                  <button 
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)} 
                    className="w-full flex items-center justify-between p-8 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-black text-lg pr-4" style={{ color: brandNavy }}>{faq.q}</span>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${openFaq === idx ? 'bg-[#0097b2] text-white' : 'bg-slate-50 text-[#0097b2]'}`}>
                      <ChevronDown className={`transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} size={20} />
                    </div>
                  </button>
                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openFaq === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    {openFaq === idx && (
                      <div className="p-8 bg-slate-50 text-slate-500 font-medium leading-relaxed border-t border-slate-100">
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

      {/* FOOTER (Modifié en mode Landing Page fermée) */}
      <footer className="bg-[#032B60] py-24 border-t border-white/5 overflow-hidden relative text-white">
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#0097b2] rounded-full blur-[150px] opacity-30 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-16 relative z-10">
           <div className="space-y-6 text-left max-w-sm">
              <Logo light={true} className="scale-110 origin-left" />
              <div className="space-y-2 mt-4">
                <p className="text-white/80 font-medium text-sm leading-relaxed">
                  8, Avenue du général De Gaulle<br />
                  74200 THONON-LES-BAINS
                </p>
              </div>
           </div>
           <div className="flex flex-col sm:flex-row gap-12 md:gap-24 text-left">
              {/* LIENS INTERNES UNIQUEMENT */}
              <div className="space-y-5">
                 <h4 className="text-white/40 font-bold text-xs uppercase tracking-[0.2em]">Navigation</h4>
                 <ul className="space-y-3">
                    <li><a href="#simulateur" className="text-[#0097b2] font-black text-sm hover:translate-x-1 transition-all inline-block">Estimer les subventions</a></li>
                    <li><a href="#concept" className="text-white/80 text-sm font-medium hover:text-[#0097b2] hover:translate-x-1 transition-all inline-block">Méthodologie Syndic</a></li>
                    <li><a href="#formulaire-devis" className="text-white/80 text-sm font-medium hover:text-[#0097b2] hover:translate-x-1 transition-all inline-block">Demander une Étude</a></li>
                 </ul>
              </div>
              <div className="space-y-5">
                 <h4 className="text-white/40 font-bold text-xs uppercase tracking-[0.2em]">Assistance Syndic</h4>
                 <ul className="space-y-4">
                    <li>
                      <a href="tel:0485692204" className="font-bold text-base hover:text-[#0097b2] transition-colors flex items-center gap-3">
                        <PhoneIcon size={14} /> 04 85 69 22 04
                      </a>
                    </li>
                    <li>
                      <a href="mailto:contact@chargeo.fr" className="font-bold text-base hover:text-[#0097b2] transition-colors flex items-center gap-3">
                        <MailIcon size={14} /> contact@chargeo.fr
                      </a>
                    </li>
                 </ul>
              </div>
           </div>
        </div>
      </footer>
    </div>
  );
}