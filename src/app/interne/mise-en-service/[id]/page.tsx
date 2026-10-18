"use client";

// Mise en service à la réception (décision de Matthieu du 18/10/2026, 14 h 41). 15 h 08 : les contrôles s'adaptent à ce
// qu'on met en service. Un onglet par élément du scénario retenu, dans l'ordre du courant (raccordement → alimentation →
// TD IRVE → artère → dérivations → communication → data → prises → bornes), chacun avec son protocole
// (src/lib/protocoleMaintenance.ts). 15 h 36 : quand tous les éléments sont conformes, l'appli crée le rapport de mise
// en service (plus de PDF du contrôleur obligatoire). Brouillon gardé sur le téléphone ; « Enregistrer » passe par la
// file d'envoi hors ligne (src/lib/fileEnvoi.ts).
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Camera, Check, CloudOff, MapPin, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, GRIS, NAVY, ORANGE } from '@/components/charte/couleurs';
import { OBJET, aDuTri, appareilDe, cleValeur, defauts, etapesDe, manquants, type ModeProtocole, type Resultats } from '@/lib/protocoleMaintenance';
import { ajouter, envoyerTout, lister, nouvelleCle, reprendre, type Envoi } from '@/lib/fileEnvoi';

type Chantier = { id: string; nom: string; statut: string; adresse: string; ecritureAutorisee: boolean };
type Point = { id: string; nom: string; mode: ModeProtocole; fait: boolean; defaut: boolean };

const ROUTE = '/api/interne/mise-en-service';
const VIDE: Resultats = { tri: false, valeurs: {}, remarque: '' };
const cleBrouillon = (chantier: string, element: string) => `chargeo-mes3-${chantier}-${element}`;
const cleCache = (chantier: string) => `chargeo-mes-chantier-${chantier}`;

export default function MiseEnServicePage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [actif, setActif] = useState('');
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [r, setR] = useState<Resultats>(VIDE);
  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [file, setFile] = useState<Envoi[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const rafraichirFile = async () => { try { setFile((await lister()).filter((e) => e.chantierId === id)); } catch { /* stockage indisponible */ } };

  const appliquer = (data: any) => {
    setChantier(data.chantier);
    setPoints(data.points || []);
    setPreview(!!data.preview);
    setActif((a) => a || data.points?.[0]?.id || '');
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`${ROUTE}?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
        else {
          appliquer(data);
          try { localStorage.setItem(cleCache(id), JSON.stringify(data)); } catch { /* plein */ }
        }
      } catch {
        try {
          const brut = localStorage.getItem(cleCache(id));
          if (brut) { appliquer(JSON.parse(brut)); setErreur('Hors ligne : chantier gardé sur le téléphone, tes mesures partiront au retour du réseau.'); }
          else setErreur('Pas de réseau, et ce chantier n’a jamais été ouvert sur ce téléphone.');
        } catch { setErreur('Pas de réseau.'); }
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

  // Brouillon du point affiché
  useEffect(() => {
    if (!actif) return;
    try {
      const brut = localStorage.getItem(cleBrouillon(id, actif));
      setR(brut ? { ...VIDE, ...JSON.parse(brut) } : VIDE);
    } catch { setR(VIDE); }
    setPhotos({});
    setMessage(null);
  }, [id, actif]);

  const point = points.find((p) => p.id === actif) || null;
  const mode: ModeProtocole = point?.mode || 'borne';
  const etapes = etapesDe(mode);
  const changer = (suite: Resultats) => {
    setR(suite);
    try { localStorage.setItem(cleBrouillon(id, actif), JSON.stringify(suite)); } catch { /* plein */ }
  };
  const valeur = (etape: string, controle: string) => r.valeurs[cleValeur(etape, controle)] || '';
  const poser = (etape: string, controle: string, v: string) => changer({ ...r, valeurs: { ...r.valeurs, [cleValeur(etape, controle)]: v } });

  const enregistrer = async () => {
    if (!chantier || !point) return;
    try {
      await ajouter({ cle: nouvelleCle(), chantierId: id, chantierNom: chantier.nom, elementId: point.id, elementNom: point.nom, type: 'saisie', donnees: { resultats: JSON.stringify(r) }, route: ROUTE });
      for (const [etape, f] of Object.entries(photos)) {
        if (f) await ajouter({ cle: nouvelleCle(), chantierId: id, chantierNom: chantier.nom, elementId: point.id, elementNom: point.nom, type: 'photo', donnees: { etape }, fichier: f, nomFichier: f.name, route: ROUTE });
      }
      const d = defauts(r, etapes);
      const apres = points.map((p) => (p.id === point.id ? { ...p, fait: true, defaut: d.length > 0 } : p));
      const tousConformes = apres.every((p) => p.fait && !p.defaut);
      setMessage(d.length
        ? `${point.nom} : ${d.length} défaut${d.length > 1 ? 's' : ''} noté${d.length > 1 ? 's' : ''}. Corrige puis refais la mesure, la réception reste bloquée.`
        : tousConformes
          ? `${point.nom} : mesures enregistrées. Tous les éléments sont conformes : le rapport de mise en service se crée dès l’envoi.`
          : `${point.nom} : mesures enregistrées.`);
      setPoints(apres);
      try { localStorage.removeItem(cleBrouillon(id, point.id)); } catch { /* rien */ }
      setPhotos({});
      // Passe au point suivant pas encore fait
      const suivant = apres.find((p) => p.id !== point.id && !p.fait);
      if (suivant && !d.length) setActif(suivant.id);
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
  const reste = manquants(r, etapes);
  const d = defauts(r, etapes);
  const bloque = !chantier || !chantier.ecritureAutorisee || !point;
  const conformes = points.filter((p) => p.fait && !p.defaut).length;

  const boutonRetour = (
    <a href="/interne/reception" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Réception
    </a>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Mise en service" titre={chantier?.nom || 'Chantier'} action={boutonRetour} />
      <ContenuAppli className="space-y-4">
        {preview && chantier && !chantier.ecritureAutorisee && <Alerte>Preview : seuls les chantiers « Test … » peuvent être enregistrés.</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement du chantier...</p>
          </Carte>
        )}

        {chantier && (
          <Carte className="space-y-1.5">
            {chantier.adresse && <p className="flex items-center gap-1.5 text-[14px]"><MapPin size={14} color={CYAN} /> {chantier.adresse}</p>}
            <p className="text-[13px]">{points.length} élément{points.length > 1 ? 's' : ''} à mettre en service · {conformes} conforme{conformes > 1 ? 's' : ''}</p>
            <p className="text-[13px]">Quand tous les éléments sont conformes, l’appli crée le rapport de mise en service dans la réception.</p>
          </Carte>
        )}
        {!loading && chantier && points.length === 0 && (
          <Alerte>Aucun élément à mettre en service dans le scénario retenu.</Alerte>
        )}

        {enAttente.length > 0 && (
          <Alerte>
            <span className="flex items-center gap-2"><CloudOff size={16} /> {enAttente.length} envoi{enAttente.length > 1 ? 's' : ''} en attente</span>
            {enAttente.filter((e) => e.etat === 'echec').slice(0, 2).map((e) => <span key={e.cle} className="mt-1 block text-[13px] font-normal">{e.elementNom} : {e.erreur}</span>)}
            <button onClick={async () => { await envoyerTout().catch(() => 0); rafraichirFile(); }} className="mt-2 block text-[14px] font-bold" style={{ color: CYAN }}>Réessayer</button>
          </Alerte>
        )}

        {points.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {points.map((p) => {
              const choisi = p.id === actif;
              return (
                <button key={p.id} onClick={() => setActif(p.id)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-bold ${choisi ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={choisi ? { backgroundColor: CYAN } : undefined}>
                  {p.nom} {p.fait && (p.defaut ? <AlertTriangle size={14} /> : <Check size={14} />)}
                </button>
              );
            })}
          </div>
        )}

        {point && (
          <>
            <div className="px-1">
              <p className="text-[18px] font-bold" style={{ color: NAVY }}>{point.nom}</p>
              <p className="mt-0.5 text-[14px]">{OBJET[mode]}</p>
              <p className="mt-0.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">{appareilDe(mode)}</p>
            </div>

            {aDuTri(etapes) && (
              <div className="grid grid-cols-2 gap-1 rounded-full bg-[#eef1f4] p-1">
                {[false, true].map((tri) => (
                  <button key={String(tri)} onClick={() => changer({ ...r, tri })} className={`rounded-full py-2.5 text-[15px] font-bold ${r.tri === tri ? 'bg-white shadow' : ''}`}>
                    {tri ? 'Triphasé' : 'Monophasé'}
                  </button>
                ))}
              </div>
            )}

            {etapes.map((e) => (
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
              <textarea className={`${CHAMP} mt-1.5 min-h-[90px]`} value={r.remarque} onChange={(ev) => changer({ ...r, remarque: ev.target.value })} placeholder="Réglage fait, valeur limite, conseil au client…" />
            </div>

            {d.length > 0 && (
              <Alerte>
                <span className="flex items-center gap-2"><AlertTriangle size={16} color={ORANGE} /> {d.length} défaut{d.length > 1 ? 's' : ''} noté{d.length > 1 ? 's' : ''}</span>
                {d.map((x) => <span key={x} className="block text-[13px] font-normal">{x}</span>)}
              </Alerte>
            )}
            {message && <Carte accent><p className="text-[15px] font-semibold">{message}</p></Carte>}

            <BoutonPrincipal inactif={bloque} disabled={bloque} onClick={enregistrer}>
              <Check size={20} /> Enregistrer les mesures{reste > 0 ? ` (${reste} à remplir)` : ''}
            </BoutonPrincipal>
          </>
        )}

        <a href="/interne/reception" className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full px-6 text-[16px] font-semibold ring-[1.5px] ring-[#dfe3e8]" style={{ color: CYAN }}>
          Retour à la réception
        </a>
      </ContenuAppli>
    </PageAppli>
  );
}
