"use client";

// Écran facture (maquette MAQUETTE_ECRAN-FACTURE_2026-10-18.png validée par Matthieu le 18/10/2026, 18 h 19).
// Dans la fiche générique /fiche/<id> d'une tâche de Factures Clients : type, statut et montant en gros,
// dates utiles, parcours À émettre · Émise · Relances · Payée, alerte en encadré orange, prochaine étape (à émettre :
// saisie du n° de facture, du montant et du paiement dû puis « Marquer comme émise », back-office et direction),
// relances J+3 / J+10 / J+15 datées, liens vers le chantier et les autres factures du même devis.
// 18/10, 18 h 57 : à l'ouverture d'une facture à émettre sans n°, l'écran demande au site de la retrouver dans
// Costructor (src/lib/factureAuto.ts) ; trouvée, la fiche se recharge déjà émise. Rien ne change à l'affichage sinon.
// 18/10, 19 h 21 (maquette MAQUETTE_FACTURE-BOUTONS validée par Matthieu) : étape 2 « Rien à recopier… », saisie à la
// main en secours ; dans Relances, « J'ai relancé le client » et « Marquer comme payée » (avec confirmation).
import { useEffect, useState } from 'react';
import { Check, ChevronRight, Euro, ExternalLink, Link2, Bell, RefreshCw } from 'lucide-react';
import { Carte, TitreCarte, BoutonPrincipal, CHAMP } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';
import type { Facture } from '@/lib/factureFiche';
import { adresses } from '@/lib/adresses';

const COULEUR_TYPE: Record<string, string> = { acompte: CYAN, solde: '#7c3aed', situation: '#FF6B00' };
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const euros = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ETAPES = ['À émettre', 'Émise', 'Relances', 'Payée'];

function Pastille({ couleur, children }: { couleur: string; children: React.ReactNode }) {
  return <span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white" style={{ backgroundColor: couleur }}>{children}</span>;
}

function Ligne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[14px]">
      <span className="text-slate-500">{libelle}</span>
      <span className="text-right font-bold">{valeur}</span>
    </div>
  );
}

function Parcours({ etat }: { etat: Facture['etat'] }) {
  // Étape en cours : 0 à émettre, 2 émise / partielle / litige (relances), 4 = tout est fait (payée)
  const courante = etat === 'a_emettre' ? 0 : etat === 'payee' || etat === 'fermee' ? 4 : 2;
  return (
    <div className="mt-4 flex items-start">
      {ETAPES.map((e, i) => {
        const fait = i < courante;
        const ici = i === courante;
        const rouge = ici && etat === 'litige';
        const fond = fait ? '#16a34a' : rouge ? '#e5484d' : ici ? CYAN : '#e2e8f0';
        return (
          <div key={e} className="relative flex flex-1 flex-col items-center">
            {i > 0 && <span className="absolute right-1/2 top-[11px] h-[2px] w-full bg-[#e2e8f0]" />}
            <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ backgroundColor: fond }}>
              {fait ? <Check size={14} /> : i + 1}
            </span>
            <span className={`mt-1 text-center text-[11px] font-bold ${fait ? 'text-[#16a34a]' : ici ? '' : 'text-slate-400'}`}>{rouge ? 'En litige' : e}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function FicheFacture({ id, facture: f, peutEcrire, onEmise }: { id: string; facture: Facture; peutEcrire: boolean; onEmise: () => void }) {
  const [numero, setNumero] = useState('');
  const [montant, setMontant] = useState('');
  const [echeance, setEcheance] = useState(f.paiementDuIso);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [suivi, setSuivi] = useState<'relance' | 'payee' | null>(null);
  const [erreurSuivi, setErreurSuivi] = useState<string | null>(null);

  const t = normal(f.type);
  const couleurType = COULEUR_TYPE[t.split(' ')[0]] || '#64748b';
  const article = t.startsWith('acompte') ? "l'acompte" : t.startsWith('solde') ? 'le solde' : t.startsWith('situation') ? 'la situation' : 'la facture';
  const precision = t.startsWith('solde') ? " (total du devis moins l'acompte et les situations)" : t.startsWith('acompte') ? ' (montant selon les conditions du devis)' : '';
  const ouverte = f.etat === 'emise' || f.etat === 'partielle';
  const prochaine = f.relances.find((r) => r.etat === 'prochaine');

  // Facture à émettre sans n° : on regarde si elle existe déjà dans Costructor (une fois par ouverture)
  useEffect(() => {
    if (!peutEcrire || f.etat !== 'a_emettre' || f.numero) return;
    let fini = false;
    fetch('/api/interne/facture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'retrouver' }) })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => { if (!fini && String(d?.action || '').startsWith('associee')) onEmise(); })
      .catch(() => {});
    return () => { fini = true; };
  }, [id, peutEcrire, f.etat, f.numero]);

  // « J'ai relancé le client » / « Marquer comme payée »
  const suivre = async (action: 'relance' | 'payee') => {
    if (suivi) return;
    if (action === 'payee' && !window.confirm('Le règlement intégral est-il bien confirmé dans Costructor ?')) return;
    setErreurSuivi(null);
    setSuivi(action);
    try {
      const res = await fetch('/api/interne/facture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) { setErreurSuivi(data?.error || `Enregistrement impossible (${res.status})`); return; }
      onEmise();
    } catch {
      setErreurSuivi('Impossible de joindre le serveur. Rien n’a changé.');
    } finally {
      setSuivi(null);
    }
  };
  const suivante = f.relancesEnvoyees + 1;

  const emettre = async () => {
    if (envoi) return;
    setErreur(null);
    if (!numero.trim() || !montant.trim() || !echeance) { setErreur('Remplis le n° de facture, le montant HT et la date de paiement.'); return; }
    setEnvoi(true);
    try {
      const res = await fetch('/api/interne/facture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, numero, montant, echeance }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) { setErreur(data?.error || `Enregistrement impossible (${res.status})`); return; }
      onEmise();
    } catch {
      setErreur('Impossible de joindre le serveur. Rien n’a changé.');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <>
      {/* En haut : type, statut, montant, dates, parcours */}
      <div className="rounded-[20px] bg-white p-5 ring-[1.5px] ring-[#dfe3e8]">
        <div className="flex flex-wrap items-center gap-2">
          {f.type && <Pastille couleur={couleurType}>{f.type}</Pastille>}
          <Pastille couleur={f.couleurStatut || '#87909e'}>{f.statut}</Pastille>
          {f.joursRetard > 0 && <Pastille couleur="#e5484d">En retard {f.joursRetard} j</Pastille>}
        </div>
        {f.montant !== null && f.montant > 0
          ? <p className="mt-3 text-[34px] font-bold leading-none tracking-[-0.02em]">{euros(f.montant)} € <span className="text-[16px] text-slate-500">HT</span></p>
          : <p className="mt-3 text-[18px] font-bold text-slate-400">Montant à saisir après émission</p>}
        <div className="mt-3 space-y-1.5">
          {f.client && <Ligne libelle="Client" valeur={f.client} />}
          {f.etat === 'a_emettre' && f.rappel && <Ligne libelle="Rappel pour émettre" valeur={f.rappel} />}
          {f.etat !== 'a_emettre' && f.paiementDu && <Ligne libelle="Paiement dû le" valeur={f.paiementDu} />}
          {ouverte && prochaine && <Ligne libelle="Prochaine relance" valeur={`${prochaine.date} (J+${prochaine.palier})`} />}
        </div>
        {f.etat !== 'annulee' && <Parcours etat={f.etat} />}
      </div>

      {f.alerte && (
        <div className="rounded-[16px] px-4 py-3 text-[14px] leading-snug ring-[1.5px] ring-[#fdba74]" style={{ backgroundColor: '#fff7ed', color: '#9a3412' }}>
          <p><b style={{ color: '#7c2d12' }}>À faire :</b> {f.alerte.texte}</p>
          {f.alerte.aussi && <p className="mt-1"><b style={{ color: '#7c2d12' }}>Aussi :</b> {f.alerte.aussi}</p>}
        </div>
      )}

      {/* Prochaine étape : émettre */}
      {f.etat === 'a_emettre' && (
        <Carte className="space-y-3">
          <TitreCarte icon={Euro}>Prochaine étape</TitreCarte>
          <p className="flex gap-3 text-[15px]"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ring-[1.5px]" style={{ color: CYAN, boxShadow: `inset 0 0 0 1.5px ${CYAN}` }}>1</span>Émettre {article} dans Costructor{precision}.</p>
          {f.lienCostructor && (
            <a href={f.lienCostructor} target="_blank" rel="noopener noreferrer" className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold ring-[1.5px]" style={{ color: CYAN, boxShadow: `inset 0 0 0 1.5px ${CYAN}` }}>
              Ouvrir le client dans Costructor <ExternalLink size={15} />
            </a>
          )}
          {peutEcrire ? (
            <>
              <p className="flex gap-3 text-[15px]"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ color: CYAN, boxShadow: `inset 0 0 0 1.5px ${CYAN}` }}>2</span>Rien à recopier : dès qu'elle est finalisée dans Costructor, la facture se reporte ici toute seule (à l'ouverture de cet écran et chaque matin), puis passe en émise.</p>
              <p className="pl-9 text-[14px] text-slate-600">Pas encore remontée ? Saisis-la à la main :</p>
              <label className="block">
                <span className="ml-1 text-[12px] font-bold text-slate-500">N° facture Costructor</span>
                <input className={`${CHAMP} mt-1`} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="ex. F202600012" autoCapitalize="characters" />
              </label>
              <label className="block">
                <span className="ml-1 text-[12px] font-bold text-slate-500">Montant HT (€)</span>
                <input className={`${CHAMP} mt-1`} value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="0,00" inputMode="decimal" />
              </label>
              <label className="block">
                <span className="ml-1 text-[12px] font-bold text-slate-500">Paiement dû le</span>
                <input type="date" className={`${CHAMP} mt-1`} value={echeance} onChange={(e) => setEcheance(e.target.value)} />
              </label>
              {erreur && <p className="text-[14px] font-bold text-red-600">{erreur}</p>}
              <BoutonPrincipal onClick={emettre} disabled={envoi} inactif={envoi}>
                {envoi ? <><RefreshCw size={18} className="animate-spin" /> Enregistrement…</> : 'Marquer comme émise'}
              </BoutonPrincipal>
              <p className="text-[13px] text-slate-600">Les rappels de relance J+3, J+10 et J+15 se programment tout seuls.</p>
            </>
          ) : (
            <p className="text-[14px] text-slate-600">Le back-office reporte ensuite ici le n° de facture, le montant et la date de paiement.</p>
          )}
        </Carte>
      )}

      {/* Relances */}
      {f.relances.length > 0 && (
        <Carte className="space-y-2.5">
          <TitreCarte icon={Bell} extra={<span className="text-[14px] font-bold">{Math.min(f.relancesEnvoyees, 3)}/3</span>}>Relances</TitreCarte>
          {f.etat === 'litige' && <p className="text-[14px] font-bold text-[#e5484d]">En litige : relances suspendues.</p>}
          {f.relances.map((r) => (
            <div key={r.palier} className="flex items-center gap-3 text-[14px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.etat === 'faite' ? '#16a34a' : r.etat === 'prochaine' ? CYAN : '#e2e8f0' }} />
              <span className={r.etat === 'a_venir' ? 'text-slate-500' : 'font-semibold'}>
                J+{r.palier} · {r.etat === 'faite' ? 'relance faite' : r.etat === 'prochaine' ? `${r.libelle.toLowerCase().startsWith('dern') ? 'dernière relance' : 'prochaine relance'}` : r.libelle.toLowerCase()}
              </span>
              <span className="ml-auto shrink-0 text-[12px] text-slate-500">{r.date}</span>
            </div>
          ))}
          <p className="pt-1 text-[13px] leading-snug text-slate-600">
            Chaque relance est un rappel pour l’équipe : le client n’est jamais relancé automatiquement. Le matin de la relance, le règlement est revérifié dans Costructor.
          </p>
          {peutEcrire && (ouverte || f.etat === 'litige') && (
            <div className="space-y-2.5 pt-1">
              {ouverte && f.relancesEnvoyees < 3 && (
                <button onClick={() => suivre('relance')} disabled={!!suivi} className="flex min-h-[52px] w-full flex-col items-center justify-center rounded-full px-6 py-2 text-white transition-transform active:scale-95" style={{ backgroundColor: CYAN }}>
                  <span className="flex items-center gap-2 text-[15px] font-semibold">{suivi === 'relance' && <RefreshCw size={16} className="animate-spin" />}J'ai relancé le client</span>
                  <span className="text-[12px] opacity-85">{suivante >= 3 ? 'note la dernière relance, le dossier passe au back-office' : `note la relance ${suivante} et programme la suivante`}</span>
                </button>
              )}
              <button onClick={() => suivre('payee')} disabled={!!suivi} className="flex min-h-[52px] w-full flex-col items-center justify-center rounded-full bg-white px-6 py-2 transition-transform active:scale-95" style={{ color: '#16a34a', boxShadow: 'inset 0 0 0 1.5px #16a34a' }}>
                <span className="flex items-center gap-2 text-[15px] font-semibold">{suivi === 'payee' && <RefreshCw size={16} className="animate-spin" />}Marquer comme payée</span>
                <span className="text-[12px]">après vérification du règlement dans Costructor</span>
              </button>
              {erreurSuivi && <p className="text-[14px] font-bold text-red-600">{erreurSuivi}</p>}
            </div>
          )}
        </Carte>
      )}

      {f.etat === 'payee' && (
        <Carte accent><p className="text-[15px] font-semibold">✅ Facture payée{t.startsWith('acompte') ? ' : le chantier a son acompte confirmé.' : '.'}</p></Carte>
      )}

      {/* Liens */}
      {(f.affaires.length > 0 || f.autres.length > 0 || (f.etat !== 'a_emettre' && f.lienCostructor)) && (
        <Carte className="space-y-2.5">
          <TitreCarte icon={Link2}>Liens</TitreCarte>
          {f.affaires.map((a) => (
            <a key={a.id} href={adresses.fiche(a.id)} className="flex items-center justify-between gap-3 rounded-[14px] bg-white p-3 ring-[1.5px] ring-[#dfe3e8]">
              <span className="min-w-0"><span className="block truncate text-[15px] font-bold">{a.nom.replace(/^\s*test\s*·\s*/i, '') || 'Chantier'}</span><span className="text-[12px] text-slate-500">Fiche du chantier</span></span>
              <ChevronRight size={18} className="shrink-0" color={CYAN} />
            </a>
          ))}
          {f.autres.map((a) => (
            <a key={a.id} href={adresses.fiche(a.id)} className="flex items-center justify-between gap-3 rounded-[14px] bg-white p-3 ring-[1.5px] ring-[#dfe3e8]">
              <span className="min-w-0"><span className="block truncate text-[15px] font-bold">{a.nom}</span><span className="text-[12px] text-slate-500">{a.statut}</span></span>
              <ChevronRight size={18} className="shrink-0" color={CYAN} />
            </a>
          ))}
          {f.etat !== 'a_emettre' && f.lienCostructor && (
            <a href={f.lienCostructor} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-[14px] bg-white p-3 ring-[1.5px] ring-[#dfe3e8]">
              <span className="min-w-0"><span className="block truncate text-[15px] font-bold">{f.numero ? `Facture ${f.numero}` : 'Client'}</span><span className="text-[12px] text-slate-500">Dans Costructor</span></span>
              <ExternalLink size={16} className="shrink-0" color={CYAN} />
            </a>
          )}
        </Carte>
      )}
    </>
  );
}
