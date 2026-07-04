"use client";

import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface SavFormProps {
  clientId: string;
  nomClient: string;
}

export function SavForm({ clientId, nomClient }: SavFormProps) {
  const [message, setMessage] = useState("");
  const [severite, setSeverite] = useState("");
  const [typePanne, setTypePanne] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSavSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus("loading");
    try {
      const res = await fetch('/api/sav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, clientId, nomClient, severite, typePanne })
      });
      if (res.ok) {
        setFormStatus("success");
        setMessage("");
        setSeverite("");
        setTypePanne("");
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
          <h4 className="font-black text-xl mb-2">Demande de SAV envoyée !</h4>
          <p className="font-medium text-sm">Notre équipe technique a été alertée et va vous recontacter très rapidement.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSavSubmit} className="space-y-5">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Champ Sévérité */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Gravité du problème <span className="text-[#0097b2]">*</span></label>
          <select 
            required 
            value={severite} 
            onChange={(e) => setSeverite(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-[#0097b2] focus:border-[#0097b2] block p-3.5 transition-colors outline-none cursor-pointer"
          >
            <option value="" disabled>Sélectionnez une option</option>
            <option value="465f0b89-a3a8-4b43-bfc9-c4919e648c6d">Mineure (Fonctionnel mais gênant)</option>
            <option value="19cd7f01-3aa9-4912-8201-bc894da01b1b">Gênante (Perturbe la charge)</option>
            <option value="d6342736-7efa-4cbb-8ac2-f5eda2b12f3f">Critique (Borne Hors Service)</option>
          </select>
        </div>

        {/* Champ Type de Panne */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Origine de la panne <span className="text-[#0097b2]">*</span></label>
          <select 
            required 
            value={typePanne} 
            onChange={(e) => setTypePanne(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-[#0097b2] focus:border-[#0097b2] block p-3.5 transition-colors outline-none cursor-pointer"
          >
            <option value="" disabled>Sélectionnez une option</option>
            <option value="e18c2e9d-6b62-4062-bb68-72c4af1ba126">Réseau / Wifi (Hors ligne)</option>
            <option value="3f148bea-8290-4883-a535-d26d75c15fe8">Matériel (Borne ou câble abîmé)</option>
            <option value="8793ddb9-376b-421c-90aa-f82d6b16fa99">Logiciel (Application mobile)</option>
            <option value="0fd5085c-3142-4c85-b7f6-254ed3f28ad4">Électrique (Disjoncte)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Décrivez le problème <span className="text-[#0097b2]">*</span></label>
        <textarea 
          required
          rows={4} 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-[#0097b2] focus:border-[#0097b2] block p-3.5 transition-colors outline-none resize-none" 
          placeholder="Ex: Ma borne clignote en rouge depuis ce matin..."
        ></textarea>
      </div>

      {formStatus === "error" && (
        <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-200">Une erreur est survenue lors de l'envoi. Veuillez réessayer.</p>
      )}

      <button 
        type="submit" 
        disabled={formStatus === "loading"} 
        className="relative overflow-hidden w-full bg-[#FF6B00] hover:bg-[#E66000] text-white font-black rounded-full text-sm sm:text-base px-6 py-4 text-center transition-all duration-300 shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2 group z-10"
      >
        <div className="animate-button-shine" />
        {formStatus === "loading" ? "Envoi en cours..." : "Signaler le problème technique"}
      </button>
    </form>
  );
}