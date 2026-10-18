// PV de réception généré par l'application et signé au doigt sur le téléphone (décisions de Matthieu du 18/10/2026,
// 16 h 02 : « que ce soit l'appli qui le génère », 16 h 04 : « au doigt sur le téléphone »). Le PDF (src/lib/documentsPdf.ts)
// se dépose dans 📂 PV Réception : les règles de la réception et du passage au Parc ne changent pas.
// Avant signature : 🧾 Réserves renseigné (Aucune ou Mineure, jamais Bloquante), chaque réserve mineure détaillée avec
// sa date de levée, mise en service terminée et conforme : le PV reprend exactement ce qui a été déclaré.
import { adresseDe, champ, nomOption, normal, sansEmoji } from '@/lib/vuesFiches';
import { etatMiseEnService, type EtatMes } from '@/lib/miseEnService';
import { pdfPvReception, type ReservePv } from '@/lib/documentsPdf';
import type { ImageJpeg } from '@/lib/pdfCharte';
import { deposerDansChamp, horodatage, slugFichier } from '@/lib/champFichier';

export const CHAMP_PV = 'ea4cf46a-c8bc-41ad-a46e-c7d313099f1b';
const CHAMP_RAPPORT = '463edfd0-faf9-40e6-b37a-9ee126c2b449';
const CHAMP_RESERVES = '1463a905-0b11-4693-b9d9-e8cca4f79eeb';
const CHAMP_TECHNICIEN = 'b400c953-ae06-4336-b471-405296f9ff1c';

const champsDe = (t: any): any[] => (Array.isArray(t?.custom_fields) ? t.custom_fields : []);
const parNom = (t: any, mot: string) => champsDe(t).find((c: any) => normal(c?.name).includes(mot));
const texteDe = (t: any, mot: string) => {
  const v = parNom(t, mot)?.value;
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
};
const optionDe = (t: any, mot: string) => {
  const f = parNom(t, mot);
  return f ? sansEmoji(nomOption(t, String(f.id))) : '';
};
export const dateFr = (ms: unknown) => {
  const v = Number(ms);
  return v > 0 ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(v)) : '';
};
const nomsFichiers = (t: any, id: string): string[] => {
  const v = champ(t, id)?.value;
  return (Array.isArray(v) ? v : v ? [v] : []).map((f: any) => String(f?.title || f?.name || '')).filter(Boolean);
};

export type EtatPv = {
  nom: string;
  adresse: string;
  client: { nom: string; type: string; email: string; telephone: string };
  devis: string;
  dateIntervention: string;
  ouvrages: string[];
  miseEnService: { elements: number; rapport?: string } | null;
  niveau: 'aucune' | 'mineure' | 'bloquante' | '';
  reserves: ReservePv[];
  techniciens: string[];
  blocages: string[];
  verrouille: boolean;
};

export async function etatPv(token: string, t: any): Promise<EtatPv> {
  const sousTaches: any[] = Array.isArray(t?.subtasks) ? t.subtasks : [];
  let mes: EtatMes[] = [];
  try { mes = await etatMiseEnService(token, String(t.id), sousTaches); } catch { mes = []; }
  const r = normal(nomOption(t, CHAMP_RESERVES));
  const niveau = r.includes('aucune') ? 'aucune' : r.includes('mineure') ? 'mineure' : r.includes('bloquante') ? 'bloquante' : '';
  const reserves: ReservePv[] = sousTaches
    .filter((s) => normal(s?.name).includes('reserve') && String(s?.parent || '') === String(t.id))
    .map((s) => ({
      libelle: String(s?.name || '').replace(/^\s*(?:🔧)?\s*Réserve\s*:\s*/i, '').trim(),
      echeance: dateFr(s?.due_date) || undefined,
      responsable: (Array.isArray(s?.assignees) ? s.assignees : []).map((a: any) => String(a?.username || '')).filter(Boolean).join(', ') || undefined,
    }));
  const techs = champ(t, CHAMP_TECHNICIEN)?.value;
  const techniciens = (Array.isArray(techs) ? techs : []).map((u: any) => String(u?.username || u?.email || '')).filter(Boolean);
  const complet = mes.length > 0 && mes.every((m) => m.fait && !m.defaut);
  const rapports = nomsFichiers(t, CHAMP_RAPPORT);
  const blocages: string[] = [];
  if (!niveau) blocages.push('🧾 Réserves pas renseigné : choisis « Aucune » ou « Mineure » dans la réception');
  if (niveau === 'bloquante') blocages.push('Réserve 🔴 bloquante : la réception ne peut pas être prononcée');
  if (niveau === 'mineure' && !reserves.length) blocages.push('Réserve mineure sans détail : ajoute-la dans la réception');
  if (niveau === 'mineure' && reserves.some((x) => !x.echeance)) blocages.push('Réserve sans date de levée : fixe-la dans la réception');
  if (mes.length && !complet) blocages.push('⚡ Mise en service pas terminée ou avec un défaut');
  const lien = texteDe(t, 'lien devis');
  const devis = lien ? lien.split('/').filter(Boolean).pop() || '' : '';
  return {
    nom: String(t?.name || ''),
    adresse: adresseDe(t),
    client: {
      nom: String(t?.name || '').replace(/^\s*test\s*·\s*/i, '').trim(),
      type: optionDe(t, 'type client'),
      email: texteDe(t, 'email'),
      telephone: texteDe(t, 'telephone'),
    },
    devis: devis ? `Costructor ${devis}` : '',
    dateIntervention: dateFr(parNom(t, 'date intervention')?.value),
    ouvrages: mes.map((m) => m.nom),
    miseEnService: mes.length ? { elements: mes.length, rapport: rapports[rapports.length - 1] } : null,
    niveau,
    reserves: niveau === 'mineure' ? reserves : [],
    techniciens,
    blocages,
    verrouille: normal(t?.status?.status).includes('realise'),
  };
}

export async function genererPv(token: string, t: any, e: EtatPv, s: { signataire: string; qualite: string; technicien: string; client: ImageJpeg; tech: ImageJpeg }): Promise<{ ok: boolean; nom?: string; quand?: string; erreur?: string }> {
  const q = horodatage();
  const base = `PV_RECEPTION_${slugFichier(t?.name)}_${q.jour}`;
  const commune = (e.adresse.match(/\b\d{5}\s+(.+)$/)?.[1] || '').trim();
  const quand = `${q.date} à ${q.heure}`;
  const octets = pdfPvReception({
    reference: base,
    chantier: e.nom,
    client: { nom: e.client.nom, type: e.client.type, adresse: e.adresse, email: e.client.email, telephone: e.client.telephone },
    adresse: e.adresse,
    devis: e.devis || undefined,
    dateIntervention: e.dateIntervention || undefined,
    dateReception: q.date,
    commune: commune || undefined,
    ouvrages: e.ouvrages,
    miseEnService: e.miseEnService,
    reserves: e.reserves,
    signataire: { nom: s.signataire, qualite: s.qualite, image: s.client },
    technicien: { nom: s.technicien, image: s.tech },
    horodatage: quand,
  });
  const nom = `${base}.pdf`;
  const erreur = await deposerDansChamp(token, String(t.id), CHAMP_PV, octets, nom);
  return erreur ? { ok: false, erreur } : { ok: true, nom, quand };
}
