"use client";

// Gabarit commun des pages d'offres (Particuliers, Copropriétés, Entreprises), charte 2026.
// Même ordre de sections partout : haut de page photo, bandeau turquoise, marques, solutions,
// étapes, méthode + cas types, simulateur, aides (navy), espace client, contact, FAQ.
// Les pages gardent leur logique (simulateur, barre mobile, CTA flottant, ContactForm).
// 07/10/2026 (mobile) : comme l'accueil, sous 1024 px la photo s'affiche nette en bandeau en haut,
// le haut de page est plus compact (filigrane et pastilles masqués, les pastilles reprenaient le
// bandeau turquoise) pour que le bandeau turquoise soit visible dès l'arrivée. Ordinateur inchangé.
import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Phone, MapPin, Mail, AlertTriangle, ClipboardList, LifeBuoy, FileSignature, User } from "lucide-react";
import { NAVY, CYAN, ORANGE, BLEU_CLAIR, GRIS, CARTE, Reveal, Barre, Lbl, Titre, Icone, Filigrane } from "@/components/charte/Charte";

export type Carte = { icon: LucideIcon; t: string; d: string };
export type Chiffre = { icon: LucideIcon; big: string; label: string };
export type Solution = { icon: LucideIcon; img: string; label: string; title: string; text: string; points?: string[]; cta: string };

const allerA = (id: string) => () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

export function HautOffre({
  img, alt, eyeIcon: Eye, eyebrow, titre1, titre2, texte, cta, lien, pills, ctaRef,
}: {
  img: string; alt: string; eyeIcon: LucideIcon; eyebrow: string; titre1: string; titre2: string; texte: string;
  cta: string; lien: string; pills: string[]; ctaRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: NAVY }}>
      <div className="relative h-[240px] w-full sm:h-[330px] lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[60%]">
        <Image src={img} alt={alt} fill priority fetchPriority="high" sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
        <div className="absolute inset-0 lg:hidden" style={{ backgroundImage: "linear-gradient(180deg, rgba(3,43,96,0.70) 0%, rgba(3,43,96,0.10) 38%, rgba(3,43,96,0.20) 62%, #032b60 100%)" }} />
        <div className="absolute inset-0 hidden lg:block" style={{ backgroundImage: "linear-gradient(90deg, #032b60 0%, rgba(3,43,96,0.88) 22%, rgba(3,43,96,0.35) 58%, rgba(3,43,96,0.05) 100%)" }} />
      </div>
      <div className="hidden lg:block">
        <Filigrane style={{ left: "56%", top: "-16%", width: "min(720px, 110vw)" }} />
      </div>
      <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-6 pb-9 pt-1 sm:pb-14 lg:min-h-[min(84vh,780px)] lg:pb-20 lg:pt-40">
        <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.12em] sm:text-[13px] sm:tracking-[0.2em]" style={{ color: BLEU_CLAIR }}>
          <Eye size={16} className="shrink-0" /> {eyebrow}
        </p>
        <h1 className="mt-3 text-[36px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:mt-6 sm:text-[64px] lg:text-[80px]">
          {titre1}<br className="hidden sm:block" /> {titre2}
        </h1>
        <p className="mt-4 max-w-[42rem] text-[16px] leading-relaxed sm:mt-8 sm:text-[20px]" style={{ color: BLEU_CLAIR }}>{texte}</p>
        <div ref={ctaRef} className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 sm:mt-10 sm:gap-y-5">
          <button type="button" onClick={allerA("simulateur")} className="group inline-flex items-center gap-3 whitespace-nowrap rounded-full px-7 py-4 text-[15px] font-semibold text-white transition-transform hover:scale-[1.03] sm:px-8 sm:text-[17px]" style={{ backgroundColor: ORANGE, boxShadow: "0 8px 22px rgba(255,107,0,0.28)" }}>
            {cta} <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </button>
          <button type="button" onClick={allerA("formulaire-devis")} className="inline-flex items-center gap-2 text-[16px] font-medium text-white underline decoration-white/40 underline-offset-[6px] hover:decoration-white">
            <Phone size={17} /> {lien}
          </button>
        </div>
        <ul className="mt-14 hidden flex-wrap gap-3 sm:flex">
          {pills.map((p) => (
            <li key={p} className="whitespace-nowrap rounded-full border px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white" style={{ borderColor: "rgba(0,151,178,0.75)" }}>{p}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function BandeauChiffres({ chiffres }: { chiffres: Chiffre[] }) {
  return (
    <section style={{ backgroundColor: CYAN }}>
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-6 px-6 py-7 sm:gap-y-8 sm:py-10 lg:grid-cols-4">
        {chiffres.map((c) => (
          <div key={c.big} className="flex items-center gap-4">
            <Icone I={c.icon} size={52} r={14} bg="rgba(255,255,255,0.16)" />
            <div>
              <p className="text-[19px] font-bold leading-tight text-white sm:text-[24px]">{c.big}</p>
              <p className="text-[14px] font-medium text-white/90 sm:text-[15px]">{c.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CartesSolutions({ titre, intro, solutions }: { titre: string; intro?: string; solutions: Solution[] }) {
  return (
    <section id="solutions" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:py-28">
        <Barre />
        <Reveal><Titre className="max-w-[24ch]">{titre}</Titre></Reveal>
        {intro && <Reveal delay={80}><p className="mt-6 max-w-[44rem] text-[18px] leading-relaxed">{intro}</p></Reveal>}
        <div className="mt-14 grid gap-7 lg:grid-cols-3">
          {solutions.map((o, i) => (
            <Reveal key={o.title} delay={i * 100} className="h-full">
              <div className="relative flex h-full flex-col rounded-[24px]" style={CARTE}>
                <div className="relative h-[230px] overflow-hidden rounded-t-[24px]">
                  <Image src={o.img} alt="" fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="absolute left-7 top-[200px]" style={{ borderRadius: 16, boxShadow: "0 8px 22px rgba(3,43,96,0.20)" }}>
                  <Icone I={o.icon} size={60} s={28} />
                </div>
                <div className="flex flex-1 flex-col px-7 pb-7 pt-12">
                  <Lbl>{o.label}</Lbl>
                  <h3 className="mt-2 text-[26px] font-bold leading-tight sm:text-[28px]">{o.title}</h3>
                  <p className="mt-3 text-[16px] leading-relaxed">{o.text}</p>
                  {o.points && (
                    <ul className="mt-4 space-y-2">
                      {o.points.map((p) => (
                        <li key={p} className="flex items-start gap-3 text-[15px] leading-snug">
                          <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CYAN }} /> {p}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex-1" />
                  <button type="button" onClick={allerA("formulaire-devis")} className="group mt-7 inline-flex w-full items-center justify-between rounded-full px-6 py-4 text-left text-[16px] font-semibold text-white transition-colors duration-300 hover:bg-[#032b60] sm:text-[17px]" style={{ backgroundColor: CYAN }}>
                    {o.cta} <ArrowRight size={20} className="shrink-0 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Etapes({ titre = "Comment ça se passe.", etapes }: { titre?: string; etapes: { t: string; d: string }[] }) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-6 pb-24 lg:pb-28">
        <Barre />
        <Reveal><Titre>{titre}</Titre></Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {etapes.map((e, i) => (
            <Reveal key={e.t} delay={i * 80} className="h-full">
              <div className="h-full rounded-[24px] p-7" style={CARTE}>
                <p className="text-[44px] font-bold leading-none" style={{ color: CYAN }}>{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-4 text-[22px] font-bold">{e.t}</h3>
                <p className="mt-2 text-[16px] leading-relaxed">{e.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MethodeCas({ titre, texte, lignes, children }: { titre: string; texte: string; lignes: Carte[]; children: React.ReactNode }) {
  return (
    <section id="concept" style={{ backgroundColor: GRIS }}>
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-24 lg:grid-cols-2 lg:gap-20 lg:py-28">
        <div>
          <Barre />
          <Reveal><Titre>{titre}</Titre></Reveal>
          <Reveal delay={80}><p className="mt-6 text-[18px] leading-relaxed">{texte}</p></Reveal>
          <div className="mt-9 space-y-4">
            {lignes.map((c, i) => (
              <Reveal key={c.t} delay={120 + i * 80}>
                <div className="flex items-center gap-5 rounded-[20px] bg-white p-5" style={{ boxShadow: "0 8px 22px rgba(3,43,96,0.08)" }}>
                  <Icone I={c.icon} size={52} r={14} s={24} />
                  <div>
                    <p className="text-[18px] font-bold">{c.t}</p>
                    <p className="text-[15px] leading-relaxed">{c.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <Reveal delay={100}>{children}</Reveal>
      </div>
    </section>
  );
}

export function BlocAides({ titre, texte, cartes }: { titre: string; texte?: string; cartes: Carte[] }) {
  return (
    <section id="aides" style={{ backgroundColor: NAVY }}>
      <div className="mx-auto max-w-7xl px-6 py-24 lg:py-28">
        <Barre />
        <Reveal><Titre light className="max-w-[22ch]">{titre}</Titre></Reveal>
        {texte && <Reveal delay={80}><p className="mt-6 max-w-[42rem] text-[18px] leading-relaxed" style={{ color: BLEU_CLAIR }}>{texte}</p></Reveal>}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {cartes.map((c, i) => (
            <Reveal key={c.t} delay={i * 100} className="h-full">
              <div className="h-full rounded-[24px] p-8" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                <Icone I={c.icon} />
                <h3 className="mt-6 text-[22px] font-bold text-white">{c.t}</h3>
                <p className="mt-3 text-[16px] leading-relaxed" style={{ color: BLEU_CLAIR }}>{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const PORTAIL = [
  { icon: ClipboardList, t: "Suivi du chantier" },
  { icon: FileSignature, t: "Devis à signer" },
  { icon: LifeBuoy, t: "Tickets SAV" },
];

export function PortailCourt() {
  return (
    <section className="bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-20 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Barre />
          <Lbl className="mt-8">Votre espace client CHARGéO</Lbl>
          <h2 className="mt-3 text-[32px] font-bold leading-[1.14] sm:text-[40px]">Suivez tout, en ligne.</h2>
          <p className="mt-4 max-w-[34rem] text-[18px] leading-relaxed">Chantier, devis, tickets SAV : votre espace personnel, inclus sans frais et accessible 24/7.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 lg:max-w-[560px] lg:justify-end">
          {PORTAIL.map((p) => (
            <span key={p.t} className="inline-flex items-center gap-3 rounded-full px-5 py-3 text-[15px] font-semibold" style={{ backgroundColor: GRIS }}>
              <p.icon size={18} color={CYAN} /> {p.t}
            </span>
          ))}
          <Link href="/espace-client" className="inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-[#032b60]" style={{ backgroundColor: CYAN }}>
            <User size={18} /> Accéder à mon espace
          </Link>
        </div>
      </div>
    </section>
  );
}

export function BlocContact({
  titre, texte, alerte, jointe, sectionRef, children,
}: {
  titre: string; texte: string; alerte: [string, string]; jointe: string;
  sectionRef?: React.Ref<HTMLElement>; children: React.ReactNode;
}) {
  return (
    <section id="formulaire-devis" ref={sectionRef} style={{ backgroundColor: GRIS }}>
      <div className="mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-5 lg:gap-16 lg:py-28">
        <div className="lg:col-span-2">
          <Barre />
          <Reveal><Titre>{titre}</Titre></Reveal>
          <Reveal delay={80}><p className="mt-6 text-[18px] leading-relaxed">{texte}</p></Reveal>
          <div className="mt-6 flex items-start gap-3 rounded-[16px] bg-white p-4" style={{ boxShadow: `inset 4px 0 0 ${ORANGE}` }}>
            <AlertTriangle size={20} color={ORANGE} className="mt-0.5 shrink-0" />
            <p className="text-[15px]">{alerte[0]} <strong>{alerte[1]}</strong></p>
          </div>
          <div className="mt-10 space-y-7">
            {[
              { icon: MapPin, label: "Zone d’intervention", value: "Chablais et Haute-Savoie", href: undefined },
              { icon: Phone, label: "Standard", value: "04 85 69 22 04", href: "tel:+33485692204" },
              { icon: Mail, label: "Email", value: "contact@chargeo.fr", href: "mailto:contact@chargeo.fr" },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-5">
                <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] bg-white">
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
          <div className="rounded-[24px] bg-white p-6 sm:p-10" style={{ boxShadow: "0 8px 22px rgba(3,43,96,0.10)" }}>
            <h3 className="text-[26px] font-bold">Parlez-nous de votre projet</h3>
            <p className="mb-8 mt-2 text-[16px]">{jointe}</p>
            {children}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function BlocFaq({ children }: { children: React.ReactNode }) {
  return (
    <section id="faq" className="bg-white">
      <div className="mx-auto max-w-4xl px-6 py-24 lg:py-28">
        <Barre />
        <Reveal><Titre>Questions fréquentes.</Titre></Reveal>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

// Barre collante en bas d'écran sur mobile : estimation du simulateur + bouton vers le formulaire.
export function BarreMobile({ visible, label, valeur, bouton, onClick }: { visible: boolean; label: string; valeur: string; bouton: string; onClick: () => void }) {
  return (
    <div className={`fixed bottom-0 left-0 z-60 w-full bg-white p-4 shadow-[0_-10px_40px_rgba(3,43,96,0.12)] transition-transform duration-500 lg:hidden ${visible ? "translate-y-0" : "translate-y-full"}`}>
      <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
        <div className="min-w-0">
          <Lbl className="text-[11px]!">{label}</Lbl>
          <p className="truncate text-[20px] font-bold sm:text-[22px]" style={{ color: NAVY }}>{valeur}</p>
        </div>
        <button type="button" onClick={onClick} className="inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold text-white active:scale-95" style={{ backgroundColor: ORANGE, boxShadow: "0 6px 16px rgba(255,107,0,0.3)" }}>
          {bouton} <Phone size={16} />
        </button>
      </div>
    </div>
  );
}
