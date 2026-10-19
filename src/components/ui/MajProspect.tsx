"use client";

// Mise à jour d'un prospect depuis l'application (17/10/2026, 19 h 53) : remplace « Mettre à jour dans ClickUp ».
// Statut, 📢 Résultat Appel, prochain rappel (vide = règle du wiki), note ; et « RDV fixé » qui fait passer le prospect
// en projet (même tâche, déplacée en Qualification, type Projet). Écrit par /api/interne/prospects.
import { useState } from 'react';
import { CalendarCheck, Check, PencilLine, RefreshCw, Trophy } from 'lucide-react';
import { CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';

export type OptionsProspect = {
  statuts: { nom: string; type: string }[];
  resultats: { id: string; nom: string }[];
};

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function MajProspect({ id, statut, options, onFait }: { id: string; statut: string; options: OptionsProspect | null; onFait: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [nouveauStatut, setNouveauStatut] = useState('');
  const [resultat, setResultat] = useState('');
  const [rappel, setRappel] = useState('');
  const [note, setNote] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const statuts = (options?.statuts || []).filter((s) => !normal(s.nom).includes('rdv fixe') && s.nom !== statut);

  const envoyer = async (corps: any) => {
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/prospects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) { setErreur(data?.error || `Envoi impossible (${res.status})`); return null; }
      return data;
    } catch {
      setErreur('Impossible de joindre le serveur. Rien n’a été enregistré.');
      return null;
    } finally {
      setEnvoi(false);
    }
  };

  const enregistrer = async () => {
    const data = await envoyer({ action: 'maj', id, statut: nouveauStatut, resultat, rappel, note });
    if (!data) return;
    setMessage(data.rappel ? `Enregistré. Prochain rappel le ${data.rappel}${data.regle ? ` (${data.regle})` : ''}.` : 'Enregistré.');
    setOuvert(false);
    setNouveauStatut(''); setResultat(''); setRappel(''); setNote('');
    onFait();
  };

  const passerEnProjet = async () => {
    if (!confirmer) { setConfirmer(true); return; }
    const data = await envoyer({ action: 'projet', id, note });
    if (!data) { setConfirmer(false); return; }
    window.location.href = data.fiche?.lien || '/interne/fiches?vue=a-caler';
  };

  const pastille = (actif: boolean, libelle: string, changer: () => void) => (
    <button key={libelle} onClick={changer} className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={actif ? { backgroundColor: CYAN } : undefined}>
      {libelle}
    </button>
  );

  if (!ouvert) {
    return (
      <div className="space-y-1">
        {message && <p className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: CYAN }}><Check size={14} /> {message}</p>}
        <button onClick={() => { setOuvert(true); setMessage(null); }} className="inline-flex items-center gap-1.5 text-[14px] font-bold" style={{ color: CYAN }}>
          <PencilLine size={15} /> Mettre à jour
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[16px] bg-white p-4 ring-[1.5px] ring-[#dfe3e8]">
      {!options && <RefreshCw className="animate-spin" size={18} color={CYAN} />}
      {options && (
        <>
          <div>
            <p className={ETIQUETTE}>Résultat de l&apos;appel</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {options.resultats.map((r) => pastille(resultat === r.id, r.nom, () => setResultat(resultat === r.id ? '' : r.id)))}
            </div>
          </div>
          <div>
            <p className={ETIQUETTE}>Nouveau statut (actuel : {statut || 'aucun'})</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {statuts.map((s) => pastille(nouveauStatut === s.nom, s.nom, () => setNouveauStatut(nouveauStatut === s.nom ? '' : s.nom)))}
            </div>
          </div>
          <div>
            <label className={ETIQUETTE}>Prochain rappel</label>
            <input type="date" className={`${CHAMP} mt-1.5`} value={rappel} onChange={(e) => setRappel(e.target.value)} />
            <p className="mt-1 text-[12px] text-slate-500">Vide : règle du wiki (pas de réponse ou message vocal +2 jours ouvrés, contacté +1, nurturing +90 jours).</p>
          </div>
          <div>
            <label className={ETIQUETTE}>Note (facultatif)</label>
            <textarea className={`${CHAMP} mt-1.5 min-h-[70px]`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ce qui s’est dit, objection, prochaine étape…" />
          </div>
          {erreur && <p className="text-[13px] font-bold text-red-600">{erreur}</p>}
          <div className="flex flex-wrap gap-2">
            <button disabled={envoi} onClick={enregistrer} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-bold text-white disabled:opacity-50" style={{ backgroundColor: CYAN }}>
              {envoi ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />} Enregistrer
            </button>
            <button disabled={envoi} onClick={() => { setOuvert(false); setConfirmer(false); setErreur(null); }} className="rounded-full px-4 py-2.5 text-[14px] font-semibold ring-[1.5px] ring-[#dfe3e8]">
              Annuler
            </button>
          </div>
          <div className="border-t border-[#eceef1] pt-3">
            <button disabled={envoi} onClick={passerEnProjet} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-5 py-3 text-[15px] font-bold text-white disabled:opacity-50">
              {confirmer ? <Trophy size={17} /> : <CalendarCheck size={17} />}
              {confirmer ? 'Confirmer : il part en Qualification comme projet' : 'RDV fixé : passer en projet'}
            </button>
            {confirmer && <p className="mt-1.5 text-center text-[12px] text-slate-500">La même fiche quitte la Prospection et arrive dans « Visites à caler ».</p>}
          </div>
        </>
      )}
    </div>
  );
}
