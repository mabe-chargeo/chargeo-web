"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [iframeUrl, setIframeUrl] = useState("");

  useEffect(() => {
    // 1. L'URL de base absolue, sans AUCUNE variable après les lettres !
    const baseUrl = "https://forms.clickup.com/90151325642/f/2kyq03ya-7815/I5ELJ3PBRLRC158WLS";
    // 2. On lit les vraies valeurs déjà calculées dans la barre d'adresse (ex: ?Source=Site Web&Budget=1656...)
    const urlParams = window.location.search;
    // 3. On génère l'URL parfaite pour l'iFrame
    setIframeUrl(baseUrl + (urlParams || ""));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-[#0097b2]/20">
      
      {/* En-tête simplifié pour éviter les distractions (No-escape header) */}
      <header className="bg-white py-6 border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <a 
            href="/" 
            className="flex items-center gap-2 text-slate-500 hover:text-[#0097b2] transition-colors font-bold text-sm bg-slate-50 px-4 py-2 rounded-full"
          >
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Retour au simulateur</span>
          </a>
          
          <div className="h-8 md:h-10">
            <img 
              src="/CHARGEO_LOGO_COMPLET_FOND_TRANSPARENT_2026-01-24.png" 
              alt="Logo CHARGéO" 
              className="h-full w-auto object-contain"
            />
          </div>
          
          <div className="flex items-center gap-2 text-[#0097b2] font-black text-xs uppercase tracking-widest hidden sm:flex">
            <ShieldCheck size={16} />
            Connexion Sécurisée
          </div>
        </div>
      </header>

      {/* Zone principale contenant le formulaire */}
      <main className="flex-grow flex flex-col items-center justify-start py-12 px-4 sm:px-6">
        
        {/* Messages de réassurance */}
        <div className="max-w-3xl w-full mb-8 text-center space-y-4">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-[#032b60] uppercase">
            Validation du <span className="text-[#0097b2]">projet</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto">
            Laissez-nous vos coordonnées pour qu'un expert local certifié IRVE analyse votre estimation et vous recontacte.
          </p>
        </div>

        {/* Conteneur iFrame ClickUp */}
        <div className="max-w-3xl w-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden relative min-h-[900px] flex flex-col">
          
          {/* Loader affiché pendant le chargement du formulaire */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 space-y-4">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-[#0097b2] rounded-full animate-spin"></div>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest animate-pulse">Chargement sécurisé...</p>
            </div>
          )}

          {/* L'iframe s'affiche uniquement quand l'URL parfaite est prête avec les variables */}
          {iframeUrl && (
            <iframe 
              className="w-full h-full min-h-[900px] border-none flex-grow"
              src={iframeUrl} 
              title="Formulaire de contact CHARGéO"
              onLoad={() => setIsLoading(false)}
              style={{ background: 'transparent' }}
            ></iframe>
          )}
        </div>

        {/* Réassurance sous le formulaire */}
        <div className="max-w-3xl w-full mt-8 flex flex-wrap justify-center gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#0097b2]"/> Sans engagement</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#0097b2]"/> Données protégées</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#0097b2]"/> Rappel sous 48h</span>
        </div>
      </main>
      
    </div>
  );
}