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
// 06/11/2026 (Phase 9, lot 3 ; décisions de Mathieu à 18 h 30, 18 h 34 et 21 h 16) : le bouton « 📩 Devis envoyé »
// devient « ✉️ Envoyer le devis » (« Envoyer les devis » avec plusieurs scénarios). Il ouvre ici le mail « Devis · envoi »
// déjà rempli avec Costructor, brochure projet jointe (src/components/ui/EcrireMail.tsx). La fiche passe en 📩 devis
// envoyé seulement quand le mail part (route /api/interne/mail), plus jamais sans lui.
// 06/11/2026 (suite du lot 3, même règle : le bon mail au bon moment, décision du 05/11 à 21 h 56) : au gagné, après le
// choix du scénario retenu, le bouton « Écrire le mail « Devis validé » » ouvre le mail de remerciement rempli avec le
// devis retenu (acompte, Advenir, suite). La fiche passe en 🏆 gagné dès que ce mail est parti ; si le passage échoue
// après l'envoi, un bouton « Réessayer » le relance sans renvoyer le mail. Le scénario retenu ne change plus pendant
// l'écriture.
// 06/11/2026 (lot 4, accord de Mathieu à 22 h 34) : même chose au perdu. Après le choix du motif, « Écrire le mail
// « Refus du client » » ouvre le mail rempli selon le motif ; la fiche passe en ❌ perdu dès qu'il est parti. Motif prix :
// rappel de tenter d'abord une version optimisée du devis (compétence Suivi et négociation, section 5).
// 06/11/2026 (lot 4, accord de Mathieu à 22 h 42) : en devis envoyé ou en négociation, « ✉️ Envoyer le devis révisé »
// ouvre le mail « Devis · révisé » (nouveau devis Costructor) ; une fois parti, les relances repartent de zéro.
import { useEffect, useState } from 'react';
import { Check, Flame, Link2, Mail, RefreshCw, Send, Trophy, XCircle } from 'lucide-react';
import { Carte, TitreCarte, Alerte, BoutonPrincipal, BoutonSecondaire, PastilleChoix as Pastille, CadreConfirmation, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { LABEL, ORANGE } from '@/components/charte/couleurs';
import EcrireMail from '@/components/ui/EcrireMail';

type Scenario = { id: string; nom: string; statut: string; lien: string; retenu: boolean };
type Etat = {
  statut: string; zone: string; zones: string[]; places: number | null; siret: string; permis: string;
  motif: string; motifs: string[]; manquants: string[]; lienFiche?: string; scenarios?: Scenario[];
};
const URL = '/api/interne/vente';
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// Après l'envoi des devis : le temps de lire l'écran de fin avant que la fiche se relise
const RELECTURE_APRES_ENVOI_MS = 5000;
const MAIL_VALIDE_PARTI = 'Mail « Devis validé » envoyé. ';
const MAIL_REFUS_PARTI = 'Mail « Refus du client » envoyé. ';

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
  // Mail des devis ouvert dans la carte : envoi (lot 3) en devis à faire, devis révisé (lot 4) ensuite
  const [ecrire, setEcrire] = useState(false);
  // Mail de fin de vente (« Devis · validé » au gagné, « Refus du client » au perdu) ouvert dans la confirmation, puis parti
  const [ecrireFin, setEcrireFin] = useState(false);
  const [finParti, setFinParti] = useState(false);

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
  // Nom du scénario retenu, pour le mail « Devis · validé » (il ne garde que le devis de ce scénario)
  const nomRetenu = avecLien.find((x) => x.id === retenuEffectif)?.nom || scenarios.find((x) => x.retenu)?.nom || '';
  const libelleEnvoi = aTrancher.length > 1 ? '✉️ Envoyer les devis' : '✉️ Envoyer le devis';
  const motifPrix = normal(motif).includes('cher') || normal(motif).includes('budget');
  const relire = () => { setTimeout(() => onChange?.(), RELECTURE_APRES_ENVOI_MS); };

  const fermerConfirmation = () => {
    setConfirmer(null);
    setMotif('');
    setEcrireFin(false);
    setFinParti(false);
  };
  const passer = async (statut: 'envoye' | 'negociation' | 'gagne' | 'perdu', avant = '') => {
    setEnvoi(true);
    setErreur('');
    setMessage('');
    const { ok, j } = await poster({ id: ficheId, action: 'statut', statut, motif, retenu: statut === 'gagne' ? retenuEffectif : undefined });
    if (!ok) {
      setErreur(`${avant}${j?.error || 'Le statut n’a pas changé.'}`);
      setEnvoi(false);
      return;
    }
    setE({ ...e, statut: String(j.statut || e.statut), motif: String(j.motif || e.motif) });
    setConfirmer(null);
    setEcrireFin(false);
    setFinParti(false);
    setMessage(`${avant}Fiche passée en ${j.statut}${j.retenu ? `, scénario retenu : ${j.retenu}` : ''}${j.motif ? `, motif ${j.motif}` : ''}.`);
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
  // Mail de fin de vente ouvert dans la confirmation : le statut change dès qu'il est parti (bouton Réessayer sinon)
  const mailDeFin = (statut: 'gagne' | 'perdu') => {
    const cle = statut === 'gagne' ? 'devis-valide' : 'devis-refus';
    const avant = statut === 'gagne' ? MAIL_VALIDE_PARTI : MAIL_REFUS_PARTI;
    return (
      <>
        <EcrireMail
          key={statut === 'gagne' ? retenuEffectif || 'seul' : motif}
          ficheId={ficheId}
          modele={cle}
          fixe
          complements={statut === 'gagne' ? { retenu: nomRetenu } : { motif }}
          onEnvoye={() => { setFinParti(true); passer(statut, avant); }}
        />
        {!finParti && <BoutonSecondaire compact onClick={() => setEcrireFin(false)} disabled={envoi}>Fermer le mail sans l’envoyer</BoutonSecondaire>}
        {finParti && erreur && (
          <BoutonPrincipal type="button" onClick={() => passer(statut, avant)} disabled={envoi} inactif={envoi}>
            {envoi ? <RefreshCw size={20} className="animate-spin" /> : statut === 'gagne' ? <Trophy size={20} /> : <XCircle size={20} />}
            {statut === 'gagne' ? ' Réessayer : passer en gagné' : ' Réessayer : passer en perdu'}
          </BoutonPrincipal>
        )}
      </>
    );
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
          {!envoye && !nego && !ecrire && (
            <>
              <BoutonPrincipal type="button" onClick={() => setEcrire(true)} disabled={envoi} inactif={envoi}>
                <Mail size={20} /> {libelleEnvoi}
              </BoutonPrincipal>
              <p className="px-1 text-[12px] text-slate-500">Ouvre le mail déjà rempli avec Costructor et la brochure projet jointe. La fiche passe en 📩 devis envoyé dès qu’il est parti, et la relance J+3 est lancée.</p>
            </>
          )}
          {ecrire && (
            <>
              <EcrireMail ficheId={ficheId} modele={envoye || nego ? 'devis-revise' : 'devis-envoi'} fixe onEnvoye={relire} />
              <BoutonSecondaire compact onClick={() => setEcrire(false)}>Fermer le mail sans l’envoyer</BoutonSecondaire>
            </>
          )}
          {(envoye || nego) && !ecrire && (
            <>
              {envoye && <BoutonSecondaire compact onClick={() => passer('negociation')} disabled={envoi}><Flame size={18} /> En négociation</BoutonSecondaire>}
              <BoutonPrincipal type="button" onClick={() => setConfirmer('gagne')} disabled={envoi} inactif={envoi}><Trophy size={20} /> Gagné</BoutonPrincipal>
              <BoutonSecondaire compact onClick={() => setConfirmer('perdu')} disabled={envoi}><XCircle size={18} /> Perdu</BoutonSecondaire>
              <BoutonSecondaire compact onClick={() => setEcrire(true)} disabled={envoi}><Mail size={18} /> ✉️ Envoyer le devis révisé</BoutonSecondaire>
              <p className="px-1 text-[12px] text-slate-500">Devis révisé : monte d&apos;abord la nouvelle version dans Costructor (finalisée, l&apos;ancienne archivée). Une fois le mail parti, les relances repartent de zéro.</p>
            </>
          )}
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
                {avecLien.map((x) => <Pastille key={x.id} actif={retenuEffectif === x.id} onClick={() => { if (!ecrireFin) setRetenu(x.id); }}>{x.nom}</Pastille>)}
              </div>
            </div>
          )}
          {avecLien.length === 1 && <p className="text-[14px]">Scénario retenu : <strong>{avecLien[0].nom}</strong>.</p>}
          {(() => {
            const bloque = envoi || (aTrancher.length > 0 && !retenuEffectif);
            if (ecrireFin) return mailDeFin('gagne');
            return (
              <>
                <BoutonPrincipal type="button" onClick={() => setEcrireFin(true)} disabled={bloque} inactif={bloque}><Mail size={20} /> Écrire le mail « Devis validé »</BoutonPrincipal>
                <p className="px-1 text-[12px] text-slate-500">Le mail de remerciement reprend le devis du scénario retenu (acompte, Advenir, suite). Le projet passe en 🏆 gagné dès qu’il est parti.</p>
                <BoutonSecondaire compact onClick={fermerConfirmation} disabled={envoi}>Annuler</BoutonSecondaire>
              </>
            );
          })()}
        </CadreConfirmation>
      )}

      {confirmer === 'perdu' && (
        <CadreConfirmation>
          <p className={ETIQUETTE}>Motif du refus</p>
          <div className="flex flex-wrap gap-2">
            {e.motifs.map((m) => <Pastille key={m} actif={motif === m} onClick={() => { if (!ecrireFin) setMotif(m); }}>{m}</Pastille>)}
          </div>
          {motifPrix && !ecrireFin && (
            <p className="text-[13px] font-semibold" style={{ color: ORANGE }}>Motif prix : une version optimisée du devis peut-elle le faire changer d&apos;avis ? Si oui, monte-la et envoie-la avec « Envoyer le devis révisé » plutôt que d&apos;écrire ce mail.</p>
          )}
          <p className="text-[13px]">Le relevé calé sort de l’agenda Google, la fiche passe dans Perdues.</p>
          {ecrireFin ? mailDeFin('perdu') : (
            <>
              <BoutonPrincipal type="button" onClick={() => setEcrireFin(true)} disabled={envoi || !motif} inactif={envoi || !motif}><Mail size={20} /> Écrire le mail « Refus du client »</BoutonPrincipal>
              <p className="px-1 text-[12px] text-slate-500">Le mail remercie le client, avec une phrase selon le motif. La fiche passe en ❌ perdu dès qu’il est parti.</p>
              <BoutonSecondaire compact onClick={fermerConfirmation} disabled={envoi}>Annuler</BoutonSecondaire>
            </>
          )}
        </CadreConfirmation>
      )}
    </Carte>
  );
}
