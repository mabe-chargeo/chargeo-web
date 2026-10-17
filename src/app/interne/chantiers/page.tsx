"use client";

// Chantiers en cours de l'espace Chef de chantier (validé par Matthieu le 17/10/2026, 11 h 06), comme la vue ClickUp
// 🏗️ SUIVI TRAVAUX : chantiers ouverts du Planning, rangés par étape (à planifier, préparation, planifié, en cours),
// avec date d'intervention, technicien, état du feu vert et le bloc 📇 Contact (lu au premier appui).
// Remplace l'ancien menu à 3 liens (Feu vert, Réception sur place, Réceptions à valider), qui sont dans Mon espace.
// 17/10, 12 h 25 : le nom du chantier ouvre la fiche affaire unique (/interne/fiches/<id>), la même que le Pipeline.
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarClock, ChevronRight, ExternalLink, HardHat, MapPin, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, Repere } from '@/components/charte/Appli';
import { CYAN, GRIS, ORANGE } from '@/components/charte/couleurs';
import { BlocContact } from '@/components/ui/BlocContact';

type Chantier = {
  id: string; nom: string; statut: string; couleurStatut: string; etape: number; quand: string;
  techniciens: string[]; segment: string; typeClient: string; adresse: string; feuVert: 'donne' | 'a-donner' | 'incomplet'; url: string;
};

const FEU: Record<Chantier['feuVert'], { texte: string; couleur: string }> = {
  donne: { texte: '🟢 Feu vert donné', couleur: '#16a34a' },
  'a-donner': { texte: '🚦 Feu vert à donner', couleur: CYAN },
  incomplet: { texte: '❌ Prérequis incomplets', couleur: ORANGE },
};

export default function ChantiersPage() {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/chantiers', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
      else setChantiers(data.chantiers || []);
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { charger(); }, []);

  const etapes: { statut: string; liste: Chantier[] }[] = [];
  for (const c of chantiers) {
    const g = etapes.find((e) => e.statut === c.statut);
    if (g) g.liste.push(c);
    else etapes.push({ statut: c.statut, liste: [c] });
  }

  const boutonRetour = (
    <a href="/interne/espace" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Mon espace
    </a>
  );

  const carte = (c: Chantier) => (
    <div key={c.id} className="space-y-3 rounded-[20px] p-5" style={{ backgroundColor: GRIS }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white" style={{ backgroundColor: c.couleurStatut || '#9aa3ad' }}>
          {c.statut}
        </span>
        {(c.typeClient || c.segment) && <span className="text-[12px] font-bold text-slate-500">{[c.typeClient, c.segment].filter(Boolean).join(' · ')}</span>}
      </div>
      <a href={`/interne/fiches/${c.id}`} className="flex items-center justify-between gap-2">
        <span className="text-[17px] font-bold leading-tight">{c.nom}</span>
        <ChevronRight size={20} className="shrink-0" color={CYAN} />
      </a>
      <p className="flex items-center gap-1.5 text-[14px] font-bold" style={{ color: c.quand ? CYAN : ORANGE }}>
        <CalendarClock size={15} className="shrink-0" />
        {c.quand ? `Intervention ${c.quand}` : 'Date d’intervention à fixer'}
      </p>
      <p className="flex items-center gap-1.5 text-[13px]">
        <HardHat size={14} className="shrink-0" color={CYAN} />
        {c.techniciens.length ? c.techniciens.join(', ') : 'Technicien à affecter'}
      </p>
      {c.adresse && (
        <p className="flex items-center gap-1.5 text-[13px]">
          <MapPin size={14} className="shrink-0" color={CYAN} />
          <span className="truncate">{c.adresse}</span>
        </p>
      )}
      <a href="/interne/feu-vert" className="inline-block text-[13px] font-bold" style={{ color: FEU[c.feuVert].couleur }}>{FEU[c.feuVert].texte}</a>
      <BlocContact affaireId={c.id} differe />
      <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: CYAN }}>
        <ExternalLink size={13} /> Ouvrir dans ClickUp
      </a>
    </div>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Planning chantiers" titre="Chantiers en cours" action={boutonRetour} />
      <ContenuAppli className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px]">Chantiers ouverts, du « à planifier » au « en cours ». Les réalisés sont dans Réceptions à valider.</p>
          <button onClick={charger} aria-label="Actualiser" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-95">
            <RefreshCw size={18} color={CYAN} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <Alerte>Lecture seule : les chantiers se modifient encore dans ClickUp, sauf le feu vert et la réception.</Alerte>
        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && !chantiers.length && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement des chantiers...</p>
          </Carte>
        )}
        {!loading && !erreur && !chantiers.length && (
          <Carte className="text-center"><p className="text-[15px] font-semibold">Aucun chantier en cours.</p></Carte>
        )}
        {etapes.map((e) => (
          <div key={e.statut} className="space-y-3">
            <div className="h-1" />
            <Repere>{e.statut} ({e.liste.length})</Repere>
            {e.liste.map(carte)}
          </div>
        ))}
      </ContenuAppli>
    </PageAppli>
  );
}
