"use client";

// Écrire un mail depuis l'appli (Phase 9, lot 1, 05/11/2026), ouvert par le bouton « Mail » du bloc 📇 Contact :
// /mail?fiche=<id>&a=<destinataire>&modele=<clé>. Le mail part de contact@chargeo.fr au clic « Envoyer », jamais tout
// seul, et sa copie va en commentaire sur la fiche (src/app/api/interne/mail/route.ts).
// 05/11/2026, 19 h 00 (retour de Mathieu) : le nom d'envoi (« L'équipe CHARGéO ») et la signature viennent des réglages
// Gmail de contact@chargeo.fr (src/lib/mails.ts). La signature s'affiche sous le message, telle qu'elle partira.
// Lot 2 (05/11/2026, décisions de Mathieu à 20 h 57 et 21 h 22) : choix du mail (textes de src/lib/modelesMails.ts,
// remplis avec la fiche) ou page blanche ; pour une réponse, choix du fil parmi les derniers échanges avec les adresses
// de la fiche ; envoi bloqué tant qu'il reste un « [ ». Les mails des étapes suivantes arrivent aux lots 3 à 5.
// Préversion : le mail part seulement à l'adresse de la personne connectée, avec [TEST] dans l'objet.
import { useEffect, useState, type SyntheticEvent } from 'react';
import { ArrowLeft, Check, FileText, Mail, RefreshCw, Send } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, BoutonPrincipal, TitreCarte, PastilleChoix, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';
import { adresses } from '@/lib/adresses';
import { ETAPES, MODELES, modeleDe, objetReponse, pageBlanche, remplir, type Donnees } from '@/lib/modelesMails';

type Fil = { id: string; objet: string; de: string; date: number };
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
  fiche: { id: string; nom: string; email: string };
  donnees: Donnees;
  fils: Fil[];
  filsProbleme: string;
};
type Resultat = { envoyeA: string[]; preview: boolean; dansLeFil?: boolean; avertissement?: string };
type Brouillon = { modele: string; filId: string; a: string; cc: string; objet: string; texte: string };

// Mail prêt à relire pour un modèle ('' = page blanche) : destinataires, objet (« RE: » du dernier échange si le
// modèle répond dans le fil) et texte rempli avec la fiche
function preparer(cle: string, d: Infos, dest: string): Brouillon {
  const m = modeleDe(cle);
  if (!m) return { modele: '', filId: '', a: dest || d.fiche.email, cc: '', objet: '', texte: pageBlanche(d.donnees) };
  const r = remplir(m, d.donnees);
  const fil = m.reponse ? d.fils[0] : undefined;
  return { modele: m.cle, filId: fil?.id || '', a: r.a.join(', '), cc: r.cc.join(', '), objet: fil ? objetReponse(fil.objet) : r.objet, texte: r.corps };
}
const dateCourte = (ms: number) =>
  ms ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ms)) : '';
const nomSeul = (de: string) => de.replace(/\s*<[^>]*>\s*$/, '').replace(/^"|"$/g, '').trim() || de;
const crochetsDe = (s: string) => (s.match(/\[/g) || []).length;

// Aperçu de la signature dans un cadre isolé (aucun script, styles de l'appli sans effet), proche du rendu Gmail
const pageSignature = (html: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}body{padding:12px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45;color:#222}img{max-width:100%;height:auto}a{color:#1155cc}</style></head><body>${html}</body></html>`;
const ajusterHauteur = (e: SyntheticEvent<HTMLIFrameElement>) => {
  const cadre = e.currentTarget;
  const h = cadre.contentDocument?.documentElement?.scrollHeight;
  if (h) cadre.style.height = `${Math.min(Math.max(h, 48), 420)}px`;
};

export default function MailPage() {
  const [ficheId, setFicheId] = useState('');
  const [dest, setDest] = useState('');
  const [infos, setInfos] = useState<Infos | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [modele, setModele] = useState('');
  const [filId, setFilId] = useState('');
  const [modifie, setModifie] = useState(false);
  const [a, setA] = useState('');
  const [cc, setCc] = useState('');
  const [objet, setObjet] = useState('');
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const id = p.get('fiche') || '';
    const destinataire = p.get('a') || '';
    const cle = p.get('modele') || '';
    setFicheId(id);
    setDest(destinataire);
    if (!id) {
      setErreur('Ouvre ce mail depuis une fiche (bouton « Mail » du bloc Contact).');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/interne/mail?fiche=${encodeURIComponent(id)}`, { cache: 'no-store' });
        const d = await res.json().catch(() => ({}));
        if (!res.ok || !d?.success) setErreur(d?.error || `Lecture impossible (${res.status})`);
        else {
          const lu: Infos = { ...d, fils: Array.isArray(d.fils) ? d.fils : [], filsProbleme: String(d.filsProbleme || '') };
          setInfos(lu);
          const b = preparer(cle, lu, destinataire);
          setModele(b.modele);
          setFilId(b.filId);
          setA(b.a);
          setCc(b.cc);
          setObjet(b.objet);
          setTexte(b.texte);
        }
      } catch {
        setErreur('Impossible de joindre le serveur.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const courant = modeleDe(modele);
  const crochets = crochetsDe(objet) + crochetsDe(texte);
  const pret = !!infos?.branche && !!infos?.peutEnvoyer && !!a.trim() && !!objet.trim() && !!texte.trim() && crochets === 0;

  const choisirModele = (cle: string) => {
    if (!infos || cle === modele) return;
    if (modifie && !window.confirm('Remplacer le mail en cours par ce modèle ? Ce que tu as écrit sera perdu.')) return;
    const b = preparer(cle, infos, dest);
    setModele(b.modele);
    setFilId(b.filId);
    setA(b.a);
    setCc(b.cc);
    setObjet(b.objet);
    setTexte(b.texte);
    setModifie(false);
  };
  const choisirFil = (id: string) => {
    if (!infos) return;
    setFilId(id);
    const f = infos.fils.find((x) => x.id === id);
    if (f) setObjet(objetReponse(f.objet));
    else if (courant) setObjet(remplir(courant, infos.donnees).objet);
  };

  const envoyer = async () => {
    if (!pret || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ficheId, a, cc, objet, texte, filId: courant?.reponse ? filId : '' }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d?.success) setErreur(d?.error || `Envoi impossible (${res.status}). Rien n’est parti.`);
      else setResultat(d as Resultat);
    } catch {
      setErreur('Impossible de joindre le serveur. Vérifie dans Gmail (contact@chargeo.fr, Envoyés) avant de renvoyer.');
    } finally {
      setEnvoi(false);
    }
  };

  const retourFiche = ficheId ? adresses.fiche(ficheId) : adresses.journee;
  const titre = infos?.fiche?.nom || 'Écrire un mail';

  // ── Écran de fin ──
  if (resultat) {
    return (
      <PageAppli>
        <EnTeteAppli surtitre="Mail" titre={titre} retour={{ href: retourFiche, libelle: 'La fiche' }} />
        <ContenuAppli className="space-y-4">
          {resultat.avertissement && <Alerte>{resultat.avertissement}</Alerte>}
          <Carte accent className="space-y-2">
            <p className="flex items-center gap-2 text-[17px] font-bold"><Check size={20} color={CYAN} /> Mail envoyé</p>
            <p className="text-[14px]">À : {resultat.envoyeA.join(', ')}</p>
            {resultat.dansLeFil && <p className="text-[14px]">Parti en réponse, dans le même fil que l&apos;échange choisi.</p>}
            {resultat.preview && <p className="text-[14px]">Préversion : mail de test envoyé seulement à ton adresse, aucun client ne l&apos;a reçu.</p>}
            {!resultat.avertissement && <p className="text-[14px]">La copie est en commentaire sur la fiche.</p>}
          </Carte>
          <a href={retourFiche} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-8 py-4 text-[17px] font-semibold text-white shadow-[0_8px_22px_rgba(255,107,0,0.28)]">
            <ArrowLeft size={20} /> Revenir à la fiche
          </a>
        </ContenuAppli>
      </PageAppli>
    );
  }

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Écrire un mail" titre={titre} retour={{ href: retourFiche, libelle: 'La fiche' }} />
      <ContenuAppli className="space-y-4">
        {loading && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement...</p>
          </Carte>
        )}
        {infos?.preview && (
          <Alerte>Préversion : le mail part seulement à ton adresse ({infos.moi || 'introuvable'}), avec [TEST] dans l&apos;objet. Aucun client ne le reçoit.</Alerte>
        )}
        {infos && !infos.branche && <Alerte>Envoi pas encore branché : la clé Google des mails est absente dans Vercel.</Alerte>}
        {infos && !infos.peutEnvoyer && <Alerte>L&apos;envoi est réservé à la direction, au commercial, au chargé d&apos;opération et au back-office.</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}

        {infos && (
          <Carte className="space-y-3">
            <TitreCarte icon={FileText}>Quel mail ?</TitreCarte>
            {ETAPES.map((etape) => (
              <div key={etape}>
                <p className={ETIQUETTE}>{etape}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {MODELES.filter((m) => m.etape === etape).map((m) => (
                    <PastilleChoix key={m.cle} actif={modele === m.cle} onClick={() => choisirModele(m.cle)}>{m.court}</PastilleChoix>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <PastilleChoix actif={!modele} onClick={() => choisirModele('')}>Page blanche</PastilleChoix>
            </div>
          </Carte>
        )}

        {infos && (
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
                        className={`block w-full rounded-[14px] px-4 py-3 text-left ring-[1.5px] ${filId === f.id ? 'bg-[#e6f6f9] ring-[#0097b2]' : 'bg-white ring-[#dfe3e8]'}`}
                      >
                        <span className="block text-[14px] font-semibold">{f.objet || '(sans objet)'}</span>
                        <span className="block text-[12px] text-slate-500">{nomSeul(f.de)} · {dateCourte(f.date)}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => choisirFil('')}
                      className={`block w-full rounded-[14px] px-4 py-3 text-left text-[14px] font-semibold ring-[1.5px] ${!filId ? 'bg-[#e6f6f9] ring-[#0097b2]' : 'bg-white ring-[#dfe3e8]'}`}
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
              <label className={ETIQUETTE} htmlFor="mail-a">À</label>
              <input id="mail-a" className={`${CHAMP} mt-1.5`} type="email" inputMode="email" multiple value={a} onChange={(e) => { setA(e.target.value); setModifie(true); }} placeholder="adresse@exemple.fr" />
              <p className="ml-1 mt-1 text-[12px] text-slate-500">Plusieurs adresses : sépare-les par une virgule.</p>
            </div>
            <div>
              <label className={ETIQUETTE} htmlFor="mail-cc">Cc (facultatif)</label>
              <input id="mail-cc" className={`${CHAMP} mt-1.5`} type="email" inputMode="email" multiple value={cc} onChange={(e) => { setCc(e.target.value); setModifie(true); }} />
            </div>
            <div>
              <label className={ETIQUETTE} htmlFor="mail-objet">Objet</label>
              <input id="mail-objet" className={`${CHAMP} mt-1.5`} value={objet} maxLength={200} onChange={(e) => { setObjet(e.target.value); setModifie(true); }} />
            </div>
            <div>
              <label className={ETIQUETTE} htmlFor="mail-texte">Message</label>
              <textarea id="mail-texte" className={`${CHAMP} mt-1.5 min-h-[300px]`} value={texte} onChange={(e) => { setTexte(e.target.value); setModifie(true); }} />
              {crochets > 0 && (
                <p className="ml-1 mt-1 text-[12px] font-semibold text-[#c2410c]">
                  {crochets} passage{crochets > 1 ? 's' : ''} entre [crochets] à compléter ou à supprimer avant l&apos;envoi.
                </p>
              )}
            </div>
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
        )}

        {infos && (
          <BoutonPrincipal inactif={!pret || envoi} disabled={!pret || envoi} onClick={envoyer}>
            {envoi ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
            {envoi ? 'Envoi…' : 'Envoyer'}
          </BoutonPrincipal>
        )}
        {infos && !pret && infos.branche && infos.peutEnvoyer && (
          <p className="px-1 text-center text-[13px]">
            {!a.trim()
              ? 'Indique au moins un destinataire.'
              : !objet.trim()
                ? 'Donne un objet au mail.'
                : !texte.trim()
                  ? 'Écris le message.'
                  : `Il reste ${crochets} passage${crochets > 1 ? 's' : ''} entre [crochets] : complète-les ou supprime-les.`}
          </p>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
