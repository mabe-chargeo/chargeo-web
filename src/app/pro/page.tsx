"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, ShieldCheck, Building, Home, CreditCard,
  MapPin, Award, FileText, Phone, Car
} from 'lucide-react';

import { FadeIn } from '@/components/ui/FadeIn';
import { Navbar } from '@/components/layout/Navbar';
import { TrustedBrands } from '@/components/layout/TrustedBrands';
import { Footer } from '@/components/layout/Footer';
import { ReviewsCarousel } from '@/components/ui/ReviewsCarousel';
import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { SimulatorPro } from '@/components/ui/SimulatorPro';

export default function ProPage() {
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);

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
      text: "Nous voulions offrir un service de recharge à notre clientèle. CHARGéO a géré l'installation, et la borne génère aujourd'hui des revenus chaque mois.",
      author: "Directeur d'Hôtel",
      location: "74500 Évian",
      image: "/review-hotel.png"
    },
    {
      text: "Pour nos commerciaux, la solution à domicile est parfaite. Le logiciel relève automatiquement leurs recharges pro. Gain de temps énorme.",
      author: "DRH",
      location: "74000 Annecy",
      image: "/review-domicile.png"
    },
    {
      text: "Nous avons équipé notre parking avec délestage dynamique. Parfait pour respecter la Loi LOM, et l'amortissement comptable est un vrai plus.",
      author: "Gérant",
      location: "74200 Thonon",
      image: "/review-flotte.png"
    }
  ];

  const faqs = [
    { q: "Comment fonctionne la monétisation ?", a: "C'est très simple : nous installons des bornes communicantes. Vous décidez du tarif appliqué au kWh. Notre logiciel s'occupe de facturer l'utilisateur final par QR Code et vous reverse les revenus mensuellement." },
    { q: "Domicile Collaborateurs : Comment rembourser l'électricité ?", a: "Notre logiciel isole la consommation liée au véhicule professionnel grâce au badge RFID du salarié. Chaque mois, un relevé certifié permet le remboursement en note de frais." },
    { q: "Quelles sont les obligations de la Loi LOM ?", a: "La Loi LOM oblige les entreprises (parc > 100 véhicules) à intégrer un pourcentage de véhicules à faibles émissions. Équiper vos parkings devient une nécessité légale." },
    { q: "Quels sont les avantages fiscaux ?", a: "L'électrification permet une exonération totale de la TVS. De plus, l'entreprise bénéficie d'un plafond d'amortissement rehaussé et la TVA sur l'électricité consommée est récupérable." }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#0097b2]/20 scroll-smooth pb-24 lg:pb-0">

      <Navbar
        showFloatingCta={showFloatingCta}
        onCtaClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
        ctaText="Audit B2B Gratuit"
      />

      {/* STICKY BOTTOM BAR (MOBILE) */}
      <div className={`lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 z-60 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-500 ${showFloatingCta ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex flex-col">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Revenus Potentiels</p>
            <p className="text-xl sm:text-2xl font-black text-green-600 transition-all duration-300">
              Calculateur
            </p>
          </div>
          <button
            onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="relative overflow-hidden bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 py-3 rounded-full font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-[0_4px_14px_rgba(255,107,0,0.3)] group"
          >
            <div className="animate-button-shine" />
            Audit B2B <Phone size={16} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>

      <main>
        {/* HERO SECTION PRO */}
        <section className="relative min-h-dvh pt-25 md:pt-30 flex flex-col justify-center overflow-hidden bg-[#032b60]">
          <div className="absolute inset-0 z-0">
            <img
              src="/hero-pro.png"
              className="w-full h-full object-cover opacity-40 animate-bg-pan"
              alt="Bâtiment entreprise et recharge"
            />
            <div className="absolute inset-0 bg-linear-to-r from-[#032b60]/95 via-[#032b60]/40 to-transparent"></div>
          </div>
          <div className="max-w-7xl mx-auto px-6 relative z-10 w-full py-12 grow flex flex-col justify-center">
            <div className="max-w-4xl mx-auto text-center flex flex-col items-center space-y-6">
              <FadeIn delay={200}>
                <div className="flex items-center justify-center gap-2 text-[#0097b2] font-black text-sm sm:text-base uppercase tracking-widest bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">
                   <Building size={18} />
                   <span>Solutions pour Entreprises & B2B</span>
                </div>
              </FadeIn>
              <FadeIn delay={300}>
                <h1 className="text-5xl md:text-[6.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase">
                  L'infrastructure <br/><span style={{ color: brandTeal }}>pour les Pros.</span>
                </h1>
              </FadeIn>
              <FadeIn delay={500}>
                <p className="text-lg md:text-xl text-white/80 leading-relaxed font-medium max-w-2xl">
                  Électrifiez votre flotte, équipez vos collaborateurs à domicile ou monétisez votre parking client. Nous gérons votre projet de A à Z.
                </p>
              </FadeIn>
              <FadeIn delay={700}>
                <div ref={heroRef} className="flex flex-col items-center gap-4 animate-float">
                  <button
                    onClick={() => document.getElementById('simulateur')?.scrollIntoView({ behavior: 'smooth' })}
                    className="relative overflow-hidden inline-flex items-center justify-center gap-3 bg-[#FF6B00] hover:bg-[#E66000] text-white px-8 sm:px-12 py-4 sm:py-5 rounded-full font-black text-base sm:text-lg shadow-[0_4px_14px_rgba(255,107,0,0.3)] transition-all group"
                  >
                    <div className="animate-button-shine" />
                    Estimer mes revenus <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                  </button>
                  <button
                    onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-sm text-white/80 hover:text-white font-bold underline underline-offset-4 decoration-white/30 hover:decoration-white transition-all flex items-center gap-2"
                  >
                    <Phone size={14} /> Ou demander un Audit B2B directement
                  </button>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* BANDEAU CONFIANCE */}
        <TrustedBrands />

        {/* CAS D'USAGE B2B */}
        <section id="concept" className="py-24 bg-slate-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
             <div className="space-y-8">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none" style={{ color: brandNavy }}>Chaque entreprise <br/><span style={{ color: brandTeal }}>est unique.</span></h2>
                <p className="text-lg text-slate-500 font-medium leading-relaxed">Nous avons segmenté nos offres pour répondre aux exigences comptables, fiscales et RH propres à votre modèle économique.</p>

                <div className="space-y-6">
                  {[
                    { i: <Car />, t: "Cas n°1 : La Flotte d'Entreprise", d: "Électrifiez votre parking. Supervision logicielle, badges RFID pour le suivi des consos et délestage pour la sécurité de l'entreprise." },
                    { i: <Home />, t: "Cas n°2 : Domicile Collaborateurs", d: "Offrez la recharge à la maison. Notre logiciel isole la conso pro : vous remboursez le salarié sur note de frais, sans gestion." },
                    { i: <CreditCard />, t: "Cas n°3 : Monétisation Clientèle", d: "Attirez une clientèle premium. Fixez votre marge au kWh, le client paie par QR Code, vous générez des revenus." }
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-5 group hover:-translate-y-1 transition-transform duration-300 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
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

             <ReviewsCarousel reviews={reviews} />
          </div>
        </section>

        {/* EXPERTISE FISCALE */}
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
                <p className="text-lg text-blue-100/80 font-medium">L'électrification de vos parkings n'est pas qu'une contrainte légale. C'est une opportunité fiscale puissante. Nos experts gèrent l'administratif pour que vous récupériez chaque euro auquel vous avez droit.</p>
              </div>

              <div className="md:w-1/2 w-full grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
                  <Building className="text-[#0097b2] mb-4" size={32} />
                  <h4 className="text-white font-black uppercase tracking-wider mb-2">Conformité Loi LOM</h4>
                  <p className="text-blue-100/70 text-xs">Mise aux normes de vos parkings pour respecter vos quotas obligatoires.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
                  <FileText className="text-[#0097b2] mb-4" size={32} />
                  <h4 className="text-white font-black uppercase tracking-wider mb-2">Exonération TVS</h4>
                  <p className="text-blue-100/70 text-xs">Exonération totale de la Taxe sur les Véhicules de Société pour les flottes électriques.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl sm:col-span-2">
                  <Award className="text-[#0097b2] mb-4" size={32} />
                  <h4 className="text-white font-black uppercase tracking-wider mb-2">Amortissement & TVA</h4>
                  <p className="text-blue-100/70 text-xs">Plafond d'amortissement rehaussé (30 000€) et récupération totale de la TVA sur l'électricité consommée.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SIMULATEUR PRO */}
        <section id="simulateur" className="py-24 bg-white scroll-mt-24">
          <SimulatorPro />

          {/* FORMULAIRE ClickUp */}
          <div id="formulaire-devis" ref={formRef} className="max-w-7xl mx-auto px-6 mt-24 bg-white p-4 sm:p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div className="w-full relative h-212.5 sm:h-200 lg:h-225">
              <iframe
                className="w-full h-full border-none rounded-2xl"
                src="https://forms.clickup.com/90151325642/f/2kyq03ya-7815/I5ELJ3PBRLRC158WLS?Source=Site%20Web%20Pro"
                title="Formulaire CHARGéO Pro"
                style={{ background: 'transparent' }}
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="py-24 bg-slate-50 border-t border-slate-100 text-center">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-12" style={{ color: brandNavy }}>Questions <span style={{ color: brandTeal }}>Fréquentes</span></h2>
            <FaqAccordion faqs={faqs} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}