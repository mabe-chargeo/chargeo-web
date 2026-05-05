"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, MapPin, Award, FileText, Wrench, Phone, ArrowRight, CheckCircle, Zap
} from 'lucide-react';

import { FadeIn } from '@/components/ui/FadeIn';
import { Navbar } from '@/components/layout/Navbar';
import { TrustedBrands } from '@/components/layout/TrustedBrands';
import { Footer } from '@/components/layout/Footer';
import { ReviewsCarousel } from '@/components/ui/ReviewsCarousel';
import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { SimulatorParticuliers } from '@/components/ui/SimulatorParticuliers';

export default function ParticuliersPage() {
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [savings, setSavings] = useState(0);

  const formRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const brandNavy = "#032b60";
  const brandTeal = "#0097b2";

  const showFloatingCta = !isHeroVisible && !isFormVisible;

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

  const reviews = [
    {
      text: "Enfin un installateur qui explique les vraies économies. J'ai divisé mon budget carburant par 4 dès le premier mois.",
      author: "Jean-Philippe",
      location: "74200 Thonon",
      image: "/review-particulier-1.png"
    },
    {
      text: "La visite technique a été planifiée en 2 jours. Devis clair, sans surprise. La borne 7.4kW change tout par rapport à ma prise standard.",
      author: "Sophie",
      location: "74000 Annecy",
      image: "/review-particulier-2.png"
    },
    {
      text: "Devis reçu rapidement et pose effectuée en 10 jours. L'équipe est experte et gère directement les aides de l'État.",
      author: "Marc",
      location: "74100 Annemasse",
      image: "/review-particulier-3.png"
    }
  ];

  const faqs = [
    { q: "Quelles sont les aides de l'État ?", a: "En choisissant CHARGéO, installateur qualifié IRVE, bénéficiez de la Prime Advenir (jusqu'à 600€) et de la TVA réduite à 5,5%. Nous gérons tout l'administratif." },
    { q: "Quel est le délai d'installation ?", a: "Après votre demande de devis, une visite technique gratuite est planifiée. L'installation se fait généralement sous 10 à 15 jours après validation du devis." },
    { q: "Compatibilité véhicule ?", a: "Standard européen Type 2, compatible avec 100% des véhicules électriques et hybrides du marché." },
    { q: "Qualification IRVE ?", a: "Il s'agit d'une qualification obligatoire pour installer des points de charge dont la puissance est supérieure à 3,7kW. Elle garantit votre sécurité, la validité de votre assurance habitation et la garantie de votre véhicule." }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#0097b2]/20 scroll-smooth pb-24 lg:pb-0">
      
      <Navbar 
        showFloatingCta={showFloatingCta} 
        onCtaClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
        ctaText="Être rappelé(e)"
      />

      {/* STICKY BOTTOM BAR (MOBILE) */}
      <div className={`lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 z-60 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-500 ${showFloatingCta ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex flex-col">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Mon estimation</p>
            <p className="text-xl sm:text-2xl font-black text-green-600 transition-all duration-300">
              +{Math.round(savings).toLocaleString('fr-FR')}€ / an
            </p>
          </div>
          <button 
            onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
            className="relative overflow-hidden bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 py-3 rounded-full font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 group"
          >
            Me faire rappeler <Phone size={16} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>

      <main>
        {/* HERO SECTION */}
        <section className="relative min-h-dvh pt-25 md:pt-30 flex flex-col justify-center overflow-hidden bg-[#032b60]">
          <div className="absolute inset-0 z-0">
            <img 
              src="/hero-particulier.png" 
              className="w-full h-full object-cover opacity-40 animate-bg-pan" 
              alt="Hero Background" 
            />
            <div className="absolute inset-0 bg-linear-to-r from-[#032b60]/95 via-[#032b60]/40 to-transparent"></div>
          </div>
          <div className="max-w-7xl mx-auto px-6 relative z-10 w-full py-12 grow flex flex-col justify-center">
            <div className="max-w-4xl mx-auto text-center flex flex-col items-center space-y-6">

              <FadeIn delay={200} direction="up">
                 <div className="flex items-center justify-center gap-2 text-[#0097b2] font-black text-sm sm:text-base uppercase tracking-widest bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm mt-2">
                   <MapPin size={18} />
                   <span>Intervention sur le Chablais et la Haute-Savoie</span>
                 </div>
              </FadeIn>
              
              <FadeIn delay={300} direction="up">
                <h1 className="text-5xl md:text-[6.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase mt-4">
                  La recharge <br/><span className="text-[#0097b2]">ultra-rentable.</span>
                </h1>
              </FadeIn>
              
              <FadeIn delay={500} direction="up">
                <p className="text-lg md:text-xl text-white/80 leading-relaxed font-medium max-w-2xl text-balance">
                  Simulez vos économies en passant à l'électrique et demandez une visite technique gratuite pour l'installation de votre borne certifiée IRVE.
                </p>
              </FadeIn>
              
              <FadeIn delay={700} direction="up">
                <div ref={heroRef} className="flex flex-col items-center gap-4 mt-4 animate-float">
                  <button 
                    onClick={() => document.getElementById('simulateur')?.scrollIntoView({ behavior: 'smooth' })} 
                    className="relative overflow-hidden inline-flex items-center justify-center gap-3 bg-[#FF6B00] hover:bg-[#E66000] text-white px-8 sm:px-12 py-4 sm:py-5 rounded-full font-black text-base sm:text-lg shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 active:scale-95 transition-all w-fit group text-center"
                  >
                    Calculer mes économies <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                  </button>
                  <div className="flex flex-col gap-2 items-center">
                    <button 
                      onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} 
                      className="text-sm text-white/80 hover:text-white font-bold underline underline-offset-4 decoration-white/30 hover:decoration-white transition-all flex items-center gap-2 mt-2"
                    >
                      <Phone size={14} /> Ou demander à être rappelé directement
                    </button>
                    <p className="text-xs text-white/50 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                      <CheckCircle size={14} className="text-[#0097b2]"/> Visite technique gratuite
                    </p>
                  </div>
                </div>
              </FadeIn>

            </div>
          </div>
        </section>

        {/* BANDEAU CONFIANCE */}
        <TrustedBrands />

        {/* MÉTHODOLOGIE + CARROUSEL AVIS */}
        <section id="concept" className="py-24 bg-slate-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
             <div className="space-y-8">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none" style={{ color: brandNavy }}>Une Méthode <br/><span style={{ color: brandTeal }}>Standardisée</span></h2>
                <p className="text-lg text-slate-500 font-medium leading-relaxed mt-6">Le réseau CHARGéO repose sur une transparence absolue. Nos experts IRVE locaux se déplacent gratuitement pour vous fournir un devis précis et sans surprise.</p>
                
                <div className="space-y-6">
                  {[
                    { i: <Zap/>, t: "Borne Intelligente", d: "7.4kW pour une charge 3x plus rapide qu'une prise standard." },
                    { i: <FileText/>, t: "Devis Transparent", d: "Obtenez un devis clair après une visite technique gratuite." },
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
             
             <ReviewsCarousel reviews={reviews} />
          </div>
        </section>

        {/* BLOC EXPERTISE / CONFIANCE */}
        <section className="py-20 bg-white border-t border-slate-100 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-[#032b60] rounded-[2.5rem] p-10 md:p-16 flex flex-col md:flex-row items-center gap-12 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#0097b2]/30 rounded-full blur-[100px] -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000 ease-in-out"></div>

              <div className="md:w-1/2 space-y-6 relative z-10 text-white">
                <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
                  <MapPin size={16} className="text-[#0097b2]" />
                  <span className="text-xs font-black uppercase tracking-widest text-blue-100">Vos Experts Locaux</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight">
                  L'excellence d'un service <span className="text-[#0097b2]">de proximité.</span>
                </h2>
                <p className="text-lg text-blue-100/80 font-medium leading-relaxed">
                  Basés en Haute-Savoie, nous ne sommes pas une plateforme nationale impersonnelle. CHARGéO, c'est une équipe locale d'artisans qualifiés IRVE qui vous accompagne de la visite technique jusqu'à l'installation.
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

              {/* GRILLE À 3 CARTES */}
              <div className="md:w-1/2 w-full grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl hover:bg-white/20 transition-colors duration-300 h-full flex flex-col">
                  <Award className="text-[#0097b2] mb-4" size={32} />
                  <h4 className="text-white font-black uppercase tracking-wider mb-2">Qualification IRVE</h4>
                  <p className="text-blue-100/70 text-xs font-medium leading-relaxed grow">Il s'agit d'une qualification obligatoire pour installer des points de charge dont la puissance est supérieure à 3,7kW. Indispensable pour votre assurance.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl hover:bg-white/20 transition-colors duration-300 h-full flex flex-col">
                  <FileText className="text-[#0097b2] mb-4" size={32} />
                  <h4 className="text-white font-black uppercase tracking-wider mb-2">Administratif Inclus</h4>
                  <p className="text-blue-100/70 text-xs font-medium leading-relaxed grow">Nous montons de A à Z vos dossiers de Prime Advenir (jusqu'à 600€) et la demande de TVA réduite.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl hover:bg-white/20 transition-colors duration-300 sm:col-span-2">
                  <Wrench className="text-[#0097b2] mb-4" size={32} />
                  <h4 className="text-white font-black uppercase tracking-wider mb-2">SAV & Maintenance</h4>
                  <p className="text-blue-100/70 text-xs font-medium leading-relaxed">Un problème ? Notre équipe locale intervient rapidement. Nous assurons le suivi de tout notre parc installé pour vous garantir une tranquillité d'esprit totale sur le long terme.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SIMULATEUR DE RENTABILITÉ */}
        <section id="simulateur" className="py-24 bg-white scroll-mt-24">
<SimulatorParticuliers onResultChange={setSavings} />
          {/* BLOC FORMULAIRE */}
          <div id="formulaire-devis" ref={formRef} className="max-w-7xl mt-16 lg:mt-24 bg-white p-4 sm:p-8 md:p-10 rounded-4xl sm:rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col relative z-10 mx-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0 shadow-inner">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-black text-[#032b60] uppercase tracking-widest text-xs sm:text-sm leading-tight">Planifier ma visite technique</h3>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Un expert se déplace gratuitement pour votre devis</p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-sm">
               <span className="text-orange-500 mt-0.5 text-lg leading-none">⚠️</span>
               <p className="text-xs sm:text-sm text-orange-800 font-medium leading-relaxed">
                 Nos plannings d'installation se remplissent vite. <span className="font-black">Réservez votre visite technique gratuite aujourd'hui pour bloquer votre créneau.</span>
               </p>
            </div>

            <div className="w-full relative h-212.5 sm:h-200 lg:h-225">
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
        </section>

        {/* FAQ SECTION */}
        <section className="py-24 bg-slate-50 border-t border-slate-100">
          <div className="max-w-4xl mx-auto px-6 space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase" style={{ color: brandNavy }}>Questions <span style={{ color: brandTeal }}>Fréquentes</span></h2>
            </div>
            <FaqAccordion faqs={faqs} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}