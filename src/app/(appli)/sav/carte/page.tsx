"use client";

// Carte du SAV (17/10/2026, 18 h 27, demandée par Matthieu). LECTURE SEULE.
// Tickets SAV ouverts à l'adresse de l'installation du Parc liée, comme la carte des visites et celle des chantiers :
// la carte du ticket choisi en haut, tous les tickets en dessous, et tous les dépannages dans Google Maps.
// Chef de chantier et direction : toute l'équipe ; vue Installateur : ses tickets.
// 19/10/2026 (2e lot de cohérence) : cartes et boutons sur les briques communes (src/components/charte/Appli.tsx),
// bouton Retour de l'en-tête commun.
import { useEffect, useState } from 'react';
import { CalendarClock, ChevronRight, HardHat, MapPin, Navigation, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, LienPrincipal } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';
import { useRoleAppli } from '@/components/charte/roleAppli';
import { adresses } from '@/lib/adresses';

type Ticket = {
  id: string; nom: string; statut: string; couleurStatut: string; severite: string; quand: string; enRetard: boolean;
  installation: string; installationId: string; adresse: string; techniciens: string[]; lien: string;
};

export default function CarteSavPage() {
  const { role } = useRoleAppli();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [equipe, setEquipe] = useState(false);
  const [choisi, setChoisi] = useState('');
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/interne/carte-sav?role=${encodeURIComponent(role || '')}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
      else { setTickets(data.items || []); setEquipe(!!data.equipe); }
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { charger(); }, [role]);

  const avecAdresse = tickets.filter((t) => !!t.adresse);
  const selection = avecAdresse.find((t) => t.id === choisi) || avecAdresse[0] || null;
  const itineraire = (() => {
    const pts = avecAdresse.map((t) => t.adresse);
    if (pts.length < 2) return '';
    const etapes = pts.slice(0, -1).join('|');
    return `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(pts[pts.length - 1])}${etapes ? `&waypoints=${encodeURIComponent(etapes)}` : ''}`;
  })();

  const carte = (t: Ticket) => (
    <Carte key={t.id} className={`space-y-2 ${t.enRetard ? 'shadow-[inset_5px_0_0_#FF6B00]' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white" style={{ backgroundColor: t.couleurStatut || '#9aa3ad' }}>{t.statut}</span>
        {t.severite && <span className="text-[12px] font-bold text-slate-500">{t.severite}</span>}
      </div>
      <a href={t.lien} className="flex items-center justify-between gap-2">
        <span className="text-[17px] font-bold leading-tight">{t.nom}</span>
        <ChevronRight size={20} className="shrink-0" color={CYAN} />
      </a>
      {t.installation && <p className="text-[13px] font-semibold">🔋 {t.installation}</p>}
      <p className="flex items-center gap-1.5 text-[14px] font-bold" style={{ color: t.enRetard || !t.quand ? ORANGE : CYAN }}>
        <CalendarClock size={15} className="shrink-0" />
        {t.quand ? `${t.enRetard ? 'Échéance dépassée' : 'Échéance'} ${t.quand}` : 'Échéance à fixer'}
      </p>
      {equipe && (
        <p className="flex items-center gap-1.5 text-[13px]">
          <HardHat size={14} className="shrink-0" color={CYAN} />
          {t.techniciens.length ? t.techniciens.join(', ') : 'Technicien à affecter'}
        </p>
      )}
      {t.adresse ? (
        <p className="flex items-center gap-1.5 text-[13px]"><MapPin size={14} className="shrink-0" color={CYAN} /> <span className="truncate">{t.adresse}</span></p>
      ) : (
        <p className="text-[13px]" style={{ color: ORANGE }}>Pas d’adresse : ticket sans installation du Parc liée.</p>
      )}
      <div className="flex flex-wrap gap-4 pt-1">
        {t.adresse && <button onClick={() => { setChoisi(t.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[13px] font-bold" style={{ color: CYAN }}>Voir sur la carte</button>}
        {t.installationId && <a href={adresses.affaire(t.installationId)} className="text-[13px] font-bold" style={{ color: CYAN }}>Fiche de l’installation</a>}
      </div>
    </Carte>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre={equipe ? 'SAV de l’équipe' : 'Mes tickets SAV'} titre="Carte du SAV" retour={{ href: adresses.aTraiter, libelle: "Mon espace" }} />
      <ContenuAppli className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px]">Tickets ouverts, placés à l’adresse de l’installation du Parc.</p>
          <button onClick={charger} aria-label="Actualiser" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-95">
            <RefreshCw size={18} color={CYAN} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && !tickets.length && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement des tickets...</p>
          </Carte>
        )}
        {!loading && !erreur && !tickets.length && (
          <Carte className="text-center"><p className="text-[15px] font-semibold">{equipe ? 'Aucun ticket SAV ouvert.' : 'Aucun ticket SAV pour toi.'}</p></Carte>
        )}
        {selection && (
          <div className="overflow-hidden rounded-[20px] ring-[1.5px] ring-[#dfe3e8]">
            <iframe
              title={`Carte : ${selection.nom}`}
              src={`https://maps.google.com/maps?q=${encodeURIComponent(selection.adresse)}&z=15&output=embed`}
              className="h-[280px] w-full border-0"
              loading="lazy"
            />
            <p className="bg-white px-4 py-2 text-[14px] font-bold">{selection.nom}{selection.installation ? ` · ${selection.installation}` : ''}</p>
          </div>
        )}
        {itineraire && (
          <LienPrincipal href={itineraire}>
            <Navigation size={18} /> Tous les dépannages dans Google Maps ({avecAdresse.length})
          </LienPrincipal>
        )}
        {tickets.map(carte)}
      </ContenuAppli>
    </PageAppli>
  );
}
