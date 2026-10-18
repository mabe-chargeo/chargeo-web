"use client";

// Fiche générique (lot « écrans qui manquent », 17/10/2026, 14 h 28).
// Une commande, un ticket SAV, une visite, une facture, un achat, un dossier ADVENIR, une demande RH, une réunion CODIR,
// un OKR, une idée Kaizen ou une tâche To-Do : statut, échéance, assignés, tous les champs remplis (téléphone, email
// et liens cliquables, tâches reliées ouvertes dans l'application), description, sous-tâches, pièces jointes et
// derniers commentaires. Une fiche affaire (Prospection à Parc) bascule sur /interne/fiches/<id>.
// 17/10, 14 h 50 : une visite de maintenance a le bouton « Faire la visite » (/interne/maintenance/<id>, protocole
// Sefram MW9665 avec l'adaptateur A1532-XA).
// 17/10, 20 h 01 (choix de Matthieu : checklist d'onboarding dans la fiche salarié) : les checklists de la tâche,
// avec leur avancement, se cochent ici (/api/interne/checklist). Seule écriture de la fiche générique.
// 18/10, 9 h 33 : visite de maintenance (à planifier ou rdv confirmé) et ticket SAV ouvert : bouton « Caler » ou
// « Décaler » (/interne/rdv/<visite|depannage>/<id>), pour le chef de chantier et la direction (rôle affiché).
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarClock, CalendarPlus, Check, ChevronRight, ExternalLink, ListChecks, MessageSquare, Paperclip, RefreshCw, Tag, User } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, TitreCarte } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';
import { useRoleAppli } from '@/components/charte/roleAppli';

type Champ = { id: string; nom: string; type: string; texte: string; lien?: string; taches?: { id: string; nom: string }[] };
type Checklist = { id: string; nom: string; points: { id: string; nom: string; fait: boolean }[] };
type Element = {
  id: string; nom: string; source: string; liste: string; emoji: string; retour: string; statut: string; couleurStatut: string;
  echeance: string; debut: string; assignes: string[]; tags: string[]; description: string; champs: Champ[]; parent: string;
  sousTaches: { id: string; nom: string; statut: string; couleurStatut: string }[];
  checklists?: Checklist[];
  piecesJointes: { nom: string; url: string }[];
  commentaires: { id: string; auteur: string; date: string; texte: string }[];
  url: string;
};

const sansEmoji = (s: string) => s.replace(/^[^A-Za-z0-9\u00C0-\u017F]+/, '').trim();
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Bouton Caler / Décaler d'une visite ou d'un dépannage (ou rien)
function actionCaler(e: Element): { href: string; libelle: string } | null {
  const s = normal(e.statut);
  if (e.source === 'maintenance' && (s.includes('a planifier') || s.includes('rdv confirme'))) {
    return { href: `/interne/rdv/visite/${e.id}`, libelle: s.includes('rdv confirme') ? '📅 Décaler la visite' : '📅 Caler la visite' };
  }
  if (e.source === 'sav' && !s.includes('resolu') && !s.includes('archive')) {
    return { href: `/interne/rdv/depannage/${e.id}`, libelle: s.includes('intervention planifiee') ? '📅 Décaler le dépannage' : '📅 Caler le dépannage' };
  }
  return null;
}

export default function ElementPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const { role } = useRoleAppli();
  const [element, setElement] = useState<Element | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<{ texte: string; url?: string } | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreurCoche, setErreurCoche] = useState<string | null>(null);

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/interne/fiche-generique?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (data?.fiche) { window.location.replace(String(data.fiche)); return; }
      if (!res.ok || data?.error) setErreur({ texte: data?.error || `Lecture impossible (${res.status})`, url: data?.url });
      else setElement(data.element as Element);
    } catch {
      setErreur({ texte: 'Impossible de joindre le serveur.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) charger(); }, [id]);

  // Coche ou décoche un point ; l'affichage change dès que ClickUp a accepté
  const cocher = async (checklistId: string, pointId: string, fait: boolean) => {
    if (!element || enCours) return;
    setEnCours(pointId);
    setErreurCoche(null);
    try {
      const res = await fetch('/api/interne/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tacheId: element.id, checklistId, pointId, fait }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) { setErreurCoche(data?.error || `Enregistrement impossible (${res.status})`); return; }
      setElement({
        ...element,
        checklists: (element.checklists || []).map((c) => (c.id !== checklistId ? c : { ...c, points: c.points.map((p) => (p.id === pointId ? { ...p, fait } : p)) })),
      });
    } catch {
      setErreurCoche('Impossible de joindre le serveur. Rien n’a changé.');
    } finally {
      setEnCours(null);
    }
  };

  const retour = () => {
    if (window.history.length > 1 && document.referrer.includes('/interne/')) window.history.back();
    else window.location.href = element?.retour || '/interne/espace';
  };
  const boutonRetour = (
    <button onClick={retour} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Retour
    </button>
  );

  const valeur = (c: Champ) => {
    if (c.taches?.length) {
      return (
        <span className="flex flex-col gap-1">
          {c.taches.map((t) => (
            <a key={t.id} href={`/interne/element/${t.id}`} className="inline-flex items-center gap-1 font-semibold" style={{ color: CYAN }}>
              {t.nom || 'Tâche reliée'} <ChevronRight size={14} />
            </a>
          ))}
        </span>
      );
    }
    if (c.lien) {
      const externe = c.lien.startsWith('http');
      return <a href={c.lien} target={externe ? '_blank' : undefined} rel={externe ? 'noopener noreferrer' : undefined} className="break-all font-semibold underline">{c.texte}</a>;
    }
    return <span className="whitespace-pre-line font-semibold">{c.texte}</span>;
  };

  const caler = element && (role === 'direction' || role === 'chargeOperation') ? actionCaler(element) : null;

  return (
    <PageAppli>
      <EnTeteAppli surtitre={element ? `${element.emoji} ${element.liste}` : 'Fiche'} titre={element?.nom || 'Fiche'} action={boutonRetour} />
      <ContenuAppli className="space-y-4">
        {erreur && (
          <Alerte>
            {erreur.texte}
            {erreur.url && <> · <a href={erreur.url} target="_blank" rel="noopener noreferrer" className="underline">Ouvrir dans ClickUp</a></>}
          </Alerte>
        )}
        {loading && !element && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement...</p>
          </Carte>
        )}

        {element && (
          <>
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="rounded-full px-3 py-1 text-[12px] font-extrabold uppercase tracking-[0.06em] text-white" style={{ backgroundColor: element.couleurStatut || '#9aa3ad' }}>
                {element.statut}
              </span>
              {element.tags.map((t) => <span key={t} className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-500"><Tag size={12} /> {t}</span>)}
            </div>

            {caler && (
              <a href={caler.href} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold text-white transition-transform active:scale-95" style={{ backgroundColor: CYAN }}>
                <CalendarPlus size={18} /> {caler.libelle.replace(/^📅 /, '')}
              </a>
            )}

            {element.source === 'maintenance' && (
              <a href={`/interne/maintenance/${element.id}`} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-6 text-[15px] font-semibold text-white shadow-[0_8px_22px_rgba(255,107,0,0.28)] transition-transform active:scale-95">
                🔧 Faire la visite (MW9665)
              </a>
            )}

            {(element.echeance || element.debut || element.assignes.length > 0) && (
              <Carte className="space-y-2">
                {element.debut && <p className="flex items-center gap-2 text-[15px]"><CalendarClock size={16} color={CYAN} /> Début {element.debut}</p>}
                {element.echeance && <p className="flex items-center gap-2 text-[15px]"><CalendarClock size={16} color={CYAN} /> Échéance {element.echeance}</p>}
                {element.assignes.length > 0 && <p className="flex items-center gap-2 text-[15px]"><User size={16} color={CYAN} /> {element.assignes.join(', ')}</p>}
              </Carte>
            )}

            {(element.checklists || []).map((c) => {
              const faits = c.points.filter((p) => p.fait).length;
              const pct = c.points.length ? Math.round((faits / c.points.length) * 100) : 0;
              return (
                <Carte key={c.id} accent className="space-y-3">
                  <TitreCarte icon={ListChecks} extra={<span className="text-[14px] font-bold">{faits}/{c.points.length}</span>}>{c.nom}</TitreCarte>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#eceef1]">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CYAN }} />
                  </div>
                  {erreurCoche && <p className="text-[13px] font-bold text-red-600">{erreurCoche}</p>}
                  <div className="space-y-1.5">
                    {c.points.map((p) => (
                      <button
                        key={p.id}
                        disabled={!!enCours}
                        onClick={() => cocher(c.id, p.id, !p.fait)}
                        className="flex w-full items-center gap-3 rounded-[14px] bg-white p-3 text-left ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-[0.98]"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-2" style={p.fait ? { backgroundColor: CYAN, boxShadow: 'none' } : { boxShadow: 'inset 0 0 0 2px #c5ccd4' }}>
                          {enCours === p.id ? <RefreshCw size={14} className="animate-spin" color={p.fait ? '#fff' : CYAN} /> : p.fait ? <Check size={16} color="#fff" /> : null}
                        </span>
                        <span className={`text-[15px] ${p.fait ? 'text-slate-400 line-through' : 'font-semibold'}`}>{p.nom}</span>
                      </button>
                    ))}
                  </div>
                </Carte>
              );
            })}

            {element.champs.length > 0 && (
              <Carte className="space-y-3">
                {element.champs.map((c) => (
                  <div key={c.id}>
                    <p className="text-[12px] font-bold text-slate-500">{sansEmoji(c.nom) || c.nom}</p>
                    <div className="mt-0.5 text-[15px]">{valeur(c)}</div>
                  </div>
                ))}
              </Carte>
            )}

            {element.description && (
              <Carte>
                <p className="whitespace-pre-line text-[15px] leading-relaxed">{element.description}</p>
              </Carte>
            )}

            {element.parent && (
              <a href={`/interne/element/${element.parent}`} className="flex items-center justify-between rounded-[20px] bg-white p-4 ring-[1.5px] ring-[#dfe3e8]">
                <span className="text-[15px] font-semibold">Tâche parente</span>
                <ChevronRight size={20} color={CYAN} />
              </a>
            )}

            {element.sousTaches.length > 0 && (
              <Carte className="space-y-2.5">
                <TitreCarte icon={ChevronRight} extra={<span className="text-[14px] font-bold">{element.sousTaches.length}</span>}>Sous-tâches</TitreCarte>
                {element.sousTaches.map((s) => (
                  <a key={s.id} href={`/interne/element/${s.id}`} className="flex items-center justify-between gap-3 rounded-[14px] bg-white p-3 ring-[1.5px] ring-[#dfe3e8]">
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-bold">{s.nom}</span>
                      <span className="text-[12px] font-bold uppercase" style={{ color: s.couleurStatut || '#9aa3ad' }}>{s.statut}</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0" color={CYAN} />
                  </a>
                ))}
              </Carte>
            )}

            {element.piecesJointes.length > 0 && (
              <Carte className="space-y-2.5">
                <TitreCarte icon={Paperclip} extra={<span className="text-[14px] font-bold">{element.piecesJointes.length}</span>}>Pièces jointes</TitreCarte>
                {element.piecesJointes.map((p) => (
                  <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 truncate text-[15px] font-semibold underline">
                    <Paperclip size={14} className="shrink-0" color={CYAN} /> {p.nom}
                  </a>
                ))}
              </Carte>
            )}

            {element.commentaires.length > 0 && (
              <Carte className="space-y-3">
                <TitreCarte icon={MessageSquare} extra={<span className="text-[14px] font-bold">{element.commentaires.length}</span>}>Derniers commentaires</TitreCarte>
                {element.commentaires.map((c) => (
                  <div key={c.id} className="rounded-[14px] bg-white p-3 ring-[1.5px] ring-[#dfe3e8]">
                    <p className="text-[12px] font-bold text-slate-500">{[c.auteur, c.date].filter(Boolean).join(' · ')}</p>
                    <p className="mt-1 whitespace-pre-line text-[14px]">{c.texte}</p>
                  </div>
                ))}
              </Carte>
            )}

            <div className="pt-2 text-center">
              <a href={element.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: CYAN }}>
                <ExternalLink size={13} /> Ouvrir dans ClickUp
              </a>
            </div>
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
