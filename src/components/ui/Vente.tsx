"use client";

// Vente depuis la fiche affaire (18/10/2026, 12 h, « Construis les deux »), lue et écrite par /api/interne/vente.
// partie "projet" : carte « Le projet », zone de déplacement (règle de la page « 🚚 Déplacements et véhicules » : Z1 cœur
//   de secteur, déplacement inclus ; Z2 périphérie, facturé au barème ; Z3 éloigné, à valider par la direction), nombre
//   de places (réserve IRVE et ADVENIR), SIRET / N° RNIC (client Costructor), date de dépôt du permis (assiette ADVENIR).
// partie "suite" : carte « Suite de la vente », boutons selon le statut : devis à faire → Devis envoyé ; devis envoyé →
//   En négociation, Gagné, Perdu ; en négociation → Gagné, Perdu. Gagné et Perdu demandent une confirmation dans la
//   page ; Perdu demande le motif. Commercial et direction (contrôlé côté serveur).
import { useEffect, useState } from 'react';
import { Building2, Check, Flame, RefreshCw, Send, Trophy, XCircle } from 'lucide-react';
import { Carte, TitreCarte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, LABEL, ORANGE } from '@/components/charte/couleurs';

type Etat = {
  statut: string; zone: string; zones: string[]; places: number | null; siret: string; permis: string;
  motif: string; motifs: string[]; manquants: string[];
};
const URL = '/api/interne/vente';
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const AIDE_ZONE: Record<string, string> = {
  z1: 'Cœur de secteur : déplacement inclus',
  z2: 'Périphérie : déplacement facturé au barème',
  z3: 'Éloigné : à valider par la direction avant de s’engager',
};

async function poster(corps: any): Promise<{ ok: boolean; j: any }> {
  try {
    const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    const j = await res.json().catch(() => ({}));
    return { ok: res.ok && !!j?.success, j };
  } catch {
    return { ok: false, j: { error: 'Pas de réseau : rien n’a été modifié' } };
  }
}

function Pastille({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full px-5 py-2.5 text-[15px] font-bold ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={actif ? { backgroundColor: CYAN } : { color: LABEL }}>
      {children}
    </button>
  );
}
function BoutonSecondaire({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-[16px] font-semibold ring-[1.5px] ring-[#dfe3e8] disabled:opacity-50" style={{ color: CYAN }}>
      {children}
    </button>
  );
}

export function Vente({ ficheId, partie, onChange }: { ficheId: string; partie: 'projet' | 'suite'; onChange?: () => void }) {
  const [e, setE] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  // Le projet
  const [zone, setZone] = useState('');
  const [places, setPlaces] = useState('');
  const [siret, setSiret] = useState('');
  const [permis, setPermis] = useState('');
  // Suite de la vente
  const [confirmer, setConfirmer] = useState<'gagne' | 'perdu' | null>(null);
  const [motif, setMotif] = useState('');

  const remplir = (j: Etat) => {
    setE(j);
    setZone(j.zone || '');
    setPlaces(j.places === null || j.places === undefined ? '' : String(j.places));
    setSiret(j.siret || '');
    setPermis(j.permis || '');
  };
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${URL}?id=${encodeURIComponent(ficheId)}`, { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j?.success) setErreur(j?.error || `Lecture impossible (${res.status})`);
        else remplir(j as Etat);
      } catch {
        setErreur('Pas de réseau : la vente ne peut pas être lue.');
      }
    })();
  }, [ficheId]);

  if (!e) {
    if (!erreur) return null;
    return <Alerte>{erreur}</Alerte>;
  }

  // ---- Le projet ----
  if (partie === 'projet') {
    const change = zone !== (e.zone || '') || places !== (e.places === null ? '' : String(e.places)) || siret !== (e.siret || '') || permis !== (e.permis || '');
    const enregistrer = async () => {
      setEnvoi(true);
      setErreur('');
      setMessage('');
      const { ok, j } = await poster({ id: ficheId, action: 'projet', zone, places: places === '' ? null : Number(places), siret, permis });
      if (j?.statut !== undefined) remplir(j as Etat);
      if (!ok) setErreur(j?.error || (j?.rates?.length ? `Non enregistré : ${j.rates.join(', ')}.` : 'Rien n’a été enregistré.'));
      else { setMessage('Projet enregistré.'); onChange?.(); }
      setEnvoi(false);
    };
    const manque = [!e.zone && 'zone', e.places === null && 'places'].filter(Boolean) as string[];
    return (
      <Carte className="space-y-4">
        <TitreCarte icon={Building2}>Le projet</TitreCarte>
        {manque.length > 0 && <p className="text-[14px] font-semibold" style={{ color: ORANGE }}>À renseigner pour le chiffrage : {manque.join(' et ')}.</p>}
        <div className="space-y-2">
          <p className={ETIQUETTE}>Zone de déplacement</p>
          <div className="flex flex-wrap gap-2">
            {(e.zones.length ? e.zones : ['Z1', 'Z2', 'Z3']).map((z) => <Pastille key={z} actif={zone === z} onClick={() => setZone(zone === z ? '' : z)}>{z}</Pastille>)}
          </div>
          {zone && <p className="ml-1 text-[13px]">{AIDE_ZONE[normal(zone)] || ''}</p>}
        </div>
        <div className="space-y-2">
          <label className={ETIQUETTE} htmlFor={`places-${ficheId}`}>Nombre de places de parking</label>
          <input id={`places-${ficheId}`} type="number" inputMode="numeric" min={0} className={CHAMP} value={places} onChange={(ev) => setPlaces(ev.target.value)} placeholder="Ex : 30" />
          <p className="ml-1 text-[13px]">Sert à la réserve IRVE et à l’aide ADVENIR.</p>
        </div>
        <div className="space-y-2">
          <label className={ETIQUETTE} htmlFor={`siret-${ficheId}`}>SIRET ou N° RNIC</label>
          <input id={`siret-${ficheId}`} className={CHAMP} value={siret} maxLength={40} onChange={(ev) => setSiret(ev.target.value)} placeholder="Syndic ou société" />
        </div>
        <div className="space-y-2">
          <label className={ETIQUETTE} htmlFor={`permis-${ficheId}`}>Date de dépôt du permis (ADVENIR)</label>
          <input id={`permis-${ficheId}`} type="date" className={CHAMP} value={permis} onChange={(ev) => setPermis(ev.target.value)} />
        </div>
        {e.manquants.filter((m) => m !== 'motif').length > 0 && <p className="text-[13px]">Champ absent de cette liste : {e.manquants.filter((m) => m !== 'motif').join(', ')}.</p>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {message && <p className="flex items-center gap-1.5 px-1 text-[14px] font-semibold" style={{ color: '#16a34a' }}><Check size={16} /> {message}</p>}
        <BoutonPrincipal type="button" onClick={enregistrer} disabled={envoi || !change} inactif={envoi || !change}>
          {envoi ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />} {envoi ? 'Enregistrement…' : 'Enregistrer le projet'}
        </BoutonPrincipal>
      </Carte>
    );
  }

  // ---- Suite de la vente ----
  const s = normal(e.statut);
  const aVisiter = s.includes('visiter');
  const close = s.includes('gagn') || s.includes('perdu') || s.includes('archiv');
  const envoye = s.includes('devis envoy');
  const nego = s.includes('negociation');
  const passer = async (statut: 'envoye' | 'negociation' | 'gagne' | 'perdu') => {
    setEnvoi(true);
    setErreur('');
    setMessage('');
    const { ok, j } = await poster({ id: ficheId, action: 'statut', statut, motif });
    if (!ok) { setErreur(j?.error || 'Le statut n’a pas changé.'); setEnvoi(false); return; }
    setE({ ...e, statut: String(j.statut || e.statut), motif: String(j.motif || e.motif) });
    setConfirmer(null);
    setMessage(`Fiche passée en ${j.statut}.`);
    setEnvoi(false);
    onChange?.();
  };

  return (
    <Carte accent className="space-y-3">
      <TitreCarte icon={Send}>Suite de la vente</TitreCarte>
      <p className="text-[14px]">Statut actuel : <strong>{e.statut || '–'}</strong>{e.motif && s.includes('perdu') ? ` (${e.motif})` : ''}.</p>
      {aVisiter && <p className="text-[14px]">Le relevé d’abord : la suite de la vente s’ouvre quand la fiche passe en devis à faire.</p>}
      {close && <p className="text-[14px]">Vente close.</p>}
      {erreur && <Alerte>{erreur}</Alerte>}
      {message && <p className="flex items-center gap-1.5 px-1 text-[14px] font-semibold" style={{ color: '#16a34a' }}><Check size={16} /> {message}</p>}

      {!aVisiter && !close && !confirmer && (
        <div className="space-y-2 pt-1">
          {!envoye && !nego && (
            <BoutonPrincipal type="button" onClick={() => passer('envoye')} disabled={envoi} inactif={envoi}>
              <Send size={20} /> 📩 Devis envoyé
            </BoutonPrincipal>
          )}
          {envoye && <BoutonSecondaire onClick={() => passer('negociation')} disabled={envoi}><Flame size={18} /> En négociation</BoutonSecondaire>}
          {(envoye || nego) && (
            <>
              <BoutonPrincipal type="button" onClick={() => setConfirmer('gagne')} disabled={envoi} inactif={envoi}><Trophy size={20} /> Gagné</BoutonPrincipal>
              <BoutonSecondaire onClick={() => setConfirmer('perdu')} disabled={envoi}><XCircle size={18} /> Perdu</BoutonSecondaire>
            </>
          )}
          {!envoye && !nego && <p className="px-1 text-[12px] text-slate-500">Le devis part encore à la main : ce bouton dit qu’il est envoyé et lance la relance J+3.</p>}
        </div>
      )}

      {confirmer === 'gagne' && (
        <div className="space-y-3 rounded-[16px] bg-white p-4 ring-2 ring-[#FF6B00]">
          <p className="text-[15px] font-semibold leading-relaxed">Projet gagné ? Le scénario retenu est choisi (devis signé dans Costructor, ou lien du devis sur la fiche), puis l’acompte, le chantier, la commande et le dossier ADVENIR partent.</p>
          <BoutonPrincipal type="button" onClick={() => passer('gagne')} disabled={envoi} inactif={envoi}><Trophy size={20} /> {envoi ? 'Envoi…' : 'Confirmer : gagné'}</BoutonPrincipal>
          <BoutonSecondaire onClick={() => setConfirmer(null)} disabled={envoi}>Annuler</BoutonSecondaire>
        </div>
      )}

      {confirmer === 'perdu' && (
        <div className="space-y-3 rounded-[16px] bg-white p-4 ring-2 ring-[#FF6B00]">
          <p className={ETIQUETTE}>Motif du refus</p>
          <div className="flex flex-wrap gap-2">
            {e.motifs.map((m) => <Pastille key={m} actif={motif === m} onClick={() => setMotif(m)}>{m}</Pastille>)}
          </div>
          <p className="text-[13px]">Le relevé calé sort de l’agenda Google, la fiche passe dans Perdues.</p>
          <BoutonPrincipal type="button" onClick={() => passer('perdu')} disabled={envoi || !motif} inactif={envoi || !motif}><XCircle size={20} /> {envoi ? 'Envoi…' : 'Confirmer : perdu'}</BoutonPrincipal>
          <BoutonSecondaire onClick={() => { setConfirmer(null); setMotif(''); }} disabled={envoi}>Annuler</BoutonSecondaire>
        </div>
      )}
    </Carte>
  );
}
