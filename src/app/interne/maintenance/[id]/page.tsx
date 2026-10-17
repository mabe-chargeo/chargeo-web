"use client";

// Visite de maintenance (lot D, protocole Sefram MW9665 + A1532-XA décidé par Matthieu le 17/10/2026 à 14 h 50).
// Un onglet par point de charge ; les 10 étapes de l'autoséquence dans l'ordre de l'appareil (src/lib/
// protocoleMaintenance.ts) : OK / Défaut (/ NA) ou valeur mesurée, photo du contrôle visuel et de l'écran de synthèse.
// Brouillon gardé sur le téléphone (sous-sol sans réseau). « Enregistrer ce point de charge » met la saisie et les
// photos dans la file d'envoi hors ligne (src/lib/fileEnvoi.ts), envoyée dès que le réseau revient.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Camera, Check, CloudOff, ExternalLink, MapPin, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, GRIS, NAVY, ORANGE } from '@/components/charte/couleurs';
import { APPAREIL, PROTOCOLE, cleValeur, defauts, manquants, type Resultats } from '@/lib/protocoleMaintenance';
import { ajouter, envoyerTout, lister, nouvelleCle, reprendre, type Envoi } from '@/lib/fileEnvoi';

type Visite = { id: string; nom: string; statut: string; couleurStatut: string; adresse: string; url: string; ecritureAutorisee: boolean };
type Borne = { id: string; nom: string; modele: string; lien: string } | null;

const VIDE: Resultats = { tri: false, valeurs: {}, remarque: '' };
const cleBrouillon = (visite: string, pdc: number) => `chargeo-maintenance-${visite}-${pdc}`;

export default function MaintenancePage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const [visite, setVisite] = useState<Visite | null>(null);
  const [borne, setBorne] = useState<Borne>(null);
  const [points, setPoints] = useState(1);
  const [saisis, setSaisis] = useState<number[]>([]);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pdc, setPdc] = useState(1);
  const [r, setR] = useState<Resultats>(VIDE);
  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [file, setFile] = useState<Envoi[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const rafraichirFile = async () => { try { setFile((await lister()).filter((e) => e.chantierId === id)); } catch { /* stockage indisponible */ } };

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/interne/maintenance?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
        else { setVisite(data.visite); setBorne(data.borne); setPoints(data.points || 1); setSaisis(data.saisis || []); setPreview(!!data.preview); }
      } catch {
        setErreur('Pas de réseau : la saisie reste possible, elle partira dès que le réseau revient.');
      } finally {
        setLoading(false);
      }
      await reprendre().catch(() => null);
      await envoyerTout().catch(() => 0);
      rafraichirFile();
    })();
    const enLigne = async () => { await envoyerTout().catch(() => 0); rafraichirFile(); };
    window.addEventListener('online', enLigne);
    return () => window.removeEventListener('online', enLigne);
  }, [id]);

  // Brouillon du point de charge affiché
  useEffect(() => {
    try {
      const brut = localStorage.getItem(cleBrouillon(id, pdc));
      setR(brut ? { ...VIDE, ...JSON.parse(brut) } : VIDE);
    } catch { setR(VIDE); }
    setPhotos({});
    setMessage(null);
  }, [id, pdc]);
  const changer = (suite: Resultats) => {
    setR(suite);
    try { localStorage.setItem(cleBrouillon(id, pdc), JSON.stringify(suite)); } catch { /* plein */ }
  };
  const valeur = (etape: string, controle: string) => r.valeurs[cleValeur(etape, controle)] || '';
  const poser = (etape: string, controle: string, v: string) => changer({ ...r, valeurs: { ...r.valeurs, [cleValeur(etape, controle)]: v } });

  const enregistrer = async () => {
    if (!visite) return;
    const nomPdc = `PDC ${pdc}`;
    try {
      await ajouter({ cle: nouvelleCle(), chantierId: id, chantierNom: visite.nom, elementId: `pdc-${pdc}`, elementNom: nomPdc, type: 'saisie', donnees: { resultats: JSON.stringify(r) }, route: '/api/interne/maintenance' });
      for (const [etape, f] of Object.entries(photos)) {
        if (f) await ajouter({ cle: nouvelleCle(), chantierId: id, chantierNom: visite.nom, elementId: `pdc-${pdc}`, elementNom: nomPdc, type: 'photo', donnees: { etape }, fichier: f, nomFichier: f.name, route: '/api/interne/maintenance' });
      }
      const d = defauts(r);
      setMessage(d.length ? `${nomPdc} enregistré avec ${d.length} défaut${d.length > 1 ? 's' : ''} : le chef de chantier est prévenu.` : `${nomPdc} enregistré.`);
      setSaisis((s) => (s.includes(pdc) ? s : [...s, pdc]));
      try { localStorage.removeItem(cleBrouillon(id, pdc)); } catch { /* rien */ }
      setPhotos({});
      await envoyerTout().catch(() => 0);
    } catch {
      setMessage('Le téléphone refuse d’enregistrer : libère de la place et réessaie.');
    }
    rafraichirFile();
  };

  const boutonsOkKo = (etape: string, controle: string, na?: boolean) => {
    const v = valeur(etape, controle);
    const bouton = (cle: string, libelle: string, couleur: string) => (
      <button key={cle} onClick={() => poser(etape, controle, v === cle ? '' : cle)} className={`min-h-[44px] rounded-full px-4 text-[14px] font-bold ${v === cle ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={v === cle ? { backgroundColor: couleur } : undefined}>
        {libelle}
      </button>
    );
    return (
      <div className="flex gap-2">
        {bouton('ok', 'OK', '#16a34a')}
        {bouton('ko', 'Défaut', ORANGE)}
        {na && bouton('na', 'NA', '#9aa3ad')}
      </div>
    );
  };

  const enAttente = file.filter((e) => e.etat !== 'encours');
  const reste = manquants(r);
  const d = defauts(r);

  const boutonRetour = (
    <a href="/interne/interventions" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Interventions
    </a>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre={`Visite de maintenance · ${APPAREIL}`} titre={visite?.nom || 'Visite'} action={boutonRetour} />
      <ContenuAppli className="space-y-4">
        {preview && visite && !visite.ecritureAutorisee && <Alerte>Preview : seules les visites « Test … » peuvent être enregistrées.</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement de la visite...</p>
          </Carte>
        )}

        {visite && (
          <Carte className="space-y-1.5">
            {borne && <a href={borne.lien} className="block text-[16px] font-bold underline">{borne.nom}{borne.modele ? ` · ${borne.modele}` : ''}</a>}
            {visite.adresse && <p className="flex items-center gap-1.5 text-[14px]"><MapPin size={14} color={CYAN} /> {visite.adresse}</p>}
            <p className="text-[13px]">{points} point{points > 1 ? 's' : ''} de charge · {saisis.length} saisi{saisis.length > 1 ? 's' : ''}</p>
          </Carte>
        )}

        {enAttente.length > 0 && (
          <Alerte>
            <span className="flex items-center gap-2"><CloudOff size={16} /> {enAttente.length} envoi{enAttente.length > 1 ? 's' : ''} en attente</span>
            {enAttente.filter((e) => e.etat === 'echec').slice(0, 2).map((e) => <span key={e.cle} className="mt-1 block text-[13px] font-normal">{e.elementNom} : {e.erreur}</span>)}
            <button onClick={async () => { await envoyerTout().catch(() => 0); rafraichirFile(); }} className="mt-2 block text-[14px] font-bold" style={{ color: CYAN }}>Réessayer</button>
          </Alerte>
        )}

        {(visite || !loading) && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {Array.from({ length: points }, (_, i) => i + 1).map((n) => {
              const actif = n === pdc;
              return (
                <button key={n} onClick={() => setPdc(n)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-bold ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={actif ? { backgroundColor: CYAN } : undefined}>
                  PDC {n} {saisis.includes(n) && <Check size={14} />}
                </button>
              );
            })}
            <button onClick={() => setPoints((p) => Math.min(p + 1, 40))} className="shrink-0 rounded-full px-4 py-2 text-[14px] font-bold ring-[1.5px] ring-[#dfe3e8]" style={{ color: CYAN }}>+ PDC</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1 rounded-full bg-[#eef1f4] p-1">
          {[false, true].map((tri) => (
            <button key={String(tri)} onClick={() => changer({ ...r, tri })} className={`rounded-full py-2.5 text-[15px] font-bold ${r.tri === tri ? 'bg-white shadow' : ''}`}>
              {tri ? 'Triphasé' : 'Monophasé'}
            </button>
          ))}
        </div>

        {PROTOCOLE.map((e) => (
          <div key={e.cle} className="space-y-3 rounded-[20px] p-5" style={{ backgroundColor: GRIS }}>
            <div>
              <p className="text-[17px] font-bold" style={{ color: NAVY }}>{e.titre}</p>
              <p className="mt-1 text-[13px]">{e.aide}</p>
            </div>
            {e.controles.filter((c) => !(c.tri && !r.tri)).map((c) => (
              <div key={c.cle} className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 text-[15px] font-semibold">{c.libelle}</p>
                {c.type === 'okko' ? boutonsOkKo(e.cle, c.cle, c.na) : (
                  <div className="flex items-center gap-2">
                    <input className={`${CHAMP} w-28 py-2.5 text-right`} inputMode="decimal" value={valeur(e.cle, c.cle)} onChange={(ev) => poser(e.cle, c.cle, ev.target.value.replace(',', '.'))} />
                    <span className="w-8 text-[14px] font-bold">{c.unite}</span>
                  </div>
                )}
              </div>
            ))}
            {e.photo && (
              <label className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold ring-[1.5px] ring-[#dfe3e8]" style={{ color: CYAN }}>
                <Camera size={18} /> {photos[e.cle] ? `Photo prête : ${photos[e.cle]?.name}` : e.cle === 'synthese' ? 'Photographier l’écran de synthèse' : 'Photo'}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(ev) => setPhotos({ ...photos, [e.cle]: ev.target.files?.[0] || null })} />
              </label>
            )}
          </div>
        ))}

        <div>
          <label className={ETIQUETTE}>Remarque (facultatif)</label>
          <textarea className={`${CHAMP} mt-1.5 min-h-[90px]`} value={r.remarque} onChange={(ev) => changer({ ...r, remarque: ev.target.value })} placeholder="Pièce à changer, réglage fait, conseil au client…" />
        </div>

        {d.length > 0 && (
          <Alerte>
            <span className="flex items-center gap-2"><AlertTriangle size={16} color={ORANGE} /> {d.length} défaut{d.length > 1 ? 's' : ''} noté{d.length > 1 ? 's' : ''}</span>
            {d.map((x) => <span key={x} className="block text-[13px] font-normal">{x}</span>)}
          </Alerte>
        )}
        {message && <Carte accent><p className="text-[15px] font-semibold">{message}</p></Carte>}

        <BoutonPrincipal inactif={!visite || (visite && !visite.ecritureAutorisee)} disabled={!visite || (visite && !visite.ecritureAutorisee)} onClick={enregistrer}>
          <Check size={20} /> Enregistrer le PDC {pdc}{reste > 0 ? ` (${reste} non renseigné${reste > 1 ? 's' : ''})` : ''}
        </BoutonPrincipal>
        <p className="px-1 text-center text-[13px]">Pense à enregistrer la séquence dans le MW9665 : le rapport MESM se joint ensuite à la visite.</p>

        {visite && (
          <div className="pt-2 text-center">
            <a href={visite.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: CYAN }}>
              <ExternalLink size={13} /> Ouvrir la visite dans ClickUp
            </a>
          </div>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
