"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Menu, Phone, X, LucideIcon } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

interface NavbarProps {
  isHome?: boolean;
  showFloatingCta?: boolean;
  onCtaClick?: () => void;
  ctaText?: string; // Paramètre pour le texte du bouton
  ctaIcon?: LucideIcon; // Paramètre pour l'icône du bouton
}

export function Navbar({ 
  isHome = false, 
  showFloatingCta = false, 
  onCtaClick, 
  ctaText = "Contact", 
  ctaIcon: CtaIcon = Phone 
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white/85 backdrop-blur-md shadow-sm py-3 md:py-4 border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center gap-2">
        
        <div className="shrink-0 relative z-50">
          <Logo light={false} className="scale-75 sm:scale-100 origin-left -ml-2 sm:ml-0" />
        </div>

        {/* SI ACCUEIL : Menu Central | SI PAGE : Bouton Retour */}
        {isHome ? (
          <div className="hidden md:flex items-center p-1.5 rounded-full border bg-white/50 border-slate-200 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]">
            <a href="#groupe" className="px-6 py-2 rounded-full text-sm font-bold transition-all text-slate-600 hover:text-[#032b60] hover:bg-white">Le Groupe Tech</a>
            <a href="#expertises" className="px-6 py-2 rounded-full text-sm font-bold transition-all text-slate-600 hover:text-[#032b60] hover:bg-white">Points de charge</a>
            <a href="#engagements" className="px-6 py-2 rounded-full text-sm font-bold transition-all text-slate-600 hover:text-[#032b60] hover:bg-white">Garanties MCO</a>
          </div>
        ) : (
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-[#032b60] font-bold text-sm bg-white hover:bg-slate-100 px-4 py-2 sm:py-2.5 rounded-full border border-slate-200 transition-all shadow-sm">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Retour à l'accueil</span>
            <span className="sm:hidden">Retour</span>
          </Link>
        )}

        {/* BOUTON D'ACTION (CTA) */}
        <div className="flex items-center gap-2 relative z-50">
          {isHome ? (
            <a href="#contact" className="relative overflow-hidden px-5 sm:px-6 py-2 sm:py-2.5 rounded-full font-black text-xs sm:text-sm flex items-center gap-2 transition-all group bg-[#032b60] text-white hover:bg-[#0097b2]">
              <div className="animate-button-shine" />
              Contact <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform hidden sm:block text-cyan-400" />
            </a>
          ) : (
            <div className={`hidden lg:flex shrink-0 transition-all duration-500 ${showFloatingCta ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
              <button onClick={onCtaClick} className="relative overflow-hidden bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 py-2.5 rounded-full font-black text-sm flex items-center gap-2 transition-all shadow-[0_4px_14px_rgba(255,107,0,0.3)]">
                <div className="animate-button-shine" />
                {ctaText} <CtaIcon size={16} className="group-hover:rotate-12 transition-transform" />
              </button>
            </div>
          )}
          
          {isHome && (
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-[#032b60]">
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* MENU MOBILE (ACCUEIL SEULEMENT) */}
      {isHome && (
        <div className={`md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-xl overflow-hidden transition-all duration-300 ${isMobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-6 py-4 flex flex-col gap-4">
            <a onClick={() => setIsMobileMenuOpen(false)} href="#groupe" className="text-base font-bold text-[#032b60] py-2 border-b border-slate-100 flex justify-between items-center">Le Groupe Tech <ChevronRight size={16}/></a>
            <a onClick={() => setIsMobileMenuOpen(false)} href="#expertises" className="text-base font-bold text-[#032b60] py-2 border-b border-slate-100 flex justify-between items-center">Points de charge <ChevronRight size={16}/></a>
            <a onClick={() => setIsMobileMenuOpen(false)} href="#engagements" className="text-base font-bold text-[#032b60] py-2 flex justify-between items-center">Garanties MCO <ChevronRight size={16}/></a>
          </div>
        </div>
      )}
    </nav>
  );
}