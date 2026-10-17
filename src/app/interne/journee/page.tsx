"use client";

// Accueil « Ma journée » de l'application équipe (Phase 6, maquette du 13/10/2026 jointe à la tâche Phase 6).
// Lecture seule : les compteurs viennent de /api/interne/journee (rôles contrôlés côté serveur).
// 16/10/2026, 23 h 22 (structure validée par Matthieu) : les cartes ouvrent les vues de l'écran Fiches ou les écrans
// Chantiers ; les relevés du jour et en retard ouvrent leur fiche. Navigation par la barre du bas (src/components/charte/
// NavAppli.tsx), qui remplace les raccourcis et le lien de déconnexion (onglet Plus).
// 17/10/2026, 13 h 40 (sélecteur de rôle unique, décision de Matthieu) : plus de filtres propres à cette page. Les cartes
// suivent le rôle choisi dans la pastille de l'en-tête : « Direction » montre tout, un autre rôle seulement ses cartes.
// Libellés uniques : Commercial, Chef de chantier, Installateur, Back-office, Direction.
// 17/10/2026, 16 h 32 (choix de Matthieu : « Deux blocs : Aujourd'hui / En retard ») : fin de « À faire aujourd'hui » et
// « À débloquer ». Aujourd'hui = daté du jour ou travail sans date à traiter ; En retard = date dépassée (orange).
// La date du titre est calculée sur le téléphone après chargement (la page est pré-générée au build).
import { useEffect, useState } from 'react';
import { CalendarClock, ChevronRight, ExternalLink, MapPin, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte } from '@/components/charte/Appli';
import { CYAN, GRIS, ORANGE } from '@/components/charte/couleurs';
import { LIBELLE_ROLE } from '@/lib/menusAppli';
import { useRoleAppli } from '@/components/charte/roleAppli';

type Role = 'direction' | 'commercial' | 'chargeOperation' | 'backOffice' | 'poseur';
type Exemple = { nom: string; url: string };
type CarteJournee = {
  cle: string;
  role: Role;
  section: 'aujourdhui' | 'retard';
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
type Releve = { id: string; nom: string; quand: string; retard: boolean; typeClient: string; adresse: string; lien: string };
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

// « ven. 16/10 »
const jourCourt = () =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date());

export default function JourneePage() {
  const { role } = useRoleAppli();
  const [donnees, setDonnees] = useState<Journee | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
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

  // Rôle du sélecteur unique : direction (ou pas encore connu) = tout ; sinon les cartes de ce rôle
  const tout = !role || role === 'direction';
  const garde = (r: Role) => tout || r === role;
  const cartes = (donnees?.cartes || []).filter((c) => garde(c.role));
  const releves = garde('chargeOperation') ? donnees?.releves || [] : [];
  const relevesDuJour = releves.filter((r) => !r.retard);
  const relevesEnRetard = releves.filter((r) => r.retard);
  const duJour = cartes.filter((c) => c.section === 'aujourdhui');
  const enRetard = cartes.filter((c) => c.section === 'retard');
  const surtitre = role === 'direction' ? 'Direction · tous les rôles' : role ? LIBELLE_ROLE[role] : 'Application équipe';

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
      style={c.section === 'retard' ? { backgroundColor: GRIS, boxShadow: `inset 5px 0 0 ${ORANGE}` } : { backgroundColor: GRIS }}
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
          <ExternalLink size={12} /> Ouvre ClickUp en attendant l'écran back-office
        </p>
      )}
    </a>
  );

  const carteReleve = (r: Releve) => {
    const couleur = r.retard ? ORANGE : CYAN;
    return (
      <a
        key={r.id}
        href={r.lien}
        className="block rounded-[20px] p-5 transition-transform active:scale-[0.98]"
        style={r.retard ? { backgroundColor: GRIS, boxShadow: `inset 5px 0 0 ${ORANGE}` } : { backgroundColor: GRIS }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              {r.retard ? 'Relevé en retard · Chef de chantier' : 'Relevé du jour · Chef de chantier'}
            </p>
            <p className="mt-1 text-[17px] font-bold leading-tight">{r.nom}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[14px] font-bold" style={{ color: couleur }}>
              <CalendarClock size={15} className="shrink-0" color={couleur} />
              {r.quand}{r.typeClient ? ` · ${r.typeClient}` : ''}
            </p>
            {r.adresse && (
              <p className="mt-1 flex items-center gap-1.5 text-[13px]">
                <MapPin size={14} className="shrink-0" color={CYAN} />
                <span className="truncate">{r.adresse}</span>
              </p>
            )}
            <p className="mt-1 text-[14px]">{r.retard ? 'Ouvrir la fiche pour terminer le relevé' : 'Ouvrir la fiche et le relevé'}</p>
          </div>
          <ChevronRight size={22} className="shrink-0" color={couleur} />
        </div>
      </a>
    );
  };

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
          <Alerte>Prévisualisation : fiches lues dans 🧪 Qualification TEST. Rien n'est modifié.</Alerte>
        )}
        {(donnees?.avertissements || []).map((a) => <Alerte key={a}>{a}</Alerte>)}

        {loading && !donnees && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Je compte ce qui t'attend aujourd'hui...</p>
          </Carte>
        )}
        {erreur && <Alerte>{erreur}</Alerte>}

        {donnees && (
          <>
            <Repere>Aujourd'hui</Repere>
            {relevesDuJour.map(carteReleve)}
            {duJour.map(carteCompteur)}
            {!relevesDuJour.length && !duJour.length && vide("Rien de prévu aujourd'hui.")}

            <div className="h-2" />
            <Repere>En retard</Repere>
            {relevesEnRetard.map(carteReleve)}
            {enRetard.map(carteCompteur)}
            {!relevesEnRetard.length && !enRetard.length && vide('Aucun retard.')}
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
