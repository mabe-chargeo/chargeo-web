"use client";

// Fiche détaillée de l'application équipe (structure validée par Matthieu le 16/10/2026). LECTURE SEULE pour l'instant
// (les actions viennent au lot 3) : statut, client, relevé (bouton Ouvrir le relevé), scénarios avec leurs éléments,
// devis. Retour vers la vue d'où l'on vient (historique du navigateur), sinon vers Fiches.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarClock, ClipboardList, ExternalLink, FileText, GitBranch, Mail, MapPin, Phone, RefreshCw, User } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, TitreCarte, BoutonPrincipal } from '@/components/charte/Appli';
import { CYAN, GRIS } from '@/components/charte/couleurs';

type Scenario = { id: string; nom: string; statut: string; couleurStatut: string; segment: string; elements: number; natures: { nature: string; n: number }[] };
type Fiche = {
  id: string;
  nom: string;
  statut: string;
  couleurStatut: string;
  url: string;
  passeport: { typeClient: string; telephone: string; email: string; adresse: string };
  projet: { segment: string; zone: string; places: number | null };
  releve: { visite: string; lien: string };
  relance: string;
  devis: { numero: string; montantHT: number | null; lienDevis: string; lienCostructor: string };
  scenarios: Scenario[];
};

const euros = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function FichePage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = async () => {
    if (!id) return;
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/interne/fiches/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
      else { setFiche(data.fiche as Fiche); setPreview(!!data.preview); }
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, [id]);

  const retour = () => {
    if (window.history.length > 1 && document.referrer.includes('/interne/')) window.history.back();
    else window.location.href = '/interne/fiches';
  };

  const boutonRetour = (
    <button onClick={retour} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Fiches
    </button>
  );

  const ligne = (Icon: React.ElementType, contenu: React.ReactNode) => (
    <p className="flex items-center gap-2 text-[15px]">
      <Icon size={16} className="shrink-0" color={CYAN} />
      <span className="min-w-0 truncate">{contenu}</span>
    </p>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre={fiche ? [fiche.passeport.typeClient, fiche.projet.segment].filter(Boolean).join(' · ') || 'Fiche' : 'Fiche'} titre={fiche?.nom || 'Fiche'} action={boutonRetour} />

      <ContenuAppli className="space-y-4">
        {preview && <Alerte>Prévisualisation : fiche lue dans 🧪 Qualification TEST. Rien n'est modifié.</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && !fiche && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement de la fiche...</p>
          </Carte>
        )}

        {fiche && (
          <>
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="rounded-full px-3 py-1 text-[12px] font-extrabold uppercase tracking-[0.06em] text-white" style={{ backgroundColor: fiche.couleurStatut || '#9aa3ad' }}>
                {fiche.statut}
              </span>
              {fiche.projet.zone && <span className="text-[13px] font-bold text-slate-500">Zone {fiche.projet.zone}</span>}
              {fiche.projet.places !== null && <span className="text-[13px] font-bold text-slate-500">· {fiche.projet.places} places</span>}
            </div>

            <Carte className="space-y-2.5">
              <TitreCarte icon={User}>Client</TitreCarte>
              <div className="space-y-2 pt-1">
                {fiche.passeport.telephone && ligne(Phone, <a href={`tel:${fiche.passeport.telephone}`} className="font-semibold underline">{fiche.passeport.telephone}</a>)}
                {fiche.passeport.email && ligne(Mail, <a href={`mailto:${fiche.passeport.email}`} className="font-semibold underline">{fiche.passeport.email}</a>)}
                {fiche.passeport.adresse && ligne(MapPin, (
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(fiche.passeport.adresse)}`} target="_blank" rel="noopener noreferrer" className="underline">{fiche.passeport.adresse}</a>
                ))}
                {!fiche.passeport.telephone && !fiche.passeport.email && !fiche.passeport.adresse && <p className="text-[14px]">Coordonnées non renseignées.</p>}
              </div>
            </Carte>

            <Carte className="space-y-3">
              <TitreCarte icon={ClipboardList}>Relevé</TitreCarte>
              {ligne(CalendarClock, fiche.releve.visite ? `Visite ${fiche.releve.visite}` : 'Visite pas encore calée')}
              <a href={fiche.releve.lien}>
                <BoutonPrincipal type="button">Ouvrir le relevé</BoutonPrincipal>
              </a>
            </Carte>

            <Carte className="space-y-3">
              <TitreCarte icon={GitBranch} extra={<span className="text-[14px] font-bold">{fiche.scenarios.length}</span>}>Scénarios</TitreCarte>
              {!fiche.scenarios.length && <p className="text-[14px]">Aucun scénario : le relevé créera le premier.</p>}
              {fiche.scenarios.map((s) => (
                <div key={s.id} className="rounded-[14px] bg-white p-4 ring-[1.5px] ring-[#dfe3e8]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white" style={{ backgroundColor: s.couleurStatut || '#9aa3ad' }}>
                      {s.statut}
                    </span>
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

            <Carte className="space-y-2.5">
              <TitreCarte icon={FileText}>Devis</TitreCarte>
              <div className="space-y-2 pt-1">
                {fiche.devis.numero && ligne(FileText, `N° ${fiche.devis.numero}${fiche.devis.montantHT !== null ? ` · ${euros(fiche.devis.montantHT)} HT` : ''}`)}
                {!fiche.devis.numero && fiche.devis.montantHT !== null && ligne(FileText, `${euros(fiche.devis.montantHT)} HT`)}
                {fiche.relance && ligne(CalendarClock, `Prochaine relance ${fiche.relance}`)}
                {fiche.devis.lienDevis && ligne(ExternalLink, <a href={fiche.devis.lienDevis} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Voir le devis</a>)}
                {fiche.devis.lienCostructor && ligne(ExternalLink, <a href={fiche.devis.lienCostructor} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Client dans Costructor</a>)}
                {!fiche.devis.numero && fiche.devis.montantHT === null && !fiche.devis.lienDevis && <p className="text-[14px]">Pas encore de devis.</p>}
              </div>
            </Carte>

            <div className="pt-2 text-center">
              <a href={fiche.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: CYAN }}>
                <ExternalLink size={13} /> Ouvrir dans ClickUp
              </a>
            </div>
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
