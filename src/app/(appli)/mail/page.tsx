"use client";

// Écrire un mail depuis l'appli (Phase 9, lot 1, 05/11/2026), ouvert par le bouton « Mail » du bloc 📇 Contact :
// /mail?fiche=<id>&a=<destinataire>. Page blanche : le mail part de contact@chargeo.fr au clic « Envoyer », jamais tout
// seul, et sa copie va en commentaire sur la fiche (src/app/api/interne/mail/route.ts). Les textes déjà remplis par
// étape (nouvelle demande, visite, devis, relances, factures, candidatures) arrivent aux lots 2 à 5.
// 05/11/2026, 19 h 00 (retour de Mathieu) : le nom d'envoi (« L'équipe CHARGéO ») et la signature viennent des réglages
// Gmail de contact@chargeo.fr (src/lib/mails.ts). La signature s'affiche sous le message, telle qu'elle partira, et n'est
// plus recopiée dans le message.
// Préversion : le mail part seulement à l'adresse de la personne connectée, avec [TEST] dans l'objet.
import { useEffect, useState, type SyntheticEvent } from 'react';
import { ArrowLeft, Check, Mail, RefreshCw, Send } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, BoutonPrincipal, TitreCarte, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';
import { adresses } from '@/lib/adresses';

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
};
type Resultat = { envoyeA: string[]; preview: boolean; avertissement?: string };

const TEXTE_DE_DEPART = 'Bonjour,\n\n\nÀ bientôt,';

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
  const [infos, setInfos] = useState<Infos | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [a, setA] = useState('');
  const [cc, setCc] = useState('');
  const [objet, setObjet] = useState('');
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const id = p.get('fiche') || '';
    const dest = p.get('a') || '';
    setFicheId(id);
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
          setInfos(d as Infos);
          setA(dest || d.fiche?.email || '');
          setTexte(TEXTE_DE_DEPART);
        }
      } catch {
        setErreur('Impossible de joindre le serveur.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pret = !!infos?.branche && !!infos?.peutEnvoyer && !!a.trim() && !!objet.trim() && !!texte.trim();

  const envoyer = async () => {
    if (!pret || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ficheId, a, cc, objet, texte }),
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
            <TitreCarte icon={Mail}>Nouveau mail</TitreCarte>
            <div>
              <p className={ETIQUETTE}>De</p>
              <p className="mt-1.5 px-1 text-[15px] font-semibold">{infos.nomExpediteur || "L'équipe CHARGéO"} &lt;{infos.expediteur}&gt;</p>
            </div>
            <div>
              <label className={ETIQUETTE} htmlFor="mail-a">À</label>
              <input id="mail-a" className={`${CHAMP} mt-1.5`} type="email" inputMode="email" multiple value={a} onChange={(e) => setA(e.target.value)} placeholder="adresse@exemple.fr" />
              <p className="ml-1 mt-1 text-[12px] text-slate-500">Plusieurs adresses : sépare-les par une virgule.</p>
            </div>
            <div>
              <label className={ETIQUETTE} htmlFor="mail-cc">Cc (facultatif)</label>
              <input id="mail-cc" className={`${CHAMP} mt-1.5`} type="email" inputMode="email" multiple value={cc} onChange={(e) => setCc(e.target.value)} />
            </div>
            <div>
              <label className={ETIQUETTE} htmlFor="mail-objet">Objet</label>
              <input id="mail-objet" className={`${CHAMP} mt-1.5`} value={objet} maxLength={200} onChange={(e) => setObjet(e.target.value)} />
            </div>
            <div>
              <label className={ETIQUETTE} htmlFor="mail-texte">Message</label>
              <textarea id="mail-texte" className={`${CHAMP} mt-1.5 min-h-[240px]`} value={texte} onChange={(e) => setTexte(e.target.value)} />
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
          <p className="px-1 text-center text-[13px]">{!a.trim() ? 'Indique au moins un destinataire.' : !objet.trim() ? 'Donne un objet au mail.' : 'Écris le message.'}</p>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
