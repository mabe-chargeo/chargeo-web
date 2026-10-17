"use client";

// Mes interventions et Mes tickets SAV de l'espace Installateur (validé par Matthieu le 17/10/2026, 11 h 18).
// /interne/interventions : poses et visites de maintenance qui me sont affectées, rangées par jour (aujourd'hui, demain,
// cette semaine, plus tard, sans date), avec l'itinéraire du jour dans Google Maps (toutes les adresses du jour).
// /interne/interventions?vue=sav : mes tickets SAV pas encore résolus.
// Hors ligne : la dernière liste reçue est gardée sur le téléphone et réaffichée sans réseau, avec son heure de mise
// à jour (lecture seule ; le bloc Contact demande du réseau). Chaque intervention a le bloc 📇 Contact.
// 17/10, 12 h 33 : le nom ouvre la fiche affaire unique de l'affaire liée (le chantier pour une pose, l'installation du
// Parc pour une visite ou un SAV).
// 17/10, 13 h (étape 2, fiche intervention validée) : chaque pose a le bouton « Saisie à la pose » (/interne/pose/<id>),
// et « Préparer ma journée hors ligne » garde sur le téléphone le matériel prévu des poses d'aujourd'hui et de demain
// (modèle Procore / ServiceTitan de la recherche du 17/10 : ouvrir avant de perdre le réseau).
// 17/10, 14 h 50 : chaque visite de maintenance a le bouton « Visite de maintenance » (/interne/maintenance/<id>),
// protocole Sefram MW9665 avec l'adaptateur A1532-XA, point de charge par point de charge.
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarClock, ChevronRight, Download, ExternalLink, HardHat, MapPin, Navigation, RefreshCw, WifiOff } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, Repere } from '@/components/charte/Appli';
import { CYAN, GRIS, ORANGE } from '@/components/charte/couleurs';
import { BlocContact } from '@/components/ui/BlocContact';

type Item = {
  id: string; type: 'pose' | 'visite' | 'sav'; nom: string; statut: string; couleurStatut: string;
  date: number; jour: string; quand: string; detail: string; techniciens: string[]; adresse: string;
  contactId: string; url: string; action: { libelle: string; href: string } | null;
};
type Reponse = { vue: 'interventions' | 'sav'; aujourdhui: string; equipe: boolean; items: Item[]; lu: number };

const cleCache = (vue: string) => `chargeo_interventions_${vue}`;
const CLE_PREPARATION = 'chargeo_journee_preparee';
const decaler = (jour: string, n: number): string => {
  const [a, m, j] = jour.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j + n));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};
const heure = (ms: number) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));

export default function InterventionsPage() {
  const [vue, setVue] = useState<'interventions' | 'sav'>('interventions');
  const [donnees, setDonnees] = useState<Reponse | null>(null);
  const [horsLigne, setHorsLigne] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [preparation, setPreparation] = useState<{ le: number; n: number } | null>(null);
  const [prepEnCours, setPrepEnCours] = useState(false);
  const [prepMessage, setPrepMessage] = useState<string | null>(null);

  const charger = async (v: 'interventions' | 'sav') => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/interne/interventions?vue=${v}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        setErreur(data?.error || `Lecture impossible (${res.status})`);
      } else {
        setDonnees(data as Reponse);
        setHorsLigne(false);
        try { localStorage.setItem(cleCache(v), JSON.stringify(data)); } catch {}
      }
    } catch {
      // Pas de réseau : dernière liste gardée sur le téléphone
      try {
        const brut = localStorage.getItem(cleCache(v));
        if (brut) { setDonnees(JSON.parse(brut) as Reponse); setHorsLigne(true); }
        else setErreur('Pas de réseau, et aucune liste gardée sur ce téléphone. Ouvre l’écran une fois avec du réseau.');
      } catch {
        setErreur('Pas de réseau.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('vue') === 'sav' ? 'sav' : 'interventions';
    setVue(v);
    charger(v);
    try {
      const p = JSON.parse(localStorage.getItem(CLE_PREPARATION) || 'null');
      if (p && typeof p.le === 'number') setPreparation(p);
    } catch {}
  }, []);

  const choisir = (v: 'interventions' | 'sav') => {
    setVue(v);
    setDonnees(null);
    window.history.replaceState(null, '', v === 'sav' ? '/interne/interventions?vue=sav' : '/interne/interventions');
    charger(v);
  };

  const items = donnees?.items || [];
  const auj = donnees?.aujourdhui || '';
  const demain = auj ? decaler(auj, 1) : '';
  const semaine = auj ? decaler(auj, 7) : '';
  const groupes: { titre: string; liste: Item[] }[] = [
    { titre: "Aujourd'hui", liste: items.filter((i) => !!i.jour && i.jour <= auj) },
    { titre: 'Demain', liste: items.filter((i) => i.jour === demain) },
    { titre: 'Cette semaine', liste: items.filter((i) => !!i.jour && i.jour > demain && i.jour <= semaine) },
    { titre: 'Plus tard', liste: items.filter((i) => !!i.jour && i.jour > semaine) },
    { titre: 'Sans date', liste: items.filter((i) => !i.jour) },
  ].filter((g) => g.liste.length > 0);

  // Itinéraire du jour : toutes les adresses d'aujourd'hui, dans l'ordre des heures
  const adressesDuJour = items.filter((i) => i.jour === auj && !!i.adresse).map((i) => i.adresse);
  const itineraire = adressesDuJour.length
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adressesDuJour[adressesDuJour.length - 1])}${adressesDuJour.length > 1 ? `&waypoints=${encodeURIComponent(adressesDuJour.slice(0, -1).join('|'))}` : ''}`
    : '';

  // Poses d'aujourd'hui (et en retard) et de demain : matériel prévu gardé sur le téléphone pour la saisie hors ligne
  const posesAPreparer = items.filter((i) => i.type === 'pose' && !!i.jour && i.jour <= demain);
  const preparer = async () => {
    setPrepEnCours(true);
    setPrepMessage(null);
    let n = 0;
    const rates: string[] = [];
    for (const i of posesAPreparer) {
      try {
        const res = await fetch(`/api/interne/pose?id=${encodeURIComponent(i.id)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) { rates.push(i.nom); continue; }
        localStorage.setItem(`chargeo_pose_${i.id}`, JSON.stringify(data));
        n++;
      } catch {
        rates.push(i.nom);
      }
    }
    const p = { le: Date.now(), n };
    try { localStorage.setItem(CLE_PREPARATION, JSON.stringify(p)); } catch {}
    setPreparation(p);
    setPrepMessage(rates.length ? `Pas pu préparer : ${rates.join(', ')}.` : null);
    setPrepEnCours(false);
  };

  const boutonRetour = (
    <a href="/interne/espace" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Mon travail
    </a>
  );

  // Pose et visite ont leur bouton orange principal : l'action éventuelle passe alors en bouton secondaire
  const aBoutonPrincipal = (i: Item) => i.type === 'pose' || i.type === 'visite';

  const carte = (i: Item) => (
    <div key={`${i.type}-${i.id}`} className="space-y-3 rounded-[20px] p-5" style={{ backgroundColor: GRIS }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white" style={{ backgroundColor: i.couleurStatut || '#9aa3ad' }}>
          {i.statut}
        </span>
        {i.detail && <span className="text-[12px] font-bold text-slate-500">{i.detail}</span>}
      </div>
      {i.contactId ? (
        <a href={`/interne/fiches/${i.contactId}`} className="flex items-center justify-between gap-2">
          <span className="text-[17px] font-bold leading-tight">{i.nom}</span>
          <ChevronRight size={20} className="shrink-0" color={CYAN} />
        </a>
      ) : (
        <p className="text-[17px] font-bold leading-tight">{i.nom}</p>
      )}
      <p className="flex items-center gap-1.5 text-[14px] font-bold" style={{ color: i.quand ? CYAN : ORANGE }}>
        <CalendarClock size={15} className="shrink-0" />
        {i.quand || 'Date à fixer'}
      </p>
      {donnees?.equipe && (
        <p className="flex items-center gap-1.5 text-[13px]">
          <HardHat size={14} className="shrink-0" color={CYAN} />
          {i.techniciens.length ? i.techniciens.join(', ') : 'Personne d’affecté'}
        </p>
      )}
      {i.adresse && (
        <p className="flex items-center gap-1.5 text-[13px]">
          <MapPin size={14} className="shrink-0" color={CYAN} />
          <span className="truncate">{i.adresse}</span>
        </p>
      )}
      {i.type === 'pose' && (
        <a href={`/interne/pose/${i.id}`} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-6 text-[15px] font-semibold text-white transition-transform active:scale-95">
          📸 Saisie à la pose
        </a>
      )}
      {i.type === 'visite' && (
        <a href={`/interne/maintenance/${i.id}`} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-6 text-[15px] font-semibold text-white transition-transform active:scale-95">
          🔧 Visite de maintenance (MW9665)
        </a>
      )}
      {i.action && (
        <a href={i.action.href} className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-transform active:scale-95 ${aBoutonPrincipal(i) ? 'ring-[1.5px] ring-[#dfe3e8]' : 'bg-[#FF6B00] text-white'}`} style={aBoutonPrincipal(i) ? { color: CYAN } : undefined}>
          {i.action.libelle}
        </a>
      )}
      {i.contactId && <BlocContact affaireId={i.contactId} differe />}
      <a href={i.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: CYAN }}>
        <ExternalLink size={13} /> Ouvrir dans ClickUp
      </a>
    </div>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Installateur" titre={vue === 'sav' ? 'Mes tickets SAV' : 'Mes interventions'} action={boutonRetour} />
      <ContenuAppli className="space-y-4">
        <div className="flex gap-2">
          {(['interventions', 'sav'] as const).map((v) => (
            <button
              key={v}
              onClick={() => choisir(v)}
              className={`rounded-full px-4 py-2 text-[14px] font-bold transition-transform active:scale-95 ${vue === v ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`}
              style={vue === v ? { backgroundColor: CYAN } : undefined}
            >
              {v === 'sav' ? 'Tickets SAV' : 'Interventions'}
            </button>
          ))}
          <button onClick={() => charger(vue)} aria-label="Actualiser" className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-[1.5px] ring-[#dfe3e8]">
            <RefreshCw size={16} color={CYAN} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {horsLigne && donnees && (
          <Alerte>
            <span className="inline-flex items-center gap-2"><WifiOff size={16} /> Hors ligne : liste du {heure(donnees.lu)}, gardée sur ce téléphone.</span>
          </Alerte>
        )}
        {donnees?.equipe && <Alerte>Vue équipe (direction ou chef de chantier) : toutes les interventions, pas seulement les tiennes.</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}

        {vue === 'interventions' && !horsLigne && posesAPreparer.length > 0 && (
          <div className="rounded-[20px] p-4" style={{ backgroundColor: GRIS }}>
            <button
              onClick={preparer}
              disabled={prepEnCours}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-95"
              style={{ color: CYAN }}
            >
              <Download size={18} /> {prepEnCours ? 'Préparation...' : 'Préparer ma journée hors ligne'}
            </button>
            <p className="mt-2 text-center text-[13px]">
              {preparation ? `Dernière préparation : ${heure(preparation.le)} (${preparation.n} pose${preparation.n > 1 ? 's' : ''})` : 'Garde le matériel prévu de tes poses d’aujourd’hui et de demain sur le téléphone.'}
            </p>
            {prepMessage && <p className="mt-1 text-center text-[13px]" style={{ color: ORANGE }}>{prepMessage}</p>}
          </div>
        )}

        {vue === 'interventions' && itineraire && (
          <a href={itineraire} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-3 rounded-full bg-[#FF6B00] px-8 py-4 text-[17px] font-semibold text-white shadow-[0_8px_22px_rgba(255,107,0,0.28)] transition-transform active:scale-95">
            <Navigation size={20} /> Itinéraire du jour ({adressesDuJour.length} adresse{adressesDuJour.length > 1 ? 's' : ''})
          </a>
        )}

        {loading && !donnees && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement de ton travail...</p>
          </Carte>
        )}
        {donnees && !items.length && (
          <Carte className="text-center"><p className="text-[15px] font-semibold">{vue === 'sav' ? 'Aucun ticket SAV pour toi.' : 'Aucune intervention prévue pour toi.'}</p></Carte>
        )}

        {groupes.map((g) => (
          <div key={g.titre} className="space-y-3">
            <div className="h-1" />
            <Repere>{g.titre} ({g.liste.length})</Repere>
            {g.liste.map(carte)}
          </div>
        ))}
      </ContenuAppli>
    </PageAppli>
  );
}
