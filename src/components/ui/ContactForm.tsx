"use client";

import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface ContactFormProps {
  typeClient: string;
  simulation: string;
}

export function ContactForm({ typeClient, simulation }: ContactFormProps) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [message, setMessage] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus("loading");
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email, telephone, message, typeClient, simulation })
      });
      if (res.ok) {
        setFormStatus("success");
        setNom(""); setEmail(""); setTelephone(""); setMessage("");
      } else {
        setFormStatus("error");
      }
    } catch (err) {
      setFormStatus("error");
    }
  };

  if (formStatus === "success") {
    return (
      <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-2xl flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <CheckCircle size={32} />
        </div>
        <div>
          <h4 className="font-black text-xl mb-2">Demande envoyée !</h4>
          <p className="font-medium text-sm">Merci pour votre message. Nous vous recontactons dans les plus brefs délais.</p>
        </div>
        <button onClick={() => setFormStatus("idle")} className="mt-4 text-green-700 font-bold underline text-sm hover:text-green-800 transition-colors">Envoyer un autre message</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleContactSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Nom & Prénom <span className="text-[#0097b2]">*</span></label>
          <input type="text" required value={nom} onChange={(e) => setNom(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-[#0097b2] focus:border-[#0097b2] block p-3.5 transition-colors outline-none" placeholder="Jean Dupont" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Téléphone <span className="text-[#0097b2]">*</span></label>
          <input type="tel" required value={telephone} onChange={(e) => setTelephone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-[#0097b2] focus:border-[#0097b2] block p-3.5 transition-colors outline-none" placeholder="06 12 34 56 78" />
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Email <span className="text-[#0097b2]">*</span></label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-[#0097b2] focus:border-[#0097b2] block p-3.5 transition-colors outline-none" placeholder="jean@exemple.com" />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Votre message</label>
        <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-[#0097b2] focus:border-[#0097b2] block p-3.5 transition-colors outline-none resize-none" placeholder="Décrivez-nous brièvement votre besoin..."></textarea>
      </div>

      {formStatus === "error" && (
        <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-200">Une erreur est survenue lors de l'envoi. Veuillez réessayer.</p>
      )}

      <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <input type="checkbox" id="rgpd-consent" required className="mt-0.5 w-4 h-4 shrink-0 accent-[#0097b2] cursor-pointer" />
        <label htmlFor="rgpd-consent" className="text-[10px] text-slate-500 leading-relaxed cursor-pointer">
          J'accepte que les informations saisies soient exploitées par CHARGÉO pour traiter ma demande et m'envoyer des offres commerciales. Pour exercer vos droits, consultez notre <a href="/mentions-legales" className="text-[#0097b2] underline hover:text-[#032b60] transition-colors">Politique de confidentialité</a>. <span className="text-red-500">*</span>
        </label>
      </div>

      <button type="submit" disabled={formStatus === "loading"} className="relative overflow-hidden w-full bg-[#FF6B00] hover:bg-[#E66000] text-white font-black rounded-full text-sm sm:text-base px-6 py-4 text-center transition-all duration-300 shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100 disabled:shadow-none flex justify-center items-center gap-2 group z-10"><div className="animate-button-shine" />
        {formStatus === "loading" ? "Envoi en cours..." : "Soumettre ma demande"}
      </button>
    </form>
  );
}