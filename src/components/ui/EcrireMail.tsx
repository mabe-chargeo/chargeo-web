"use client";

// Écrire un mail depuis l'appli (Phase 9), DANS l'écran de l'étape (décision de Mathieu du 05/11/2026, 21 h 56 à
// 21 h 58 : le bon mail au bon moment, obligatoire, et plus de page sans lien avec les autres). Sorti de /mail.
// Utilisé par la fiche affaire (mail obligatoire en attente, en tête de fiche), par Caler (confirmation ou visite
// déplacée, sur l'écran du rendez-vous ; créneaux proposés quand le client est injoignable) et par /mail (page blanche
// ouverte depuis le bloc 📇 Contact).
// obligatoire : le texte attendu est celui du champ ✉️ Mail à envoyer de la fiche (src/lib/mailsAFaire.ts), à défaut
// `modele`. On ne choisit qu'entre les textes qui le règlent (textesPour). Rien en attente : le composant n'affiche rien.
// fixe (05/11, 23 h 01, Mathieu : « il ne faudrait pas retomber sur l'écran initial de rédaction d'un mail avec tous
// les modèles accessibles ») : le texte `modele` est imposé, sans la liste des modèles (créneaux, renvoi de la
// confirmation). La liste complète ne reste que sur la page blanche du bloc Contact.
// complements (05/11, 22 h 33) : ce que l'écran sait en plus de la fiche (créneaux choisis dans Caler, note d'accès
// saisie dans Caler quand la fiche n'a pas de 🔑 Accès site, scénario retenu au gagné, motif choisi au perdu). Une valeur
// vide ne remplace rien.
// Sans adresse mail : « Prévenu par téléphone », avec une phrase obligatoire copiée sur la fiche.
// 06/11/2026, 9 h 22 (Mathieu : « ça serait bien qu'il y ait la possibilité d'appeler directement depuis l'application,
// comme le bouton d'appel Google Voice ») : la carte « Pas d'adresse mail ? » montre les numéros de la fiche (client,
// contact sur place, gestionnaire) avec les boutons Appeler, Google Voice et SMS du bloc Contact, avant la note d'appel.
// 06/11/2026, 21 h 16 (lot 3, accord de Mathieu : la brochure projet part avec le devis, et le mail l'annonce) : carte
// « Pièces jointes » avec les PDF de la fiche. Pour « Devis · envoi » (ouvert depuis la Suite de la vente), la brochure
// projet est cochée d'office et l'envoi reste bloqué sans elle, sauf en RIC (brochure facultative) ; les devis viennent
// de Costructor (GET …&devis=1) et leurs problèmes de lecture s'affichent avant l'envoi.
// 06/11/2026 (suite du lot 3) : « Devis · validé », ouvert au gagné (Suite de la vente) avec le scénario retenu en
// complément : le texte ne reprend que le devis de ce scénario. Lot 4 (22 h 34) : « Refus du client », ouvert au perdu
// avec le motif choisi. Lot 4 (22 h 42) : « Devis · révisé », brochure cochée d'office si elle est sur la fiche (le texte
// l'annonce) ; décochée, un avertissement demande de retirer la phrase.
// 06/11/2026 (lot 4, accord de Mathieu à 22 h 20) : la relance de devis en attente s'affiche en tête de fiche, seulement
// en devis envoyé ou en négociation, et ne bloque rien : onEtat ne signale que les mails bloquants (bloquant).
// 06/11/2026 (lot 4, accords de Mathieu à 23 h 13 et 23 h 25) : « Avis Google » en tête de la fiche du Parc le jour du
// rappel (J+7, J+14), non bloquant ; le mail parti compte comme le rappel.
// 06/11/2026 (lot 4, choix de Mathieu à 23 h 43 : « Depuis le Drive ») : « Documents administratifs », sur la page
// blanche (étape Administratif). Carte « Dossier entreprise » avec les documents en cours du Drive (GET …&documents=1),
// cochés d'office selon src/lib/dossierEntreprise.ts, alertes URSSAF et assurance ; la liste du mail suit les cases tant
// que le texte n'a pas été retouché. Au moins un document pour envoyer.
// Textes : src/lib/modelesMails.ts (seule source, décision du 05/11 à 20 h 57), envoi : /api/interne/mail.
import { useEffect, useState, type SyntheticEvent } from 'react';
import { Check, FileText, FolderOpen, Mail, Paperclip, Phone, RefreshCw, Send } from 'lucide-react';
import { Carte, Alerte, BoutonPrincipal, BoutonSecondaire, TitreCarte, PastilleChoix, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';
import { BoutonsContact } from '@/components/ui/BlocContact';
import { ETAPES, MODELES, modeleDe, objetReponse, pageBlanche, remplir, type Donnees } from '@/lib/modelesMails';
import { AVIS, bloquant, enRelance, estRelance, textesPour } from '@/lib/mailsAFaire';

type Fil = { id: string; objet: string; de: string; date: number };
type PieceFiche = { id: string; nom: string; taille: number; brochure: boolean };
type DocDrive = { id: string; nom: string; sorte: string; libelle: string; ligne: string; date: string; alerte: string; coche: boolean; taille: number };
type Infos = {
  branche: boolean;
  preview: boolean;
  expediteur: string;
  nomExpediteur: string;
  signature: { html: string; texte: string } | null;
  signatureProbleme: string;
  moi: string;
  nom: string;
  peutEnvoyer: boolean;
  fiche: { id: string; nom: string; email: string; statut?: string };
  donnees: Donnees;
  fils: Fil[];
  filsProbleme: string;
  aFaire: string;
  pieces: PieceFiche[];
  devisProblemes: string[];
  documents: DocDrive[];
  documentsProblemes: string[];
};
type Brouillon = { modele: string; filId: string; a: string; cc: string; objet: string; texte: string };
type Fin = { titre: string; lignes: string[]; avertissement?: string };
type Appel = { titre: string; nom: string; tel: string };

// Textes qui joignent la brochure projet d'office (et l'annoncent)
const AVEC_BROCHURE = ['devis-envoi', 'devis-revise'];
// Texte qui joint les documents du dossier entreprise (Drive)
const DOCUMENTS = 'documents-administratifs';
// Mail en attente sur la fiche : une relance de devis ne compte que si la fiche est encore en devis envoyé ou en
// négociation (gagnée ou perdue entre-temps, elle sera effacée au contrôle quotidien)
const enAttente = (d: Infos) => (estRelance(d.aFaire) && !enRelance(d.fiche.statut) ? '' : d.aFaire);
// Ce que la fiche affaire doit savoir : seulement un mail qui bloque la suite
const bloquantDe = (cle: string) => (bloquant(cle) ? cle : '');
// Compléments de l'écran sans les valeurs vides
const nonVides = (c: Partial<Donnees> | undefined) =>
  Object.fromEntries(Object.entries(c || {}).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)));
// Documents du Drive cochés d'office
const docsParDefaut = (d: Infos) => d.documents.filter((x) => x.coche).map((x) => x.id);
// Données du texte : pour les documents administratifs, la liste des documents cochés
const donneesPour = (cle: string, d: Infos, ids: string[]): Donnees =>
  cle === DOCUMENTS ? { ...d.donnees, documents: d.documents.filter((x) => ids.includes(x.id)).map((x) => x.ligne) } : d.donnees;

// Mail prêt à relire pour un texte ('' = page blanche) : destinataires, objet (« RE: » du dernier échange si le texte
// répond dans le fil) et texte rempli avec la fiche
function preparer(cle: string, d: Infos, dest: string, ids: string[]): Brouillon {
  const m = modeleDe(cle);
  if (!m) return { modele: '', filId: '', a: dest || d.fiche.email, cc: '', objet: '', texte: pageBlanche(d.donnees) };
  const r = remplir(m, donneesPour(m.cle, d, ids));
  const fil = m.reponse ? d.fils[0] : undefined;
  return { modele: m.cle, filId: fil?.id || '', a: r.a.join(', '), cc: r.cc.join(', '), objet: fil ? objetReponse(fil.objet, r.objet) : r.objet, texte: r.corps };
}
// Numéros à appeler quand la fiche n'a pas d'adresse mail : client, contact sur place, gestionnaire
function appelsDe(d: Donnees): Appel[] {
  const x: any = d || {};
  const liste: Appel[] = [
    { titre: 'Client', nom: '', tel: String(x.telephone || '') },
    { titre: 'Contact sur place', nom: String(x.contactSurPlace?.nom || ''), tel: String(x.contactSurPlace?.tel || '') },
    { titre: 'Gestionnaire', nom: String(x.gestionnaire?.nom || ''), tel: String(x.gestionnaire?.tel || '') },
  ];
  return liste.filter((p) => p.tel.trim());
}
const dateCourte = (ms: number) =>
  ms ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ms)) : '';
const nomSeul = (de: string) => de.replace(/\s*<[^>]*>\s*$/, '').replace(/^"|"$/g, '').trim() || de;
const crochetsDe = (s: string) => (s.match(/\[/g) || []).length;
const taille = (o: number) => (o >= 1024 * 1024 ? `${(o / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo` : o > 0 ? `${Math.max(1, Math.round(o / 1024))} Ko` : '');
const jourCourt = (j: string) => { const [a, m, d] = String(j || '').split('-'); return a && m && d ? `${d}/${m}/${a}` : ''; };

// Aperçu de la signature dans un cadre isolé (aucun script, styles de l'appli sans effet), proche du rendu Gmail
const pageSignature = (html: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}body{padding:12px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45;color:#222}img{max-width:100%;height:auto}a{color:#1155cc}</style></head><body>${html}</body></html>`;
const ajusterHauteur = (e: SyntheticEvent<HTMLIFrameElement>) => {
  const cadre = e.currentTarget;
  const h = cadre.contentDocument?.documentElement?.scrollHeight;
  if (h) cadre.style.height = `${Math.min(Math.max(h, 48), 420)}px`;
};

// Case à cocher d'une pièce jointe (fiche ou Drive)
function LignePiece({ coche, titre, sous, alerte, onClick }: { coche: boolean; titre: string; sous: string; alerte?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-[14px] px-4 py-3 text-left ring-[1.5px] ${coche ? 'bg-[#e6f6f9] ring-[#0097b2]' : 'bg-white ring-[#dfe3e8]'}`}
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] ring-[1.5px] ${coche ? 'bg-[#0097b2] ring-[#0097b2]' : 'bg-white ring-[#9aa3ad]'}`}>
        {coche && <Check size={14} color="#fff" />}
      </span>
      <span className="min-w-0 grow">
        <span className="block truncate text-[14px] font-semibold">{titre}</span>
        {sous && <span className="block text-[12px] text-slate-500">{sous}</span>}
        {alerte && <span className="block text-[12px] font-semibold" style={{ color: ORANGE }}>{alerte}</span>}
      </span>
    </button>
  );
}

type Props = {
  ficheId: string;
  modele?: string;
  dest?: string;
  obligatoire?: boolean;
  fixe?: boolean;
  complements?: Partial<Donnees>;
  retour?: { href: string; libelle: string };
  onEtat?: (aFaire: string) => void;
  onEnvoye?: () => void;
  onFiche?: (nom: string) => void;
};

export default function EcrireMail({ ficheId, modele = '', dest = '', obligatoire = false, fixe = false, complements, retour, onEtat, onEnvoye, onFiche }: Props) {
  const [infos, setInfos] = useState<Infos | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cle, setCle] = useState('');
  const [filId, setFilId] = useState('');
  const [modifie, setModifie] = useState(false);
  const [a, setA] = useState('');
  const [cc, setCc] = useState('');
  const [objet, setObjet] = useState('');
  const [texte, setTexte] = useState('');
  const [choisies, setChoisies] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [fin, setFin] = useState<Fin | null>(null);
  const [telephone, setTelephone] = useState(false);
  const [phrase, setPhrase] = useState('');

  useEffect(() => {
    let annule = false;
    if (!ficheId) {
      setErreur('Ouvre ce mail depuis une fiche.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const avecDevis = modele.startsWith('devis') ? '&devis=1' : '';
        // Documents du Drive : page blanche (on peut y choisir « Documents administratifs ») ou ce texte demandé
        const avecDocuments = !obligatoire && !fixe && (!modele || modele === DOCUMENTS) ? '&documents=1' : '';
        const res = await fetch(`/api/interne/mail?fiche=${encodeURIComponent(ficheId)}${avecDevis}${avecDocuments}`, { cache: 'no-store' });
        const d = await res.json().catch(() => ({}));
        if (annule) return;
        if (!res.ok || !d?.success) {
          setErreur(d?.error || `Lecture impossible (${res.status})`);
          return;
        }
        // Compléments de l'écran (créneaux, scénario retenu, motif) ; la note d'accès de la fiche passe avant celle de Caler
        const fiche: Donnees = d.donnees;
        const donnees: Donnees = {
          ...fiche,
          ...nonVides(complements),
          acces: String(fiche?.acces || complements?.acces || ''),
        };
        const lu: Infos = {
          ...d,
          donnees,
          fils: Array.isArray(d.fils) ? d.fils : [],
          filsProbleme: String(d.filsProbleme || ''),
          aFaire: String(d.aFaire || ''),
          pieces: Array.isArray(d.pieces) ? d.pieces : [],
          devisProblemes: Array.isArray(d.devisProblemes) ? d.devisProblemes : [],
          documents: Array.isArray(d.documents) ? d.documents : [],
          documentsProblemes: Array.isArray(d.documentsProblemes) ? d.documentsProblemes : [],
        };
        setInfos(lu);
        onFiche?.(lu.fiche.nom);
        onEtat?.(bloquantDe(enAttente(lu)));
        const attendu = obligatoire ? enAttente(lu) || modele : '';
        const b = preparer(attendu || modele, lu, dest, docsParDefaut(lu));
        setCle(b.modele);
        setFilId(b.filId);
        setA(b.a);
        setCc(b.cc);
        setObjet(b.objet);
        setTexte(b.texte);
        // Envoi du devis ou devis révisé : la brochure projet (la plus récente) est cochée d'office ; documents
        // administratifs : les documents du Drive cochés d'office
        const brochure = lu.pieces.find((p) => p.brochure);
        if (AVEC_BROCHURE.includes(b.modele) && brochure) setChoisies([brochure.id]);
        if (b.modele === DOCUMENTS) setChoisies(docsParDefaut(lu));
      } catch {
        if (!annule) setErreur('Impossible de joindre le serveur.');
      } finally {
        if (!annule) setLoading(false);
      }
    })();
    return () => { annule = true; };
  }, [ficheId]);

  const attendu = obligatoire && infos ? enAttente(infos) || modele : '';
  const mAttendu = modeleDe(attendu);
  const relanceAttendue = estRelance(attendu);
  const avisAttendu = attendu === AVIS;
  const courant = modeleDe(cle);
  const choix = attendu ? MODELES.filter((m) => textesPour(attendu).includes(m.cle)) : MODELES;
  const crochets = crochetsDe(objet) + crochetsDe(texte);
  const devisEnvoi = cle === 'devis-envoi';
  const mailDevis = cle.startsWith('devis');
  const mailDocuments = cle === DOCUMENTS;
  const brochureFacultative = infos?.donnees.segment === 'RIC';
  const brochureCochee = (infos?.pieces || []).some((p) => p.brochure && choisies.includes(p.id));
  const brochureManque = devisEnvoi && !brochureFacultative && !brochureCochee;
  const documentManque = mailDocuments && !(infos?.documents || []).some((x) => choisies.includes(x.id));
  // Devis révisé : le texte annonce la brochure mais elle est décochée
  const brochureAnnonceeSansPiece = cle === 'devis-revise' && !brochureCochee && /brochure/i.test(texte);
  const pret = !!infos?.branche && !!infos?.peutEnvoyer && !!a.trim() && !!objet.trim() && !!texte.trim() && crochets === 0 && !brochureManque && !documentManque;
  const sansAdresse = !!mAttendu && !!infos && remplir(mAttendu, infos.donnees).a.length === 0;
  const appels = sansAdresse && infos ? appelsDe(infos.donnees) : [];

  const choisirModele = (nouvelle: string) => {
    if (!infos || nouvelle === cle) return;
    if (modifie && !window.confirm('Remplacer le mail en cours par ce texte ? Ce que tu as écrit sera perdu.')) return;
    const ids = docsParDefaut(infos);
    const b = preparer(nouvelle, infos, dest, ids);
    setCle(b.modele);
    setFilId(b.filId);
    setA(b.a);
    setCc(b.cc);
    setObjet(b.objet);
    setTexte(b.texte);
    setModifie(false);
    // Documents du Drive : cochés d'office pour les documents administratifs, retirés pour les autres textes
    setChoisies((l) => (b.modele === DOCUMENTS ? [...l.filter((x) => !x.startsWith('drive:')), ...ids] : l.filter((x) => !x.startsWith('drive:'))));
  };
  const choisirFil = (id: string) => {
    if (!infos) return;
    setFilId(id);
    const propre = courant ? remplir(courant, donneesPour(cle, infos, choisies)).objet : '';
    const f = infos.fils.find((x) => x.id === id);
    setObjet(f ? objetReponse(f.objet, propre) : propre);
  };
  // Une case cochée ou décochée ; documents administratifs : la liste du mail suit, tant que le texte n'est pas retouché
  const basculerPiece = (id: string) => {
    const nouvelles = choisies.includes(id) ? choisies.filter((x) => x !== id) : [...choisies, id];
    setChoisies(nouvelles);
    if (infos && courant && mailDocuments && id.startsWith('drive:') && !modifie) setTexte(remplir(courant, donneesPour(cle, infos, nouvelles)).corps);
  };

  const envoyer = async () => {
    if (!pret || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ficheId, a, cc, objet, texte, filId: courant?.reponse ? filId : '', modele: cle, pieces: choisies }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d?.success) setErreur(d?.error || `Envoi impossible (${res.status}). Rien n’est parti.`);
      else {
        const lignes = [`À : ${(Array.isArray(d.envoyeA) ? d.envoyeA : []).join(', ')}`];
        if (Array.isArray(d.pieces) && d.pieces.length) lignes.push(`Pièces jointes : ${d.pieces.join(', ')}`);
        if (d.dansLeFil) lignes.push('Parti en réponse, dans le même fil que l’échange choisi.');
        if (d.preview) lignes.push('Préversion : mail de test envoyé seulement à ton adresse, aucun client ne l’a reçu.');
        if (!d.avertissement) lignes.push('La copie est en commentaire sur la fiche.');
        if (d.regle) lignes.push(d.relance ? 'Relance réglée.' : 'Mail obligatoire réglé : la suite de la fiche est débloquée.');
        if (d.statut) lignes.push(`Fiche passée en ${d.statut} : la relance J+3 est lancée.`);
        if (d.relance) {
          lignes.push(d.relance.suspendu
            ? `Relance n°${d.relance.tentative} notée : 3 relances sans réponse, les relances sont suspendues.`
            : `Relance n°${d.relance.tentative} notée : prochaine relance le ${d.relance.prochaine}.`);
        }
        if (d.relanceRepart) lignes.push(`Relances remises à zéro : première relance le ${d.relanceRepart}.`);
        if (d.avis) {
          lignes.push(d.avis.fin
            ? `Rappel n°${d.avis.n} noté : la demande d’avis s’arrête là pour ce chantier.`
            : `Rappel n°${d.avis.n} noté : dernier rappel le ${d.avis.prochain}, s’il n’y a toujours pas d’avis.`);
        }
        setFin({ titre: 'Mail envoyé', lignes, avertissement: d.avertissement });
        if (infos) onEtat?.(d.regle ? '' : bloquantDe(enAttente(infos)));
        onEnvoye?.();
      }
    } catch {
      setErreur('Impossible de joindre le serveur. Vérifie dans Gmail (contact@chargeo.fr, Envoyés) avant de renvoyer.');
    } finally {
      setEnvoi(false);
    }
  };

  const telephoner = async () => {
    if (phrase.trim().length < 10 || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ficheId, action: 'telephone', phrase }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d?.success) setErreur(d?.error || `Enregistrement impossible (${res.status}).`);
      else {
        setFin({ titre: 'Appel noté', lignes: [avisAttendu ? 'La note est en commentaire sur la fiche, et l’appel compte comme le rappel.' : 'La note est en commentaire sur la fiche, et la suite de la fiche est débloquée.'], avertissement: d.avertissement });
        onEtat?.('');
        onEnvoye?.();
      }
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setEnvoi(false);
    }
  };

  if (loading) {
    return obligatoire ? null : (
      <Carte className="p-8 text-center">
        <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
        <p className="mt-3 text-[15px] font-semibold">{modele.startsWith('devis') ? 'Lecture des devis dans Costructor...' : 'Chargement...'}</p>
      </Carte>
    );
  }
  if (fin) {
    return (
      <Carte accent className="space-y-2">
        <p className="flex items-center gap-2 text-[17px] font-bold"><Check size={20} color={CYAN} /> {fin.titre}</p>
        {fin.lignes.map((l) => <p key={l} className="text-[14px]">{l}</p>)}
        {fin.avertissement && <p className="text-[14px] font-semibold" style={{ color: ORANGE }}>{fin.avertissement}</p>}
        {retour && <a href={retour.href} className="inline-block pt-1 text-[15px] font-semibold" style={{ color: CYAN }}>{retour.libelle}</a>}
      </Carte>
    );
  }
  if (!infos) return erreur ? <Alerte>{erreur}</Alerte> : null;
  if (obligatoire && !attendu) return null;

  return (
    <div className="space-y-4">
      {infos.preview && (
        <Alerte>Préversion : le mail part seulement à ton adresse ({infos.moi || 'introuvable'}), avec [TEST] dans l&apos;objet. Aucun client ne le reçoit.</Alerte>
      )}
      {!infos.branche && <Alerte>Envoi pas encore branché : la clé Google des mails est absente dans Vercel.</Alerte>}
      {!infos.peutEnvoyer && <Alerte>L&apos;envoi est réservé à la direction, au commercial, au chargé d&apos;opération et au back-office.</Alerte>}
      {mailDevis && infos.devisProblemes.length > 0 && (
        <Alerte>
          <span className="block font-semibold">À regarder dans Costructor avant l&apos;envoi :</span>
          {infos.devisProblemes.map((p) => <span key={p} className="block">• {p}</span>)}
        </Alerte>
      )}
      {mailDocuments && infos.documentsProblemes.length > 0 && (
        <Alerte>
          <span className="block font-semibold">À regarder dans le Drive avant l&apos;envoi :</span>
          {infos.documentsProblemes.map((p) => <span key={p} className="block">• {p}</span>)}
        </Alerte>
      )}

      {attendu ? (
        <Carte accent className="space-y-3">
          <p className="flex items-center gap-2 text-[17px] font-bold"><Mail size={20} color={CYAN} /> Mail à envoyer : {mAttendu?.nom || attendu}</p>
          {relanceAttendue ? (
            <p className="text-[14px]">C&apos;est le jour de la relance : écris ta phrase utile, puis envoie. Le mail compte comme la relance. Elle ne bloque pas la suite de la fiche. Relance faite par téléphone : note 🔁 Suivi relance, ce mail disparaît.</p>
          ) : avisAttendu ? (
            <p className="text-[14px]">C&apos;est le jour du rappel pour l&apos;avis Google : ajoute un détail du chantier, puis envoie. Le mail compte comme le rappel et ne bloque rien.</p>
          ) : (
            <p className="text-[14px]">Obligatoire : la suite de la fiche reste bloquée tant qu&apos;il n&apos;est pas parti.</p>
          )}
          {choix.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {choix.map((m) => (
                <PastilleChoix key={m.cle} actif={cle === m.cle} onClick={() => choisirModele(m.cle)}>{m.court}</PastilleChoix>
              ))}
            </div>
          )}
        </Carte>
      ) : fixe ? null : (
        <Carte className="space-y-3">
          <TitreCarte icon={FileText}>Quel mail ?</TitreCarte>
          {ETAPES.map((etape) => (
            <div key={etape}>
              <p className={ETIQUETTE}>{etape}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {MODELES.filter((m) => m.etape === etape).map((m) => (
                  <PastilleChoix key={m.cle} actif={cle === m.cle} onClick={() => choisirModele(m.cle)}>{m.court}</PastilleChoix>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <PastilleChoix actif={!cle} onClick={() => choisirModele('')}>Page blanche</PastilleChoix>
          </div>
        </Carte>
      )}

      <Carte className="space-y-3">
        <TitreCarte icon={Mail}>{courant ? courant.nom : 'Nouveau mail'}</TitreCarte>
        <div>
          <p className={ETIQUETTE}>De</p>
          <p className="mt-1.5 px-1 text-[15px] font-semibold">{infos.nomExpediteur || "L'équipe CHARGéO"} &lt;{infos.expediteur}&gt;</p>
        </div>
        {courant?.reponse && (
          <div>
            <p className={ETIQUETTE}>Répondre à</p>
            {infos.fils.length ? (
              <div className="mt-1.5 space-y-2">
                {infos.fils.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => choisirFil(f.id)}
                    className={`block w-full cursor-pointer rounded-[14px] px-4 py-3 text-left ring-[1.5px] ${filId === f.id ? 'bg-[#e6f6f9] ring-[#0097b2]' : 'bg-white ring-[#dfe3e8]'}`}
                  >
                    <span className="block text-[14px] font-semibold">{f.objet || '(sans objet)'}</span>
                    <span className="block text-[12px] text-slate-500">{nomSeul(f.de)} · {dateCourte(f.date)}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => choisirFil('')}
                  className={`block w-full cursor-pointer rounded-[14px] px-4 py-3 text-left text-[14px] font-semibold ring-[1.5px] ${!filId ? 'bg-[#e6f6f9] ring-[#0097b2]' : 'bg-white ring-[#dfe3e8]'}`}
                >
                  Nouveau mail, sans répondre à un échange
                </button>
              </div>
            ) : (
              <p className="ml-1 mt-1.5 text-[13px] text-slate-500">
                {infos.filsProbleme
                  ? `Échanges illisibles (${infos.filsProbleme}) : le mail partira comme un nouveau mail.`
                  : 'Aucun échange trouvé avec les adresses de la fiche : le mail partira comme un nouveau mail.'}
              </p>
            )}
          </div>
        )}
        <div>
          <label className={ETIQUETTE} htmlFor={`mail-a-${ficheId}`}>À</label>
          <input id={`mail-a-${ficheId}`} className={`${CHAMP} mt-1.5`} type="email" inputMode="email" multiple value={a} onChange={(e) => { setA(e.target.value); setModifie(true); }} placeholder="adresse@exemple.fr" />
          <p className="ml-1 mt-1 text-[12px] text-slate-500">Plusieurs adresses : sépare-les par une virgule.</p>
        </div>
        <div>
          <label className={ETIQUETTE} htmlFor={`mail-cc-${ficheId}`}>Cc (facultatif)</label>
          <input id={`mail-cc-${ficheId}`} className={`${CHAMP} mt-1.5`} type="email" inputMode="email" multiple value={cc} onChange={(e) => { setCc(e.target.value); setModifie(true); }} />
        </div>
        <div>
          <label className={ETIQUETTE} htmlFor={`mail-objet-${ficheId}`}>Objet</label>
          <input id={`mail-objet-${ficheId}`} className={`${CHAMP} mt-1.5`} value={objet} maxLength={200} onChange={(e) => { setObjet(e.target.value); setModifie(true); }} />
        </div>
        <div>
          <label className={ETIQUETTE} htmlFor={`mail-texte-${ficheId}`}>Message</label>
          <textarea id={`mail-texte-${ficheId}`} className={`${CHAMP} mt-1.5 min-h-[300px]`} value={texte} onChange={(e) => { setTexte(e.target.value); setModifie(true); }} />
          {crochets > 0 && (
            <p className="ml-1 mt-1 text-[12px] font-semibold text-[#c2410c]">
              {crochets} passage{crochets > 1 ? 's' : ''} entre [crochets] à compléter ou à supprimer avant l&apos;envoi.
            </p>
          )}
        </div>
        {mailDocuments && (
          <div>
            <p className={`${ETIQUETTE} flex items-center gap-1.5`}><FolderOpen size={14} /> Dossier entreprise (Drive)</p>
            {infos.documents.length ? (
              <div className="mt-1.5 space-y-2">
                {infos.documents.map((x) => (
                  <LignePiece
                    key={x.id}
                    coche={choisies.includes(x.id)}
                    titre={x.libelle}
                    sous={[jourCourt(x.date) ? `du ${jourCourt(x.date)}` : '', taille(x.taille)].filter(Boolean).join(' · ')}
                    alerte={x.alerte}
                    onClick={() => basculerPiece(x.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="ml-1 mt-1.5 text-[13px] font-semibold" style={{ color: ORANGE }}>Aucun document lu dans le Drive pour l&apos;instant.</p>
            )}
            {documentManque && infos.documents.length > 0 && (
              <p className="ml-1 mt-1.5 text-[13px] font-semibold" style={{ color: ORANGE }}>Coche au moins un document.</p>
            )}
            {modifie && <p className="ml-1 mt-1.5 text-[12px] text-slate-500">Tu as retouché le texte : la liste du mail ne suit plus les cases, vérifie-la avant l&apos;envoi.</p>}
          </div>
        )}
        {(devisEnvoi || infos.pieces.length > 0) && (
          <div>
            <p className={`${ETIQUETTE} flex items-center gap-1.5`}><Paperclip size={14} /> Pièces jointes{mailDocuments ? ' de la fiche' : ''}</p>
            {infos.pieces.length ? (
              <div className="mt-1.5 space-y-2">
                {infos.pieces.map((p) => (
                  <LignePiece
                    key={p.id}
                    coche={choisies.includes(p.id)}
                    titre={p.nom}
                    sous={[p.brochure ? 'Brochure projet' : '', taille(p.taille)].filter(Boolean).join(' · ')}
                    onClick={() => basculerPiece(p.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="ml-1 mt-1.5 text-[13px] text-slate-500">Aucun PDF sur la fiche.</p>
            )}
            {brochureManque && (
              <p className="ml-1 mt-1.5 text-[13px] font-semibold" style={{ color: ORANGE }}>
                {infos.pieces.some((p) => p.brochure)
                  ? 'Coche la brochure projet : elle part avec le devis.'
                  : 'Brochure projet absente de la fiche : dépose son PDF (« PROJET-… ») sur la fiche, puis rouvre ce mail. Elle part avec le devis.'}
              </p>
            )}
            {brochureAnnonceeSansPiece && (
              <p className="ml-1 mt-1.5 text-[13px] font-semibold" style={{ color: ORANGE }}>Le texte annonce la brochure : coche-la, ou retire la phrase qui l&apos;annonce.</p>
            )}
            {devisEnvoi && brochureFacultative && !infos.pieces.some((p) => p.brochure) && (
              <p className="ml-1 mt-1.5 text-[13px] text-slate-500">En RIC, la brochure projet est facultative.</p>
            )}
          </div>
        )}
        <div>
          <p className={ETIQUETTE}>Signature</p>
          {infos.signature ? (
            <>
              <iframe
                title="Signature du mail"
                sandbox="allow-same-origin"
                srcDoc={pageSignature(infos.signature.html)}
                onLoad={ajusterHauteur}
                className="mt-1.5 block w-full rounded-[14px] bg-white ring-[1.5px] ring-[#dfe3e8]"
                style={{ height: 150, border: 0 }}
              />
              <p className="ml-1 mt-1 text-[12px] text-slate-500">Celle de Gmail (contact@chargeo.fr), ajoutée sous ton message à l&apos;envoi.</p>
            </>
          ) : (
            <Alerte className="mt-1.5">Signature Gmail pas trouvée : le mail partira sans signature ({infos.signatureProbleme || 'raison inconnue'}).</Alerte>
          )}
        </div>
        <p className="text-[12px] text-slate-500">Relis avant d&apos;envoyer : le mail part tel quel, signature comprise, et sa copie va en commentaire sur la fiche.</p>
      </Carte>

      {erreur && <Alerte>{erreur}</Alerte>}
      <BoutonPrincipal inactif={!pret || envoi} disabled={!pret || envoi} onClick={envoyer}>
        {envoi ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
        {envoi ? 'Envoi…' : 'Envoyer'}
      </BoutonPrincipal>
      {!pret && infos.branche && infos.peutEnvoyer && (
        <p className="px-1 text-center text-[13px]">
          {!a.trim()
            ? 'Indique au moins un destinataire.'
            : !objet.trim()
              ? 'Donne un objet au mail.'
              : !texte.trim()
                ? 'Écris le message.'
                : crochets > 0
                  ? `Il reste ${crochets} passage${crochets > 1 ? 's' : ''} entre [crochets] : complète-les ou supprime-les.`
                  : documentManque
                    ? 'Coche au moins un document du dossier entreprise.'
                    : 'La brochure projet doit partir avec le devis.'}
        </p>
      )}

      {sansAdresse && (
        <Carte className="space-y-3">
          <TitreCarte icon={Phone}>Pas d&apos;adresse mail ?</TitreCarte>
          <p className="text-[14px]">La fiche n&apos;a pas d&apos;adresse pour ce mail. Appelle le client, puis note ce que tu lui as dit : c&apos;est la seule façon de régler ce mail sans l&apos;envoyer.</p>
          {appels.length ? (
            appels.map((p) => (
              <div key={`${p.titre}-${p.tel}`} className="space-y-2">
                <p className="text-[14px]"><strong>{p.titre} :</strong> {p.nom ? `${p.nom} · ` : ''}{p.tel}</p>
                <BoutonsContact tel={p.tel} email="" moi={infos.moi} />
              </div>
            ))
          ) : (
            <p className="text-[13px] font-semibold" style={{ color: ORANGE }}>Pas de numéro de téléphone sur la fiche : ajoute-le pour pouvoir appeler depuis l&apos;appli.</p>
          )}
          {!telephone ? (
            <BoutonSecondaire compact onClick={() => setTelephone(true)}>
              <Phone size={17} /> Prévenu par téléphone
            </BoutonSecondaire>
          ) : (
            <>
              <label className={ETIQUETTE} htmlFor={`mail-tel-${ficheId}`}>Ce que tu lui as dit (obligatoire)</label>
              <textarea id={`mail-tel-${ficheId}`} className={`${CHAMP} min-h-[90px]`} value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="Ex. : visite confirmée jeudi 12 à 14 h, il laissera le portail ouvert." />
              <BoutonPrincipal inactif={phrase.trim().length < 10 || envoi} disabled={phrase.trim().length < 10 || envoi} onClick={telephoner}>
                {envoi ? <RefreshCw size={20} className="animate-spin" /> : <Phone size={20} />}
                Valider l&apos;appel
              </BoutonPrincipal>
            </>
          )}
        </Carte>
      )}
    </div>
  );
}
