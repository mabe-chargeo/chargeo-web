// Haut de page commun (charte 2026) : fond navy, photo à droite en dégradé, filigrane é.
// Utilisable depuis une page serveur (Guides, articles) comme depuis une page client.
// 07/10/2026 (mobile) : sous 1024 px, la photo s'affiche nette en bandeau en haut (dégradé vers le navy),
// le filigrane est masqué et le haut de page est plus compact (hauteur minimale réservée à l'ordinateur).
// 08/10/2026 (ordinateur) : le filigrane passe sur la partie navy, derrière le texte, pour ne plus couvrir la photo.
import React from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Filigrane } from "@/components/charte/Charte";

// Couleurs recopiées ici (et non importées de Charte.tsx, module client) pour rester utilisable côté serveur.
const NAVY = "#032b60";
const BLEU_CLAIR = "#a9d8e6";

export function HautPhoto({
  img, alt = "", pos = "center", eyebrow, eyeIcon: Eye, titre, sous, minH = "min(84vh,780px)", titreClass = "sm:text-[60px] lg:text-[72px]", children,
}: {
  img: string; alt?: string; pos?: string; eyebrow: string; eyeIcon?: LucideIcon; titre: React.ReactNode; sous?: string;
  minH?: string; titreClass?: string; children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: NAVY }}>
      <div className="relative h-[240px] w-full sm:h-[330px] lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[60%]">
        <Image src={img} alt={alt} fill priority fetchPriority="high" sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" style={{ objectPosition: pos }} />
        <div className="absolute inset-0 lg:hidden" style={{ backgroundImage: "linear-gradient(180deg, rgba(3,43,96,0.70) 0%, rgba(3,43,96,0.10) 38%, rgba(3,43,96,0.20) 62%, #032b60 100%)" }} />
        <div className="absolute inset-0 hidden lg:block" style={{ backgroundImage: "linear-gradient(90deg, #032b60 0%, rgba(3,43,96,0.88) 22%, rgba(3,43,96,0.35) 58%, rgba(3,43,96,0.05) 100%)" }} />
      </div>
      <div className="hidden lg:block">
        <Filigrane style={{ left: "-12%", top: "-18%", width: "min(680px, 55vw)" }} />
      </div>
      <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-6 pb-10 pt-1 sm:pb-14 lg:min-h-[var(--haut-min)] lg:pb-20 lg:pt-40" style={{ "--haut-min": minH } as React.CSSProperties}>
        <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.12em] sm:text-[13px] sm:tracking-[0.2em]" style={{ color: BLEU_CLAIR }}>
          {Eye && <Eye size={16} className="shrink-0" />} {eyebrow}
        </p>
        <h1 className={`mt-3 max-w-[52rem] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-white sm:mt-6 ${titreClass}`}>{titre}</h1>
        {sous && <p className="mt-4 max-w-[42rem] text-[16px] leading-relaxed sm:mt-8 sm:text-[20px]" style={{ color: BLEU_CLAIR }}>{sous}</p>}
        {children}
      </div>
    </section>
  );
}
