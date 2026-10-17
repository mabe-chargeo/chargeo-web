"use client";

// Bloc 📇 Contact (étape 4 du plan du 15/10/2026, PR #51, synthèse du 14/10, section 10), repliable, en haut du relevé.
// Données lues par /api/interne/fiche-contact : passeport de la fiche, 📍 Contact sur place, 👔 Gestionnaire, adresse,
// et l'email CHARGéO de la personne connectée (« moi »).
// 15/10, demandes de Matthieu :
// - 15 h 19 : bouton « Google Voice » ; Google Maps vise l'adresse écrite ;
// - 15 h 23 : Google Voice s'ouvre sur le compte CHARGéO (authuser = email de la personne connectée). Sur iPhone, le
//   lien voice.google.com ouvre l'application Google Voice (validé par Matthieu à 15 h 29). L'email passe par Gmail ;
// - 15 h 29 : sur iPhone et iPad, le bouton Gmail ouvre l'application Gmail sur un nouveau message
//   (googlegmail://co?to=…), avec le compte actif de l'application ; sur ordinateur, Gmail web sur le compte CHARGéO.
//   Validé par Matthieu à 15 h 34, avec Google Voice et Google Maps ;
// - 15 h 34 : Waze n'amenait que sur la route (le point GPS de ClickUp est celui de la rue, pas du numéro). Waze cherche
//   maintenant l'adresse écrite autour de ce point (q + ll, format officiel des liens Waze), donc le numéro est respecté.
// 16/10, 15 h 38 (Matthieu : « SMS pour tous les portables ») : le bouton SMS ne dépend plus du rôle (le gestionnaire
// n'en avait pas). Il s'affiche pour tout portable (France 06 / 07, Suisse 075 à 079) et pour un numéro de format
// inconnu ; il est masqué pour un fixe français ou suisse.
// 17/10, Matthieu : « partout où on a la fiche contact, il faut tous les boutons qu'on a codés » (10 h 20), « tu ajoutes
// le bloc contact partout » (10 h 26). Le même bloc sert à la fiche du Pipeline (ouvertParDefaut) et aux cartes de
// chantier (Feu vert, Réception). Dans une liste de chantiers, differe : rien n'est lu avant le premier appui, pour ne
// pas lancer une lecture ClickUp par carte (quota de l'API). Le relevé garde la lecture immédiate, faite avec du
// réseau avant de descendre au sous-sol.
import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Headphones, Mail, MapPin, MessageSquare, Navigation, Phone, Users } from 'lucide-react';
import { Carte, TitreCarte } from '@/components/charte/Appli';
import { LABEL } from '@/components/charte/couleurs';

type Personne = { nom: string; tel: string; email: string };
type FicheContact = {
  moi?: string;
  fiche: { id: string; nom: string };
  client: { tel: string; email: string };
  adresse: { texte: string; lat: number | null; lng: number | null } | null;
  contactSurPlace: Personne[];
  gestionnaire: Personne[];
};

// Numéro au format international : « 06 12 34 56 78 » → « +33612345678 »
function international(t: string): string {
  const brut = t.replace(/[^\d+]/g, '');
  if (brut.startsWith('+')) return brut;
  if (brut.startsWith('00')) return `+${brut.slice(2)}`;
  if (brut.startsWith('0')) return `+33${brut.slice(1)}`;
  return brut;
}
// Fixe français (01 à 05, 08, 09) ou suisse (tout sauf 075 à 079) : pas de SMS. Portable ou format inconnu : SMS
function recoitSms(t: string): boolean {
  const n = international(t);
  if (/^\+33\d{9}$/.test(n)) return /^\+33[67]/.test(n);
  if (/^\+41\d{9}$/.test(n)) return /^\+417[5-9]/.test(n);
  return true;
}
const compte = (moi?: string) => (moi ? `&authuser=${encodeURIComponent(moi)}` : '');
const lienVoice = (t: string, moi?: string) =>
  `https://voice.google.com/calls?a=nc,${encodeURIComponent(international(t))}${compte(moi)}`;
const lienGmail = (dest: string, moi: string, ios: boolean) =>
  ios
    ? `googlegmail://co?to=${encodeURIComponent(dest)}`
    : `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(dest)}${compte(moi)}`;
// Waze : adresse écrite, cherchée autour du point GPS quand il existe
const lienWaze = (texte: string, lat: number | null, lng: number | null) =>
  `https://waze.com/ul?q=${encodeURIComponent(texte)}${lat !== null && lng !== null ? `&ll=${lat},${lng}` : ''}&navigate=yes`;

// iPhone, iPad (y compris iPadOS qui se présente comme un Mac tactile)
function estIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator as any).maxTouchPoints > 1);
}

function Lien({ href, children }: { href: string; children: ReactNode }) {
  const externe = href.startsWith('http');
  return (
    <a
      href={href}
      target={externe ? '_blank' : undefined}
      rel={externe ? 'noopener noreferrer' : undefined}
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold ring-[1.5px] ring-[#dfe3e8]"
      style={{ color: LABEL }}
    >
      {children}
    </a>
  );
}

export function BlocContact({
  affaireId,
  ouvertParDefaut = false,
  differe = false,
}: {
  affaireId: string;
  ouvertParDefaut?: boolean;
  differe?: boolean;
}) {
  const [c, setC] = useState<FicheContact | null>(null);
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const [ios, setIos] = useState(false);
  const [etat, setEtat] = useState<'attente' | 'lecture' | 'lu' | 'erreur'>('attente');

  const doitLire = !differe || ouvert;

  useEffect(() => {
    setIos(estIOS());
  }, []);

  useEffect(() => {
    if (!doitLire || etat === 'lecture' || etat === 'lu') return;
    setEtat('lecture');
    (async () => {
      try {
        const res = await fetch(`/api/interne/fiche-contact?affaireId=${encodeURIComponent(affaireId)}`, { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j?.success) { setC(j as FicheContact); setEtat('lu'); }
        else setEtat('erreur');
      } catch { setEtat('erreur'); /* hors ligne */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affaireId, doitLire]);

  // Lecture immédiate (relevé, fiche) : bloc masqué tant que rien n'est lu, comme avant
  if (!differe && !c) return null;

  const moi = c?.moi || '';
  const a = c?.adresse || null;
  const waze = a ? lienWaze(a.texte, a.lat, a.lng) : '';
  const maps = a ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a.texte)}` : '';

  const personne = (titre: string, p: Personne) => (
    <div key={`${titre}-${p.nom}`} className="space-y-2">
      <p className="text-[14px]"><strong>{titre} :</strong> {p.nom || '–'}{p.tel ? ` · ${p.tel}` : ''}</p>
      <div className="flex flex-wrap gap-2">
        {p.tel && <Lien href={`tel:${international(p.tel)}`}><Phone size={14} /> Appeler</Lien>}
        {p.tel && <Lien href={lienVoice(p.tel, moi)}><Headphones size={14} /> Google Voice</Lien>}
        {p.tel && recoitSms(p.tel) && <Lien href={`sms:${international(p.tel)}`}><MessageSquare size={14} /> SMS</Lien>}
        {p.email && <Lien href={lienGmail(p.email, moi, ios)}><Mail size={14} /> Gmail</Lien>}
      </div>
    </div>
  );

  const contenu = c ? (
    <div className="space-y-4">
      {personne('Client', { nom: c.fiche.nom, tel: c.client.tel, email: c.client.email })}
      {c.contactSurPlace.map((p) => personne('Contact sur place', p))}
      {c.gestionnaire.map((p) => personne('Gestionnaire', p))}
      {a ? (
        <div className="space-y-2">
          <p className="flex items-start gap-2 text-[14px]"><MapPin size={16} className="mt-0.5 shrink-0" /> {a.texte}</p>
          <div className="flex flex-wrap gap-2">
            <Lien href={waze}><Navigation size={14} /> Waze</Lien>
            <Lien href={maps}><MapPin size={14} /> Google Maps</Lien>
          </div>
        </div>
      ) : (
        <p className="text-[14px]">Pas d&apos;adresse sur la fiche.</p>
      )}
    </div>
  ) : etat === 'erreur' ? (
    <p className="text-[14px]">Contact illisible pour l&apos;instant (réseau ou fiche hors liste). Réessaie plus tard.</p>
  ) : (
    <p className="text-[14px]">Chargement du contact...</p>
  );

  // Dans une carte de chantier (differe), bloc blanc pour se détacher du fond gris de la carte
  const corps = (
    <>
      <button type="button" onClick={() => setOuvert(!ouvert)} className="w-full text-left">
        <TitreCarte icon={Users} extra={ouvert ? <ChevronUp size={20} /> : <ChevronDown size={20} />}>📇 Contact</TitreCarte>
      </button>
      {ouvert && contenu}
    </>
  );

  return differe ? (
    <div className="space-y-3 rounded-[14px] bg-white p-3">{corps}</div>
  ) : (
    <Carte className="space-y-3">{corps}</Carte>
  );
}
