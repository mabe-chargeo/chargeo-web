"use client";

// Chantiers de l'espace Chef de chantier (validé par Matthieu le 17/10/2026, 11 h 06), comme la vue ClickUp
// 🏗️ SUIVI TRAVAUX : chantiers ouverts du Planning, rangés par étape (à planifier, préparation, planifié, en cours),
// avec date d'intervention, technicien, état du feu vert et le bloc 📇 Contact (lu au premier appui).
// 17/10, 12 h 25 : le nom du chantier ouvre la fiche affaire unique (/affaires/<id>), la même que le Pipeline.
// 17/10, 18 h 02 (écrans qui manquent, liste du 11/10) : pastilles (?vue=) Suivi travaux, Prêts (feu vert donné, pas
// encore en cours), En cours, Réserves à lever (sous-tâches « 🔧 Réserve » pas faites, Planning et Parc), Avancement
// (nombre de chantiers par étape, réalisés à réceptionner compris) et Carte des chantiers (comme la carte des visites).
// 17/10, 22 h 49 : bouton « 📅 Planifier la pose » (ou « Décaler la pose ») sur les chantiers à planifier, en préparation
// ou planifiés : /chantiers/<id>/planifier (installateurs, durée, agenda de la semaine).
// 19/10/2026 (2e lot de cohérence) : cartes et boutons sur les briques communes (src/components/charte/Appli.tsx),
// liens ClickUp réservés à la direction et au back-office, bouton Retour de l'en-tête commun.
// 19/10/2026, 18 h 43 : adresses des écrans lues dans src/lib/adresses.ts.
import { useEffect, useState } from 'react';
import { CalendarClock, CalendarPlus, ChevronRight, ExternalLink, HardHat, MapPin, Navigation, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, Repere, LienPrincipal, BoutonSecondaire } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';
import { BlocContact } from '@/components/ui/BlocContact';
import { useRoleAppli } from '@/components/charte/roleAppli';
import { adresses } from '@/lib/adresses';

type Chantier = {
  id: string; nom: string; statut: string; couleurStatut: string; etape: number; quand: string;
  techniciens: string[]; segment: string; typeClient: string; adresse: string; feuVert: 'donne' | 'a-donner' | 'incomplet'; url: string;
};
type Reserve = {
  id: string; nom: string; chantierId: string; chantier: string; auParc: boolean; responsables: string[];
  echeance: number; quand: string; enRetard: boolean; url: string;
};
type Vue = 'suivi' | 'prets' | 'en-cours' | 'reserves' | 'avancement' | 'carte';

const VUES: { cle: Vue; libelle: string }[] = [
  { cle: 'suivi', libelle: 'Suivi travaux' },
  { cle: 'prets', libelle: 'Prêts' },
  { cle: 'en-cours', libelle: 'En cours' },
  { cle: 'reserves', libelle: 'Réserves à lever' },
  { cle: 'avancement', libelle: 'Avancement' },
  { cle: 'carte', libelle: 'Carte' },
];
const ETAPES = ['À planifier', 'Préparation', 'Planifié', 'En cours', 'Réalisé, à réceptionner'];

const FEU: Record<Chantier['feuVert'], { texte: string; couleur: string }> = {
  donne: { texte: '🟢 Feu vert donné', couleur: '#16a34a' },
  'a-donner': { texte: '🚦 Feu vert à donner', couleur: CYAN },
  incomplet: { texte: '❌ Prérequis incomplets', couleur: ORANGE },
};

export default function ChantiersPage() {
  const [vue, setVue] = useState<Vue>('suivi');
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [realises, setRealises] = useState<Chantier[]>([]);
  const [reserves, setReserves] = useState<Reserve[]>([]);
  const [choisi, setChoisi] = useState('');
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const { role } = useRoleAppli();
  const voitClickUp = role === 'direction' || role === 'backOffice';

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/chantiers', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
      else {
        setChantiers(data.chantiers || []);
        setRealises(data.realises || []);
        setReserves(data.reserves || []);
      }
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('vue');
    if (VUES.some((x) => x.cle === v)) setVue(v as Vue);
    charger();
  }, []);

  const choisir = (v: Vue) => {
    setVue(v);
    window.history.replaceState(null, '', v === 'suivi' ? adresses.chantiers : `${adresses.chantiers}?vue=${v}`);
  };

  const prets = chantiers.filter((c) => c.feuVert === 'donne' && c.etape <= 2);
  const enCours = chantiers.filter((c) => c.etape === 3);
  const avecAdresse = chantiers.filter((c) => !!c.adresse);
  const selection = avecAdresse.find((c) => c.id === choisi) || avecAdresse[0] || null;
  const compte: Record<Vue, number | null> = {
    suivi: chantiers.length, prets: prets.length, 'en-cours': enCours.length, reserves: reserves.length, avancement: null, carte: null,
  };

  const grouper = (liste: Chantier[]) => {
    const etapes: { statut: string; liste: Chantier[] }[] = [];
    for (const c of liste) {
      const g = etapes.find((e) => e.statut === c.statut);
      if (g) g.liste.push(c);
      else etapes.push({ statut: c.statut, liste: [c] });
    }
    return etapes;
  };

  const carte = (c: Chantier, surCarte?: () => void) => (
    <Carte key={c.id} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white" style={{ backgroundColor: c.couleurStatut || '#9aa3ad' }}>
          {c.statut}
        </span>
        {(c.typeClient || c.segment) && <span className="text-[12px] font-bold text-slate-500">{[c.typeClient, c.segment].filter(Boolean).join(' · ')}</span>}
      </div>
      <a href={adresses.affaire(c.id)} className="flex items-center justify-between gap-2">
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
      {c.etape <= 2 && (
        <a href={adresses.planifierPose(c.id)} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-bold text-white transition-transform active:scale-95" style={{ backgroundColor: CYAN }}>
          <CalendarPlus size={15} /> {c.quand ? 'Décaler la pose' : 'Planifier la pose'}
        </a>
      )}
      {c.adresse && (
        <p className="flex items-center gap-1.5 text-[13px]">
          <MapPin size={14} className="shrink-0" color={CYAN} />
          <span className="truncate">{c.adresse}</span>
        </p>
      )}
      <a href={adresses.feuVert} className="inline-block text-[13px] font-bold" style={{ color: FEU[c.feuVert].couleur }}>{FEU[c.feuVert].texte}</a>
      {surCarte ? (
        <button onClick={surCarte} className="block text-[13px] font-bold" style={{ color: CYAN }}>Voir sur la carte</button>
      ) : (
        <BlocContact affaireId={c.id} differe />
      )}
      {voitClickUp && (
        <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: CYAN }}>
          <ExternalLink size={13} /> Ouvrir dans ClickUp
        </a>
      )}
    </Carte>
  );

  const listeParEtape = (liste: Chantier[], vide: string) => (
    <>
      {!loading && !erreur && !liste.length && <Carte className="text-center"><p className="text-[15px] font-semibold">{vide}</p></Carte>}
      {grouper(liste).map((e) => (
        <div key={e.statut} className="space-y-3">
          <div className="h-1" />
          <Repere>{e.statut} ({e.liste.length})</Repere>
          {e.liste.map((c) => carte(c))}
        </div>
      ))}
    </>
  );

  const ligneReserve = (r: Reserve) => (
    <Carte key={r.id} className={r.enRetard ? 'shadow-[inset_5px_0_0_#FF6B00]' : ''}>
      <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">{r.chantier}{r.auParc ? ' · au Parc' : ''}</p>
      <p className="mt-1 text-[17px] font-bold leading-tight">{r.nom}</p>
      <p className="mt-1.5 flex items-center gap-1.5 text-[14px] font-bold" style={{ color: r.enRetard || !r.quand ? ORANGE : CYAN }}>
        <CalendarClock size={15} className="shrink-0" />
        {r.quand ? `${r.enRetard ? 'Échéance dépassée' : 'À lever'} ${r.quand}` : 'Échéance à fixer'}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-[13px]">
        <HardHat size={14} className="shrink-0" color={CYAN} />
        {r.responsables.length ? r.responsables.join(', ') : 'Responsable à désigner'}
      </p>
      <div className="mt-2 flex flex-wrap gap-4">
        {!r.auParc && <a href={adresses.affaire(r.chantierId)} className="text-[13px] font-bold" style={{ color: CYAN }}>Ouvrir le chantier</a>}
        {voitClickUp && (
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: CYAN }}>
            <ExternalLink size={13} /> Ouvrir la réserve dans ClickUp
          </a>
        )}
      </div>
    </Carte>
  );

  // Avancement : nombre de chantiers par étape (barre proportionnelle)
  const parEtape = [0, 1, 2, 3].map((i) => chantiers.filter((c) => c.etape === i).length).concat([realises.length]);
  const maxEtape = Math.max(1, ...parEtape);
  const feuVertDonnes = chantiers.filter((c) => c.feuVert === 'donne').length;
  const sansDate = chantiers.filter((c) => !c.quand).length;
  const sansTech = chantiers.filter((c) => !c.techniciens.length).length;

  const itineraire = (cs: Chantier[]) => {
    const pts = cs.map((c) => c.adresse).filter(Boolean);
    if (!pts.length) return '';
    const etapes = pts.slice(0, -1).join('|');
    return `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(pts[pts.length - 1])}${etapes ? `&waypoints=${encodeURIComponent(etapes)}` : ''}`;
  };

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Planning chantiers" titre="Chantiers" retour={{ href: adresses.aTraiter, libelle: 'Mon espace' }} />
      <ContenuAppli className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {VUES.map((v) => (
              <button
                key={v.cle}
                onClick={() => choisir(v.cle)}
                className={`rounded-full px-4 py-2 text-[14px] font-bold transition-transform active:scale-95 ${vue === v.cle ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`}
                style={vue === v.cle ? { backgroundColor: CYAN } : undefined}
              >
                {v.libelle}{compte[v.cle] !== null && !loading ? ` · ${compte[v.cle]}` : ''}
              </button>
            ))}
          </div>
          <button onClick={charger} aria-label="Actualiser" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-95">
            <RefreshCw size={18} color={CYAN} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <Alerte>Les chantiers se modifient encore dans ClickUp, sauf la planification de la pose, le feu vert et la réception.</Alerte>
        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && !chantiers.length && !reserves.length && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement des chantiers...</p>
          </Carte>
        )}

        {vue === 'suivi' && (
          <>
            <p className="px-1 text-[13px]">Chantiers ouverts, du « à planifier » au « en cours ». Les réalisés sont dans Réceptions à valider.</p>
            {listeParEtape(chantiers, 'Aucun chantier ouvert.')}
          </>
        )}

        {vue === 'prets' && (
          <>
            <p className="px-1 text-[13px]">Feu vert donné, travaux pas encore commencés : les équipes peuvent y aller.</p>
            {listeParEtape(prets, 'Aucun chantier prêt : pas de feu vert donné sur un chantier pas encore commencé.')}
          </>
        )}

        {vue === 'en-cours' && listeParEtape(enCours, 'Aucun chantier en cours.')}

        {vue === 'reserves' && (
          <>
            <p className="px-1 text-[13px]">Réserves mineures notées à la réception et pas encore levées, y compris sur les chantiers déjà passés au Parc.</p>
            {!loading && !erreur && !reserves.length && <Carte className="text-center"><p className="text-[15px] font-semibold">Aucune réserve à lever.</p></Carte>}
            {reserves.map(ligneReserve)}
          </>
        )}

        {vue === 'avancement' && !loading && (
          <>
            <Carte className="space-y-3">
              {ETAPES.map((libelle, i) => (
                <div key={libelle}>
                  <div className="flex justify-between text-[14px] font-bold">
                    <span>{libelle}</span>
                    <span>{parEtape[i]}</span>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-[#eef1f4]">
                    <div className="h-full rounded-full" style={{ width: `${Math.round((parEtape[i] / maxEtape) * 100)}%`, backgroundColor: i === 4 ? '#16a34a' : CYAN }} />
                  </div>
                </div>
              ))}
            </Carte>
            <Carte className="space-y-2">
              <p className="text-[15px] font-bold">Sur les {chantiers.length} chantier{chantiers.length > 1 ? 's' : ''} ouvert{chantiers.length > 1 ? 's' : ''}</p>
              <p className="text-[14px]">🟢 Feu vert donné : <b>{feuVertDonnes}</b></p>
              <p className="text-[14px]" style={{ color: sansDate ? ORANGE : undefined }}>📅 Sans date d’intervention : <b>{sansDate}</b></p>
              <p className="text-[14px]" style={{ color: sansTech ? ORANGE : undefined }}>👷 Sans technicien : <b>{sansTech}</b></p>
              <p className="text-[14px]" style={{ color: reserves.length ? ORANGE : undefined }}>🔧 Réserves à lever : <b>{reserves.length}</b></p>
            </Carte>
            {realises.length > 0 && (
              <BoutonSecondaire href={adresses.receptionChantiers} compact>
                ✅ {realises.length} réception{realises.length > 1 ? 's' : ''} à valider
              </BoutonSecondaire>
            )}
          </>
        )}

        {vue === 'carte' && !loading && (
          <>
            {selection ? (
              <div className="overflow-hidden rounded-[20px] ring-[1.5px] ring-[#dfe3e8]">
                <iframe
                  title={`Carte : ${selection.nom}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(selection.adresse)}&z=15&output=embed`}
                  className="h-[280px] w-full border-0"
                  loading="lazy"
                />
                <p className="bg-white px-4 py-2 text-[14px] font-bold">{selection.nom}{selection.quand ? ` · ${selection.quand}` : ''}</p>
              </div>
            ) : (
              <Carte className="text-center"><p className="text-[15px] font-semibold">Aucun chantier ouvert avec une adresse.</p></Carte>
            )}
            {avecAdresse.length > 1 && itineraire(avecAdresse) && (
              <LienPrincipal href={itineraire(avecAdresse)}>
                <Navigation size={18} /> Tous les chantiers dans Google Maps ({avecAdresse.length})
              </LienPrincipal>
            )}
            {chantiers.length > avecAdresse.length && (
              <p className="px-1 text-[13px]" style={{ color: ORANGE }}>{chantiers.length - avecAdresse.length} chantier{chantiers.length - avecAdresse.length > 1 ? 's' : ''} sans adresse, absent{chantiers.length - avecAdresse.length > 1 ? 's' : ''} de la carte.</p>
            )}
            {avecAdresse.map((c) => carte(c, () => { setChoisi(c.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }))}
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
