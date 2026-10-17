"use client";

// Feu vert chantier, écran du chargé d'opération (Phase 6, 13/10/2026).
// Une carte par chantier ouvert de Planning Chantiers : les 5 prérequis à régler d'un geste (✅ Confirmé, ➖ Non applicable,
// ❌ Manquant), le blocage borne résident, puis le bouton Donner le feu vert, actif seulement quand tout est OK.
// Le commentaire « Feu vert donné » et le retrait automatique restent faits par la route existante (automatisations).
// 17/10, 10 h 26 (Matthieu) : bloc 📇 Contact sur chaque chantier (Appeler, Google Voice, SMS, Gmail, Waze, Maps), lu au
// premier appui.
// 17/10, 12 h 33 : le nom du chantier ouvre la fiche affaire unique ; retour vers Mon espace (et non plus le Planning).
import { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, ShieldCheck, TrafficCone } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, TitreCarte, Alerte, BoutonPrincipal } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';
import { BlocContact } from '@/components/ui/BlocContact';

interface Prerequis { id: string; libelle: string; optionId: string | null; valeur: string | null; ok: boolean }
interface Option { id: string; nom: string; orderindex: number }
interface Chantier {
  id: string; nom: string; statut: string; couleurStatut: string; url: string;
  prerequis: Prerequis[]; blocage: string | null; manquants: string[];
  validePar: string[]; feuVert: boolean; ecritureAutorisee: boolean;
}

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// Libellé court du bouton, couleur quand il est choisi
function apparence(nom: string): { court: string; couleur: string } {
  const n = normal(nom);
  if (n.includes('confirme')) return { court: '✅ Confirmé', couleur: '#16a34a' };
  if (n.includes('non applicable')) return { court: '➖ Non applicable', couleur: '#64748b' };
  if (n.includes('manquant')) return { court: '❌ Manquant', couleur: ORANGE };
  return { court: nom, couleur: CYAN };
}

export default function FeuVertPage() {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/feu-vert', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || data.error) setErreur(data.error || 'Lecture impossible');
      else {
        setChantiers(data.chantiers || []);
        setOptions(data.options || {});
        setPreview(!!data.preview);
      }
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { charger(); }, []);

  const envoyer = async (c: Chantier, corps: Record<string, string>, cle: string) => {
    setEnCours(cle);
    setMessages((m) => ({ ...m, [c.id]: '' }));
    try {
      const res = await fetch('/api/interne/feu-vert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: c.id, ...corps }),
      });
      const data = await res.json();
      if (data.chantier) setChantiers((l) => l.map((x) => (x.id === c.id ? data.chantier : x)));
      if (!res.ok || data.error) setMessages((m) => ({ ...m, [c.id]: data.error || 'Modification refusée' }));
      else if (corps.action === 'feu_vert') setMessages((m) => ({ ...m, [c.id]: '🟢 Feu vert donné. Le commentaire arrive sur la fiche dans quelques secondes.' }));
    } catch {
      setMessages((m) => ({ ...m, [c.id]: 'Impossible de joindre le serveur.' }));
    } finally {
      setEnCours(null);
    }
  };

  const prets = chantiers.filter((c) => !c.feuVert && c.manquants.length === 0);
  const aCompleter = chantiers.filter((c) => !c.feuVert && c.manquants.length > 0);
  const donnes = chantiers.filter((c) => c.feuVert);

  const carte = (c: Chantier) => {
    const occupe = !!enCours && enCours.startsWith(c.id);
    return (
      <Carte key={c.id} accent={c.feuVert} className="space-y-4">
        <TitreCarte
          icon={c.feuVert ? ShieldCheck : TrafficCone}
          extra={<a href={c.url} target="_blank" rel="noreferrer" aria-label="Ouvrir dans ClickUp" className="shrink-0"><ExternalLink size={18} color={CYAN} /></a>}
        >
          <a href={`/interne/fiches/${c.id}`} className="leading-tight underline decoration-[#dfe3e8] underline-offset-4">{c.nom}</a>
        </TitreCarte>
        {c.statut && (
          <p className="text-[13px] font-semibold">
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: c.couleurStatut || CYAN }} />
            {c.statut}
          </p>
        )}

        <BlocContact affaireId={c.id} differe />

        <div className="space-y-3">
          {c.prerequis.map((p) => (
            <div key={p.id} className="rounded-[14px] bg-white p-3">
              <p className="text-[14px] font-bold">{p.libelle}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(options[p.id] || []).map((o) => {
                  const a = apparence(o.nom);
                  const choisi = p.optionId === o.id;
                  const cle = `${c.id}:${p.id}:${o.id}`;
                  return (
                    <button
                      key={o.id}
                      disabled={occupe || choisi || !c.ecritureAutorisee}
                      onClick={() => envoyer(c, { action: 'prerequis', fieldId: p.id, optionId: o.id }, cle)}
                      className={`rounded-full px-3 py-2 text-[13px] font-semibold transition-transform active:scale-95 ${choisi ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'} ${!c.ecritureAutorisee && !choisi ? 'opacity-50' : ''}`}
                      style={choisi ? { backgroundColor: a.couleur } : undefined}
                    >
                      {enCours === cle ? '...' : a.court}
                    </button>
                  );
                })}
                {!p.optionId && <span className="self-center text-[12px] font-semibold" style={{ color: ORANGE }}>pas encore renseigné</span>}
              </div>
            </div>
          ))}
        </div>

        {c.blocage && <Alerte>{c.blocage}</Alerte>}

        {c.feuVert ? (
          <p className="text-[15px] font-bold" style={{ color: '#16a34a' }}>
            🟢 Feu vert donné{c.validePar.length ? ` par ${c.validePar.join(', ')}` : ''}
          </p>
        ) : (
          <BoutonPrincipal
            inactif={c.manquants.length > 0 || !c.ecritureAutorisee}
            disabled={occupe || c.manquants.length > 0 || !c.ecritureAutorisee}
            onClick={() => envoyer(c, { action: 'feu_vert' }, `${c.id}:feu`)}
          >
            {enCours === `${c.id}:feu` ? 'Envoi...' : c.manquants.length ? `Il manque ${c.manquants.length} élément${c.manquants.length > 1 ? 's' : ''}` : 'Donner le feu vert'}
          </BoutonPrincipal>
        )}
        {!c.ecritureAutorisee && <p className="text-[12px]">Preview : seules les fiches « Test » sont modifiables.</p>}
        {messages[c.id] && <Alerte>{messages[c.id]}</Alerte>}
      </Carte>
    );
  };

  const section = (titre: string, liste: Chantier[]) => liste.length > 0 && (
    <>
      <div className="h-2" />
      <Repere>{titre} ({liste.length})</Repere>
      {liste.map(carte)}
    </>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Chargé d'opération" titre="Feu vert chantiers" retour={{ href: '/interne/espace', libelle: 'Mon espace' }} />
      <ContenuAppli className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px]">Le chantier démarre quand les 5 prérequis sont OK et que tu as donné le feu vert.</p>
          <button onClick={charger} aria-label="Actualiser" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-95">
            <RefreshCw size={18} color={CYAN} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {preview && <Alerte>Preview : lecture de tout le planning, modification des fiches « Test » uniquement.</Alerte>}

        {loading && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement des chantiers...</p>
          </Carte>
        )}
        {!loading && erreur && <Alerte>{erreur}</Alerte>}
        {!loading && !erreur && chantiers.length === 0 && (
          <Carte className="p-8 text-center"><p className="text-[15px] font-semibold">Aucun chantier ouvert dans le planning.</p></Carte>
        )}
        {!loading && !erreur && (
          <>
            {section('Prêts pour le feu vert', prets)}
            {section('À compléter', aCompleter)}
            {section('Feu vert donné', donnes)}
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
