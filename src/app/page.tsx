"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, MapPin, Award, FileText, Wrench, Phone, Mail,
  Home, Briefcase, Building, Zap, ChevronRight,
  BatteryCharging, Globe, ArrowRight, CheckCircle, Cpu, Wifi,
  Menu, X
} from 'lucide-react';

// --- COMPOSANTS UI INTERNES (Intégrés pour garantir le fonctionnement) ---

const Logo = ({ light = false, className = "" }: { light?: boolean; className?: string }) => {
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

const BrandLogo = ({ name, url }: { name: string; url: string }) => {
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

// --- COMPOSANTS D'ANIMATION ---

const Reveal = ({ 
  children, 
  delay = 0, 
  direction = "up", 
  className = "" 
}: { 
  children: React.ReactNode; 
  delay?: number; 
  direction?: string; 
  className?: string; 
}) => {  
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0, rootMargin: "150px 0px -40px 0px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, []);

  const getTransform = () => {
    if (isVisible) return "translate-y-0 translate-x-0 scale-100";
    switch (direction) {
      case "up": return "translate-y-12 scale-95";
      case "down": return "-translate-y-12 scale-95";
      case "left": return "translate-x-12 scale-95";
      case "right": return "-translate-x-12 scale-95";
      default: return "translate-y-12 scale-95";
    }
  };

  return (
    <div
      ref={ref}
      style={{ 
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 1.1)'
      }}
      className={`transition-all duration-[600ms] sm:duration-1000 will-change-transform ${
        isVisible ? "opacity-100" : "opacity-0"
      } ${getTransform()} ${className}`}
    >
      {children}
    </div>
  );
};

const ImageReveal = ({ src, alt, className = "" }: { src: string; alt: string; className?: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0, rootMargin: "50px 0px -50px 0px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, []);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`w-full h-full object-cover transition-transform duration-[2000ms] ease-out will-change-transform ${
          isVisible ? "scale-100" : "scale-[1.15]"
        }`}
      />
    </div>
  );
};

// --- SITE VITRINE INSTITUTIONNEL ---

export default function App() {
  const brandNavy = "#032b60";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#0097b2]/30 scroll-smooth pb-24 lg:pb-0 overflow-x-hidden">
      
      {/* STYLES GLOBAUX & ANIMATIONS TECH OPTIMISÉES */}
      <style dangerouslySetInnerHTML={{__html: `
        :root { color-scheme: light only !important; }
        html, body { background-color: #f8fafc !important; color: #0f172a !important; }
        
        .bg-grid-tech {
          background-image: 
            linear-gradient(to right, rgba(0, 151, 178, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 151, 178, 0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        @keyframes slowPan {
          0% { transform: scale(1.05) translate(0, 0); }
          100% { transform: scale(1.15) translate(-1%, 1%); }
        }
        .animate-bg-pan { animation: slowPan 25s ease-in-out infinite alternate; will-change: transform; }
        
        @keyframes shine { 100% { left: 125%; } }
        .animate-button-shine {
          position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
          transform: skewX(-20deg); animation: shine 3s infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; will-change: transform; }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite 2s; will-change: transform; }
        
        @keyframes pulse-neon {
          0%, 100% { box-shadow: 0 0 15px rgba(0, 151, 178, 0.5), inset 0 0 10px rgba(0, 151, 178, 0.2); }
          50% { box-shadow: 0 0 30px rgba(0, 151, 178, 0.8), inset 0 0 20px rgba(0, 151, 178, 0.4); }
        }
        .animate-pulse-neon { animation: pulse-neon 3s infinite; }

        .glass-tech {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .tech-card { position: relative; z-index: 1; }
        .tech-card::before {
          content: ''; position: absolute; inset: 0; border-radius: inherit;
          background: linear-gradient(135deg, rgba(0,151,178,0) 0%, rgba(0,151,178,0) 100%);
          z-index: -1; transition: background 0.5s ease;
        }
        .tech-card:hover::before {
          background: linear-gradient(135deg, rgba(0,151,178,0.1) 0%, rgba(3,43,96,0.05) 100%);
        }

        @media (max-width: 768px) {
          .animate-bg-pan, .animate-float, .animate-float-delayed, .animate-pulse-neon { 
            animation: none !important; transform: none !important; 
          }
          .glass-tech { 
            backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background: rgba(255, 255, 255, 0.08); 
          }
        }
      `}} />

      {/* NAVIGATION VITRINE */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/85 backdrop-blur-md shadow-sm py-3 md:py-4 border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center gap-2">
          
          <div className="flex-shrink-0 relative z-50">
            <Logo light={false} className="scale-75 sm:scale-100 origin-left -ml-2 sm:ml-0" />
          </div>

          <div className="hidden md:flex items-center p-1.5 rounded-full border bg-white/50 border-slate-200 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]">
            <a href="#groupe" className="px-6 py-2 rounded-full text-sm font-bold transition-all text-slate-600 hover:text-[#032b60] hover:bg-white hover:shadow-sm">Le Groupe Tech</a>
            <a href="#expertises" className="px-6 py-2 rounded-full text-sm font-bold transition-all text-slate-600 hover:text-[#032b60] hover:bg-white hover:shadow-sm">Points de charge</a>
            <a href="#engagements" className="px-6 py-2 rounded-full text-sm font-bold transition-all text-slate-600 hover:text-[#032b60] hover:bg-white hover:shadow-sm">Garanties MCO</a>
          </div>

          <div className="flex items-center gap-2 relative z-50">
            <a 
              href="#contact"
              className="relative overflow-hidden px-5 sm:px-6 py-2 sm:py-2.5 rounded-full font-black text-xs sm:text-sm flex items-center gap-2 transition-all group bg-[#032b60] text-white hover:bg-[#0097b2] shadow-md hover:shadow-lg"
            >
              <div className="animate-button-shine" />
              Contact <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform hidden sm:block text-cyan-400" />
            </a>
            
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-[#032b60] hover:bg-slate-200 transition-colors"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <div className={`md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-xl overflow-hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-6 py-4 flex flex-col gap-4">
            <a onClick={() => setIsMobileMenuOpen(false)} href="#groupe" className="text-base font-bold text-[#032b60] py-2 border-b border-slate-100 flex justify-between items-center">Le Groupe Tech <ChevronRight size={16} className="text-slate-300"/></a>
            <a onClick={() => setIsMobileMenuOpen(false)} href="#expertises" className="text-base font-bold text-[#032b60] py-2 border-b border-slate-100 flex justify-between items-center">Points de charge <ChevronRight size={16} className="text-slate-300"/></a>
            <a onClick={() => setIsMobileMenuOpen(false)} href="#engagements" className="text-base font-bold text-[#032b60] py-2 flex justify-between items-center">Garanties MCO <ChevronRight size={16} className="text-slate-300"/></a>
          </div>
        </div>
      </nav>

      <main>
        {/* HERO SECTION HIGH-TECH */}
        <section className="relative min-h-[100dvh] pt-[100px] md:pt-[120px] flex flex-col justify-center overflow-hidden bg-[#032b60]">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-grid-tech opacity-30"></div>
            <img 
              src="/hero-chargeo.png" 
              className="w-full h-full object-cover opacity-20 animate-bg-pan grayscale" 
              alt="Installation institutionnelle" 
              fetchPriority="high"
            />
            <div className="hidden md:block absolute top-[-300px] right-[-300px] w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(0,151,178,0.15)_0%,transparent_70%)] pointer-events-none"></div>
            <div className="hidden md:block absolute bottom-[-200px] left-[-200px] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(34,211,238,0.1)_0%,transparent_70%)] pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#032b60] via-[#032b60]/20 to-[#032b60]/50 opacity-90"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10 w-full py-12 md:py-24 flex-grow flex flex-col justify-center">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              
              <div className="lg:col-span-7 space-y-8">
                <Reveal delay={0} direction="right">
                  <div className="inline-flex items-center gap-2 text-cyan-300 font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] glass-tech px-4 py-2 rounded-full border border-cyan-400/30 md:shadow-[0_0_15px_rgba(0,151,178,0.3)]">
                    <Cpu size={16} className="text-cyan-400 animate-pulse" />
                    <span>L'installation de points de charge réinventée</span>
                  </div>
                </Reveal>
                
                <Reveal delay={100} direction="right">
                  <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter leading-[1.05] uppercase">
                    L'intelligence <br/>au cœur de <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-[#0097b2]">la charge.</span>
                  </h1>
                </Reveal>
                
                <Reveal delay={200} direction="right">
                  <p className="text-lg md:text-xl text-white/80 leading-relaxed font-medium max-w-xl">
                    Nous sommes l'entreprise tech spécialisée dans le déploiement et la supervision de points de charge intelligents pour les professionnels, copropriétés et particuliers en Haute-Savoie.
                  </p>
                </Reveal>
                
                <Reveal delay={300} direction="right">
                  <div className="pt-6 flex flex-col sm:flex-row items-center gap-6">
                    <a 
                      href="#expertises"
                      className="relative overflow-hidden inline-flex items-center justify-center gap-3 bg-[#0097b2] hover:bg-cyan-500 text-white px-8 py-4 rounded-full font-black text-sm sm:text-base transition-all group w-full sm:w-auto"
                    >
                      <div className="animate-button-shine" />
                      Découvrir nos points de charge <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </a>
                    <a href="#groupe" className="text-white/60 hover:text-white font-bold text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-2 group w-full sm:w-auto">
                      Notre ADN Tech <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform text-[#0097b2]" />
                    </a>
                  </div>
                </Reveal>
              </div>

              <div className="hidden lg:block lg:col-span-5 relative h-[500px]">
                 <Reveal delay={300} direction="left" className="absolute top-10 right-0 w-64 glass-tech p-6 rounded-3xl border border-white/20 shadow-2xl animate-float z-20">
                    <div className="flex items-center gap-4 mb-3">
                       <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                          <Wifi className="text-green-400" size={18} />
                       </div>
                       <div>
                         <p className="text-white font-black text-sm">Supervision CPO</p>
                         <p className="text-green-400 text-[10px] font-bold uppercase tracking-widest">Connecté</p>
                       </div>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-4">
                      <div className="bg-gradient-to-r from-green-400 to-cyan-400 w-full h-full animate-[pulse_2s_ease-in-out_infinite]"></div>
                    </div>
                 </Reveal>

                 <Reveal delay={500} direction="up" className="absolute bottom-20 left-10 w-72 glass-tech p-6 rounded-3xl border border-white/20 shadow-2xl animate-float-delayed z-30">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-[#0097b2]/30 flex items-center justify-center border border-[#0097b2]/50 shadow-[0_0_15px_rgba(0,151,178,0.5)]">
                          <Zap className="text-cyan-300" size={24} />
                       </div>
                       <div>
                         <p className="text-white font-black text-lg">Load Balancing</p>
                         <p className="text-cyan-200 text-[10px] font-bold uppercase tracking-widest">Gestion dynamique</p>
                       </div>
                    </div>
                 </Reveal>
                 
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-[#0097b2]/20 shadow-[inset_0_0_50px_rgba(0,151,178,0.1)] animate-[spin_20s_linear_infinite] z-10"></div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] rounded-full border border-cyan-400/30 border-dashed animate-[spin_15s_linear_infinite_reverse] z-10"></div>
              </div>

            </div>
          </div>
        </section>

        {/* MARQUES PARTENAIRES TECHNOLOGIQUES */}
        <div className="bg-white py-12 border-b border-slate-100 relative z-20">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Hardware partenaires</p>
            <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-16 w-full">
              <BrandLogo name="HAGER" url="https://upload.wikimedia.org/wikipedia/commons/d/d1/Hagerlogo.jpg" />
              <BrandLogo name="AUTEL" url="https://mms.businesswire.com/media/20230321006038/fr/1595853/4/AUTEL_New_Energy_Logo.jpg" />
              <BrandLogo name="WALLBOX" url="https://data.ladn.eu/wp-content/uploads/2022/12/Nomination-Wallbox-Myriam-Lhermurier-Boublil-1280x467.jpg" />
              <BrandLogo name="ALFEN" url="https://upload.wikimedia.org/wikipedia/commons/3/39/Alfen_logo.svg" />
            </div>
          </div>
        </div>

        {/* SECTION PRÉSENTATION GROUPE TECH */}
        <section id="groupe" className="py-20 md:py-32 bg-slate-50 overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-tech opacity-50"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 md:gap-20 items-center">
              <div className="space-y-8 md:space-y-10">
                <Reveal delay={0}>
                  <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                    <Globe size={16} className="text-[#0097b2]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#032b60]">Notre ADN Technologique</span>
                  </div>
                </Reveal>
                
                <Reveal delay={100}>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-[#032b60] uppercase leading-[1.1]">
                    Maîtriser le matériel <br className="hidden md:block" />pour libérer <span className="text-[#0097b2]">le logiciel.</span>
                  </h2>
                </Reveal>
                
                <Reveal delay={200}>
                  <div className="space-y-6 text-slate-600 font-medium leading-relaxed text-lg">
                    <p>
                      Installer une prise est à la portée de tous. Déployer un point de charge intelligent, communicant et évolutif requiert une véritable ingénierie. CHARGéO est né pour combler ce vide technologique.
                    </p>
                    <p>
                      Nous ne sous-traitons aucune compétence. Nos techniciens, formés aux dernières normes IRVE, intègrent le matériel de pointe avec les logiciels de supervision les plus avancés du marché.
                    </p>
                  </div>
                </Reveal>
                
                <Reveal delay={300}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 pt-4">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm md:hover:shadow-md transition-all">
                      <ShieldCheck className="text-[#0097b2] mb-4" size={32} />
                      <p className="font-black text-[#032b60] text-xl mb-1">Qualifelec IRVE</p>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Habilitation maximale</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm md:hover:shadow-md transition-all">
                      <Cpu className="text-[#0097b2] mb-4" size={32} />
                      <p className="font-black text-[#032b60] text-xl mb-1">Smart Charging</p>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Écosystème connecté</p>
                    </div>
                  </div>
                </Reveal>
              </div>

              <Reveal delay={200} direction="left" className="relative hidden lg:block h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-[#032b60] to-[#0097b2] rounded-[3rem] translate-x-6 translate-y-6 opacity-20 animate-[pulse_4s_ease-in-out_infinite]"></div>
                <div className="absolute -inset-4 border border-[#0097b2]/20 rounded-[3.5rem] border-dashed animate-[spin_30s_linear_infinite]"></div>
                
                <ImageReveal
                  src="/tech-chargeo.png"
                  alt="Technicien tech en intervention"
                  className="relative z-10 rounded-[3rem] shadow-2xl w-full h-[650px] grayscale-[30%] contrast-125 border-8 border-white"
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* SECTION POINTS DE CHARGE */}
        <section id="expertises" className="py-20 md:py-32 bg-white overflow-hidden border-y border-slate-100 relative">
          <div className="max-w-7xl mx-auto px-6 relative z-10">
             <Reveal delay={0} className="text-center mb-16 md:mb-20 space-y-6">
                <div className="inline-flex items-center gap-2 bg-[#0097b2]/10 px-4 py-2 rounded-full border border-[#0097b2]/20">
                  <BatteryCharging size={16} className="text-[#0097b2]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#0097b2]">Déploiement sur-mesure</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase" style={{ color: brandNavy }}>
                  Écosystèmes de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#032b60] to-[#0097b2]">charge</span>
                </h2>
                <p className="text-base md:text-lg text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
                  Du point de charge domestique aux grappes de bornes connectées pour flottes. L'intelligence logicielle au service de l'énergie.
                </p>
             </Reveal>

             <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
                {/* Carte PROS */}
                <Reveal delay={0} direction="up">
                  <a href="/pro" className="block tech-card bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm md:shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col h-full group hover:shadow-[0_0_40px_rgba(0,151,178,0.15)] transition-all duration-500 hover:-translate-y-2 cursor-pointer">
                     <div className="flex justify-between items-start mb-6 md:mb-8">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-[#032b60] to-blue-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-500">
                          <Briefcase size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full group-hover:bg-[#032b60]/10 group-hover:text-[#032b60] transition-colors">B2B / Flottes</span>
                     </div>
                     <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#032b60] mb-4 group-hover:text-[#0097b2] transition-colors">Stations d'Entreprises</h3>
                     <p className="text-slate-500 font-medium mb-8 flex-grow leading-relaxed text-sm md:text-base">
                       Grappes de points de charge communicants avec Load Balancing statique ou dynamique. Interface d'administration Cloud (CPO) pour facturer les sessions.
                     </p>
                     
                     <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100">
                       <div className="space-y-3">
                         <div className="flex items-center gap-3"><Cpu size={16} className="text-[#0097b2]"/> <span className="text-xs md:text-sm font-bold text-[#032b60]">Supervision OCR</span></div>
                         <div className="flex items-center gap-3"><Zap size={16} className="text-[#0097b2]"/> <span className="text-xs md:text-sm font-bold text-[#032b60]">Load Balancing</span></div>
                       </div>
                       <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#032b60] group-hover:bg-[#0097b2] group-hover:text-white transition-colors">
                         <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                       </div>
                     </div>
                  </a>
                </Reveal>

                {/* Carte COPROS */}
                <Reveal delay={100} direction="up">
                  <a href="/copropriete" className="block tech-card bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm md:shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col h-full group hover:shadow-[0_0_40px_rgba(0,151,178,0.15)] transition-all duration-500 hover:-translate-y-2 cursor-pointer">
                     <div className="flex justify-between items-start mb-6 md:mb-8">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-[#0097b2] to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-500">
                          <Building size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full group-hover:bg-[#0097b2]/10 group-hover:text-[#0097b2] transition-colors">Syndics</span>
                     </div>
                     <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#032b60] mb-4 group-hover:text-[#0097b2] transition-colors">Architecture Copro</h3>
                     <p className="text-slate-500 font-medium mb-8 flex-grow leading-relaxed text-sm md:text-base">
                       Câblage en colonne horizontale intelligente. Nous déployons un réseau électrique pré-équipé permettant d'ajouter des points de charge à la demande.
                     </p>

                     <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100">
                       <div className="space-y-3">
                         <div className="flex items-center gap-3"><Cpu size={16} className="text-[#0097b2]"/> <span className="text-xs md:text-sm font-bold text-[#032b60]">Scalabilité</span></div>
                         <div className="flex items-center gap-3"><Zap size={16} className="text-[#0097b2]"/> <span className="text-xs md:text-sm font-bold text-[#032b60]">Zéro frais syndicat</span></div>
                       </div>
                       <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#032b60] group-hover:bg-[#0097b2] group-hover:text-white transition-colors">
                         <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                       </div>
                     </div>
                  </a>
                </Reveal>

                {/* Carte PARTICULIER */}
                <Reveal delay={200} direction="up">
                  <a href="/particuliers" className="block tech-card bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm md:shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col h-full group hover:shadow-[0_0_40px_rgba(0,151,178,0.15)] transition-all duration-500 hover:-translate-y-2 cursor-pointer">
                     <div className="flex justify-between items-start mb-6 md:mb-8">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-[#032b60] shadow-md group-hover:scale-110 transition-transform duration-500">
                          <Home size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full group-hover:bg-slate-200 transition-colors">B2C</span>
                     </div>
                     <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#032b60] mb-4 group-hover:text-[#0097b2] transition-colors">Wallbox Résidentielle</h3>
                     <p className="text-slate-500 font-medium mb-8 flex-grow leading-relaxed text-sm md:text-base">
                       Le point de charge connecté (7.4kW - 22kW) à domicile. Pilotez vos sessions depuis votre smartphone, trackez l'énergie en toute sécurité.
                     </p>

                     <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100">
                       <div className="space-y-3">
                         <div className="flex items-center gap-3"><Cpu size={16} className="text-[#0097b2]"/> <span className="text-xs md:text-sm font-bold text-[#032b60]">App de pilotage</span></div>
                         <div className="flex items-center gap-3"><Zap size={16} className="text-[#0097b2]"/> <span className="text-xs md:text-sm font-bold text-[#032b60]">Sécurité NFC-15-100</span></div>
                       </div>
                       <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#032b60] group-hover:bg-[#0097b2] group-hover:text-white transition-colors">
                         <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                       </div>
                     </div>
                  </a>
                </Reveal>
             </div>
          </div>
        </section>

        {/* BLOC GARANTIE MCO */}
        <section id="engagements" className="py-20 md:py-32 bg-[#032b60] overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-tech opacity-20"></div>
          <div className="hidden md:block absolute top-[-200px] right-[-200px] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(0,151,178,0.15)_0%,transparent_70%)] animate-[pulse_6s_ease-in-out_infinite] pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <Reveal delay={0}>
              <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
                <div className="inline-flex items-center gap-2 text-cyan-300 font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] bg-white/10 px-4 py-2 rounded-full border border-white/20 backdrop-blur-md mb-6">
                  <Wrench size={16} />
                  <span>Exploitation & Fiabilité</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase leading-tight mb-6">
                  Le Maintien en <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-[#0097b2]">Condition Opérationnelle.</span>
                </h2>
                <p className="text-blue-100/70 font-medium text-base md:text-lg leading-relaxed">
                  L'installation n'est que la première étape. Notre pôle MCO garantit une disponibilité maximale de vos points de charge sur le long terme.
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <Reveal delay={0} direction="up">
                <div className="glass-tech p-8 md:p-10 rounded-[2.5rem] border-t border-l border-white/20 h-full group hover:bg-white/10 transition-colors duration-500">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0097b2]/20 flex items-center justify-center text-cyan-300 mb-6 md:mb-8 border border-cyan-400/30 group-hover:scale-110 transition-transform">
                    <Wifi size={24} />
                  </div>
                  <h4 className="text-white font-black uppercase tracking-wider text-lg md:text-xl mb-3 md:mb-4">Télé-Supervision</h4>
                  <p className="text-blue-100/70 font-medium leading-relaxed text-sm md:text-base">Monitoring de vos points de charge en temps réel. Nous anticipons et diagnostiquons 80% des anomalies à distance.</p>
                </div>
              </Reveal>
              
              <Reveal delay={100} direction="up">
                <div className="glass-tech p-8 md:p-10 rounded-[2.5rem] border-t border-l border-white/20 h-full relative overflow-hidden group hover:bg-white/10 transition-colors duration-500">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0097b2] flex items-center justify-center text-white mb-6 md:mb-8 shadow-[0_0_20px_rgba(0,151,178,0.5)] relative z-10 group-hover:scale-110 transition-transform">
                    <ShieldCheck size={24} />
                  </div>
                  <h4 className="text-white font-black uppercase tracking-wider text-lg md:text-xl mb-3 md:mb-4 relative z-10">Conformité Absolue</h4>
                  <p className="text-blue-100/70 font-medium leading-relaxed text-sm md:text-base relative z-10">Nos processus répondent aux exigences strictes du programme Advenir. Matériel audité et réception par un organisme indépendant.</p>
                </div>
              </Reveal>
              
              <Reveal delay={200} direction="up">
                <div className="glass-tech p-8 md:p-10 rounded-[2.5rem] border-t border-l border-white/20 h-full group hover:bg-white/10 transition-colors duration-500">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0097b2]/20 flex items-center justify-center text-cyan-300 mb-6 md:mb-8 border border-cyan-400/30 group-hover:scale-110 transition-transform">
                    <CheckCircle size={24} />
                  </div>
                  <h4 className="text-white font-black uppercase tracking-wider text-lg md:text-xl mb-3 md:mb-4">Garantie & Intervention</h4>
                  <p className="text-blue-100/70 font-medium leading-relaxed text-sm md:text-base">En cas de panne physique, notre présence exclusive en Haute-Savoie nous permet de garantir un SLA agressif sur site.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* SECTION CONTACT CORPORATE TECH */}
        <section id="contact" className="py-20 md:py-32 bg-slate-50 relative">
          <div className="absolute inset-0 bg-grid-tech opacity-30"></div>
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-5 gap-12 md:gap-16 items-start relative z-10">
            
            <div className="lg:col-span-2 space-y-10 md:space-y-12">
              <Reveal delay={0}>
                <div>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-[#032b60] mb-4 md:mb-6 leading-tight">
                    Lançons <br/>l'étude de <span className="text-[#0097b2]">votre projet</span>
                  </h2>
                  <p className="text-slate-500 font-medium leading-relaxed text-base md:text-lg">
                    Vous souhaitez équiper votre entreprise, votre copropriété ou votre domicile ? Discutez avec nos ingénieurs IRVE.
                  </p>
                </div>
              </Reveal>

              <div className="space-y-6">
                <Reveal delay={0}>
                  <div className="flex items-start gap-5 md:gap-6 group">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center text-[#032b60] shrink-0 group-hover:border-[#0097b2] group-hover:text-[#0097b2] transition-colors">
                      <MapPin size={24} />
                    </div>
                    <div className="pt-1">
                      <p className="font-black text-[#032b60] uppercase tracking-wider text-xs md:text-sm mb-1 group-hover:text-[#0097b2] transition-colors">Base Opérationnelle</p>
                      <p className="text-slate-500 font-medium text-sm md:text-base">8, Avenue du général De Gaulle<br/>74200 THONON-LES-BAINS</p>
                    </div>
                  </div>
                </Reveal>
                
                <Reveal delay={100}>
                  <div className="flex items-start gap-5 md:gap-6 group">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center text-[#032b60] shrink-0 group-hover:border-[#0097b2] group-hover:text-[#0097b2] transition-colors">
                      <Phone size={24} />
                    </div>
                    <div className="pt-1">
                      <p className="font-black text-[#032b60] uppercase tracking-wider text-xs md:text-sm mb-1 group-hover:text-[#0097b2] transition-colors">Support Commercial</p>
                      <a href="tel:0485692204" className="text-slate-500 font-medium text-base md:text-lg hover:text-[#0097b2] transition-colors">04 85 69 22 04</a>
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={200}>
                  <div className="flex items-start gap-5 md:gap-6 group">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center text-[#032b60] shrink-0 group-hover:border-[#0097b2] group-hover:text-[#0097b2] transition-colors">
                      <Mail size={24} />
                    </div>
                    <div className="pt-1">
                      <p className="font-black text-[#032b60] uppercase tracking-wider text-xs md:text-sm mb-1 group-hover:text-[#0097b2] transition-colors">Bureau d'étude</p>
                      <a href="mailto:contact@chargeo.fr" className="text-slate-500 font-medium text-sm md:text-base hover:text-[#0097b2] transition-colors">contact@chargeo.fr</a>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>

            <Reveal delay={300} className="lg:col-span-3 w-full bg-white p-4 sm:p-8 rounded-[2.5rem] shadow-md md:shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#032b60] to-[#0097b2]"></div>
              <div className="w-full relative min-h-[700px] h-[75vh]">
                <iframe 
                  className="w-full h-full border-none rounded-xl" 
                  src="https://forms.clickup.com/90151325642/f/2kyq03ya-7815/I5ELJ3PBRLRC158WLS" 
                  title="Formulaire Contact CHARGéO" 
                  style={{ background: 'transparent' }}
                  loading="lazy"
                />
              </div>
            </Reveal>

          </div>
        </section>
      </main>

      {/* FOOTER EXACT */}
      <footer className="bg-[#032B60] py-16 md:py-24 border-t border-white/5 overflow-hidden relative">
        <div className="hidden md:block absolute -bottom-40 -right-40 w-96 h-96 bg-[radial-gradient(circle,rgba(0,151,178,0.3)_0%,transparent_70%)] pointer-events-none"></div>
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
                    <li><a href="#groupe" className="text-[#0097b2] font-black text-sm hover:translate-x-1 transition-all inline-block">Le Groupe</a></li>
                    <li><a href="#expertises" className="text-white/80 text-sm font-medium hover:text-[#0097b2] hover:translate-x-1 transition-all inline-block">Nos Expertises</a></li>
                    <li><a href="#engagements" className="text-white/80 text-sm font-medium hover:text-[#0097b2] hover:translate-x-1 transition-all inline-block">Engagements</a></li>
                    <li className="pt-2 border-t border-white/10 mt-2"><a href="#contact" className="text-white/80 text-sm font-medium hover:text-[#0097b2] hover:translate-x-1 transition-all inline-block">Nous contacter</a></li>
                 </ul>
              </div>
              
              <div className="space-y-5">
                 <h4 className="text-white/40 font-bold text-xs uppercase tracking-[0.2em]">Assistance</h4>
                 <ul className="space-y-4">
                    <li>
                      <a href="tel:0485692204" className="text-white font-bold text-base sm:text-lg hover:text-[#0097b2] transition-colors flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"><Phone size={14} /></span>
                        04 85 69 22 04
                      </a>
                    </li>
                    <li>
                      <a href="mailto:contact@chargeo.fr" className="text-white font-bold text-base sm:text-lg hover:text-[#0097b2] transition-colors flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"><Mail size={14} /></span>
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