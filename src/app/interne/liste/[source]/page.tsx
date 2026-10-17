"use client";

// Écran de liste générique (lot « écrans qui manquent », 17/10/2026, 14 h 28) : Commandes, SAV, Maintenance, Factures,
// Achats, ADVENIR, Parc, RH, Salariés, Recrutement, CODIR, OKR, Kaizen, To-Do. Remplace l'ouverture de ClickUp depuis Mon
// espace.
// Pastilles : les vues de l'espace (mêmes compteurs que Mon espace), « Tous », puis une par statut. Recherche par nom.
// Une carte ouvre la fiche générique /interne/element/<id> (ou la fiche affaire pour Prospection à Parc).
// ?vue=<clé> ouvre directement la vue (liens de Mon espace).
// 17/10, 19 h 00 : carte « Totaux » sous les pastilles quand la liste a des montants (ADVENIR : primes estimées et
// réelles ; factures ; achats), calculée sur les fiches affichées (vue, statut et recherche), avec le nombre de fiches
// sans montant.
// 17/10, 19 h 10 : bouton de création en tête quand la liste en a un (+ Salarié, + Candidat).
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, BadgeEuro, CalendarClock, ChevronRight, ExternalLink, RefreshCw, Search, User } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, CHAMP, TitreCarte } from '@/components/charte/Appli';
import { CYAN, GRIS, ORANGE } from '@/components/charte/couleurs';

type Element = {
  id: string; nom: string; statut: string; couleurStatut: string; echeance: string; echeanceMs: number | null;
  assignes: string[]; champs: { nom: string; texte: string }[]; montants?: (number | null)[]; vues: string[]; aMoi: boolean;
};
type Liste = {
  source: string; titre: string; emoji: string; note: string; vues: { cle: string; libelle: string }[]; totaux?: string[];
  creer?: { libelle: string; href: string } | null; restreint: boolean; elements: Element[]; url: string;
};

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const sansEmoji = (s: string) => s.replace(/^[^A-Za-z0-9\u00C0-\u017F]+/, '').trim();
const euros = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function ListePage() {
  const params = useParams<{ source: string }>();
  const source = String(params?.source || '');
  const [liste, setListe] = useState<Liste | null>(null);
  const [filtre, setFiltre] = useState('');
  const [recherche, setRecherche] = useState('');
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/interne/listes?source=${encodeURIComponent(source)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
      else setListe(data as Liste);
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const vue = new URLSearchParams(window.location.search).get('vue') || '';
    if (vue) setFiltre(`v:${vue}`);
    charger();
  }, [source]);

  const elements = liste?.elements || [];
  const statuts = elements.map((e) => e.statut).filter((s, i, t) => !!s && t.indexOf(s) === i);
  const couleurDe = (s: string) => elements.find((e) => e.statut === s)?.couleurStatut || '#9aa3ad';
  const garde = (e: Element) => {
    if (filtre.startsWith('v:')) return e.vues.includes(filtre.slice(2));
    if (filtre.startsWith('s:')) return e.statut === filtre.slice(2);
    return true;
  };
  const q = normal(recherche.trim());
  const visibles = elements.filter((e) => garde(e) && (!q || normal(`${e.nom} ${e.champs.map((c) => c.texte).join(' ')}`).includes(q)));

  // Totaux des fiches affichées, un par champ monétaire de la liste
  const libellesTotaux = liste?.totaux || [];
  const totaux = libellesTotaux.map((libelle, i) => {
    const valeurs = visibles.map((e) => (e.montants || [])[i]);
    const remplis = valeurs.filter((v): v is number => typeof v === 'number');
    return { libelle, somme: remplis.reduce((s, v) => s + v, 0), sansMontant: valeurs.length - remplis.length };
  });

  const pastille = (cle: string, libelle: string, n: number, couleur?: string, urgent = false) => {
    const actif = filtre === cle;
    return (
      <button
        key={cle || 'tous'}
        onClick={() => setFiltre(cle)}
        className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[14px] font-bold transition-transform active:scale-95 ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`}
        style={actif ? { backgroundColor: couleur || CYAN } : undefined}
      >
        {libelle}
        <span className={`rounded-full px-2 text-[12px] ${actif ? 'bg-white/25' : urgent && n > 0 ? 'text-white' : 'bg-[#eceef1]'}`} style={!actif && urgent && n > 0 ? { backgroundColor: ORANGE } : undefined}>{n}</span>
      </button>
    );
  };

  const boutonRetour = (
    <a href="/interne/espace" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Mon espace
    </a>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre={liste ? `${liste.emoji} ${liste.restreint ? 'Mes tâches' : 'Liste'}` : 'Liste'} titre={liste?.titre || 'Liste'} action={boutonRetour} />
      <ContenuAppli className="space-y-4">
        {liste?.note && <p className="px-1 text-[13px]">{liste.note}</p>}
        {liste?.creer && (
          <a href={liste.creer.href} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-8 py-4 text-[17px] font-semibold text-white shadow-[0_8px_22px_rgba(255,107,0,0.28)] transition-transform active:scale-95">
            {liste.creer.libelle}
          </a>
        )}
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" color={CYAN} />
          <input className={`${CHAMP} pl-11`} placeholder="Rechercher" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </div>

        {liste && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {liste.vues.map((v) => pastille(`v:${v.cle}`, v.libelle, elements.filter((e) => e.vues.includes(v.cle)).length, undefined, true))}
            {pastille('', 'Tous', elements.length)}
            {statuts.map((s) => pastille(`s:${s}`, sansEmoji(s) || s, elements.filter((e) => e.statut === s).length, couleurDe(s)))}
            <button onClick={charger} aria-label="Actualiser" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-[1.5px] ring-[#dfe3e8]">
              <RefreshCw size={16} color={CYAN} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        )}

        {liste && visibles.length > 0 && totaux.length > 0 && (
          <Carte accent className="space-y-2">
            <TitreCarte icon={BadgeEuro} extra={<span className="text-[13px] font-bold">{visibles.length} fiche{visibles.length > 1 ? 's' : ''}</span>}>Totaux</TitreCarte>
            {totaux.map((t) => (
              <div key={t.libelle} className="flex items-baseline justify-between gap-3 pt-1">
                <span className="text-[14px] font-semibold">{t.libelle}</span>
                <span className="text-right">
                  <span className="text-[18px] font-extrabold">{euros(t.somme)}</span>
                  {t.sansMontant > 0 && <span className="block text-[12px] font-semibold text-slate-500">{t.sansMontant} sans montant</span>}
                </span>
              </div>
            ))}
          </Carte>
        )}

        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && !liste && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement...</p>
          </Carte>
        )}
        {liste && !visibles.length && <Carte className="text-center"><p className="text-[15px] font-semibold">Rien à afficher ici.</p></Carte>}

        {visibles.map((e) => (
          <a key={e.id} href={`/interne/element/${e.id}`} className="block rounded-[20px] p-5 transition-transform active:scale-[0.98]" style={{ backgroundColor: GRIS }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white" style={{ backgroundColor: e.couleurStatut || '#9aa3ad' }}>
                  {e.statut}
                </span>
                <p className="mt-1.5 text-[17px] font-bold leading-tight">{e.nom}</p>
                {e.champs.map((c) => (
                  <p key={c.nom} className="mt-1 truncate text-[13px]"><span className="text-slate-500">{sansEmoji(c.nom)} : </span><span className="font-semibold">{c.texte}</span></p>
                ))}
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-semibold">
                  {e.echeance && <span className="flex items-center gap-1"><CalendarClock size={14} color={CYAN} /> {e.echeance}</span>}
                  {e.assignes.length > 0 && <span className="flex items-center gap-1"><User size={14} color={CYAN} /> {e.assignes.join(', ')}</span>}
                </div>
              </div>
              <ChevronRight size={22} className="shrink-0" color={CYAN} />
            </div>
          </a>
        ))}

        {liste?.url && (
          <div className="pt-2 text-center">
            <a href={liste.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: CYAN }}>
              <ExternalLink size={13} /> Ouvrir la liste dans ClickUp
            </a>
          </div>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
