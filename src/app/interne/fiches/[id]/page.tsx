"use client";

// Fiche affaire unique (étape 1 de l'ordre de construction, lancée par Matthieu le 17/10/2026 à 12 h 25). LECTURE SEULE.
// Une seule fiche suit la tâche voyageuse de Prospection à Qualification, Planning Chantiers puis Parc (section 3 de la
// carte des menus) : les sections apparaissent au fil de l'avancement, avec l'action de l'étape.
//   Toujours : statut, étape (frise), bloc 📇 Contact complet (Appeler, Google Voice, SMS, Gmail, Waze, Maps).
//   Qualification : relevé (bouton Ouvrir le relevé), scénarios, devis et relance.
//   Planning Chantiers : feu vert (5 prérequis), chantier (date, technicien) avec les actions de la fiche intervention
//   (Saisie à la pose, Rapport et signature : étape 2 validée le 17/10 à 13 h), réception, devis signé, scénarios.
//   Parc : contrat, échéances, borne, SAV et visites liés, réception.
//   Dès qu'ils existent (17/10, 12 h 47) : factures (Costructor fait référence) et dossiers ADVENIR, qui s'ouvrent dans
//   ClickUp en attendant leurs écrans.
// 17/10, 14 h 08 (parcours Nouveau projet validé) : en vente, bouton « + Ajouter un contact » sous le bloc Contact
// (contact existant ou nouveau, avec son rôle), qui ouvre /interne/projet/nouveau?fiche=<id>. Les champs relation
// 📍 Contact sur place et 👔 Gestionnaire n'existent qu'en Qualification.
// 17/10, 18 h 10 (« sans prix » pour l'installateur, décision du 17 h 37) : le rôle de la pastille part avec la lecture
// (?role=) ; quand la route répond sansPrix, ni devis, ni factures, ni ADVENIR, et le chantier propose « 📋 Ce qui est
// prévu » (éléments du scénario retenu, sans prix).
// Structure de départ validée le 16/10 ; bloc Contact le 17/10 à 10 h 20. Retour vers la vue d'où l'on vient, sinon
// vers Mon espace.
import { useEffect, useState, type ElementType, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import {
  BadgeEuro, BatteryCharging, CalendarClock, CheckCircle2, ClipboardList, ExternalLink, FileText, GitBranch, HardHat,
  ArrowLeft, Landmark, RefreshCw, ShieldCheck, TrafficCone, Wrench, XCircle,
} from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, TitreCarte } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';
import { BlocContact } from '@/components/ui/BlocContact';
import { useRoleAppli } from '@/components/charte/roleAppli';

type Etape = 'prospection' | 'qualification' | 'chantier' | 'parc';
type Scenario = { id: string; nom: string; statut: string; couleurStatut: string; segment: string; elements: number; natures: { nature: string; n: number }[] };
type Lien = { id: string; nom: string };
type Facture = {
  id: string; nom: string; statut: string; couleurStatut: string; type: string; numero: string; montantHT: number | null;
  echeance: string; enRetard: boolean; lienCostructor: string; url: string;
};
type Dossier = {
  id: string; nom: string; statut: string; couleurStatut: string; dateLimite: string;
  primeEstimee: number | null; primeReelle: number | null; url: string;
};
type Fiche = {
  id: string;
  nom: string;
  etape: Etape;
  liste: string;
  statut: string;
  couleurStatut: string;
  url: string;
  passeport: { typeClient: string; telephone: string; email: string; adresse: string };
  projet: { segment: string; zone: string; places: number | null };
  releve: { visite: string; lien: string };
  relance: string;
  rappel: string;
  devis: { numero: string; montantHT: number | null; lienDevis: string; lienCostructor: string };
  sansPrix?: boolean;
  scenarios: Scenario[];
  feuVert: { donne: boolean; prerequis: { libelle: string; valeur: string; ok: boolean }[] } | null;
  chantier: { intervention: string; techniciens: string[]; realise: boolean } | null;
  reception: { reserves: string; pv: number; rapport: number; photos: number } | null;
  parc: {
    contrat: string; echeance: string; miseEnService: string; finGarantie: string; modele: string; numeroSerie: string;
    pointsDeCharge: number | null; lienChargeUnix: string; sav: Lien[]; visites: Lien[];
  } | null;
  // null = liste illisible ; [] = rien de lié
  factures: Facture[] | null;
  advenir: Dossier[] | null;
};

const ETAPES: { cle: Etape; libelle: string }[] = [
  { cle: 'prospection', libelle: 'Prospection' },
  { cle: 'qualification', libelle: 'Vente' },
  { cle: 'chantier', libelle: 'Chantier' },
  { cle: 'parc', libelle: 'Parc' },
];

const euros = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const tacheClickUp = (id: string) => `https://app.clickup.com/t/${id}`;

const boutonAction = (href: string, libelle: string) => (
  <a
    href={href}
    className="flex w-full items-center justify-center gap-3 rounded-full bg-[#FF6B00] px-8 py-4 text-[17px] font-semibold text-white shadow-[0_8px_22px_rgba(255,107,0,0.28)] transition-transform active:scale-95"
  >
    {libelle}
  </a>
);
const boutonSecondaire = (href: string, libelle: string) => (
  <a
    href={href}
    className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 text-[16px] font-semibold ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-95"
    style={{ color: CYAN }}
  >
    {libelle}
  </a>
);

const pastilleStatut = (statut: string, couleur: string) => (
  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white" style={{ backgroundColor: couleur || '#9aa3ad' }}>
    {statut}
  </span>
);

export default function FichePage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const { role } = useRoleAppli();
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = async () => {
    if (!id) return;
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/interne/fiches/${encodeURIComponent(id)}?role=${encodeURIComponent(role || '')}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        // Scénario ou élément ouvert par erreur : on bascule sur la fiche principale
        if (data?.parent) { window.location.replace(`/interne/fiches/${data.parent}`); return; }
        setErreur(data?.error || `Lecture impossible (${res.status})`);
      } else { setFiche(data.fiche as Fiche); setPreview(!!data.preview); }
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, [id, role]);

  const retour = () => {
    if (window.history.length > 1 && document.referrer.includes('/interne/')) window.history.back();
    else window.location.href = '/interne/espace';
  };

  const boutonRetour = (
    <button onClick={retour} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Retour
    </button>
  );

  const ligne = (Icon: ElementType, contenu: ReactNode, couleur: string = CYAN) => (
    <p className="flex items-center gap-2 text-[15px]">
      <Icon size={16} className="shrink-0" color={couleur} />
      <span className="min-w-0 truncate">{contenu}</span>
    </p>
  );
  const lienExterne = (href: string, libelle: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{libelle}</a>
  );

  const frise = (f: Fiche) => {
    const i = ETAPES.findIndex((e) => e.cle === f.etape);
    return (
      <div className="flex gap-1.5 px-1" aria-label={`Étape : ${ETAPES[i]?.libelle || ''}`}>
        {ETAPES.map((e, k) => (
          <div key={e.cle} className="min-w-0 flex-1">
            <div className="h-1.5 rounded-full" style={{ backgroundColor: k <= i ? (k === i ? ORANGE : CYAN) : '#dfe3e8' }} />
            <p className={`mt-1 truncate text-[11px] ${k === i ? 'font-extrabold' : 'font-semibold text-slate-500'}`}>{e.libelle}</p>
          </div>
        ))}
      </div>
    );
  };

  const carteDevis = (f: Fiche, titre: string) => {
    if (f.sansPrix) return null;
    const d = f.devis;
    const vide = !d.numero && d.montantHT === null && !d.lienDevis;
    return (
      <Carte className="space-y-2.5">
        <TitreCarte icon={FileText}>{titre}</TitreCarte>
        <div className="space-y-2 pt-1">
          {d.numero && ligne(FileText, `N° ${d.numero}${d.montantHT !== null ? ` · ${euros(d.montantHT)} HT` : ''}`)}
          {!d.numero && d.montantHT !== null && ligne(FileText, `${euros(d.montantHT)} HT`)}
          {f.relance && ligne(CalendarClock, `Prochaine relance ${f.relance}`)}
          {d.lienDevis && ligne(ExternalLink, lienExterne(d.lienDevis, 'Voir le devis'))}
          {d.lienCostructor && ligne(ExternalLink, lienExterne(d.lienCostructor, 'Client dans Costructor'))}
          {vide && <p className="text-[14px]">Pas encore de devis.</p>}
        </div>
      </Carte>
    );
  };

  const carteScenarios = (f: Fiche) => (
    <Carte className="space-y-3">
      <TitreCarte icon={GitBranch} extra={<span className="text-[14px] font-bold">{f.scenarios.length}</span>}>Scénarios</TitreCarte>
      {!f.scenarios.length && <p className="text-[14px]">{f.etape === 'qualification' ? 'Aucun scénario : le relevé créera le premier.' : 'Aucun scénario sur cette fiche.'}</p>}
      {f.scenarios.map((s) => (
        <div key={s.id} className="rounded-[14px] bg-white p-4 ring-[1.5px] ring-[#dfe3e8]">
          <div className="flex flex-wrap items-center gap-2">
            {pastilleStatut(s.statut, s.couleurStatut)}
            {s.segment && <span className="text-[12px] font-bold text-slate-500">{s.segment}</span>}
          </div>
          <p className="mt-1.5 text-[16px] font-bold leading-tight">{s.nom}</p>
          <p className="mt-1 text-[13px]">
            {s.elements} élément{s.elements > 1 ? 's' : ''}
            {s.natures.length > 0 && ` : ${s.natures.map((x) => `${x.n} ${x.nature.toLowerCase()}`).join(', ')}`}
          </p>
        </div>
      ))}
    </Carte>
  );

  const carteFeuVert = (f: Fiche) => f.feuVert && (
    <Carte className="space-y-2.5">
      <TitreCarte icon={TrafficCone}>Feu vert</TitreCarte>
      {f.feuVert.donne
        ? ligne(CheckCircle2, 'Feu vert donné', '#16a34a')
        : f.feuVert.prerequis.map((p) => (
            <div key={p.libelle}>{ligne(p.ok ? CheckCircle2 : XCircle, `${p.libelle} : ${p.valeur}`, p.ok ? '#16a34a' : ORANGE)}</div>
          ))}
      {!f.feuVert.donne && !f.sansPrix && f.feuVert.prerequis.every((p) => p.ok) && boutonAction('/interne/feu-vert', 'Donner le feu vert')}
    </Carte>
  );

  // Chantier, avec les actions de la fiche intervention (étape 2) : ce qui est prévu, saisie à la pose, puis rapport et
  // signature
  const carteChantier = (f: Fiche) => f.chantier && (
    <Carte className="space-y-2.5">
      <TitreCarte icon={HardHat}>Chantier</TitreCarte>
      {ligne(CalendarClock, f.chantier.intervention ? `Intervention ${f.chantier.intervention}` : 'Date d’intervention à fixer', f.chantier.intervention ? CYAN : ORANGE)}
      {ligne(HardHat, f.chantier.techniciens.length ? f.chantier.techniciens.join(', ') : 'Technicien à affecter', f.chantier.techniciens.length ? CYAN : ORANGE)}
      <div className="space-y-2 pt-1">
        {boutonSecondaire(`/interne/pose/${f.id}#prevu`, '📋 Ce qui est prévu')}
        {boutonAction(`/interne/pose/${f.id}`, '📸 Saisie à la pose')}
        {boutonSecondaire('/interne/reception', 'Rapport et signature')}
      </div>
    </Carte>
  );

  const carteReception = (f: Fiche) => f.reception && (
    <Carte className="space-y-2.5">
      <TitreCarte icon={ShieldCheck}>Réception</TitreCarte>
      {ligne(FileText, f.reception.pv ? 'PV de réception déposé' : 'PV de réception pas encore déposé', f.reception.pv ? '#16a34a' : ORANGE)}
      {ligne(ClipboardList, f.reception.rapport ? 'Rapport de mesures déposé' : 'Rapport de mesures pas encore déposé', f.reception.rapport ? '#16a34a' : ORANGE)}
      {ligne(ClipboardList, `${f.reception.photos} photo${f.reception.photos > 1 ? 's' : ''} de chantier`)}
      {f.reception.reserves && ligne(Wrench, `Réserves : ${f.reception.reserves}`)}
      {f.etape === 'chantier' && f.chantier?.realise && !f.sansPrix && boutonAction('/interne/validation', 'Valider la réception')}
    </Carte>
  );

  const carteParc = (f: Fiche) => f.parc && (
    <>
      <Carte className="space-y-2.5">
        <TitreCarte icon={BatteryCharging}>Parc et contrat</TitreCarte>
        {ligne(FileText, f.parc.contrat ? `Contrat : ${f.parc.contrat}` : 'Pas de contrat renseigné')}
        {f.parc.echeance && ligne(CalendarClock, `Échéance annuelle ${f.parc.echeance}`)}
        {f.parc.miseEnService && ligne(CalendarClock, `Mise en service ${f.parc.miseEnService}`)}
        {f.parc.finGarantie && ligne(ShieldCheck, `Fin de garantie ${f.parc.finGarantie}`)}
        {(f.parc.modele || f.parc.pointsDeCharge !== null) && ligne(BatteryCharging, [f.parc.modele, f.parc.pointsDeCharge !== null ? `${f.parc.pointsDeCharge} point${f.parc.pointsDeCharge > 1 ? 's' : ''} de charge` : ''].filter(Boolean).join(' · '))}
        {f.parc.numeroSerie && ligne(FileText, `N° de série ${f.parc.numeroSerie}`)}
        {f.parc.lienChargeUnix && ligne(ExternalLink, lienExterne(f.parc.lienChargeUnix, 'Supervision Charge Unix'))}
        {f.devis.lienCostructor && ligne(ExternalLink, lienExterne(f.devis.lienCostructor, 'Client dans Costructor'))}
      </Carte>
      <Carte className="space-y-2.5">
        <TitreCarte icon={Wrench} extra={<span className="text-[14px] font-bold">{f.parc.sav.length + f.parc.visites.length}</span>}>SAV et visites</TitreCarte>
        {!f.parc.sav.length && !f.parc.visites.length && <p className="text-[14px]">Aucun ticket SAV ni visite de maintenance lié.</p>}
        {f.parc.sav.map((x) => <div key={x.id}>{ligne(Wrench, lienExterne(tacheClickUp(x.id), `SAV : ${x.nom}`))}</div>)}
        {f.parc.visites.map((x) => <div key={x.id}>{ligne(CalendarClock, lienExterne(tacheClickUp(x.id), `Visite : ${x.nom}`))}</div>)}
      </Carte>
    </>
  );

  // Factures : au chantier et au Parc toujours (même vide), en vente seulement s'il y en a ; jamais pour l'installateur
  const carteFactures = (f: Fiche) => {
    if (f.sansPrix) return null;
    const toujours = f.etape === 'chantier' || f.etape === 'parc';
    if (f.factures !== null && !f.factures.length && !toujours) return null;
    const retard = (f.factures || []).filter((x) => x.enRetard).length;
    return (
      <Carte className="space-y-3">
        <TitreCarte icon={BadgeEuro} extra={<span className="text-[14px] font-bold" style={{ color: retard ? ORANGE : undefined }}>{f.factures ? f.factures.length : '?'}</span>}>Factures</TitreCarte>
        {f.factures === null && <p className="text-[14px]" style={{ color: ORANGE }}>Factures illisibles pour l’instant : réessaie dans un moment.</p>}
        {f.factures !== null && !f.factures.length && <p className="text-[14px]">Aucune facture liée pour l’instant.</p>}
        {(f.factures || []).map((x) => (
          <a key={x.id} href={x.url} target="_blank" rel="noopener noreferrer" className="block rounded-[14px] bg-white p-4 ring-[1.5px] ring-[#dfe3e8]">
            <div className="flex flex-wrap items-center gap-2">
              {pastilleStatut(x.statut, x.couleurStatut)}
              {x.type && <span className="text-[12px] font-bold text-slate-500">{x.type}</span>}
            </div>
            <p className="mt-1.5 text-[15px] font-bold leading-tight">
              {[x.numero ? `N° ${x.numero}` : '', x.montantHT !== null ? `${euros(x.montantHT)} HT` : ''].filter(Boolean).join(' · ') || x.nom}
            </p>
            {x.echeance && (
              <p className="mt-1 text-[13px] font-semibold" style={{ color: x.enRetard ? ORANGE : undefined }}>
                {x.enRetard ? `En retard : échéance ${x.echeance}` : `Échéance ${x.echeance}`}
              </p>
            )}
          </a>
        ))}
        {(f.factures || []).length > 0 && <p className="text-[12px]">Costructor fait référence pour les montants et les règlements.</p>}
      </Carte>
    );
  };

  // Dossiers ADVENIR : seulement quand il y en a un (ou si la lecture a échoué) ; jamais pour l'installateur
  const carteAdvenir = (f: Fiche) => {
    if (f.sansPrix) return null;
    if (f.advenir !== null && !f.advenir.length) return null;
    return (
      <Carte className="space-y-3">
        <TitreCarte icon={Landmark} extra={<span className="text-[14px] font-bold">{f.advenir ? f.advenir.length : '?'}</span>}>Aides ADVENIR</TitreCarte>
        {f.advenir === null && <p className="text-[14px]" style={{ color: ORANGE }}>Dossier ADVENIR illisible pour l’instant : réessaie dans un moment.</p>}
        {(f.advenir || []).map((d) => (
          <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" className="block rounded-[14px] bg-white p-4 ring-[1.5px] ring-[#dfe3e8]">
            <div className="flex flex-wrap items-center gap-2">{pastilleStatut(d.statut, d.couleurStatut)}</div>
            <p className="mt-1.5 text-[15px] font-bold leading-tight">
              {d.primeReelle !== null ? `Prime ${euros(d.primeReelle)}` : d.primeEstimee !== null ? `Prime estimée ${euros(d.primeEstimee)}` : d.nom}
            </p>
            {d.dateLimite && <p className="mt-1 text-[13px] font-semibold">Date limite de réalisation {d.dateLimite}</p>}
          </a>
        ))}
      </Carte>
    );
  };

  return (
    <PageAppli>
      <EnTeteAppli surtitre={fiche ? [fiche.passeport.typeClient, fiche.projet.segment].filter(Boolean).join(' · ') || fiche.liste || 'Fiche' : 'Fiche'} titre={fiche?.nom || 'Fiche'} action={boutonRetour} />

      <ContenuAppli className="space-y-4">
        {preview && <Alerte>Prévisualisation : en vente, fiche lue dans 🧪 Qualification TEST ; au chantier et au Parc, dans les vraies listes. Rien n&apos;est modifié.</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && !fiche && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement de la fiche...</p>
          </Carte>
        )}

        {fiche && (
          <>
            {frise(fiche)}
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="rounded-full px-3 py-1 text-[12px] font-extrabold uppercase tracking-[0.06em] text-white" style={{ backgroundColor: fiche.couleurStatut || '#9aa3ad' }}>
                {fiche.statut}
              </span>
              {fiche.projet.zone && <span className="text-[13px] font-bold text-slate-500">Zone {fiche.projet.zone}</span>}
              {fiche.projet.places !== null && <span className="text-[13px] font-bold text-slate-500">· {fiche.projet.places} places</span>}
            </div>

            <BlocContact affaireId={fiche.id} ouvertParDefaut />
            {fiche.etape === 'qualification' && !fiche.sansPrix && boutonSecondaire(`/interne/projet/nouveau?fiche=${encodeURIComponent(fiche.id)}`, '+ Ajouter un contact')}

            {fiche.etape === 'prospection' && (
              <Carte className="space-y-2.5">
                <TitreCarte icon={CalendarClock}>Prospection</TitreCarte>
                {ligne(CalendarClock, fiche.rappel ? `Rappel prévu ${fiche.rappel}` : 'Pas de date de rappel')}
                <p className="text-[13px]">Quand le rendez-vous est fixé, la fiche passe en Qualification et garde son historique.</p>
              </Carte>
            )}

            {fiche.etape === 'qualification' && (
              <>
                <Carte className="space-y-3">
                  <TitreCarte icon={ClipboardList}>Relevé</TitreCarte>
                  {ligne(CalendarClock, fiche.releve.visite ? `Visite ${fiche.releve.visite}` : 'Visite pas encore calée')}
                  {fiche.releve.lien && !fiche.sansPrix && boutonAction(fiche.releve.lien, 'Ouvrir le relevé')}
                </Carte>
                {carteScenarios(fiche)}
                {carteDevis(fiche, 'Devis')}
              </>
            )}

            {fiche.etape === 'chantier' && (
              <>
                {carteFeuVert(fiche)}
                {carteChantier(fiche)}
                {carteReception(fiche)}
                {carteDevis(fiche, 'Devis signé')}
                {carteScenarios(fiche)}
              </>
            )}

            {fiche.etape === 'parc' && (
              <>
                {carteParc(fiche)}
                {carteReception(fiche)}
                {fiche.scenarios.length > 0 && carteScenarios(fiche)}
              </>
            )}

            {fiche.etape !== 'prospection' && (
              <>
                {carteFactures(fiche)}
                {carteAdvenir(fiche)}
              </>
            )}

            <div className="pt-2 text-center">
              <a href={fiche.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: CYAN }}>
                <ExternalLink size={13} /> Ouvrir dans ClickUp ({fiche.liste})
              </a>
            </div>
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
