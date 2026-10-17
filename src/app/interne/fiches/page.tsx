"use client";

// Écran Pipeline de l'application équipe (ex-« Fiches », structure validée par Matthieu le 16/10/2026, renommé le 17/10
// selon les écrans par rôle du 11/10) : la fiche voyageuse, avec un sous-menu de vues comme dans ClickUp (À caler,
// Relevés planifiés, Devis à chiffrer…), chacune avec son compteur.
// Adresse /interne/fiches?vue=<clé> : Ma journée ouvre directement la bonne vue. Une fiche ouvre sa fiche détaillée.
// La vue est lue dans l'adresse après chargement (page pré-générée, pas de useSearchParams).
import { useEffect, useState } from 'react';
import { CalendarClock, ChevronRight, GitBranch, MapPin, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte } from '@/components/charte/Appli';
import { CYAN, GRIS } from '@/components/charte/couleurs';

type VueMenu = { cle: string; libelle: string; n: number };
type Fiche = {
  id: string;
  nom: string;
  statut: string;
  couleurStatut: string;
  typeClient: string;
  segment: string;
  quand: string;
  adresse: string;
  scenarios: number;
};
type Reponse = { vues: VueMenu[]; vue: { cle: string; libelle: string; description: string } | null; fiches: Fiche[]; preview: boolean };

export default function FichesPage() {
  const [donnees, setDonnees] = useState<Reponse | null>(null);
  const [vue, setVue] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = async (cle: string) => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/interne/fiches${cle ? `?vue=${encodeURIComponent(cle)}` : ''}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
      else {
        setDonnees(data as Reponse);
        if (data?.vue?.cle) setVue(String(data.vue.cle));
      }
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cle = new URLSearchParams(window.location.search).get('vue') || '';
    setVue(cle);
    charger(cle);
  }, []);

  const choisir = (cle: string) => {
    if (cle === vue) return;
    setVue(cle);
    window.history.replaceState(null, '', `/interne/fiches?vue=${encodeURIComponent(cle)}`);
    charger(cle);
  };

  const boutonActualiser = (
    <button
      onClick={() => charger(vue)}
      aria-label="Actualiser"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-transform active:scale-95"
    >
      <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
    </button>
  );

  const carteFiche = (f: Fiche) => (
    <a key={f.id} href={`/interne/fiches/${f.id}`} className="flex items-center gap-3 rounded-[20px] p-5 transition-transform active:scale-[0.98]" style={{ backgroundColor: GRIS }}>
      <div className="min-w-0 grow">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white"
            style={{ backgroundColor: f.couleurStatut || '#9aa3ad' }}
          >
            {f.statut || 'sans statut'}
          </span>
          {(f.typeClient || f.segment) && (
            <span className="text-[12px] font-bold text-slate-500">{[f.typeClient, f.segment].filter(Boolean).join(' · ')}</span>
          )}
        </div>
        <p className="mt-1.5 text-[17px] font-bold leading-tight">{f.nom}</p>
        {f.quand && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[14px] font-bold" style={{ color: CYAN }}>
            <CalendarClock size={15} className="shrink-0" color={CYAN} />
            {f.quand}
          </p>
        )}
        {f.adresse && (
          <p className="mt-1 flex items-center gap-1.5 text-[13px]">
            <MapPin size={14} className="shrink-0" color={CYAN} />
            <span className="truncate">{f.adresse}</span>
          </p>
        )}
        {f.scenarios > 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold">
            <GitBranch size={14} className="shrink-0" color={CYAN} />
            {f.scenarios} scénario{f.scenarios > 1 ? 's' : ''}
          </p>
        )}
      </div>
      <ChevronRight size={22} className="shrink-0" color={CYAN} />
    </a>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Pipeline" titre={donnees?.vue?.libelle || 'Pipeline'} action={boutonActualiser} />

      <ContenuAppli className="space-y-4">
        {donnees?.preview && <Alerte>Prévisualisation : fiches lues dans 🧪 Qualification TEST. Rien n'est modifié.</Alerte>}

        {!!donnees?.vues.length && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {donnees.vues.map((v) => {
              const actif = v.cle === vue;
              return (
                <button
                  key={v.cle}
                  onClick={() => choisir(v.cle)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[14px] font-bold transition-transform active:scale-95 ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`}
                  style={actif ? { backgroundColor: CYAN } : undefined}
                >
                  {v.libelle}
                  <span className={`rounded-full px-2 text-[12px] ${actif ? 'bg-white/25' : 'bg-[#eceef1]'}`}>{v.n}</span>
                </button>
              );
            })}
          </div>
        )}

        {donnees?.vue?.description && <p className="px-1 text-[14px]">{donnees.vue.description}</p>}
        {erreur && <Alerte>{erreur}</Alerte>}

        {loading && !donnees && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement des fiches...</p>
          </Carte>
        )}

        {donnees && !donnees.vues.length && <Alerte>Aucune vue de fiches pour ton rôle.</Alerte>}
        {donnees && !!donnees.vues.length && !donnees.fiches.length && !loading && (
          <Carte className="text-center">
            <p className="text-[15px] font-semibold">Aucune fiche dans cette vue.</p>
          </Carte>
        )}
        <div className={`space-y-3 ${loading && donnees ? 'opacity-50' : ''}`}>{donnees?.fiches.map(carteFiche)}</div>
      </ContenuAppli>
    </PageAppli>
  );
}
