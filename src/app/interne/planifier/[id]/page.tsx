"use client";

// Planifier la pose d'un chantier (17/10/2026, 22 h 49, Matthieu : « il faut que ça fonctionne de la même manière pour
// les installateurs pour leur caler les chantiers », durée choisie à chaque chantier). 1 les installateurs, 2 la durée
// (½ journée à 5 jours), 3 la demi-journée de départ dans l'agenda de la semaine (src/components/ui/AgendaSemaine.tsx),
// avec le planning ERP et le Google Agenda des installateurs choisis : un départ est libre si toutes les demi-journées
// de la pose le sont pour chacun d'eux. Écrit par /api/interne/planifier. Ouvert depuis Chantiers.
// 17/10, 23 h 00 (Matthieu : « pouvoir supprimer un créneau aussi si on se trompe ») : départ effaçable (le toucher à
// nouveau, ou « Effacer ») et « Annuler la planification » pour un chantier déjà planifié.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, CalendarCheck, CalendarX, Check, ChevronRight, HardHat, MapPin, RefreshCw, X } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte, BoutonPrincipal } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';
import AgendaSemaine, { type BlocAgenda, type JourneeAgenda } from '@/components/ui/AgendaSemaine';
import { DEPARTS_POSE, demiJourneesDe, libellePose, segmentsPose } from '@/lib/demiJournees';

type TypeRdv = 'pose' | 'visite' | 'depannage' | 'releve';
type Personne = { id: number; nom: string; role: string };
type Bloc = { jour: string; debut: number; fin: number; journee: boolean; type: TypeRdv; nom: string; ville: string; personnes: number[] };
type Creneau = { personne: number; jour: string; debut: number; fin: number; journee: boolean };
type Chantier = { id: string; nom: string; statut: string; etape: number; adresse: string; ville: string; jour: string; minutes: number | null; duree: string; quand: string; techniciens: number[] };
type Resultat = { quand: string; duree: string; statut: string; equipe: string[]; agenda: { nom: string; statut: string; erreur?: string }[]; avertissements: string[]; lienFiche: string };

const VERT = '#16a34a';
const TYPES: Record<TypeRdv, string> = { pose: '🏗️ Pose', visite: '🔧 Maintenance', depannage: '🚨 Dépannage', releve: '📋 Relevé' };
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function PlanifierPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [personnes, setPersonnes] = useState<Personne[]>([]);
  const [blocsErp, setBlocsErp] = useState<Bloc[]>([]);
  const [agenda, setAgenda] = useState<{ branche: boolean; creneaux: Creneau[]; erreurs: string[] }>({ branche: false, creneaux: [], erreurs: [] });
  const [durees, setDurees] = useState<string[]>([]);
  const [champManquant, setChampManquant] = useState(false);
  const [planningIncomplet, setPlanningIncomplet] = useState(false);
  const [preview, setPreview] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choisis, setChoisis] = useState<number[]>([]);
  const [duree, setDuree] = useState('');
  const [semaine, setSemaine] = useState(0);
  const [choix, setChoix] = useState<{ jour: string; minutes: number } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [annule, setAnnule] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/interne/planifier?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) { setErreur(data?.error || `Lecture impossible (${res.status})`); return; }
        setChantier(data.chantier);
        setPersonnes(data.personnes || []);
        setBlocsErp(data.blocs || []);
        if (data.agenda) setAgenda({ branche: !!data.agenda.branche, creneaux: data.agenda.creneaux || [], erreurs: data.agenda.erreurs || [] });
        setDurees(data.durees || []);
        setChampManquant(!!data.champDureeManquant);
        setPlanningIncomplet(!!data.planningIncomplet);
        setPreview(!!data.preview);
        setChoisis((data.chantier?.techniciens || []).filter((n: number) => (data.personnes || []).some((p: Personne) => p.id === n)));
        setDuree(data.chantier?.duree || (data.durees || []).find((d: string) => normal(d) === '1 jour') || '');
      } catch {
        setErreur('Impossible de joindre le serveur.');
      }
    })();
  }, [id]);

  const prenom = (pid: number) => (personnes.find((p) => p.id === pid)?.nom || '').split(/\s+/)[0];
  const memeVille = (ville: string) => !!chantier?.ville && !!ville && normal(ville) === normal(chantier.ville);
  const deQui = (ids: number[]) => ids.filter((p) => choisis.includes(p)).map(prenom).join(', ');
  const blocs: BlocAgenda[] = blocsErp
    .filter((b) => !b.journee && b.personnes.some((p) => choisis.includes(p)))
    .map((b) => ({ jour: b.jour, debut: b.debut, fin: b.fin, titre: TYPES[b.type], detail: [deQui(b.personnes), b.nom, b.ville].filter(Boolean).join(' · '), ton: (memeVille(b.ville) ? 'proche' : 'erp') as BlocAgenda['ton'] }))
    .concat(agenda.creneaux.filter((c) => !c.journee && choisis.includes(c.personne)).map((c) => ({ jour: c.jour, debut: c.debut, fin: c.fin, titre: 'Occupé', detail: `Agenda de ${prenom(c.personne)}`, ton: 'agenda' as BlocAgenda['ton'] })));
  const journees: JourneeAgenda[] = blocsErp
    .filter((b) => b.journee && b.personnes.some((p) => choisis.includes(p)))
    .map((b) => ({ jour: b.jour, titre: `${TYPES[b.type]} ${deQui(b.personnes)}` }))
    .concat(agenda.creneaux.filter((c) => c.journee && choisis.includes(c.personne)).map((c) => ({ jour: c.jour, titre: `📆 ${prenom(c.personne)}` })));
  const demi = demiJourneesDe(duree) || 2;
  const segments = (jour: string, minutes: number) => segmentsPose(jour, minutes, demi);
  const segsChoix = choix ? segments(choix.jour, choix.minutes) : [];
  const alertesChoix = journees.filter((x) => segsChoix.some((s) => s.jour === x.jour));

  const basculer = (pid: number) => { setChoisis(choisis.includes(pid) ? choisis.filter((x) => x !== pid) : choisis.concat([pid])); setChoix(null); };
  // Toucher le départ déjà choisi l'efface
  const choisirDepart = (jour: string, minutes: number) => setChoix(choix && choix.jour === jour && choix.minutes === minutes ? null : { jour, minutes });
  const pret = !!choix && !!duree && choisis.length > 0;

  const envoyer = async () => {
    if (!pret || envoi || !choix) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/planifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, jour: choix.jour, minutes: choix.minutes, duree, techniciens: choisis }),
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
    if (envoi || !chantier?.quand) return;
    if (!window.confirm(`Annuler la pose prévue ${chantier.quand} ? La date est vidée, la pose sort des agendas des installateurs et le chantier repasse à planifier.`)) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/planifier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'annuler' }) });
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

  if (annule) {
    return (
      <PageAppli>
        <EnTeteAppli surtitre="Pose" titre="Planification annulée" retour={{ href: '/interne/chantiers', libelle: 'Chantiers' }} />
        <ContenuAppli className="space-y-4">
          <Carte accent>
            <p className="text-[18px] font-bold">{chantier?.nom}</p>
            <p className="mt-1 text-[14px]">La pose prévue {chantier?.quand} est annulée : elle sort des agendas des installateurs et le chantier est à replanifier.</p>
          </Carte>
          <button onClick={() => window.location.reload()} className="block w-full text-center text-[15px] font-semibold" style={{ color: CYAN }}>Replanifier maintenant</button>
          <a href="/interne/chantiers" className="block text-center text-[15px] font-semibold" style={{ color: CYAN }}>Retour aux chantiers</a>
        </ContenuAppli>
      </PageAppli>
    );
  }

  if (resultat) {
    return (
      <PageAppli>
        <EnTeteAppli surtitre="Pose" titre="Pose planifiée" retour={{ href: '/interne/chantiers', libelle: 'Chantiers' }} />
        <ContenuAppli className="space-y-4">
          {preview && <Alerte>Preview : seule cette fiche de test a été modifiée.</Alerte>}
          {resultat.avertissements.map((x) => <Alerte key={x}>{x}</Alerte>)}
          <Carte accent>
            <p className="text-[18px] font-bold">{chantier?.nom}</p>
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
          <p className="px-1 text-[13px] text-slate-500">Les installateurs la voient dans Mes interventions et dans leur agenda Google.</p>
          <a href={resultat.lienFiche} className="flex items-center justify-center gap-1 text-[15px] font-semibold" style={{ color: CYAN }}>Ouvrir la fiche <ChevronRight size={16} /></a>
          <a href="/interne/chantiers" className="block text-center text-[15px] font-semibold" style={{ color: CYAN }}>Retour aux chantiers</a>
        </ContenuAppli>
      </PageAppli>
    );
  }

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Planifier la pose" titre={chantier?.nom || 'Chantier'} retour={{ href: '/interne/chantiers', libelle: 'Chantiers' }} />
      <ContenuAppli className="space-y-4">
        {preview && <Alerte>Preview : seules les fiches de test (avec « Test » dans le nom) peuvent être planifiées.</Alerte>}
        {erreur && !chantier && <Alerte>{erreur}</Alerte>}
        {!chantier && !erreur && <Carte className="p-8 text-center"><RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} /></Carte>}
        {chantier && chantier.etape > 2 && <Alerte>Ce chantier est {chantier.statut} : il ne se planifie plus.</Alerte>}
        {chantier && chantier.etape <= 2 && (
          <>
            <Carte className="space-y-1.5">
              {chantier.adresse && <p className="flex items-center gap-1.5 text-[14px]"><MapPin size={15} color={CYAN} /> {chantier.adresse}</p>}
              <p className="text-[14px] font-semibold">{chantier.quand ? `Déjà planifiée : ${chantier.quand}${chantier.duree ? ` (${chantier.duree})` : ''}. Choisir un autre départ la décale.` : 'Pas encore planifiée.'}</p>
              {chantier.quand && (
                <button onClick={annuler} disabled={envoi} className="inline-flex items-center gap-1.5 text-[14px] font-bold" style={{ color: ORANGE }}>
                  <CalendarX size={15} /> Annuler la planification
                </button>
              )}
            </Carte>
            {champManquant && <Alerte>Le champ ⏳ Durée intervention est introuvable dans le Planning Chantiers.</Alerte>}

            <Repere>1 · Les installateurs</Repere>
            <div className="flex flex-wrap gap-2">{personnes.map((p) => pastille(choisis.includes(p.id), p.nom, () => basculer(p.id), `p${p.id}`))}</div>
            {!personnes.length && <p className="px-1 text-[13px]">Aucun installateur ni chef de chantier trouvé dans les équipes ClickUp.</p>}
            {agenda.branche
              ? <p className="px-1 text-[12px] font-semibold" style={{ color: VERT }}>✓ Planning de l’ERP + Google Agenda des installateurs choisis</p>
              : <p className="px-1 text-[12px]" style={{ color: ORANGE }}>Google Agenda pas branché : seul le planning de l’ERP est affiché.</p>}
            {agenda.erreurs.map((x) => <p key={x} className="px-1 text-[12px]" style={{ color: ORANGE }}>{x}</p>)}
            {planningIncomplet && <p className="px-1 text-[12px]" style={{ color: ORANGE }}>Une partie du planning n’a pas pu être lue : vérifie avant de confirmer.</p>}

            <Repere>2 · La durée</Repere>
            <div className="flex flex-wrap gap-2">{durees.map((d) => pastille(duree === d, d, () => { setDuree(d); setChoix(null); }, `d${d}`))}</div>

            <Repere>3 · Le départ</Repere>
            {!choisis.length ? (
              <p className="px-1 text-[14px] font-semibold">Choisis d’abord au moins un installateur pour voir son agenda.</p>
            ) : (
              <AgendaSemaine
                blocs={blocs}
                journees={journees}
                duree={240}
                marge={0}
                choix={choix}
                onChoisir={choisirDepart}
                semaine={semaine}
                onSemaine={setSemaine}
                semainesMax={4}
                departs={DEPARTS_POSE}
                segments={segments}
              />
            )}
            {choix ? (
              <Carte accent>
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-[16px] font-bold"><CalendarCheck size={17} color={CYAN} /> {libellePose(segsChoix)} · {duree}</p>
                  <button onClick={() => setChoix(null)} aria-label="Effacer le départ" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold" style={{ color: ORANGE }}>
                    <X size={15} /> Effacer
                  </button>
                </div>
                {alertesChoix.map((x, i) => (
                  <p key={i} className="mt-1 flex items-center gap-1.5 text-[13px] font-bold" style={{ color: ORANGE }}>
                    <AlertTriangle size={14} /> {x.titre} sur la journée : vérifie.
                  </p>
                ))}
              </Carte>
            ) : (
              <p className="px-1 text-[13px] text-slate-500">Touche une demi-journée libre (matin ou après-midi) : la pose s’étale sur les jours ouvrés suivants selon la durée. La toucher à nouveau l’efface.</p>
            )}

            {erreur && <Alerte>{erreur}</Alerte>}
            <BoutonPrincipal inactif={!pret || envoi} disabled={!pret || envoi} onClick={envoyer}>
              {envoi ? <RefreshCw size={20} className="animate-spin" /> : <CalendarCheck size={20} />}
              {envoi ? 'Enregistrement…' : chantier.quand ? 'Décaler la pose' : 'Planifier la pose'}
            </BoutonPrincipal>
            <p className="text-center text-[12px] text-slate-500">Ensuite, la pose part dans l’agenda Google de chaque installateur et le chantier passe en « planifié ».</p>
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
