// Haut de page commun (charte 2026) : fond navy, photo à droite en dégradé, filigrane é.
// Utilisable depuis une page serveur (Guides, articles) comme depuis une page client.
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
      <div className="absolute inset-y-0 right-0 w-full lg:w-[60%]">
        <Image src={img} alt={alt} fill priority fetchPriority="high" sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" style={{ objectPosition: pos }} />
        <div className="absolute inset-0 lg:hidden" style={{ backgroundColor: "rgba(3,43,96,0.82)" }} />
        <div className="absolute inset-0 hidden lg:block" style={{ backgroundImage: "linear-gradient(90deg, #032b60 0%, rgba(3,43,96,0.88) 22%, rgba(3,43,96,0.35) 58%, rgba(3,43,96,0.05) 100%)" }} />
      </div>
      <Filigrane style={{ left: "56%", top: "-16%", width: "min(720px, 110vw)" }} />
      <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-6 pb-20 pt-36 lg:pt-40" style={{ minHeight: minH }}>
        <p className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.12em] sm:tracking-[0.2em]" style={{ color: BLEU_CLAIR }}>
          {Eye && <Eye size={16} className="shrink-0" />} {eyebrow}
        </p>
        <h1 className={`mt-6 max-w-[52rem] text-[38px] font-bold leading-[1.1] tracking-[-0.02em] text-white ${titreClass}`}>{titre}</h1>
        {sous && <p className="mt-8 max-w-[42rem] text-[18px] leading-relaxed sm:text-[20px]" style={{ color: BLEU_CLAIR }}>{sous}</p>}
        {children}
      </div>
    </section>
  );
}
