"use client";

// Suivi des clics (06/10/2026) : envoie un evenement a Google Tag Manager
// quand un visiteur clique sur le telephone, l'email ou un bouton de devis.
// Un seul ecouteur pour tout le site : aucun bouton n'est modifie.
//   clic_telephone : lien tel:
//   clic_email     : lien mailto:
//   clic_devis     : lien ou bouton dont le texte parle de devis, d'etude,
//                    de simulation ou de dossier AG (hors envoi de formulaire,
//                    deja compte par form_submit_success)
// Chaque evenement porte la page et le libelle clique. A brancher dans GTM :
// declencheur "Evenement personnalise" sur ces trois noms, balise GA4.
import { useEffect } from "react";

const DEVIS = /devis|étude|etude|simul|dossier ag/i;

export function SuiviClics() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const cible = e.target as Element | null;
      const el = cible && typeof cible.closest === "function" ? cible.closest("a, button") : null;
      if (!el) return;
      const href = el.getAttribute("href") || "";
      const texte = (el.textContent || "").replace(/\s+/g, " ").trim();
      let evenement: string | null = null;
      if (href.startsWith("tel:")) evenement = "clic_telephone";
      else if (href.startsWith("mailto:")) evenement = "clic_email";
      else if (el.getAttribute("type") !== "submit" && DEVIS.test(texte)) evenement = "clic_devis";
      if (!evenement) return;
      const w = window as unknown as { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ event: evenement, page: window.location.pathname, libelle: texte.slice(0, 80) });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
