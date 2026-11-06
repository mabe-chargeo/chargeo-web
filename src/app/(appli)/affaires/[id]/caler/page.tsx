"use client";

// Caler le relevé technique (17/10/2026, 20 h 44, choix de Matthieu : « Caler + email de confirmation prêt à
// envoyer »). Le commercial a le client au téléphone : chef de chantier, durée, créneau, note d'accès. Ensuite le mail
// de confirmation s'ouvre déjà rédigé, il le relit et l'envoie.
// 17/10, 20 h 53 : ?confirmation=1 (« Renvoyer la confirmation » de la fiche) ouvre la confirmation du rendez-vous déjà
//   calé.
// 17/10, 20 h 59 et 21 h 16 : planning du chef (ERP) + son Google Agenda (tous ses agendas affichés).
// 17/10, 22 h 42 : agenda de la semaine (src/components/ui/AgendaSemaine.tsx). Durées supposées des RDV ERP sans durée :
//   maintenance et dépannage 1 h 30, pose avec heure 4 h ; pose sans heure = bandeau chantier. Marge de route 30 min.
// 17/10, 23 h 00 (Matthieu : « il faudrait pouvoir supprimer un créneau aussi si on se trompe et en modifier la
//   durée ») : durée au choix (⏳ Durée relevé), créneau choisi effaçable (le toucher à nouveau, ou « Effacer »),
//   « Annuler le rendez-vous » pour une fiche déjà calée (date vidée, événement retiré de l'agenda du chef).
// Écrit par /api/interne/caler. Ouvert depuis « Visites à caler » et depuis la fiche affaire.
// 19/10/2026 (2e lot de cohérence) : cartes et boutons sur les briques communes (src/components/charte/Appli.tsx).
// 05/11/2026 (Phase 9, lot 2, décisions de Mathieu du 05/11 à 20 h 57 et 21 h 22) : plus de lien Gmail ni de texte à
//   copier. Le mail « Visite · confirmation » (ou « Visite · déplacée » après un décalage) s'écrit dans l'appli,
//   rempli avec la fiche, en réponse au dernier échange, envoyé depuis contact@chargeo.fr avec sa copie sur la fiche.
// 05/11/2026, 21 h 56 à 21 h 58 (Mathieu : mail obligatoire, au moment opportun, et plus de page sans lien avec les
//   autres) : le mail s'écrit SUR cet écran (src/components/ui/EcrireMail.tsx), juste après avoir calé. Il est
//   obligatoire : la route pose « ✉️ Mail à envoyer » et la fiche reste bloquée tant qu'il n'est pas parti.
// 05/11/2026, 22 h 33 (Mathieu, bouton « Oui, comme ça ») : les rendez-vous de l'agenda Google affichent la commune de
//   leur lieu (« Occupé · Évian »), mis en avant quand c'est la ville du client. Client injoignable : on choisit jusqu'à
//   3 créneaux libres, puis le mail « Visite · créneaux » s'écrit avec eux ; rien n'est calé. La note d'accès saisie ici
//   complète les mails.
// 05/11/2026, 23 h 01 (Mathieu : bouton « plus visible, comme les autres », créneau qui « reste en pré-réservation sur
//   l'agenda », « rester dans la fiche pour assurer une continuité ») : vrai bouton « Client injoignable » ; les créneaux
//   choisis restent marqués sur l'agenda ; le mail s'écrit sans la liste des modèles ; une fois parti, les créneaux sont
//   pré-réservés dans l'agenda Google du chef (provisoires). À la réouverture, ils s'affichent « ⏳ proposé », avec
//   « Caler ce créneau » quand le client a répondu ; caler ou annuler les retire.
// 06/11/2026, 6 h 37 (Mathieu : « Je ne peux pas cliquer sur Caler ce créneau ») : vrai bouton plein ; il choisit le
//   créneau, fait passer l'agenda à sa semaine et descend jusqu'au créneau choisi et au bouton Caler. Marques courtes
//   sur l'agenda (« ⏳ » proposé, « ✓ » en cours de choix).
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, CalendarCheck, CalendarX, Check, ChevronRight, Hourglass, Mail, MapPin, RefreshCw, X } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte, BoutonPrincipal, BoutonSecondaire, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';
import AgendaSemaine, { heureDe, libelleJourCourt, semaineDe, type BlocAgenda, type JourneeAgenda, type MarqueAgenda } from '@/components/ui/AgendaSemaine';
import EcrireMail from '@/components/ui/EcrireMail';
import { adresses } from '@/lib/adresses';

type Fiche = { id: string; nom: string; statut: string; aVisiter: boolean; adresse: string; ville?: string; email: string; telephone: string; dejaCale: string; duree?: string };
type Chef = { id: number; nom: string };
type Cale = { quand: string; chef: string; lienFiche: string };
type TypeRdv = 'pose' | 'visite' | 'depannage' | 'releve';
type Occupation = { jour: string; minutes: number | null; duree?: number; type: TypeRdv; nom: string; ville: string; techniciens: number[] };
type CreneauAgenda = { chefId: number; jour: string; debut: number; fin: number; journee: boolean; lieu?: string };
type Agenda = { branche: boolean; creneaux: CreneauAgenda[]; erreurs: string[] };
type StatutAgenda = 'cree' | 'deplace' | 'non-branche' | 'sans-chef' | 'erreur';
type Duree = { libelle: string; minutes: number };
type Propose = { jour: string; minutes: number };
type DejaPropose = Propose & { chefId: number; duree: number };

const MARGE_ROUTE = 30;
const DUREE_ERP: Record<TypeRdv, number> = { releve: 60, visite: 90, depannage: 90, pose: 240 };
const VERT = '#16a34a';
const TYPES: Record<TypeRdv, string> = { pose: '🏗️ Pose', visite: '🔧 Maintenance', depannage: '🚨 Dépannage', releve: '📋 Relevé' };
const PROPOSES_MAX = 3;
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const avant = (a: Propose, b: Propose) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : a.minutes - b.minutes);
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export default function CalerPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [planningIncomplet, setPlanningIncomplet] = useState(false);
  const [agenda, setAgenda] = useState<Agenda>({ branche: false, creneaux: [], erreurs: [] });
  const [durees, setDurees] = useState<Duree[]>([]);
  const [duree, setDuree] = useState<Duree>({ libelle: '1 h', minutes: 60 });
  const [preview, setPreview] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const [semaine, setSemaine] = useState(0);
  const [chefId, setChefId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [annule, setAnnule] = useState(false);
  const [cale, setCale] = useState<Cale | null>(null);
  const [decale, setDecale] = useState(false);
  // Rendez-vous déjà calé (lu à l'ouverture) : pour renvoyer la confirmation
  const [dejaCale, setDejaCale] = useState<Cale | null>(null);
  const [renvoi, setRenvoi] = useState(false);
  const [chefOk, setChefOk] = useState(true);
  const [statutAgenda, setStatutAgenda] = useState<{ statut: StatutAgenda; erreur: string }>({ statut: 'non-branche', erreur: '' });
  // Client injoignable : créneaux à proposer par mail, choisis sur l'agenda (rien n'est calé), puis pré-réservés
  const [proposer, setProposer] = useState(false);
  const [proposes, setProposes] = useState<Propose[]>([]);
  const [ecrireCreneaux, setEcrireCreneaux] = useState(false);
  const [dejaProposes, setDejaProposes] = useState<DejaPropose[]>([]);
  const [preReserve, setPreReserve] = useState<{ ok: boolean; texte: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    const confirmation = new URLSearchParams(window.location.search).get('confirmation') === '1';
    (async () => {
      try {
        const res = await fetch(`/api/interne/caler?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) setErreur(data?.error || `Lecture impossible (${res.status})`);
        else {
          setFiche(data.fiche);
          setChefs(data.chefs || []);
          setOccupations(data.occupations || []);
          setPlanningIncomplet(!!data.planningIncomplet);
          if (data.agenda) setAgenda({ branche: !!data.agenda.branche, creneaux: data.agenda.creneaux || [], erreurs: data.agenda.erreurs || [] });
          setDejaProposes(Array.isArray(data.proposes) ? data.proposes : []);
          const ds: Duree[] = Array.isArray(data.durees) ? data.durees : [];
          setDurees(ds);
          const actuelle = ds.find((d) => d.libelle === data.fiche?.duree) || ds.find((d) => d.minutes === 60);
          if (actuelle) setDuree(actuelle);
          setPreview(!!data.preview);
          setChefId(data.chefAssigne || (data.chefs?.length === 1 ? data.chefs[0].id : null));
          if (data.cale) {
            setDejaCale(data.cale);
            if (confirmation) setRenvoi(true);
          }
        }
      } catch {
        setErreur('Impossible de joindre le serveur.');
      }
    })();
  }, [id]);

  // Planning du chef choisi (ERP + Google Agenda) mis en forme pour l'agenda de la semaine. Un rendez-vous dans la ville
  // du client est mis en avant (ton « proche »), qu'il vienne de l'ERP ou de l'agenda Google.
  const memeVille = (ville: string) => !!fiche?.ville && !!ville && normal(ville) === normal(fiche.ville);
  const duChef = chefId === null ? [] : occupations.filter((o) => o.techniciens.includes(chefId));
  const agendaDuChef = chefId === null ? [] : agenda.creneaux.filter((c) => c.chefId === chefId);
  const proposesDuChef = chefId === null ? [] : dejaProposes.filter((p) => p.chefId === chefId).sort(avant);
  const blocs: BlocAgenda[] = duChef
    .filter((o) => o.minutes !== null)
    .map((o) => ({ jour: o.jour, debut: o.minutes as number, fin: (o.minutes as number) + (o.duree || DUREE_ERP[o.type]), titre: TYPES[o.type], detail: [o.nom, o.ville].filter(Boolean).join(' · '), ton: (memeVille(o.ville) ? 'proche' : 'erp') as BlocAgenda['ton'] }))
    .concat(agendaDuChef.filter((c) => !c.journee).map((c) => ({ jour: c.jour, debut: c.debut, fin: c.fin, titre: 'Occupé', detail: c.lieu || 'Agenda Google', ton: (memeVille(c.lieu || '') ? 'proche' : 'agenda') as BlocAgenda['ton'] })));
  const journees: JourneeAgenda[] = duChef
    .filter((o) => o.minutes === null)
    .map((o) => ({ jour: o.jour, titre: o.type === 'pose' ? `🏗️ Chantier ${o.ville || o.nom}` : `${TYPES[o.type]} ${o.nom}` }))
    .concat(agendaDuChef.filter((c) => c.journee).map((c) => ({ jour: c.jour, titre: c.lieu ? `📆 Journée · ${c.lieu}` : '📆 Journée' })));
  // Créneaux montrés sur l'agenda : en cours de choix (turquoise, ✓), ou déjà proposés au client (ambre, ⏳, touchables)
  const marques: MarqueAgenda[] = proposer
    ? proposes.map((p) => ({ ...p, libelle: '✓', ton: 'choisi' as const }))
    : proposesDuChef.map((p) => ({ jour: p.jour, minutes: p.minutes, libelle: '⏳', ton: 'reserve' as const }));
  const choix = date && /^\d{2}:\d{2}$/.test(heure) ? { jour: date, minutes: Number(heure.slice(0, 2)) * 60 + Number(heure.slice(3, 5)) } : null;
  const journeeDuChoix = choix ? journees.filter((x) => x.jour === choix.jour) : [];
  const effacer = () => { setDate(''); setHeure(''); };
  // Toucher le créneau déjà choisi l'efface. En mode « proposer », chaque créneau touché s'ajoute (ou se retire) de la
  // liste, 3 au plus.
  const choisir = (jour: string, minutes: number) => {
    if (proposer) {
      setProposes((l) => {
        if (l.some((x) => x.jour === jour && x.minutes === minutes)) return l.filter((x) => !(x.jour === jour && x.minutes === minutes));
        return l.length >= PROPOSES_MAX ? l : [...l, { jour, minutes }].sort(avant);
      });
      return;
    }
    if (choix && choix.jour === jour && choix.minutes === minutes) { effacer(); return; }
    setDate(jour);
    setHeure(hhmm(minutes));
  };
  // Entrer dans « proposer » reprend les créneaux déjà proposés au client (pour les changer)
  const basculerProposer = () => {
    if (!proposer) setProposes(proposesDuChef.map((p) => ({ jour: p.jour, minutes: p.minutes })));
    setProposer(!proposer);
    effacer();
    setErreur(null);
  };
  // « Caler ce créneau » (06/11, 6 h 37) : le créneau proposé est choisi, l'agenda passe à sa semaine et l'écran
  // descend jusqu'au créneau choisi et au bouton Caler
  const calerPropose = (p: Propose) => {
    setDate(p.jour);
    setHeure(hhmm(p.minutes));
    setSemaine(semaineDe(p.jour));
    window.setTimeout(() => document.getElementById('creneau-choisi')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  // Mail des créneaux parti : pré-réservation dans l'agenda Google du chef
  const preReserver = async () => {
    setPreReserve(null);
    try {
      const res = await fetch('/api/interne/caler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'pre-reserver', creneaux: proposes, chefId, duree: duree.libelle }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) setPreReserve({ ok: false, texte: data?.error || `Pré-réservation impossible (${res.status}) : pense à bloquer ces créneaux à la main.` });
      else setPreReserve({ ok: true, texte: `${data.preReserves} créneau${data.preReserves > 1 ? 'x' : ''} pré-réservé${data.preReserves > 1 ? 's' : ''} dans l’agenda de ${data.chef}, en attendant la réponse du client.` });
    } catch {
      setPreReserve({ ok: false, texte: 'Impossible de joindre le serveur : les créneaux ne sont pas pré-réservés.' });
    }
  };

  const pret = !!choix && (chefs.length === 0 || chefId !== null);
  const envoyer = async () => {
    if (!pret || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/caler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, date, heure, duree: duree.libelle, chefId, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) setErreur(data?.error || `Enregistrement impossible (${res.status})`);
      else {
        setCale(data.cale);
        setDecale(!!data.decale);
        setChefOk(data.chefOk !== false);
        setStatutAgenda({ statut: (data.agenda as StatutAgenda) || 'non-branche', erreur: String(data.agendaErreur || '') });
        setPreview(!!data.preview);
      }
    } catch {
      setErreur('Impossible de joindre le serveur. Rien n’a été enregistré.');
    } finally {
      setEnvoi(false);
    }
  };
  const annuler = async () => {
    if (envoi || !fiche?.dejaCale) return;
    if (!window.confirm(`Annuler le rendez-vous du ${fiche.dejaCale} ? La date est vidée et le rendez-vous retiré de l’agenda du chef. Pense à prévenir le client.`)) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/caler', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'annuler' }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) setErreur(data?.error || `Annulation impossible (${res.status})`);
      else setAnnule(true);
    } catch {
      setErreur('Impossible de joindre le serveur. Rien n’a été annulé.');
    } finally {
      setEnvoi(false);
    }
  };

  const pastille = (actif: boolean, libelle: string, changer: () => void) => (
    <button key={libelle} onClick={changer} className={`cursor-pointer rounded-full px-4 py-2 text-[14px] font-bold ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={actif ? { backgroundColor: CYAN } : undefined}>
      {libelle}
    </button>
  );
  if (annule) {
    return (
      <PageAppli>
        <EnTeteAppli surtitre="Relevé technique" titre="Rendez-vous annulé" retour={{ href: `${adresses.pipeline}?vue=a-caler`, libelle: 'Visites à caler' }} />
        <ContenuAppli className="space-y-4">
          <Carte accent>
            <p className="text-[18px] font-bold">{fiche?.nom}</p>
            <p className="mt-1 text-[14px]">Le rendez-vous du {fiche?.dejaCale} est annulé : la fiche revient dans Visites à caler et sort de l’agenda du chef.</p>
          </Carte>
          <p className="px-1 text-[13px] font-semibold" style={{ color: ORANGE }}>Préviens le client, l’annulation ne lui envoie rien.</p>
          <button onClick={() => window.location.reload()} className="block w-full cursor-pointer text-center text-[15px] font-semibold" style={{ color: CYAN }}>Caler un nouveau rendez-vous</button>
          <a href={adresses.affaire(id)} className="flex items-center justify-center gap-1 text-[15px] font-semibold" style={{ color: CYAN }}>Ouvrir la fiche <ChevronRight size={16} /></a>
        </ContenuAppli>
      </PageAppli>
    );
  }

  // Écran de confirmation : juste après avoir calé (mail obligatoire), ou « Renvoyer la confirmation » (mail imposé)
  const confirmation = (c: Cale, titre: string, renvoyee: boolean) => {
    const s = statutAgenda.statut;
    const modele = !renvoyee && decale ? 'visite-deplacee' : 'visite-confirmation';
    return (
      <PageAppli>
        <EnTeteAppli surtitre={titre} titre={fiche?.nom || 'Relevé technique'} retour={{ href: c.lienFiche, libelle: 'Fiche' }} />
        <ContenuAppli className="space-y-4">
          {preview && !renvoyee && <Alerte>Preview : seule cette fiche de test a été modifiée.</Alerte>}
          {!renvoyee && !chefOk && <Alerte>La date est enregistrée, mais le chef de chantier n’a pas pu être assigné à la fiche.</Alerte>}
          {!renvoyee && s === 'erreur' && <Alerte>La date est enregistrée, mais l’agenda Google du chef n’a pas pu être mis à jour : {statutAgenda.erreur}</Alerte>}
          {!renvoyee && s === 'sans-chef' && <Alerte>La date est enregistrée, mais aucun agenda Google n’a été mis à jour (chef sans email dans ClickUp).</Alerte>}
          <Carte accent>
            <p className="text-[18px] font-bold">{fiche?.nom}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[15px] font-bold" style={{ color: CYAN }}><CalendarCheck size={16} /> {c.quand}</p>
            {c.chef && <p className="mt-1 text-[14px]">Avec {c.chef}.{renvoyee ? '' : ' Il le voit dans ses Relevés planifiés.'}</p>}
            {!renvoyee && (s === 'cree' || s === 'deplace') && (
              <p className="mt-1 flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: VERT }}>
                <Check size={15} /> {s === 'cree' ? 'Ajouté à son agenda Google.' : 'Déplacé dans son agenda Google.'}
              </p>
            )}
          </Carte>

          <Repere>{modele === 'visite-deplacee' ? 'Mail au client : visite déplacée' : 'Mail de confirmation au client'}</Repere>
          <EcrireMail ficheId={id} modele={modele} obligatoire={!renvoyee} fixe complements={{ acces: note }} retour={{ href: c.lienFiche, libelle: 'Revenir à la fiche' }} />
          <a href={c.lienFiche} className="flex items-center justify-center gap-1 text-[15px] font-semibold" style={{ color: CYAN }}>Ouvrir la fiche <ChevronRight size={16} /></a>
          {renvoyee
            ? <button onClick={() => setRenvoi(false)} className="block w-full cursor-pointer text-center text-[15px] font-semibold" style={{ color: CYAN }}>Décaler ou annuler le rendez-vous</button>
            : <a href={adresses.agenda} className="block text-center text-[15px] font-semibold" style={{ color: CYAN }}>Voir l’agenda des visites</a>}
        </ContenuAppli>
      </PageAppli>
    );
  };

  if (cale) return confirmation(cale, 'Rendez-vous calé', false);
  if (renvoi && dejaCale) return confirmation(dejaCale, 'Renvoyer la confirmation', true);

  // Client injoignable : le mail « Visite · créneaux » s'écrit avec les créneaux choisis (rien n'est calé), puis ils
  // sont pré-réservés dans l'agenda du chef
  if (ecrireCreneaux && fiche) {
    return (
      <PageAppli>
        <EnTeteAppli surtitre="Proposer des créneaux" titre={fiche.nom} retour={{ href: adresses.affaire(id), libelle: 'Fiche' }} />
        <ContenuAppli className="space-y-4">
          <Carte accent>
            {proposes.map((p) => (
              <p key={`${p.jour}-${p.minutes}`} className="flex items-center gap-1.5 text-[15px] font-bold" style={{ color: CYAN }}>
                <CalendarCheck size={16} /> {libelleJourCourt(p.jour)} à {heureDe(p.minutes)}
              </p>
            ))}
            <p className="mt-1 text-[14px]">Rien n&apos;est calé : ces créneaux seront pré-réservés dans l&apos;agenda dès que le mail sera parti, et la fiche reste dans Visites à caler jusqu&apos;à la réponse du client.</p>
          </Carte>
          <EcrireMail
            key={proposes.map((p) => `${p.jour}-${p.minutes}`).join('|')}
            ficheId={id}
            modele="visite-creneaux"
            fixe
            complements={{ creneaux: proposes, acces: note }}
            onEnvoye={preReserver}
            retour={{ href: adresses.affaire(id), libelle: 'Revenir à la fiche' }}
          />
          {preReserve && (
            preReserve.ok
              ? <Carte><p className="flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: VERT }}><Hourglass size={15} /> {preReserve.texte}</p></Carte>
              : <Alerte>{preReserve.texte}</Alerte>
          )}
          {!preReserve && <button onClick={() => setEcrireCreneaux(false)} className="block w-full cursor-pointer text-center text-[15px] font-semibold" style={{ color: CYAN }}>Modifier les créneaux</button>}
        </ContenuAppli>
      </PageAppli>
    );
  }

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Relevé technique" titre={fiche?.nom || 'Caler le relevé'} retour={{ href: `${adresses.pipeline}?vue=a-caler`, libelle: 'Visites à caler' }} />
      <ContenuAppli className="space-y-4">
        {preview && <Alerte>Preview : seules les fiches de test (avec « Test » dans le nom) peuvent être calées.</Alerte>}
        {erreur && !fiche && <Alerte>{erreur}</Alerte>}
        {!fiche && !erreur && <Carte className="p-8 text-center"><RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} /></Carte>}
        {fiche && !fiche.aVisiter && <Alerte>Cette fiche n’est plus à visiter ({fiche.statut}) : le relevé est déjà fait.</Alerte>}
        {fiche && fiche.aVisiter && (
          <>
            {(fiche.adresse || fiche.dejaCale) && (
              <Carte className="space-y-2">
                {fiche.adresse && <p className="flex items-center gap-1.5 text-[14px]"><MapPin size={15} color={CYAN} /> {fiche.adresse}</p>}
                {fiche.dejaCale && <p className="text-[14px] font-bold">Déjà calé le {fiche.dejaCale}{fiche.duree ? ` (${fiche.duree})` : ''} : choisir un autre créneau le décale.</p>}
                <div className="flex flex-wrap gap-4">
                  {dejaCale && (
                    <button onClick={() => setRenvoi(true)} className="inline-flex cursor-pointer items-center gap-1.5 text-[14px] font-bold" style={{ color: CYAN }}>
                      <Mail size={15} /> Renvoyer la confirmation
                    </button>
                  )}
                  {fiche.dejaCale && (
                    <button onClick={annuler} disabled={envoi} className="inline-flex cursor-pointer items-center gap-1.5 text-[14px] font-bold" style={{ color: ORANGE }}>
                      <CalendarX size={15} /> Annuler le rendez-vous
                    </button>
                  )}
                </div>
              </Carte>
            )}

            <Repere>1 · Le chef de chantier</Repere>
            {chefs.length ? (
              <div className="flex flex-wrap gap-2">{chefs.map((c) => pastille(chefId === c.id, c.nom, () => setChefId(c.id)))}</div>
            ) : (
              <p className="px-1 text-[13px]">Aucun chef de chantier trouvé dans les équipes ClickUp : la date sera calée sans assignation, et sans planning.</p>
            )}
            {agenda.branche
              ? <p className="px-1 text-[12px] font-semibold" style={{ color: VERT }}>✓ Planning de l’ERP + Google Agenda du chef (avec la commune de ses rendez-vous)</p>
              : <p className="px-1 text-[12px]" style={{ color: ORANGE }}>Google Agenda pas encore branché : seul le planning de l’ERP est affiché, vérifie l’agenda du chef.</p>}
            {agenda.erreurs.map((x) => <p key={x} className="px-1 text-[12px]" style={{ color: ORANGE }}>{x}</p>)}
            {planningIncomplet && <p className="px-1 text-[12px]" style={{ color: ORANGE }}>Une partie du planning n’a pas pu être lue : vérifie avec le chef avant de confirmer.</p>}

            <Repere>2 · La durée</Repere>
            {durees.length ? (
              <div className="flex flex-wrap gap-2">{durees.map((d) => pastille(duree.libelle === d.libelle, d.libelle, () => { setDuree(d); effacer(); }))}</div>
            ) : (
              <p className="px-1 text-[13px]">Durée : 1 h (le champ ⏳ Durée relevé n’est pas trouvé sur cette fiche).</p>
            )}

            <Repere>{proposer ? '3 · Les créneaux à proposer' : '3 · Le créneau'}</Repere>
            {!proposer && proposesDuChef.length > 0 && (
              <Carte className="space-y-3">
                <p className="flex items-center gap-1.5 text-[15px] font-bold"><Hourglass size={16} color={ORANGE} /> Créneaux proposés au client, pré-réservés</p>
                {proposesDuChef.map((p) => {
                  const actif = !!choix && choix.jour === p.jour && choix.minutes === p.minutes;
                  return (
                    <div key={`${p.jour}-${p.minutes}`} className="flex items-center justify-between gap-3">
                      <p className="text-[15px] font-semibold">{libelleJourCourt(p.jour)} à {heureDe(p.minutes)}</p>
                      <button
                        type="button"
                        onClick={() => calerPropose(p)}
                        className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-bold ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#0097b2]'}`}
                        style={actif ? { backgroundColor: CYAN } : { color: CYAN }}
                      >
                        {actif ? <Check size={15} /> : <CalendarCheck size={15} />} {actif ? 'Choisi' : 'Caler ce créneau'}
                      </button>
                    </div>
                  );
                })}
                <p className="text-[12px] text-slate-500">Quand le client a choisi, cale son créneau : les autres pré-réservations sont retirées de l&apos;agenda.</p>
              </Carte>
            )}
            {proposer ? (
              <button onClick={basculerProposer} className="block cursor-pointer px-1 text-left text-[14px] font-bold" style={{ color: CYAN }}>← Revenir au calage du rendez-vous</button>
            ) : (
              <BoutonSecondaire compact onClick={basculerProposer}>
                <Mail size={17} /> {proposesDuChef.length ? 'Client injoignable : changer les créneaux proposés' : 'Client injoignable : proposer des créneaux par mail'}
              </BoutonSecondaire>
            )}
            {chefId === null && chefs.length > 0 ? (
              <p className="px-1 text-[14px] font-semibold">Choisis d’abord le chef de chantier pour voir son agenda.</p>
            ) : (
              <AgendaSemaine
                blocs={blocs}
                journees={journees}
                duree={duree.minutes}
                marge={MARGE_ROUTE}
                choix={proposer ? null : choix}
                onChoisir={choisir}
                semaine={semaine}
                onSemaine={setSemaine}
                marques={marques}
              />
            )}

            {proposer ? (
              <>
                <Carte className="space-y-2">
                  {proposes.length ? proposes.map((p) => (
                    <div key={`${p.jour}-${p.minutes}`} className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-1.5 text-[15px] font-bold"><CalendarCheck size={16} color={CYAN} /> {libelleJourCourt(p.jour)} à {heureDe(p.minutes)}</p>
                      <button onClick={() => choisir(p.jour, p.minutes)} aria-label="Retirer ce créneau" className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[13px] font-bold" style={{ color: ORANGE }}>
                        <X size={15} /> Retirer
                      </button>
                    </div>
                  )) : (
                    <p className="text-[14px]">Touche jusqu&apos;à {PROPOSES_MAX} créneaux blancs sur l&apos;agenda : ils restent marqués, puis seront proposés au client dans le mail et pré-réservés. Les rendez-vous dans sa ville sont mis en avant.</p>
                  )}
                </Carte>
                <div>
                  <label className={ETIQUETTE}>Accès et remarques (facultatif)</label>
                  <textarea className={`${CHAMP} mt-1.5 min-h-[90px]`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Code portail, gardien à prévenir, place de parking, qui sera présent…" />
                </div>
                <BoutonPrincipal inactif={!proposes.length} disabled={!proposes.length} onClick={() => { setPreReserve(null); setEcrireCreneaux(true); }}>
                  <Mail size={20} /> {proposes.length > 1 ? 'Écrire le mail avec ces créneaux' : 'Écrire le mail avec ce créneau'}
                </BoutonPrincipal>
              </>
            ) : (
              <>
                <div id="creneau-choisi" className="scroll-mt-4">
                  {choix ? (
                    <Carte accent>
                      <div className="flex items-start justify-between gap-3">
                        <p className="flex items-center gap-1.5 text-[16px] font-bold"><CalendarCheck size={17} color={CYAN} /> {libelleJourCourt(choix.jour)} à {heureDe(choix.minutes)} · {duree.libelle}</p>
                        <button onClick={effacer} aria-label="Effacer le créneau" className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[13px] font-bold" style={{ color: ORANGE }}>
                          <X size={15} /> Effacer
                        </button>
                      </div>
                      {journeeDuChoix.map((x, i) => (
                        <p key={i} className="mt-1 flex items-center gap-1.5 text-[13px] font-bold" style={{ color: ORANGE }}>
                          <AlertTriangle size={14} /> {x.titre} ce jour-là : vérifie avec le chef.
                        </p>
                      ))}
                    </Carte>
                  ) : (
                    <p className="px-1 text-[13px] text-slate-500">Touche un créneau blanc pour placer le relevé ({duree.libelle}, 30 min de route comprises autour des autres rendez-vous). Le toucher à nouveau l’efface.</p>
                  )}
                </div>

                <div>
                  <label className={ETIQUETTE}>Accès et remarques (facultatif)</label>
                  <textarea className={`${CHAMP} mt-1.5 min-h-[90px]`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Code portail, gardien à prévenir, place de parking, qui sera présent…" />
                </div>

                {erreur && <Alerte>{erreur}</Alerte>}
                <BoutonPrincipal inactif={!pret || envoi} disabled={!pret || envoi} onClick={envoyer}>
                  {envoi ? <RefreshCw size={20} className="animate-spin" /> : <CalendarCheck size={20} />}
                  {envoi ? 'Enregistrement…' : fiche.dejaCale ? 'Décaler le relevé' : 'Caler le relevé'}
                </BoutonPrincipal>
                <p className="text-center text-[12px] text-slate-500">Ensuite, le RDV part dans l’agenda du chef et le mail au client s’ouvre ici, déjà rempli : il est obligatoire.</p>
              </>
            )}
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
