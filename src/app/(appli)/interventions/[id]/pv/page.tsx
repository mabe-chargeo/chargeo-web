"use client";

// PV de réception signé au doigt sur le téléphone (décisions de Matthieu du 18/10/2026, 16 h 02 : « que ce soit l'appli
// qui le génère » ; 16 h 04 : « au doigt sur le téléphone »). Le poseur montre au client ce que le PV va dire (ouvrages,
// mise en service, réserves), fait signer le client puis signe, et l'appli crée le PDF à la charte dans 📂 PV Réception.
// Envoi par la file hors ligne (src/lib/fileEnvoi.ts) : sans réseau, le PV signé attend sur le téléphone.
// 19/10/2026, 8 h 35 (passe de cohérence validée sur maquette) : bloc 📇 Contact commun du chantier sous « Ce que dit le
// PV », comme le rapport d'intervention SAV, et bouton Retour de l'en-tête commun.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, Check, CloudOff, FileText, MapPin, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, GRIS, NAVY, ORANGE } from '@/components/charte/couleurs';
import PadSignature from '@/components/interne/PadSignature';
import { BlocContact } from '@/components/ui/BlocContact';
import { ajouter, envoyerTout, lister, nouvelleCle, oublier, reprendre } from '@/lib/fileEnvoi';
import { adresses } from '@/lib/adresses';

type Reserve = { libelle: string; echeance?: string };
type Pv = {
  nom: string; adresse: string; client: { nom: string; type: string; email: string; telephone: string };
  devis: string; dateIntervention: string; ouvrages: string[]; miseEnService: { elements: number; rapport?: string } | null;
  niveau: string; reserves: Reserve[]; techniciens: string[]; blocages: string[]; verrouille: boolean;
};
type Chantier = { id: string; nom: string; statut: string; ecritureAutorisee: boolean };

const ROUTE = '/api/interne/pv';
const QUALITES = ['Propriétaire', 'Président du conseil syndical', 'Gestionnaire du syndic', 'Représentant de l’entreprise'];

export default function PvPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [pv, setPv] = useState<Pv | null>(null);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [signataire, setSignataire] = useState('');
  const [qualite, setQualite] = useState('');
  const [accepte, setAccepte] = useState(false);
  const [sigClient, setSigClient] = useState<string | null>(null);
  const [sigTech, setSigTech] = useState<string | null>(null);
  const [technicien, setTechnicien] = useState('');
  const [motif, setMotif] = useState('');
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
        setChantier(data.chantier);
        setPv(data.pv);
        setPreview(!!data.preview);
        setTechnicien((t) => t || String(data.technicienParDefaut || ''));
      }
    } catch {
      setErreur('Pas de réseau : ouvre le PV quand le réseau revient, la signature peut ensuite partir hors ligne.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    charger();
    (async () => { await reprendre().catch(() => null); await envoyerTout().catch(() => 0); })();
  }, [id]);

  const signer = async () => {
    if (!pv || !chantier) return;
    const cle = nouvelleCle();
    setEnvoi('encours');
    setMessage(null);
    try {
      await ajouter({
        cle, chantierId: id, chantierNom: chantier.nom, elementId: id, elementNom: 'PV de réception', type: 'saisie', route: ROUTE,
        donnees: { signataire, qualite, technicien, signatureClient: sigClient || '', signatureTechnicien: sigTech || '', motif },
      });
      await envoyerTout().catch(() => 0);
      const reste = (await lister()).find((e) => e.cle === cle);
      if (!reste) {
        setEnvoi('fait');
        setMessage('PV signé et créé : il est dans la réception, dans 📂 PV Réception.');
      } else if (reste.etat === 'echec' && !/réseau/i.test(reste.erreur || '')) {
        await oublier(cle).catch(() => null);
        setEnvoi('echec');
        setMessage(reste.erreur || 'PV refusé');
      } else {
        setEnvoi('attente');
        setMessage('Pas de réseau : le PV signé est gardé sur le téléphone et partira tout seul au retour du réseau.');
      }
    } catch {
      setEnvoi('echec');
      setMessage('Le téléphone refuse d’enregistrer : libère de la place et réessaie.');
    }
  };

  const sansReserve = pv?.niveau === 'aucune' || !pv?.reserves.length;
  const manque: string[] = [];
  if (signataire.trim().length < 2) manque.push('nom du signataire');
  if (qualite.trim().length < 2) manque.push('qualité');
  if (!accepte) manque.push('accord du client');
  if (!sigClient) manque.push('signature du client');
  if (technicien.trim().length < 2) manque.push('nom du technicien');
  if (!sigTech) manque.push('signature du technicien');
  if (pv?.verrouille && motif.trim().length < 5) manque.push('motif de la correction');
  const bloque = !chantier?.ecritureAutorisee || !!pv?.blocages.length;
  const inactif = bloque || manque.length > 0 || envoi === 'encours' || envoi === 'fait';

  return (
    <PageAppli>
      <EnTeteAppli surtitre="PV de réception" titre={chantier?.nom || 'Chantier'} retour={{ href: adresses.rapportSignature, libelle: 'Réception' }} />
      <ContenuAppli className="space-y-4">
        {preview && chantier && !chantier.ecritureAutorisee && <Alerte>Preview : seuls les chantiers « Test … » peuvent être signés.</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Préparation du PV...</p>
          </Carte>
        )}

        {envoi === 'fait' && (
          <Carte accent className="space-y-3">
            <p className="flex items-center gap-2 text-[16px] font-bold"><Check size={20} color="#16a34a" /> {message}</p>
            <a href={adresses.rapportSignature} className="flex min-h-[52px] items-center justify-center rounded-full px-6 text-[16px] font-semibold text-white" style={{ backgroundColor: CYAN }}>
              Retour à la réception
            </a>
          </Carte>
        )}

        {pv && envoi !== 'fait' && (
          <>
            <div className="space-y-3 rounded-[20px] p-5" style={{ backgroundColor: GRIS }}>
              <p className="text-[17px] font-bold" style={{ color: NAVY }}>Ce que dit le PV</p>
              {pv.adresse && <p className="flex items-center gap-1.5 text-[14px]"><MapPin size={14} color={CYAN} /> {pv.adresse}</p>}
              <p className="text-[14px]"><span className="font-bold">Maître d’ouvrage :</span> {pv.client.nom}{pv.client.type ? ` (${pv.client.type})` : ''}</p>
              {pv.ouvrages.length > 0 && (
                <div>
                  <p className="text-[14px] font-bold">Ouvrages réceptionnés</p>
                  <ul className="mt-1 space-y-0.5 text-[14px]">{pv.ouvrages.map((o) => <li key={o}>• {o}</li>)}</ul>
                </div>
              )}
              {pv.miseEnService && (
                <p className="text-[14px]"><span className="font-bold">Mise en service :</span> {pv.miseEnService.elements} élément{pv.miseEnService.elements > 1 ? 's' : ''} conforme{pv.miseEnService.elements > 1 ? 's' : ''}{pv.miseEnService.rapport ? ', rapport annexé' : ''}</p>
              )}
              <div>
                <p className="text-[14px] font-bold">Réserves</p>
                {sansReserve ? <p className="text-[14px]">Sans réserve</p> : (
                  <ul className="mt-1 space-y-0.5 text-[14px]">{pv.reserves.map((r) => <li key={r.libelle}>• {r.libelle}{r.echeance ? `, à lever le ${r.echeance}` : ''}</li>)}</ul>
                )}
              </div>
            </div>

            {chantier && <BlocContact affaireId={chantier.id} ouvertParDefaut />}

            {pv.blocages.length > 0 && (
              <Alerte>
                <span className="flex items-center gap-2"><AlertTriangle size={16} color={ORANGE} /> Avant de faire signer</span>
                {pv.blocages.map((b) => <span key={b} className="mt-1 block text-[13px] font-normal">{b}</span>)}
                <a href={adresses.rapportSignature} className="mt-2 block text-[14px] font-bold" style={{ color: CYAN }}>Compléter dans la réception</a>
              </Alerte>
            )}

            {!pv.blocages.length && (
              <>
                {pv.verrouille && (
                  <div>
                    <label className={ETIQUETTE}>Motif de la correction (PV déjà signé et envoyé)</label>
                    <input className={`${CHAMP} mt-1.5`} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. réserve oubliée sur le premier PV" />
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className={ETIQUETTE}>Signataire pour le maître d’ouvrage</label>
                    <input className={`${CHAMP} mt-1.5`} value={signataire} onChange={(e) => setSignataire(e.target.value)} placeholder="Prénom et nom" autoComplete="name" />
                  </div>
                  <div>
                    <label className={ETIQUETTE}>Qualité</label>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {QUALITES.map((q) => (
                        <button key={q} type="button" onClick={() => setQualite(q)} className={`rounded-full px-3 py-2 text-[13px] font-semibold ${qualite === q ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={qualite === q ? { backgroundColor: CYAN } : undefined}>
                          {q}
                        </button>
                      ))}
                    </div>
                    <input className={`${CHAMP} mt-2`} value={qualite} onChange={(e) => setQualite(e.target.value)} placeholder="Ou précise (ex. membre du conseil syndical)" />
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-[14px] bg-white p-3 ring-[1.5px] ring-[#dfe3e8]">
                  <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
                  <span className="text-[14px]">
                    J’ai visité les ouvrages avec CHARGéO et je prononce la réception des travaux {sansReserve ? 'sans réserve' : `avec ${pv.reserves.length} réserve${pv.reserves.length > 1 ? 's' : ''}, à lever aux dates indiquées`}.
                  </span>
                </label>

                <PadSignature libelle="Signature du client" onChange={setSigClient} />

                <div>
                  <label className={ETIQUETTE}>Technicien CHARGéO</label>
                  <input className={`${CHAMP} mt-1.5`} value={technicien} onChange={(e) => setTechnicien(e.target.value)} placeholder="Prénom et nom" />
                </div>
                <PadSignature libelle="Signature du technicien" onChange={setSigTech} />

                {message && envoi !== 'aucun' && <Alerte>{envoi === 'attente' ? <span className="flex items-center gap-2"><CloudOff size={16} /> {message}</span> : message}</Alerte>}

                <BoutonPrincipal inactif={inactif} disabled={inactif} onClick={signer}>
                  <FileText size={20} /> {envoi === 'encours' ? 'Création du PV...' : manque.length ? `Il manque : ${manque.join(', ')}` : 'Signer et créer le PV'}
                </BoutonPrincipal>
              </>
            )}
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
