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
// 18/10, 20 h 55 : le bouton s'appelle « 🔧 Faire la visite », sans le nom de l'appareil, comme sur la fiche (Matthieu,
// 19 h 31 : « pourquoi tu mets un bouton faire la visite MW 96 65 »).
// 17/10, 17 h 37 (choix de Matthieu) : chaque pose a aussi « 📋 Ce qui est prévu » (/interne/pose/<id>#prevu) : les
// éléments du scénario retenu avec leur détail, sans aucun prix, gardés hors ligne avec « Préparer ma journée ».
// 17/10, 17 h 51 (Matthieu : « je suis en vue installateur, alors pourquoi j'ai ce message ? ») : le rôle choisi dans
// la pastille de l'en-tête part avec la lecture (&role=). Vue Installateur = mes interventions, comme un installateur,
// même pour la direction. Vue Direction ou Chef de chantier = toute l'équipe, avec le nom des installateurs.
// 18/10, 22 h 20 (maquette MAQUETTE_RAPPORT-SAV_2026-10-18.png validée par Matthieu) : chaque ticket SAV a le bouton
// orange « 🛠️ Rapport d'intervention » (/interne/rapport-sav/<id>) ; caler le dépannage passe en bouton secondaire.
// 19/10/2026 (2e lot de cohérence) : cartes et boutons sur les briques communes (src/components/charte/Appli.tsx),
// liens ClickUp réservés à la direction et au back-office, bouton Retour de l'en-tête commun.
import { useEffect, useState } from 'react';
import { CalendarClock, ChevronRight, Download, ExternalLink, HardHat, MapPin, Navigation, RefreshCw, WifiOff } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, Repere, LienPrincipal, BoutonSecondaire } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';
import { BlocContact } from '@/components/ui/BlocContact';
import { useRoleAppli } from '@/components/charte/roleAppli';

type Item = {
  id: string; type: 'pose' | 'visite' | 'sav'; nom: string; statut: string; couleurStatut: string;
  date: number; jour: string; quand: string; detail: string; techniciens: string[]; adresse: string;
  contactId: string; url: string; action: { libelle: string; href: string } | null;
};
type Reponse = { vue: 'interventions' | 'sav'; aujourdhui: string; equipe: boolean; items: Item[]; lu: number };

const cleCache = (vue: string, role: string) => `chargeo_interventions_${vue}${role === 'poseur' || !role ? '' : `_${role}`}`;
const CLE_PREPARATION = 'chargeo_journee_preparee';
const decaler = (jour: string, n: number): string => {
  const [a, m, j] = jour.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j + n));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};
const heure = (ms: number) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));

export default function InterventionsPage() {
  const { role } = useRoleAppli();
  const [vue, setVue] = useState<'interventions' | 'sav'>('interventions');
  const [donnees, setDonnees] = useState<Reponse | null>(null);
  const [horsLigne, setHorsLigne] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [preparation, setPreparation] = useState<{ le: number; n: number } | null>(null);
  const [prepEnCours, setPrepEnCours] = useState(false);
  const [prepMessage, setPrepMessage] = useState<string | null>(null);

  const charger = async (v: 'interventions' | 'sav') => {
    const r = role || '';
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/interne/interventions?vue=${v}&role=${encodeURIComponent(r)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        setErreur(data?.error || `Lecture impossible (${res.status})`);
      } else {
        setDonnees(data as Reponse);
        setHorsLigne(false);
        try { localStorage.setItem(cleCache(v, r), JSON.stringify(data)); } catch {}
      }
    } catch {
      // Pas de réseau : dernière liste gardée sur le téléphone
      try {
        const brut = localStorage.getItem(cleCache(v, r));
        if (brut) { setDonnees(JSON.parse(brut) as Reponse); setHorsLigne(true); }
        else setErreur('Pas de réseau, et aucune liste gardée sur ce téléphone. Ouvre l’écran une fois avec du réseau.');
      } catch {
        setErreur('Pas de réseau.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Relu quand le rôle de l'en-tête est connu ou change
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('vue') === 'sav' ? 'sav' : 'interventions';
    setVue(v);
    setDonnees(null);
    charger(v);
    try {
      const p = JSON.parse(localStorage.getItem(CLE_PREPARATION) || 'null');
      if (p && typeof p.le === 'number') setPreparation(p);
    } catch {}
  }, [role]);

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

  const equipe = !!donnees?.equipe;
  const voitClickUp = role === 'direction' || role === 'backOffice';

  // Pose, visite et ticket SAV ont leur bouton orange principal : l'action éventuelle passe alors en bouton secondaire
  const aBoutonPrincipal = (i: Item) => i.type === 'pose' || i.type === 'visite' || i.type === 'sav';

  const carte = (i: Item) => (
    <Carte key={`${i.type}-${i.id}`} className="space-y-3">
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
      {equipe && (
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
        <BoutonSecondaire href={`/interne/pose/${i.id}#prevu`} compact>📋 Ce qui est prévu</BoutonSecondaire>
      )}
      {i.type === 'pose' && (
        <LienPrincipal href={`/interne/pose/${i.id}`} compact>📸 Saisie à la pose</LienPrincipal>
      )}
      {i.type === 'visite' && (
        <LienPrincipal href={`/interne/maintenance/${i.id}`} compact>🔧 Faire la visite</LienPrincipal>
      )}
      {i.type === 'sav' && (
        <LienPrincipal href={`/interne/rapport-sav/${i.id}`} compact>🛠️ Rapport d’intervention</LienPrincipal>
      )}
      {i.action && (
        aBoutonPrincipal(i) ? (
          <BoutonSecondaire href={i.action.href} compact>{i.action.libelle}</BoutonSecondaire>
        ) : (
          <LienPrincipal href={i.action.href} compact>{i.action.libelle}</LienPrincipal>
        )
      )}
      {i.contactId && <BlocContact affaireId={i.contactId} differe />}
      {voitClickUp && (
        <a href={i.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: CYAN }}>
          <ExternalLink size={13} /> Ouvrir dans ClickUp
        </a>
      )}
    </Carte>
  );

  const titre = equipe ? (vue === 'sav' ? 'Tickets SAV de l’équipe' : 'Interventions de l’équipe') : vue === 'sav' ? 'Mes tickets SAV' : 'Mes interventions';
  const vide = equipe
    ? vue === 'sav'
      ? 'Aucun ticket SAV ouvert dans l’équipe.'
      : 'Aucune intervention ouverte dans l’équipe (chantier en préparation, planifié ou en cours, visite à planifier ou confirmée).'
    : vue === 'sav'
      ? 'Aucun ticket SAV pour toi.'
      : 'Aucune intervention prévue pour toi : aucun chantier ni aucune visite ne t’a été affecté (champ 👷 Technicien).';

  return (
    <PageAppli>
      <EnTeteAppli surtitre={equipe ? 'Équipe d’installateurs' : 'Installateur'} titre={titre} retour={{ href: '/interne/espace', libelle: 'Mon espace' }} />
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
        {erreur && <Alerte>{erreur}</Alerte>}

        {vue === 'interventions' && !horsLigne && posesAPreparer.length > 0 && (
          <Carte>
            <BoutonSecondaire onClick={preparer} disabled={prepEnCours} compact>
              <Download size={18} /> {prepEnCours ? 'Préparation...' : 'Préparer ma journée hors ligne'}
            </BoutonSecondaire>
            <p className="mt-2 text-center text-[13px]">
              {preparation ? `Dernière préparation : ${heure(preparation.le)} (${preparation.n} pose${preparation.n > 1 ? 's' : ''})` : 'Garde ce qui est prévu sur tes poses d’aujourd’hui et de demain sur le téléphone.'}
            </p>
            {prepMessage && <p className="mt-1 text-center text-[13px]" style={{ color: ORANGE }}>{prepMessage}</p>}
          </Carte>
        )}

        {vue === 'interventions' && itineraire && (
          <LienPrincipal href={itineraire}>
            <Navigation size={20} /> Itinéraire du jour ({adressesDuJour.length} adresse{adressesDuJour.length > 1 ? 's' : ''})
          </LienPrincipal>
        )}

        {loading && !donnees && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement des interventions...</p>
          </Carte>
        )}
        {donnees && !items.length && (
          <Carte className="text-center"><p className="text-[15px] font-semibold">{vide}</p></Carte>
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
