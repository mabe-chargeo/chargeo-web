// Rapport d'intervention SAV signé au doigt (maquette MAQUETTE_RAPPORT-SAV_2026-10-18.png validée par Matthieu le
// 18/10/2026 à 22 h 15, demande de 22 h 09 : « un système pour les tickets SAV avec un rapport un peu de la même manière
// que le rapport de mise en service et le PV de réception, et que ça puisse résoudre le problème, terminer le ticket »).
// Le technicien saisit sur place constat, cause, travaux, pièces remplacées, essai de charge, prise en charge et résultat ;
// le client puis le technicien signent au doigt. Le PDF à la charte (src/lib/documentsPdf.ts) se dépose dans
// 📄 Rapport d'intervention du ticket (champ Fichiers créé le 18/10 à 22 h 18 dans Tickets SAV 🔧).
// La suite selon le résultat est dans la route /api/interne/rapport-sav.
// 18/10, 22 h 37 (test de Matthieu) : date d'intervention du PDF = jour de la signature, et non la date calée du dépannage.
import { adresseDe, champ, nomOption, normal, sansEmoji } from '@/lib/vuesFiches';
import { CHAMPS_INTERVENTION } from '@/lib/espaces';
import { pdfRapportSav, type PieceSav } from '@/lib/documentsPdf';
import type { ImageJpeg } from '@/lib/pdfCharte';
import { deposerDansChamp, horodatage, slugFichier } from '@/lib/champFichier';

export const CHAMP_RAPPORT_SAV = '8dbf671d-4a53-4870-be35-d2e866c73ede';
const CHAMP_PANNE = 'cb7bb1fe-6e64-4e1f-ab85-05860871d854';
const CHAMP_PDC = '20dabf35-cb09-4a80-9c5c-9a806aa642fb';

export const CAUSES = ['Réseau / Wifi', 'Matériel (borne / câble)', 'Logiciel', 'Électrique', 'Usage client', 'Autre'];
export const PRISES_EN_CHARGE = ['Garantie', 'Contrat de maintenance', 'À facturer'];
export type Resultat = 'resolu' | 'piece' | 'revenir';
export const RESULTATS: Record<Resultat, string> = { resolu: 'Problème résolu', piece: 'Pièce à commander', revenir: 'À revenir' };

// Cause proposée d'après 🏷️ Type de Panne du ticket
function causeDe(panne: string): string {
  const p = normal(panne);
  if (p.includes('reseau') || p.includes('wifi')) return CAUSES[0];
  if (p.includes('materiel')) return CAUSES[1];
  if (p.includes('logiciel')) return CAUSES[2];
  if (p.includes('electrique')) return CAUSES[3];
  return '';
}

const fr = (ms: number, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ...o }).format(new Date(ms));
const dateFr = (ms: unknown) => { const v = Number(ms); return v > 0 ? fr(v, { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''; };
// « 21/10/2026 à 09h30 », sans l'heure pour une date sans heure (0 h ou 4 h)
function dateHeureFr(ms: unknown): string {
  const v = Number(ms);
  if (!(v > 0)) return '';
  const h = fr(v, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return h === '00:00' || h === '04:00' ? dateFr(v) : `${dateFr(v)} à ${h.replace(':', 'h')}`;
}

// Message du client : le texte entre guillemets après « Message du client : » (formulaire du site), sinon la description
function demandeDe(t: any): string {
  const d = String(t?.text_content || t?.description || '');
  const m = d.match(/Message du client\s*:\s*["“«]\s*([\s\S]*?)\s*["”»]/);
  return (m ? m[1] : d.split(/\n\s*Dossier\s*:/)[0]).replace(/\s+/g, ' ').trim().slice(0, 600);
}

export type EtatTicket = {
  nom: string;
  statut: string;
  installation: { id: string; nom: string } | null;
  adresse: string;
  demande: string;
  severite: string;
  panne: string;
  pdc: string;
  signaleLe: string;
  intervention: string;
  techniciens: string[];
  causeProposee: string;
  rapports: string[];
  ferme: boolean;
};

export async function etatTicket(token: string, t: any): Promise<EtatTicket> {
  const v = champ(t, CHAMPS_INTERVENTION.installationTicket)?.value;
  const lie = Array.isArray(v) && v[0] ? v[0] : null;
  let installation: EtatTicket['installation'] = null;
  let adresse = '';
  if (lie?.id) {
    const r = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(String(lie.id))}`, { headers: { Authorization: token }, cache: 'no-store' }).catch(() => null);
    const p = r?.ok ? await r.json().catch(() => null) : null;
    installation = { id: String(lie.id), nom: String(p?.name || lie?.name || '') };
    adresse = p ? adresseDe(p) : '';
  }
  if (!adresse) adresse = adresseDe(t);
  const panne = sansEmoji(nomOption(t, CHAMP_PANNE));
  const s = normal(t?.status?.status);
  const fichiers = champ(t, CHAMP_RAPPORT_SAV)?.value;
  return {
    nom: String(t?.name || ''),
    statut: String(t?.status?.status || ''),
    installation,
    adresse,
    demande: demandeDe(t),
    severite: sansEmoji(nomOption(t, CHAMPS_INTERVENTION.severite)),
    panne,
    pdc: sansEmoji(nomOption(t, CHAMP_PDC)),
    signaleLe: dateFr(t?.date_created),
    intervention: dateHeureFr(t?.due_date),
    techniciens: (Array.isArray(t?.assignees) ? t.assignees : []).map((u: any) => String(u?.username || u?.email || '')).filter(Boolean),
    causeProposee: causeDe(panne),
    rapports: (Array.isArray(fichiers) ? fichiers : fichiers ? [fichiers] : []).map((f: any) => String(f?.title || f?.name || '')).filter(Boolean),
    ferme: s.includes('resolu') || s.includes('archive'),
  };
}

export type SaisieSav = {
  constat: string;
  cause: string;
  travaux: string;
  pieces: PieceSav[];
  essaiOk: boolean;
  priseEnCharge: string;
  resultat: Resultat;
  signataire: string;
  technicien: string;
  client: ImageJpeg;
  tech: ImageJpeg;
};

export async function genererRapportSav(token: string, t: any, e: EtatTicket, s: SaisieSav): Promise<{ ok: boolean; nom?: string; quand?: string; erreur?: string }> {
  const q = horodatage();
  const base = `RAPPORT_INTERVENTION-SAV_${slugFichier(e.installation?.nom || String(t?.name || '').replace(/^\s*sav\s*-\s*/i, ''))}_${q.jour}`;
  const commune = (e.adresse.match(/\b\d{5}\s+([^,]+)/)?.[1] || '').trim();
  const quand = `${q.date} à ${q.heure}`;
  const details = [e.severite && `Sévérité : ${e.severite}`, e.panne && `Panne signalée : ${e.panne}`, e.pdc].filter(Boolean).join(' · ');
  const octets = pdfRapportSav({
    reference: base,
    ticket: e.nom,
    installation: e.installation?.nom || '',
    adresse: e.adresse,
    demande: e.demande ? `« ${e.demande} »` : '',
    details,
    signaleLe: e.signaleLe || undefined,
    // Le rapport se fait sur place : la date de l'intervention est celle de la signature (pas la date calée, qui peut différer)
    intervention: q.date,
    techniciens: s.technicien,
    constat: s.constat,
    cause: s.cause,
    travaux: s.travaux,
    pieces: s.pieces,
    essai: s.essaiOk ? 'charge conforme' : 'charge pas conforme',
    priseEnCharge: s.priseEnCharge,
    resultat: s.resultat,
    date: q.date,
    commune: commune || undefined,
    signataire: { nom: s.signataire, image: s.client },
    technicien: { nom: s.technicien, image: s.tech },
    horodatage: quand,
  });
  const nom = `${base}.pdf`;
  const erreur = await deposerDansChamp(token, String(t.id), CHAMP_RAPPORT_SAV, octets, nom);
  return erreur ? { ok: false, erreur } : { ok: true, nom, quand };
}
