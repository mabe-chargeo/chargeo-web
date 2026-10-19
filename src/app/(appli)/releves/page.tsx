"use client";

// Planning terrain : /api/chantiers + redirection window.location pour le hors-ligne.
// 10/10/2026 : habillage charte 2026 (briques communes src/components/charte/Appli.tsx).
// Lot 3.2 : section « relevés à terminer sur ce téléphone », pour reprendre une fiche
// même si elle n'est plus « à visiter » (envoi interrompu, photos manquantes...).
// Lot 3.3 et point 21 : compteur de scénarios ou d'emplacements sur la carte de la fiche.
// 13/10/2026 : le commercial cale le relevé (📅 Date Visite Technique). « Relevés planifiés » triés par date, avec
// le jour et l'heure ; « Pas encore calées » ensuite (le commercial doit fixer le rendez-vous), toujours ouvrables.
// 13/10/2026 (Phase 6) : lien de déconnexion (connexion avec le compte ClickUp, src/proxy.ts).
// 17/10/2026, 13 h 13 (Matthieu : les trois boutons du haut « n'ont pas lieu d'être ») : Feu vert, Réception sur place et
// Valider les réceptions sont retirés. Ils sont dans À traiter (chef de chantier, installateur). Cette page est la vue
// « Relevés à faire » du chef de chantier, utilisable hors ligne.
// 17/10, 22 h 20 : plus de lien « ← Mon espace » dans la page (le bouton Retour de l'en-tête ramène à À traiter) ni de
// « Se déconnecter » (la déconnexion est sous la pastille du rôle depuis 20 h 17).
// 18/10, 9 h 50 (pastilles Aujourd'hui et À venir de la carte des menus) : filtres en tête, Tous, Aujourd'hui, À venir,
// lus dans l'adresse (?vue=aujourdhui, ?vue=a-venir). « Pas encore calées » n'apparaît que sur Tous.
// 19/10/2026 : adresse /releves (ex-/interne), fiche de relevé sur /releves/<id>.
import { useEffect, useState } from 'react';
import { CalendarClock, ChevronRight, ClipboardList, GitBranch, History, MapPin, RefreshCw, Zap } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte } from '@/components/charte/Appli';
import { CYAN, GRIS, ORANGE } from '@/components/charte/couleurs';
import { relevesATerminer } from '@/lib/releveLocal';
import { adresses } from '@/lib/adresses';

interface Chantier {
  id: string;
  nom: string;
  adresse: string;
  dateVisite?: number | null;
  scenarios?: number;
  scenariosRecus?: number;
  typeSousReleves?: 'scenario' | 'emplacement' | null;
}
type Vue = 'tous' | 'aujourdhui' | 'a-venir';
const VUES: { cle: Vue; libelle: string }[] = [
  { cle: 'tous', libelle: 'Tous' },
  { cle: 'aujourdhui', libelle: "Aujourd'hui" },
  { cle: 'a-venir', libelle: 'À venir' },
];

// « mer. 14/10 à 14h30 » (heure de Paris). Date sans heure dans ClickUp : enregistrée à 4 h (heure locale), parfois
// à minuit (vu le 13/10 sur TEST · SDC Sonnet du Lac : « 04h00 » affiché) : on n'affiche alors que le jour.
function libelleRdv(ms: number): string {
  const d = new Date(ms);
  const jour = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: '2-digit', month: '2-digit' }).format(d);
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const h = parts.find((p) => p.type === 'hour')?.value || '00';
  const m = parts.find((p) => p.type === 'minute')?.value || '00';
  return m === '00' && (h === '00' || h === '04') ? jour : `${jour} à ${h}h${m}`;
}
// « AAAA-MM-JJ » à Paris
const jourParis = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export default function InternePage() {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [aTerminer, setATerminer] = useState<{ id: string; nom: string; majLe: number }[]>([]);
  const [vue, setVue] = useState<Vue>('tous');

  const chargerPlanning = async () => {
    setLoading(true);
    setErreur(null);
    setATerminer(relevesATerminer());
    try {
      const res = await fetch('/api/chantiers');
      const data = await res.json();
      if (Array.isArray(data)) {
        setChantiers(data);
      } else if (data.error) {
        setErreur(data.error); // On capte l'erreur envoyée par l'API
      }
    } catch (e) {
      setErreur("Impossible de joindre le serveur.");
    } finally {
      setLoading(false); // Arrête la roue de chargement dans tous les cas
    }
  };

  // On charge juste le planning au démarrage ; le filtre vient de l'adresse
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('vue');
    if (v === 'aujourdhui' || v === 'a-venir') setVue(v);
    chargerPlanning();
  }, []);

  const choisir = (v: Vue) => {
    setVue(v);
    window.history.replaceState(null, '', v === 'tous' ? adresses.releves : `${adresses.releves}?vue=${v}`);
  };

  const handleSelectChantier = (id: string) => {
    // 🚨 ASTUCE ANTI-APPLE : On utilise window.location au lieu de router.push
    // Ça force le téléphone à télécharger la page complète, ce qui permet au Service Worker de la capturer pour le mode hors-ligne !
    window.location.href = adresses.releve(id);
  };

  // Relevés commencés sur ce téléphone mais absents du planning (déjà sortis de « à visiter », ou sous-relevés)
  const idsPlanning = new Set(chantiers.map((c) => c.id));
  const aReprendre = aTerminer.filter((r) => !idsPlanning.has(r.id));
  const aujourdhui = jourParis(new Date());
  const jourDe = (c: Chantier) => (c.dateVisite ? jourParis(new Date(c.dateVisite)) : '');
  const planifies = chantiers.filter((c) => !!c.dateVisite);
  const duJour = planifies.filter((c) => jourDe(c) === aujourdhui);
  const aVenir = planifies.filter((c) => jourDe(c) > aujourdhui);
  const visibles = vue === 'aujourdhui' ? duJour : vue === 'a-venir' ? aVenir : planifies;
  const aCaler = chantiers.filter((c) => !c.dateVisite);
  const compte: Record<Vue, number> = { tous: planifies.length, aujourdhui: duJour.length, 'a-venir': aVenir.length };

  const boutonActualiser = (
    <button
      onClick={chargerPlanning}
      aria-label="Actualiser le planning"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-transform active:scale-95"
    >
      <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
    </button>
  );

  const carteChantier = (chantier: Chantier, calee: boolean) => {
    const n = chantier.scenarios || 0;
    const recus = chantier.scenariosRecus || 0;
    const emplacements = chantier.typeSousReleves === 'emplacement';
    return (
      <button
        key={chantier.id}
        onClick={() => handleSelectChantier(chantier.id)}
        className={`flex w-full items-center gap-4 rounded-[20px] p-5 text-left transition-transform active:scale-[0.98] ${calee ? '' : 'opacity-70'}`}
        style={{ backgroundColor: GRIS }}
      >
        <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: calee ? CYAN : '#9aa3ad' }}>
          <ClipboardList size={22} color="#ffffff" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 grow">
          <p className="text-[17px] font-bold leading-tight">{chantier.nom}</p>
          {calee && chantier.dateVisite && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[14px] font-bold" style={{ color: CYAN }}>
              <CalendarClock size={15} className="shrink-0" color={CYAN} />
              {libelleRdv(chantier.dateVisite)}
            </p>
          )}
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px]">
            <MapPin size={14} className="shrink-0" color={CYAN} />
            <span className="truncate">{chantier.adresse}</span>
          </p>
          {n > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold">
              {emplacements
                ? <Zap size={14} className="shrink-0" color={CYAN} />
                : <GitBranch size={14} className="shrink-0" color={CYAN} />}
              {n} {emplacements ? 'emplacement' : 'scénario'}{n > 1 ? 's' : ''} · {recus} reçu{recus > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <ChevronRight size={22} className="shrink-0" color={calee ? CYAN : '#9aa3ad'} />
      </button>
    );
  };

  const titreListe = vue === 'aujourdhui' ? "Relevés d'aujourd'hui" : vue === 'a-venir' ? 'Relevés à venir' : 'Relevés planifiés';
  const vide = vue === 'aujourdhui' ? "Aucun relevé aujourd'hui." : vue === 'a-venir' ? 'Aucun relevé à venir.' : "Aucun relevé planifié pour l'instant.";

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Chef de chantier" titre="Relevés à faire" action={boutonActualiser} />

      <ContenuAppli className="space-y-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {VUES.map((v) => {
            const actif = vue === v.cle;
            return (
              <button
                key={v.cle}
                onClick={() => choisir(v.cle)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[14px] font-bold transition-transform active:scale-95 ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`}
                style={actif ? { backgroundColor: CYAN } : undefined}
              >
                {v.libelle}
                {!loading && <span className={`rounded-full px-2 text-[12px] ${actif ? 'bg-white/25' : 'bg-[#eceef1]'}`}>{compte[v.cle]}</span>}
              </button>
            );
          })}
        </div>

        {aReprendre.length > 0 && (
          <>
            <Repere>Relevés à terminer sur ce téléphone</Repere>
            {aReprendre.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelectChantier(r.id)}
                className="flex w-full items-center gap-4 rounded-[20px] bg-white p-5 text-left ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-[0.98]"
                style={{ boxShadow: `inset 5px 0 0 ${ORANGE}` }}
              >
                <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: ORANGE }}>
                  <History size={22} color="#ffffff" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 grow">
                  <p className="text-[17px] font-bold leading-tight">{r.nom}</p>
                  <p className="mt-1.5 text-[13px]">Envoi non terminé : ouvre et appuie sur Valider</p>
                </div>
                <ChevronRight size={22} className="shrink-0" color={ORANGE} />
              </button>
            ))}
            <div className="h-2" />
          </>
        )}

        <Repere>{titreListe}</Repere>

        {loading && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement du planning terrain...</p>
          </Carte>
        )}

        {!loading && erreur && <Alerte>{erreur}</Alerte>}

        {!loading && !erreur && visibles.length === 0 && (
          <Carte className="p-8 text-center">
            <ClipboardList className="mx-auto mb-3" size={40} color={CYAN} strokeWidth={1.6} />
            <p className="text-[15px] font-semibold">{vide}</p>
          </Carte>
        )}

        {!loading && !erreur && visibles.map((c) => carteChantier(c, true))}

        {!loading && !erreur && vue === 'tous' && aCaler.length > 0 && (
          <>
            <div className="h-2" />
            <Repere>Pas encore calées</Repere>
            <p className="text-[13px]">Le commercial doit fixer le rendez-vous avec le client.</p>
            {aCaler.map((c) => carteChantier(c, false))}
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
