"use client";

// Caler le relevé technique (17/10/2026, 20 h 44, choix de Matthieu : « Caler + email de confirmation prêt à
// envoyer »). Le commercial a le client au téléphone : chef de chantier, créneau, note d'accès. Ensuite l'email de
// confirmation s'ouvre déjà rédigé, il le relit et l'envoie (ou le copie).
// 17/10, 20 h 53 : ?confirmation=1 (« Renvoyer la confirmation » de la fiche) ouvre directement l'email du rendez-vous
// déjà calé, sans recaler.
// 17/10, 20 h 59 et 21 h 16 : planning du chef (ERP) + son Google Agenda (tous ses agendas affichés, horaires seulement).
// 17/10, 22 h 35 : l'erreur d'enregistrement s'affiche juste au-dessus du bouton.
// 17/10, 22 h 42 (Matthieu : « un vrai agenda avec les créneaux, les jours, et on clique sur un créneau libre ») :
//   agenda de la semaine (src/components/ui/AgendaSemaine.tsx) au lieu des pastilles de jours et d'heures. Durées
//   supposées des rendez-vous de l'ERP (ils n'ont qu'une heure de début) : relevé 1 h, maintenance et dépannage 1 h 30,
//   pose avec heure 4 h ; pose sans heure = bandeau « chantier » sur la journée. Marge de route 30 min.
//   Email (Matthieu : « il faudrait que ça ouvre l'application Gmail ») : comme les boutons des fiches contact, sur
//   iPhone et iPad l'application Gmail (googlegmail://co), ailleurs Gmail web sur le compte CHARGéO (authuser). La
//   signature dépend des réglages Gmail du compte (signature par défaut des nouveaux messages, signature mobile).
// Écrit par /api/interne/caler. Ouvert depuis « Visites à caler » et depuis la fiche affaire.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CalendarCheck, Check, ChevronRight, Copy, Mail, MapPin, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';
import AgendaSemaine, { heureDe, libelleJourCourt, type BlocAgenda, type JourneeAgenda } from '@/components/ui/AgendaSemaine';

type Fiche = { id: string; nom: string; statut: string; aVisiter: boolean; adresse: string; ville?: string; email: string; telephone: string; dejaCale: string };
type Chef = { id: number; nom: string };
type Email = { a: string; sujet: string; texte: string; signature?: string };
type Cale = { quand: string; chef: string; lienFiche: string };
type TypeRdv = 'pose' | 'visite' | 'depannage' | 'releve';
type Occupation = { jour: string; minutes: number | null; type: TypeRdv; nom: string; ville: string; techniciens: number[] };
type CreneauAgenda = { chefId: number; jour: string; debut: number; fin: number; journee: boolean };
type Agenda = { branche: boolean; creneaux: CreneauAgenda[]; erreurs: string[] };
type StatutAgenda = 'cree' | 'deplace' | 'non-branche' | 'sans-chef' | 'erreur';

const DUREE_RELEVE = 60;
const MARGE_ROUTE = 30;
const DUREE_ERP: Record<TypeRdv, number> = { releve: 60, visite: 90, depannage: 90, pose: 240 };
const VERT = '#16a34a';
const TYPES: Record<TypeRdv, string> = { pose: '🏗️ Pose', visite: '🔧 Maintenance', depannage: '🚨 Dépannage', releve: '📋 Relevé' };
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// iPhone, iPad (y compris iPadOS qui se présente comme un Mac tactile), comme src/components/ui/BlocContact.tsx
function estIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator as any).maxTouchPoints > 1);
}
// Nouveau message Gmail déjà rédigé : application Gmail sur iPhone et iPad, Gmail web sur le compte CHARGéO ailleurs
const lienGmail = (e: Email, moi: string, ios: boolean) =>
  ios
    ? `googlegmail://co?to=${encodeURIComponent(e.a)}&subject=${encodeURIComponent(e.sujet)}&body=${encodeURIComponent(e.texte)}`
    : `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(e.a)}&su=${encodeURIComponent(e.sujet)}&body=${encodeURIComponent(e.texte)}${moi ? `&authuser=${encodeURIComponent(moi)}` : ''}`;

export default function CalerPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [planningIncomplet, setPlanningIncomplet] = useState(false);
  const [agenda, setAgenda] = useState<Agenda>({ branche: false, creneaux: [], erreurs: [] });
  const [preview, setPreview] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const [semaine, setSemaine] = useState(0);
  const [chefId, setChefId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [cale, setCale] = useState<Cale | null>(null);
  const [email, setEmail] = useState<Email | null>(null);
  // Rendez-vous déjà calé (lu à l'ouverture) : pour renvoyer la confirmation
  const [dejaCale, setDejaCale] = useState<{ cale: Cale; email: Email } | null>(null);
  const [renvoi, setRenvoi] = useState(false);
  const [chefOk, setChefOk] = useState(true);
  const [statutAgenda, setStatutAgenda] = useState<{ statut: StatutAgenda; erreur: string }>({ statut: 'non-branche', erreur: '' });
  const [copie, setCopie] = useState(false);
  const [ios, setIos] = useState(false);
  const [moi, setMoi] = useState('');

  useEffect(() => {
    setIos(estIOS());
    fetch('/api/interne/moi', { cache: 'no-store' }).then((r) => r.json()).then((j) => setMoi(String(j?.email || ''))).catch(() => null);
  }, []);

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
          setPreview(!!data.preview);
          setChefId(data.chefAssigne || (data.chefs?.length === 1 ? data.chefs[0].id : null));
          if (data.cale && data.emailConfirmation) {
            setDejaCale({ cale: data.cale, email: data.emailConfirmation });
            if (confirmation) setRenvoi(true);
          }
        }
      } catch {
        setErreur('Impossible de joindre le serveur.');
      }
    })();
  }, [id]);

  // Planning du chef choisi (ERP + Google Agenda) mis en forme pour l'agenda de la semaine
  const memeVille = (ville: string) => !!fiche?.ville && !!ville && normal(ville) === normal(fiche.ville);
  const duChef = chefId === null ? [] : occupations.filter((o) => o.techniciens.includes(chefId));
  const agendaDuChef = chefId === null ? [] : agenda.creneaux.filter((c) => c.chefId === chefId);
  const blocs: BlocAgenda[] = duChef
    .filter((o) => o.minutes !== null)
    .map((o) => ({ jour: o.jour, debut: o.minutes as number, fin: (o.minutes as number) + DUREE_ERP[o.type], titre: TYPES[o.type], detail: [o.nom, o.ville].filter(Boolean).join(' · '), ton: (memeVille(o.ville) ? 'proche' : 'erp') as BlocAgenda['ton'] }))
    .concat(agendaDuChef.filter((c) => !c.journee).map((c) => ({ jour: c.jour, debut: c.debut, fin: c.fin, titre: 'Occupé', detail: 'Agenda Google', ton: 'agenda' as BlocAgenda['ton'] })));
  const journees: JourneeAgenda[] = duChef
    .filter((o) => o.minutes === null)
    .map((o) => ({ jour: o.jour, titre: o.type === 'pose' ? `🏗️ Chantier ${o.ville || o.nom}` : `${TYPES[o.type]} ${o.nom}` }))
    .concat(agendaDuChef.filter((c) => c.journee).map((c) => ({ jour: c.jour, titre: '📆 Journée' })));
  const choix = date && /^\d{2}:\d{2}$/.test(heure) ? { jour: date, minutes: Number(heure.slice(0, 2)) * 60 + Number(heure.slice(3, 5)) } : null;
  const journeeDuChoix = choix ? journees.filter((x) => x.jour === choix.jour) : [];
  const choisir = (jour: string, minutes: number) => {
    setDate(jour);
    setHeure(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
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
        body: JSON.stringify({ id, date, heure, chefId, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) setErreur(data?.error || `Enregistrement impossible (${res.status})`);
      else {
        setCale(data.cale);
        setEmail(data.emailConfirmation);
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

  const pastille = (actif: boolean, libelle: string, changer: () => void) => (
    <button key={libelle} onClick={changer} className={`rounded-full px-4 py-2 text-[14px] font-bold ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={actif ? { backgroundColor: CYAN } : undefined}>
      {libelle}
    </button>
  );
  const boutonRetour = (
    <a href="/interne/fiches?vue=a-caler" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Visites à caler
    </a>
  );

  // Écran de confirmation : juste après avoir calé, ou « Renvoyer la confirmation »
  const confirmation = (c: Cale, e: Email, titre: string, renvoyee: boolean) => {
    const gmail = e.a ? lienGmail(e, moi, ios) : '';
    const copier = async () => {
      try { await navigator.clipboard.writeText(`${e.sujet}\n\n${e.texte}${e.signature ? `\n${e.signature}` : ''}`); setCopie(true); } catch { setCopie(false); }
    };
    const s = statutAgenda.statut;
    return (
      <PageAppli>
        <EnTeteAppli surtitre="Relevé technique" titre={titre} retour={{ href: c.lienFiche, libelle: 'Fiche' }} />
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

          <Repere>Email de confirmation</Repere>
          {gmail ? (
            <a href={gmail} target={ios ? undefined : '_blank'} rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-8 py-4 text-[17px] font-semibold text-white shadow-[0_8px_22px_rgba(255,107,0,0.28)]">
              <Mail size={20} /> Ouvrir dans Gmail pour {e.a}
            </a>
          ) : (
            <Alerte>Pas d’email sur la fiche du client : copie le texte et envoie-le par le moyen de ton choix.</Alerte>
          )}
          <p className="px-1 text-[12px] text-slate-500">Sur iPhone et iPad, l’application Gmail s’ouvre ; ailleurs, Gmail sur ton compte CHARGéO. Ta signature Gmail s’ajoute si elle est réglée pour les nouveaux messages. Le texte est aussi gardé dans les commentaires de la fiche.</p>
          <Carte className="space-y-2">
            <p className="text-[13px] font-bold text-slate-500">{e.sujet}</p>
            <p className="whitespace-pre-line text-[14px] leading-relaxed">{e.texte}</p>
            <p className="text-[13px] italic text-slate-400">+ ta signature</p>
          </Carte>
          <button onClick={copier} className="flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-bold ring-[1.5px] ring-[#dfe3e8]" style={{ color: CYAN }}>
            {copie ? <Check size={17} /> : <Copy size={17} />} {copie ? 'Texte copié (avec ton nom)' : 'Copier le texte'}
          </button>
          <a href={c.lienFiche} className="flex items-center justify-center gap-1 text-[15px] font-semibold" style={{ color: CYAN }}>Ouvrir la fiche <ChevronRight size={16} /></a>
          {renvoyee
            ? <button onClick={() => setRenvoi(false)} className="block w-full text-center text-[15px] font-semibold" style={{ color: CYAN }}>Décaler le rendez-vous</button>
            : <a href="/interne/agenda" className="block text-center text-[15px] font-semibold" style={{ color: CYAN }}>Voir l’agenda des visites</a>}
        </ContenuAppli>
      </PageAppli>
    );
  };

  if (cale && email) return confirmation(cale, email, 'Rendez-vous calé', false);
  if (renvoi && dejaCale) return confirmation(dejaCale.cale, dejaCale.email, 'Renvoyer la confirmation', true);

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Relevé technique" titre={fiche?.nom || 'Caler le relevé'} action={boutonRetour} />
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
                {fiche.dejaCale && <p className="text-[14px] font-bold">Déjà calé le {fiche.dejaCale} : enregistrer décale le rendez-vous.</p>}
                {dejaCale && (
                  <button onClick={() => setRenvoi(true)} className="inline-flex items-center gap-1.5 text-[14px] font-bold" style={{ color: CYAN }}>
                    <Mail size={15} /> Renvoyer la confirmation
                  </button>
                )}
              </Carte>
            )}

            <Repere>1 · Le chef de chantier</Repere>
            {chefs.length ? (
              <div className="flex flex-wrap gap-2">{chefs.map((c) => pastille(chefId === c.id, c.nom, () => setChefId(c.id)))}</div>
            ) : (
              <p className="px-1 text-[13px]">Aucun chef de chantier trouvé dans les équipes ClickUp : la date sera calée sans assignation, et sans planning.</p>
            )}
            {agenda.branche
              ? <p className="px-1 text-[12px] font-semibold" style={{ color: VERT }}>✓ Planning de l’ERP + Google Agenda du chef</p>
              : <p className="px-1 text-[12px]" style={{ color: ORANGE }}>Google Agenda pas encore branché : seul le planning de l’ERP est affiché, vérifie l’agenda du chef.</p>}
            {agenda.erreurs.map((x) => <p key={x} className="px-1 text-[12px]" style={{ color: ORANGE }}>{x}</p>)}
            {planningIncomplet && <p className="px-1 text-[12px]" style={{ color: ORANGE }}>Une partie du planning n’a pas pu être lue : vérifie avec le chef avant de confirmer.</p>}

            <Repere>2 · Le créneau</Repere>
            {chefId === null && chefs.length > 0 ? (
              <p className="px-1 text-[14px] font-semibold">Choisis d’abord le chef de chantier pour voir son agenda.</p>
            ) : (
              <AgendaSemaine
                blocs={blocs}
                journees={journees}
                duree={DUREE_RELEVE}
                marge={MARGE_ROUTE}
                choix={choix}
                onChoisir={choisir}
                semaine={semaine}
                onSemaine={setSemaine}
              />
            )}
            {choix ? (
              <Carte accent>
                <p className="flex items-center gap-1.5 text-[16px] font-bold"><CalendarCheck size={17} color={CYAN} /> {libelleJourCourt(choix.jour)} à {heureDe(choix.minutes)} · 1 h</p>
                {journeeDuChoix.map((x, i) => (
                  <p key={i} className="mt-1 flex items-center gap-1.5 text-[13px] font-bold" style={{ color: ORANGE }}>
                    <AlertTriangle size={14} /> {x.titre} ce jour-là : vérifie avec le chef.
                  </p>
                ))}
              </Carte>
            ) : (
              <p className="px-1 text-[13px] text-slate-500">Touche un créneau blanc pour placer le relevé (1 h, 30 min de route comprises autour des autres rendez-vous).</p>
            )}

            <div>
              <label className={ETIQUETTE}>Accès et remarques (facultatif)</label>
              <textarea className={`${CHAMP} mt-1.5 min-h-[90px]`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Code portail, gardien à prévenir, place de parking, qui sera présent…" />
            </div>

            {erreur && <Alerte>{erreur}</Alerte>}
            <BoutonPrincipal inactif={!pret || envoi} disabled={!pret || envoi} onClick={envoyer}>
              {envoi ? <RefreshCw size={20} className="animate-spin" /> : <CalendarCheck size={20} />}
              {envoi ? 'Enregistrement…' : fiche.dejaCale ? 'Décaler le relevé' : 'Caler le relevé'}
            </BoutonPrincipal>
            <p className="text-center text-[12px] text-slate-500">Ensuite, le RDV part dans l’agenda du chef et l’email de confirmation au client est prêt à envoyer.</p>
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
