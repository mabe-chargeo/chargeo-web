"use client";

// Caler une visite de maintenance ou un dépannage SAV (18/10/2026, 8 h 31, Matthieu : « Fais maintenance et SAV »).
// 1 les techniciens (installateurs puis chefs de chantier), 2 la durée (⏳ Durée RDV), 3 le créneau dans l'agenda de la
// semaine (src/components/ui/AgendaSemaine.tsx) avec le planning ERP et le Google Agenda des techniciens choisis : libre
// si personne n'est pris, 30 min de route comprises. Le créneau choisi s'efface en le touchant à nouveau ou avec
// « Effacer » ; « Annuler le rendez-vous » pour une fiche déjà calée. Écrit par /api/interne/rdv. Ouvert depuis le Planning.
// 19/10/2026, 18 h 43 (adresses propres) : écran commun aux deux pages /maintenance/<id>/caler (type visite) et
// /sav/<id>/caler (type depannage). Le type vient de la page (et non plus de l'adresse /interne/rdv/<type>/<id>) ;
// le reste est l'ancien écran src/app/interne/rdv/[type]/[id]/page.tsx sans changement.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, CalendarCheck, CalendarX, Check, ChevronRight, HardHat, MapPin, RefreshCw, X } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte, BoutonPrincipal } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';
import AgendaSemaine, { heureDe, libelleJourCourt, type BlocAgenda, type JourneeAgenda } from '@/components/ui/AgendaSemaine';
import { adresses } from '@/lib/adresses';

type TypeBloc = 'pose' | 'visite' | 'depannage' | 'releve';
type Personne = { id: number; nom: string; role: string };
type Bloc = { jour: string; debut: number; fin: number; journee: boolean; type: TypeBloc; nom: string; ville: string; personnes: number[] };
type Creneau = { personne: number; jour: string; debut: number; fin: number; journee: boolean };
type Rdv = { id: string; type: 'visite' | 'depannage'; libelle: string; nom: string; statut: string; ouvert: boolean; adresse: string; ville: string; quand: string; duree: string; techniciens: number[] };
type Duree = { libelle: string; minutes: number };
type Resultat = { quand: string; duree: string; statut: string; equipe: string[]; agenda: { nom: string; statut: string; erreur?: string }[]; avertissements: string[]; lienFiche: string };

const VERT = '#16a34a';
const MARGE_ROUTE = 30;
const TYPES: Record<TypeBloc, string> = { pose: '🏗️ Pose', visite: '🔧 Maintenance', depannage: '🚨 Dépannage', releve: '📋 Relevé' };
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function EcranCalerRdv({ type }: { type: 'visite' | 'depannage' }) {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const [rdv, setRdv] = useState<Rdv | null>(null);
  const [personnes, setPersonnes] = useState<Personne[]>([]);
  const [blocsErp, setBlocsErp] = useState<Bloc[]>([]);
  const [agenda, setAgenda] = useState<{ branche: boolean; creneaux: Creneau[]; erreurs: string[] }>({ branche: false, creneaux: [], erreurs: [] });
  const [durees, setDurees] = useState<Duree[]>([]);
  const [duree, setDuree] = useState<Duree>({ libelle: '1 h 30', minutes: 90 });
  const [champManquant, setChampManquant] = useState(false);
  const [planningIncomplet, setPlanningIncomplet] = useState(false);
  const [preview, setPreview] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choisis, setChoisis] = useState<number[]>([]);
  const [semaine, setSemaine] = useState(0);
  const [choix, setChoix] = useState<{ jour: string; minutes: number } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [annule, setAnnule] = useState(false);

  useEffect(() => {
    if (!id || !type) return;
    (async () => {
      try {
        const res = await fetch(`/api/interne/rdv?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) { setErreur(data?.error || `Lecture impossible (${res.status})`); return; }
        setRdv(data.rdv);
        setPersonnes(data.personnes || []);
        setBlocsErp(data.blocs || []);
        if (data.agenda) setAgenda({ branche: !!data.agenda.branche, creneaux: data.agenda.creneaux || [], erreurs: data.agenda.erreurs || [] });
        const ds: Duree[] = Array.isArray(data.durees) ? data.durees : [];
        setDurees(ds);
        const actuelle = ds.find((d) => d.libelle === data.rdv?.duree) || ds.find((d) => d.minutes === 90);
        if (actuelle) setDuree(actuelle);
        setChampManquant(!!data.champDureeManquant);
        setPlanningIncomplet(!!data.planningIncomplet);
        setPreview(!!data.preview);
        setChoisis((data.rdv?.techniciens || []).filter((n: number) => (data.personnes || []).some((p: Personne) => p.id === n)));
      } catch {
        setErreur('Impossible de joindre le serveur.');
      }
    })();
  }, [id, type]);

  const prenom = (pid: number) => (personnes.find((p) => p.id === pid)?.nom || '').split(/\s+/)[0];
  const memeVille = (ville: string) => !!rdv?.ville && !!ville && normal(ville) === normal(rdv.ville);
  const deQui = (ids: number[]) => ids.filter((p) => choisis.includes(p)).map(prenom).join(', ');
  const blocs: BlocAgenda[] = blocsErp
    .filter((b) => !b.journee && b.personnes.some((p) => choisis.includes(p)))
    .map((b) => ({ jour: b.jour, debut: b.debut, fin: b.fin, titre: TYPES[b.type], detail: [deQui(b.personnes), b.nom, b.ville].filter(Boolean).join(' · '), ton: (memeVille(b.ville) ? 'proche' : 'erp') as BlocAgenda['ton'] }))
    .concat(agenda.creneaux.filter((c) => !c.journee && choisis.includes(c.personne)).map((c) => ({ jour: c.jour, debut: c.debut, fin: c.fin, titre: 'Occupé', detail: `Agenda de ${prenom(c.personne)}`, ton: 'agenda' as BlocAgenda['ton'] })));
  const journees: JourneeAgenda[] = blocsErp
    .filter((b) => b.journee && b.personnes.some((p) => choisis.includes(p)))
    .map((b) => ({ jour: b.jour, titre: `${TYPES[b.type]} ${deQui(b.personnes)}` }))
    .concat(agenda.creneaux.filter((c) => c.journee && choisis.includes(c.personne)).map((c) => ({ jour: c.jour, titre: `📆 ${prenom(c.personne)}` })));
  const alertesChoix = choix ? journees.filter((x) => x.jour === choix.jour) : [];

  const basculer = (pid: number) => { setChoisis(choisis.includes(pid) ? choisis.filter((x) => x !== pid) : choisis.concat([pid])); setChoix(null); };
  // Toucher le créneau déjà choisi l'efface
  const choisir = (jour: string, minutes: number) => setChoix(choix && choix.jour === jour && choix.minutes === minutes ? null : { jour, minutes });
  const pret = !!choix && choisis.length > 0;

  const envoyer = async () => {
    if (!pret || envoi || !choix) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/rdv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, jour: choix.jour, minutes: choix.minutes, duree: duree.libelle, techniciens: choisis }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) setErreur(data?.error || `Enregistrement impossible (${res.status})`);
      else setResultat(data as Resultat);
    } catch {
      setErreur('Impossible de joindre le serveur. Rien n’a été enregistré.');
    } finally {
      setEnvoi(false);
    }
  };
  const annuler = async () => {
    if (envoi || !rdv?.quand) return;
    if (!window.confirm(`Annuler le rendez-vous du ${rdv.quand} ? La date est vidée et le rendez-vous retiré des agendas des techniciens. Pense à prévenir le client.`)) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/rdv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id, action: 'annuler' }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) setErreur(data?.error || `Annulation impossible (${res.status})`);
      else setAnnule(true);
    } catch {
      setErreur('Impossible de joindre le serveur. Rien n’a été annulé.');
    } finally {
      setEnvoi(false);
    }
  };

  const pastille = (actif: boolean, libelle: string, changer: () => void, cle: string) => (
    <button key={cle} onClick={changer} className={`rounded-full px-4 py-2 text-[14px] font-bold ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={actif ? { backgroundColor: CYAN } : undefined}>
      {actif ? '✓ ' : ''}{libelle}
    </button>
  );
  const surtitre = rdv?.libelle || (type === 'visite' ? 'Visite de maintenance' : 'Dépannage SAV');
  const retour = { href: adresses.planning, libelle: 'Planning' };

  if (annule) {
    return (
      <PageAppli>
        <EnTeteAppli surtitre={surtitre} titre="Rendez-vous annulé" retour={retour} />
        <ContenuAppli className="space-y-4">
          <Carte accent>
            <p className="text-[18px] font-bold">{rdv?.nom}</p>
            <p className="mt-1 text-[14px]">Le rendez-vous du {rdv?.quand} est annulé et retiré des agendas des techniciens.</p>
          </Carte>
          <p className="px-1 text-[13px] font-semibold" style={{ color: ORANGE }}>Préviens le client, l’annulation ne lui envoie rien.</p>
          <button onClick={() => window.location.reload()} className="block w-full text-center text-[15px] font-semibold" style={{ color: CYAN }}>Caler un nouveau rendez-vous</button>
          <a href={adresses.planning} className="block text-center text-[15px] font-semibold" style={{ color: CYAN }}>Retour au planning</a>
        </ContenuAppli>
      </PageAppli>
    );
  }

  if (resultat) {
    return (
      <PageAppli>
        <EnTeteAppli surtitre={surtitre} titre="Rendez-vous calé" retour={retour} />
        <ContenuAppli className="space-y-4">
          {preview && <Alerte>Preview : seule cette fiche de test a été modifiée.</Alerte>}
          {resultat.avertissements.map((x) => <Alerte key={x}>{x}</Alerte>)}
          <Carte accent>
            <p className="text-[18px] font-bold">{rdv?.nom}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[15px] font-bold" style={{ color: CYAN }}><CalendarCheck size={16} /> {resultat.quand} · {resultat.duree}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[14px]"><HardHat size={15} color={CYAN} /> {resultat.equipe.join(', ')}</p>
            <p className="mt-1 text-[13px] text-slate-500">Statut : {resultat.statut}</p>
          </Carte>
          {resultat.agenda.length > 0 && (
            <Carte className="space-y-1.5">
              <p className="text-[13px] font-bold text-slate-500">Agendas Google</p>
              {resultat.agenda.map((x) => (
                <p key={x.nom} className="flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: x.statut === 'erreur' ? ORANGE : VERT }}>
                  {x.statut === 'erreur' ? <AlertTriangle size={15} /> : <Check size={15} />} {x.nom} : {x.statut}{x.erreur ? ` (${x.erreur})` : ''}
                </p>
              ))}
            </Carte>
          )}
          <p className="px-1 text-[13px] text-slate-500">Les techniciens le voient dans Mes interventions et dans leur agenda Google.</p>
          <a href={resultat.lienFiche} className="flex items-center justify-center gap-1 text-[15px] font-semibold" style={{ color: CYAN }}>Ouvrir la fiche <ChevronRight size={16} /></a>
          <a href={adresses.planning} className="block text-center text-[15px] font-semibold" style={{ color: CYAN }}>Retour au planning</a>
        </ContenuAppli>
      </PageAppli>
    );
  }

  return (
    <PageAppli>
      <EnTeteAppli surtitre={surtitre} titre={rdv?.nom || 'Rendez-vous'} retour={retour} />
      <ContenuAppli className="space-y-4">
        {preview && <Alerte>Preview : seules les fiches de test (avec « Test » dans le nom) peuvent être calées.</Alerte>}
        {erreur && !rdv && <Alerte>{erreur}</Alerte>}
        {!rdv && !erreur && <Carte className="p-8 text-center"><RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} /></Carte>}
        {rdv && !rdv.ouvert && <Alerte>Cette fiche est {rdv.statut} : elle ne se cale plus.</Alerte>}
        {rdv && rdv.ouvert && (
          <>
            <Carte className="space-y-1.5">
              {rdv.adresse ? <p className="flex items-center gap-1.5 text-[14px]"><MapPin size={15} color={CYAN} /> {rdv.adresse}</p> : <p className="text-[13px]" style={{ color: ORANGE }}>Pas d’adresse trouvée (ni sur la fiche, ni sur l’installation du Parc).</p>}
              <p className="text-[14px] font-semibold">{rdv.quand ? `Déjà calé : ${rdv.quand}${rdv.duree ? ` (${rdv.duree})` : ''}. Choisir un autre créneau le décale.` : 'Pas encore calé.'}</p>
              {rdv.quand && (
                <button onClick={annuler} disabled={envoi} className="inline-flex items-center gap-1.5 text-[14px] font-bold" style={{ color: ORANGE }}>
                  <CalendarX size={15} /> Annuler le rendez-vous
                </button>
              )}
            </Carte>

            <Repere>1 · Les techniciens</Repere>
            <div className="flex flex-wrap gap-2">{personnes.map((p) => pastille(choisis.includes(p.id), p.nom, () => basculer(p.id), `p${p.id}`))}</div>
            {!personnes.length && <p className="px-1 text-[13px]">Aucun installateur ni chef de chantier trouvé dans les équipes ClickUp.</p>}
            {agenda.branche
              ? <p className="px-1 text-[12px] font-semibold" style={{ color: VERT }}>✓ Planning de l’ERP + Google Agenda des techniciens choisis</p>
              : <p className="px-1 text-[12px]" style={{ color: ORANGE }}>Google Agenda pas branché : seul le planning de l’ERP est affiché.</p>}
            {agenda.erreurs.map((x) => <p key={x} className="px-1 text-[12px]" style={{ color: ORANGE }}>{x}</p>)}
            {planningIncomplet && <p className="px-1 text-[12px]" style={{ color: ORANGE }}>Une partie du planning n’a pas pu être lue : vérifie avant de confirmer.</p>}

            <Repere>2 · La durée</Repere>
            {durees.length ? (
              <div className="flex flex-wrap gap-2">{durees.map((d) => pastille(duree.libelle === d.libelle, d.libelle, () => { setDuree(d); setChoix(null); }, `d${d.libelle}`))}</div>
            ) : (
              <p className="px-1 text-[13px]">Durée : 1 h 30{champManquant ? ' (le champ ⏳ Durée RDV n’est pas trouvé sur cette fiche)' : ''}.</p>
            )}

            <Repere>3 · Le créneau</Repere>
            {!choisis.length ? (
              <p className="px-1 text-[14px] font-semibold">Choisis d’abord au moins un technicien pour voir son agenda.</p>
            ) : (
              <AgendaSemaine blocs={blocs} journees={journees} duree={duree.minutes} marge={MARGE_ROUTE} choix={choix} onChoisir={choisir} semaine={semaine} onSemaine={setSemaine} semainesMax={4} />
            )}
            {choix ? (
              <Carte accent>
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-[16px] font-bold"><CalendarCheck size={17} color={CYAN} /> {libelleJourCourt(choix.jour)} à {heureDe(choix.minutes)} · {duree.libelle}</p>
                  <button onClick={() => setChoix(null)} aria-label="Effacer le créneau" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold" style={{ color: ORANGE }}>
                    <X size={15} /> Effacer
                  </button>
                </div>
                {alertesChoix.map((x, i) => (
                  <p key={i} className="mt-1 flex items-center gap-1.5 text-[13px] font-bold" style={{ color: ORANGE }}>
                    <AlertTriangle size={14} /> {x.titre} ce jour-là : vérifie.
                  </p>
                ))}
              </Carte>
            ) : (
              <p className="px-1 text-[13px] text-slate-500">Touche un créneau blanc ({duree.libelle}, 30 min de route comprises autour des autres rendez-vous). Le toucher à nouveau l’efface.</p>
            )}

            {erreur && <Alerte>{erreur}</Alerte>}
            <BoutonPrincipal inactif={!pret || envoi} disabled={!pret || envoi} onClick={envoyer}>
              {envoi ? <RefreshCw size={20} className="animate-spin" /> : <CalendarCheck size={20} />}
              {envoi ? 'Enregistrement…' : rdv.quand ? 'Décaler le rendez-vous' : 'Caler le rendez-vous'}
            </BoutonPrincipal>
            <p className="text-center text-[12px] text-slate-500">Ensuite, le rendez-vous part dans l’agenda Google de chaque technicien et la fiche passe en « {type === 'visite' ? 'rdv confirmé' : 'intervention planifiée'} ».</p>
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
