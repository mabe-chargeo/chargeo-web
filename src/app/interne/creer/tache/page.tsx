"use client";

// + Tâche dans la To-Do 📝 (17/10/2026, 20 h 14) : titre, échéance, priorité, pour qui, détails.
// Écrit par /api/interne/creer-tache (direction seulement). Brain MAX reste le chemin habituel de Matthieu.
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';

type Membre = { id: number; nom: string };
const PRIORITES = [{ v: 1, l: 'Urgente' }, { v: 2, l: 'Haute' }, { v: 3, l: 'Normale' }, { v: 4, l: 'Basse' }];
const jour = (decalage: number) => {
  const d = new Date(Date.now() + decalage * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
};

export default function CreerTachePage() {
  const [charge, setCharge] = useState(false);
  const [preview, setPreview] = useState(false);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [moi, setMoi] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [titre, setTitre] = useState('');
  const [echeance, setEcheance] = useState('');
  const [priorite, setPriorite] = useState<number | null>(null);
  const [pour, setPour] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [cree, setCree] = useState<{ nom: string; lien: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/interne/creer-tache', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) setErreur(data?.error || `Lecture impossible (${res.status})`);
        else { setPreview(!!data.preview); setMembres(data.membres || []); setMoi(data.moi || null); setPour(data.moi || null); }
      } catch {
        setErreur('Impossible de joindre le serveur.');
      } finally {
        setCharge(true);
      }
    })();
  }, []);

  const pret = titre.trim().length >= 3;
  const envoyer = async () => {
    if (!pret || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/creer-tache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre, echeance, priorite, pour, description }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) setErreur(data?.error || `Envoi impossible (${res.status})`);
      else { setCree(data.cree); setPreview(!!data.preview); }
    } catch {
      setErreur('Impossible de joindre le serveur. Rien n’a été créé.');
    } finally {
      setEnvoi(false);
    }
  };

  const pastille = (actif: boolean, libelle: string, changer: () => void) => (
    <button key={libelle} onClick={changer} className={`rounded-full px-4 py-2 text-[14px] font-bold ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={actif ? { backgroundColor: CYAN } : undefined}>
      {libelle}
    </button>
  );
  const retour = '/interne/liste/todo';
  const boutonRetour = (
    <a href={retour} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> To-Do
    </a>
  );

  if (cree) {
    return (
      <PageAppli>
        <EnTeteAppli surtitre="📝 To-Do" titre="Tâche créée" retour={{ href: retour, libelle: 'To-Do' }} />
        <ContenuAppli className="space-y-4">
          {preview && <Alerte>Preview : créée avec le nom « Test · … ».</Alerte>}
          <Carte accent><p className="text-[18px] font-bold">{cree.nom}</p></Carte>
          <a href={cree.lien} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-8 py-4 text-[17px] font-semibold text-white">Ouvrir la tâche <ChevronRight size={20} /></a>
          <button onClick={() => { setCree(null); setTitre(''); setEcheance(''); setPriorite(null); setPour(moi); setDescription(''); }} className="block w-full text-center text-[15px] font-semibold" style={{ color: CYAN }}>
            + Une autre tâche
          </button>
        </ContenuAppli>
      </PageAppli>
    );
  }

  return (
    <PageAppli>
      <EnTeteAppli surtitre="📝 To-Do" titre="Nouvelle tâche" action={boutonRetour} />
      <ContenuAppli className="space-y-4">
        {preview && <Alerte>Preview : le nom commencera par « Test · ».</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {!charge && <Carte className="p-8 text-center"><RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} /></Carte>}
        {charge && (
          <>
            <div>
              <label className={ETIQUETTE}>Quoi faire</label>
              <input className={`${CHAMP} mt-1.5`} value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. : Relancer l’assureur pour l’attestation décennale" autoComplete="off" />
            </div>
            <div>
              <p className={ETIQUETTE}>Échéance (facultatif)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {pastille(echeance === jour(0), 'Aujourd’hui', () => setEcheance(echeance === jour(0) ? '' : jour(0)))}
                {pastille(echeance === jour(1), 'Demain', () => setEcheance(echeance === jour(1) ? '' : jour(1)))}
                {pastille(echeance === jour(7), 'Dans 7 jours', () => setEcheance(echeance === jour(7) ? '' : jour(7)))}
              </div>
              <input type="date" className={`${CHAMP} mt-2`} value={echeance} onChange={(e) => setEcheance(e.target.value)} />
            </div>
            <div>
              <p className={ETIQUETTE}>Priorité (facultatif)</p>
              <div className="mt-2 flex flex-wrap gap-2">{PRIORITES.map((p) => pastille(priorite === p.v, p.l, () => setPriorite(priorite === p.v ? null : p.v)))}</div>
            </div>
            {membres.length > 1 && (
              <div>
                <p className={ETIQUETTE}>Pour qui</p>
                <div className="mt-2 flex flex-wrap gap-2">{membres.map((m) => pastille(pour === m.id, m.id === moi ? `${m.nom} (moi)` : m.nom, () => setPour(m.id)))}</div>
              </div>
            )}
            <div>
              <label className={ETIQUETTE}>Détails (facultatif)</label>
              <textarea className={`${CHAMP} mt-1.5 min-h-[110px]`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contexte, liens, ce qui est attendu…" />
            </div>
            <BoutonPrincipal inactif={!pret || envoi} disabled={!pret || envoi} onClick={envoyer}>
              {envoi ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />}
              Créer la tâche
            </BoutonPrincipal>
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
