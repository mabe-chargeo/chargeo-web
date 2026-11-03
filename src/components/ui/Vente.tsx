"use client";

// Vente depuis la fiche affaire (18/10/2026, 12 h, « Construis les deux »), lue et écrite par /api/interne/vente.
// partie "suite" : carte « Suite de la vente », boutons selon le statut : devis à faire → Devis envoyé ; devis envoyé →
//   En négociation, Gagné, Perdu ; en négociation → Gagné, Perdu. Gagné et Perdu demandent une confirmation dans la
//   page ; Perdu demande le motif. Commercial et direction (contrôlé côté serveur).
// 18/10, 12 h 25 : « Devis des scénarios », le lien du devis à coller sous chaque scénario (l'alerte le demandait sans
//   endroit pour le faire) ; la confirmation du gagné fait choisir le scénario retenu parmi ceux qui ont un lien.
// 19/10/2026, 11 h 03 : pastilles, bouton blanc et cadre de confirmation pris dans les briques communes
// (src/components/charte/Appli.tsx), les mêmes que le suivi des commandes et des dossiers ADVENIR (Suivi.tsx).
// 03/11/2026 (Phase 8, étape 7, PR #59, choix de Mathieu à 6 h 18, après sa remarque du 02/11 à 21 h 29 sur la carte
// « Le projet » : « ce n'est pas sa place ») : la carte « Le projet » est retirée.
// - Zone de déplacement : plus demandée (D9 : zone et jours ajustés au montage du devis) ;
// - places de parking et date de dépôt du permis : carte « Le site » du relevé COP (src/components/ui/SiteCop.tsx) ;
// - partie "siret" : 🏛️ SIRET / N° RNIC du client, affiché dans le bloc 📇 Contact de la fiche en vente (client Costructor
//   créé au passage en devis à faire), écrit par l'action « projet » de la route avec ce seul champ.
// « Devis des scénarios » : le lien se remplit seul au passage en 📩 devis envoyé (src/lib/devisScenarios.ts) ; on ne
// le colle ici que si le site ne le trouve pas.
import { useEffect, useState } from 'react';
import { Check, Flame, Link2, RefreshCw, Send, Trophy, XCircle } from 'lucide-react';
import { Carte, TitreCarte, Alerte, BoutonPrincipal, BoutonSecondaire, PastilleChoix as Pastille, CadreConfirmation, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { LABEL } from '@/components/charte/couleurs';

type Scenario = { id: string; nom: string; statut: string; lien: string; retenu: boolean };
type Etat = {
  statut: string; zone: string; zones: string[]; places: number | null; siret: string; permis: string;
  motif: string; motifs: string[]; manquants: string[]; lienFiche?: string; scenarios?: Scenario[];
};
const URL = '/api/interne/vente';
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function poster(corps: any): Promise<{ ok: boolean; j: any }> {
  try {
    const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    const j = await res.json().catch(() => ({}));
    return { ok: res.ok && !!j?.success, j };
  } catch {
    return { ok: false, j: { error: 'Pas de réseau : rien n’a été modifié' } };
  }
}

export function Vente({ ficheId, partie, onChange }: { ficheId: string; partie: 'siret' | 'suite'; onChange?: () => void }) {
  const [e, setE] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  // SIRET / N° RNIC
  const [siret, setSiret] = useState('');
  // Suite de la vente
  const [confirmer, setConfirmer] = useState<'gagne' | 'perdu' | null>(null);
  const [motif, setMotif] = useState('');
  const [liens, setLiens] = useState<Record<string, string>>({});
  const [retenu, setRetenu] = useState('');

  const prendreScenarios = (l: Scenario[] | undefined) => {
    const m: Record<string, string> = {};
    for (const s of l || []) m[s.id] = s.lien || '';
    setLiens(m);
  };
  const remplir = (j: Etat) => {
    setE(j);
    setSiret(j.siret || '');
    prendreScenarios(j.scenarios);
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

  // ---- SIRET / N° RNIC, dans le bloc Contact (03/11/2026) ----
  if (partie === 'siret') {
    const change = siret.trim() !== (e.siret || '');
    const enregistrer = async () => {
      setEnvoi(true);
      setErreur('');
      setMessage('');
      const { ok, j } = await poster({ id: ficheId, action: 'projet', siret: siret.trim() });
      if (j?.statut !== undefined) remplir(j as Etat);
      if (!ok) setErreur(j?.error || (j?.rates?.length ? `Non enregistré : ${j.rates.join(', ')}.` : 'Rien n’a été enregistré.'));
      else setMessage('SIRET / N° RNIC enregistré.');
      setEnvoi(false);
    };
    return (
      <div className="space-y-2 border-t border-[#dfe3e8] pt-3">
        <label className={ETIQUETTE} htmlFor={`siret-${ficheId}`}>🏛️ SIRET ou N° RNIC du client</label>
        <input id={`siret-${ficheId}`} className={CHAMP} value={siret} maxLength={40} onChange={(ev) => setSiret(ev.target.value)} placeholder="Syndic ou société" />
        <p className="ml-1 text-[13px]">Sert à créer le client dans Costructor quand la fiche passe en devis à faire.</p>
        {erreur && <Alerte>{erreur}</Alerte>}
        {message && <p className="flex items-center gap-1.5 px-1 text-[14px] font-semibold" style={{ color: '#16a34a' }}><Check size={16} /> {message}</p>}
        {change && (
          <BoutonSecondaire compact onClick={enregistrer} disabled={envoi}>
            {envoi ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />} {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </BoutonSecondaire>
        )}
      </div>
    );
  }

  // ---- Suite de la vente ----
  const s = normal(e.statut);
  const aVisiter = s.includes('visiter');
  const close = s.includes('gagn') || s.includes('perdu') || s.includes('archiv');
  const envoye = s.includes('devis envoy');
  const nego = s.includes('negociation');
  const scenarios = e.scenarios || [];
  const aTrancher = scenarios.filter((x) => !x.retenu);
  const avecLien = aTrancher.filter((x) => x.lien);
  const retenuEffectif = retenu && avecLien.some((x) => x.id === retenu) ? retenu : avecLien.length === 1 ? avecLien[0].id : '';

  const passer = async (statut: 'envoye' | 'negociation' | 'gagne' | 'perdu') => {
    setEnvoi(true);
    setErreur('');
    setMessage('');
    const { ok, j } = await poster({ id: ficheId, action: 'statut', statut, motif, retenu: statut === 'gagne' ? retenuEffectif : undefined });
    if (!ok) { setErreur(j?.error || 'Le statut n’a pas changé.'); setEnvoi(false); return; }
    setE({ ...e, statut: String(j.statut || e.statut), motif: String(j.motif || e.motif) });
    setConfirmer(null);
    setMessage(`Fiche passée en ${j.statut}${j.retenu ? `, scénario retenu : ${j.retenu}` : ''}.`);
    setEnvoi(false);
    onChange?.();
  };
  const enregistrerLien = async (sc: Scenario) => {
    setEnvoi(true);
    setErreur('');
    setMessage('');
    const { ok, j } = await poster({ id: ficheId, action: 'lien', scenarioId: sc.id, lien: (liens[sc.id] || '').trim() });
    if (!ok) setErreur(j?.error || 'Le lien n’a pas été enregistré.');
    else {
      setE({ ...e, scenarios: j.scenarios as Scenario[] });
      prendreScenarios(j.scenarios as Scenario[]);
      setMessage(`Lien du devis enregistré pour ${sc.nom}.`);
    }
    setEnvoi(false);
  };

  return (
    <Carte accent className="space-y-3">
      <TitreCarte icon={Send}>Suite de la vente</TitreCarte>
      <p className="text-[14px]">Statut actuel : <strong>{e.statut || '–'}</strong>{e.motif && s.includes('perdu') ? ` (${e.motif})` : ''}.</p>
      {aVisiter && <p className="text-[14px]">Le relevé d’abord : la suite de la vente s’ouvre quand la fiche passe en devis à faire.</p>}
      {close && <p className="text-[14px]">Vente close.</p>}

      {!aVisiter && !close && aTrancher.length > 0 && (
        <div className="space-y-3 rounded-[16px] bg-white p-4 ring-[1.5px] ring-[#dfe3e8]">
          <p className="flex items-center gap-2 text-[15px] font-bold" style={{ color: LABEL }}><Link2 size={18} /> Devis des scénarios</p>
          <p className="text-[13px]">Le lien se remplit tout seul au passage en 📩 devis envoyé, avec le devis finalisé qui porte le nom donné par le brief. Colle-le ici seulement si le site ne le trouve pas.</p>
          {aTrancher.map((sc) => {
            const modifie = (liens[sc.id] || '').trim() !== (sc.lien || '');
            return (
              <div key={sc.id} className="space-y-2">
                <label className={ETIQUETTE} htmlFor={`lien-${sc.id}`}>{sc.nom}</label>
                <input id={`lien-${sc.id}`} type="url" inputMode="url" className={CHAMP} value={liens[sc.id] || ''} onChange={(ev) => setLiens({ ...liens, [sc.id]: ev.target.value })} placeholder="https://…" />
                {modifie && <BoutonSecondaire compact onClick={() => enregistrerLien(sc)} disabled={envoi}><Check size={18} /> Enregistrer le lien</BoutonSecondaire>}
                {!modifie && sc.lien && <p className="ml-1 text-[13px] font-semibold" style={{ color: '#16a34a' }}>Lien enregistré.</p>}
              </div>
            );
          })}
        </div>
      )}

      {erreur && <Alerte>{erreur}</Alerte>}
      {message && <p className="flex items-center gap-1.5 px-1 text-[14px] font-semibold" style={{ color: '#16a34a' }}><Check size={16} /> {message}</p>}

      {!aVisiter && !close && !confirmer && (
        <div className="space-y-2 pt-1">
          {!envoye && !nego && (
            <BoutonPrincipal type="button" onClick={() => passer('envoye')} disabled={envoi} inactif={envoi}>
              <Send size={20} /> 📩 Devis envoyé
            </BoutonPrincipal>
          )}
          {envoye && <BoutonSecondaire compact onClick={() => passer('negociation')} disabled={envoi}><Flame size={18} /> En négociation</BoutonSecondaire>}
          {(envoye || nego) && (
            <>
              <BoutonPrincipal type="button" onClick={() => setConfirmer('gagne')} disabled={envoi} inactif={envoi}><Trophy size={20} /> Gagné</BoutonPrincipal>
              <BoutonSecondaire compact onClick={() => setConfirmer('perdu')} disabled={envoi}><XCircle size={18} /> Perdu</BoutonSecondaire>
            </>
          )}
          {!envoye && !nego && <p className="px-1 text-[12px] text-slate-500">Le devis part encore à la main : ce bouton dit qu’il est envoyé et lance la relance J+3.</p>}
        </div>
      )}

      {confirmer === 'gagne' && (
        <CadreConfirmation>
          <p className="text-[15px] font-semibold leading-relaxed">Projet gagné ? L’acompte, le chantier, la commande et le dossier ADVENIR partent du scénario retenu.</p>
          {aTrancher.length > 0 && avecLien.length === 0 && <Alerte>Colle d’abord le lien du devis du scénario retenu, dans « Devis des scénarios ».</Alerte>}
          {avecLien.length > 1 && (
            <div className="space-y-2">
              <p className={ETIQUETTE}>Scénario retenu</p>
              <div className="flex flex-wrap gap-2">
                {avecLien.map((x) => <Pastille key={x.id} actif={retenuEffectif === x.id} onClick={() => setRetenu(x.id)}>{x.nom}</Pastille>)}
              </div>
            </div>
          )}
          {avecLien.length === 1 && <p className="text-[14px]">Scénario retenu : <strong>{avecLien[0].nom}</strong>.</p>}
          {(() => {
            const bloque = envoi || (aTrancher.length > 0 && !retenuEffectif);
            return <BoutonPrincipal type="button" onClick={() => passer('gagne')} disabled={bloque} inactif={bloque}><Trophy size={20} /> {envoi ? 'Envoi…' : 'Confirmer : gagné'}</BoutonPrincipal>;
          })()}
          <BoutonSecondaire compact onClick={() => setConfirmer(null)} disabled={envoi}>Annuler</BoutonSecondaire>
        </CadreConfirmation>
      )}

      {confirmer === 'perdu' && (
        <CadreConfirmation>
          <p className={ETIQUETTE}>Motif du refus</p>
          <div className="flex flex-wrap gap-2">
            {e.motifs.map((m) => <Pastille key={m} actif={motif === m} onClick={() => setMotif(m)}>{m}</Pastille>)}
          </div>
          <p className="text-[13px]">Le relevé calé sort de l’agenda Google, la fiche passe dans Perdues.</p>
          <BoutonPrincipal type="button" onClick={() => passer('perdu')} disabled={envoi || !motif} inactif={envoi || !motif}><XCircle size={20} /> {envoi ? 'Envoi…' : 'Confirmer : perdu'}</BoutonPrincipal>
          <BoutonSecondaire compact onClick={() => { setConfirmer(null); setMotif(''); }} disabled={envoi}>Annuler</BoutonSecondaire>
        </CadreConfirmation>
      )}
    </Carte>
  );
}
