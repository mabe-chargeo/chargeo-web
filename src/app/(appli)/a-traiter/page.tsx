"use client";

// À traiter (ex-Mon espace ; un espace par rôle, validé par Matthieu le 17/10/2026) : comme un espace ClickUp, les vues
// dont le rôle a besoin, dans l'ordre de son travail, chacune avec son compteur. Une vue ouvre la liste des fiches ; une
// fiche ouvre la fiche avec le bloc 📇 Contact. Espaces définis dans src/lib/espaces.ts (Commercial validé le 17/10 à
// 10 h 44, Chef de chantier à 11 h 06, Installateur à 11 h 18, Back-office à 11 h 28, Direction à 11 h 37).
// ?role=<rôle> : la direction peut encore ouvrir l'espace d'un autre rôle par l'adresse. La route vérifie les droits.
// 17/10, 16 h 11 et 16 h 49 (Matthieu) : l'espace Direction montre les écrans de tous les rôles, une rangée par rôle.
// 17/10, 17 h 24 : deux parties, « À traiter » et « À consulter ».
// 17/10, 20 h 17 (choix de Matthieu : barre à 4 onglets) : « À consulter » devient son propre onglet
// (/consulter) ; cet écran ne garde que les vues avec compteur.
// 17/10, 20 h 29 (Matthieu : « il manque le bouton pour ajouter un nouveau prospect ») : + Prospect à côté de
// + Nouveau projet pour les rôles qui peuvent créer un prospect (CREER de src/lib/menusAppli.ts : commercial, direction).
// 19/10/2026, 18 h 43 (adresses propres) : écran servi sur /a-traiter, adresses lues dans src/lib/adresses.ts.
import { useEffect, useState } from 'react';
import { ChevronRight, ExternalLink, Plus, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte } from '@/components/charte/Appli';
import { CYAN, GRIS, NAVY, ORANGE } from '@/components/charte/couleurs';
import { CREER, ECRANS, LIBELLE_ROLE, type RoleAppli } from '@/lib/menusAppli';
import { useRoleAppli } from '@/components/charte/roleAppli';
import { adresses } from '@/lib/adresses';

type Vue = {
  cle: string; emoji: string; libelle: string; description: string; href: string;
  urgent?: boolean; externe?: boolean; aConstruire?: boolean; etape?: string; n: number | null;
};
type Reponse = { espace: { titre: string; creer: { libelle: string; href: string } | null } | null; vues: Vue[]; preview: boolean };

const estRole = (r: string | null): r is RoleAppli => !!r && Object.prototype.hasOwnProperty.call(LIBELLE_ROLE, r);

export default function EspacePage() {
  const { role } = useRoleAppli();
  const [roleDemande, setRoleDemande] = useState<RoleAppli | null>(null);
  const [pret, setPret] = useState(false);
  const [donnees, setDonnees] = useState<Reponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Rôle demandé dans l'adresse (lu côté téléphone, sans Suspense)
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('role');
    setRoleDemande(estRole(r) ? r : null);
    setPret(true);
  }, []);

  const roleVu: RoleAppli | null = roleDemande || role;
  const autreEspace = !!roleDemande && roleDemande !== role;

  const charger = async (r: string) => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/interne/espace?role=${encodeURIComponent(r)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
      else setDonnees(data as Reponse);
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pret && roleVu) charger(roleVu);
  }, [pret, roleVu]);

  const boutonActualiser = (
    <button
      onClick={() => roleVu && charger(roleVu)}
      aria-label="Actualiser"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-transform active:scale-95"
    >
      <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
    </button>
  );

  const pastille = (v: Vue) => {
    if (v.aConstruire) {
      return <span className="shrink-0 rounded-full bg-[#eef1f4] px-2.5 py-1 text-[11px] font-bold" style={{ color: NAVY }}>à construire</span>;
    }
    const fond = v.n === null ? '#9aa3ad' : v.n > 0 && v.urgent ? ORANGE : CYAN;
    return (
      <span className="shrink-0 rounded-full px-3 py-1 text-[15px] font-bold text-white" style={{ backgroundColor: fond }}>
        {v.n === null ? '?' : v.n}
      </span>
    );
  };

  const vues = donnees?.vues || [];
  // Boutons de création en tête : celui de l'espace (+ Nouveau projet) et + Prospect si le rôle peut en créer
  const boutons: { libelle: string; href: string }[] = [];
  if (donnees?.espace?.creer) boutons.push(donnees.espace.creer);
  if (donnees?.espace && roleVu && CREER[roleVu].includes('prospect') && ECRANS.prospect) boutons.push({ libelle: ECRANS.prospect.libelle, href: ECRANS.prospect.href });

  return (
    <PageAppli>
      <EnTeteAppli surtitre={roleVu ? LIBELLE_ROLE[roleVu] : 'Application équipe'} titre="À traiter" action={boutonActualiser} />
      <ContenuAppli className="space-y-3">
        {donnees?.preview && <Alerte>Prévisualisation : affaires lues dans 🧪 Qualification TEST, le reste dans les vraies listes. Rien n&apos;est modifié.</Alerte>}
        {autreEspace && (
          <a href={adresses.aTraiter} className="block text-[15px] font-semibold" style={{ color: CYAN }}>← Revenir à mon espace</a>
        )}
        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && !donnees && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Je compte ce qui t&apos;attend...</p>
          </Carte>
        )}
        {donnees && !donnees.espace && (
          <Carte className="text-center">
            <p className="text-[15px] font-semibold">L&apos;espace {roleVu ? LIBELLE_ROLE[roleVu].toLowerCase() : ''} est en cours de validation avec Matthieu.</p>
          </Carte>
        )}

        {boutons.length > 0 && (
          <div className={boutons.length > 1 ? 'grid grid-cols-2 gap-2' : ''}>
            {boutons.map((b) => (
              <a
                key={b.href}
                href={b.href}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-4 py-4 text-[16px] font-semibold text-white shadow-[0_8px_22px_rgba(255,107,0,0.28)] transition-transform active:scale-95"
              >
                <Plus size={19} /> {b.libelle}
              </a>
            ))}
          </div>
        )}

        {vues.map((v, i) => (
          <div key={v.cle}>
            {/* Rangée du rôle (espace Direction) */}
            {v.etape && v.etape !== vues[i - 1]?.etape && (
              <p className={`mb-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500 ${i > 0 ? 'pt-3' : ''}`}>{v.etape}</p>
            )}
            <a
              href={v.href}
              target={v.externe ? '_blank' : undefined}
              rel={v.externe ? 'noopener noreferrer' : undefined}
              className={`flex items-center gap-3 rounded-[20px] p-5 transition-transform active:scale-[0.98] ${v.n === 0 ? 'opacity-60' : ''}`}
              style={{ backgroundColor: GRIS }}
            >
              <span className="shrink-0 text-[24px] leading-none" aria-hidden>{v.emoji}</span>
              <div className="min-w-0 grow">
                <p className="text-[17px] font-bold leading-tight">{v.libelle}</p>
                <p className="mt-1 text-[13px]">{v.description}</p>
              </div>
              {pastille(v)}
              {v.externe ? <ExternalLink size={18} className="shrink-0" color={CYAN} /> : <ChevronRight size={20} className="shrink-0" color={CYAN} />}
            </a>
          </div>
        ))}
      </ContenuAppli>
    </PageAppli>
  );
}
