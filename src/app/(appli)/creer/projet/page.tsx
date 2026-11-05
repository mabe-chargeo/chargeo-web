"use client";

// Écran Nouveau projet (parcours validé par Matthieu le 17/10/2026, 14 h 08), bouton + du commercial et de la direction.
// 1. Qui appelle ? Recherche dans Contacts 👥 (Magali apparaît avec ses projets) ou création d'un contact avec son rôle.
// 2. Adresse du chantier : obligatoire, avec suggestions. Elle appartient au projet, pas au contact.
// 3. Doublon : un projet ouvert à la même adresse est montré, avec « Ouvrir ce projet ».
// 4. Le projet : nom (proposé), type de client, segment. Le contact principal remplit le passeport de la fiche.
// Avec ?fiche=<id> (bouton « + Ajouter un contact » de la fiche affaire) : seule l'étape des contacts, pour un projet
// existant. Les droits sont contrôlés par /api/interne/projets.
// 03/11/2026 (T7, décision de Mathieu à 21 h 23) : quand la recherche ne trouve personne, le formulaire du nouveau contact
// s'ouvre d'office, prérempli avec la saisie (e-mail, téléphone, ou prénom et nom selon le format). Il suit la saisie
// tant qu'aucun de ses champs n'a été retouché. Depuis la fiche, son bouton relie directement le contact au projet :
// plus d'étape « Ajouter » puis « Relier au projet ».
// 05/11/2026 (T7, passe 3, accord de Mathieu à 13 h 46) : une saisie mixte (« Jean Dupont 06 12 34 56 78 ») est découpée :
// l'e-mail et le téléphone vont dans leurs champs, le reste au prénom et au nom.
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, MapPin, Plus, RefreshCw, Search, Star, UserPlus, X } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, GRIS, NAVY, ORANGE } from '@/components/charte/couleurs';
import { LIBELLE_LIEN, ROLES_CONTACT, lienDuRole, type CleRoleContact } from '@/lib/rolesContact';
import { adresses } from '@/lib/adresses';

type Contact = { id: string; nom: string; role: CleRoleContact | null; roleLibelle: string; societe: string; tel: string; email: string; projets: { id: string; nom: string }[] };
type Choisi = { cle: string; id?: string; nom: string; role: CleRoleContact | null; societe: string; tel: string; email: string; projets: { id: string; nom: string }[]; nouveau?: { prenom: string; nom: string; tel: string; email: string; societe: string; role: CleRoleContact } };
type Suggestion = { label: string; lat: number; lng: number; ville: string };
type Doublon = { id: string; nom: string; etape: string; statut: string; adresse: string; distance: number | null; lien: string };

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const TYPES_CLIENT = [{ i: 0, libelle: 'Particulier' }, { i: 1, libelle: 'Pro' }, { i: 2, libelle: 'Copropriété' }];
const SEGMENTS = [
  { i: 0, cle: 'RES', libelle: 'RES · résidentiel' }, { i: 1, cle: 'DAP', libelle: 'DAP · droit à la prise' }, { i: 2, cle: 'COP', libelle: 'COP · copropriété' },
  { i: 3, cle: 'PAR', libelle: 'PAR · parking' }, { i: 4, cle: 'FLT', libelle: 'FLT · flotte' }, { i: 5, cle: 'TER', libelle: 'TER · tertiaire' }, { i: 6, cle: 'RIC', libelle: 'RIC' },
];
const VIDE = { prenom: '', nom: '', tel: '', email: '', societe: '', role: '' as CleRoleContact | '' };
type Nouveau = typeof VIDE;

// Saisie de la recherche rangée dans les bons champs du nouveau contact (T7) : l'e-mail et le téléphone sont extraits,
// même mêlés à un nom (« Testeur recette 060000000 »), et le reste donne le prénom (premier mot) et le nom.
function decouper(saisie: string): Omit<Nouveau, 'role'> {
  let reste = saisie.trim().replace(/\s+/g, ' ');
  const base = { prenom: '', nom: '', tel: '', email: '', societe: '' };
  const mail = reste.match(/[^\s@]+@[^\s@]+/);
  if (mail) {
    base.email = mail[0];
    reste = reste.replace(mail[0], ' ');
  }
  const tel = reste.match(/\+?\d[\d\s.()-]*\d/);
  if (tel && tel[0].replace(/\D/g, '').length >= 6) {
    base.tel = tel[0].trim();
    reste = reste.replace(tel[0], ' ');
  }
  const mots = reste.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (mots.length > 1) {
    base.prenom = mots[0];
    base.nom = mots.slice(1).join(' ');
  } else if (mots.length === 1) {
    base.nom = mots[0];
  }
  return base;
}

export default function NouveauProjetPage() {
  const [ficheId, setFicheId] = useState('');
  const [fiche, setFiche] = useState<{ id: string; nom: string } | null>(null);
  const [annuaire, setAnnuaire] = useState<Contact[]>([]);
  const [preview, setPreview] = useState(false);
  const [peutCreer, setPeutCreer] = useState(true);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [recherche, setRecherche] = useState('');
  const [choisis, setChoisis] = useState<Choisi[]>([]);
  const [principal, setPrincipal] = useState('');
  const [formNouveau, setFormNouveau] = useState(false);
  const [nouveau, setNouveau] = useState<Nouveau>(VIDE);
  // Formulaire ouvert d'office par une recherche sans résultat, et pas encore retouché : il suit la saisie (T7)
  const [auto, setAuto] = useState(false);

  const [saisieAdresse, setSaisieAdresse] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [adresse, setAdresse] = useState<Suggestion | null>(null);
  const [doublons, setDoublons] = useState<Doublon[] | null>(null);
  const [doublonVu, setDoublonVu] = useState(false);

  const [nom, setNom] = useState('');
  const [nomTouche, setNomTouche] = useState(false);
  const [typeClient, setTypeClient] = useState<number | null>(null);
  const [segment, setSegment] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<any>(null);
  const minuterie = useRef<any>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('fiche') || '';
    setFicheId(id);
    (async () => {
      try {
        const res = await fetch(`/api/interne/projets${id ? `?fiche=${encodeURIComponent(id)}` : ''}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) setErreur(data?.error || `Lecture impossible (${res.status})`);
        else {
          setAnnuaire(data.contacts || []);
          setPreview(!!data.preview);
          setPeutCreer(!!data.peutCreer);
          if (data.fiche) setFiche({ id: data.fiche.id, nom: data.fiche.nom });
        }
      } catch {
        setErreur('Impossible de joindre le serveur.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Suggestions d'adresses, 350 ms après la dernière frappe
  useEffect(() => {
    if (adresse && saisieAdresse === adresse.label) return;
    if (minuterie.current) clearTimeout(minuterie.current);
    const q = saisieAdresse.trim();
    if (q.length < 3) { setSuggestions([]); return; }
    minuterie.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/interne/projets?adresse=${encodeURIComponent(q)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch {
        setSuggestions([]);
      }
    }, 350);
  }, [saisieAdresse, adresse]);

  const choisirAdresse = async (s: Suggestion) => {
    setAdresse(s);
    setSaisieAdresse(s.label);
    setSuggestions([]);
    setDoublons(null);
    setDoublonVu(false);
    try {
      const res = await fetch(`/api/interne/projets?lat=${s.lat}&lng=${s.lng}&label=${encodeURIComponent(s.label)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      setDoublons(Array.isArray(data?.doublons) ? data.doublons : []);
    } catch {
      setDoublons([]);
    }
  };

  // Nom proposé tant qu'il n'a pas été modifié à la main
  const premier = choisis.find((c) => c.cle === principal) || choisis[0];
  const nomPropose = (() => {
    const rue = adresse ? adresse.label.replace(/\s+\d{5}\s.*$/, '').trim() : '';
    if (typeClient === 2) return rue ? `SDC ${rue}` : 'SDC ';
    if (typeClient === 1) return premier?.societe || '';
    if (typeClient === 0 && premier) {
      const mots = premier.nom.split(' ');
      return mots.length > 1 ? `${mots.slice(1).join(' ').toUpperCase()} ${mots[0]}` : premier.nom;
    }
    return '';
  })();
  useEffect(() => { if (!nomTouche) setNom(nomPropose); }, [nomPropose, nomTouche]);

  const ajouterExistant = (c: Contact) => {
    if (choisis.some((x) => x.id === c.id)) return;
    const cle = `e-${c.id}`;
    setChoisis((l) => [...l, { cle, id: c.id, nom: c.nom, role: c.role, societe: c.societe, tel: c.tel, email: c.email, projets: c.projets }]);
    if (!principal) setPrincipal(cle);
    setRecherche('');
  };

  // Nouveau contact du formulaire, prêt à être ajouté (null tant qu'il manque le nom ou le rôle)
  const nouveauChoisi = (): Choisi | null => {
    if (!nouveau.nom.trim() || !nouveau.role) return null;
    const role = nouveau.role as CleRoleContact;
    const affiche = [nouveau.prenom.trim(), nouveau.nom.trim().toUpperCase()].filter(Boolean).join(' ');
    return { cle: `n-${Date.now()}`, nom: affiche, role, societe: nouveau.societe.trim(), tel: nouveau.tel.trim(), email: nouveau.email.trim(), projets: [], nouveau: { ...nouveau, role } };
  };

  const fermerFormulaire = () => {
    setNouveau(VIDE);
    setFormNouveau(false);
    setAuto(false);
    setRecherche('');
  };

  const ajouterNouveau = () => {
    const c = nouveauChoisi();
    if (!c) return;
    setChoisis((l) => [...l, c]);
    if (!principal) setPrincipal(c.cle);
    fermerFormulaire();
  };

  const retirer = (cle: string) => {
    setChoisis((l) => l.filter((x) => x.cle !== cle));
    if (principal === cle) setPrincipal('');
  };

  // Champ du formulaire retouché : il ne suit plus la recherche
  const saisir = (p: Partial<Omit<Nouveau, 'role'>>) => {
    setAuto(false);
    setNouveau((n) => ({ ...n, ...p }));
  };

  const q = normal(recherche.trim());
  const resultats = q.length >= 2
    ? annuaire.filter((c) => !choisis.some((x) => x.id === c.id) && normal(`${c.nom} ${c.societe} ${c.tel} ${c.email}`).includes(q)).slice(0, 6)
    : [];
  const sansResultat = !loading && q.length >= 2 && resultats.length === 0;

  // Recherche sans résultat : formulaire ouvert d'office et prérempli ; il se referme si la saisie retrouve quelqu'un (T7)
  useEffect(() => {
    if (sansResultat && (!formNouveau || auto)) {
      setNouveau((n) => ({ ...decouper(recherche), role: n.role }));
      setFormNouveau(true);
      setAuto(true);
    } else if (!sansResultat && auto) {
      setNouveau(VIDE);
      setFormNouveau(false);
      setAuto(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sansResultat, recherche]);

  const modeAjout = !!ficheId;
  const pretCreation = choisis.length > 0 && !!adresse && doublons !== null && (doublons.length === 0 || doublonVu) && !!nom.trim();
  const pret = modeAjout ? choisis.length > 0 : pretCreation;

  const envoyer = async (liste: Choisi[] = choisis) => {
    const ok = modeAjout ? liste.length > 0 : pretCreation;
    if (!ok || envoi) return;
    setEnvoi(true);
    setErreur(null);
    const contacts = liste.map((c) => (c.id ? { id: c.id, principal: c.cle === principal } : { nouveau: c.nouveau, principal: c.cle === principal }));
    const corps = modeAjout
      ? { action: 'ajouter', ficheId, contacts }
      : { action: 'creer', contacts, projet: { nom: nom.trim(), typeClient, segment, notes: notes.trim(), adresse: adresse ? { label: adresse.label, lat: adresse.lat, lng: adresse.lng } : null } };
    try {
      const res = await fetch('/api/interne/projets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) setErreur(data?.error || `Envoi impossible (${res.status})`);
      else setResultat(data);
    } catch {
      setErreur('Impossible de joindre le serveur. Rien n’a été créé.');
    } finally {
      setEnvoi(false);
    }
  };

  // Depuis la fiche : le nouveau contact est relié au projet d'un seul bouton (T7). En cas d'échec, il reste dans la
  // liste pour un nouvel essai avec « Relier au projet ».
  const relierNouveau = () => {
    const c = nouveauChoisi();
    if (!c) return;
    const liste = [...choisis, c];
    setChoisis(liste);
    fermerFormulaire();
    envoyer(liste);
  };

  const retour = (
    <a href={modeAjout ? adresses.affaire(ficheId) : adresses.aTraiter} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> {modeAjout ? 'La fiche' : 'Mon espace'}
    </a>
  );

  const pastilleRole = (role: CleRoleContact | null) => {
    const r = ROLES_CONTACT.find((x) => x.cle === role);
    return (
      <span className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-bold ring-[1.5px] ring-[#dfe3e8]">
        {r ? r.libelle : 'Rôle inconnu'} · {LIBELLE_LIEN[lienDuRole(role)]}
      </span>
    );
  };

  const formulaireComplet = !!nouveau.nom.trim() && !!nouveau.role;

  // ── Écran de fin ──
  if (resultat) {
    return (
      <PageAppli>
        <EnTeteAppli surtitre={modeAjout ? 'Contacts du projet' : 'Nouveau projet'} titre={modeAjout ? 'Contacts reliés' : 'Projet créé'} />
        <ContenuAppli className="space-y-4">
          {resultat.preview && <Alerte>Preview : fiche créée dans 🧪 Qualification TEST. Les contacts sont notés en commentaire, la vraie liste Contacts n&apos;est pas modifiée.</Alerte>}
          {(resultat.avertissements || []).map((a: string) => <Alerte key={a}>{a}</Alerte>)}
          <Carte accent>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">{modeAjout ? 'Projet' : 'Nouveau projet en 📍 à visiter'}</p>
            <p className="mt-1 text-[19px] font-bold">{resultat.fiche?.nom}</p>
            <ul className="mt-3 space-y-1.5">
              {(resultat.contacts || []).map((c: any) => (
                <li key={`${c.nom}-${c.lien}`} className="text-[14px]">
                  <span className="font-bold">{c.nom}</span> · {LIBELLE_LIEN[c.lien as 'gestionnaire' | 'surPlace']}{c.principal ? ' · principal' : ''}
                  <span className="text-slate-500"> ({c.etat === 'cree' ? 'créé' : c.etat === 'retrouve' ? 'déjà dans Contacts' : c.etat === 'preview' ? 'non créé en preview' : 'existant'})</span>
                </li>
              ))}
            </ul>
          </Carte>
          <a href={resultat.fiche?.lien} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-8 py-4 text-[17px] font-semibold text-white shadow-[0_8px_22px_rgba(255,107,0,0.28)]">
            Ouvrir la fiche <ChevronRight size={20} />
          </a>
        </ContenuAppli>
      </PageAppli>
    );
  }

  return (
    <PageAppli>
      <EnTeteAppli surtitre={modeAjout ? 'Contacts du projet' : 'Bouton +'} titre={modeAjout ? (fiche ? fiche.nom : 'Ajouter un contact') : 'Nouveau projet'} action={retour} />
      <ContenuAppli className="space-y-4">
        {preview && <Alerte>Preview : la fiche sera créée dans 🧪 Qualification TEST (nom « Test · … »). La vraie liste Contacts n&apos;est jamais modifiée.</Alerte>}
        {!modeAjout && !loading && !peutCreer && <Alerte>La création de projet est réservée au commercial et à la direction.</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {loading && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement des contacts...</p>
          </Carte>
        )}

        {/* 1. Qui appelle ? */}
        <Repere>{modeAjout ? 'Contacts à ajouter' : '1 · Qui appelle ?'}</Repere>
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" color={CYAN} />
          <input className={`${CHAMP} pl-11`} placeholder="Nom, société, téléphone ou email" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </div>
        {resultats.map((c) => (
          <button key={c.id} onClick={() => ajouterExistant(c)} className="block w-full rounded-[20px] p-4 text-left transition-transform active:scale-[0.98]" style={{ backgroundColor: GRIS }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-slate-500">{[c.roleLibelle, c.societe].filter(Boolean).join(' · ') || 'Contact'}</p>
                <p className="mt-0.5 text-[17px] font-bold leading-tight">{c.nom}</p>
                {(c.tel || c.email) && <p className="mt-1 truncate text-[13px]">{[c.tel, c.email].filter(Boolean).join(' · ')}</p>}
                {c.projets.length > 0 && <p className="mt-1.5 text-[13px] font-semibold" style={{ color: CYAN }}>{c.projets.length} projet{c.projets.length > 1 ? 's' : ''} : {c.projets.map((p) => p.nom).join(', ')}</p>}
              </div>
              <Plus size={22} className="shrink-0" color={CYAN} />
            </div>
          </button>
        ))}
        {sansResultat && <p className="px-1 text-[14px]">Personne dans Contacts : la fiche du nouveau contact est ouverte, remplie avec ta saisie. Complète-la et choisis son rôle.</p>}

        {choisis.map((c) => (
          <Carte key={c.cle} accent className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[17px] font-bold leading-tight">{c.nom}{c.nouveau ? <span className="ml-2 text-[12px] font-bold" style={{ color: ORANGE }}>nouveau</span> : null}</p>
                {(c.tel || c.email) && <p className="mt-1 truncate text-[13px]">{[c.tel, c.email].filter(Boolean).join(' · ')}</p>}
              </div>
              <button onClick={() => retirer(c.cle)} aria-label={`Retirer ${c.nom}`} className="shrink-0"><X size={20} color={NAVY} /></button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {pastilleRole(c.role)}
              {!modeAjout && (
                <button onClick={() => setPrincipal(c.cle)} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-bold" style={c.cle === (principal || choisis[0]?.cle) ? { backgroundColor: CYAN, color: '#fff' } : { color: NAVY }}>
                  <Star size={12} /> {c.cle === (principal || choisis[0]?.cle) ? 'Contact principal' : 'Rendre principal'}
                </button>
              )}
            </div>
            {c.projets.length > 0 && <p className="text-[13px]">Déjà sur : {c.projets.map((p) => p.nom).join(', ')}</p>}
          </Carte>
        ))}
        {!modeAjout && choisis.length > 0 && <p className="px-1 text-[13px]">Le contact principal remplit le téléphone et l&apos;email de la fiche (passeport).</p>}

        {!formNouveau ? (
          <button onClick={() => setFormNouveau(true)} className="flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[16px] font-semibold ring-[1.5px] ring-[#dfe3e8]" style={{ color: CYAN }}>
            <UserPlus size={18} /> Nouveau contact
          </button>
        ) : (
          <Carte className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={ETIQUETTE}>Prénom</label><input className={`${CHAMP} mt-1.5`} value={nouveau.prenom} onChange={(e) => saisir({ prenom: e.target.value })} /></div>
              <div><label className={ETIQUETTE}>Nom</label><input className={`${CHAMP} mt-1.5`} value={nouveau.nom} onChange={(e) => saisir({ nom: e.target.value })} /></div>
            </div>
            <div><label className={ETIQUETTE}>Téléphone</label><input className={`${CHAMP} mt-1.5`} type="tel" inputMode="tel" value={nouveau.tel} onChange={(e) => saisir({ tel: e.target.value })} /></div>
            <div><label className={ETIQUETTE}>Email</label><input className={`${CHAMP} mt-1.5`} type="email" inputMode="email" value={nouveau.email} onChange={(e) => saisir({ email: e.target.value })} /></div>
            <div><label className={ETIQUETTE}>Société (facultatif)</label><input className={`${CHAMP} mt-1.5`} value={nouveau.societe} onChange={(e) => saisir({ societe: e.target.value })} /></div>
            <div>
              <p className={ETIQUETTE}>Rôle</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ROLES_CONTACT.map((r) => {
                  const actif = nouveau.role === r.cle;
                  return (
                    <button key={r.cle} onClick={() => setNouveau({ ...nouveau, role: r.cle })} className={`rounded-full px-4 py-2 text-[14px] font-bold ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={actif ? { backgroundColor: CYAN } : undefined}>
                      {r.libelle}
                    </button>
                  );
                })}
              </div>
              {nouveau.role && <p className="mt-2 text-[13px]">Sera relié au projet en {LIBELLE_LIEN[lienDuRole(nouveau.role as CleRoleContact)]}.</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={modeAjout ? relierNouveau : ajouterNouveau}
                disabled={!formulaireComplet || envoi}
                className={`flex grow items-center justify-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold text-white ${formulaireComplet && !envoi ? '' : 'opacity-40'}`}
                style={{ backgroundColor: CYAN }}
              >
                <Check size={18} /> {modeAjout ? 'Relier au projet' : 'Ajouter'}
              </button>
              <button onClick={fermerFormulaire} className="rounded-full px-5 py-3 text-[16px] font-semibold ring-[1.5px] ring-[#dfe3e8]">Annuler</button>
            </div>
            <p className="text-[12px] text-slate-500">Même email ou même téléphone qu&apos;un contact existant : il est relié, pas recréé.</p>
          </Carte>
        )}

        {!modeAjout && (
          <>
            {/* 2. Adresse du chantier */}
            <div className="h-2" />
            <Repere>2 · Adresse du chantier</Repere>
            <div className="relative">
              <MapPin size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" color={CYAN} />
              <input
                className={`${CHAMP} pl-11`}
                placeholder="Numéro, rue, commune"
                value={saisieAdresse}
                onChange={(e) => { setSaisieAdresse(e.target.value); setAdresse(null); setDoublons(null); }}
              />
            </div>
            {suggestions.length > 0 && (
              <div className="overflow-hidden rounded-[16px] ring-[1.5px] ring-[#dfe3e8]">
                {suggestions.map((s) => (
                  <button key={`${s.label}-${s.lat}`} onClick={() => choisirAdresse(s)} className="flex min-h-[48px] w-full items-center gap-3 border-b border-[#eef1f4] bg-white px-4 py-2 text-left text-[15px] last:border-b-0 active:bg-[#eef1f4]">
                    <MapPin size={16} className="shrink-0" color={CYAN} /> {s.label}
                  </button>
                ))}
              </div>
            )}
            {saisieAdresse.trim().length >= 3 && !adresse && !suggestions.length && <p className="px-1 text-[13px]">Choisis l&apos;adresse dans les suggestions (elle sert à la carte et à l&apos;itinéraire).</p>}

            {adresse && doublons === null && <p className="px-1 text-[14px]">Je vérifie qu&apos;aucun projet n&apos;existe déjà à cette adresse...</p>}
            {adresse && doublons && doublons.length === 0 && <p className="flex items-center gap-2 px-1 text-[14px] font-semibold"><Check size={16} color={CYAN} /> Aucun projet ouvert à cette adresse.</p>}
            {adresse && doublons && doublons.length > 0 && (
              <Carte className="space-y-3" >
                <p className="text-[15px] font-bold" style={{ color: ORANGE }}>Déjà un projet ouvert à cette adresse</p>
                {doublons.map((d) => (
                  <a key={d.id} href={d.lien} className="flex items-center justify-between gap-3 rounded-[14px] bg-white p-3 ring-[1.5px] ring-[#dfe3e8]">
                    <span className="min-w-0">
                      <span className="block text-[16px] font-bold">{d.nom}</span>
                      <span className="block text-[13px]">{d.etape} · {d.statut}{d.distance !== null ? ` · à ${d.distance} m` : ''}</span>
                    </span>
                    <span className="flex shrink-0 items-center text-[14px] font-bold" style={{ color: CYAN }}>Ouvrir <ChevronRight size={18} /></span>
                  </a>
                ))}
                <button onClick={() => setDoublonVu(true)} className={`w-full rounded-full px-5 py-3 text-[15px] font-semibold ${doublonVu ? 'text-white' : 'ring-[1.5px] ring-[#dfe3e8]'}`} style={doublonVu ? { backgroundColor: CYAN } : undefined}>
                  {doublonVu ? 'Nouveau projet confirmé' : 'C’est bien un nouveau projet'}
                </button>
              </Carte>
            )}

            {/* 3. Le projet */}
            <div className="h-2" />
            <Repere>3 · Le projet</Repere>
            <div>
              <p className={ETIQUETTE}>Type de client</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TYPES_CLIENT.map((t) => {
                  const actif = typeClient === t.i;
                  return (
                    <button key={t.i} onClick={() => setTypeClient(t.i)} className={`rounded-full px-4 py-2 text-[14px] font-bold ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={actif ? { backgroundColor: CYAN } : undefined}>
                      {t.libelle}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={ETIQUETTE}>Nom du projet</label>
              <input className={`${CHAMP} mt-1.5`} value={nom} placeholder="SDC …, NOM Prénom ou société" onChange={(e) => { setNom(e.target.value); setNomTouche(true); }} />
              {preview && <p className="ml-1 mt-1 text-[12px] text-slate-500">En preview, « Test · » est ajouté devant.</p>}
            </div>
            <div>
              <label className={ETIQUETTE}>Segment (facultatif)</label>
              <select className={`${CHAMP} mt-1.5`} value={segment === null ? '' : String(segment)} onChange={(e) => setSegment(e.target.value === '' ? null : Number(e.target.value))}>
                <option value="">À définir à la visite</option>
                {SEGMENTS.map((s) => <option key={s.i} value={s.i}>{s.libelle}</option>)}
              </select>
            </div>
            <div>
              <label className={ETIQUETTE}>Notes de l&apos;appel (facultatif)</label>
              <textarea className={`${CHAMP} mt-1.5 min-h-[96px]`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Besoin, nombre de places, disponibilités pour la visite…" />
            </div>
          </>
        )}

        {(!modeAjout || choisis.length > 0) && (
          <>
            <div className="h-2" />
            <BoutonPrincipal inactif={!pret || envoi || (!modeAjout && !peutCreer)} disabled={!pret || envoi || (!modeAjout && !peutCreer)} onClick={() => envoyer()}>
              {envoi ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />}
              {modeAjout ? 'Relier au projet' : 'Créer le projet'}
            </BoutonPrincipal>
          </>
        )}
        {!pret && !modeAjout && (
          <p className="px-1 text-center text-[13px]">
            {!choisis.length ? 'Ajoute au moins un contact.' : !adresse ? 'Choisis l’adresse du chantier.' : doublons && doublons.length > 0 && !doublonVu ? 'Confirme que c’est un nouveau projet, ou ouvre le projet existant.' : !nom.trim() ? 'Donne un nom au projet.' : ''}
          </p>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
