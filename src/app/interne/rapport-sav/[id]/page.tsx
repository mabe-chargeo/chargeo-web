"use client";

// Rapport d'intervention SAV signé au doigt (maquette MAQUETTE_RAPPORT-SAV_2026-10-18.png validée par Matthieu le
// 18/10/2026 à 22 h 15). Même logique que le PV de réception : le technicien remplit sur place (constat, cause, travaux,
// pièces, essai de charge, prise en charge, résultat), fait signer le client puis signe, et l'appli crée le PDF à la
// charte dans 📄 Rapport d'intervention du ticket. « Problème résolu » ferme le ticket (l'installation repasse en
// service au Parc), « Pièce à commander » le met en attente pièce, « À revenir » le laisse ouvert.
// Envoi par la file hors ligne (src/lib/fileEnvoi.ts) : sans réseau, le rapport signé attend sur le téléphone.
// 19/10/2026, 8 h 35 (passe de cohérence validée sur maquette) : bloc 📇 Contact commun de l'installation sous « Le
// ticket », bouton Retour et fil d'Ariane de l'en-tête commun (SAV, ou Mes interventions pour l'installateur).
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Check, CloudOff, FileText, MapPin, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, GRIS, NAVY, ORANGE } from '@/components/charte/couleurs';
import PadSignature from '@/components/interne/PadSignature';
import { BlocContact } from '@/components/ui/BlocContact';
import { useRoleAppli } from '@/components/charte/roleAppli';
import { ajouter, envoyerTout, lister, nouvelleCle, oublier, reprendre } from '@/lib/fileEnvoi';

type Ticket = {
  id: string; nom: string; statut: string; installation: { id: string; nom: string } | null; adresse: string; demande: string;
  severite: string; panne: string; pdc: string; signaleLe: string; intervention: string; techniciens: string[];
  causeProposee: string; rapports: string[]; ferme: boolean; ecritureAutorisee: boolean;
};
type Resultat = 'resolu' | 'piece' | 'revenir';
type Piece = { designation: string; quantite: string };

const ROUTE = '/api/interne/rapport-sav';
const VERT = '#12a594';

function Choix({ options, valeur, onChange, couleurs }: { options: { cle: string; libelle: string }[]; valeur: string; onChange: (v: string) => void; couleurs?: Record<string, string> }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-2">
      {options.map((o) => {
        const actif = valeur === o.cle;
        return (
          <button key={o.cle} type="button" onClick={() => onChange(o.cle)} className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={actif ? { backgroundColor: couleurs?.[o.cle] || CYAN } : undefined}>
            {o.libelle}
          </button>
        );
      })}
    </div>
  );
}

function Etape({ n, titre }: { n: number; titre: string }) {
  return (
    <p className={`${ETIQUETTE} flex items-center gap-2`}>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: CYAN }}>{n}</span>
      {titre}
    </p>
  );
}

export default function RapportSavPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const { role } = useRoleAppli();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [causes, setCauses] = useState<string[]>([]);
  const [prises, setPrises] = useState<string[]>([]);
  const [resultats, setResultats] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [constat, setConstat] = useState('');
  const [cause, setCause] = useState('');
  const [travaux, setTravaux] = useState('');
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [aucunePiece, setAucunePiece] = useState(false);
  const [essai, setEssai] = useState('');
  const [prise, setPrise] = useState('');
  const [resultat, setResultat] = useState<Resultat | ''>('');
  const [signataire, setSignataire] = useState('');
  const [sigClient, setSigClient] = useState<string | null>(null);
  const [technicien, setTechnicien] = useState('');
  const [sigTech, setSigTech] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<'aucun' | 'encours' | 'fait' | 'attente' | 'echec'>('aucun');
  const [message, setMessage] = useState<string | null>(null);

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`${ROUTE}?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
      else {
        setTicket(data.ticket);
        setCauses(data.causes || []);
        setPrises(data.prisesEnCharge || []);
        setResultats(data.resultats || {});
        setPreview(!!data.preview);
        setCause((c) => c || String(data.ticket?.causeProposee || ''));
        setTechnicien((t) => t || String(data.technicienParDefaut || ''));
      }
    } catch {
      setErreur('Pas de réseau : ouvre le rapport quand le réseau revient, la signature peut ensuite partir hors ligne.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    charger();
    (async () => { await reprendre().catch(() => null); await envoyerTout().catch(() => 0); })();
  }, [id]);

  const piecesValides = pieces.filter((p) => p.designation.trim().length > 0);
  const changerPiece = (i: number, champ: keyof Piece, v: string) => setPieces(pieces.map((p, k) => (k === i ? { ...p, [champ]: v } : p)));

  const signer = async () => {
    if (!ticket || !resultat) return;
    const cle = nouvelleCle();
    setEnvoi('encours');
    setMessage(null);
    try {
      await ajouter({
        cle, chantierId: id, chantierNom: ticket.nom, elementId: id, elementNom: 'Rapport d’intervention', type: 'saisie', route: ROUTE,
        donnees: {
          constat, cause, travaux, pieces: JSON.stringify(aucunePiece ? [] : piecesValides), essai, priseEnCharge: prise, resultat,
          signataire, technicien, signatureClient: sigClient || '', signatureTechnicien: sigTech || '',
        },
      });
      await envoyerTout().catch(() => 0);
      const reste = (await lister()).find((e) => e.cle === cle);
      if (!reste) {
        setEnvoi('fait');
        setMessage(resultat === 'resolu'
          ? 'Rapport signé et créé. Ticket passé en problème résolu : l’installation repasse en service au Parc.'
          : resultat === 'piece'
            ? 'Rapport signé et créé. Ticket en attente pièce, l’équipe est prévenue de la pièce à commander.'
            : 'Rapport signé et créé. Le ticket reste ouvert : le dépannage est à recaler.');
      } else if (reste.etat === 'echec' && !/réseau/i.test(reste.erreur || '')) {
        await oublier(cle).catch(() => null);
        setEnvoi('echec');
        setMessage(reste.erreur || 'Rapport refusé');
      } else {
        setEnvoi('attente');
        setMessage('Pas de réseau : le rapport signé est gardé sur le téléphone et partira tout seul au retour du réseau.');
      }
    } catch {
      setEnvoi('echec');
      setMessage('Le téléphone refuse d’enregistrer : libère de la place et réessaie.');
    }
  };

  const manque: string[] = [];
  if (constat.trim().length < 3) manque.push('constat');
  if (!cause) manque.push('cause');
  if (travaux.trim().length < 3) manque.push('travaux');
  if (!aucunePiece && !piecesValides.length) manque.push('pièces (ou « Aucune pièce »)');
  if (!essai) manque.push('essai de charge');
  if (!prise) manque.push('prise en charge');
  if (!resultat) manque.push('résultat');
  if (resultat === 'resolu' && essai === 'pas-ok') manque.push('essai OK pour un problème résolu');
  if (resultat === 'piece' && (aucunePiece || !piecesValides.length)) manque.push('pièce à commander');
  if (signataire.trim().length < 2) manque.push('nom du client');
  if (!sigClient) manque.push('signature du client');
  if (technicien.trim().length < 2) manque.push('nom du technicien');
  if (!sigTech) manque.push('signature du technicien');
  const bloque = !ticket?.ecritureAutorisee || !!ticket?.ferme;
  const inactif = bloque || manque.length > 0 || envoi === 'encours' || envoi === 'fait';
  const lienTicket = `/interne/element/${id}`;

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Rapport d’intervention" titre={ticket?.nom || 'Ticket SAV'} retour={{ href: lienTicket, libelle: 'Ticket' }} parent={role === 'poseur' ? 'interventions' : 'sav'} />
      <ContenuAppli className="space-y-4">
        {preview && ticket && !ticket.ecritureAutorisee && <Alerte>Preview : seuls les tickets « Test » peuvent être signés.</Alerte>}
        {ticket?.ferme && envoi !== 'fait' && <Alerte>Ce ticket est déjà résolu ou archivé : plus de rapport à faire.</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Préparation du rapport...</p>
          </Carte>
        )}

        {envoi === 'fait' && (
          <Carte accent className="space-y-3">
            <p className="flex items-center gap-2 text-[16px] font-bold"><Check size={20} color="#16a34a" /> {message}</p>
            <a href={lienTicket} className="flex min-h-[52px] items-center justify-center rounded-full px-6 text-[16px] font-semibold text-white" style={{ backgroundColor: CYAN }}>
              Retour au ticket
            </a>
          </Carte>
        )}

        {ticket && envoi !== 'fait' && !ticket.ferme && (
          <>
            <div className="space-y-1.5 rounded-[20px] p-5 text-[14px]" style={{ backgroundColor: GRIS }}>
              <p className="text-[17px] font-bold" style={{ color: NAVY }}>Le ticket</p>
              {ticket.installation && <p><span className="font-bold">Installation :</span> {ticket.installation.nom}</p>}
              {ticket.adresse && <p className="flex items-center gap-1.5"><MapPin size={14} color={CYAN} /> {ticket.adresse}</p>}
              <p>{[ticket.signaleLe && `Signalé le ${ticket.signaleLe}`, ticket.severite, ticket.panne, ticket.pdc].filter(Boolean).join(' · ')}</p>
              {ticket.demande && <p className="italic">Message du client : « {ticket.demande} »</p>}
              {ticket.rapports.length > 0 && <p className="font-semibold" style={{ color: ORANGE }}>Déjà {ticket.rapports.length} rapport{ticket.rapports.length > 1 ? 's' : ''} sur ce ticket : celui-ci s’ajoute.</p>}
            </div>

            {ticket.installation && <BlocContact affaireId={ticket.installation.id} ouvertParDefaut />}

            <div className="space-y-4">
              <div>
                <Etape n={1} titre="Constat sur place" />
                <textarea className={`${CHAMP} mt-1.5 min-h-[88px]`} value={constat} onChange={(e) => setConstat(e.target.value)} placeholder="Ce que tu trouves en arrivant (voyant, code erreur, état du câble...)" />
              </div>
              <div>
                <Etape n={2} titre="Cause" />
                <Choix options={causes.map((c) => ({ cle: c, libelle: c }))} valeur={cause} onChange={setCause} />
              </div>
              <div>
                <Etape n={3} titre="Travaux réalisés" />
                <textarea className={`${CHAMP} mt-1.5 min-h-[88px]`} value={travaux} onChange={(e) => setTravaux(e.target.value)} placeholder="Ce que tu as fait" />
              </div>
              <div>
                <Etape n={4} titre="Pièces remplacées" />
                {!aucunePiece && pieces.map((p, i) => (
                  <div key={i} className="mt-1.5 flex gap-2">
                    <input className={`${CHAMP} flex-[3]`} value={p.designation} onChange={(e) => changerPiece(i, 'designation', e.target.value)} placeholder="Désignation (ex. câble T2 7 m)" />
                    <input className={`${CHAMP} w-20 flex-none`} inputMode="numeric" value={p.quantite} onChange={(e) => changerPiece(i, 'quantite', e.target.value)} placeholder="Qté" />
                    <button type="button" aria-label="Retirer la pièce" onClick={() => setPieces(pieces.filter((_, k) => k !== i))} className="flex w-11 flex-none items-center justify-center rounded-[14px] bg-white ring-[1.5px] ring-[#dfe3e8]">
                      <Trash2 size={16} color={ORANGE} />
                    </button>
                  </div>
                ))}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setAucunePiece(false); setPieces([...pieces, { designation: '', quantite: '1' }]); }} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold ring-[1.5px] ring-[#dfe3e8]" style={{ color: CYAN }}>
                    <Plus size={14} /> Ajouter une pièce
                  </button>
                  <button type="button" onClick={() => { setAucunePiece(!aucunePiece); if (!aucunePiece) setPieces([]); }} className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${aucunePiece ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={aucunePiece ? { backgroundColor: CYAN } : undefined}>
                    Aucune pièce
                  </button>
                </div>
              </div>
              <div>
                <Etape n={5} titre="Essai après intervention" />
                <Choix options={[{ cle: 'ok', libelle: 'Charge testée OK' }, { cle: 'pas-ok', libelle: 'Pas OK' }]} valeur={essai} onChange={setEssai} couleurs={{ ok: VERT, 'pas-ok': ORANGE }} />
              </div>
              <div>
                <Etape n={6} titre="Prise en charge" />
                <Choix options={prises.map((p) => ({ cle: p, libelle: p }))} valeur={prise} onChange={setPrise} />
              </div>
              <div>
                <Etape n={7} titre="Résultat" />
                <Choix options={Object.entries(resultats).map(([cle, libelle]) => ({ cle, libelle }))} valeur={resultat} onChange={(v) => setResultat(v as Resultat)} couleurs={{ resolu: VERT, piece: ORANGE }} />
              </div>
              <div className="space-y-3">
                <Etape n={8} titre="Signatures" />
                <div>
                  <label className={ETIQUETTE}>Client présent</label>
                  <input className={`${CHAMP} mt-1.5`} value={signataire} onChange={(e) => setSignataire(e.target.value)} placeholder="Prénom et nom" autoComplete="name" />
                </div>
                <PadSignature libelle="Signature du client" onChange={setSigClient} />
                <div>
                  <label className={ETIQUETTE}>Technicien CHARGéO</label>
                  <input className={`${CHAMP} mt-1.5`} value={technicien} onChange={(e) => setTechnicien(e.target.value)} placeholder="Prénom et nom" />
                </div>
                <PadSignature libelle="Signature du technicien" onChange={setSigTech} />
              </div>
            </div>

            {message && envoi !== 'aucun' && <Alerte>{envoi === 'attente' ? <span className="flex items-center gap-2"><CloudOff size={16} /> {message}</span> : message}</Alerte>}

            <BoutonPrincipal inactif={inactif} disabled={inactif} onClick={signer}>
              <FileText size={20} /> {envoi === 'encours' ? 'Création du rapport...' : manque.length ? `Il manque : ${manque.join(', ')}` : 'Signer et créer le rapport'}
            </BoutonPrincipal>
            <p className="text-center text-[12px] text-slate-500">Sans réseau : gardé sur le téléphone, part tout seul au retour du réseau.</p>
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
