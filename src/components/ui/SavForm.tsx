"use client";

// Formulaire SAV : logique inchangée (/api/sav, identifiants des options ClickUp). Habillage charte 2026.
import React, { useState } from 'react';
import { ArrowRight, CheckCircle } from 'lucide-react';

interface SavFormProps {
  clientId: string;
  nomClient: string;
}

const CHAMP = "w-full bg-white text-[#032b60] text-[15px] rounded-[14px] border-0 ring-[1.5px] ring-[#dfe3e8] focus:ring-2 focus:ring-[#0097b2] block p-3.5 transition outline-none placeholder:text-slate-400";
const ETIQUETTE = "ml-1 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#032b60]";

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
      <div className="flex flex-col items-center gap-4 rounded-[20px] p-8 text-center text-[#032b60]" style={{ backgroundColor: '#e3f4f7' }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0097b2] text-white">
          <CheckCircle size={32} />
        </div>
        <div>
          <h4 className="mb-2 text-[22px] font-bold">Demande de SAV envoyée.</h4>
          <p className="text-[16px]">Notre équipe technique a été alertée et va vous recontacter très rapidement.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSavSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Champ Sévérité */}
        <div className="space-y-2">
          <label className={ETIQUETTE}>Gravité du problème <span className="text-[#0097b2]">*</span></label>
          <select required value={severite} onChange={(e) => setSeverite(e.target.value)} className={`${CHAMP} cursor-pointer`}>
            <option value="" disabled>Sélectionnez une option</option>
            <option value="465f0b89-a3a8-4b43-bfc9-c4919e648c6d">Mineure (Fonctionnel mais gênant)</option>
            <option value="19cd7f01-3aa9-4912-8201-bc894da01b1b">Gênante (Perturbe la charge)</option>
            <option value="d6342736-7efa-4cbb-8ac2-f5eda2b12f3f">Critique (Borne Hors Service)</option>
          </select>
        </div>

        {/* Champ Type de Panne */}
        <div className="space-y-2">
          <label className={ETIQUETTE}>Origine de la panne <span className="text-[#0097b2]">*</span></label>
          <select required value={typePanne} onChange={(e) => setTypePanne(e.target.value)} className={`${CHAMP} cursor-pointer`}>
            <option value="" disabled>Sélectionnez une option</option>
            <option value="e18c2e9d-6b62-4062-bb68-72c4af1ba126">Réseau / Wifi (Hors ligne)</option>
            <option value="3f148bea-8290-4883-a535-d26d75c15fe8">Matériel (Borne ou câble abîmé)</option>
            <option value="8793ddb9-376b-421c-90aa-f82d6b16fa99">Logiciel (Application mobile)</option>
            <option value="0fd5085c-3142-4c85-b7f6-254ed3f28ad4">Électrique (Disjoncte)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className={ETIQUETTE}>Décrivez le problème <span className="text-[#0097b2]">*</span></label>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${CHAMP} resize-none`}
          placeholder="Ex: Ma borne clignote en rouge depuis ce matin..."
        ></textarea>
      </div>

      {formStatus === "error" && (
        <p className="rounded-[14px] border border-red-200 bg-red-50 p-3 text-[14px] font-semibold text-red-600">Une erreur est survenue lors de l'envoi. Veuillez réessayer.</p>
      )}

      <button
        type="submit"
        disabled={formStatus === "loading"}
        className="group inline-flex w-full items-center justify-center gap-3 rounded-full px-8 py-4 text-[17px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100"
        style={{ backgroundColor: '#FF6B00', boxShadow: '0 8px 22px rgba(255,107,0,0.28)' }}
      >
        {formStatus === "loading" ? "Envoi en cours..." : <>Signaler le problème technique <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" /></>}
      </button>
    </form>
  );
}
