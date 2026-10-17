"use client";

// Fiche générique (lot « écrans qui manquent », 17/10/2026, 14 h 28). LECTURE SEULE.
// Une commande, un ticket SAV, une visite, une facture, un achat, un dossier ADVENIR, une demande RH, une réunion CODIR,
// un OKR, une idée Kaizen ou une tâche To-Do : statut, échéance, assignés, tous les champs remplis (téléphone, email
// et liens cliquables, tâches reliées ouvertes dans l'application), description, sous-tâches, pièces jointes et
// derniers commentaires. Une fiche affaire (Prospection à Parc) bascule sur /interne/fiches/<id>.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarClock, ChevronRight, ExternalLink, MessageSquare, Paperclip, RefreshCw, Tag, User } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, TitreCarte } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';

type Champ = { id: string; nom: string; type: string; texte: string; lien?: string; taches?: { id: string; nom: string }[] };
type Element = {
  id: string; nom: string; source: string; liste: string; emoji: string; retour: string; statut: string; couleurStatut: string;
  echeance: string; debut: string; assignes: string[]; tags: string[]; description: string; champs: Champ[]; parent: string;
  sousTaches: { id: string; nom: string; statut: string; couleurStatut: string }[];
  piecesJointes: { nom: string; url: string }[];
  commentaires: { id: string; auteur: string; date: string; texte: string }[];
  url: string;
};

const sansEmoji = (s: string) => s.replace(/^[^A-Za-z0-9\u00C0-\u017F]+/, '').trim();

export default function ElementPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const [element, setElement] = useState<Element | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<{ texte: string; url?: string } | null>(null);

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

            {(element.echeance || element.debut || element.assignes.length > 0) && (
              <Carte className="space-y-2">
                {element.debut && <p className="flex items-center gap-2 text-[15px]"><CalendarClock size={16} color={CYAN} /> Début {element.debut}</p>}
                {element.echeance && <p className="flex items-center gap-2 text-[15px]"><CalendarClock size={16} color={CYAN} /> Échéance {element.echeance}</p>}
                {element.assignes.length > 0 && <p className="flex items-center gap-2 text-[15px]"><User size={16} color={CYAN} /> {element.assignes.join(', ')}</p>}
              </Carte>
            )}

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
