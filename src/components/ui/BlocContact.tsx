"use client";

// Bloc 📇 Contact (étape 4 du plan du 15/10/2026, PR #51, synthèse du 14/10, section 10), repliable, en haut du relevé.
// Données lues par /api/interne/fiche-contact : passeport de la fiche, 📍 Contact sur place, 👔 Gestionnaire, adresse.
// 15/10, 15 h 19 (demande de Matthieu) :
// - bouton « Google Voice » à côté de « Appeler » : ouvre un appel dans Google Voice (web) avec le numéro prérempli ;
// - Google Maps vise l'adresse écrite (plus précise que des coordonnées approximatives) ; Waze garde les coordonnées
//   quand ClickUp les fournit, sinon l'adresse écrite.
import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Headphones, Mail, MapPin, MessageSquare, Navigation, Phone, Users } from 'lucide-react';
import { Carte, TitreCarte } from '@/components/charte/Appli';
import { LABEL } from '@/components/charte/couleurs';

type Personne = { nom: string; tel: string; email: string };
type FicheContact = {
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
const lienVoice = (t: string) => `https://voice.google.com/u/0/calls?a=nc,${encodeURIComponent(international(t))}`;

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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/interne/fiche-contact?affaireId=${encodeURIComponent(affaireId)}`, { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j?.success) setC(j as FicheContact);
      } catch { /* hors ligne : bloc masqué */ }
    })();
  }, [affaireId]);

  if (!c) return null;
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
        {p.tel && <Lien href={lienVoice(p.tel)}><Headphones size={14} /> Google Voice</Lien>}
        {p.tel && sms && <Lien href={`sms:${international(p.tel)}`}><MessageSquare size={14} /> SMS</Lien>}
        {p.email && <Lien href={`mailto:${p.email}`}><Mail size={14} /> Email</Lien>}
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
