"use client";

// Réception chantier en deux temps (Phase 6, décision Matthieu du 13/10/2026, page « Qui fait quoi ») :
// Aperçu : PV, rapport et photos s'ouvrent depuis l'écran (vignettes), sans passer par ClickUp (test du 13/10).
// Envoi : toujours possible quand tout est complet (un chantier peut déjà être en ✅ réalisé sans avoir été envoyé ;
// renvoyer ne fait que reprévenir le chargé d'opération, test du 13/10).
// - role « poseur » (/interne/reception) : sur place, le technicien poseur fait signer le PV, dépose PV et photos, déclare
//   les réserves (sous-tâche « 🔧 Réserve : … », responsable = 👷 Technicien du chantier), puis envoie au chargé d'opération ;
// - role « charge » (/interne/validation) : le chargé d'opération / chef de chantier contrôle, qualifie les réserves et
//   valide la réception (statut 🏁 terminé). Le passage au Parc (contrat, facture de solde, avis Google) reste fait par
//   la route existante ; ce qui est administratif part au back-office.
// 17/10, 10 h 26 (Matthieu) : bloc 📇 Contact sur chaque chantier (Appeler, Google Voice, SMS, Gmail, Waze, Maps), lu au
// premier appui.
// 17/10, 12 h 33 : le nom du chantier ouvre la fiche affaire unique ; retour vers Mon espace / Mon travail.
// 17/10, 15 h 34 (Matthieu : « le chef de chantier corrige, avec trace ») : une fois le PV signé et envoyé (✅ réalisé),
// cadenas sur le PV et les réserves. Le poseur ne peut plus les changer ; le chef de chantier corrige en donnant un motif,
// gardé en commentaire sur le chantier. Rapport de mesures et photos restent ajoutables.
// 18/10, 14 h 41 et 15 h 08 : bloc ⚡ Mise en service, un contrôle par élément, bouton vers /interne/mise-en-service.
// 18/10, 15 h 36 (Matthieu : « L'appli génère le rapport ») : 📊 Rapport de mise en service créé par l'appli quand tous
// les éléments sont conformes (bouton de secours « Créer le rapport ») ; le PDF du contrôleur devient facultatif.
// 18/10, 16 h 04 (Matthieu : « le PV de réception, que ce soit l'appli qui le génère, au doigt sur le téléphone ») :
// bouton « Faire signer le PV sur le téléphone » (/interne/pv/<chantier>), le PV papier photographié reste en secours.
// Ordre de la carte : mise en service, réserves, puis PV (le PV reprend les réserves déclarées), rapport et photos.
import { useEffect, useState } from 'react';
import { Camera, ClipboardCheck, ExternalLink, FileText, Gauge, Lock, PenLine, Plus, RefreshCw, Zap } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, TitreCarte, Alerte, BoutonPrincipal, CHAMP } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';
import { BlocContact } from '@/components/ui/BlocContact';

interface Reserve { id: string; nom: string; responsables: string[]; echeance: number | null; faite: boolean }
interface Option { id: string; nom: string; orderindex: number }
interface Fichier { id: string; nom: string; image: boolean }
interface PointMes { id: string; nom: string; mode: string; fait: boolean; defaut: boolean }
interface Chantier {
  id: string; nom: string; statut: string; couleurStatut: string; url: string;
  pv: Fichier[]; photos: Fichier[]; rapport: Fichier[]; techniciens: string[]; reservesOptionId: string | null; niveau: string;
  reserves: Reserve[]; motifs: string[]; avertissements: string[]; ecritureAutorisee: boolean; envoye: boolean;
  verrouille?: boolean; miseEnService?: PointMes[]; miseEnServiceComplete?: boolean;
}

const normal = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function couleurReserve(nom: string): string {
  const n = normal(nom);
  if (n.includes('aucune')) return '#16a34a';
  if (n.includes('mineure')) return '#ca8a04';
  if (n.includes('bloquante')) return '#dc2626';
  return CYAN;
}
const jour = (ms: number) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit' }).format(new Date(ms));

// Photo réduite à 1600 px en JPEG avant l'envoi (limite de taille et réseau de chantier). PDF envoyé tel quel.
async function preparer(fichier: File): Promise<File> {
  if (!fichier.type.startsWith('image/')) return fichier;
  try {
    const image = await createImageBitmap(fichier);
    const echelle = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * echelle);
    canvas.height = Math.round(image.height * echelle);
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
    if (!blob) return fichier;
    return new File([blob], fichier.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return fichier;
  }
}

export default function Reception({ role }: { role: 'poseur' | 'charge' }) {
  const poseur = role === 'poseur';
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [saisie, setSaisie] = useState<Record<string, { libelle: string; echeance: string }>>({});
  // Motif de correction d'un PV signé (chef de chantier), par chantier
  const [correction, setCorrection] = useState<Record<string, string>>({});

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/interne/reception?role=${role}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || data.error) setErreur(data.error || 'Lecture impossible');
      else {
        setChantiers(data.chantiers || []);
        setOptions(data.optionsReserves || []);
        setPreview(!!data.preview);
      }
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { charger(); }, []);

  const message = (id: string, texte: string) => setMessages((m) => ({ ...m, [id]: texte }));

  const appliquer = (c: Chantier, data: any) => {
    if (data?.termine) setChantiers((l) => l.filter((x) => x.id !== c.id));
    else if (data?.chantier) setChantiers((l) => l.map((x) => (x.id === c.id ? data.chantier : x)));
  };

  const envoyer = async (c: Chantier, corps: Record<string, string>, cle: string, succes?: string) => {
    setEnCours(cle);
    message(c.id, '');
    try {
      const res = await fetch('/api/interne/reception', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: c.id, ...corps, ...(c.verrouille ? { motif: correction[c.id] || '' } : {}) }),
      });
      const data = await res.json();
      appliquer(c, data);
      if (!res.ok || data.error) message(c.id, data.error || 'Modification refusée');
      else if (succes) message(c.id, succes);
      return res.ok && !data.error;
    } catch {
      message(c.id, 'Impossible de joindre le serveur.');
      return false;
    } finally {
      setEnCours(null);
    }
  };

  const deposer = async (c: Chantier, cible: 'pv' | 'photos' | 'rapport', liste: FileList | null) => {
    if (!liste?.length) return;
    setEnCours(`${c.id}:${cible}`);
    message(c.id, '');
    let ok = 0;
    for (const brut of Array.from(liste)) {
      const fichier = await preparer(brut);
      if (fichier.size > 4 * 1024 * 1024) { message(c.id, `${brut.name} : fichier trop lourd (4 Mo maximum).`); continue; }
      const form = new FormData();
      form.append('taskId', c.id);
      form.append('cible', cible);
      form.append('fichier', fichier);
      if (c.verrouille) form.append('motif', correction[c.id] || '');
      try {
        const res = await fetch('/api/interne/reception', { method: 'POST', body: form });
        const data = await res.json();
        appliquer(c, data);
        if (!res.ok || data.error) { message(c.id, data.error || 'Envoi refusé'); break; }
        ok++;
      } catch {
        message(c.id, 'Impossible de joindre le serveur.');
        break;
      }
    }
    if (ok) message(c.id, `${ok} fichier${ok > 1 ? 's' : ''} enregistré${ok > 1 ? 's' : ''}.`);
    setEnCours(null);
  };

  // ⚡ Mise en service : état de chaque élément et accès à la saisie
  const blocMiseEnService = (c: Chantier) => {
    const points = c.miseEnService || [];
    if (!points.length) return null;
    const conformes = points.filter((p) => p.fait && !p.defaut).length;
    const complet = conformes === points.length;
    return (
      <div className="rounded-[14px] bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[14px] font-bold"><Zap size={16} color={CYAN} /> Mise en service</p>
          <span className="text-[12px] font-semibold" style={{ color: complet ? '#16a34a' : ORANGE }}>{conformes}/{points.length} conforme{points.length > 1 ? 's' : ''}</span>
        </div>
        <ul className="mt-2 space-y-1">
          {points.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="font-semibold">{p.nom}</span>
              <span style={{ color: p.fait ? (p.defaut ? ORANGE : '#16a34a') : ORANGE }}>{p.fait ? (p.defaut ? '⚠️ défaut noté' : '✅ conforme') : 'à faire'}</span>
            </li>
          ))}
        </ul>
        <a href={`/interne/mise-en-service/${c.id}`} className="mt-2 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold ring-[1.5px] ring-[#dfe3e8]">
          <Zap size={16} color={CYAN} /> {complet ? 'Voir ou refaire les mesures' : 'Faire les mesures'}
        </a>
      </div>
    );
  };

  const carte = (c: Chantier) => {
    const occupe = !!enCours && enCours.startsWith(c.id);
    const bloque = !c.ecritureAutorisee;
    const s = saisie[c.id] || { libelle: '', echeance: '' };
    // PV signé et envoyé : le poseur ne touche plus au PV ni aux réserves ; le chef de chantier doit donner un motif
    const verrou = !!c.verrouille;
    const verrouPoseur = verrou && poseur;
    const motifManquant = verrou && !poseur && (correction[c.id] || '').trim().length < 5;
    const pvFige = verrouPoseur || motifManquant;
    const avecMes = (c.miseEnService || []).length > 0;
    const libelleRapport = avecMes ? '📊 Rapport de mise en service' : '📊 Rapport de mesures';
    return (
      <Carte key={c.id} className="space-y-4">
        <TitreCarte
          icon={ClipboardCheck}
          extra={<a href={c.url} target="_blank" rel="noreferrer" aria-label="Ouvrir dans ClickUp" className="shrink-0"><ExternalLink size={18} color={CYAN} /></a>}
        >
          <a href={`/interne/fiches/${c.id}`} className="leading-tight underline decoration-[#dfe3e8] underline-offset-4">{c.nom}</a>
        </TitreCarte>
        <p className="text-[13px] font-semibold">
          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: c.couleurStatut || CYAN }} />
          {c.statut}
        </p>

        <BlocContact affaireId={c.id} differe />

        {verrou && (
          <div className="space-y-2 rounded-[14px] bg-white p-3 ring-[1.5px] ring-[#dfe3e8]">
            <p className="flex items-center gap-2 text-[14px] font-bold"><Lock size={16} color={ORANGE} /> PV signé et envoyé</p>
            {poseur ? (
              <p className="text-[13px]">PV et réserves sont verrouillés. S’il faut corriger, préviens le chef de chantier : lui seul peut le faire. Tu peux encore ajouter des photos.</p>
            ) : (
              <>
                <p className="text-[13px]">Pour corriger le PV ou les réserves, indique d’abord le motif : il est gardé en commentaire sur le chantier.</p>
                <input
                  className={CHAMP}
                  placeholder="Motif de la correction (ex. réserve oubliée sur le PV)"
                  value={correction[c.id] || ''}
                  onChange={(e) => setCorrection((x) => ({ ...x, [c.id]: e.target.value }))}
                />
              </>
            )}
          </div>
        )}

        {blocMiseEnService(c)}

        {/* Réserves (avant le PV : il les reprend) */}
        <div className="rounded-[14px] bg-white p-3">
          <p className="text-[14px] font-bold">🧾 Réserves{verrou ? ' 🔒' : ''}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.map((o) => {
              const choisi = c.reservesOptionId === o.id;
              return (
                <button
                  key={o.id}
                  disabled={occupe || choisi || bloque || pvFige}
                  onClick={() => envoyer(c, { action: 'reserves', optionId: o.id }, `${c.id}:res:${o.id}`)}
                  className={`rounded-full px-3 py-2 text-[13px] font-semibold transition-transform active:scale-95 ${choisi ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'} ${(bloque || pvFige) && !choisi ? 'opacity-50' : ''}`}
                  style={choisi ? { backgroundColor: couleurReserve(o.nom) } : undefined}
                >
                  {o.nom}
                </button>
              );
            })}
            {!c.reservesOptionId && <span className="self-center text-[12px] font-semibold" style={{ color: ORANGE }}>pas encore renseigné</span>}
          </div>

          {(c.niveau === 'mineure' || c.reserves.length > 0) && (
            <div className="mt-3 space-y-2">
              {c.reserves.map((r) => (
                <div key={r.id} className="rounded-[12px] px-3 py-2 text-[13px] ring-[1.5px] ring-[#dfe3e8]">
                  <p className="font-semibold">{r.faite ? '✅ ' : ''}{r.nom}</p>
                  <p style={{ color: r.responsables.length && r.echeance ? undefined : ORANGE }}>
                    {r.responsables.length ? r.responsables.join(', ') : 'sans responsable'} · {r.echeance ? `pour le ${jour(r.echeance)}` : 'sans échéance'}
                  </p>
                </div>
              ))}
              {c.niveau === 'mineure' && !bloque && !verrouPoseur && (
                <div className="space-y-2 pt-1">
                  <input
                    className={CHAMP}
                    placeholder="Réserve mineure (ex. capot à refixer)"
                    value={s.libelle}
                    onChange={(e) => setSaisie((x) => ({ ...x, [c.id]: { ...s, libelle: e.target.value } }))}
                  />
                  <input
                    className={CHAMP}
                    type="date"
                    value={s.echeance}
                    onChange={(e) => setSaisie((x) => ({ ...x, [c.id]: { ...s, echeance: e.target.value } }))}
                  />
                  <button
                    disabled={occupe || !s.libelle.trim() || !s.echeance || motifManquant}
                    onClick={async () => {
                      if (await envoyer(c, { action: 'reserve_ajout', libelle: s.libelle, echeance: s.echeance }, `${c.id}:ajout`)) {
                        setSaisie((x) => ({ ...x, [c.id]: { libelle: '', echeance: '' } }));
                      }
                    }}
                    className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold ring-[1.5px] ring-[#dfe3e8] ${!s.libelle.trim() || !s.echeance || motifManquant ? 'opacity-50' : ''}`}
                  >
                    <Plus size={16} color={CYAN} /> {enCours === `${c.id}:ajout` ? 'Création...' : `Ajouter la réserve (${c.techniciens?.length ? c.techniciens.join(', ') : 'à mon nom'})`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PV, rapport et photos */}
        {([['pv', '📂 PV Réception', c.pv, FileText, 'image/*,application/pdf'], ['rapport', libelleRapport, (c.rapport || []) as Fichier[], Gauge, 'application/pdf,image/*'], ['photos', '📸 Photos Chantier', c.photos, Camera, 'image/*']] as const).map(([cible, libelle, liste, Icone, accept]) => {
          const fige = cible === 'pv' && pvFige;
          const rapportAuto = cible === 'rapport' && avecMes;
          return (
            <div key={cible} className="rounded-[14px] bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[14px] font-bold">{libelle}{cible === 'pv' && verrou ? ' 🔒' : ''}</p>
                <span className="text-[12px] font-semibold" style={{ color: liste.length ? '#16a34a' : ORANGE }}>
                  {liste.length ? `${liste.length} fichier${liste.length > 1 ? 's' : ''}` : rapportAuto ? 'créé à la fin des mesures' : cible === 'pv' ? 'à faire signer' : 'aucun fichier'}
                </span>
              </div>
              {rapportAuto && !liste.length && <p className="mt-1 text-[13px]">L’appli le crée toute seule quand tous les éléments sont conformes.</p>}
              {cible === 'pv' && !liste.length && <p className="mt-1 text-[13px]">Le client signe au doigt sur le téléphone, l’appli crée le PV avec les réserves déclarées plus haut.</p>}
              {/* Aperçu : vignette pour les images, icône pour les PDF, ouverture en grand dans un nouvel onglet */}
              {liste.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {liste.map((f, i) => {
                    const lien = `/api/interne/fichier?taskId=${encodeURIComponent(c.id)}&cible=${cible}&id=${encodeURIComponent(f.id)}`;
                    return (
                      <a key={f.id || i} href={lien} target="_blank" rel="noreferrer" title={f.nom} className="block overflow-hidden rounded-[10px] ring-[1.5px] ring-[#dfe3e8]">
                        {f.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`${lien}&mini=1`} alt={f.nom} loading="lazy" className="aspect-square w-full object-cover" />
                        ) : (
                          <div className="flex aspect-square flex-col items-center justify-center gap-1 p-2 text-center">
                            <FileText size={22} color={CYAN} />
                            <span className="line-clamp-2 break-all text-[11px]">{f.nom}</span>
                          </div>
                        )}
                      </a>
                    );
                  })}
                </div>
              )}
              {cible === 'pv' && !verrouPoseur && !bloque && (
                <a
                  href={`/interne/pv/${c.id}`}
                  className="mt-2 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold text-white"
                  style={{ backgroundColor: CYAN }}
                >
                  <PenLine size={16} /> {verrou ? 'Corriger : refaire signer le PV' : liste.length ? 'Refaire signer le PV' : 'Faire signer le PV sur le téléphone'}
                </a>
              )}
              {rapportAuto && c.miseEnServiceComplete && !liste.length && (
                <button
                  disabled={bloque || occupe}
                  onClick={() => envoyer(c, { action: 'rapport' }, `${c.id}:rapport-auto`, '📊 Rapport de mise en service créé.')}
                  className={`mt-2 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold text-white ${bloque || occupe ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: CYAN }}
                >
                  <Gauge size={16} /> {enCours === `${c.id}:rapport-auto` ? 'Création...' : 'Créer le rapport de mise en service'}
                </button>
              )}
              {!(cible === 'pv' && verrouPoseur) && (
                <label className={`mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold ring-[1.5px] ring-[#dfe3e8] ${bloque || occupe || fige ? 'pointer-events-none opacity-50' : ''}`}>
                  <Icone size={16} color={CYAN} />
                  {enCours === `${c.id}:${cible}` ? 'Envoi...' : cible === 'pv' ? (verrou ? 'Corriger : déposer un PV papier' : 'Joindre un PV papier signé (secours)') : cible === 'rapport' ? (rapportAuto ? 'Joindre un PDF du contrôleur (facultatif)' : 'Ajouter le rapport de mesures') : 'Ajouter des photos'}
                  <input type="file" accept={accept} multiple={cible === 'photos'} className="hidden" onChange={(e) => { deposer(c, cible, e.target.files); e.target.value = ''; }} />
                </label>
              )}
            </div>
          );
        })}

        {c.motifs.length > 0 && (
          <Alerte>Avant la réception : {c.motifs.join(' ; ')}.</Alerte>
        )}
        {c.motifs.length === 0 && c.avertissements.length > 0 && <p className="text-[13px] font-semibold" style={{ color: ORANGE }}>{c.avertissements.join(' ; ')}</p>}

        {poseur ? (
          <BoutonPrincipal
            inactif={c.motifs.length > 0 || bloque}
            disabled={occupe || c.motifs.length > 0 || bloque}
            onClick={() => envoyer(c, { action: 'envoyer' }, `${c.id}:envoyer`, '📋 Envoyé au chargé d\'opération pour validation.')}
          >
            {enCours === `${c.id}:envoyer` ? 'Envoi...' : c.motifs.length ? `Il manque ${c.motifs.length} élément${c.motifs.length > 1 ? 's' : ''}` : 'Envoyer au chargé d\'opération'}
          </BoutonPrincipal>
        ) : (
          <BoutonPrincipal
            inactif={c.motifs.length > 0 || bloque}
            disabled={occupe || c.motifs.length > 0 || bloque}
            onClick={() => envoyer(c, { action: 'terminer' }, `${c.id}:terminer`, '🏁 Réception validée : passage au Parc en cours.')}
          >
            {enCours === `${c.id}:terminer` ? 'Envoi...' : c.motifs.length ? `Il manque ${c.motifs.length} élément${c.motifs.length > 1 ? 's' : ''}` : 'Valider la réception'}
          </BoutonPrincipal>
        )}
        {bloque && <p className="text-[12px]">Preview : seules les fiches « Test » sont modifiables.</p>}
        {messages[c.id] && <Alerte>{messages[c.id]}</Alerte>}
      </Carte>
    );
  };

  const aReceptionner = chantiers.filter((c) => normal(c.statut).includes('realise'));
  const enChantier = chantiers.filter((c) => !normal(c.statut).includes('realise'));
  const terminees = Object.entries(messages).filter(([id, t]) => t.startsWith('🏁') && !chantiers.some((c) => c.id === id));

  const section = (titre: string, liste: Chantier[]) => liste.length > 0 && (
    <>
      <div className="h-2" />
      <Repere>{titre} ({liste.length})</Repere>
      {liste.map(carte)}
    </>
  );

  return (
    <PageAppli>
      <EnTeteAppli
        surtitre={poseur ? 'Technicien poseur' : 'Chargé d\'opération'}
        titre={poseur ? 'Réception sur place' : 'Valider les réceptions'}
        retour={{ href: '/interne/espace', libelle: poseur ? 'Mon travail' : 'Mon espace' }}
      />
      <ContenuAppli className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px]">
            {poseur
              ? 'Fais la mise en service de chaque élément, déclare les réserves, fais signer le PV au client sur le téléphone, ajoute des photos, puis envoie au chargé d\'opération. Rapport et PV se créent tout seuls.'
              : 'Contrôle la mise en service et son rapport, le PV, les photos et les réserves, puis valide : le chantier passe au Parc.'}
          </p>
          <button onClick={charger} aria-label="Actualiser" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-95">
            <RefreshCw size={18} color={CYAN} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {preview && <Alerte>Preview : lecture de tout le planning, modification des fiches « Test » uniquement.</Alerte>}
        {terminees.map(([id, t]) => <Alerte key={id}>{t}</Alerte>)}

        {loading && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement des chantiers...</p>
          </Carte>
        )}
        {!loading && erreur && <Alerte>{erreur}</Alerte>}
        {!loading && !erreur && chantiers.length === 0 && (
          <Carte className="p-8 text-center"><p className="text-[15px] font-semibold">{poseur ? 'Aucun chantier en cours ou réalisé.' : 'Aucune réception à valider.'}</p></Carte>
        )}
        {!loading && !erreur && (
          <>
            {poseur ? (
              <>
                {section('En chantier', enChantier)}
                {section('Envoyés ou à compléter', aReceptionner)}
              </>
            ) : section('À valider', aReceptionner)}
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
