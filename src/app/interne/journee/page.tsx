"use client";

// Accueil « Ma journée » de l'application équipe (Phase 6, maquette du 13/10/2026 jointe à la tâche Phase 6).
// Lecture seule : les compteurs viennent de /api/interne/journee (rôles contrôlés côté serveur).
// Direction : toutes les cartes, avec les filtres par rôle en haut. Autres rôles : seulement leurs cartes.
// Chaque carte ouvre l'écran de l'appli quand il existe (relevé, feu vert, validation des réceptions), sinon la liste
// ClickUp correspondante, en attendant les écrans dédiés des lots commercial et back-office.
// La date du titre est calculée sur le téléphone après chargement (la page est pré-générée au build).
import { useEffect, useState } from 'react';
import { CalendarClock, Camera, ChevronRight, ClipboardCheck, ClipboardList, ExternalLink, MapPin, RefreshCw, TrafficCone } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte } from '@/components/charte/Appli';
import { CYAN, GRIS, ORANGE } from '@/components/charte/couleurs';

type Role = 'direction' | 'commercial' | 'chargeOperation' | 'backOffice' | 'poseur';
type Exemple = { nom: string; url: string };
type CarteJournee = {
  cle: string;
  role: Role;
  section: 'aFaire' | 'aDebloquer';
  surtitre: string;
  titre: string;
  detail: string;
  n: number | null;
  urgent: boolean;
  lien: string;
  externe: boolean;
  exemples: Exemple[];
  erreur?: string;
};
type Releve = { id: string; nom: string; quand: string; typeClient: string; adresse: string; lien: string };
type Journee = {
  date: string;
  personne: string | null;
  roles: Role[];
  direction: boolean;
  releves: Releve[];
  cartes: CarteJournee[];
  avertissements: string[];
  preview: boolean;
};
type Filtre = 'tout' | Exclude<Role, 'direction'>;

const FILTRES: { cle: Filtre; libelle: string }[] = [
  { cle: 'tout', libelle: 'Tout' },
  { cle: 'commercial', libelle: 'Commercial' },
  { cle: 'chargeOperation', libelle: "Chargé d'op." },
  { cle: 'poseur', libelle: 'Poseur' },
  { cle: 'backOffice', libelle: 'Back-office' },
];
const LIBELLE_ROLE: Record<Role, string> = {
  direction: 'Direction',
  commercial: 'Commercial',
  chargeOperation: "Chargé d'opération",
  backOffice: 'Back-office',
  poseur: 'Poseur',
};
const RACCOURCIS = [
  { href: '/interne', libelle: 'Mon planning', icon: ClipboardList },
  { href: '/interne/feu-vert', libelle: 'Feu vert', icon: TrafficCone },
  { href: '/interne/reception', libelle: 'Réception', icon: Camera },
  { href: '/interne/validation', libelle: 'Validation', icon: ClipboardCheck },
];

// « ven. 16/10 »
const jourCourt = () =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date());

export default function JourneePage() {
  const [donnees, setDonnees] = useState<Journee | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>('tout');
  const [jour, setJour] = useState('');

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    setJour(jourCourt());
    try {
      const res = await fetch('/api/interne/journee', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
      else setDonnees(data as Journee);
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const garde = (role: Role) => filtre === 'tout' || role === filtre;
  const cartes = (donnees?.cartes || []).filter((c) => garde(c.role));
  const releves = garde('chargeOperation') ? donnees?.releves || [] : [];
  const aFaire = cartes.filter((c) => c.section === 'aFaire');
  const aDebloquer = cartes.filter((c) => c.section === 'aDebloquer');
  const surtitre = donnees
    ? donnees.direction
      ? 'Direction · tous les rôles'
      : donnees.roles.map((r) => LIBELLE_ROLE[r]).join(' · ') || 'Application équipe'
    : 'Application équipe';

  const boutonActualiser = (
    <button
      onClick={charger}
      aria-label="Actualiser"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-transform active:scale-95"
    >
      <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
    </button>
  );

  const pastille = (c: CarteJournee) => {
    const n = c.n;
    const fond = n === null ? '#9aa3ad' : n > 0 && c.urgent ? ORANGE : CYAN;
    return (
      <span className="shrink-0 rounded-full px-3 py-1 text-[15px] font-bold text-white" style={{ backgroundColor: fond }}>
        {n === null ? '?' : n}
      </span>
    );
  };

  const carteCompteur = (c: CarteJournee) => (
    <a
      key={c.cle}
      href={c.lien}
      target={c.externe ? '_blank' : undefined}
      rel={c.externe ? 'noopener noreferrer' : undefined}
      className={`block rounded-[20px] p-5 transition-transform active:scale-[0.98] ${c.n === 0 ? 'opacity-60' : ''}`}
      style={{ backgroundColor: GRIS }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">{c.surtitre}</p>
          <p className="mt-1 text-[17px] font-bold leading-tight">{c.titre}</p>
          <p className="mt-1 text-[14px]">{c.erreur ? `Lecture impossible : ${c.erreur}` : c.detail}</p>
        </div>
        {pastille(c)}
      </div>
      {c.exemples.length > 0 && (
        <ul className="mt-3 space-y-1">
          {c.exemples.map((e) => (
            <li key={e.url} className="truncate text-[13px] font-semibold" style={{ color: CYAN }}>
              {e.nom}
            </li>
          ))}
          {c.n !== null && c.n > c.exemples.length && (
            <li className="text-[12px] text-slate-500">et {c.n - c.exemples.length} autre{c.n - c.exemples.length > 1 ? 's' : ''}</li>
          )}
        </ul>
      )}
      {c.externe && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
          <ExternalLink size={12} /> Ouvrir dans ClickUp
        </p>
      )}
    </a>
  );

  const carteReleve = (r: Releve) => (
    <a key={r.id} href={r.lien} className="block rounded-[20px] p-5 transition-transform active:scale-[0.98]" style={{ backgroundColor: GRIS }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Relevé · Chargé d'opération</p>
          <p className="mt-1 text-[17px] font-bold leading-tight">{r.nom}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[14px] font-bold" style={{ color: CYAN }}>
            <CalendarClock size={15} className="shrink-0" color={CYAN} />
            {r.quand}{r.typeClient ? ` · ${r.typeClient}` : ''}
          </p>
          {r.adresse && (
            <p className="mt-1 flex items-center gap-1.5 text-[13px]">
              <MapPin size={14} className="shrink-0" color={CYAN} />
              <span className="truncate">{r.adresse}</span>
            </p>
          )}
          <p className="mt-1 text-[14px]">Ouvrir le relevé (garder hors ligne)</p>
        </div>
        <ChevronRight size={22} className="shrink-0" color={CYAN} />
      </div>
    </a>
  );

  const vide = (texte: string) => (
    <Carte className="text-center">
      <p className="text-[15px] font-semibold">{texte}</p>
    </Carte>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre={surtitre} titre={jour ? `Ma journée · ${jour}` : 'Ma journée'} action={boutonActualiser} />

      <ContenuAppli className="space-y-4">
        {donnees?.preview && (
          <Alerte>Prévisualisation : relevés, relances et devis lus dans 🧪 Qualification TEST. Rien n'est modifié.</Alerte>
        )}
        {(donnees?.avertissements || []).map((a) => <Alerte key={a}>{a}</Alerte>)}

        {donnees?.direction && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {FILTRES.map((f) => (
              <button
                key={f.cle}
                onClick={() => setFiltre(f.cle)}
                className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-bold transition-transform active:scale-95 ${filtre === f.cle ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`}
                style={filtre === f.cle ? { backgroundColor: CYAN } : undefined}
              >
                {f.libelle}
              </button>
            ))}
          </div>
        )}

        {loading && !donnees && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Je compte ce qui t'attend aujourd'hui...</p>
          </Carte>
        )}
        {erreur && <Alerte>{erreur}</Alerte>}

        {donnees && (
          <>
            <Repere>À faire aujourd'hui</Repere>
            {releves.map(carteReleve)}
            {aFaire.map(carteCompteur)}
            {!releves.length && !aFaire.length && vide(filtre === 'poseur' ? 'Écran « Mes interventions » du poseur : prochain lot.' : "Rien de prévu aujourd'hui.")}

            <div className="h-2" />
            <Repere>À débloquer</Repere>
            {aDebloquer.map(carteCompteur)}
            {!aDebloquer.length && vide('Rien à débloquer.')}

            <div className="h-2" />
            <Repere>Raccourcis</Repere>
            <div className="grid grid-cols-2 gap-3">
              {RACCOURCIS.map(({ href, libelle, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-[16px] bg-white p-4 text-[15px] font-bold ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-[0.98]"
                >
                  <span className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: CYAN }}>
                    <Icon size={18} color="#ffffff" strokeWidth={1.8} />
                  </span>
                  {libelle}
                </a>
              ))}
            </div>
          </>
        )}

        <div className="pt-6 text-center">
          <a href="/api/auth/deconnexion" className="text-[13px] font-semibold underline" style={{ color: CYAN }}>Se déconnecter</a>
        </div>
      </ContenuAppli>
    </PageAppli>
  );
}
