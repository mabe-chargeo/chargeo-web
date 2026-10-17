"use client";

// Décomptes énergétiques du back-office (décision de Matthieu du 17/10/2026, 15 h 22 : depuis le Parc, sans nouvelle
// liste). Pastilles : À préparer, À valider, Envoyés, Fiches à compléter. Une carte = une borne en relevé et sa
// dernière période écoulée. À préparer : joindre le PDF fait à partir de Charge Unix ; À valider : relire le PDF,
// l'envoyer soi-même au gestionnaire puis noter l'envoi. Le site n'envoie rien. Jamais de décompte en Refacturation.
import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, ChevronRight, ExternalLink, FileText, MapPin, RefreshCw, Upload } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, CHAMP } from '@/components/charte/Appli';
import { CYAN, GRIS, ORANGE } from '@/components/charte/couleurs';

type Etape = 'a-preparer' | 'a-valider' | 'envoyes' | 'a-completer';
type Item = {
  id: string; nom: string; adresse: string; lien: string; ecritureAutorisee: boolean; etape: Etape; manque?: string;
  periode?: { debut: string; fin: string; libelle: string; ajuste: boolean };
  frequence?: string; tarif?: string; avertissements?: string[]; prepare?: string; envoi?: string;
  pdf?: { nom: string; url: string } | null;
};

const PASTILLES: { cle: Etape; libelle: string }[] = [
  { cle: 'a-preparer', libelle: 'À préparer' },
  { cle: 'a-valider', libelle: 'À valider' },
  { cle: 'envoyes', libelle: 'Envoyés' },
  { cle: 'a-completer', libelle: 'Fiches à compléter' },
];
const estEtape = (s: string | null): s is Etape => PASTILLES.some((p) => p.cle === s);

export default function DecomptesPage() {
  const [vue, setVue] = useState<Etape>('a-preparer');
  const [items, setItems] = useState<Item[]>([]);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fichiers, setFichiers] = useState<Record<string, File | null>>({});
  const [destinataires, setDestinataires] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/decomptes', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
      else { setItems(data.items || []); setPreview(!!data.preview); }
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('vue');
    if (estEtape(v)) setVue(v);
    charger();
  }, []);

  const choisir = (v: Etape) => {
    setVue(v);
    window.history.replaceState(null, '', `/interne/decomptes?vue=${v}`);
  };
  const dire = (id: string, texte: string) => setMessages((m) => ({ ...m, [id]: texte }));

  const joindre = async (i: Item) => {
    const f = fichiers[i.id];
    if (!f || !i.periode) return;
    setEnCours(i.id);
    try {
      const form = new FormData();
      form.append('borneId', i.id);
      form.append('debut', i.periode.debut);
      form.append('fin', i.periode.fin);
      form.append('fichier', f, f.name);
      const res = await fetch('/api/interne/decomptes', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) dire(i.id, data?.error || `Refusé (${res.status})`);
      else { setFichiers((x) => ({ ...x, [i.id]: null })); await charger(); }
    } catch {
      dire(i.id, 'Pas de réseau : réessaie.');
    } finally {
      setEnCours(null);
    }
  };

  const noterEnvoi = async (i: Item) => {
    if (!i.periode) return;
    setEnCours(i.id);
    try {
      const res = await fetch('/api/interne/decomptes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borneId: i.id, debut: i.periode.debut, fin: i.periode.fin, destinataire: destinataires[i.id] || '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) dire(i.id, data?.error || `Refusé (${res.status})`);
      else await charger();
    } catch {
      dire(i.id, 'Pas de réseau : réessaie.');
    } finally {
      setEnCours(null);
    }
  };

  const visibles = items.filter((i) => i.etape === vue);
  const compte = (e: Etape) => items.filter((i) => i.etape === e).length;

  const boutonRetour = (
    <a href="/interne/espace" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Mon espace
    </a>
  );
  const boutonAction = 'flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-6 text-[15px] font-semibold text-white transition-transform active:scale-95 disabled:opacity-50';

  const carte = (i: Item) => (
    <div key={i.id} className="space-y-3 rounded-[20px] p-5" style={{ backgroundColor: GRIS }}>
      <a href={i.lien} className="flex items-center justify-between gap-2">
        <span className="text-[17px] font-bold leading-tight">{i.nom}</span>
        <ChevronRight size={20} className="shrink-0" color={CYAN} />
      </a>
      {i.adresse && <p className="flex items-center gap-1.5 text-[13px]"><MapPin size={14} className="shrink-0" color={CYAN} /> <span className="truncate">{i.adresse}</span></p>}
      {i.etape === 'a-completer' && <p className="text-[15px] font-semibold" style={{ color: ORANGE }}>Suivie en relevé mais {i.manque} est vide : complète la fiche.</p>}
      {i.periode && (
        <p className="text-[15px] font-bold" style={{ color: CYAN }}>
          Période {i.periode.libelle}{i.periode.ajuste ? ' (début = mise en service)' : ''} · {String(i.frequence || '').toLowerCase()}
        </p>
      )}
      {i.etape !== 'a-completer' && <p className="text-[13px]">Tarif gestionnaire : <b>{i.tarif || 'à demander'}</b></p>}
      {(i.avertissements || []).length > 0 && i.etape !== 'envoyes' && (
        <div className="space-y-1">
          {(i.avertissements || []).map((a) => <p key={a} className="flex items-start gap-1.5 text-[13px]"><AlertTriangle size={14} className="mt-0.5 shrink-0" color={ORANGE} /> {a}</p>)}
        </div>
      )}

      {i.etape === 'a-preparer' && (
        <>
          <p className="text-[13px]">Reprends les consommations de la période dans Charge Unix : kWh par résident ou lot, au tarif coûtant du syndic, sans marge (ce n’est pas une facture CHARGéO). Vérifie les changements d’occupant et de badge.</p>
          <label className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold ring-[1.5px] ring-[#dfe3e8]" style={{ color: CYAN }}>
            <FileText size={18} /> {fichiers[i.id] ? fichiers[i.id]?.name : 'Choisir le PDF du décompte'}
            <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(ev) => setFichiers({ ...fichiers, [i.id]: ev.target.files?.[0] || null })} />
          </label>
          <button className={boutonAction} disabled={!fichiers[i.id] || enCours === i.id || !i.ecritureAutorisee} onClick={() => joindre(i)}>
            <Upload size={18} /> {enCours === i.id ? 'Envoi...' : 'Joindre le décompte préparé'}
          </button>
        </>
      )}

      {i.etape === 'a-valider' && (
        <>
          {i.prepare && <p className="text-[13px]">{i.prepare}</p>}
          {i.pdf?.url ? (
            <a href={i.pdf.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[15px] font-semibold underline"><FileText size={16} color={CYAN} /> {i.pdf.nom}</a>
          ) : <p className="text-[13px]" style={{ color: ORANGE }}>PDF introuvable sur la borne : rejoins-le depuis ClickUp.</p>}
          <p className="text-[13px]">Relis le PDF, envoie-le toi-même au gestionnaire (Gmail), puis note l’envoi. Le site n’envoie rien.</p>
          <input className={CHAMP} placeholder="Envoyé à (email du gestionnaire)" value={destinataires[i.id] || ''} onChange={(ev) => setDestinataires({ ...destinataires, [i.id]: ev.target.value })} />
          <button className={boutonAction} disabled={!(destinataires[i.id] || '').trim() || enCours === i.id || !i.ecritureAutorisee} onClick={() => noterEnvoi(i)}>
            <Check size={18} /> {enCours === i.id ? 'Enregistrement...' : 'Valider et noter l’envoi'}
          </button>
        </>
      )}

      {i.etape === 'envoyes' && i.envoi && <p className="flex items-start gap-1.5 text-[14px] font-semibold"><Check size={16} className="mt-0.5 shrink-0" color="#16a34a" /> {i.envoi}</p>}
      {messages[i.id] && <p className="text-[13px] font-semibold" style={{ color: ORANGE }}>{messages[i.id]}</p>}
    </div>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Back-office" titre="Décomptes énergétiques" action={boutonRetour} />
      <ContenuAppli className="space-y-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {PASTILLES.map((p) => (
            <button key={p.cle} onClick={() => choisir(p.cle)} className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-bold ${vue === p.cle ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={vue === p.cle ? { backgroundColor: CYAN } : undefined}>
              {p.libelle} ({compte(p.cle)})
            </button>
          ))}
          <button onClick={charger} aria-label="Actualiser" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-[1.5px] ring-[#dfe3e8]">
            <RefreshCw size={16} color={CYAN} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <Alerte>Bornes du Parc suivies en relevé uniquement. En refacturation, les paiements passent par Charge Unix : pas de décompte.</Alerte>
        {preview && <Alerte>Preview : seules les bornes « Test … » peuvent être modifiées.</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && !items.length && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Lecture du Parc...</p>
          </Carte>
        )}
        {!loading && !erreur && !visibles.length && <Carte className="text-center"><p className="text-[15px] font-semibold">Rien dans cette pastille.</p></Carte>}
        {visibles.map(carte)}

        <div className="pt-2 text-center">
          <a href="/interne/liste/parc" className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: CYAN }}>
            <ExternalLink size={13} /> Tout le Parc installé
          </a>
        </div>
      </ContenuAppli>
    </PageAppli>
  );
}
