"use client";

// Agenda des visites (lot B des écrans manquants, 17/10/2026). LECTURE SEULE.
// Pastilles Jour, Semaine, Carte des visites (carte des menus). Jour : les relevés du jour avec l'itinéraire Google Maps
// dans l'ordre des heures. Semaine : les 7 prochains jours (et les visites passées pas encore faites). Carte : la carte
// de la visite choisie, toutes les visites à venir en dessous. Chaque visite ouvre la fiche affaire.
// 19/10/2026 (2e lot de cohérence) : cartes et boutons sur les briques communes (src/components/charte/Appli.tsx),
// bouton Retour de l'en-tête commun.
import { useEffect, useState } from 'react';
import { CalendarClock, ChevronRight, MapPin, Navigation, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, LienPrincipal } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';
import { adresses } from '@/lib/adresses';

type Visite = { id: string; nom: string; jour: string; heure: string; ms: number; typeClient: string; adresse: string; lat: number | null; lng: number | null; lien: string };

const aujourdhui = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const plusJours = (jour: string, n: number) => {
  const d = new Date(`${jour}T12:00:00`);
  d.setDate(d.getDate() + n);
  return new Intl.DateTimeFormat('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
};
const libelleJour = (jour: string, auj: string) => {
  if (jour === auj) return "Aujourd'hui";
  if (jour === plusJours(auj, 1)) return 'Demain';
  const t = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${jour}T12:00:00`));
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const point = (v: Visite) => (v.lat && v.lng ? `${v.lat},${v.lng}` : v.adresse);
// Itinéraire Google Maps depuis la position du téléphone, étapes dans l'ordre des heures
const itineraire = (vs: Visite[]) => {
  const pts = vs.map(point).filter(Boolean);
  if (!pts.length) return '';
  const destination = pts[pts.length - 1];
  const etapes = pts.slice(0, -1).join('|');
  return `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(destination)}${etapes ? `&waypoints=${encodeURIComponent(etapes)}` : ''}`;
};

export default function AgendaPage() {
  const [visites, setVisites] = useState<Visite[]>([]);
  const [aCaler, setACaler] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);
  const [vue, setVue] = useState<'jour' | 'semaine' | 'carte'>('jour');
  const [choisie, setChoisie] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [auj, setAuj] = useState('');

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    setAuj(aujourdhui());
    try {
      const res = await fetch('/api/interne/agenda', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
      else { setVisites(data.visites || []); setACaler(data.aCaler ?? null); setPreview(!!data.preview); }
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('vue');
    if (v === 'semaine' || v === 'carte') setVue(v);
    charger();
  }, []);

  const duJour = visites.filter((v) => v.jour === auj);
  const passees = visites.filter((v) => v.jour < auj);
  const fin = auj ? plusJours(auj, 7) : '';
  const semaine = visites.filter((v) => v.jour >= auj && v.jour < fin);
  const aVenir = visites.filter((v) => v.jour >= auj);
  const jours = semaine.map((v) => v.jour).filter((j, i, t) => t.indexOf(j) === i);
  const selection = visites.find((v) => v.id === choisie) || aVenir[0] || null;

  const ligne = (v: Visite, onClick?: () => void) => (
    <div key={v.id} className="rounded-[16px] bg-white p-4 ring-[1.5px] ring-[#dfe3e8]">
      <a href={v.lien} className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: v.jour < auj ? ORANGE : CYAN }}>
            <CalendarClock size={14} /> {v.heure || 'heure à caler'}{v.typeClient ? ` · ${v.typeClient}` : ''}
          </p>
          <p className="mt-0.5 text-[16px] font-bold leading-tight">{v.nom}</p>
          {v.adresse && <p className="mt-1 flex items-center gap-1 truncate text-[13px]"><MapPin size={13} className="shrink-0" color={CYAN} /> {v.adresse}</p>}
        </div>
        <ChevronRight size={20} className="shrink-0" color={CYAN} />
      </a>
      {onClick && (
        <button onClick={onClick} className="mt-2 text-[13px] font-bold" style={{ color: CYAN }}>Voir sur la carte</button>
      )}
    </div>
  );

  const boutonItineraire = (vs: Visite[]) => {
    const url = itineraire(vs);
    return url ? (
      <LienPrincipal href={url}>
        <Navigation size={18} /> Itinéraire ({vs.length} visite{vs.length > 1 ? 's' : ''})
      </LienPrincipal>
    ) : null;
  };

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Relevés techniques" titre="Agenda des visites" retour={{ href: adresses.aTraiter, libelle: "Mon espace" }} />
      <ContenuAppli className="space-y-4">
        {preview && <Alerte>Preview : visites lues dans 🧪 Qualification TEST.</Alerte>}
        <div className="grid grid-cols-3 gap-1 rounded-full bg-[#eef1f4] p-1">
          {(['jour', 'semaine', 'carte'] as const).map((v) => (
            <button key={v} onClick={() => setVue(v)} className={`rounded-full py-2.5 text-[15px] font-bold ${vue === v ? 'bg-white shadow' : ''}`}>
              {v === 'jour' ? 'Jour' : v === 'semaine' ? 'Semaine' : 'Carte'}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 px-1">
          {aCaler !== null && aCaler > 0 ? (
            <a href={`${adresses.pipeline}?vue=a-caler`} className="text-[14px] font-bold" style={{ color: ORANGE }}>{aCaler} visite{aCaler > 1 ? 's' : ''} encore à caler</a>
          ) : <span />}
          <button onClick={charger} aria-label="Actualiser" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-[1.5px] ring-[#dfe3e8]">
            <RefreshCw size={16} color={CYAN} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && !visites.length && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement de l&apos;agenda...</p>
          </Carte>
        )}

        {vue === 'jour' && !loading && (
          <>
            {passees.length > 0 && <p className="px-1 text-[14px] font-bold" style={{ color: ORANGE }}>{passees.length} visite{passees.length > 1 ? 's' : ''} passée{passees.length > 1 ? 's' : ''} pas encore envoyée{passees.length > 1 ? 's' : ''} : voir Semaine.</p>}
            {!duJour.length && <Carte className="text-center"><p className="text-[15px] font-semibold">Aucune visite aujourd&apos;hui.</p></Carte>}
            {duJour.length > 0 && boutonItineraire(duJour)}
            {duJour.map((v) => ligne(v))}
          </>
        )}

        {vue === 'semaine' && !loading && (
          <>
            {passees.length > 0 && (
              <div className="space-y-2">
                <p className="px-1 text-[13px] font-extrabold uppercase tracking-[0.1em]" style={{ color: ORANGE }}>Passées, pas encore envoyées · {passees.length}</p>
                {passees.map((v) => ligne(v))}
              </div>
            )}
            {!jours.length && <Carte className="text-center"><p className="text-[15px] font-semibold">Aucune visite dans les 7 prochains jours.</p></Carte>}
            {jours.map((j) => {
              const vs = semaine.filter((v) => v.jour === j);
              return (
                <div key={j} className="space-y-2">
                  <p className="px-1 text-[13px] font-extrabold uppercase tracking-[0.1em]">{libelleJour(j, auj)} · {vs.length}</p>
                  {vs.map((v) => ligne(v))}
                  {vs.length > 1 && boutonItineraire(vs)}
                </div>
              );
            })}
          </>
        )}

        {vue === 'carte' && !loading && (
          <>
            {selection ? (
              <div className="overflow-hidden rounded-[20px] ring-[1.5px] ring-[#dfe3e8]">
                <iframe
                  title={`Carte : ${selection.nom}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(point(selection))}&z=15&output=embed`}
                  className="h-[280px] w-full border-0"
                  loading="lazy"
                />
                <p className="bg-white px-4 py-2 text-[14px] font-bold">{selection.nom} · {libelleJour(selection.jour, auj)}{selection.heure ? ` ${selection.heure}` : ''}</p>
              </div>
            ) : <Carte className="text-center"><p className="text-[15px] font-semibold">Aucune visite à venir.</p></Carte>}
            {aVenir.map((v) => ligne(v, () => setChoisie(v.id)))}
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
