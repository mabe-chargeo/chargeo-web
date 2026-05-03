import React from 'react';
import { Phone, Mail } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export function Footer() {
  return (
    <footer className="bg-[#032B60] py-16 md:py-24 border-t border-white/5 overflow-hidden relative">
      <div className="hidden md:block absolute -bottom-40 -right-40 w-96 h-96 bg-[radial-gradient(circle,rgba(0,151,178,0.3)_0%,transparent_70%)] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-12 md:gap-16 relative z-10">
         
         <div className="space-y-6 text-left max-w-sm">
            <Logo light={true} className="scale-100 sm:scale-110 origin-left" />
            <div className="space-y-2 mt-4">
               <p className="text-white/80 font-medium text-sm sm:text-base leading-relaxed">
                 8, Avenue du général De Gaulle<br />
                 74200 THONON-LES-BAINS
               </p>
               <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-4">Entreprise en cours de création</p>
            </div>
         </div>
         
         <div className="flex flex-col sm:flex-row gap-12 md:gap-24 text-left">
            <div className="space-y-5">
               <h4 className="text-white/40 font-bold text-xs uppercase tracking-[0.2em]">Navigation</h4>
               <ul className="space-y-3">
                  <li><a href="/" className="text-white/80 text-sm font-medium hover:text-[#0097b2] hover:translate-x-1 transition-all inline-block">Accueil</a></li>
                  <li><a href="/pro" className="text-white/80 text-sm font-medium hover:text-[#0097b2] hover:translate-x-1 transition-all inline-block">Entreprises</a></li>
                  <li><a href="/copropriete" className="text-white/80 text-sm font-medium hover:text-[#0097b2] hover:translate-x-1 transition-all inline-block">Copropriétés</a></li>
                  <li><a href="/particuliers" className="text-white/80 text-sm font-medium hover:text-[#0097b2] hover:translate-x-1 transition-all inline-block">Particuliers</a></li>
               </ul>
            </div>
            
            <div className="space-y-5">
               <h4 className="text-white/40 font-bold text-xs uppercase tracking-[0.2em]">Assistance</h4>
               <ul className="space-y-4">
                  <li>
                    <a href="tel:0485692204" className="text-white font-bold text-base sm:text-lg hover:text-[#0097b2] transition-colors flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"><Phone size={14} /></span>
                      04 85 69 22 04
                    </a>
                  </li>
                  <li>
                    <a href="mailto:contact@chargeo.fr" className="text-white font-bold text-base sm:text-lg hover:text-[#0097b2] transition-colors flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"><Mail size={14} /></span>
                      contact@chargeo.fr
                    </a>
                  </li>
                  <li className="pt-2 flex gap-4">
                    <a href="#" className="text-white/40 text-[10px] font-bold uppercase tracking-wider hover:text-[#0097b2] transition-colors">Mentions Légales</a>
                    <a href="#" className="text-white/40 text-[10px] font-bold uppercase tracking-wider hover:text-[#0097b2] transition-colors">CGV</a>
                  </li>
               </ul>
            </div>
         </div>

      </div>
    </footer>
  );
}