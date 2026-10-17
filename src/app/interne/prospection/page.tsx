"use client";

// Prospection (Chasse) ❄️ de l'espace Commercial (validé par Matthieu le 17/10/2026, 10 h 44).
// Deux vues comme dans ClickUp : 📞 À appeler aujourd'hui et 🚀 Pipeline chasse (rangé par étape, filtre LinkedIn).
// Chaque prospect a le bloc 📇 Contact complet (Appeler, Google Voice, SMS, Gmail, Waze, Maps), lu au premier appui.
// Lecture seule : la mise à jour du prospect (résultat d'appel, rappel) se fait encore dans ClickUp.
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarClock, ExternalLink, MapPin, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, Repere } from '@/components/charte/Appli';
import { CYAN, GRIS } from '@/components/charte/couleurs';
import { BlocContact } from '@/components/ui/BlocContact';

type VueMenu = { cle: string; libelle: string; n: number };
type Prospect = {
  id: string; nom: string; statut: string; couleurStatut: string; etape: number;
  source: string; typeClient: string; resultat: string; rappel: string; adresse: string; url: string;
};
type Reponse = { vues: VueMenu[]; vue: { cle: string; libelle: string }; linkedin: boolean; prospects: Prospect[] };

export default function ProspectionPage() {
  const [donnees, setDonnees] = useState<Reponse | null>(null);
  const [vue, setVue] = useState('a-appeler');
  const [linkedin, setLinkedin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = async (cle: string, li: boolean) => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/interne/prospection?vue=${encodeURIComponent(cle)}${li ? '&linkedin=1' : ''}`, { cache: 'no-store' });
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
    const p = new URLSearchParams(window.location.search);
    const cle = p.get('vue') || 'a-appeler';
    const li = p.get('linkedin') === '1';
    setVue(cle);
    setLinkedin(li);
    charger(cle, li);
  }, []);

  const choisir = (cle: string, li: boolean) => {
    setVue(cle);
    setLinkedin(li);
    window.history.replaceState(null, '', `/interne/prospection?vue=${encodeURIComponent(cle)}${li ? '&linkedin=1' : ''}`);
    charger(cle, li);
  };

  const boutonRetour = (
    <a href="/interne/espace" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Mon espace
    </a>
  );

  const carte = (p: Prospect) => (
    <div key={p.id} className="space-y-3 rounded-[20px] p-5" style={{ backgroundColor: GRIS }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white" style={{ backgroundColor: p.couleurStatut || '#9aa3ad' }}>
          {p.statut || 'sans statut'}
        </span>
        {(p.typeClient || p.source) && <span className="text-[12px] font-bold text-slate-500">{[p.typeClient, p.source].filter(Boolean).join(' · ')}</span>}
      </div>
      <p className="text-[17px] font-bold leading-tight">{p.nom}</p>
      {(p.rappel || p.resultat) && (
        <p className="flex items-center gap-1.5 text-[14px] font-bold" style={{ color: CYAN }}>
          <CalendarClock size={15} className="shrink-0" color={CYAN} />
          {[p.rappel ? `Rappel ${p.rappel}` : '', p.resultat].filter(Boolean).join(' · ')}
        </p>
      )}
      {p.adresse && (
        <p className="flex items-center gap-1.5 text-[13px]">
          <MapPin size={14} className="shrink-0" color={CYAN} />
          <span className="truncate">{p.adresse}</span>
        </p>
      )}
      <BlocContact affaireId={p.id} differe />
      <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: CYAN }}>
        <ExternalLink size={13} /> Mettre à jour dans ClickUp
      </a>
    </div>
  );

  const prospects = donnees?.prospects || [];
  // Pipeline chasse : rangé par étape, comme les colonnes de la vue ClickUp
  const etapes: { statut: string; liste: Prospect[] }[] = [];
  if (vue === 'chasse') {
    for (const p of prospects) {
      const g = etapes.find((e) => e.statut === p.statut);
      if (g) g.liste.push(p);
      else etapes.push({ statut: p.statut, liste: [p] });
    }
  }

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Prospection" titre={donnees?.vue?.libelle || 'Prospection'} action={boutonRetour} />
      <ContenuAppli className="space-y-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {(donnees?.vues || []).map((v) => {
            const actif = v.cle === vue && !linkedin;
            return (
              <button
                key={v.cle}
                onClick={() => choisir(v.cle, false)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[14px] font-bold transition-transform active:scale-95 ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`}
                style={actif ? { backgroundColor: CYAN } : undefined}
              >
                {v.libelle}
                <span className={`rounded-full px-2 text-[12px] ${actif ? 'bg-white/25' : 'bg-[#eceef1]'}`}>{v.n}</span>
              </button>
            );
          })}
          {vue === 'chasse' && (
            <button
              onClick={() => choisir('chasse', !linkedin)}
              className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-bold transition-transform active:scale-95 ${linkedin ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`}
              style={linkedin ? { backgroundColor: CYAN } : undefined}
            >
              LinkedIn
            </button>
          )}
          <button onClick={() => charger(vue, linkedin)} aria-label="Actualiser" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-[1.5px] ring-[#dfe3e8]">
            <RefreshCw size={16} color={CYAN} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && !donnees && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement des prospects...</p>
          </Carte>
        )}
        {donnees && !loading && !prospects.length && (
          <Carte className="text-center"><p className="text-[15px] font-semibold">Aucun prospect dans cette vue.</p></Carte>
        )}

        <div className={`space-y-3 ${loading && donnees ? 'opacity-50' : ''}`}>
          {vue === 'chasse'
            ? etapes.map((e) => (
              <div key={e.statut} className="space-y-3">
                <div className="h-1" />
                <Repere>{e.statut || 'sans statut'} ({e.liste.length})</Repere>
                {e.liste.map(carte)}
              </div>
            ))
            : prospects.map(carte)}
        </div>
      </ContenuAppli>
    </PageAppli>
  );
}
