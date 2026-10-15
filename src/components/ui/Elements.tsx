"use client";

// Éléments d'un scénario et gestion du scénario dans l'outil terrain (étape 3 du plan du 15/10/2026, PR #51).
// Synthèse du 14/10, sections 3, 5 et 9 : éléments créés d'office selon le segment, noms automatiques (les cheminements
// suivent leur départ et leur arrivée), archiver et restaurer en cascade, dupliquer (branche, borne seule, scénario),
// droits par rôle contrôlés côté serveur. Le relevé élément par élément arrive à l'étape 4.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Archive, Copy, GitBranch, Layers, Pencil, Plus, RotateCcw } from 'lucide-react';
import { Carte, TitreCarte, Alerte, BoutonPrincipal, Repere, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { LABEL } from '@/components/charte/couleurs';
import { LIBELLE_NATURE_LONG, LIBELLE_SEGMENT, ORDRE_NATURE, SEGMENTS_BORNE, specsParDefaut, type Materiel } from '@/lib/elementsModele';
import type { Nature, Segment } from '@/lib/champsClickUp';

type El = {
  id: string;
  nom: string;
  nature: Nature | null;
  archive: boolean;
  depart: string | null;
  arrivee: string | null;
  typeCheminement: string | null;
};

type Donnees = {
  scenario: { id: string; nom: string; statut: string; segment: Segment | null; lienDevis: boolean; projetId: string };
  elements: El[];
  archives: El[];
  droits: { scenarios: boolean; elements: boolean };
};

const URL_ELEMENTS = '/api/interne/elements';
const URL_SCENARIO = '/api/interne/scenario';
const SEGMENTS = Object.keys(LIBELLE_SEGMENT) as Segment[];
const estSegment = (s: string): s is Segment => (SEGMENTS as string[]).includes(s);
const NATURES_AJOUT: Nature[] = ['borne', 'priseRenforcee', 'cheminement', 'tdIrveCoffret', 'raccordement', 'communication', 'autre', 'boiteDerivation'];
const TYPES_CHEMINEMENT: { cle: string; libelle: string }[] = [
  { cle: 'alimentation', libelle: 'Alimentation' },
  { cle: 'artere', libelle: 'Artère' },
  { cle: 'liaisonData', libelle: 'Liaison data' },
];
const libelleType = (cle: string | null) => TYPES_CHEMINEMENT.find((t) => t.cle === cle)?.libelle || '';
const libelleScenario = (nom: string) => nom.replace(/^.*?Sc[ée]nario\s+[A-Za-z0-9]+\s*:\s*/, '').trim();

function PetitBouton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold ring-[1.5px] ring-[#dfe3e8] disabled:opacity-50"
      style={{ color: LABEL }}
    >
      {children}
    </button>
  );
}

function Choix({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold ring-[1.5px] ${actif ? 'bg-[#0097b2] text-white ring-[#0097b2]' : 'bg-white ring-[#dfe3e8]'}`}
      style={actif ? undefined : { color: LABEL }}
    >
      {children}
    </button>
  );
}

function Ligne({ titre, sousTitre, children }: { titre: string; sousTitre: string; children?: ReactNode }) {
  return (
    <div className="rounded-[18px] bg-white p-4 ring-[1.5px] ring-[#eceef1]">
      <p className="text-[16px] font-bold leading-tight">{titre}</p>
      <p className="mt-1 text-[13px]">{sousTitre}</p>
      {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

async function poster(url: string, corps: any): Promise<{ ok: boolean; j: any }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    const j = await res.json().catch(() => ({}));
    return { ok: res.ok && !!j?.success, j };
  } catch {
    return { ok: false, j: { error: "Pas de réseau : rien n'a été modifié." } };
  }
}

export function ElementsScenario({ scenarioId, segmentInitial = '' }: { scenarioId: string; segmentInitial?: string }) {
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);
  // Création des éléments par défaut
  const [segment, setSegment] = useState('');
  const [materiel, setMateriel] = useState<Materiel>('borne');
  const [places, setPlaces] = useState('');
  // Ajout d'un élément
  const [nature, setNature] = useState<Nature>('borne');
  const [depart, setDepart] = useState('');
  const [arrivee, setArrivee] = useState('');
  const [typeCh, setTypeCh] = useState('alimentation');
  const [voirArchives, setVoirArchives] = useState(false);

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`${URL_ELEMENTS}?scenarioId=${encodeURIComponent(scenarioId)}`, { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) { setErreur(j?.error ? `${j.error}.` : 'Les éléments ne peuvent pas être lus.'); return; }
      setD(j as Donnees);
    } catch {
      setErreur('Pas de réseau : les éléments ne peuvent pas être lus.');
    }
  }, [scenarioId]);

  useEffect(() => { charger(); }, [charger]);

  // Action sur le serveur, puis relecture. Renvoie la réponse (ou null en cas d'échec).
  const agir = async (url: string, corps: any, recharger = true): Promise<any | null> => {
    setOccupe(true);
    setErreur('');
    setMessage('');
    const { ok, j } = await poster(url, corps);
    if (j?.aConfirmer) { setOccupe(false); return j; }
    if (!ok) { setErreur(j?.error ? `${j.error}.` : "L'action n'a pas abouti."); setOccupe(false); return null; }
    if (Array.isArray(j?.erreurs) && j.erreurs.length) setErreur(`À reprendre à la main dans ClickUp : ${j.erreurs.join(', ')}.`);
    if (recharger) await charger();
    setOccupe(false);
    return j;
  };

  // Archivage avec confirmation, puis avertissement devis si le serveur le demande
  const archiverAvecGarde = async (url: string, corps: any, texte: string, recharger = true): Promise<any | null> => {
    if (!window.confirm(texte)) return null;
    const j = await agir(url, corps, recharger);
    if (j?.aConfirmer) {
      if (!window.confirm(String(j.avertissement || 'Continuer ?'))) return null;
      return agir(url, { ...corps, confirme: true }, recharger);
    }
    return j;
  };

  if (!d) {
    return (
      <div className="space-y-3">
        <Repere>Éléments du scénario</Repere>
        {erreur ? <Alerte>{erreur}</Alerte> : <p className="px-1 text-[14px]">Chargement des éléments…</p>}
      </div>
    );
  }

  const peut = d.droits.elements;
  const cop = d.scenario.segment === 'COP';
  const nomDe = (id: string | null) => (id ? d.elements.find((e) => e.id === id)?.nom || 'archivé' : '');
  const ordre = (n: Nature | null) => ORDRE_NATURE[n ?? 'autre'];
  const equipements = d.elements
    .filter((e) => e.nature !== 'cheminement')
    .sort((a, b) => ordre(a.nature) - ordre(b.nature) || a.nom.localeCompare(b.nom, 'fr', { numeric: true }));
  const cheminements = d.elements
    .filter((e) => e.nature === 'cheminement')
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }));
  const liesA = (id: string) => cheminements.filter((c) => c.depart === id || c.arrivee === id).length;

  const segmentChoisi: Segment = estSegment(segment) ? segment : d.scenario.segment || (estSegment(segmentInitial) ? segmentInitial : 'RES');
  const nbPlaces = Math.max(0, parseInt(places, 10) || 0);
  const apercu = specsParDefaut(segmentChoisi, materiel, nbPlaces).map((s) => s.nom);

  const renommer = async (e: El) => {
    const nom = window.prompt('Nouveau nom', e.nom);
    if (!nom || !nom.trim() || nom.trim() === e.nom) return;
    const j = await agir(URL_ELEMENTS, { action: 'renommer', id: e.id, nom: nom.trim() });
    if (j) setMessage(`Renommé en « ${nom.trim()} ».`);
  };
  const archiver = async (e: El) => {
    const n = e.nature === 'cheminement' ? 0 : liesA(e.id);
    const suite = n === 0 ? '' : n === 1 ? ' Le cheminement relié sera archivé aussi.' : ` Les ${n} cheminements reliés seront archivés aussi.`;
    const j = await archiverAvecGarde(URL_ELEMENTS, { action: 'archiver', id: e.id }, `Archiver ${e.nom} ?${suite} Restaurable.`);
    if (j?.success) setMessage(`Archivé : ${(j.crees || []).join(', ')}.`);
  };
  const restaurer = async (e: El) => {
    const j = await agir(URL_ELEMENTS, { action: 'restaurer', id: e.id });
    if (j?.success) setMessage(`Restauré : ${(j.crees || []).join(', ')}.`);
  };
  const dupliquer = async (e: El, action: 'dupliquerBranche' | 'dupliquerBorne') => {
    const j = await agir(URL_ELEMENTS, { action, id: e.id });
    if (j?.success) setMessage(`Créé : ${(j.crees || []).join(', ')}. Matériel recopié, mesures à refaire.`);
  };
  const creerDefaut = async () => {
    const j = await agir(URL_ELEMENTS, { action: 'defaut', scenarioId, segment: segmentChoisi, materiel, nbPlaces });
    if (j?.success) setMessage(`${(j.crees || []).length} éléments créés.`);
  };
  const ajouter = async () => {
    const corps: any = { action: 'ajouter', scenarioId, nature };
    if (nature === 'cheminement') Object.assign(corps, { depart: depart || undefined, arrivee: arrivee || undefined, typeCheminement: typeCh });
    const j = await agir(URL_ELEMENTS, corps);
    if (j?.success) { setMessage(`Ajouté : ${(j.crees || []).join(', ')}.`); setDepart(''); setArrivee(''); }
  };

  // Scénario
  const renommerScenario = async () => {
    const actuel = libelleScenario(d.scenario.nom);
    const nom = window.prompt('Nouveau nom du scénario (la lettre est gardée)', actuel);
    if (!nom || !nom.trim() || nom.trim() === actuel) return;
    const j = await agir(URL_SCENARIO, { action: 'renommer', id: scenarioId, nom: nom.trim() }, false);
    if (j?.success) window.location.reload();
  };
  const dupliquerScenario = async () => {
    if (!window.confirm(`Dupliquer ce scénario avec ses ${d.elements.length} éléments ? Matériel recopié, mesures à refaire.`)) return;
    const j = await agir(URL_SCENARIO, { action: 'dupliquer', id: scenarioId }, false);
    if (j?.success && j.id) window.location.href = `/interne/metre/${j.id}`;
  };
  const archiverScenario = async () => {
    const n = d.elements.length;
    const texte = `Archiver ${d.scenario.nom}${n ? ` et ses ${n} élément${n > 1 ? 's' : ''}` : ''} ? Restaurable depuis la fiche.`;
    const j = await archiverAvecGarde(URL_SCENARIO, { action: 'archiver', id: scenarioId }, texte, false);
    if (j?.success) window.location.href = `/interne/metre/${d.scenario.projetId}`;
  };

  return (
    <div className="space-y-4">
      <Repere>Éléments du scénario</Repere>
      {message && <p className="px-1 text-[14px] font-semibold leading-relaxed" style={{ color: LABEL }}>{message}</p>}
      {erreur && <Alerte>{erreur}</Alerte>}

      {d.elements.length === 0 ? (
        <Carte accent className="space-y-4">
          <TitreCarte icon={Layers}>Créer les éléments</TitreCarte>
          <div className="space-y-2">
            <label className={ETIQUETTE} htmlFor={`segment-${scenarioId}`}>Segment du scénario</label>
            <select id={`segment-${scenarioId}`} className={CHAMP} value={segmentChoisi} onChange={(e) => setSegment(e.target.value)}>
              {SEGMENTS.map((s) => <option key={s} value={s}>{LIBELLE_SEGMENT[s]}</option>)}
            </select>
          </div>
          {SEGMENTS_BORNE.includes(segmentChoisi) && (
            <div className="flex flex-wrap gap-2">
              <Choix actif={materiel === 'borne'} onClick={() => setMateriel('borne')}>Borne</Choix>
              <Choix actif={materiel === 'prise'} onClick={() => setMateriel('prise')}>Prise renforcée</Choix>
            </div>
          )}
          {segmentChoisi === 'COP' && (
            <div className="space-y-2">
              <label className={ETIQUETTE} htmlFor={`places-${scenarioId}`}>Nombre de places</label>
              <input id={`places-${scenarioId}`} type="number" inputMode="numeric" min={0} className={CHAMP} value={places} onChange={(e) => setPlaces(e.target.value)} placeholder="Ex : 30" />
              <p className="ml-1 text-[13px] leading-relaxed">Une boîte de dérivation par tranche de 4 places.</p>
            </div>
          )}
          <p className="text-[14px] leading-relaxed"><strong>Seront créés :</strong> {apercu.join(' ; ')}.</p>
          {peut ? (
            <BoutonPrincipal type="button" onClick={creerDefaut} disabled={occupe} inactif={occupe}>
              <Plus size={20} /> {occupe ? 'Création…' : `Créer les ${apercu.length} éléments`}
            </BoutonPrincipal>
          ) : (
            <p className="text-[14px]">Réservé au commercial, au chargé d'opération et à la direction.</p>
          )}
        </Carte>
      ) : (
        <>
          <Carte className="space-y-3">
            <TitreCarte icon={Layers} extra={<span className="text-[13px] font-bold">{equipements.length}</span>}>Équipements</TitreCarte>
            {equipements.map((e) => (
              <Ligne key={e.id} titre={e.nom} sousTitre={e.nature ? LIBELLE_NATURE_LONG[e.nature] : 'Nature à renseigner'}>
                {peut && (
                  <>
                    <PetitBouton onClick={() => renommer(e)} disabled={occupe}><Pencil size={14} /> Renommer</PetitBouton>
                    {e.nature === 'tdIrveCoffret' && !cop && (
                      <PetitBouton onClick={() => dupliquer(e, 'dupliquerBranche')} disabled={occupe}><Copy size={14} /> Dupliquer la branche</PetitBouton>
                    )}
                    {(e.nature === 'borne' || e.nature === 'priseRenforcee') && (
                      <PetitBouton onClick={() => dupliquer(e, 'dupliquerBorne')} disabled={occupe}><Copy size={14} /> Dupliquer la borne seule</PetitBouton>
                    )}
                    <PetitBouton onClick={() => archiver(e)} disabled={occupe}><Archive size={14} /> Archiver</PetitBouton>
                  </>
                )}
              </Ligne>
            ))}
          </Carte>

          <Carte className="space-y-3">
            <TitreCarte icon={GitBranch} extra={<span className="text-[13px] font-bold">{cheminements.length}</span>}>Cheminements</TitreCarte>
            {cheminements.length === 0 && <p className="text-[14px]">Aucun cheminement.</p>}
            {cheminements.map((c) => (
              <Ligne
                key={c.id}
                titre={c.nom}
                sousTitre={[libelleType(c.typeCheminement), !c.depart ? 'départ à choisir' : '', !c.arrivee && c.typeCheminement !== 'artere' ? 'arrivée à choisir' : '']
                  .filter(Boolean).join(' · ') || `${nomDe(c.depart)} → ${nomDe(c.arrivee)}`}
              >
                {peut && (
                  <>
                    <PetitBouton onClick={() => renommer(c)} disabled={occupe}><Pencil size={14} /> Renommer</PetitBouton>
                    <PetitBouton onClick={() => archiver(c)} disabled={occupe}><Archive size={14} /> Archiver</PetitBouton>
                  </>
                )}
              </Ligne>
            ))}
          </Carte>

          {peut && (
            <Carte className="space-y-4">
              <TitreCarte icon={Plus}>Ajouter un élément</TitreCarte>
              <div className="space-y-2">
                <label className={ETIQUETTE} htmlFor={`nature-${scenarioId}`}>Nature</label>
                <select id={`nature-${scenarioId}`} className={CHAMP} value={nature} onChange={(e) => setNature(e.target.value as Nature)}>
                  {NATURES_AJOUT.map((n) => <option key={n} value={n}>{LIBELLE_NATURE_LONG[n]}</option>)}
                </select>
              </div>
              {nature === 'cheminement' && (
                <>
                  <div className="space-y-2">
                    <label className={ETIQUETTE} htmlFor={`type-${scenarioId}`}>Type de cheminement</label>
                    <select id={`type-${scenarioId}`} className={CHAMP} value={typeCh} onChange={(e) => setTypeCh(e.target.value)}>
                      {TYPES_CHEMINEMENT.map((t) => <option key={t.cle} value={t.cle}>{t.libelle}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={ETIQUETTE} htmlFor={`depart-${scenarioId}`}>🔌 Départ</label>
                    <select id={`depart-${scenarioId}`} className={CHAMP} value={depart} onChange={(e) => setDepart(e.target.value)}>
                      <option value="">À choisir plus tard</option>
                      {equipements.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={ETIQUETTE} htmlFor={`arrivee-${scenarioId}`}>🏁 Arrivée</label>
                    <select id={`arrivee-${scenarioId}`} className={CHAMP} value={arrivee} onChange={(e) => setArrivee(e.target.value)}>
                      <option value="">{typeCh === 'artere' ? "Fin d'artère" : 'À choisir plus tard'}</option>
                      {equipements.filter((e) => e.id !== depart).map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                    </select>
                  </div>
                </>
              )}
              <BoutonPrincipal type="button" onClick={ajouter} disabled={occupe} inactif={occupe}>
                <Plus size={20} /> {occupe ? 'En cours…' : 'Ajouter'}
              </BoutonPrincipal>
            </Carte>
          )}
        </>
      )}

      {d.archives.length > 0 && (
        <Carte className="space-y-3">
          <button type="button" onClick={() => setVoirArchives(!voirArchives)} className="w-full text-left">
            <TitreCarte icon={Archive} extra={<span className="text-[13px] font-bold">{voirArchives ? 'Masquer' : 'Afficher'}</span>}>
              Éléments archivés ({d.archives.length})
            </TitreCarte>
          </button>
          {voirArchives && d.archives.map((e) => (
            <Ligne key={e.id} titre={e.nom} sousTitre={e.nature ? LIBELLE_NATURE_LONG[e.nature] : ''}>
              {peut && <PetitBouton onClick={() => restaurer(e)} disabled={occupe}><RotateCcw size={14} /> Restaurer</PetitBouton>}
            </Ligne>
          ))}
        </Carte>
      )}

      {d.droits.scenarios && (
        <Carte className="space-y-3">
          <TitreCarte icon={GitBranch}>Ce scénario</TitreCarte>
          <p className="text-[14px] leading-relaxed">
            Renommer garde la lettre. Dupliquer crée le scénario suivant avec les mêmes éléments, matériel recopié et mesures à refaire.
          </p>
          <div className="flex flex-wrap gap-2">
            <PetitBouton onClick={renommerScenario} disabled={occupe}><Pencil size={14} /> Renommer</PetitBouton>
            <PetitBouton onClick={dupliquerScenario} disabled={occupe}><Copy size={14} /> Dupliquer le scénario</PetitBouton>
            <PetitBouton onClick={archiverScenario} disabled={occupe}><Archive size={14} /> Archiver le scénario</PetitBouton>
          </div>
        </Carte>
      )}
    </div>
  );
}

// Scénarios archivés d'une fiche, avec Restaurer (commercial et direction)
export function ScenariosArchives({ affaireId }: { affaireId: string }) {
  const [liste, setListe] = useState<{ id: string; nom: string }[]>([]);
  const [peut, setPeut] = useState(false);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${URL_SCENARIO}?affaireId=${encodeURIComponent(affaireId)}`, { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j?.success) { setListe(Array.isArray(j.archives) ? j.archives : []); setPeut(!!j?.droits?.scenarios); }
      } catch {
        // hors ligne : la liste reste vide
      }
    })();
  }, [affaireId]);

  if (!liste.length) return null;

  const restaurer = async (id: string) => {
    setOccupe(true);
    setErreur('');
    const { ok, j } = await poster(URL_SCENARIO, { action: 'restaurer', id });
    if (!ok) { setErreur(j?.error ? `${j.error}.` : "Le scénario n'a pas pu être restauré."); setOccupe(false); return; }
    window.location.reload();
  };

  return (
    <div className="space-y-3">
      <Repere>Scénarios archivés</Repere>
      {erreur && <Alerte>{erreur}</Alerte>}
      {liste.map((s) => (
        <Ligne key={s.id} titre={s.nom} sousTitre="Archivé avec ses éléments">
          {peut && <PetitBouton onClick={() => restaurer(s.id)} disabled={occupe}><RotateCcw size={14} /> Restaurer</PetitBouton>}
        </Ligne>
      ))}
    </div>
  );
}
