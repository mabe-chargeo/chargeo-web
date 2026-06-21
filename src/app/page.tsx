"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, MapPin, Award, FileText, Wrench, Phone, Mail,
  Home, Briefcase, Building, Zap, ChevronRight,
  BatteryCharging, Globe, ArrowRight, CheckCircle, Cpu, Wifi,
  Menu, X
} from 'lucide-react';

import { Logo } from '@/components/ui/Logo';
import Image from 'next/image';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { TrustedBrands } from '@/components/layout/TrustedBrands';
import { ContactForm } from '@/components/ui/ContactForm';

// --- COMPOSANT D'ANIMATION STANDARD ---
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
      className={`transition-all duration-600 sm:duration-1000 will-change-transform ${
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
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        className={`object-cover transition-transform duration-2000 ease-out will-change-transform ${
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
      

      {/* NAVIGATION VITRINE */}
<Navbar isHome />
      <main>
        {/* HERO SECTION HIGH-TECH */}
        <section className="relative min-h-[82vh] pt-28 pb-12 flex flex-col justify-center overflow-hidden bg-[#032b60]">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-grid-tech opacity-30"></div>
            <Image src="/hero-chargeo.webp" alt="Installation institutionnelle" fill sizes="100vw" priority fetchPriority="high" className="object-cover opacity-20 grayscale" />
            <div className="absolute inset-0 bg-linear-to-t from-[#032b60] via-[#032b60]/20 to-[#032b60]/50 opacity-90"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10 w-full flex flex-col justify-center items-center text-center">
             <Reveal delay={0} direction="up">
                 <div className="w-full flex justify-center mb-6 mt-6">
                   <div className="flex items-center justify-center gap-2 text-cyan-300 font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] bg-white/10 px-4 py-2 rounded-full border border-cyan-400/30 backdrop-blur-sm">
                     <Cpu size={16} className="text-cyan-400 animate-pulse" />
                     <span>L'expertise IRVE locale en Haute-Savoie</span>
                   </div>
                 </div>
              </Reveal>
              
              <Reveal delay={100} direction="up">
                <div className="w-full flex justify-center mb-6">
                  <h1 className="text-[2.5rem] sm:text-5xl md:text-[6.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase">
                    Passez à l'électrique <br/><span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-[#0097b2]">l'esprit léger.</span>
                  </h1>
                </div>
              </Reveal>
              
              <Reveal delay={200} direction="up">
                <div className="w-full flex justify-center mb-10">
                  <p className="text-sm sm:text-base md:text-xl text-white/80 leading-relaxed font-medium max-w-2xl text-balance">
                    Que vous soyez un particulier pressé, une entreprise soumise à la loi LOM ou un syndic de copropriété, nous prenons en charge l'installation, les démarches et les subventions.
                  </p>
                </div>
              </Reveal>
              
              <Reveal delay={300} direction="up">
                <div className="w-full flex justify-center">
                  <div className="flex flex-col items-center gap-5 animate-float">
                    <a href="#expertises" className="relative overflow-hidden inline-flex items-center justify-center gap-3 bg-[#FF6B00] hover:bg-[#E66000] text-white px-8 sm:px-12 py-4 sm:py-5 rounded-full font-black text-base sm:text-lg shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 active:scale-95 transition-all w-fit group text-center">
                      <div className="animate-button-shine" />
                      Découvrir nos points de charge <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </a>
                    <div className="flex flex-col items-center justify-start h-12 gap-2">
                      <a href="#groupe" className="text-sm text-white/80 hover:text-white font-bold underline underline-offset-4 decoration-white/30 hover:decoration-white transition-all flex items-center gap-2">
                        <FileText size={14} /> Notre ADN Tech
                      </a>
                      <p className="text-xs text-white/50 font-bold uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle size={14} className="text-[#0097b2]"/> Installateur Qualifié IRVE
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
          </div>
        </section>

        {/* MARQUES PARTENAIRES TECHNOLOGIQUES */}
   <TrustedBrands />

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
                    L'ingénierie physique <br className="hidden md:block" />au service de <span className="text-[#0097b2]">l'intelligence.</span>
                  </h2>
                </Reveal>
                
                <Reveal delay={200}>
                  <div className="space-y-6 text-slate-600 font-medium leading-relaxed text-lg">
                    <p>
                      Poser une prise basique est à la portée de n'importe quel électricien. Déployer une infrastructure de charge intelligente, communicante et évolutive exige une tout autre ingénierie.
                    </p>
                    <p>
                      Chez CHARGÉO, nous maîtrisons l'intégralité de la chaîne de valeur. Nos experts qualifiés IRVE déploient sur le terrain un matériel de pointe nativement connecté aux meilleurs outils de gestion du marché.
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
                <div className="absolute inset-0 bg-linear-to-br from-[#032b60] to-[#0097b2] rounded-[3rem] translate-x-6 translate-y-6 opacity-20 animate-[pulse_4s_ease-in-out_infinite]"></div>
                <div className="absolute -inset-4 border border-[#0097b2]/20 rounded-[3.5rem] border-dashed animate-[spin_30s_linear_infinite]"></div>
                
                <ImageReveal
                  src="/tech-chargeo.webp"
                  alt="Technicien tech en intervention"
                  className="relative z-10 rounded-[3rem] shadow-2xl w-full h-162.5 grayscale-30 contrast-125 border-8 border-white"
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
                  Écosystèmes de <span className="text-transparent bg-clip-text bg-linear-to-r from-[#032b60] to-[#0097b2]">charge</span>
                </h2>
                <p className="text-base md:text-lg text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
                  Du point de charge domestique aux grappes de bornes connectées pour flottes. L'intelligence logicielle au service de l'énergie.
                </p>
             </Reveal>

             <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
                {/* BOUTON PROS */}
                <Reveal delay={0} direction="up">
                  <a href="/pro" className="relative flex flex-col items-center justify-start bg-white p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgba(3,43,96,0.1)] border border-slate-100 hover:border-[#032b60]/20 transition-all duration-500 group overflow-hidden h-full">
                     <div className="absolute inset-0 bg-linear-to-br from-[#032b60]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                     
                     <div className="w-20 h-20 rounded-[1.5rem] bg-[#032b60] flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 relative z-10">
                       <Briefcase size={32} />
                     </div>
                     
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 relative z-10">B2B / Flottes & Tertiaire</span>
                     <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#032b60] text-center mb-4 relative z-10">Entreprises</h3>
                     
                     <p className="text-sm text-slate-600 text-center mb-8 relative z-10 font-medium flex-grow">
                       Électrifiez votre flotte en respectant la Loi LOM. Maîtrisez votre puissance électrique via le Smart Charging et automatisez vos refacturations.
                     </p>
                     
                     <div className="mt-auto w-full inline-flex items-center justify-center gap-3 bg-slate-50 text-[#032b60] px-6 py-4 rounded-full font-black text-sm group-hover:bg-[#FF6B00] group-hover:text-white transition-colors duration-300 relative z-10">
                       Voir les offres pro <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                     </div>
                  </a>
                </Reveal>

                {/* BOUTON COPROS */}
                <Reveal delay={100} direction="up">
                  <a href="/copropriete" className="relative flex flex-col items-center justify-start bg-white p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgba(0,151,178,0.15)] border border-slate-100 hover:border-[#0097b2]/30 transition-all duration-500 group overflow-hidden h-full">
                     <div className="absolute inset-0 bg-linear-to-br from-[#0097b2]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                     
                     <div className="w-20 h-20 rounded-[1.5rem] bg-[#0097b2] flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 relative z-10">
                       <Building size={32} />
                     </div>
                     
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 relative z-10">Conseils Syndicaux & Syndics</span>
                     <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#032b60] text-center mb-4 relative z-10">Copropriétés</h3>
                     
                     <p className="text-sm text-slate-600 text-center mb-8 relative z-10 font-medium flex-grow">
                       Ne louez pas votre parking à un opérateur national. Investissez dans votre propre infrastructure collective pour valoriser votre immeuble et sécuriser vos AG, sans contrat à vie.
                     </p>
                     
                     <div className="mt-auto w-full inline-flex items-center justify-center gap-3 bg-slate-50 text-[#032b60] px-6 py-4 rounded-full font-black text-sm group-hover:bg-[#FF6B00] group-hover:text-white transition-colors duration-300 relative z-10">
                       Découvrir l'offre Copro <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                     </div>
                  </a>
                </Reveal>

                {/* BOUTON PARTICULIER */}
                <Reveal delay={200} direction="up">
                  <a href="/particuliers" className="relative flex flex-col items-center justify-start bg-white p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-slate-100 hover:border-slate-300 transition-all duration-500 group overflow-hidden h-full">
                     <div className="absolute inset-0 bg-linear-to-br from-slate-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                     
                     <div className="w-20 h-20 rounded-[1.5rem] bg-slate-200 flex items-center justify-center text-[#032b60] shadow-md mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 relative z-10">
                       <Home size={32} />
                     </div>
                     
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 relative z-10">Maison & Droit à la prise</span>
                     <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#032b60] text-center mb-4 relative z-10">Particuliers</h3>
                     
                     <p className="text-sm text-slate-600 text-center mb-8 relative z-10 font-medium flex-grow">
                       Ne pensez plus à la recharge. Maison individuelle avec prix ferme garanti ou accompagnement juridique pour votre "droit à la prise" en appartement : on s'occupe de tout.
                     </p>
                     
                     <div className="mt-auto w-full inline-flex items-center justify-center gap-3 bg-slate-50 text-[#032b60] px-6 py-4 rounded-full font-black text-sm group-hover:bg-[#FF6B00] group-hover:text-white transition-colors duration-300 relative z-10">
                       Votre devis Particulier <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                     </div>
                  </a>
                </Reveal>
             </div>
          </div>
        </section>

        {/* BLOC GARANTIE MAINTENANCE */}
        <section id="engagements" className="py-20 md:py-32 bg-[#032b60] overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-tech opacity-20"></div>
          <div className="hidden md:block absolute -top-50 -right-50 w-150 h-150 bg-[radial-gradient(circle,rgba(0,151,178,0.15)_0%,transparent_70%)] animate-[pulse_6s_ease-in-out_infinite] pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <Reveal delay={0}>
              <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
                <div className="inline-flex items-center gap-2 text-cyan-300 font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] bg-white/10 px-4 py-2 rounded-full border border-white/20 backdrop-blur-md mb-6">
                  <Wrench size={16} />
                  <span>Sérénité & SAV Local</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase leading-tight mb-6">
                  Oubliez l'angoisse de la panne, <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-[#0097b2]">on gère la technique.</span>
                </h2>
                <p className="text-blue-100/70 font-medium text-base md:text-lg leading-relaxed">
                  L'installation n'est que le début. Que ce soit pour garantir votre départ matinal sans angoisse ou assurer la disponibilité de votre flotte d'entreprise, nous opérons un transfert total de responsabilité technique.
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <Reveal delay={0} direction="up">
                <div className="glass-tech p-8 md:p-10 rounded-[2.5rem] border-t border-l border-white/20 h-full group hover:bg-white/10 transition-colors duration-500">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0097b2]/20 flex items-center justify-center text-cyan-300 mb-6 md:mb-8 border border-cyan-400/30 group-hover:scale-110 transition-transform">
                    <Wifi size={24} />
                  </div>
                  <h4 className="text-white font-black uppercase tracking-wider text-lg md:text-xl mb-3 md:mb-4">Supervision Temps Réel</h4>
                  <p className="text-blue-100/70 font-medium leading-relaxed text-sm md:text-base">Ne vous souciez plus de la maintenance. Nous surveillons l'état de votre borne à distance pour anticiper et résoudre les anomalies avant même que vous ne les remarquiez.</p>
                </div>
              </Reveal>
              
              <Reveal delay={100} direction="up">
                <div className="glass-tech p-8 md:p-10 rounded-[2.5rem] border-t border-l border-white/20 h-full relative overflow-hidden group hover:bg-white/10 transition-colors duration-500">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0097b2] flex items-center justify-center text-white mb-6 md:mb-8 shadow-[0_0_20px_rgba(0,151,178,0.5)] relative z-10 group-hover:scale-110 transition-transform">
                    <ShieldCheck size={24} />
                  </div>
                  <h4 className="text-white font-black uppercase tracking-wider text-lg md:text-xl mb-3 md:mb-4 relative z-10">Ligne Directe SAV</h4>
                  <p className="text-blue-100/70 font-medium leading-relaxed text-sm md:text-base relative z-10">Un doute ? Une question ? Vous appelez directement notre équipe locale. Pas de centre d'appel à l'étranger, vous parlez aux experts qui ont installé votre matériel.</p>
                </div>
              </Reveal>
              
              <Reveal delay={200} direction="up">
                <div className="glass-tech p-8 md:p-10 rounded-[2.5rem] border-t border-l border-white/20 h-full group hover:bg-white/10 transition-colors duration-500">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0097b2]/20 flex items-center justify-center text-cyan-300 mb-6 md:mb-8 border border-cyan-400/30 group-hover:scale-110 transition-transform">
                    <CheckCircle size={24} />
                  </div>
                  <h4 className="text-white font-black uppercase tracking-wider text-lg md:text-xl mb-3 md:mb-4">Intervention Locale</h4>
                  <p className="text-blue-100/70 font-medium leading-relaxed text-sm md:text-base">Contrairement aux opérateurs nationaux injoignables, notre ancrage en Haute-Savoie nous permet de garantir un rappel sous 24h et une intervention rapide de nos techniciens.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* SECTION CONTACT CORPORATE TECH */}
        <section id="contact" className="py-20 md:py-32 bg-slate-50 relative border-t border-slate-100">
          <div className="absolute inset-0 bg-grid-tech opacity-30"></div>
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-5 gap-12 md:gap-16 items-start relative z-10">
            
            <div className="lg:col-span-2 space-y-10 md:space-y-12">
              <Reveal delay={0}>
                <div>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-[#032b60] mb-4 md:mb-6 leading-tight">
                    Lançons <br/>l'étude de <span className="text-[#0097b2]">votre projet</span>
                  </h2>
                  <p className="text-slate-500 font-medium leading-relaxed text-base md:text-lg mb-6">
                    Particuliers, copropriétés ou entreprises : nos experts qualifiés IRVE vous accompagnent de A à Z dans votre transition électrique.
                  </p>
                  
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                     <span className="text-orange-500 mt-0.5 text-lg leading-none">⚠️</span>
                     <p className="text-xs sm:text-sm text-orange-800 font-medium leading-relaxed">
                       Nos plannings d'intervention se remplissent vite. <span className="font-black">Contactez-nous aujourd'hui pour bloquer votre étude gratuite.</span>
                     </p>
                  </div>
                </div>
              </Reveal>

              <div className="space-y-6">
                <Reveal delay={0}>
                  <div className="flex items-start gap-5 md:gap-6 group">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center text-[#032b60] shrink-0 group-hover:border-[#0097b2] group-hover:text-[#0097b2] transition-colors">
                      <MapPin size={24} />
                    </div>
                    <div className="pt-1">
                      <p className="font-black text-[#032b60] uppercase tracking-wider text-xs md:text-sm mb-1 group-hover:text-[#0097b2] transition-colors">Zone d'intervention</p>
                      <p className="text-slate-500 font-medium text-sm md:text-base">Chablais et Haute-Savoie</p>
                    </div>
                  </div>
                </Reveal>
                
                <Reveal delay={100}>
                  <div className="flex items-start gap-5 md:gap-6 group">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center text-[#032b60] shrink-0 group-hover:border-[#0097b2] group-hover:text-[#0097b2] transition-colors">
                      <Phone size={24} />
                    </div>
                    <div className="pt-1">
                      <p className="font-black text-[#032b60] uppercase tracking-wider text-xs md:text-sm mb-1 group-hover:text-[#0097b2] transition-colors">Ligne Directe</p>
                      <a href="tel:0485692204" className="text-slate-500 font-medium text-base md:text-lg hover:text-[#0097b2] transition-colors">04 85 69 22 04</a>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>

            <Reveal delay={300} className="lg:col-span-3 w-full">
              <div className="w-full bg-white p-6 sm:p-10 rounded-[2.5rem] shadow-md md:shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-[#032b60] to-[#0097b2]"></div>
                
                <div className="mb-8">
                  <h3 className="text-2xl font-black text-[#032b60] mb-2 uppercase tracking-tight">Parlez-nous de votre projet</h3>
                  <p className="text-slate-500 font-medium text-sm">Remplissez ce formulaire et notre équipe vous recontactera très rapidement.</p>
                </div>

                <ContactForm 
                  typeClient="Non précisé (Accueil)" 
                  simulation="Aucune simulation (depuis l'accueil)" 
                />
              </div>
            </Reveal>

          </div>
        </section>
      </main>

      {/* FOOTER EXACT */}
<Footer />

    </div>
  );
}