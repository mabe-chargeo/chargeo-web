// Briques de l'application équipe CHARGéO (charte 2026), pensées pour le téléphone et la tablette.
// Composants d'affichage purs (aucun état) : utilisables dans une page serveur comme dans un formulaire client.
// Exceptions : la pastille du rôle actif dans l'en-tête (composant client RoleActif, 17/10/2026), le bouton Retour
// (composant client BoutonRetour, 17/10/2026, 16 h 19), le masque des liens ClickUp (composant client MasqueClickUp,
// 17/10/2026, 18 h 34 : liens ClickUp seulement pour le back-office et la direction) et le fil d'Ariane (composant
// client FilAriane, 18/10/2026, 17 h 20).
// Servent à /interne aujourd'hui, puis à tous les écrans par rôle d'app.chargeo.fr (Phase 6).
import React from "react";
import { ArrowLeft } from "lucide-react";
import { NAVY, CYAN, ORANGE, GRIS, CYAN_PALE, CYAN_SUR_NAVY } from "@/components/charte/couleurs";
import RoleActif from "@/components/charte/RoleActif";
import BoutonRetour from "@/components/charte/BoutonRetour";
import MasqueClickUp from "@/components/charte/MasqueClickUp";
import FilAriane from "@/components/charte/FilAriane";

// Champ de saisie et étiquette : mêmes réglages que le formulaire de contact du site (texte 16 px pour éviter le zoom iPhone).
export const CHAMP =
  "w-full bg-white text-[#032b60] text-[16px] font-medium rounded-[14px] border-0 ring-[1.5px] ring-[#dfe3e8] focus:ring-2 focus:ring-[#0097b2] block px-4 py-3.5 transition outline-none placeholder:text-slate-400";
export const ETIQUETTE = "ml-1 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#032b60]";

// Fond de page de l'application
export function PageAppli({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white pb-12 font-sans antialiased" style={{ color: NAVY }}>
      <MasqueClickUp />
      {children}
    </div>
  );
}

// Une « action » d'en-tête qui est en fait un ancien lien de retour (lien ou bouton avec la flèche ←) : remplacée par le
// bouton Retour commun, qui revient à l'écran précédent (son lien sert d'écran parent de repli).
function ancienRetour(n: React.ReactNode): { repli?: string } | null {
  if (!React.isValidElement(n)) return null;
  const props = (n.props || {}) as { children?: React.ReactNode; href?: unknown };
  const fleche = React.Children.toArray(props.children).some((c) => React.isValidElement(c) && c.type === ArrowLeft);
  if (!fleche) return null;
  return { repli: typeof props.href === 'string' ? props.href : undefined };
}

// En-tête navy : bouton Retour (écran précédent) et logo blanc à gauche, action à droite (actualiser...), fil d'Ariane,
// surtitre, rôle affiché, titre. « retour » donne l'écran parent de repli quand on arrive de l'extérieur.
// 17/10/2026, 16 h 19 : le bouton Retour est sur tous les écrans sauf Ma journée, Mon espace et Plus.
// 18/10/2026, 17 h 20 : fil d'Ariane sous le bouton Retour (onglet de la barre puis écrans parents, src/lib/filAriane.ts).
// 18/10/2026, 17 h 37 : « parent » impose l'écran parent du fil (clé de la carte des menus, '' = aucun).
export function EnTeteAppli({
  surtitre,
  titre,
  retour,
  action,
  parent,
}: {
  surtitre: string;
  titre: string;
  retour?: { href: string; libelle: string };
  action?: React.ReactNode;
  parent?: string;
}) {
  const ancien = ancienRetour(action);
  const repli = retour?.href || ancien?.repli || '/interne/espace';
  const droite = ancien ? null : action;
  return (
    <header className="mb-6 px-6 pb-8 pt-10" style={{ backgroundColor: NAVY }}>
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BoutonRetour repli={repli} force={!!retour || !!ancien} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-chargeo-blanc.svg" alt="CHARGéO" className="h-8 w-auto min-w-0 sm:h-9" />
          </div>
          {droite}
        </div>
        <FilAriane parent={parent} />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em]" style={{ color: CYAN_SUR_NAVY }}>{surtitre}</p>
          <RoleActif />
        </div>
        <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.015em] text-white sm:text-[28px]">{titre}</h1>
      </div>
    </header>
  );
}

// Zone de contenu centrée, largeur téléphone
export function ContenuAppli({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <main className={`mx-auto max-w-lg px-4 ${className}`}>{children}</main>;
}

// Repère de section : petite barre turquoise + libellé
export function Repere({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <span className="block h-[8px] w-[64px] rounded-[4px]" style={{ backgroundColor: CYAN }} />
      <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]">{children}</p>
    </div>
  );
}

// Carte grise (ou turquoise pâle avec filet si accent)
export function Carte({ children, accent = false, className = "" }: { children: React.ReactNode; accent?: boolean; className?: string }) {
  return (
    <div
      className={`rounded-[20px] p-5 ${className}`}
      style={accent ? { backgroundColor: CYAN_PALE, boxShadow: `inset 5px 0 0 ${CYAN}` } : { backgroundColor: GRIS }}
    >
      {children}
    </div>
  );
}

// Titre de carte : pastille turquoise + icône blanche + titre, et un élément optionnel à droite (compteur...)
export function TitreCarte({ icon: Icon, children, extra }: { icon: React.ElementType; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-3 text-[17px] font-bold">
        <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[12px]" style={{ backgroundColor: CYAN }}>
          <Icon size={20} color="#ffffff" strokeWidth={1.8} />
        </span>
        {children}
      </h3>
      {extra}
    </div>
  );
}

// Message d'erreur ou d'alerte : fond blanc, filet orange
export function Alerte({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={`rounded-[14px] bg-white px-4 py-3 text-[15px] font-semibold leading-relaxed ring-[1.5px] ring-[#dfe3e8] ${className}`} style={{ boxShadow: `inset 4px 0 0 ${ORANGE}` }}>
      {children}
    </p>
  );
}

// Bouton principal orange, pleine largeur. "inactif" = grisé (action pas encore possible).
export function BoutonPrincipal({
  inactif = false,
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { inactif?: boolean }) {
  return (
    <button
      {...props}
      className={`flex w-full items-center justify-center gap-3 rounded-full px-8 py-4 text-[17px] font-semibold text-white transition-transform active:scale-95 ${inactif ? "bg-slate-300" : "bg-[#FF6B00] shadow-[0_8px_22px_rgba(255,107,0,0.28)]"} ${className}`}
    >
      {children}
    </button>
  );
}
