"use client";

// Page Recrutement, charte 2026 (maquette validée le 05/10/2026).
// Inchangé : RecrutementForm (/api/recrutement), lien brochure Drive, barre mobile, CTA « Postuler » du menu.
// 07/10/2026 (images) : les cartes du métier ne répètent plus la photo du haut de page.
import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Download, MapPin, Wrench, Zap, ClipboardCheck, User, ShieldCheck, Clock, Award,
  CheckCircle, Phone, Euro, Truck, CalendarCheck, GraduationCap, Home, Building, Briefcase,
} from 'lucide-react';
import Image from 'next/image';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { RecrutementForm } from '@/components/ui/RecrutementForm';
import { NAVY, CYAN, ORANGE, BLEU_CLAIR, CYAN_CLAIR, GRIS, CARTE, Reveal, Barre, Lbl, Titre, Icone } from '@/components/charte/Charte';
import { HautPhoto } from '@/components/charte/HautPhoto';
import { BandeauChiffres, BarreMobile } from '@/components/charte/PageOffre';

// Brochure PDF hebergee sur le Drive (partage : tous les utilisateurs disposant du lien, lecteur).
// Pour la mettre a jour sans casser le lien : Drive > Gerer les versions > Importer une nouvelle version.
const BROCHURE_PDF = "https://drive.google.com/file/d/1CXRE-PEHDua-cXb6ggUBP3wHSxL_UerY/view";

const GAINS = [
  { i: Euro, t: "14 à 16 € brut de l’heure", d: "Bien au-dessus du SMIC, plus 10 % de fin de mission et 10 % de congés payés." },
  { i: Truck, t: "Véhicule, tenue et outillage fournis", d: "Tu arrives le matin, tout est prêt." },
  { i: Clock, t: "Horaires de journée", d: "8h-12h / 13h-17h." },
  { i: CalendarCheck, t: "Missions planifiées à la semaine", d: "Tu connais ton planning à l’avance." },
  { i: GraduationCap, t: "Formé sur le terrain", d: "Et accompagné jusqu’à ton habilitation électrique." },
];

const METIER = [
  { i: Wrench, img: "/photo-technicien-pose.webp", t: "La pose", d: "Fixation de la borne, passage des câbles, protections dans le tableau, raccordement. Chez des particuliers, en copropriété et dans des entreprises." },
  { i: Zap, img: "/photo-badge-maison.webp", t: "Le test", d: "Essais, mesures, paramétrage de la borne et de sa connexion. On ne quitte pas un chantier tant que la borne ne charge pas." },
  { i: ClipboardCheck, img: "/review-particulier-3.webp", t: "Le compte-rendu", d: "Photos, check-list et rapport depuis ton téléphone. C’est ce qui débloque les aides du client, et ce qui prouve la qualité de ton travail." },
];

const JOURNEE = [
  { h: "8h", d: "Départ de Thonon avec le véhicule chargé." },
  { h: "Matin", d: "La pose et le raccordement." },
  { h: "12h-13h", d: "La pause." },
  { h: "Après-midi", d: "La mise en service, les tests et les photos." },
  { h: "17h", d: "Fin de journée : la borne charge." },
];

const FICHE = [
  { i: Wrench, t: "Le poste", s: "Poseur de bornes de recharge", d: "Pose, raccordement, mise en service et compte-rendu des bornes de recharge, chez des particuliers, en copropriété et en entreprise. Débutant accepté." },
  { i: User, t: "Le profil", s: "Ce qu’on attend", d: "CAP, Bac pro électricité ou équivalent. Permis B. De la rigueur, le soin des finitions, et une vraie politesse avec le client chez lui." },
  { i: ShieldCheck, t: "L’habilitation", s: "Électrique, NF C 18-510", d: "Une formation à l’habilitation électrique est un plus. L’habilitation elle-même, c’est nous qui la délivrons, après ta formation." },
  { i: Euro, t: "La rémunération", s: "Selon ton profil", d: "14 à 16 € brut de l’heure, plus 10 % de fin de mission et 10 % de congés payés versés par l’agence d’intérim." },
  { i: Clock, t: "Le contrat", s: "Pour démarrer", d: "Missions d’intérim planifiées à la semaine, de 8h à 12h et de 13h à 17h. Notre objectif : passer nos meilleurs poseurs en CDI dès que l’activité est stable." },
  { i: MapPin, t: "Le secteur", s: "Où tu travailles", d: "Chantiers dans le Chablais et en Haute-Savoie, au départ de Thonon-les-Bains." },
  { i: Award, t: "Ce qu’on t’apporte", s: "Pour progresser", d: "Véhicule, tenue et outillage fournis, une formation à notre méthode et aux bornes de recharge, un électricien expérimenté à tes côtés sur les premiers chantiers, et une évolution vers chef de chantier." },
];

const PARCOURS = [
  { t: "Découvrir", d: "Tu démarres en missions d’intérim planifiées à la semaine. On apprend à se connaître sur le terrain." },
  { t: "Apprendre", d: "Tu es formé à notre méthode et aux bornes de recharge, et tu gagnes en autonomie sur les poses." },
  { t: "T’installer", d: "Notre objectif : passer nos meilleurs poseurs en CDI dès que l’activité est stable." },
  { t: "Encadrer", d: "Tu deviens chef de chantier : tu gères l’équipe, les plannings et les commandes de matériel." },
];

export default function RecrutementPage() {
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const formRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pb-24 font-sans antialiased lg:pb-0" style={{ color: NAVY }}>
      <Navbar transparent showFloatingCta={showFloatingCta} onCtaClick={allerAuFormulaire} ctaText="Postuler" ctaIcon={ArrowRight} />

      <BarreMobile visible={showFloatingCta} label="On recrute" valeur="Poseur de bornes" bouton="Postuler" onClick={allerAuFormulaire} />

      <main>
        {/* 1. ACCROCHE */}
        <HautPhoto
          img="/tech-chargeo.webp"
          alt="Technicien CHARGéO qui câble une borne de recharge"
          pos="center 25%"
          eyebrow="On recrute · Poseur de bornes de recharge"
          eyeIcon={MapPin}
          titre={<>Électricien débutant ?<br className="hidden sm:block" /> Deviens poseur de bornes.</>}
          sous="Tu as un CAP ou un Bac pro électricité et envie d’apprendre un métier d’avenir ? On te forme à la pose de bornes de recharge, avec du matériel neuf et une méthode claire. Missions planifiées à la semaine, au départ de Thonon."
        >
          <div ref={heroRef} className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
            <button type="button" onClick={allerAuFormulaire} className="group inline-flex items-center gap-3 whitespace-nowrap rounded-full px-8 py-4 text-[17px] font-semibold text-white transition-transform hover:scale-[1.03]" style={{ backgroundColor: ORANGE, boxShadow: "0 8px 22px rgba(255,107,0,0.28)" }}>
              Postuler <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </button>
            <a href={BROCHURE_PDF} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[16px] font-medium text-white underline decoration-white/40 underline-offset-[6px] hover:decoration-white">
              <Download size={17} /> Télécharger la brochure (PDF)
            </a>
          </div>
        </HautPhoto>

        <BandeauChiffres chiffres={[
          { icon: Euro, big: "14 à 16 €", label: "brut de l’heure" },
          { icon: Award, big: "+ 20 %", label: "de primes intérim" },
          { icon: Truck, big: "Véhicule", label: "tenue et outillage fournis" },
          { icon: Clock, big: "8h · 17h", label: "horaires de journée" },
        ]} />

        {/* 2. CE QUE TU GAGNES */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:py-28">
            <Barre />
            <Reveal><Titre>Ce que tu gagnes.</Titre></Reveal>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {GAINS.map((g, i) => (
                <Reveal key={g.t} delay={i * 80} className="h-full">
                  <div className="flex h-full flex-col rounded-[24px] p-7" style={CARTE}>
                    <Icone I={g.i} size={52} r={14} s={24} />
                    <h3 className="mt-5 text-[19px] font-bold leading-snug">{g.t}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed">{g.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 3. QUI ON EST */}
        <section style={{ backgroundColor: GRIS }}>
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-24 lg:grid-cols-2 lg:py-28">
            <div>
              <Barre />
              <Lbl className="mt-8">Qui on est</Lbl>
              <Reveal><h2 className="mt-3 text-[34px] font-bold leading-[1.14] tracking-[-0.015em] sm:text-[48px]">Une jeune entreprise qui veut durer.</h2></Reveal>
              <Reveal delay={80}>
                <p className="mt-6 text-[18px] leading-relaxed">CHARGéO est une jeune entreprise de Thonon-les-Bains qui installe et entretient des bornes de recharge pour les maisons, les copropriétés et les entreprises du Chablais. On démarre, on veut durer, et on construit l’équipe dès maintenant. Ici, tu n’es pas un numéro : tu rejoins le projet au départ.</p>
              </Reveal>
            </div>
            <Reveal delay={100}>
              <div className="grid grid-cols-3 gap-4">
                {[{ i: Home, t: "Maisons" }, { i: Building, t: "Copropriétés" }, { i: Briefcase, t: "Entreprises" }].map((c) => (
                  <div key={c.t} className="flex flex-col items-center rounded-[24px] bg-white p-5 text-center sm:p-7" style={{ boxShadow: "0 8px 22px rgba(3,43,96,0.08)" }}>
                    <Icone I={c.i} />
                    <p className="mt-4 text-[15px] font-bold sm:text-[18px]">{c.t}</p>
                  </div>
                ))}
                <div className="col-span-3 flex items-center gap-4 rounded-[24px] p-6" style={{ backgroundColor: NAVY }}>
                  <MapPin size={26} color={CYAN_CLAIR} className="shrink-0" />
                  <p className="text-[16px] font-semibold text-white sm:text-[17px]">89 chemin de la Ballastière, Thonon-les-Bains</p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 4. TON MÉTIER */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:py-28">
            <Barre />
            <Reveal><Titre className="max-w-[24ch]">Poser, raccorder, mettre en service.</Titre></Reveal>
            <Reveal delay={80}><p className="mt-6 max-w-[48rem] text-[18px] leading-relaxed">La recharge électrique, c’est un vrai métier d’électricien : de la technique, du concret, et un résultat visible à la fin de chaque journée, une borne qui charge.</p></Reveal>
            <div className="mt-12 grid gap-7 lg:grid-cols-3">
              {METIER.map((m, i) => (
                <Reveal key={m.t} delay={i * 100} className="h-full">
                  <div className="relative flex h-full flex-col rounded-[24px]" style={CARTE}>
                    <div className="relative h-[220px] overflow-hidden rounded-t-[24px]">
                      <Image src={m.img} alt="" fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover" />
                    </div>
                    <div className="absolute left-7 top-[190px]" style={{ borderRadius: 16, boxShadow: "0 8px 22px rgba(3,43,96,0.20)" }}>
                      <Icone I={m.i} size={60} s={28} />
                    </div>
                    <div className="flex flex-1 flex-col px-7 pb-8 pt-12">
                      <h3 className="text-[26px] font-bold">{m.t}</h3>
                      <p className="mt-3 text-[16px] leading-relaxed">{m.d}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 5. TA JOURNÉE */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 pb-24 lg:pb-28">
            <Barre />
            <Reveal><Titre>Ta journée, en vrai.</Titre></Reveal>
            <div className="relative mt-14">
              <div className="absolute left-0 right-0 top-[27px] hidden h-[4px] rounded-full lg:block" style={{ backgroundColor: "#cdeef4" }} />
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                {JOURNEE.map((j, i) => (
                  <Reveal key={j.h} delay={i * 80}>
                    <div className="relative">
                      <div className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full text-white" style={{ backgroundColor: CYAN, boxShadow: "0 0 0 8px #fff" }}>
                        <Clock size={24} />
                      </div>
                      <div className="mt-6 rounded-[24px] p-6 lg:min-h-[150px]" style={CARTE}>
                        <p className="text-[24px] font-bold" style={{ color: CYAN }}>{j.h}</p>
                        <p className="mt-1 text-[16px] leading-relaxed">{j.d}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 6. LA FICHE DE POSTE */}
        <section style={{ backgroundColor: GRIS }}>
          <div className="mx-auto max-w-7xl px-6 py-24 lg:py-28">
            <Barre />
            <Reveal><Titre className="max-w-[24ch]">Poseur de bornes, le poste en clair.</Titre></Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {FICHE.map((f, k) => (
                <Reveal key={f.t} delay={(k % 2) * 80} className={`h-full ${k === FICHE.length - 1 ? "md:col-span-2" : ""}`}>
                  <div className="flex h-full gap-5 rounded-[24px] bg-white p-7" style={{ boxShadow: "0 8px 22px rgba(3,43,96,0.08)" }}>
                    <Icone I={f.i} size={52} r={14} s={24} />
                    <div>
                      <Lbl>{f.t}</Lbl>
                      <h3 className="mt-1 text-[20px] font-bold">{f.s}</h3>
                      <p className="mt-2 text-[16px] leading-relaxed">{f.d}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 7. TON PARCOURS */}
        <section style={{ backgroundColor: NAVY }}>
          <div className="mx-auto max-w-7xl px-6 py-24 lg:py-28">
            <Barre />
            <Reveal><Titre light>Ton parcours, étape par étape.</Titre></Reveal>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {PARCOURS.map((p, i) => (
                <Reveal key={p.t} delay={i * 100} className="h-full">
                  <div className="h-full rounded-[24px] p-7" style={{ backgroundColor: "rgba(255,255,255,0.08)", boxShadow: "inset 0 0 0 1.5px rgba(105,232,255,0.25)" }}>
                    <p className="text-[44px] font-bold leading-none" style={{ color: CYAN_CLAIR }}>{String(i + 1).padStart(2, "0")}</p>
                    <h3 className="mt-4 text-[22px] font-bold text-white">{p.t}</h3>
                    <p className="mt-2 text-[16px] leading-relaxed" style={{ color: BLEU_CLAIR }}>{p.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <p className="mt-10 max-w-[48rem] rounded-[18px] px-6 py-5 text-[17px] text-white" style={{ backgroundColor: CYAN }}>
              On démarre, et on cherche des gens qui ont envie de grandir avec l’entreprise. Ton évolution suit la sienne.
            </p>
          </div>
        </section>

        {/* 8. LE FORMULAIRE */}
        <section id="formulaire-candidature" ref={formRef} style={{ backgroundColor: GRIS }}>
          <div className="mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-5 lg:gap-16 lg:py-28">
            <div className="lg:col-span-2">
              <Barre />
              <Reveal><Titre>Envie de nous rejoindre ?</Titre></Reveal>
              <Reveal delay={80}><p className="mt-6 text-[18px] leading-relaxed">Deux minutes suffisent. Pas de CV ? Pas grave, on t’appelle.</p></Reveal>
              <div className="mt-10 space-y-7">
                {[
                  { icon: CheckCircle, label: "Promis", value: "On répond à toutes les candidatures", href: undefined, ext: false },
                  { icon: Phone, label: "Standard", value: "04 85 69 22 04", href: "tel:+33485692204", ext: false },
                  { icon: Download, label: "La brochure du poste", value: "Télécharger le PDF", href: BROCHURE_PDF, ext: true },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-5">
                    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] bg-white">
                      <c.icon size={22} color={CYAN} strokeWidth={1.8} />
                    </div>
                    <div>
                      <Lbl>{c.label}</Lbl>
                      {c.href ? (
                        <a href={c.href} {...(c.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="text-[18px] font-semibold hover:text-[#0097b2]">{c.value}</a>
                      ) : (
                        <p className="text-[18px] font-semibold">{c.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Reveal delay={150} className="lg:col-span-3">
              <div className="rounded-[24px] bg-white p-6 sm:p-10" style={{ boxShadow: "0 8px 22px rgba(3,43,96,0.10)" }}>
                <h3 className="text-[26px] font-bold">Ta candidature</h3>
                <p className="mb-8 mt-2 text-[16px]">Les champs marqués d’une étoile sont obligatoires.</p>
                <RecrutementForm />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
