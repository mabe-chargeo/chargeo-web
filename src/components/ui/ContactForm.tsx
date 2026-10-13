"use client";

// Formulaire de contact : logique et données envoyées inchangées (/api/contact, typeClient, simulation).
// Seul l'habillage passe à la charte 2026.
// 06/10/2026 : chaque intitulé est relié à sa case (htmlFor / id) et les cases
// portent autoComplete, pour le remplissage automatique et les lecteurs d'écran.
// Lot 3.5 (13/10/2026) : Entreprise et Copropriété ont un champ facultatif SIRET / N° d'immatriculation ;
// Copropriété a en plus le gestionnaire du syndic et le président du conseil syndical (facultatifs).
// Particulier : formulaire et envoi identiques à avant.
import React, { useState } from 'react';
import { ArrowRight, CheckCircle } from 'lucide-react';

interface ContactFormProps {
  typeClient: string;
  simulation: string;
}

const CHAMP = "w-full bg-white text-[#032b60] text-[15px] rounded-[14px] border-0 ring-[1.5px] ring-[#dfe3e8] focus:ring-2 focus:ring-[#0097b2] block p-3.5 transition outline-none placeholder:text-slate-400";
const LABEL = "text-[13px] font-extrabold text-[#032b60] uppercase tracking-[0.12em] ml-1";
const AIDE = "text-[12px] text-[#032b60]/70 ml-1 leading-relaxed";

type Personne = { nom: string; email: string; telephone: string; societe: string };
const PERSONNE_VIDE: Personne = { nom: "", email: "", telephone: "", societe: "" };

export function ContactForm({ typeClient, simulation }: ContactFormProps) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [message, setMessage] = useState("");
  const [siret, setSiret] = useState("");
  const [gestionnaire, setGestionnaire] = useState<Personne>(PERSONNE_VIDE);
  const [president, setPresident] = useState<Personne>(PERSONNE_VIDE);
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  // Identifiants uniques, même si le formulaire apparaît deux fois sur une page.
  const uid = React.useId();

  const estEntreprise = typeClient === "Entreprise";
  const estCopro = typeClient === "Copropriété";

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus("loading");
    // Champs supplémentaires seulement pour une entreprise ou une copropriété
    const extra: Record<string, unknown> = {};
    if (estEntreprise || estCopro) extra.siret = siret;
    if (estCopro) { extra.gestionnaire = gestionnaire; extra.presidentCS = president; }
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email, telephone, message, typeClient, simulation, ...extra })
      });
      if (res.ok) {
        setFormStatus("success");
        setNom(""); setEmail(""); setTelephone(""); setMessage("");
        setSiret(""); setGestionnaire(PERSONNE_VIDE); setPresident(PERSONNE_VIDE);
        
        if (typeof window !== 'undefined') {
          const dataLayer = (window as any).dataLayer = (window as any).dataLayer || [];
          dataLayer.push({
            event: 'form_submit_success',
            formType: typeClient
          });
        }
      } else {
        setFormStatus("error");
      }
    } catch (err) {
      setFormStatus("error");
    }
  };

  if (formStatus === "success") {
    return (
      <div className="bg-white text-[#032b60] p-8 rounded-[20px] flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-[#0097b2] rounded-[16px] flex items-center justify-center text-white">
          <CheckCircle size={32} />
        </div>
        <div>
          <h4 className="font-bold text-[22px] mb-2">Demande envoyée !</h4>
          <p className="text-[15px]">Merci pour votre message. Nous vous rappelons sous 24 h ouvrées.</p>
        </div>
        <button onClick={() => setFormStatus("idle")} className="mt-2 text-[#0097b2] font-semibold underline underline-offset-4 text-[15px] hover:text-[#032b60] transition-colors">Envoyer un autre message</button>
      </div>
    );
  }

  // Bloc d'une personne de la copropriété (gestionnaire ou président du conseil syndical)
  const blocPersonne = (
    cle: string,
    titre: string,
    aide: string,
    valeur: Personne,
    changer: (p: Personne) => void,
    avecSociete: boolean,
  ) => (
    <fieldset className="space-y-3 bg-white/60 p-4 rounded-[16px]">
      <legend className={LABEL}>{titre}</legend>
      <p className={AIDE}>{aide}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor={`${uid}-${cle}-nom`} className="sr-only">Nom et prénom</label>
          <input id={`${uid}-${cle}-nom`} type="text" value={valeur.nom} onChange={(e) => changer({ ...valeur, nom: e.target.value })} className={CHAMP} placeholder="Nom et prénom" />
        </div>
        {avecSociete && (
          <div className="space-y-1">
            <label htmlFor={`${uid}-${cle}-societe`} className="sr-only">Cabinet</label>
            <input id={`${uid}-${cle}-societe`} type="text" autoComplete="organization" value={valeur.societe} onChange={(e) => changer({ ...valeur, societe: e.target.value })} className={CHAMP} placeholder="Cabinet (ex : Citya)" />
          </div>
        )}
        <div className="space-y-1">
          <label htmlFor={`${uid}-${cle}-email`} className="sr-only">Email</label>
          <input id={`${uid}-${cle}-email`} type="email" value={valeur.email} onChange={(e) => changer({ ...valeur, email: e.target.value })} className={CHAMP} placeholder="Email" />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${uid}-${cle}-tel`} className="sr-only">Téléphone</label>
          <input id={`${uid}-${cle}-tel`} type="tel" value={valeur.telephone} onChange={(e) => changer({ ...valeur, telephone: e.target.value })} className={CHAMP} placeholder="Téléphone" />
        </div>
      </div>
    </fieldset>
  );

  return (
    <form onSubmit={handleContactSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label htmlFor={`${uid}-nom`} className={LABEL}>Nom et prénom <span className="text-[#0097b2]">*</span></label>
          <input id={`${uid}-nom`} name="nom" autoComplete="name" type="text" required value={nom} onChange={(e) => setNom(e.target.value)} className={CHAMP} placeholder="Jean Dupont" />
        </div>
        <div className="space-y-2">
          <label htmlFor={`${uid}-tel`} className={LABEL}>Téléphone <span className="text-[#0097b2]">*</span></label>
          <input id={`${uid}-tel`} name="telephone" autoComplete="tel" type="tel" required value={telephone} onChange={(e) => setTelephone(e.target.value)} className={CHAMP} placeholder="06 12 34 56 78" />
        </div>
      </div>
      
      <div className="space-y-2">
        <label htmlFor={`${uid}-email`} className={LABEL}>Email <span className="text-[#0097b2]">*</span></label>
        <input id={`${uid}-email`} name="email" autoComplete="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={CHAMP} placeholder="jean@exemple.com" />
      </div>

      {(estEntreprise || estCopro) && (
        <div className="space-y-2">
          <label htmlFor={`${uid}-siret`} className={LABEL}>{estCopro ? "N° d'immatriculation de la copropriété" : "SIRET de l'entreprise"}</label>
          <input id={`${uid}-siret`} name="siret" type="text" inputMode={estCopro ? "text" : "numeric"} value={siret} onChange={(e) => setSiret(e.target.value)} className={CHAMP} placeholder={estCopro ? "Ex : AE0812248 (ou SIRET du syndicat)" : "14 chiffres"} />
          <p className={AIDE}>{estCopro ? "Facultatif. Il figure sur la fiche synthétique de la copropriété." : "Facultatif. Il nous permet d'établir le devis au bon nom."}</p>
        </div>
      )}

      {estCopro && blocPersonne("gest", "Gestionnaire du syndic", "Facultatif. La personne qui suit votre immeuble au cabinet.", gestionnaire, setGestionnaire, true)}
      {estCopro && blocPersonne("pcs", "Président du conseil syndical", "Facultatif. Si ce n'est pas vous qui remplissez ce formulaire.", president, setPresident, false)}

      <div className="space-y-2">
        <label htmlFor={`${uid}-projet`} className={LABEL}>Votre projet</label>
        <textarea id={`${uid}-projet`} name="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className={`${CHAMP} resize-none`} placeholder="Décrivez-nous brièvement votre besoin..."></textarea>
      </div>

      {formStatus === "error" && (
        <p className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded-[12px]">Une erreur est survenue lors de l'envoi. Veuillez réessayer, ou appelez le standard au 04 85 69 22 04.</p>
      )}

      <div className="flex items-start gap-3 bg-white p-3.5 rounded-[14px]">
        <input type="checkbox" id={`${uid}-rgpd`} required className="mt-0.5 w-4 h-4 shrink-0 accent-[#0097b2] cursor-pointer" />
        <label htmlFor={`${uid}-rgpd`} className="text-[12px] text-[#032b60]/80 leading-relaxed cursor-pointer">
          J'accepte que les informations saisies soient exploitées par CHARGÉO pour traiter ma demande et m'envoyer des offres commerciales. Pour exercer vos droits, consultez notre <a href="/mentions-legales" className="text-[#0097b2] underline hover:text-[#032b60] transition-colors">Politique de confidentialité</a>. <span className="text-red-500">*</span>
        </label>
      </div>

      <button type="submit" disabled={formStatus === "loading"} className="w-full sm:w-auto bg-[#FF6B00] hover:bg-[#E66000] text-white font-semibold rounded-full text-[17px] px-8 py-4 transition-all duration-300 shadow-[0_8px_22px_rgba(255,107,0,0.28)] hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100 flex justify-center items-center gap-3">
        {formStatus === "loading" ? "Envoi en cours..." : <>Demander mon étude gratuite <ArrowRight size={20} /></>}
      </button>
    </form>
  );
}
