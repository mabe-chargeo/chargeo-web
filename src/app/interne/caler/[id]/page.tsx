"use client";

// Caler le relevé technique (17/10/2026, 20 h 44, choix de Matthieu : « Caler + email de confirmation prêt à
// envoyer »). Le commercial a le client au téléphone : chef de chantier, jour, heure, note d'accès. Ensuite l'email
// de confirmation s'ouvre dans sa messagerie, déjà rédigé, qu'il relit et envoie (ou qu'il copie).
// 17/10, 20 h 53 : la messagerie ajoute sa signature ; ?confirmation=1 (« Renvoyer la confirmation » de la fiche)
// ouvre directement l'email du rendez-vous déjà calé, sans recaler.
// 17/10, 20 h 59 (Matthieu : « comment je fais pour caler un rendez-vous si je n'ai pas de vue sur le planning ? ») :
// le chef d'abord, puis les jours avec sa charge (libre, 1 RDV, chantier…), puis sa journée (heure, type, nom, ville :
// pour regrouper les visites d'un même secteur) et les créneaux, grisés quand un rendez-vous est à moins d'1 h 30.
// 17/10, 21 h 16 : + le Google Agenda du chef (créneaux occupés, sans détail). Un créneau d'1 h est grisé s'il
// chevauche un événement de l'agenda, avec 30 min de marge pour la route. Le RDV calé part dans l'agenda du chef.
// Écrit par /api/interne/caler. Ouvert depuis « Visites à caler » et depuis la fiche affaire.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CalendarCheck, Check, ChevronRight, Copy, Mail, MapPin, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';

type Fiche = { id: string; nom: string; statut: string; aVisiter: boolean; adresse: string; ville?: string; email: string; telephone: string; dejaCale: string };
type Chef = { id: number; nom: string };
type Email = { a: string; sujet: string; texte: string; signature?: string };
type Cale = { quand: string; chef: string; lienFiche: string };
type Occupation = { jour: string; minutes: number | null; type: 'pose' | 'visite' | 'depannage' | 'releve'; nom: string; ville: string; techniciens: number[] };
type CreneauAgenda = { chefId: number; jour: string; debut: number; fin: number; journee: boolean };
type Agenda = { branche: boolean; creneaux: CreneauAgenda[]; erreurs: string[] };
type StatutAgenda = 'cree' | 'deplace' | 'non-branche' | 'sans-chef' | 'erreur';
type Ligne = { cle: string; tri: number; heure: string; titre: string; detail: string; ville: string; memeVille: boolean };

const CRENEAUX = ['08:00', '09:00', '10:00', '11:00', '13:30', '14:30', '15:30', '16:30'];
const ECART_MINUTES = 90;
const DUREE_RELEVE = 60;
const MARGE_ROUTE = 30;
const VERT = '#16a34a';
const TYPES: Record<Occupation['type'], string> = { pose: '🏗️ Pose', visite: '🔧 Maintenance', depannage: '🚨 Dépannage', releve: '📋 Relevé' };
const jourIso = (decalage: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + decalage * 86400000));
const libelleJour = (iso: string) => {
  const [a, m, j] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, j, 12)));
};
const enMinutes = (h: string) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const heureDe = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}h${String(min % 60).padStart(2, '0')}`;
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// Les 10 prochains jours ouvrés (lundi à vendredi), à partir de demain
const prochainsJours = () => {
  const jours: string[] = [];
  for (let i = 1; jours.length < 10 && i < 20; i++) {
    const iso = jourIso(i);
    const [a, m, j] = iso.split('-').map(Number);
    const w = new Date(Date.UTC(a, m - 1, j, 12)).getUTCDay();
    if (w !== 0 && w !== 6) jours.push(iso);
  }
  return jours;
};

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
  const jours = prochainsJours();

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

  // Planning du chef choisi : ERP + Google Agenda
  const duChef = chefId === null ? [] : occupations.filter((o) => o.techniciens.includes(chefId));
  const duJour = (j: string) => duChef.filter((o) => o.jour === j);
  const agendaDuJour = (j: string) => (chefId === null ? [] : agenda.creneaux.filter((c) => c.chefId === chefId && c.jour === j));
  const journee = date ? duJour(date) : [];
  const agendaJour = date ? agendaDuJour(date) : [];
  const chantierSansHeure = journee.some((o) => o.type === 'pose' && o.minutes === null);
  const agendaJourneeEntiere = agendaJour.some((c) => c.journee);
  const pris = (h: string) => {
    const m = enMinutes(h);
    return (
      journee.some((o) => o.minutes !== null && Math.abs(o.minutes - m) < ECART_MINUTES) ||
      agendaJour.some((c) => !c.journee && m < c.fin + MARGE_ROUTE && m + DUREE_RELEVE > c.debut - MARGE_ROUTE)
    );
  };
  const memeVille = (ville: string) => !!fiche?.ville && !!ville && normal(ville) === normal(fiche.ville);
  const charge = (j: string) => {
    const l = duJour(j);
    const g = agendaDuJour(j);
    if (l.some((o) => o.type === 'pose')) return { texte: 'chantier', alerte: true };
    if (g.some((c) => c.journee)) return { texte: 'agenda : journée', alerte: true };
    const n = l.length + g.length;
    if (!n) return { texte: 'libre', alerte: false };
    return { texte: `${n} RDV`, alerte: false };
  };
  const lignes: Ligne[] = journee
    .map((o, i) => ({ cle: `e${i}`, tri: o.minutes === null ? -1 : o.minutes, heure: o.minutes === null ? 'journée' : heureDe(o.minutes), titre: TYPES[o.type], detail: o.nom, ville: o.ville, memeVille: memeVille(o.ville) }))
    .concat(agendaJour.map((c, i) => ({ cle: `g${i}`, tri: c.journee ? -1 : c.debut, heure: c.journee ? 'journée' : heureDe(c.debut), titre: '📆 Agenda Google', detail: c.journee ? 'occupé toute la journée' : `occupé jusqu’à ${heureDe(c.fin)}`, ville: '', memeVille: false })))
    .sort((a, b) => a.tri - b.tri);

  const pret = !!date && /^\d{2}:\d{2}$/.test(heure) && (chefs.length === 0 || chefId !== null);
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
  const retour = '/interne/fiches?vue=a-caler';
  const boutonRetour = (
    <a href={retour} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Visites à caler
    </a>
  );

  // Écran de confirmation : juste après avoir calé, ou « Renvoyer la confirmation »
  const confirmation = (c: Cale, e: Email, titre: string, renvoyee: boolean) => {
    const mailto = e.a ? `mailto:${encodeURIComponent(e.a)}?subject=${encodeURIComponent(e.sujet)}&body=${encodeURIComponent(e.texte)}` : '';
    const copier = async () => {
      try { await navigator.clipboard.writeText(`${e.sujet}\n\n${e.texte}${e.signature ? `\n${e.signature}` : ''}`); setCopie(true); } catch { setCopie(false); }
    };
    const s = statutAgenda.statut;
    return (
      <PageAppli>
        <EnTeteAppli surtitre="Relevé technique" titre={titre} retour={{ href: c.lienFiche, libelle: 'Fiche' }} />
        <ContenuAppli className="space-y-4">
          {preview && !renvoyee && <Alerte>Preview : seule la fiche « Test · … » a été modifiée.</Alerte>}
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
          {mailto ? (
            <a href={mailto} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-8 py-4 text-[17px] font-semibold text-white shadow-[0_8px_22px_rgba(255,107,0,0.28)]">
              <Mail size={20} /> Ouvrir l’email pour {e.a}
            </a>
          ) : (
            <Alerte>Pas d’email sur la fiche du client : copie le texte et envoie-le par le moyen de ton choix.</Alerte>
          )}
          <p className="px-1 text-[12px] text-slate-500">Ta messagerie ajoute ta signature sous le texte. Le texte est aussi gardé dans les commentaires de la fiche.</p>
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
        {preview && <Alerte>Preview : seules les fiches « Test · … » peuvent être calées.</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
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

            <Repere>2 · Le jour</Repere>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {jours.map((j) => {
                const actif = date === j;
                const c = charge(j);
                return (
                  <button
                    key={j}
                    onClick={() => { setDate(j); setHeure(''); }}
                    className={`rounded-[16px] px-3 py-2.5 text-left ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`}
                    style={actif ? { backgroundColor: CYAN } : undefined}
                  >
                    <span className="block text-[14px] font-bold">{libelleJour(j)}</span>
                    {chefId !== null && (
                      <span className="block text-[12px] font-semibold" style={actif ? undefined : { color: c.alerte ? ORANGE : c.texte === 'libre' ? VERT : CYAN }}>{c.texte}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <input type="date" className={CHAMP} value={date} min={jourIso(0)} onChange={(e) => { setDate(e.target.value); setHeure(''); }} />

            {date && chefId !== null && (
              <Carte className="space-y-2">
                <p className="text-[13px] font-bold text-slate-500">Journée du chef, {libelleJour(date)}</p>
                {!lignes.length && <p className="text-[14px] font-semibold" style={{ color: VERT }}>Rien de prévu ce jour-là.</p>}
                {lignes.map((l) => (
                  <p key={l.cle} className="flex items-start gap-2 text-[14px]">
                    <span className="w-[52px] shrink-0 font-bold">{l.heure}</span>
                    <span className="min-w-0">
                      <span className="font-semibold">{l.titre}</span> · {l.detail}
                      {l.ville && <span className="font-semibold" style={{ color: l.memeVille ? VERT : undefined }}> · {l.ville}{l.memeVille ? ' (même ville)' : ''}</span>}
                    </span>
                  </p>
                ))}
                {chantierSansHeure && (
                  <p className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: ORANGE }}>
                    <AlertTriangle size={15} /> Chantier prévu ce jour-là sans heure : sans doute la journée entière, vérifie avec le chef.
                  </p>
                )}
                {agendaJourneeEntiere && (
                  <p className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: ORANGE }}>
                    <AlertTriangle size={15} /> Événement sur toute la journée dans son agenda (congé, formation…) : vérifie avec le chef.
                  </p>
                )}
              </Carte>
            )}

            <Repere>3 · L&apos;heure</Repere>
            <div className="flex flex-wrap gap-2">
              {CRENEAUX.map((h) => {
                const occupe = pris(h);
                const actif = heure === h;
                return (
                  <button
                    key={h}
                    onClick={() => setHeure(h)}
                    className={`rounded-full px-4 py-2 text-[14px] font-bold ${actif ? 'text-white' : occupe ? 'bg-[#eef1f4] text-slate-400 line-through' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`}
                    style={actif ? { backgroundColor: occupe ? ORANGE : CYAN } : undefined}
                    title={occupe ? 'Le chef est déjà pris autour de ce créneau' : undefined}
                  >
                    {h.replace(':', 'h')}
                  </button>
                );
              })}
            </div>
            <input type="time" className={CHAMP} value={heure} step={900} onChange={(e) => setHeure(e.target.value)} />
            {heure && pris(heure) && (
              <p className="flex items-center gap-1.5 px-1 text-[13px] font-bold" style={{ color: ORANGE }}>
                <AlertTriangle size={15} /> Le chef est déjà pris autour de ce créneau (rendez-vous ou agenda).
              </p>
            )}

            <div>
              <label className={ETIQUETTE}>Accès et remarques (facultatif)</label>
              <textarea className={`${CHAMP} mt-1.5 min-h-[90px]`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Code portail, gardien à prévenir, place de parking, qui sera présent…" />
            </div>

            <BoutonPrincipal inactif={!pret || envoi} disabled={!pret || envoi} onClick={envoyer}>
              {envoi ? <RefreshCw size={20} className="animate-spin" /> : <CalendarCheck size={20} />}
              {fiche.dejaCale ? 'Décaler le relevé' : 'Caler le relevé'}
            </BoutonPrincipal>
            <p className="text-center text-[12px] text-slate-500">Ensuite, le RDV part dans l’agenda du chef et l’email de confirmation au client est prêt à envoyer.</p>
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
