"use client";

// Mon espace (un espace par rôle, validé par Matthieu le 17/10/2026) : comme un espace ClickUp, les vues dont le rôle
// a besoin, dans l'ordre de son travail, chacune avec son compteur. Une vue ouvre la liste des fiches ; une fiche ouvre
// la fiche avec le bloc 📇 Contact. Espaces définis dans src/lib/espaces.ts (Commercial validé le 17/10 à 10 h 44).
import { useEffect, useState } from 'react';
import { ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte } from '@/components/charte/Appli';
import { CYAN, GRIS, ORANGE } from '@/components/charte/couleurs';
import { LIBELLE_ROLE } from '@/lib/menusAppli';
import { useRoleAppli } from '@/components/charte/roleAppli';

type Vue = { cle: string; emoji: string; libelle: string; description: string; href: string; urgent?: boolean; n: number | null };
type Reponse = { espace: { titre: string; creer: { libelle: string; href: string } | null } | null; vues: Vue[]; preview: boolean };

export default function EspacePage() {
  const { role } = useRoleAppli();
  const [donnees, setDonnees] = useState<Reponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

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
    if (role) charger(role);
  }, [role]);

  const boutonActualiser = (
    <button
      onClick={() => role && charger(role)}
      aria-label="Actualiser"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-transform active:scale-95"
    >
      <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
    </button>
  );

  const pastille = (v: Vue) => {
    const fond = v.n === null ? '#9aa3ad' : v.n > 0 && v.urgent ? ORANGE : CYAN;
    return (
      <span className="shrink-0 rounded-full px-3 py-1 text-[15px] font-bold text-white" style={{ backgroundColor: fond }}>
        {v.n === null ? '?' : v.n}
      </span>
    );
  };

  return (
    <PageAppli>
      <EnTeteAppli surtitre={role ? LIBELLE_ROLE[role] : 'Application équipe'} titre={donnees?.espace?.titre || 'Mon espace'} action={boutonActualiser} />
      <ContenuAppli className="space-y-3">
        {donnees?.preview && <Alerte>Prévisualisation : affaires lues dans 🧪 Qualification TEST, prospects et contacts dans les vraies listes. Rien n&apos;est modifié.</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && !donnees && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Je compte ce qui t&apos;attend...</p>
          </Carte>
        )}
        {donnees && !donnees.espace && (
          <Carte className="text-center">
            <p className="text-[15px] font-semibold">L&apos;espace {role ? LIBELLE_ROLE[role].toLowerCase() : ''} est en cours de validation avec Matthieu.</p>
          </Carte>
        )}

        {donnees?.espace?.creer && (
          <a
            href={donnees.espace.creer.href}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-[#FF6B00] px-8 py-4 text-[17px] font-semibold text-white shadow-[0_8px_22px_rgba(255,107,0,0.28)] transition-transform active:scale-95"
          >
            <Plus size={20} /> {donnees.espace.creer.libelle}
          </a>
        )}

        {donnees?.vues.map((v) => (
          <a
            key={v.cle}
            href={v.href}
            className={`flex items-center gap-3 rounded-[20px] p-5 transition-transform active:scale-[0.98] ${v.n === 0 ? 'opacity-60' : ''}`}
            style={{ backgroundColor: GRIS }}
          >
            <span className="shrink-0 text-[24px] leading-none" aria-hidden>{v.emoji}</span>
            <div className="min-w-0 grow">
              <p className="text-[17px] font-bold leading-tight">{v.libelle}</p>
              <p className="mt-1 text-[13px]">{v.description}</p>
            </div>
            {pastille(v)}
            <ChevronRight size={20} className="shrink-0" color={CYAN} />
          </a>
        ))}
      </ContenuAppli>
    </PageAppli>
  );
}
