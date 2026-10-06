"use client";

// Formulaire de candidature : logique et données envoyées inchangées (/api/recrutement, champs, CV, anti-robots).
// Seul l'habillage passe à la charte 2026 (mêmes champs que le ContactForm).
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, CheckCircle, Upload } from 'lucide-react';

const CV_MAX_OCTETS = 4 * 1024 * 1024;

const champ = "w-full bg-white text-[#032b60] text-[15px] rounded-[14px] border-0 ring-[1.5px] ring-[#dfe3e8] focus:ring-2 focus:ring-[#0097b2] block p-3.5 transition outline-none placeholder:text-slate-400";
const etiquette = "text-[13px] font-extrabold text-[#032b60] uppercase tracking-[0.12em] ml-1";
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
      <div className="flex flex-col items-center gap-4 rounded-[20px] p-8 text-center text-[#032b60]" style={{ backgroundColor: '#e3f4f7' }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0097b2] text-white">
          <CheckCircle size={32} />
        </div>
        <div>
          <h4 className="mb-2 text-[22px] font-bold">Merci, candidature reçue.</h4>
          <p className="text-[16px]">On te rappelle sous 48 h.</p>
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

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={etiquette}>Nom et prénom {requis}</label>
          <input type="text" name="nom" required className={champ} placeholder="Léo Martin" />
        </div>
        <div className="space-y-2">
          <label className={etiquette}>Téléphone {requis}</label>
          <input type="tel" name="telephone" required className={champ} placeholder="06 12 34 56 78" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={etiquette}>Email</label>
          <input type="email" name="email" className={champ} placeholder="leo@exemple.com" />
        </div>
        <div className="min-w-0 space-y-2">
          <label className={etiquette}>Quand peux-tu commencer ?</label>
          {/* iPhone : le champ date a une largeur et une hauteur propres, on les aligne sur les autres champs */}
          <input type="date" name="disponibilite" className={`${champ} h-[50px] min-w-0 max-w-full appearance-none text-left [&::-webkit-date-and-time-value]:text-left`} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
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
          <label className={etiquette}>Habilitation {requis}</label>
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
        <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-[#c8d0d9] bg-white p-3.5 transition-colors hover:border-[#0097b2]">
          <Upload size={18} className="shrink-0 text-[#0097b2]" />
          <span className="truncate text-[15px] text-slate-500">{nomCv || "PDF, Word ou photo, 4 Mo maximum"}</span>
          <input
            type="file"
            name="cv"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => { setErreurCv(""); setNomCv(e.target.files?.[0]?.name || ""); }}
          />
        </label>
        {erreurCv && <p className="ml-1 text-[13px] font-semibold text-red-600">{erreurCv}</p>}
      </div>

      {formStatus === "error" && (
        <p className="rounded-[14px] border border-red-200 bg-red-50 p-3 text-[14px] font-semibold text-red-600">
          {champErreur === "nom" && "Indique ton prénom et ton nom (par exemple : Léo Martin)."}
          {champErreur === "telephone" && "Vérifie ton numéro : il doit être français ou suisse (par exemple : 06 12 34 56 78)."}
          {champErreur === "disponibilite" && "Vérifie ta date de disponibilité."}
          {!["nom", "telephone", "disponibilite"].includes(champErreur) && "Une erreur est survenue lors de l'envoi. Réessaie, ou appelle-nous au 04 85 69 22 04."}
        </p>
      )}

      <div className="flex items-start gap-3 rounded-[14px] p-3.5" style={{ backgroundColor: '#eceef1' }}>
        <input type="checkbox" id="rgpd-recrutement" name="rgpd" value="oui" required className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#0097b2]" />
        <label htmlFor="rgpd-recrutement" className="cursor-pointer text-[12px] leading-relaxed text-[#032b60]">
          J'accepte que CHARGéO conserve ma candidature pendant 2 ans pour me recontacter. Pour exercer tes droits, consulte notre <a href="/mentions-legales" className="text-[#0097b2] underline transition-colors hover:text-[#032b60]">Politique de confidentialité</a>. <span className="text-[#0097b2]">*</span>
        </label>
      </div>

      <button type="submit" disabled={formStatus === "loading"} className="group inline-flex w-full items-center justify-center gap-3 rounded-full px-8 py-4 text-[17px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100 sm:w-auto" style={{ backgroundColor: '#FF6B00', boxShadow: '0 8px 22px rgba(255,107,0,0.28)' }}>
        {formStatus === "loading" ? "Envoi en cours..." : <>Envoyer ma candidature <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" /></>}
      </button>
    </form>
  );
}
