"use client";

// Saisie à la pose (étape 2, fiche intervention validée par Matthieu le 17/10/2026 à 13 h), action de la fiche
// intervention de l'installateur. Pour chaque borne (ou prise renforcée) du scénario retenu : photo de l'étiquette,
// n° de série, puissance configurée, photo de la borne posée. Pour chaque coffret : une photo.
// 17/10/2026, 17 h 37 (choix de Matthieu : « Ce qui est prévu, sans prix ») : en tête d'écran, le bloc « 📋 Ce qui est
// prévu » (ancre #prevu) liste chaque élément du scénario retenu avec son détail (champs remplis, description), sans
// aucun prix ; il remplace « Reste du matériel prévu ». Gardé hors ligne avec le reste du chantier.
// Hors ligne : tout part d'abord sur le téléphone (src/lib/fileEnvoi.ts), puis la file d'envoi visible envoie dès que le
// réseau revient. États : enregistré sur le téléphone (en attente), envoi en cours, envoyé, échec avec Réessayer. Une
// photo en échec ne bloque jamais le reste. Le chantier lui-même est gardé sur le téléphone après la première ouverture.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, BatteryCharging, Camera, CheckCircle2, ClipboardList, CloudOff, CloudUpload, MapPin, Package, RefreshCw, Save } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, Repere, TitreCarte, CHAMP } from '@/components/charte/Appli';
import { CYAN, GRIS, ORANGE } from '@/components/charte/couleurs';
import { ajouter, envoyerTout, lister, nouvelleCle, reprendre, type Envoi } from '@/lib/fileEnvoi';

type Element = {
  id: string; nom: string; scenario?: string; nature: string; libelleNature: string; aSaisir: boolean;
  numeroSerie: string; champSerie: boolean; photos: { etape: string; nom: string }[];
  details?: { libelle: string; valeur: string }[]; description?: string;
};
type Donnees = {
  chantier: { id: string; nom: string; statut: string; couleurStatut: string; adresse: string; url: string; ecritureAutorisee: boolean };
  scenarios: string[];
  retenu?: boolean;
  elements: Element[];
  puissances: string[];
  lu: number;
  preview: boolean;
};

const cleCache = (id: string) => `chargeo_pose_${id}`;
const heure = (ms: number) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
const LIBELLE_ETAPE: Record<string, string> = { etiquette: 'Photo de l’étiquette', posee: 'Photo de la borne posée', coffret: 'Photo du coffret' };
// Ordre d'affichage de Ce qui est prévu : bornes, coffrets, puis le reste
const rangNature = (n: string) => (n === 'borne' || n === 'priseRenforcee' ? 0 : n === 'tdIrveCoffret' ? 1 : 2);

// Photo réduite à 1600 px en JPEG (réseau de chantier, limite de 4 Mo), comme la réception
async function preparer(fichier: File): Promise<Blob> {
  if (!fichier.type.startsWith('image/')) return fichier;
  try {
    const image = await createImageBitmap(fichier);
    const echelle = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * echelle);
    canvas.height = Math.round(image.height * echelle);
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
    return blob || fichier;
  } catch {
    return fichier;
  }
}

export default function PosePage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [horsLigne, setHorsLigne] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [file, setFile] = useState<Envoi[]>([]);
  const [envoyes, setEnvoyes] = useState(0);
  const [saisie, setSaisie] = useState<Record<string, { numeroSerie: string; puissance: string }>>({});
  const [message, setMessage] = useState<string | null>(null);

  const rafraichirFile = async () => {
    try { setFile((await lister()).filter((e) => e.chantierId === id)); } catch { /* stockage indisponible */ }
  };

  const synchroniser = async () => {
    try {
      const n = await envoyerTout();
      if (n) setEnvoyes((x) => x + n);
    } catch { /* réessai au prochain retour réseau */ }
    await rafraichirFile();
  };

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/interne/pose?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
      else {
        setDonnees(data as Donnees);
        setHorsLigne(false);
        try { localStorage.setItem(cleCache(id), JSON.stringify(data)); } catch {}
      }
    } catch {
      // Pas de réseau : chantier gardé sur le téléphone
      try {
        const brut = localStorage.getItem(cleCache(id));
        if (brut) { setDonnees(JSON.parse(brut) as Donnees); setHorsLigne(true); }
        else setErreur('Pas de réseau, et ce chantier n’a jamais été ouvert sur ce téléphone. Ouvre-le une fois avec du réseau (ou « Préparer ma journée »).');
      } catch {
        setErreur('Pas de réseau.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      try { await reprendre(); } catch {}
      await charger();
      await synchroniser();
    })();
    const enLigne = () => { setHorsLigne(false); synchroniser(); };
    window.addEventListener('online', enLigne);
    return () => window.removeEventListener('online', enLigne);
  }, [id]);

  // Ouvert depuis « Ce qui est prévu » (Mes interventions) : on descend au bloc une fois le chantier chargé
  useEffect(() => {
    if (donnees && window.location.hash === '#prevu') document.getElementById('prevu')?.scrollIntoView();
  }, [donnees]);

  const enregistrer = async (e: Element) => {
    if (!donnees) return;
    const s = saisie[e.id] || { numeroSerie: '', puissance: '' };
    if (!s.numeroSerie.trim() && !s.puissance) return;
    try {
      await ajouter({
        cle: nouvelleCle(), chantierId: id, chantierNom: donnees.chantier.nom, elementId: e.id, elementNom: e.nom,
        type: 'saisie', donnees: { numeroSerie: s.numeroSerie.trim(), puissance: s.puissance },
      });
      setSaisie((x) => ({ ...x, [e.id]: { numeroSerie: '', puissance: '' } }));
      setMessage(`${e.nom} : enregistré sur le téléphone.`);
      await rafraichirFile();
      synchroniser();
    } catch {
      setMessage('Impossible d’enregistrer sur ce téléphone (stockage plein ou bloqué).');
    }
  };

  const photo = async (e: Element, etape: string, liste: FileList | null) => {
    if (!liste?.length || !donnees) return;
    try {
      for (const brut of Array.from(liste)) {
        const blob = await preparer(brut);
        await ajouter({
          cle: nouvelleCle(), chantierId: id, chantierNom: donnees.chantier.nom, elementId: e.id, elementNom: e.nom,
          type: 'photo', donnees: { etape }, fichier: blob, nomFichier: 'photo.jpg',
        });
      }
      setMessage(`${e.nom} : ${liste.length > 1 ? `${liste.length} photos enregistrées` : 'photo enregistrée'} sur le téléphone.`);
      await rafraichirFile();
      synchroniser();
    } catch {
      setMessage('Impossible d’enregistrer la photo sur ce téléphone (stockage plein ou bloqué).');
    }
  };

  const enAttente = file.filter((x) => x.etat !== 'echec');
  const enEchec = file.filter((x) => x.etat === 'echec');
  const bloque = !!donnees && !donnees.chantier.ecritureAutorisee;
  const enFile = (e: Element) => file.filter((x) => x.elementId === e.id);

  const boutonRetour = (
    <a href="/interne/interventions" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Interventions
    </a>
  );

  const boutonPhoto = (e: Element, etape: string) => {
    const faites = e.photos.filter((p) => p.etape === etape).length + enFile(e).filter((x) => x.type === 'photo' && x.donnees.etape === etape).length;
    return (
      <label className={`flex min-h-[56px] cursor-pointer items-center justify-between gap-3 rounded-[14px] bg-white px-4 py-3 ring-[1.5px] ring-[#dfe3e8] ${bloque ? 'pointer-events-none opacity-50' : ''}`}>
        <span className="flex items-center gap-2 text-[15px] font-semibold"><Camera size={20} color={CYAN} /> {LIBELLE_ETAPE[etape]}</span>
        <span className="text-[13px] font-bold" style={{ color: faites ? '#16a34a' : ORANGE }}>{faites ? `✅ ${faites}` : 'à faire'}</span>
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(ev) => { photo(e, etape, ev.target.files); ev.target.value = ''; }} />
      </label>
    );
  };

  const carteBorne = (e: Element) => {
    const s = saisie[e.id] || { numeroSerie: '', puissance: '' };
    const attente = enFile(e).filter((x) => x.type === 'saisie');
    return (
      <Carte key={e.id} className="space-y-3">
        <TitreCarte icon={BatteryCharging}>{e.nom}</TitreCarte>
        {boutonPhoto(e, 'etiquette')}
        <div>
          <p className="mb-1 text-[14px] font-bold">N° de série</p>
          {e.numeroSerie && <p className="mb-2 text-[13px] font-semibold" style={{ color: '#16a34a' }}>Déjà enregistré : {e.numeroSerie}</p>}
          <input
            className={`${CHAMP} text-[18px] tracking-wide`}
            placeholder="Recopie le n° de l’étiquette"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            disabled={bloque}
            value={s.numeroSerie}
            onChange={(ev) => setSaisie((x) => ({ ...x, [e.id]: { ...s, numeroSerie: ev.target.value } }))}
          />
        </div>
        {e.nature === 'borne' && (
          <div>
            <p className="mb-2 text-[14px] font-bold">Puissance configurée</p>
            <div className="grid grid-cols-4 gap-2">
              {(donnees?.puissances || []).map((p) => {
                const choisi = s.puissance === p;
                return (
                  <button
                    key={p}
                    disabled={bloque}
                    onClick={() => setSaisie((x) => ({ ...x, [e.id]: { ...s, puissance: choisi ? '' : p } }))}
                    className={`min-h-[52px] rounded-[14px] text-[15px] font-bold transition-transform active:scale-95 ${choisi ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`}
                    style={choisi ? { backgroundColor: CYAN } : undefined}
                  >
                    {p} kW
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <button
          disabled={bloque || (!s.numeroSerie.trim() && !s.puissance)}
          onClick={() => enregistrer(e)}
          className={`flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-6 text-[16px] font-semibold text-white transition-transform active:scale-95 ${bloque || (!s.numeroSerie.trim() && !s.puissance) ? 'opacity-40' : ''}`}
        >
          <Save size={18} /> Enregistrer
        </button>
        {attente.length > 0 && <p className="text-[13px] font-semibold" style={{ color: ORANGE }}>{attente.length} saisie{attente.length > 1 ? 's' : ''} en attente d’envoi</p>}
        {boutonPhoto(e, 'posee')}
      </Carte>
    );
  };

  const carteCoffret = (e: Element) => (
    <Carte key={e.id} className="space-y-3">
      <TitreCarte icon={Package}>{e.nom}</TitreCarte>
      {boutonPhoto(e, 'coffret')}
    </Carte>
  );

  const elements = donnees?.elements || [];
  const bornes = elements.filter((e) => e.aSaisir && e.nature !== 'tdIrveCoffret');
  const coffrets = elements.filter((e) => e.nature === 'tdIrveCoffret');
  const sansChampSerie = bornes.some((e) => !e.champSerie);
  const prevus = elements.slice().sort((a, b) => rangNature(a.nature) - rangNature(b.nature));
  const plusieursScenarios = (donnees?.scenarios || []).length > 1;

  // « Ce qui est prévu » : un élément, son détail, jamais de prix
  const lignePrevue = (e: Element) => (
    <div key={e.id} className="rounded-[14px] bg-white p-4 ring-[1.5px] ring-[#dfe3e8]">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
        {e.libelleNature}{plusieursScenarios && e.scenario ? ` · ${e.scenario}` : ''}
      </p>
      <p className="mt-0.5 text-[16px] font-bold leading-tight">{e.nom}</p>
      {(e.details || []).length > 0 && (
        <dl className="mt-2 space-y-1">
          {(e.details || []).map((d) => (
            <div key={d.libelle} className="flex justify-between gap-3 text-[14px]">
              <dt className="text-slate-500">{d.libelle}</dt>
              <dd className="text-right font-semibold">{d.valeur}</dd>
            </div>
          ))}
        </dl>
      )}
      {e.description && <p className="mt-2 whitespace-pre-line text-[13px]">{e.description}</p>}
      {!(e.details || []).length && !e.description && <p className="mt-1 text-[13px] text-slate-500">Pas de détail renseigné au relevé.</p>}
    </div>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Saisie à la pose" titre={donnees?.chantier.nom || 'Chantier'} action={boutonRetour} />
      <ContenuAppli className="space-y-4">
        {/* File d'envoi, toujours visible */}
        <div className="rounded-[20px] p-4" style={{ backgroundColor: GRIS }}>
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[15px] font-bold">
              {enEchec.length ? <CloudOff size={18} color={ORANGE} /> : enAttente.length ? <CloudUpload size={18} color={CYAN} /> : <CheckCircle2 size={18} color="#16a34a" />}
              {enEchec.length
                ? `${enEchec.length} envoi${enEchec.length > 1 ? 's' : ''} en échec`
                : enAttente.length
                  ? `${enAttente.length} en attente d’envoi`
                  : 'Tout est envoyé'}
            </p>
            <button onClick={synchroniser} className="rounded-full px-4 py-2 text-[14px] font-bold ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-95">
              Réessayer
            </button>
          </div>
          {envoyes > 0 && <p className="mt-1 text-[13px]" style={{ color: '#16a34a' }}>{envoyes} envoyé{envoyes > 1 ? 's' : ''} depuis l’ouverture de l’écran.</p>}
          {file.length > 0 && (
            <ul className="mt-2 space-y-1">
              {file.map((x) => (
                <li key={x.cle} className="text-[13px]">
                  <span className="font-semibold">{x.elementNom}</span> · {x.type === 'photo' ? (LIBELLE_ETAPE[x.donnees.etape] || 'Photo') : 'Saisie'} ·{' '}
                  <span style={{ color: x.etat === 'echec' ? ORANGE : CYAN }}>
                    {x.etat === 'echec' ? `échec : ${x.erreur || 'réessayer'}` : x.etat === 'encours' ? 'envoi en cours' : 'enregistré sur le téléphone'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {horsLigne && donnees && <Alerte>Hors ligne : chantier du {heure(donnees.lu)}, gardé sur ce téléphone. Tes saisies partiront au retour du réseau.</Alerte>}
        {donnees?.preview && <Alerte>Preview : lecture de tout le planning, écriture seulement sur les chantiers « Test ».</Alerte>}
        {bloque && <Alerte>Ce chantier n’est pas un chantier « Test » : saisie désactivée en preview.</Alerte>}
        {sansChampSerie && !bloque && <Alerte>Le champ 🆔 Numéro de Série n’est pas encore sur le Planning : le n° sera gardé dans un commentaire de la borne en attendant.</Alerte>}
        {message && <Alerte>{message}</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}

        {loading && !donnees && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement du matériel prévu...</p>
          </Carte>
        )}

        {donnees && (
          <>
            {donnees.chantier.adresse && (
              <p className="flex items-center gap-1.5 px-1 text-[14px]"><MapPin size={15} color={CYAN} /> {donnees.chantier.adresse}</p>
            )}
            {!elements.length && (
              <Carte className="text-center"><p className="text-[15px] font-semibold">Aucun matériel prévu : le scénario retenu n’a pas d’éléments.</p></Carte>
            )}

            {prevus.length > 0 && (
              <details id="prevu" open className="scroll-mt-4 rounded-[20px] p-4" style={{ backgroundColor: GRIS }}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[17px] font-bold"><ClipboardList size={20} color={CYAN} /> Ce qui est prévu ({prevus.length})</span>
                  <span className="text-[13px] font-semibold" style={{ color: CYAN }}>afficher / masquer</span>
                </summary>
                <p className="mt-2 text-[13px]">
                  {donnees.retenu === false
                    ? 'Aucun scénario n’est marqué ✅ Retenu : tous les scénarios sont affichés, demande au chef de chantier lequel poser.'
                    : `Scénario retenu : ${(donnees.scenarios || []).join(', ')}`}
                </p>
                <div className="mt-3 space-y-2">{prevus.map(lignePrevue)}</div>
              </details>
            )}

            {bornes.length > 0 && <Repere>Bornes à saisir ({bornes.length})</Repere>}
            {bornes.map(carteBorne)}
            {coffrets.length > 0 && <Repere>Coffrets à photographier ({coffrets.length})</Repere>}
            {coffrets.map(carteCoffret)}
            <a href="/interne/reception" className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full px-6 text-[16px] font-semibold ring-[1.5px] ring-[#dfe3e8]" style={{ color: CYAN }}>
              Étape suivante : rapport et signature
            </a>
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
