"use client";

// + Prospect (17/10/2026, 19 h 53) : nouveau prospect dans Prospection (Chasse) ❄️, type de tâche Prospect, statut
// ⬜ à traiter, avec une date de rappel (aujourd'hui par défaut). Écrit par /api/interne/prospects.
// Les demandes du formulaire du site vont directement en Qualification (wiki) : ce formulaire sert à la chasse
// (LinkedIn, apporteur, appel entrant, salon, bouche-à-oreille).
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, MapPin, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';
import { adresses } from '@/lib/adresses';

type Option = { id: string; nom: string };
type Options = { sources: Option[]; typesClient: Option[]; preview: boolean };
type Adresse = { label: string; lat: number; lng: number };

const aujourdhui = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const sansEmoji = (s: string) => s.replace(/^[^A-Za-z0-9\u00C0-\u017F]+/, '').trim();

export default function NouveauProspectPage() {
  const [options, setOptions] = useState<Options | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [source, setSource] = useState('');
  const [typeClient, setTypeClient] = useState('');
  const [recherche, setRecherche] = useState('');
  const [suggestions, setSuggestions] = useState<Adresse[]>([]);
  const [adresse, setAdresse] = useState<Adresse | null>(null);
  const [budget, setBudget] = useState('');
  const [rappel, setRappel] = useState(aujourdhui());
  const [notes, setNotes] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [cree, setCree] = useState<{ nom: string; rappel: string; lien: string } | null>(null);
  const [preview, setPreview] = useState(false);
  const minuteur = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/interne/prospects', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) setErreur(data?.error || `Lecture impossible (${res.status})`);
        else { setOptions(data as Options); setPreview(!!data.preview); }
      } catch {
        setErreur('Impossible de joindre le serveur.');
      }
    })();
  }, []);

  // Suggestions d'adresses (même service que Nouveau projet)
  const chercher = (q: string) => {
    setRecherche(q);
    setAdresse(null);
    if (minuteur.current) clearTimeout(minuteur.current);
    if (q.trim().length < 3) { setSuggestions([]); return; }
    minuteur.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/interne/projets?adresse=${encodeURIComponent(q.trim())}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  const pret = nom.trim().length >= 2 && !!source && !!(telephone.trim() || email.trim() || linkedin.trim());

  const envoyer = async () => {
    if (!pret || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'creer', nom, telephone, email, linkedin, source, typeClient, adresse, budget, rappel, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) setErreur(data?.error || `Envoi impossible (${res.status})`);
      else { setCree(data.cree); setPreview(!!data.preview); }
    } catch {
      setErreur('Impossible de joindre le serveur. Rien n’a été créé.');
    } finally {
      setEnvoi(false);
    }
  };

  const choix = (liste: Option[], valeur: string, changer: (id: string) => void) => (
    <div className="mt-2 flex flex-wrap gap-2">
      {liste.map((o) => {
        const actif = valeur === o.id;
        return (
          <button key={o.id} onClick={() => changer(actif ? '' : o.id)} className={`rounded-full px-4 py-2 text-[14px] font-bold ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={actif ? { backgroundColor: CYAN } : undefined}>
            {o.nom}
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

  const retour = `${adresses.prospection}?vue=chasse`;
  const boutonRetour = (
    <a href={retour} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Retour
    </a>
  );

  if (cree) {
    return (
      <PageAppli>
        <EnTeteAppli surtitre="Prospection" titre="Prospect créé" retour={{ href: retour, libelle: 'Retour' }} />
        <ContenuAppli className="space-y-4">
          {preview && <Alerte>Preview : créé avec le nom « Test · … ».</Alerte>}
          <Carte accent>
            <p className="text-[18px] font-bold">{cree.nom}</p>
            <p className="mt-1 text-[14px]">Type Prospect, statut « à traiter », premier rappel le {cree.rappel}.</p>
          </Carte>
          <a href={cree.lien} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-8 py-4 text-[17px] font-semibold text-white">Voir le pipeline chasse <ChevronRight size={20} /></a>
          <button onClick={() => { setCree(null); setNom(''); setTelephone(''); setEmail(''); setLinkedin(''); setTypeClient(''); setRecherche(''); setAdresse(null); setBudget(''); setRappel(aujourdhui()); setNotes(''); }} className="block w-full text-center text-[15px] font-semibold" style={{ color: CYAN }}>
            + Un autre prospect
          </button>
        </ContenuAppli>
      </PageAppli>
    );
  }

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Prospection" titre="Nouveau prospect" action={boutonRetour} />
      <ContenuAppli className="space-y-4">
        {preview && <Alerte>Preview : le nom commencera par « Test · ».</Alerte>}
        <p className="px-1 text-[13px]">Pour la chasse (LinkedIn, apporteur, appel entrant, salon). Une demande du site arrive déjà en Qualification, et un client avec un RDV fixé se crée avec Nouveau projet.</p>
        {erreur && <Alerte>{erreur}</Alerte>}
        {!options && !erreur && <Carte className="p-8 text-center"><RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} /></Carte>}

        {options && (
          <>
            <Repere>1 · Qui</Repere>
            {champ('Nom (personne, société ou copropriété)', nom, setNom, { placeholder: 'Ex. : SDC Les Mouettes, Paul Martin', autoComplete: 'off' })}
            <div><p className={ETIQUETTE}>Type de client (facultatif)</p>{choix(options.typesClient, typeClient, setTypeClient)}</div>
            <div><p className={ETIQUETTE}>Source</p>{choix(options.sources, source, setSource)}</div>

            <Repere>2 · Comment le joindre (au moins un)</Repere>
            {champ('Téléphone', telephone, setTelephone, { type: 'tel', inputMode: 'tel', placeholder: '06 12 34 56 78' })}
            {champ('Email', email, setEmail, { type: 'email', inputMode: 'email' })}
            {champ('Profil LinkedIn', linkedin, setLinkedin, { type: 'url', inputMode: 'url', placeholder: 'https://www.linkedin.com/in/…' })}

            <Repere>3 · Le projet</Repere>
            <div>
              <label className={ETIQUETTE}>Adresse (facultatif)</label>
              <input className={`${CHAMP} mt-1.5`} value={adresse ? adresse.label : recherche} onChange={(e) => chercher(e.target.value)} placeholder="Commence à taper l’adresse" autoComplete="off" />
              {!adresse && suggestions.length > 0 && (
                <div className="mt-1.5 overflow-hidden rounded-[14px] bg-white ring-[1.5px] ring-[#dfe3e8]">
                  {suggestions.map((s) => (
                    <button key={`${s.label}-${s.lat}`} onClick={() => { setAdresse(s); setSuggestions([]); }} className="flex w-full items-center gap-2 border-b border-[#eceef1] px-4 py-3 text-left text-[14px] last:border-0">
                      <MapPin size={15} className="shrink-0" color={CYAN} /> {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {champ('Budget estimé en € (facultatif)', budget, setBudget, { type: 'number', inputMode: 'decimal', min: 0 })}
            {champ('Premier rappel', rappel, setRappel, { type: 'date' })}
            <div>
              <label className={ETIQUETTE}>Notes (facultatif)</label>
              <textarea className={`${CHAMP} mt-1.5 min-h-[90px]`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contexte, nombre de places, qui l’a recommandé…" />
            </div>

            <BoutonPrincipal inactif={!pret || envoi} disabled={!pret || envoi} onClick={envoyer}>
              {envoi ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />}
              Créer le prospect
            </BoutonPrincipal>
            {!source && <p className="text-center text-[12px] text-slate-500">La source est obligatoire : c’est elle qui dit quel canal rapporte ({options.sources.map((s) => sansEmoji(s.nom)).join(', ')}).</p>}
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
