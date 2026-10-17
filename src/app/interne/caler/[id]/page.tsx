"use client";

// Caler le relevé technique (17/10/2026, 20 h 44, choix de Matthieu : « Caler + email de confirmation prêt à
// envoyer »). Le commercial a le client au téléphone : jour, heure, chef de chantier, note d'accès. Ensuite l'email
// de confirmation s'ouvre dans sa messagerie, déjà rédigé, qu'il relit et envoie (ou qu'il copie).
// Écrit par /api/interne/caler. Ouvert depuis « Visites à caler » (bouton sur chaque carte).
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarCheck, Check, ChevronRight, Copy, Mail, MapPin, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';

type Fiche = { id: string; nom: string; statut: string; aVisiter: boolean; adresse: string; email: string; telephone: string; dejaCale: string };
type Chef = { id: number; nom: string };
type Email = { a: string; sujet: string; texte: string };

const CRENEAUX = ['08:00', '09:00', '10:00', '11:00', '13:30', '14:30', '15:30', '16:30'];
const jourIso = (decalage: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + decalage * 86400000));
const libelleJour = (iso: string) => {
  const [a, m, j] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, j, 12)));
};
// Les 10 prochains jours ouvrés (lundi à vendredi), à partir de demain
const prochainsJours = () => {
  const jours: string[] = [];
  for (let i = 1; jours.length < 10 && i < 20; i++) {
    const iso = jourIso(i);
    const [a, m, j] = iso.split('-').map(Number);
    const w = new Date(Date.UTC(a, m - 1, j, 12)).getUTCDay();
    if (w !== 0 && w !== 6) jours.push(iso);
  }
  return jours;
};

export default function CalerPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [preview, setPreview] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const [chefId, setChefId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [cale, setCale] = useState<{ quand: string; chef: string; lienFiche: string } | null>(null);
  const [email, setEmail] = useState<Email | null>(null);
  const [chefOk, setChefOk] = useState(true);
  const [copie, setCopie] = useState(false);
  const jours = prochainsJours();

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/interne/caler?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) setErreur(data?.error || `Lecture impossible (${res.status})`);
        else {
          setFiche(data.fiche);
          setChefs(data.chefs || []);
          setPreview(!!data.preview);
          setChefId(data.chefAssigne || (data.chefs?.length === 1 ? data.chefs[0].id : null));
        }
      } catch {
        setErreur('Impossible de joindre le serveur.');
      }
    })();
  }, [id]);

  const pret = !!date && /^\d{2}:\d{2}$/.test(heure) && (chefs.length === 0 || chefId !== null);
  const envoyer = async () => {
    if (!pret || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/caler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, date, heure, chefId, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) setErreur(data?.error || `Enregistrement impossible (${res.status})`);
      else { setCale(data.cale); setEmail(data.emailConfirmation); setChefOk(data.chefOk !== false); setPreview(!!data.preview); }
    } catch {
      setErreur('Impossible de joindre le serveur. Rien n’a été enregistré.');
    } finally {
      setEnvoi(false);
    }
  };

  const copier = async () => {
    if (!email) return;
    try { await navigator.clipboard.writeText(`${email.sujet}\n\n${email.texte}`); setCopie(true); } catch { setCopie(false); }
  };

  const pastille = (actif: boolean, libelle: string, changer: () => void) => (
    <button key={libelle} onClick={changer} className={`rounded-full px-4 py-2 text-[14px] font-bold ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={actif ? { backgroundColor: CYAN } : undefined}>
      {libelle}
    </button>
  );
  const retour = '/interne/fiches?vue=a-caler';
  const boutonRetour = (
    <a href={retour} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Visites à caler
    </a>
  );

  if (cale) {
    const mailto = email?.a ? `mailto:${encodeURIComponent(email.a)}?subject=${encodeURIComponent(email.sujet)}&body=${encodeURIComponent(email.texte)}` : '';
    return (
      <PageAppli>
        <EnTeteAppli surtitre="Relevé technique" titre="Rendez-vous calé" retour={{ href: retour, libelle: 'Visites à caler' }} />
        <ContenuAppli className="space-y-4">
          {preview && <Alerte>Preview : seule la fiche « Test · … » a été modifiée.</Alerte>}
          {!chefOk && <Alerte>La date est enregistrée, mais le chef de chantier n’a pas pu être assigné à la fiche.</Alerte>}
          <Carte accent>
            <p className="text-[18px] font-bold">{fiche?.nom}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[15px] font-bold" style={{ color: CYAN }}><CalendarCheck size={16} /> {cale.quand}</p>
            {cale.chef && <p className="mt-1 text-[14px]">Avec {cale.chef}. Il le voit dans ses Relevés planifiés.</p>}
          </Carte>

          {email && (
            <>
              <Repere>Email de confirmation</Repere>
              {mailto ? (
                <a href={mailto} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-8 py-4 text-[17px] font-semibold text-white shadow-[0_8px_22px_rgba(255,107,0,0.28)]">
                  <Mail size={20} /> Ouvrir l’email pour {email.a}
                </a>
              ) : (
                <Alerte>Pas d’email sur la fiche du client : copie le texte et envoie-le par le moyen de ton choix.</Alerte>
              )}
              <Carte className="space-y-2">
                <p className="text-[13px] font-bold text-slate-500">{email.sujet}</p>
                <p className="whitespace-pre-line text-[14px] leading-relaxed">{email.texte}</p>
              </Carte>
              <button onClick={copier} className="flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-bold ring-[1.5px] ring-[#dfe3e8]" style={{ color: CYAN }}>
                {copie ? <Check size={17} /> : <Copy size={17} />} {copie ? 'Texte copié' : 'Copier le texte'}
              </button>
            </>
          )}
          <a href={cale.lienFiche} className="flex items-center justify-center gap-1 text-[15px] font-semibold" style={{ color: CYAN }}>Ouvrir la fiche <ChevronRight size={16} /></a>
          <a href="/interne/agenda" className="block text-center text-[15px] font-semibold" style={{ color: CYAN }}>Voir l’agenda des visites</a>
        </ContenuAppli>
      </PageAppli>
    );
  }

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Relevé technique" titre={fiche?.nom || 'Caler le relevé'} action={boutonRetour} />
      <ContenuAppli className="space-y-4">
        {preview && <Alerte>Preview : seules les fiches « Test · … » peuvent être calées.</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {!fiche && !erreur && <Carte className="p-8 text-center"><RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} /></Carte>}
        {fiche && !fiche.aVisiter && <Alerte>Cette fiche n’est plus à visiter ({fiche.statut}) : le relevé est déjà fait.</Alerte>}
        {fiche && fiche.aVisiter && (
          <>
            {(fiche.adresse || fiche.dejaCale) && (
              <Carte className="space-y-1">
                {fiche.adresse && <p className="flex items-center gap-1.5 text-[14px]"><MapPin size={15} color={CYAN} /> {fiche.adresse}</p>}
                {fiche.dejaCale && <p className="text-[14px] font-bold">Déjà calé le {fiche.dejaCale} : enregistrer décale le rendez-vous.</p>}
              </Carte>
            )}

            <Repere>1 · Le jour</Repere>
            <div className="flex flex-wrap gap-2">{jours.map((j) => pastille(date === j, libelleJour(j), () => setDate(j)))}</div>
            <input type="date" className={CHAMP} value={date} min={jourIso(0)} onChange={(e) => setDate(e.target.value)} />

            <Repere>2 · L&apos;heure</Repere>
            <div className="flex flex-wrap gap-2">{CRENEAUX.map((h) => pastille(heure === h, h.replace(':', 'h'), () => setHeure(h)))}</div>
            <input type="time" className={CHAMP} value={heure} step={900} onChange={(e) => setHeure(e.target.value)} />

            <Repere>3 · Le chef de chantier</Repere>
            {chefs.length ? (
              <div className="flex flex-wrap gap-2">{chefs.map((c) => pastille(chefId === c.id, c.nom, () => setChefId(c.id)))}</div>
            ) : (
              <p className="px-1 text-[13px]">Aucun chef de chantier trouvé dans les équipes ClickUp : la date sera calée sans assignation.</p>
            )}

            <div>
              <label className={ETIQUETTE}>Accès et remarques (facultatif)</label>
              <textarea className={`${CHAMP} mt-1.5 min-h-[90px]`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Code portail, gardien à prévenir, place de parking, qui sera présent…" />
            </div>

            <BoutonPrincipal inactif={!pret || envoi} disabled={!pret || envoi} onClick={envoyer}>
              {envoi ? <RefreshCw size={20} className="animate-spin" /> : <CalendarCheck size={20} />}
              {fiche.dejaCale ? 'Décaler le relevé' : 'Caler le relevé'}
            </BoutonPrincipal>
            <p className="text-center text-[12px] text-slate-500">Ensuite, l’email de confirmation au client est prêt à envoyer.</p>
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
