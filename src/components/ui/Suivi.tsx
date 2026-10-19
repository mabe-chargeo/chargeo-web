"use client";

// Suivi d'une commande de matériel ou d'un dossier ADVENIR sur la fiche de l'application (19/10/2026, maquette
// MAQUETTE_SUIVI-COMMANDE-ADVENIR_2026-10-19_v2.png validée par Matthieu à 11 h 03 : « il faut au maximum que tu
// réutilises des composants existants »). Mêmes cartes que la vente (src/components/ui/Vente.tsx) :
// - « La commande » / « Le dossier », comme « Le projet » : les champs de l'étape, puis Enregistrer ;
// - « Suite de la commande » / « Suite du dossier », comme « Suite de la vente » : statut actuel, bouton orange de
//   l'étape suivante, boutons blancs, confirmation dans le cadre orange pour les étapes qui ferment.
// 19/10, 11 h 39 : « Photo du bon de livraison » dans la confirmation « Reçu / vérifié » (maquette v2), avec les briques
// existantes : BoutonFichier (Appli.tsx), la préparation des photos de la réception (src/lib/preparerFichier.ts) et la
// ligne document commune (LigneDocument.tsx) pour la vignette.
// 19/10, 12 h 13 (Matthieu : « Il n'y a pas la carte photo », commande déjà reçue) : une fois la commande reçue, la ligne
// « 📎 Bon de livraison » reste dans « Suite de la commande », avec le même bouton, pour joindre la photo après coup
// (une fois jointe, la photo est montrée par la carte Documents de la fiche, pas en double ici).
// Champs, étapes et boutons : src/lib/suivi.ts ; lecture et écriture : /api/interne/suivi. Sans les droits, rien ne
// s'affiche (la fiche reste en lecture).
import { useEffect, useState } from 'react';
import { Camera, Check, ClipboardList, RefreshCw, Send } from 'lucide-react';
import { Carte, TitreCarte, Alerte, BoutonPrincipal, BoutonSecondaire, BoutonFichier, PastilleChoix, CadreConfirmation, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';
import { LigneDocument, type FichierApercu } from '@/components/appli/LigneDocument';
import { preparerFichier, TAILLE_MAX_ENVOI } from '@/lib/preparerFichier';
import type { GenreChamp } from '@/lib/suivi';

type ChampSuivi = { cle: string; libelle: string; genre: GenreChamp; valeur: string; exemple?: string; absent?: boolean; options?: string[]; aide?: { texte: string; orange?: boolean } };
type ActionSuivi = { cible: string; libelle: string; principal: boolean; confirmer?: string; manque?: string | null };
type Etat = {
  titre: string; titreSuite: string; enregistrer: string; enregistre: string; statut: string; close: string;
  champs: ChampSuivi[]; actions: ActionSuivi[]; validation: { par: string; peutValider: boolean } | null;
  bonLivraison?: { fichiers: FichierApercu[]; recu?: boolean } | null;
};
const URL = '/api/interne/suivi';
const VERT = '#16a34a';
const sansEmoji = (s: string) => s.replace(/^[^A-Za-z0-9\u00C0-\u017F]+/, '').trim();

async function poster(corps: any): Promise<{ ok: boolean; j: any }> {
  try {
    const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    const j = await res.json().catch(() => ({}));
    return { ok: res.ok && !!j?.success, j };
  } catch {
    return { ok: false, j: { error: 'Pas de réseau : rien n’a été modifié' } };
  }
}

function Message({ texte }: { texte: string }) {
  return <p className="flex items-center gap-1.5 px-1 text-[14px] font-semibold" style={{ color: VERT }}><Check size={16} /> {texte}</p>;
}

export function Suivi({ ficheId, onChange }: { ficheId: string; onChange?: () => void }) {
  const [e, setE] = useState<Etat | null>(null);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<{ carte: 'champs' | 'suite'; texte: string } | null>(null);
  const [message, setMessage] = useState<{ carte: 'champs' | 'suite'; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [confirmer, setConfirmer] = useState<ActionSuivi | null>(null);

  const remplir = (j: Etat) => {
    setE(j);
    setValeurs(Object.fromEntries((j.champs || []).map((c) => [c.cle, c.valeur])));
  };
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${URL}?id=${encodeURIComponent(ficheId)}`, { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        // Pas les droits : la fiche reste en lecture, sans carte de suivi
        if (res.ok && j?.success) remplir(j as Etat);
        else if (res.status !== 403) setErreur({ carte: 'suite', texte: j?.error || `Lecture impossible (${res.status})` });
      } catch {
        setErreur({ carte: 'suite', texte: 'Pas de réseau : le suivi ne peut pas être lu.' });
      }
    })();
  }, [ficheId]);

  if (!e) return erreur ? <Alerte>{erreur.texte}</Alerte> : null;

  const changes = e.champs.filter((c) => (valeurs[c.cle] || '') !== (c.valeur || ''));
  const apres = (carte: 'champs' | 'suite', ok: boolean, j: any, reussite: string) => {
    if (j?.champs) remplir(j as Etat);
    if (!ok) setErreur({ carte, texte: j?.error || 'Rien n’a été modifié.' });
    else { setMessage({ carte, texte: reussite }); onChange?.(); }
  };
  const debut = () => { setEnvoi(true); setErreur(null); setMessage(null); };

  const enregistrer = async () => {
    debut();
    const { ok, j } = await poster({ id: ficheId, action: 'champs', valeurs: Object.fromEntries(changes.map((c) => [c.cle, valeurs[c.cle] || ''])) });
    apres('champs', ok, j, e.enregistre);
    setEnvoi(false);
  };
  const valider = async () => {
    debut();
    const { ok, j } = await poster({ id: ficheId, action: 'valider' });
    apres('suite', ok, j, 'Achat validé.');
    setEnvoi(false);
  };
  const passer = async (a: ActionSuivi) => {
    debut();
    const { ok, j } = await poster({ id: ficheId, action: 'statut', cible: a.cible });
    apres('suite', ok, j, `Passé en ${sansEmoji(String(j?.statut || a.libelle)).toLowerCase()}.`);
    setConfirmer(null);
    setEnvoi(false);
  };
  // Photo du bon de livraison : réduite sur le téléphone, puis déposée dans son champ
  const deposerBonLivraison = async (liste: FileList | null) => {
    if (!liste?.length) return;
    debut();
    const fichier = await preparerFichier(liste[0]);
    if (fichier.size > TAILLE_MAX_ENVOI) { setErreur({ carte: 'suite', texte: 'Fichier trop lourd (4 Mo maximum).' }); setEnvoi(false); return; }
    const form = new FormData();
    form.append('id', ficheId);
    form.append('fichier', fichier);
    try {
      const res = await fetch(URL, { method: 'POST', body: form });
      const j = await res.json().catch(() => ({}));
      apres('suite', res.ok && !!j?.success, j, 'Bon de livraison enregistré.');
    } catch {
      setErreur({ carte: 'suite', texte: 'Pas de réseau : la photo n’a pas été envoyée.' });
    }
    setEnvoi(false);
  };
  const choisir = (a: ActionSuivi) => (a.confirmer ? setConfirmer(a) : passer(a));
  const absents = e.champs.filter((c) => c.absent).map((c) => c.libelle);

  return (
    <>
      {/* Comme « Le projet » : les champs de l'étape */}
      <Carte className="space-y-4">
        <TitreCarte icon={ClipboardList}>{e.titre}</TitreCarte>
        {e.champs.filter((c) => !c.absent).map((c) => {
          const id = `${c.cle}-${ficheId}`;
          const v = valeurs[c.cle] || '';
          const changer = (x: string) => setValeurs({ ...valeurs, [c.cle]: x });
          return (
            <div key={c.cle} className="space-y-2">
              {c.genre === 'choix' ? (
                <>
                  <p className={ETIQUETTE}>{c.libelle}</p>
                  <div className="flex flex-wrap gap-2">
                    {(c.options || []).map((o) => <PastilleChoix key={o} actif={v === o} onClick={() => changer(v === o ? '' : o)}>{o}</PastilleChoix>)}
                  </div>
                </>
              ) : (
                <>
                  <label className={ETIQUETTE} htmlFor={id}>{c.libelle}</label>
                  <input
                    id={id}
                    className={CHAMP}
                    type={c.genre === 'date' ? 'date' : c.genre === 'nombre' ? 'number' : c.genre === 'url' ? 'url' : 'text'}
                    inputMode={c.genre === 'nombre' ? 'decimal' : c.genre === 'url' ? 'url' : undefined}
                    min={c.genre === 'nombre' ? 0 : undefined}
                    value={v}
                    onChange={(ev) => changer(ev.target.value)}
                    placeholder={c.exemple}
                  />
                </>
              )}
              {c.aide && <p className="ml-1 text-[13px] font-semibold" style={{ color: c.aide.orange ? ORANGE : CYAN }}>{c.aide.texte}</p>}
            </div>
          );
        })}
        {absents.length > 0 && <p className="text-[13px]">Champ absent de cette liste : {absents.join(', ')}.</p>}
        {erreur?.carte === 'champs' && <Alerte>{erreur.texte}</Alerte>}
        {message?.carte === 'champs' && <Message texte={message.texte} />}
        <BoutonPrincipal type="button" onClick={enregistrer} disabled={envoi || !changes.length} inactif={envoi || !changes.length}>
          {envoi ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />} {envoi ? 'Enregistrement…' : e.enregistrer}
        </BoutonPrincipal>
      </Carte>

      {/* Comme « Suite de la vente » : statut actuel et boutons de l'étape */}
      <Carte accent className="space-y-3">
        <TitreCarte icon={Send}>{e.titreSuite}</TitreCarte>
        <p className="text-[14px]">
          Statut actuel : <strong>{sansEmoji(e.statut) || '–'}</strong>.
          {e.validation && (e.validation.par ? <> Achat validé par {e.validation.par}.</> : <> Achat validé par : <strong style={{ color: ORANGE }}>personne</strong>.</>)}
        </p>
        {e.close && <p className="text-[14px]">{e.close}</p>}
        {e.bonLivraison?.recu && !e.bonLivraison.fichiers.length && (
          <LigneDocument titre="📎 Bon de livraison" fichiers={[]} taskId={ficheId} cible="bonLivraison" vide="pas encore de photo">
            <div className="mt-2">
              <BoutonFichier accept="image/*,application/pdf" inactif={envoi} onFichiers={deposerBonLivraison}>
                <Camera size={18} /> {envoi ? 'Envoi…' : 'Photo du bon de livraison'}
              </BoutonFichier>
            </div>
          </LigneDocument>
        )}
        {e.validation && !e.validation.par && e.validation.peutValider && !confirmer && (
          <BoutonSecondaire compact onClick={valider} disabled={envoi}><Check size={18} /> Je valide l’achat</BoutonSecondaire>
        )}
        {erreur?.carte === 'suite' && <Alerte>{erreur.texte}</Alerte>}
        {message?.carte === 'suite' && <Message texte={message.texte} />}

        {!confirmer && e.actions.length > 0 && (
          <div className="space-y-2 pt-1">
            {e.actions.map((a) => a.principal ? (
              <div key={a.cible} className="space-y-2">
                <BoutonPrincipal type="button" onClick={() => choisir(a)} disabled={envoi || !!a.manque} inactif={envoi || !!a.manque}>{a.libelle}</BoutonPrincipal>
                {a.manque && <p className="px-1 text-[12px] text-slate-500">{a.manque}</p>}
              </div>
            ) : (
              <BoutonSecondaire key={a.cible} compact onClick={() => choisir(a)} disabled={envoi || !!a.manque}>{a.libelle}</BoutonSecondaire>
            ))}
          </div>
        )}

        {confirmer && (
          <CadreConfirmation>
            <p className="text-[15px] font-semibold leading-relaxed">{confirmer.confirmer}</p>
            {confirmer.cible === 'recu' && e.bonLivraison && (
              <>
                {e.bonLivraison.fichiers.length > 0 && <LigneDocument titre="📎 Bon de livraison" fichiers={e.bonLivraison.fichiers} taskId={ficheId} cible="bonLivraison" />}
                <BoutonFichier accept="image/*,application/pdf" inactif={envoi} onFichiers={deposerBonLivraison}>
                  <Camera size={18} /> {envoi ? 'Envoi…' : e.bonLivraison.fichiers.length ? 'Ajouter une autre photo' : 'Photo du bon de livraison'}
                </BoutonFichier>
              </>
            )}
            <BoutonPrincipal type="button" onClick={() => passer(confirmer)} disabled={envoi} inactif={envoi}>
              {envoi ? 'Envoi…' : `Confirmer : ${sansEmoji(confirmer.libelle).toLowerCase()}`}
            </BoutonPrincipal>
            <BoutonSecondaire compact onClick={() => setConfirmer(null)} disabled={envoi}>Annuler</BoutonSecondaire>
          </CadreConfirmation>
        )}
      </Carte>
    </>
  );
}
