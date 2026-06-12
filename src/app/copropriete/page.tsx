"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ArrowRight, CheckCircle, MapPin, Users, Phone, Zap, ShieldCheck, FileText, PiggyBank, Award } from 'lucide-react';

import { FadeIn } from '@/components/ui/FadeIn';
import { Navbar } from '@/components/layout/Navbar';
import { TrustedBrands } from '@/components/layout/TrustedBrands';
import { SimulatorCopro } from '@/components/ui/SimulatorCopro';
import { ReviewsCarousel } from '@/components/ui/ReviewsCarousel';
import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { Footer } from '@/components/layout/Footer';

export default function CoproprietePage() {
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [subventions, setSubventions] = useState(0);

  const formRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const brandNavy = "#032b60";
  const brandTeal = "#0097b2";

  const showFloatingCta = !isHeroVisible && !isFormVisible;

  // --- ÉTATS DU FORMULAIRE MAISON ---
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [message, setMessage] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus("loading");
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email, telephone, message })
      });
      if (res.ok) {
        setFormStatus("success");
        setNom(""); setEmail(""); setTelephone(""); setMessage("");
      } else {
        setFormStatus("error");
      }
    } catch (err) {
      setFormStatus("error");
    }
  };

  // Gestion de la visibilité pour la barre flottante
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
      text: "L'IRVE collective était la seule solution pérenne pour notre parking. CHARGéO a monté le dossier Advenir pour subventionner massivement l'artère principale.",
      author: "Président du CS",
      location: "Résidence 50 lots",
      image: "/review-cs.png"
    },
    {
      text: "L'artère principale a été tirée. Aujourd'hui, n'importe quel résident peut demander le raccordement de sa place sans faire disjoncter l'immeuble.",
      author: "Copropriétaire",
      location: "Thonon",
      image: "/review-resident.png"
    },
    {
      text: "L'accompagnement et le logiciel de supervision nous déchargent totalement. Chacun est facturé au kWh consommé, et le syndic n'a plus rien à gérer.",
      author: "Syndic",
      location: "Annecy",
      image: "/review-syndic.png"
    }
  ];

  const faqs = [
    { q: "L'infrastructure IRVE collective a-t-elle un coût pour l'immeuble ?", a: "L'installation est lourdement subventionnée (jusqu'à 50% par la Prime Advenir avec un plafond de 8 000€). Le reste à charge éventuel dépend de la complexité technique du parking et de sa configuration." },
    { q: "Comment est facturée l'électricité ?", a: "Notre solution de supervision gère tout de A à Z. Chaque résident équipé dispose de son propre sous-compteur intelligent. Les factures lui sont envoyées directement (prélèvement automatique), en fonction de sa consommation réelle." },
    { q: "Et si l'infrastructure collective n'est pas votée en AG ?", a: "En dernier recours, il est possible d'envisager un branchement individuel 'Droit à la Prise'. C'est une démarche légale où le résident paie son propre tirage, mais elle est souvent moins évolutive que le collectif." },
    { q: "L'immeuble risque-t-il de disjoncter ?", a: "Absolument pas. L'infrastructure collective intègre un système de délestage dynamique (Load Balancing) qui répartit intelligemment la puissance disponible entre tous les véhicules branchés." }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#0097b2]/20 scroll-smooth pb-24 lg:pb-0">
      
      <Navbar 
        showFloatingCta={showFloatingCta} 
        onCtaClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })} 
        ctaText="Étude pour AG"
      />

      {/* STICKY BOTTOM BAR (MOBILE) - Rendue statique pour alléger la page */}
      <div className={`lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 z-60 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-500 ${showFloatingCta ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex flex-col">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Aides Débloquées</p>
            <p className="text-xl sm:text-2xl font-black text-green-600">
+{Math.round(subventions).toLocaleString('fr-FR')}€ d'aides            </p>
          </div>
          <button 
            onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })} 
            className="relative overflow-hidden bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 py-3 rounded-full font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 group"
          >
            Étude AG <Phone size={16} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>

      <main>
        {/* HERO SECTION */}
        <section className="relative min-h-[82vh] pt-28 pb-12 flex flex-col justify-center overflow-hidden bg-[#032b60]">
          <div className="absolute inset-0 z-0">
            <Image src="/hero-copro.png" alt="Immeuble moderne" fill sizes="100vw" priority className="object-cover opacity-30 animate-bg-pan" />
            <div className="absolute inset-0 bg-linear-to-r from-[#032b60]/95 via-[#032b60]/40 to-transparent"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10 w-full flex flex-col justify-center items-center text-center">
             <FadeIn delay={200} direction="up">
                 <div className="w-full flex justify-center mb-6 mt-6">
                   <div className="flex items-center justify-center gap-2 text-[#0097b2] font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">
                     <Users size={16} />
                     <span>Solutions pour Résidentiel Collectif</span>
                   </div>
                 </div>
              </FadeIn>
              
              <FadeIn delay={300} direction="up">
                <div className="w-full flex justify-center mb-6">
                  <h1 className="text-[2.5rem] sm:text-5xl md:text-[6.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase">
                    La recharge <br/><span className="text-[#0097b2]">en copropriété.</span>
                  </h1>
                </div>
              </FadeIn>
              
              <FadeIn delay={500} direction="up">
                <div className="w-full flex justify-center mb-10">
                  <p className="text-sm sm:text-base md:text-xl text-white/80 leading-relaxed font-medium max-w-2xl text-balance">
                    Déploiement d'une infrastructure subventionnée, préfinancement possible et supervision complète. Équipez votre parking partagé sans toucher au budget du syndic.
                  </p>
                </div>
              </FadeIn>
              
              <FadeIn delay={700} direction="up">
                <div className="w-full flex justify-center">
                  <div ref={heroRef} className="flex flex-col items-center gap-5 animate-float">
                    <button onClick={() => document.getElementById('simulateur')?.scrollIntoView({ behavior: 'smooth' })} className="relative overflow-hidden inline-flex items-center justify-center gap-3 bg-[#FF6B00] hover:bg-[#E66000] text-white px-8 sm:px-12 py-4 sm:py-5 rounded-full font-black text-base sm:text-lg shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 active:scale-95 transition-all w-fit group text-center">
                      <div className="animate-button-shine" />
                      Évaluer les subventions <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                    </button>
                    <div className="flex flex-col items-center justify-start h-12 gap-2">
                      <button onClick={() => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-white/80 hover:text-white font-bold underline underline-offset-4 decoration-white/30 hover:decoration-white transition-all flex items-center gap-2">
                        <Phone size={14} /> Créer un dossier AG
                      </button>
                      <p className="text-xs text-white/50 font-bold uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle size={14} className="text-[#0097b2]"/> Présentation par un expert IRVE
                      </p>
                    </div>
                  </div>
                </div>
              </FadeIn>
          </div>
        </section>

        {/* LOGOS CONFIANCE */}
        <TrustedBrands />

        {/* SECTION ARGUMENTS COPRO */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 transition-all hover:shadow-lg hover:-translate-y-1">
              <Zap className="text-[#0097b2] mb-6" size={40} />
              <h3 className="text-xl font-black text-[#032b60] mb-3 uppercase tracking-wider">Le droit à la prise</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">La loi vous autorise à équiper votre place de parking. Nous vous fournissons tous les documents nécessaires pour la présentation en Assemblée Générale.</p>
            </div>
            <div className="bg-[#032b60] p-8 rounded-3xl text-white shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#0097b2]/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <PiggyBank className="text-[#0097b2] mb-6 relative z-10" size={40} />
              <h3 className="text-xl font-black mb-3 uppercase tracking-wider relative z-10">Zéro reste à charge</h3>
              <p className="text-white/70 font-medium text-sm leading-relaxed relative z-10">Déploiement d'une infrastructure collective 100% financée par des acteurs tiers et les primes ADVENIR. La copropriété n'a rien à décaisser.</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 transition-all hover:shadow-lg hover:-translate-y-1">
              <FileText className="text-[#0097b2] mb-6" size={40} />
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
                  {/* CARTE 1 */}
                  <div className="flex gap-5 group hover:-translate-y-1 transition-transform duration-300 bg-white p-4 rounded-3xl shadow-sm hover:shadow-md border border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-[#0097b2] group-hover:text-white transition-colors duration-500 shrink-0 text-[#0097b2]">
                      <ShieldCheck />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h4 className="font-black text-sm uppercase tracking-wider" style={{ color: brandNavy }}>Gestion des sous-compteurs</h4>
                      <p className="text-xs text-slate-400 font-medium mt-1">Finis les calculs d'apothicaire en fin d'année. Notre solution logicielle divise précisément les factures.</p>
                    </div>
                  </div>

                  {/* CARTE 2 */}
                  <div className="flex gap-5 group hover:-translate-y-1 transition-transform duration-300 bg-white p-4 rounded-3xl shadow-sm hover:shadow-md border border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-[#0097b2] group-hover:text-white transition-colors duration-500 shrink-0 text-[#0097b2]">
                      <Award />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h4 className="font-black text-sm uppercase tracking-wider" style={{ color: brandNavy }}>Qualification IRVE</h4>
                      <p className="text-xs text-slate-400 font-medium mt-1">C'est l'assurance pour le syndicat que l'infrastructure répond à toutes les normes de sécurité en vigueur.</p>
                    </div>
                  </div>

                  {/* CARTE 3 */}
                  <div className="flex gap-5 group hover:-translate-y-1 transition-transform duration-300 bg-white p-4 rounded-3xl shadow-sm hover:shadow-md border border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-[#0097b2] group-hover:text-white transition-colors duration-500 shrink-0 text-[#0097b2]">
                      <Users />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h4 className="font-black text-sm uppercase tracking-wider" style={{ color: brandNavy }}>Évolutivité garantie</h4>
                      <p className="text-xs text-slate-400 font-medium mt-1">Nous installons une colonne vertébrale capable d'accueillir de nouveaux résidents au fil des années.</p>
                    </div>
                  </div>
                </div>
             </div>
             
             {/* COMPOSANT AVIS ISOLÉ */}
             <ReviewsCarousel reviews={reviews} />
          </div>
        </section>

        {/* SIMULATEUR SUBVENTIONS */}
        <section id="simulateur" className="py-24 bg-white scroll-mt-24 relative overflow-hidden">
          {/* COMPOSANT SIMULATEUR ISOLÉ */}
          <SimulatorCopro onResultChange={setSubventions} />
        </section>

        {/* SECTION CONTACT CORPORATE TECH (Même disposition que l'accueil) */}
        <section id="formulaire-devis" ref={formRef} className="py-20 md:py-32 bg-slate-50 relative border-t border-slate-100 scroll-mt-24">
          <div className="absolute inset-0 bg-grid-tech opacity-30"></div>
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-5 gap-12 md:gap-16 items-start relative z-10">
            
            <div className="lg:col-span-2 space-y-10 md:space-y-12">
              <FadeIn delay={0}>
                <div>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-[#032b60] mb-4 md:mb-6 leading-tight">
                    Besoin d'une <br/><span className="text-[#0097b2]">étude en AG ?</span>
                  </h2>
                  <p className="text-slate-500 font-medium leading-relaxed text-base md:text-lg mb-6">
                    Nos experts réalisent l'analyse de faisabilité technique et le montage financier pour votre immeuble.
                  </p>
                  
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                     <span className="text-orange-500 mt-0.5 text-lg leading-none">⚠️</span>
                     <p className="text-xs sm:text-sm text-orange-800 font-medium leading-relaxed">
                       Nos plannings d'AG se remplissent vite. <span className="font-black">Demandez votre étude gratuite dès aujourd'hui.</span>
                     </p>
                  </div>
                </div>
              </FadeIn>

              <div className="space-y-6">
                <FadeIn delay={0}>
                  <div className="flex items-start gap-5 md:gap-6 group">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center text-[#032b60] shrink-0 group-hover:border-[#0097b2] group-hover:text-[#0097b2] transition-colors">
                      <MapPin size={24} />
                    </div>
                    <div className="pt-1">
                      <p className="font-black text-[#032b60] uppercase tracking-wider text-xs md:text-sm mb-1 group-hover:text-[#0097b2] transition-colors">Zone d'intervention</p>
                      <p className="text-slate-500 font-medium text-sm md:text-base">Chablais et Haute-Savoie</p>
                    </div>
                  </div>
                </FadeIn>
                
                <FadeIn delay={100}>
                  <div className="flex items-start gap-5 md:gap-6 group">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center text-[#032b60] shrink-0 group-hover:border-[#0097b2] group-hover:text-[#0097b2] transition-colors">
                      <Phone size={24} />
                    </div>
                    <div className="pt-1">
                      <p className="font-black text-[#032b60] uppercase tracking-wider text-xs md:text-sm mb-1 group-hover:text-[#0097b2] transition-colors">Ligne Directe</p>
                      <a href="tel:0485692204" className="text-slate-500 font-medium text-base md:text-lg hover:text-[#0097b2] transition-colors">04 85 69 22 04</a>
                    </div>
                  </div>
                </FadeIn>
              </div>
            </div>

            <div className="lg:col-span-3 w-full">
              <FadeIn delay={300}>
                <div className="w-full bg-white p-6 sm:p-10 rounded-[2.5rem] shadow-md md:shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-[#032b60] to-[#0097b2]"></div>
                  
                  <div className="mb-8">
                    <h3 className="text-2xl font-black text-[#032b60] mb-2 uppercase tracking-tight">Parlez-nous de votre projet</h3>
                    <p className="text-slate-500 font-medium text-sm">Remplissez ce formulaire et notre équipe vous recontactera très rapidement.</p>
                  </div>

                  {formStatus === "success" ? (
                    <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-2xl flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in duration-500">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <CheckCircle size={32} />
                      </div>
                      <div>
                        <h4 className="font-black text-xl mb-2">Demande envoyée !</h4>
                        <p className="font-medium text-sm">Merci pour votre message. Nous vous recontactons dans les plus brefs délais.</p>
                      </div>
                      <button onClick={() => setFormStatus("idle")} className="mt-4 text-green-700 font-bold underline text-sm hover:text-green-800 transition-colors">Envoyer un autre message</button>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Nom & Prénom <span className="text-[#0097b2]">*</span></label>
                          <input type="text" required value={nom} onChange={(e) => setNom(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-[#0097b2] focus:border-[#0097b2] block p-3.5 transition-colors outline-none" placeholder="Jean Dupont" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Téléphone <span className="text-[#0097b2]">*</span></label>
                          <input type="tel" required value={telephone} onChange={(e) => setTelephone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-[#0097b2] focus:border-[#0097b2] block p-3.5 transition-colors outline-none" placeholder="06 12 34 56 78" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Email <span className="text-[#0097b2]">*</span></label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-[#0097b2] focus:border-[#0097b2] block p-3.5 transition-colors outline-none" placeholder="jean@exemple.com" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Votre message</label>
                        <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-[#0097b2] focus:border-[#0097b2] block p-3.5 transition-colors outline-none resize-none" placeholder="Décrivez-nous brièvement votre besoin..."></textarea>
                      </div>

                      {formStatus === "error" && (
                        <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-200">Une erreur est survenue lors de l'envoi. Veuillez réessayer.</p>
                      )}

                      <button type="submit" disabled={formStatus === "loading"} className="relative overflow-hidden w-full bg-[#FF6B00] hover:bg-[#E66000] text-white font-black rounded-full text-sm sm:text-base px-6 py-4 text-center transition-all duration-300 shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100 disabled:shadow-none flex justify-center items-center gap-2 group z-10"><div className="animate-button-shine" />
                        {formStatus === "loading" ? "Envoi en cours..." : "Soumettre ma demande"}
                      </button>
                      <p className="text-[10px] text-slate-400 text-center mt-4">Vos données sont sécurisées et envoyées directement à notre équipe technique.</p>
                    </form>
                  )}
                </div>
              </FadeIn>
            </div>

          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="py-24 bg-slate-50 border-t border-slate-100">
          <div className="max-w-4xl mx-auto px-6 space-y-12">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-center" style={{ color: brandNavy }}>Questions <span style={{ color: brandTeal }}>Fréquentes</span></h2>
            
            {/* COMPOSANT FAQ ISOLÉ */}
            <FaqAccordion faqs={faqs} />
          </div>
        </section>
      </main>

      {/* FOOTER GLOBAL */}
      <Footer />
    </div>
  );
}