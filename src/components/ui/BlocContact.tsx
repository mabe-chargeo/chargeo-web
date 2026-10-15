"use client";

// Bloc 📇 Contact (étape 4 du plan du 15/10/2026, PR #51, synthèse du 14/10, section 10), repliable, en haut du relevé.
// Données lues par /api/interne/fiche-contact : passeport de la fiche, 📍 Contact sur place, 👔 Gestionnaire, adresse,
// et l'email CHARGéO de la personne connectée (« moi »).
// 15/10, demandes de Matthieu :
// - 15 h 19 : bouton « Google Voice » ; Google Maps vise l'adresse écrite, Waze garde les coordonnées ;
// - 15 h 23 : Google Voice s'ouvre sur le compte CHARGéO (authuser = email de la personne connectée). Sur iPhone, le
//   lien voice.google.com ouvre l'application Google Voice (validé par Matthieu à 15 h 29). L'email passe par Gmail ;
// - 15 h 29 : sur iPhone et iPad, le lien web de Gmail ouvrait la boîte de réception. Le bouton ouvre maintenant
//   l'application Gmail sur un nouveau message (googlegmail://co?to=…), avec le compte actif de l'application.
//   Sur ordinateur, il garde Gmail web sur le compte CHARGéO.
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
const compte = (moi?: string) => (moi ? `&authuser=${encodeURIComponent(moi)}` : '');
const lienVoice = (t: string, moi?: string) =>
  `https://voice.google.com/calls?a=nc,${encodeURIComponent(international(t))}${compte(moi)}`;
const lienGmail = (dest: string, moi: string, ios: boolean) =>
  ios
    ? `googlegmail://co?to=${encodeURIComponent(dest)}`
    : `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(dest)}${compte(moi)}`;

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

export function BlocContact({ affaireId }: { affaireId: string }) {
  const [c, setC] = useState<FicheContact | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setIos(estIOS());
    (async () => {
      try {
        const res = await fetch(`/api/interne/fiche-contact?affaireId=${encodeURIComponent(affaireId)}`, { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j?.success) setC(j as FicheContact);
      } catch { /* hors ligne : bloc masqué */ }
    })();
  }, [affaireId]);

  if (!c) return null;
  const moi = c.moi || '';
  const a = c.adresse;
  const avecPoint = !!a && a.lat !== null && a.lng !== null;
  const waze = a
    ? (avecPoint ? `https://waze.com/ul?ll=${a.lat},${a.lng}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(a.texte)}&navigate=yes`)
    : '';
  const maps = a ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a.texte)}` : '';

  const personne = (titre: string, p: Personne, sms: boolean) => (
    <div key={`${titre}-${p.nom}`} className="space-y-2">
      <p className="text-[14px]"><strong>{titre} :</strong> {p.nom || '–'}{p.tel ? ` · ${p.tel}` : ''}</p>
      <div className="flex flex-wrap gap-2">
        {p.tel && <Lien href={`tel:${international(p.tel)}`}><Phone size={14} /> Appeler</Lien>}
        {p.tel && <Lien href={lienVoice(p.tel, moi)}><Headphones size={14} /> Google Voice</Lien>}
        {p.tel && sms && <Lien href={`sms:${international(p.tel)}`}><MessageSquare size={14} /> SMS</Lien>}
        {p.email && <Lien href={lienGmail(p.email, moi, ios)}><Mail size={14} /> Gmail</Lien>}
      </div>
    </div>
  );

  return (
    <Carte className="space-y-3">
      <button type="button" onClick={() => setOuvert(!ouvert)} className="w-full text-left">
        <TitreCarte icon={Users} extra={ouvert ? <ChevronUp size={20} /> : <ChevronDown size={20} />}>📇 Contact</TitreCarte>
      </button>
      {ouvert && (
        <div className="space-y-4">
          {personne('Client', { nom: c.fiche.nom, tel: c.client.tel, email: c.client.email }, true)}
          {c.contactSurPlace.map((p) => personne('Contact sur place', p, true))}
          {c.gestionnaire.map((p) => personne('Gestionnaire', p, false))}
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
      )}
    </Carte>
  );
}
