"use client";

// Accueil, charte 2026 (maquette v3 validée par Matthieu le 05/10/2026).
// 06/10/2026 : un seul délai de rappel partout (24 h ouvrées) et adresse
// canonique de la page (balise hissée dans le <head> par React 19).
// 07/10/2026 (SEO) : le titre principal (h1) est la ligne du haut, qui dit ce
// qu'on fait et où ; le slogan garde exactement le même rendu, en paragraphe.
// 07/10/2026 : bloc « Notre ADN » réécrit en mots simples, à la demande de Matthieu.
// 07/10/2026 (images) : les cartes d'offres n'utilisent plus les photos du haut des pages offres.
import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, Briefcase, Building, Home, ShieldCheck, Cpu, Wifi, CheckCircle,
  MapPin, Phone, Mail, User, ClipboardList, LifeBuoy, Zap, Clock, BadgeEuro, FileCheck, AlertTriangle,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { TrustedBrands } from "@/components/layout/TrustedBrands";
import { ContactForm } from "@/components/ui/ContactForm";
import { NAVY, CYAN, ORANGE, LABEL, BLEU_CLAIR, CARTE, Reveal, Barre, Lbl, Titre, Icone, Filigrane } from "@/components/charte/Charte";

const CHIFFRES = [
  { icon: Clock, big: "24 h", label: "ouvrées pour vous rappeler" },
  { icon: BadgeEuro, big: "Prix ferme", label: "annoncé au devis" },
  { icon: FileCheck, big: "Primes", label: "et démarches gérées" },
  { icon: ShieldCheck, big: "Qualifié IRVE", label: "habilitation maximale" },
];

const OFFRES = [
  {
    icon: Home, img: "/photo-maison-carport.webp", href: "/particuliers", label: "Maison et droit à la prise", title: "Particuliers",
    text: "Maison individuelle à prix ferme, droit à la prise en appartement, ou borne sur l’infrastructure de votre copropriété : on s’occupe de tout.",
    cta: "Votre devis particulier",
  },
  {
    icon: Building, img: "/photo-parking-souterrain.webp", href: "/copropriete", label: "Syndics et conseils syndicaux", title: "Copropriétés",
    text: "Ne louez pas votre parking à un opérateur. Infrastructure collective ou borne partagée : la copropriété reste propriétaire, sans contrat à vie.",
    cta: "Découvrir l’offre copro",
  },
  {
    icon: Briefcase, img: "/photo-parking-entreprise.webp", href: "/pro", label: "Flottes, tertiaire, salariés", title: "Entreprises",
    text: "Électrifiez votre flotte en respectant la loi LOM, maîtrisez votre puissance avec le Smart Charging et automatisez vos refacturations.",
    cta: "Voir les offres pro",
  },
];

const PORTAIL = [
  { icon: ClipboardList, label: "Commandes et chantiers", title: "Suivi en temps réel", text: "Chaque étape de votre dossier, du devis signé à la mise en service." },
  { icon: LifeBuoy, label: "Support", title: "Tickets SAV en ligne", text: "Une demande, un suivi, une réponse : sans attendre au téléphone." },
  { icon: Zap, label: "Vos devis", title: "Consulter et signer", text: "Vos devis en ligne, à consulter et signer quand vous le souhaitez." },
];

const ENGAGEMENTS = [
  { icon: Wifi, title: "Supervision en temps réel", text: "Nous surveillons votre borne à distance et réglons les anomalies avant que vous ne les remarquiez." },
  { icon: ShieldCheck, title: "Un SAV qui répond", text: "Vous parlez aux techniciens qui ont posé votre matériel. Pas de centre d’appel à l’étranger." },
  { icon: CheckCircle, title: "Intervention locale", text: "Ancrés en Haute-Savoie : rappel sous 24 h ouvrées et intervention rapide de nos techniciens." },
];

export default function Accueil() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans antialiased" style={{ color: NAVY }}>
      <link rel="canonical" href="https://www.chargeo.fr/" />
      <Navbar isHome transparent />
      <main>
        {/* HAUT DE PAGE */}
        <section className="relative overflow-hidden" style={{ backgroundColor: NAVY }}>
          <div className="absolute inset-y-0 right-0 w-full lg:w-[60%]">
            <Image src="/hero-chargeo.webp" alt="Borne de recharge installée par CHARGéO" fill priority fetchPriority="high" sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
            <div className="absolute inset-0 lg:hidden" style={{ backgroundColor: "rgba(3,43,96,0.82)" }} />
            <div className="absolute inset-0 hidden lg:block" style={{ backgroundImage: "linear-gradient(90deg, #032b60 0%, rgba(3,43,96,0.88) 22%, rgba(3,43,96,0.35) 58%, rgba(3,43,96,0.05) 100%)" }} />
          </div>
          <Filigrane style={{ left: "56%", top: "-16%", width: "min(720px, 110vw)" }} />
          <div className="relative mx-auto flex min-h-[min(88vh,820px)] max-w-7xl flex-col justify-center px-6 pb-20 pt-36 lg:pt-40">
            <h1 className="text-[13px] font-extrabold uppercase tracking-[0.12em] sm:tracking-[0.2em]" style={{ color: BLEU_CLAIR }}>Installateur de bornes de recharge à Thonon-les-Bains et dans le Chablais</h1>
            <p className="mt-6 text-[44px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[64px] lg:text-[80px]">
              Passez à l’électrique,<br className="hidden sm:block" /> l’esprit léger.
            </p>
            <p className="mt-8 max-w-[44rem] text-[18px] leading-relaxed sm:text-[20px]" style={{ color: BLEU_CLAIR }}>
              Particulier pressé, entreprise soumise à la loi LOM ou syndic de copropriété : nous prenons en charge l’installation, les démarches et les subventions.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
              <a href="#expertises" className="group inline-flex items-center gap-3 whitespace-nowrap rounded-full px-7 py-4 text-[15px] font-semibold text-white transition-transform hover:scale-[1.03] sm:px-8 sm:text-[17px]" style={{ backgroundColor: ORANGE, boxShadow: "0 8px 22px rgba(255,107,0,0.28)" }}>
                Découvrir nos points de charge <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </a>
              <a href="tel:+33485692204" className="inline-flex items-center gap-2 text-[16px] font-medium text-white underline decoration-white/40 underline-offset-[6px] hover:decoration-white">
                <Phone size={17} /> 04 85 69 22 04
              </a>
            </div>
            <ul className="mt-14 flex flex-wrap gap-3">
              {["Installateur qualifié IRVE", "Prix ferme", "Chablais et Haute-Savoie"].map((p) => (
                <li key={p} className="whitespace-nowrap rounded-full border px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white" style={{ borderColor: "rgba(0,151,178,0.75)" }}>{p}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* BANDEAU TURQUOISE */}
        <section style={{ backgroundColor: CYAN }}>
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-6 py-10 lg:grid-cols-4">
            {CHIFFRES.map((c) => (
              <div key={c.big} className="flex items-center gap-4">
                <Icone I={c.icon} size={52} r={14} bg="rgba(255,255,255,0.16)" />
                <div>
                  <p className="text-[20px] font-bold leading-tight text-white sm:text-[26px]">{c.big}</p>
                  <p className="text-[14px] font-medium text-white/90 sm:text-[15px]">{c.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <TrustedBrands />

        {/* NOTRE ADN */}
        <section id="groupe" className="bg-white">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
            <div>
              <Barre />
              <Reveal><Titre>Bien plus qu’une prise au mur.</Titre></Reveal>
              <Reveal delay={100}>
                <p className="mt-7 text-[18px] leading-relaxed">Poser une prise, beaucoup d’électriciens savent le faire. Installer une borne qui recharge votre voiture au bon moment, sans faire disjoncter la maison, et qui pourra évoluer avec vos besoins, c’est un autre métier.</p>
                <p className="mt-4 text-[18px] leading-relaxed">C’est le nôtre. Nos techniciens qualifiés IRVE installent des bornes de grandes marques, connectées et pilotables depuis votre téléphone : vous suivez votre consommation et vous programmez la recharge aux heures creuses.</p>
              </Reveal>
              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                {[
                  { icon: ShieldCheck, label: "Habilitation maximale", title: "Qualifelec IRVE" },
                  { icon: Cpu, label: "Borne pilotée à distance", title: "Smart Charging" },
                ].map((c, i) => (
                  <Reveal key={c.title} delay={150 + i * 80} className="h-full">
                    <div className="h-full rounded-[24px] p-7" style={CARTE}>
                      <Icone I={c.icon} s={28} />
                      <Lbl className="mt-5">{c.label}</Lbl>
                      <p className="mt-1 text-[22px] font-bold">{c.title}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
            <Reveal delay={100}>
              <div className="relative h-[420px] overflow-hidden rounded-[24px] sm:h-[560px]" style={{ boxShadow: "0 8px 22px rgba(3,43,96,0.14)" }}>
                <Image src="/tech-chargeo.webp" alt="Technicien CHARGéO qui câble une borne" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* NOS OFFRES */}
        <section id="expertises" className="bg-white">
          <div className="mx-auto max-w-7xl px-6 pb-24 pt-4 lg:pb-32">
            <Barre />
            <Reveal><Titre className="max-w-[22ch]">Une installation à votre mesure, du garage au parking de flotte.</Titre></Reveal>
            <div className="mt-14 grid gap-7 lg:grid-cols-3">
              {OFFRES.map((o, i) => (
                <Reveal key={o.title} delay={i * 100} className="h-full">
                  <Link href={o.href} className="group relative flex h-full flex-col rounded-[24px] transition-all duration-500 hover:-translate-y-1.5" style={CARTE}>
                    <div className="pointer-events-none absolute inset-0 z-10 rounded-[24px] opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ boxShadow: `inset 0 0 0 2.5px ${CYAN}` }} />
                    <div className="relative h-[230px] overflow-hidden rounded-t-[24px]">
                      <Image src={o.img} alt="" fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                    </div>
                    <div className="absolute left-7 top-[200px]" style={{ borderRadius: 16, boxShadow: "0 8px 22px rgba(3,43,96,0.20)" }}>
                      <Icone I={o.icon} size={60} s={28} />
                    </div>
                    <div className="flex flex-1 flex-col px-7 pb-7 pt-12">
                      <Lbl>{o.label}</Lbl>
                      <h3 className="mt-2 text-[28px] font-bold">{o.title}</h3>
                      <p className="mt-3 flex-1 text-[16px] leading-relaxed">{o.text}</p>
                      <span className="mt-7 inline-flex w-full items-center justify-between rounded-full px-6 py-4 text-[17px] font-semibold text-white transition-colors duration-300 group-hover:bg-[#032b60]" style={{ backgroundColor: CYAN }}>
                        {o.cta} <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* PORTAIL CLIENT */}
        <section id="portail" className="bg-white">
          <div className="mx-auto max-w-7xl px-6 pb-24 lg:pb-32">
            <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
              <div>
                <Barre />
                <Lbl className="mt-8">Votre espace client CHARGéO</Lbl>
                <h2 className="mt-4 text-[34px] font-bold leading-[1.14] tracking-[-0.015em] sm:text-[48px]">Suivez tout, en ligne.</h2>
                <p className="mt-6 max-w-[34rem] text-[18px] leading-relaxed">Un espace personnel, inclus sans frais, pour garder la main sur votre projet, du devis à l’exploitation.</p>
                <div className="mt-9 flex flex-wrap items-center gap-5">
                  <Link href="/espace-client" className="inline-flex items-center gap-3 rounded-full px-8 py-4 text-[17px] font-semibold text-white transition-colors hover:bg-[#032b60]" style={{ backgroundColor: CYAN }}>
                    <User size={20} /> Accéder à mon espace
                  </Link>
                  <span className="text-[15px] font-medium">Inclus · Accessible 24/7</span>
                </div>
              </div>
              <Reveal delay={100}>
                <div className="rounded-[28px] p-5 sm:p-7" style={{ backgroundColor: NAVY, boxShadow: "0 24px 60px rgba(3,43,96,0.28)" }}>
                  <div className="flex items-center justify-between">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo-chargeo-slogan-blanc.svg" alt="" className="h-9 w-auto" />
                    <span className="rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-[0.1em] text-white" style={{ backgroundColor: "rgba(0,151,178,0.35)" }}>Mon espace</span>
                  </div>
                  <div className="mt-6 rounded-[18px] bg-white p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[15px] font-bold">Exemple · Résidence Les Tilleuls</p>
                      <span className="whitespace-nowrap pl-3 text-[13px] font-bold" style={{ color: LABEL }}>Étape 3 / 4</span>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full" style={{ backgroundColor: "#eceef1" }}>
                      <div className="h-full w-3/4 rounded-full" style={{ backgroundColor: CYAN }} />
                    </div>
                    <p className="mt-2 text-[14px]">Pose des bornes en cours</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-[18px] bg-white p-5">
                      <Lbl>Devis</Lbl>
                      <p className="mt-1 text-[28px] font-bold">Signé</p>
                      <p className="text-[14px]">en ligne</p>
                    </div>
                    <div className="rounded-[18px] bg-white p-5">
                      <Lbl>SAV</Lbl>
                      <p className="mt-1 text-[28px] font-bold">0</p>
                      <p className="text-[14px]">ticket ouvert</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {PORTAIL.map((p, i) => (
                <Reveal key={p.title} delay={i * 80} className="h-full">
                  <div className="h-full rounded-[24px] p-7" style={CARTE}>
                    <Icone I={p.icon} />
                    <Lbl className="mt-5">{p.label}</Lbl>
                    <h3 className="mt-1 text-[22px] font-bold">{p.title}</h3>
                    <p className="mt-2 text-[16px] leading-relaxed">{p.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* SÉRÉNITÉ & SAV */}
        <section id="engagements" style={{ backgroundColor: NAVY }}>
          <div className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
            <Barre />
            <Reveal><Titre light className="max-w-[20ch]">Oubliez l’angoisse de la panne, on gère la technique.</Titre></Reveal>
            <Reveal delay={100}>
              <p className="mt-6 max-w-[40rem] text-[18px] leading-relaxed" style={{ color: BLEU_CLAIR }}>L’installation n’est que le début : que ce soit pour votre départ du matin ou la disponibilité de votre flotte, nous prenons en charge toute la responsabilité technique.</p>
            </Reveal>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {ENGAGEMENTS.map((e, i) => (
                <Reveal key={e.title} delay={i * 100} className="h-full">
                  <div className="h-full rounded-[24px] p-8" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                    <Icone I={e.icon} />
                    <h3 className="mt-6 text-[22px] font-bold text-white">{e.title}</h3>
                    <p className="mt-3 text-[16px] leading-relaxed" style={{ color: BLEU_CLAIR }}>{e.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-5 lg:gap-16 lg:py-32">
            <div className="lg:col-span-2">
              <Barre />
              <Reveal><Titre>Lançons l’étude de votre projet.</Titre></Reveal>
              <Reveal delay={100}>
                <p className="mt-6 text-[18px] leading-relaxed">Particuliers, copropriétés ou entreprises : nos techniciens qualifiés IRVE vous accompagnent de A à Z dans votre transition électrique.</p>
              </Reveal>
              <div className="mt-6 flex items-start gap-3 rounded-[16px] p-4" style={{ backgroundColor: "#fff4ec", boxShadow: `inset 4px 0 0 ${ORANGE}` }}>
                <AlertTriangle size={20} color={ORANGE} className="mt-0.5 shrink-0" />
                <p className="text-[15px]">Nos plannings d’intervention se remplissent vite. <strong>Contactez-nous aujourd’hui pour bloquer votre étude gratuite.</strong></p>
              </div>
              <div className="mt-10 space-y-7">
                {[
                  { icon: MapPin, label: "Zone d’intervention", value: "Chablais et Haute-Savoie", href: undefined },
                  { icon: Phone, label: "Standard", value: "04 85 69 22 04", href: "tel:+33485692204" },
                  { icon: Mail, label: "Email", value: "contact@chargeo.fr", href: "mailto:contact@chargeo.fr" },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-5">
                    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: "#eceef1" }}>
                      <c.icon size={22} color={CYAN} strokeWidth={1.8} />
                    </div>
                    <div>
                      <Lbl>{c.label}</Lbl>
                      {c.href ? (
                        <a href={c.href} className="text-[18px] font-semibold hover:text-[#0097b2]">{c.value}</a>
                      ) : (
                        <p className="text-[18px] font-semibold">{c.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Reveal delay={150} className="lg:col-span-3">
              <div className="rounded-[24px] p-6 sm:p-10" style={CARTE}>
                <h3 className="text-[26px] font-bold">Parlez-nous de votre projet</h3>
                <p className="mb-8 mt-2 text-[16px]">Remplissez ce formulaire, notre équipe vous rappelle sous 24 h ouvrées.</p>
                <ContactForm typeClient="Non précisé (Accueil)" simulation="Aucune simulation (depuis l'accueil)" />
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
