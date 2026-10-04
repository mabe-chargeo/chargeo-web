"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Upload } from 'lucide-react';

const CV_MAX_OCTETS = 4 * 1024 * 1024;

const champ = "w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-[#0097b2] focus:border-[#0097b2] block p-3.5 transition-colors outline-none";
const etiquette = "text-xs font-bold text-slate-700 uppercase tracking-wider ml-1";
const requis = <span className="text-[#0097b2]">*</span>;

export function RecrutementForm() {
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [erreurCv, setErreurCv] = useState("");
  const [nomCv, setNomCv] = useState("");
  const [champErreur, setChampErreur] = useState("");
  const debut = useRef(0);

  // Anti-robots : on mesure le temps de remplissage
  useEffect(() => { debut.current = Date.now(); }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const data = new FormData(formEl);

    const cv = data.get("cv");
    if (cv && typeof cv !== "string" && cv.size > CV_MAX_OCTETS) {
      setErreurCv("Ton CV dépasse 4 Mo : envoie une version plus légère, ou laisse ce champ vide.");
      return;
    }
    if (cv && typeof cv !== "string" && cv.size === 0) data.delete("cv");

    data.set("duree", String(debut.current ? Date.now() - debut.current : 0));

    setChampErreur("");
    setFormStatus("loading");
    try {
      const res = await fetch('/api/recrutement', { method: 'POST', body: data });
      if (res.ok) {
        setFormStatus("success");
        formEl.reset();
        setNomCv("");
        if (typeof window !== 'undefined') {
          const dataLayer = (window as any).dataLayer = (window as any).dataLayer || [];
          dataLayer.push({ event: 'form_submit_success', formType: 'Recrutement' });
        }
      } else {
        const retour = await res.json().catch(() => ({}));
        setChampErreur(typeof retour.champ === "string" ? retour.champ : "");
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
          <h4 className="font-black text-xl mb-2">Merci, candidature reçue.</h4>
          <p className="font-medium text-sm">On te rappelle sous 48 h.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" encType="multipart/form-data">
      {/* Pot de miel anti-robot : invisible pour un humain */}
      <div className="hidden" aria-hidden="true">
        <label>Site web<input type="text" name="site_web" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className={etiquette}>Nom et prénom {requis}</label>
          <input type="text" name="nom" required className={champ} placeholder="Léo Martin" />
        </div>
        <div className="space-y-2">
          <label className={etiquette}>Téléphone {requis}</label>
          <input type="tel" name="telephone" required className={champ} placeholder="06 12 34 56 78" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className={etiquette}>Email</label>
          <input type="email" name="email" className={champ} placeholder="leo@exemple.com" />
        </div>
        <div className="space-y-2">
          <label className={etiquette}>Quand peux-tu commencer ?</label>
          <input type="date" name="disponibilite" className={champ} />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-5">
        <div className="space-y-2">
          <label className={etiquette}>Ton diplôme {requis}</label>
          <select name="diplome" required defaultValue="" className={champ}>
            <option value="" disabled>Choisir</option>
            <option value="CAP">CAP</option>
            <option value="Bac pro">Bac pro</option>
            <option value="BTS">BTS</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className={etiquette}>Permis B {requis}</label>
          <select name="permis" required defaultValue="" className={champ}>
            <option value="" disabled>Choisir</option>
            <option value="oui">Oui</option>
            <option value="non">Non</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className={etiquette}>Habilitation électrique {requis}</label>
          <select name="habilitation" required defaultValue="" className={champ}>
            <option value="" disabled>Choisir</option>
            <option value="Aucune">Aucune</option>
            <option value="Faite en formation">Faite en formation</option>
            <option value="Titre déjà délivré">Titre déjà délivré</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className={etiquette}>Un mot sur toi</label>
        <textarea name="message" rows={4} className={`${champ} resize-none`} placeholder="Ce que tu as déjà fait, ce qui te plaît dans le métier..."></textarea>
      </div>

      <div className="space-y-2">
        <label className={etiquette}>Ton CV (facultatif)</label>
        <label className="flex items-center gap-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3.5 cursor-pointer hover:border-[#0097b2] transition-colors">
          <Upload size={18} className="text-[#0097b2] shrink-0" />
          <span className="text-sm text-slate-500 truncate">{nomCv || "PDF, Word ou photo, 4 Mo maximum"}</span>
          <input
            type="file"
            name="cv"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => { setErreurCv(""); setNomCv(e.target.files?.[0]?.name || ""); }}
          />
        </label>
        {erreurCv && <p className="text-red-500 text-xs font-bold ml-1">{erreurCv}</p>}
      </div>

      {formStatus === "error" && (
        <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-200">
          {champErreur === "nom" && "Indique ton prénom et ton nom (par exemple : Léo Martin)."}
          {champErreur === "telephone" && "Vérifie ton numéro : il doit être français ou suisse (par exemple : 06 12 34 56 78)."}
          {champErreur === "disponibilite" && "Vérifie ta date de disponibilité."}
          {!["nom", "telephone", "disponibilite"].includes(champErreur) && "Une erreur est survenue lors de l'envoi. Réessaie, ou appelle-nous au 04 85 69 22 04."}
        </p>
      )}

      <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <input type="checkbox" id="rgpd-recrutement" name="rgpd" value="oui" required className="mt-0.5 w-4 h-4 shrink-0 accent-[#0097b2] cursor-pointer" />
        <label htmlFor="rgpd-recrutement" className="text-[10px] text-slate-500 leading-relaxed cursor-pointer">
          J'accepte que CHARGéO conserve ma candidature pendant 2 ans pour me recontacter. Pour exercer tes droits, consulte notre <a href="/mentions-legales" className="text-[#0097b2] underline hover:text-[#032b60] transition-colors">Politique de confidentialité</a>. <span className="text-red-500">*</span>
        </label>
      </div>

      <button type="submit" disabled={formStatus === "loading"} className="relative overflow-hidden w-full bg-[#FF6B00] hover:bg-[#E66000] text-white font-black rounded-full text-sm sm:text-base px-6 py-4 text-center transition-all duration-300 shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100 disabled:shadow-none flex justify-center items-center gap-2 group z-10"><div className="animate-button-shine" />
        {formStatus === "loading" ? "Envoi en cours..." : "Envoyer ma candidature"}
      </button>
    </form>
  );
}
