"use client";

// Créations du bouton + (lot C des écrans manquants, 17/10/2026).
// /interne/creer/sav : ticket SAV rattaché à l'installation du Parc (recherche par nom ou adresse), sévérité, type de
//   panne, point de charge, symptôme. Option ?installation=<id> pour partir d'une fiche.
// /interne/creer/kaizen : idée d'amélioration (titre et description).
// Écriture par /api/interne/creer ; en preview, nom « Test · … » et pas de relation vers une vraie installation.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, ChevronRight, MapPin, RefreshCw, Search } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, GRIS } from '@/components/charte/couleurs';

type Installation = { id: string; nom: string; adresse: string; statut: string };
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function CreerPage() {
  const params = useParams<{ type: string }>();
  const type = String(params?.type || '') === 'kaizen' ? 'kaizen' : 'sav';
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [severites, setSeverites] = useState<string[]>([]);
  const [pannes, setPannes] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(type === 'sav');
  const [erreur, setErreur] = useState<string | null>(null);

  const [recherche, setRecherche] = useState('');
  const [installation, setInstallation] = useState<Installation | null>(null);
  const [severite, setSeverite] = useState<number | null>(null);
  const [panne, setPanne] = useState<number | null>(null);
  const [pdc, setPdc] = useState<number | null>(null);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [cree, setCree] = useState<{ nom: string; lien: string } | null>(null);

  useEffect(() => {
    if (type !== 'sav') return;
    const depart = new URLSearchParams(window.location.search).get('installation') || '';
    (async () => {
      try {
        const res = await fetch('/api/interne/creer', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
        else {
          setInstallations(data.installations || []);
          setSeverites(data.severites || []);
          setPannes(data.pannes || []);
          setPreview(!!data.preview);
          const i = (data.installations || []).find((x: Installation) => x.id === depart);
          if (i) setInstallation(i);
        }
      } catch {
        setErreur('Impossible de joindre le serveur.');
      } finally {
        setLoading(false);
      }
    })();
  }, [type]);

  const q = normal(recherche.trim());
  const resultats = q.length >= 2 ? installations.filter((i) => normal(`${i.nom} ${i.adresse}`).includes(q)).slice(0, 8) : [];
  const pret = type === 'kaizen' ? !!titre.trim() : !!installation && severite !== null && panne !== null && !!description.trim();

  const envoyer = async () => {
    if (!pret || envoi) return;
    setEnvoi(true);
    setErreur(null);
    const corps = type === 'kaizen'
      ? { type, titre: titre.trim(), description: description.trim() }
      : { type, installationId: installation?.id, severite, typePanne: panne, pdc, description: description.trim() };
    try {
      const res = await fetch('/api/interne/creer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) setErreur(data?.error || `Envoi impossible (${res.status})`);
      else { setCree(data.cree); setPreview(!!data.preview); }
    } catch {
      setErreur('Impossible de joindre le serveur. Rien n’a été créé.');
    } finally {
      setEnvoi(false);
    }
  };

  const choix = (liste: string[], valeur: number | null, changer: (i: number) => void) => (
    <div className="mt-2 flex flex-wrap gap-2">
      {liste.map((l, i) => {
        const actif = valeur === i;
        return (
          <button key={l} onClick={() => changer(i)} className={`rounded-full px-4 py-2 text-[14px] font-bold ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={actif ? { backgroundColor: CYAN } : undefined}>
            {l}
          </button>
        );
      })}
    </div>
  );

  const boutonRetour = (
    <a href="/interne/plus" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Plus
    </a>
  );
  const titreEcran = type === 'kaizen' ? 'Idée Kaizen' : 'Ticket SAV';

  if (cree) {
    return (
      <PageAppli>
        <EnTeteAppli surtitre="Bouton +" titre={`${titreEcran} créé`} />
        <ContenuAppli className="space-y-4">
          {preview && <Alerte>Preview : créé avec le nom « Test · … ».</Alerte>}
          <Carte accent><p className="text-[18px] font-bold">{cree.nom}</p></Carte>
          <a href={cree.lien} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-8 py-4 text-[17px] font-semibold text-white">Ouvrir <ChevronRight size={20} /></a>
          <a href="/interne/journee" className="block text-center text-[15px] font-semibold" style={{ color: CYAN }}>Retour à Ma journée</a>
        </ContenuAppli>
      </PageAppli>
    );
  }

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Bouton +" titre={titreEcran} action={boutonRetour} />
      <ContenuAppli className="space-y-4">
        {preview && <Alerte>Preview : le nom commencera par « Test · » et aucune vraie installation ne sera modifiée.</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement du Parc...</p>
          </Carte>
        )}

        {type === 'sav' && !loading && (
          <>
            <Repere>1 · Installation</Repere>
            {installation ? (
              <Carte accent>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[17px] font-bold">{installation.nom}</p>
                    {installation.adresse && <p className="mt-1 flex items-center gap-1 text-[13px]"><MapPin size={13} color={CYAN} /> {installation.adresse}</p>}
                  </div>
                  <button onClick={() => setInstallation(null)} className="shrink-0 text-[13px] font-bold" style={{ color: CYAN }}>Changer</button>
                </div>
              </Carte>
            ) : (
              <>
                <div className="relative">
                  <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" color={CYAN} />
                  <input className={`${CHAMP} pl-11`} placeholder="Nom ou adresse de l’installation" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
                </div>
                {resultats.map((i) => (
                  <button key={i.id} onClick={() => { setInstallation(i); setRecherche(''); }} className="block w-full rounded-[16px] p-4 text-left" style={{ backgroundColor: GRIS }}>
                    <p className="text-[16px] font-bold">{i.nom}</p>
                    {i.adresse && <p className="mt-1 truncate text-[13px]">{i.adresse}</p>}
                  </button>
                ))}
                {q.length >= 2 && !resultats.length && <p className="px-1 text-[14px]">Aucune installation trouvée au Parc.</p>}
              </>
            )}

            <Repere>2 · La panne</Repere>
            <div><p className={ETIQUETTE}>Sévérité</p>{choix(severites, severite, setSeverite)}</div>
            <div><p className={ETIQUETTE}>Type de panne</p>{choix(pannes, panne, setPanne)}</div>
            <div><p className={ETIQUETTE}>Point de charge (facultatif)</p>{choix(['PDC 1', 'PDC 2'], pdc, (i) => setPdc(pdc === i ? null : i))}</div>
            <div>
              <label className={ETIQUETTE}>Symptôme</label>
              <textarea className={`${CHAMP} mt-1.5 min-h-[110px]`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ce que dit le client, message d’erreur, voyant…" />
            </div>
          </>
        )}

        {type === 'kaizen' && (
          <>
            <div>
              <label className={ETIQUETTE}>Ton idée en une phrase</label>
              <input className={`${CHAMP} mt-1.5`} value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. : préparer les kits de pose la veille" />
            </div>
            <div>
              <label className={ETIQUETTE}>Pourquoi, et comment (facultatif)</label>
              <textarea className={`${CHAMP} mt-1.5 min-h-[130px]`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Le problème constaté, ce que ça changerait…" />
            </div>
          </>
        )}

        <BoutonPrincipal inactif={!pret || envoi} disabled={!pret || envoi} onClick={envoyer}>
          {envoi ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />}
          {type === 'kaizen' ? 'Proposer l’idée' : 'Créer le ticket'}
        </BoutonPrincipal>
      </ContenuAppli>
    </PageAppli>
  );
}
