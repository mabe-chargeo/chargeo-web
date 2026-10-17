"use client";

// Formulaire de création RH (17/10/2026, 19 h 10) : fiche salarié (Vie des Salariés) ou fiche candidat (Recrutement
// Installateurs). Écrit par /api/interne/creer-rh. Utilisé par /interne/creer/salarie et /interne/creer/candidat.
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';

type Options = { postesSalarie: string[]; contrats: string[]; postesCandidat: string[]; diplomes: string[]; habilitations: string[] };

export default function FormulaireRH({ type }: { type: 'salarie' | 'candidat' }) {
  const [options, setOptions] = useState<Options | null>(null);
  const [preview, setPreview] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [poste, setPoste] = useState<number | null>(null);
  const [contrat, setContrat] = useState<number | null>(null);
  const [entree, setEntree] = useState('');
  const [habilitations, setHabilitations] = useState('');
  const [expiration, setExpiration] = useState('');
  const [disponibilite, setDisponibilite] = useState('');
  const [diplome, setDiplome] = useState<number | null>(null);
  const [habilitation, setHabilitation] = useState<number | null>(null);
  const [permis, setPermis] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [cree, setCree] = useState<{ nom: string; lien: string } | null>(null);
  const [checklist, setChecklist] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/interne/creer-rh', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        setOptions(data as Options);
        setPreview(!!data?.preview);
      } catch {
        setErreur('Impossible de joindre le serveur.');
      }
    })();
  }, []);

  const salarie = type === 'salarie';
  const pret = nom.trim().split(/\s+/).length >= 2 && poste !== null && (salarie ? contrat !== null : !!telephone.trim());

  const envoyer = async () => {
    if (!pret || envoi) return;
    setEnvoi(true);
    setErreur(null);
    const corps = salarie
      ? { type, nom, telephone, email, poste, contrat, entree, habilitations, expiration, notes }
      : { type, nom, telephone, email, poste, disponibilite, diplome, habilitation, permis, notes };
    try {
      const res = await fetch('/api/interne/creer-rh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) setErreur(data?.error || `Envoi impossible (${res.status})`);
      else { setCree(data.cree); setPreview(!!data.preview); setChecklist(data.checklist !== false); }
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
  const champ = (libelle: string, valeur: string, changer: (v: string) => void, props: Record<string, any> = {}) => (
    <div>
      <label className={ETIQUETTE}>{libelle}</label>
      <input className={`${CHAMP} mt-1.5`} value={valeur} onChange={(e) => changer(e.target.value)} {...props} />
    </div>
  );

  const titre = salarie ? 'Nouveau salarié' : 'Nouveau candidat';
  const listeRetour = salarie ? '/interne/liste/salaries' : '/interne/liste/recrutement';
  const boutonRetour = (
    <a href={listeRetour} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Retour
    </a>
  );

  if (cree) {
    return (
      <PageAppli>
        <EnTeteAppli surtitre="Ressources humaines" titre={salarie ? 'Salarié créé' : 'Candidat créé'} retour={{ href: listeRetour, libelle: 'Retour' }} />
        <ContenuAppli className="space-y-4">
          {preview && <Alerte>Preview : créé avec le nom « Test · … ».</Alerte>}
          {salarie && !checklist && <Alerte>La fiche est créée mais la checklist d’onboarding n’a pas pu être ajoutée en entier.</Alerte>}
          <Carte accent>
            <p className="text-[18px] font-bold">{cree.nom}</p>
            {salarie && checklist && <p className="mt-1 text-[14px]">Statut « nouvel arrivant », checklist d’onboarding (12 points) ajoutée.</p>}
          </Carte>
          <a href={cree.lien} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-8 py-4 text-[17px] font-semibold text-white">Ouvrir la fiche <ChevronRight size={20} /></a>
          <a href={listeRetour} className="block text-center text-[15px] font-semibold" style={{ color: CYAN }}>{salarie ? 'Retour aux salariés' : 'Retour au recrutement'}</a>
        </ContenuAppli>
      </PageAppli>
    );
  }

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Ressources humaines" titre={titre} action={boutonRetour} />
      <ContenuAppli className="space-y-4">
        {preview && <Alerte>Preview : le nom commencera par « Test · ».</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {!options && !erreur && (
          <Carte className="p-8 text-center"><RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} /></Carte>
        )}

        {options && (
          <>
            <Repere>1 · La personne</Repere>
            {champ('Prénom et nom', nom, setNom, { placeholder: 'Ex. : Paul Martin', autoComplete: 'off' })}
            {champ(salarie ? 'Téléphone (facultatif)' : 'Téléphone', telephone, setTelephone, { type: 'tel', inputMode: 'tel', placeholder: '06 12 34 56 78' })}
            {champ('Email (facultatif)', email, setEmail, { type: 'email', inputMode: 'email' })}

            <Repere>{salarie ? '2 · Le poste' : '2 · Le profil'}</Repere>
            <div><p className={ETIQUETTE}>Poste</p>{choix(salarie ? options.postesSalarie : options.postesCandidat, poste, setPoste)}</div>
            {salarie ? (
              <>
                <div><p className={ETIQUETTE}>Type de contrat</p>{choix(options.contrats, contrat, setContrat)}</div>
                {champ('Date d’entrée (facultatif)', entree, setEntree, { type: 'date' })}
                {champ('Habilitations (facultatif)', habilitations, setHabilitations, { placeholder: 'Ex. : B2V BR BC, IRVE P1' })}
                {champ('Expiration de l’habilitation (facultatif)', expiration, setExpiration, { type: 'date' })}
              </>
            ) : (
              <>
                {champ('Disponible à partir du (facultatif)', disponibilite, setDisponibilite, { type: 'date' })}
                <div><p className={ETIQUETTE}>Diplôme (facultatif)</p>{choix(options.diplomes, diplome, (i) => setDiplome(diplome === i ? null : i))}</div>
                <div><p className={ETIQUETTE}>Habilitation électrique (facultatif)</p>{choix(options.habilitations, habilitation, (i) => setHabilitation(habilitation === i ? null : i))}</div>
                <div><p className={ETIQUETTE}>Permis B (facultatif)</p>{choix(['Oui', 'Non'], permis === null ? null : permis ? 0 : 1, (i) => setPermis(i === 0))}</div>
              </>
            )}
            <div>
              <label className={ETIQUETTE}>Notes (facultatif)</label>
              <textarea className={`${CHAMP} mt-1.5 min-h-[100px]`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={salarie ? 'Matériel confié, particularités…' : 'Source (bouche-à-oreille, salon…), première impression…'} />
            </div>

            <BoutonPrincipal inactif={!pret || envoi} disabled={!pret || envoi} onClick={envoyer}>
              {envoi ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />}
              {salarie ? 'Créer la fiche salarié' : 'Créer la fiche candidat'}
            </BoutonPrincipal>
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
