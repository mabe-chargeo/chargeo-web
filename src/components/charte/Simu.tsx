"use client";

// Briques communes des simulateurs, charte 2026 : curseurs sur carte grise, résultat sur carte navy.
import React from "react";
import { Settings, ChevronDown } from "lucide-react";
import { NAVY, CYAN, LABEL } from "@/components/charte/Charte";

export function Curseur({
  label, aide, valeur, unite, min, max, step = 1, value, onChange, gauche, droite, aria,
}: {
  label: string; aide?: string; valeur: string; unite?: string; min: number; max: number; step?: number;
  value: number; onChange: (v: number) => void; gauche?: string; droite?: string; aria: string;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: LABEL }}>{label}</p>
          {aide && <p className="mt-1 text-[14px]" style={{ color: NAVY }}>{aide}</p>}
        </div>
        <p className="shrink-0 whitespace-nowrap text-[24px] font-bold leading-none" style={{ color: NAVY }}>
          {valeur}{unite && <span className="ml-1 text-[15px] font-semibold">{unite}</span>}
        </p>
      </div>
      <input
        type="range"
        aria-label={aria}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-4 h-2.5 w-full cursor-pointer appearance-none rounded-full bg-white accent-[#0097b2]"
      />
      {(gauche || droite) && (
        <div className="mt-2 flex justify-between text-[13px] font-medium" style={{ color: NAVY, opacity: 0.7 }}>
          <span>{gauche}</span><span>{droite}</span>
        </div>
      )}
    </div>
  );
}

export function Reglages({ ouvert, onToggle, libelle, children }: { ouvert: boolean; onToggle: () => void; libelle: string; children: React.ReactNode }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={ouvert ? "true" : "false"}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold transition-shadow hover:shadow-md"
        style={{ color: NAVY }}
      >
        <Settings size={18} color={CYAN} className={`transition-transform duration-700 ${ouvert ? "rotate-90" : ""}`} />
        {ouvert ? "Masquer les réglages avancés" : libelle}
        <ChevronDown size={18} color={CYAN} className={`transition-transform duration-300 ${ouvert ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-500 ${ouvert ? "mt-6 max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="space-y-7 rounded-[20px] p-6" style={{ backgroundColor: "rgba(255,255,255,0.6)" }}>{children}</div>
      </div>
    </div>
  );
}

export function EnteteSimu({ titre, texte }: { titre: string; texte: string }) {
  return (
    <>
      <span className="block h-[10px] w-[120px] rounded-[5px]" style={{ backgroundColor: CYAN }} />
      <h2 className="mt-8 text-[34px] font-bold leading-[1.14] tracking-[-0.015em] sm:text-[48px]" style={{ color: NAVY }}>{titre}</h2>
      <p className="mt-6 max-w-[44rem] text-[18px] leading-relaxed" style={{ color: NAVY }}>{texte}</p>
    </>
  );
}
