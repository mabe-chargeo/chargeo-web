// Mails aux candidats depuis l'appli (Phase 9, lot 5, accord de Mathieu du 07/11/2026 à 11 h 15 : « Oui, vas-y »).
// Sur la fiche du candidat (Recrutement Installateurs, et Recrutement Sales/Freelance si on l'ouvre), l'appli propose le
// texte qui va avec le statut, tant qu'il n'est pas parti :
//   📬 candidature reçue → Candidat · candidature reçue ; 🗣️ entretien 1 → Candidat · entretien ;
//   ⚡ test technique ou 🎭 mise en situation commerciale → Candidat · mise en situation ;
//   🤝 offre proposée → Candidat · offre salarié (freelance d'abord sur la liste Sales/Freelance) ;
//   ❌ refusé → Candidat · refus après entretien s'il y a eu un entretien, sinon refus sur CV ;
//   🗄️ archivé → Candidat · vivier ; 🎉 embauché → Candidat · bienvenue.
// « Parti » = un commentaire de la fiche porte la copie « Texte : <nom> » (ou la note d'appel « à la place du mail
// « <nom> » ») de l'un des textes de ce statut. Non bloquant : rien ne dépend de l'envoi.
// Les textes sont dans src/lib/modelesMails.ts (seule source).
import { LISTES } from '@/lib/espaces';
import { indexMenu } from '@/lib/champsClickUp';
import { CANDIDAT } from '@/lib/rh';
import { MODELES } from '@/lib/modelesMails';
import { textesPour } from '@/lib/mailsAFaire';

const API = 'https://api.clickup.com/api/v2';
// Recrutement Sales/Freelance 💼 (v2), pas encore dans l'appli : mêmes statuts, mise en situation commerciale
export const LISTE_SALES = '1200630000003866';
const LISTE_INSTALLATEURS = '1200630000003865';

export const CLES_CANDIDAT = {
  recue: 'candidat-recue',
  entretien: 'candidat-entretien',
  test: 'candidat-test',
  offreSalarie: 'candidat-offre-salarie',
  offreFreelance: 'candidat-offre-freelance',
  refusCv: 'candidat-refus-cv',
  refusEntretien: 'candidat-refus-entretien',
  vivier: 'candidat-vivier',
  bienvenue: 'candidat-bienvenue',
};
// Poste du menu 🔧 Poste (Électricien 0, Poseur 1, Chef d'équipe 2), tel que le mail l'écrit
const POSTES = ['électricien', 'poseur de bornes de recharge', 'chef d’équipe'];

export type InfosCandidat = { poste: string; commercial: boolean; entretien: boolean; dispo: string };

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const listes = () => [String((LISTES as Record<string, string>).recrutement || LISTE_INSTALLATEURS), LISTE_SALES];
export const estCandidat = (t: any) => !!t && !t.parent && listes().includes(String(t?.list?.id || ''));
const estCommercial = (t: any) => String(t?.list?.id || '') === LISTE_SALES;
const nomDe = (cle: string) => MODELES.find((m) => m.cle === cle)?.nom || '';
const jourParis = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

// Disponibilité à venir (AAAA-MM-JJ), '' si vide ou passée
function dispoDe(t: any): string {
  const f = (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c?.id === CANDIDAT.disponibilite || normal(c?.name).includes('disponibilite'));
  const ms = Number(f?.value);
  if (!ms) return '';
  const jour = jourParis(new Date(ms));
  return jour >= jourParis(new Date()) ? jour : '';
}

function cleDuStatut(t: any, entretien: boolean): string {
  const s = normal(t?.status?.status);
  if (s.includes('candidature recue')) return CLES_CANDIDAT.recue;
  if (s.includes('entretien')) return CLES_CANDIDAT.entretien;
  if (s.includes('test technique') || s.includes('mise en situation')) return CLES_CANDIDAT.test;
  if (s.includes('offre')) return estCommercial(t) ? CLES_CANDIDAT.offreFreelance : CLES_CANDIDAT.offreSalarie;
  if (s.includes('refuse')) return entretien ? CLES_CANDIDAT.refusEntretien : CLES_CANDIDAT.refusCv;
  if (s.includes('archive')) return CLES_CANDIDAT.vivier;
  if (s.includes('embauche')) return CLES_CANDIDAT.bienvenue;
  return '';
}

// Texte en attente (« » si déjà parti ou statut sans mail) et ce que le texte sait du candidat
export async function lireCandidat(token: string, t: any): Promise<{ cle: string; infos: InfosCandidat }> {
  const r = await fetch(`${API}/task/${encodeURIComponent(String(t.id))}/comment`, { headers: { Authorization: token }, cache: 'no-store' });
  const j = r.ok ? await r.json().catch(() => ({})) : {};
  const commentaires: string[] = (Array.isArray(j?.comments) ? j.comments : []).map((c: any) => String(c?.comment_text || ''));
  const parti = (cle: string) => {
    const nom = nomDe(cle);
    return !!nom && commentaires.some((c) => c.includes(`Texte : ${nom}`) || c.includes(`« ${nom} »`));
  };
  const s = normal(t?.status?.status);
  // Entretien passé : statut au-delà de l'entretien, ou mail d'entretien ou de mise en situation parti
  const entretien = s.includes('test technique') || s.includes('mise en situation') || s.includes('offre') || s.includes('embauche')
    || parti(CLES_CANDIDAT.entretien) || parti(CLES_CANDIDAT.test);
  const commercial = estCommercial(t);
  const i = indexMenu(t, CANDIDAT.poste);
  const infos: InfosCandidat = { poste: commercial ? 'commercial' : POSTES[i ?? 1] || POSTES[1], commercial, entretien, dispo: dispoDe(t) };
  const attendu = cleDuStatut(t, entretien);
  // Commentaires illisibles : rien n'est proposé, pour ne jamais renvoyer un mail déjà parti
  if (!attendu || !r.ok) return { cle: '', infos };
  return { cle: textesPour(attendu).some(parti) ? '' : attendu, infos };
}
