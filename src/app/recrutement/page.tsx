"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  ArrowRight, Download, MapPin, Wrench, Zap, ClipboardCheck, User, ShieldCheck, Clock, Award,
  CheckCircle, Phone, Euro, Truck, CalendarCheck, GraduationCap
} from 'lucide-react';

import { FadeIn } from '@/components/ui/FadeIn';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { RecrutementForm } from '@/components/ui/RecrutementForm';

// Brochure PDF hebergee sur le Drive (partage : tous les utilisateurs disposant du lien, lecteur).
// Pour la mettre a jour sans casser le lien : Drive > Gerer les versions > Importer une nouvelle version.
const BROCHURE_PDF = "https://drive.google.com/file/d/1CXRE-PEHDua-cXb6ggUBP3wHSxL_UerY/view";

export default function RecrutementPage() {
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const brandNavy = "#032b60";
  const brandTeal = "#0097b2";
  const showFloatingCta = !isHeroVisible && !isFormVisible;
  const allerAuFormulaire = () => document.getElementById('formulaire-candidature')?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    const options = { threshold: 0 };
    const heroObserver = new IntersectionObserver(([entry]) => setIsHeroVisible(entry.isIntersecting), options);
    const formObserver = new IntersectionObserver(([entry]) => setIsFormVisible(entry.isIntersecting), options);
    if (heroRef.current) heroObserver.observe(heroRef.current);
    if (formRef.current) formObserver.observe(formRef.current);
    return () => { heroObserver.disconnect(); formObserver.disconnect(); };
  }, []);

  const metier = [
    { i: <Wrench />, t: "La pose", d: "Fixation de la borne, passage des câbles, protections dans le tableau, raccordement. Chez des particuliers, en copropriété et dans des entreprises." },
    { i: <Zap />, t: "Le test", d: "Essais, mesures, paramétrage de la borne et de sa connexion. On ne quitte pas un chantier tant que la borne ne charge pas." },
    { i: <ClipboardCheck />, t: "Le compte-rendu", d: "Photos, check-list et rapport depuis ton téléphone. C'est ce qui débloque les aides du client, et ce qui prouve la qualité de ton travail." },
  ];

  const gains = [
    { i: <Euro size={22} />, t: "14 à 16 € brut de l'heure", d: "Bien au-dessus du SMIC, plus 10 % de fin de mission et 10 % de congés payés." },
    { i: <Truck size={22} />, t: "Véhicule, tenue et outillage fournis", d: "Tu arrives le matin, tout est prêt." },
    { i: <Clock size={22} />, t: "Horaires de journée", d: "8h-12h / 13h-17h." },
    { i: <CalendarCheck size={22} />, t: "Missions planifiées à la semaine", d: "Tu connais ton planning à l'avance." },
    { i: <GraduationCap size={22} />, t: "Formé sur le terrain", d: "Et accompagné jusqu'à ton habilitation électrique." },
  ];

  const journee = [
    { h: "8h", d: "Départ de Thonon avec le véhicule chargé." },
    { h: "Matin", d: "La pose et le raccordement." },
    { h: "12h-13h", d: "La pause." },
    { h: "Après-midi", d: "La mise en service, les tests et les photos." },
    { h: "17h", d: "Fin de journée : la borne charge." },
  ];

  const fiche = [
    { i: <Wrench size={20} />, t: "Le poste", s: "Poseur de bornes de recharge", d: "Pose, raccordement, mise en service et compte-rendu des bornes de recharge, chez des particuliers, en copropriété et en entreprise. Débutant accepté." },
    { i: <User size={20} />, t: "Le profil", s: "Ce qu'on attend", d: "CAP, Bac pro électricité ou équivalent. Permis B. De la rigueur, le soin des finitions, et une vraie politesse avec le client chez lui." },
    { i: <ShieldCheck size={20} />, t: "L'habilitation", s: "Électrique, NF C 18-510", d: "Une formation à l'habilitation électrique est un plus. L'habilitation elle-même, c'est nous qui la délivrons, après ta formation." },
    { i: <Euro size={20} />, t: "La rémunération", s: "Selon ton profil", d: "14 à 16 € brut de l'heure, plus 10 % de fin de mission et 10 % de congés payés versés par l'agence d'intérim." },
    { i: <Clock size={20} />, t: "Le contrat", s: "Pour démarrer", d: "Missions d'intérim planifiées à la semaine, de 8h à 12h et de 13h à 17h. Notre objectif : passer nos meilleurs poseurs en CDI dès que l'activité est stable." },
    { i: <MapPin size={20} />, t: "Le secteur", s: "Où tu travailles", d: "Chantiers dans le Chablais et en Haute-Savoie, au départ de Thonon-les-Bains." },
    { i: <Award size={20} />, t: "Ce qu'on t'apporte", s: "Pour progresser", d: "Véhicule, tenue et outillage fournis, une formation à notre méthode et aux bornes de recharge, un électricien expérimenté à tes côtés sur les premiers chantiers, et une évolution vers chef de chantier." },
  ];

  const parcours = [
    { t: "Découvrir", d: "Tu démarres en missions d'intérim planifiées à la semaine. On apprend à se connaître sur le terrain." },
    { t: "Apprendre", d: "Tu es formé à notre méthode et aux bornes de recharge, et tu gagnes en autonomie sur les poses." },
    { t: "T'installer", d: "Notre objectif : passer nos meilleurs poseurs en CDI dès que l'activité est stable." },
    { t: "Encadrer", d: "Tu deviens chef de chantier : tu gères l'équipe, les plannings et les commandes de matériel." },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#0097b2]/20 scroll-smooth pb-24 lg:pb-0">

      <Navbar showFloatingCta={showFloatingCta} onCtaClick={allerAuFormulaire} ctaText="Postuler" ctaIcon={ArrowRight} />

      {/* BARRE BASSE (MOBILE) */}
      <div className={`lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 z-60 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-500 ${showFloatingCta ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex flex-col">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">On recrute</p>
            <p className="text-base font-black text-[#032b60]">Poseur de bornes</p>
          </div>
          <button onClick={allerAuFormulaire} className="relative overflow-hidden bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 py-3 rounded-full font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-[0_4px_14px_rgba(255,107,0,0.3)]">
            Postuler <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <main>
        {/* 1. ACCROCHE */}
        <section className="relative min-h-[82vh] pt-28 pb-12 flex flex-col justify-center overflow-hidden bg-[#032b60]">
          <div className="absolute inset-0 z-0">
            <Image src="/tech-chargeo.webp" alt="Technicien CHARGéO qui câble une borne de recharge" fill sizes="100vw" priority fetchPriority="high" className="object-cover opacity-40" />
            <div className="absolute inset-0 bg-linear-to-r from-[#032b60]/95 via-[#032b60]/50 to-transparent"></div>
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
            <FadeIn delay={200} direction="up">
              <div className="inline-flex items-center gap-2 text-[#0097b2] font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm mb-6 mt-6">
                <MapPin size={16} />
                <span>On recrute · Poseur de bornes de recharge</span>
              </div>
            </FadeIn>

            <FadeIn delay={300} direction="up">
              <h1 className="text-[2.5rem] sm:text-5xl md:text-[5.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase mb-6 max-w-5xl">
                Électricien débutant ? <br /><span className="text-[#0097b2]">Deviens poseur de bornes.</span>
              </h1>
            </FadeIn>

            <FadeIn delay={500} direction="up">
              <p className="text-sm sm:text-base md:text-xl text-white/80 leading-relaxed font-medium max-w-2xl mb-8">
                Tu as un CAP ou un Bac pro électricité et envie d'apprendre un métier d'avenir ? On te forme à la pose de bornes de recharge, avec du matériel neuf et une méthode claire. Missions planifiées à la semaine, au départ de Thonon.
              </p>
              <div className="flex flex-wrap gap-3 mb-10">
                {["14 à 16 € brut/h + 20 % de primes intérim", "Véhicule, tenue et outillage fournis", "Horaires de journée"].map((p) => (
                  <span key={p} className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white bg-white/10 border border-[#0097b2]/60 px-4 py-2 rounded-full">{p}</span>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={700} direction="up">
              <div ref={heroRef} className="flex flex-col sm:flex-row sm:items-center gap-5">
                <button onClick={allerAuFormulaire} className="relative overflow-hidden inline-flex items-center justify-center gap-3 bg-[#FF6B00] hover:bg-[#E66000] text-white px-8 sm:px-12 py-4 sm:py-5 rounded-full font-black text-base sm:text-lg shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 active:scale-95 transition-all w-fit group">
                  <div className="animate-button-shine" />
                  Postuler <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <a href={BROCHURE_PDF} target="_blank" rel="noopener noreferrer" className="text-sm text-white/80 hover:text-white font-bold underline underline-offset-4 decoration-white/30 hover:decoration-white transition-all flex items-center gap-2">
                  <Download size={14} /> Télécharger la brochure (PDF)
                </a>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* 2. CE QUE TU GAGNES */}
        <section className="py-20 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6 space-y-10">
            <FadeIn delay={0}>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none" style={{ color: brandNavy }}>
                Ce que <span style={{ color: brandTeal }}>tu gagnes.</span>
              </h2>
            </FadeIn>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {gains.map((g, idx) => (
                <FadeIn key={g.t} delay={idx * 80}>
                  <div className="h-full bg-slate-50 border border-slate-100 rounded-3xl p-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#0097b2] text-white flex items-center justify-center mb-4">{g.i}</div>
                    <h3 className="font-black text-sm uppercase tracking-wider mb-2" style={{ color: brandNavy }}>{g.t}</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{g.d}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* 3. QUI ON EST */}
        <section className="py-24 bg-slate-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
            <FadeIn delay={0}>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none" style={{ color: brandNavy }}>
                Une jeune entreprise <br /><span style={{ color: brandTeal }}>qui veut durer.</span>
              </h2>
            </FadeIn>
            <FadeIn delay={200}>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">
                CHARGéO est une jeune entreprise de Thonon-les-Bains qui installe et entretient des bornes de recharge pour les maisons, les copropriétés et les entreprises du Chablais. On démarre, on veut durer, et on construit l'équipe dès maintenant. Ici, tu n'es pas un numéro : tu rejoins le projet au départ.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* 4. TON METIER */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <FadeIn delay={0}>
              <div className="max-w-3xl">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none mb-6" style={{ color: brandNavy }}>
                  Poser, raccorder, <br /><span style={{ color: brandTeal }}>mettre en service.</span>
                </h2>
                <p className="text-lg text-slate-500 font-medium leading-relaxed">
                  La recharge électrique, c'est un vrai métier d'électricien : de la technique, du concret, et un résultat visible à la fin de chaque journée, une borne qui charge.
                </p>
              </div>
            </FadeIn>
            <div className="grid md:grid-cols-3 gap-6">
              {metier.map((m, idx) => (
                <FadeIn key={m.t} delay={idx * 100}>
                  <div className="h-full bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 hover:-translate-y-1 transition-transform duration-300 group">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-[#0097b2] mb-6 group-hover:bg-[#0097b2] group-hover:text-white transition-colors duration-500">{m.i}</div>
                    <h3 className="font-black text-lg uppercase tracking-wider mb-3" style={{ color: brandNavy }}>{m.t}</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{m.d}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* 5. TA JOURNEE */}
        <section className="py-24 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <FadeIn delay={0}>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none" style={{ color: brandNavy }}>
                Ta journée, <br /><span style={{ color: brandTeal }}>en vrai.</span>
              </h2>
            </FadeIn>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {journee.map((j, idx) => (
                <FadeIn key={j.h} delay={idx * 80}>
                  <div className="h-full border-l-4 border-[#0097b2] bg-slate-50 rounded-r-2xl p-5">
                    <p className="font-black text-lg text-[#0097b2] mb-1">{j.h}</p>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{j.d}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* 6. LA FICHE DE POSTE */}
        <section className="py-24 bg-slate-50 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <FadeIn delay={0}>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none" style={{ color: brandNavy }}>
                Poseur de bornes, <br /><span style={{ color: brandTeal }}>le poste en clair.</span>
              </h2>
            </FadeIn>
            <div className="grid md:grid-cols-2 gap-5">
              {fiche.map((f, idx) => (
                <FadeIn key={f.t} delay={idx * 80}>
                  <div className="h-full bg-white border border-slate-100 rounded-3xl p-6 flex gap-5 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-[#032b60] text-[#22d3ee] flex items-center justify-center shrink-0">{f.i}</div>
                    <div>
                      <h3 className="font-black text-sm uppercase tracking-wider" style={{ color: brandNavy }}>{f.t}</h3>
                      <p className="text-xs font-bold text-[#0097b2] mb-2">{f.s}</p>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">{f.d}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* 7. TON PARCOURS */}
        <section className="py-24 bg-[#032b60] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#0097b2]/30 rounded-full blur-[120px] -mr-20 -mt-20 pointer-events-none"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10 space-y-12">
            <FadeIn delay={0}>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none text-white">
                Ton parcours, <br /><span className="text-[#22d3ee]">étape par étape.</span>
              </h2>
            </FadeIn>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {parcours.map((p, idx) => (
                <FadeIn key={p.t} delay={idx * 100}>
                  <div className="h-full bg-white/10 backdrop-blur-md border border-white/15 rounded-3xl p-6">
                    <div className="w-10 h-10 rounded-full border border-[#22d3ee] text-[#22d3ee] font-black flex items-center justify-center mb-4">{idx + 1}</div>
                    <h3 className="text-white font-black uppercase tracking-wider mb-2">{p.t}</h3>
                    <p className="text-blue-100/80 text-sm font-medium leading-relaxed">{p.d}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
            <p className="text-blue-100/80 font-medium border border-white/15 rounded-2xl px-6 py-4 max-w-3xl">
              On démarre, et on cherche des gens qui ont envie de grandir avec l'entreprise. Ton évolution suit la sienne.
            </p>
          </div>
        </section>

        {/* 8. LE FORMULAIRE */}
        <section id="formulaire-candidature" ref={formRef} className="py-20 md:py-32 bg-slate-50 relative border-t border-slate-100 scroll-mt-24">
          <div className="absolute inset-0 bg-grid-tech opacity-30"></div>
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-5 gap-12 md:gap-16 items-start relative z-10">
            <div className="lg:col-span-2 space-y-8">
              <FadeIn delay={0}>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-[#032b60] mb-4 leading-tight">
                  Envie de <br /><span className="text-[#0097b2]">nous rejoindre ?</span>
                </h2>
                <p className="text-slate-500 font-medium leading-relaxed text-base md:text-lg">
                  Deux minutes suffisent. Pas de CV ? Pas grave, on t'appelle.
                </p>
              </FadeIn>
              <FadeIn delay={100}>
                <div className="space-y-4">
                  <p className="flex items-center gap-3 text-sm font-bold text-[#032b60]"><CheckCircle size={18} className="text-[#0097b2]" /> On répond à toutes les candidatures</p>
                  <a href="tel:0485692204" className="flex items-center gap-3 text-sm font-bold text-[#032b60] hover:text-[#0097b2] transition-colors"><Phone size={18} className="text-[#0097b2]" /> Ou appelle-nous : 04 85 69 22 04</a>
                </div>
              </FadeIn>
            </div>
            <div className="lg:col-span-3 w-full">
              <FadeIn delay={300}>
                <div className="w-full bg-white p-6 sm:p-10 rounded-[2.5rem] shadow-md md:shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-[#032b60] to-[#0097b2]"></div>
                  <RecrutementForm />
                </div>
              </FadeIn>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
