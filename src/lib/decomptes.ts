// Décomptes énergétiques de l'application (décision de Matthieu du 17/10/2026, 15 h 22 : « depuis le Parc, sans
// nouvelle liste »). Mêmes règles que le rappel en production (src/lib/rappelDecomptes.ts, décision du 13/10) :
// - borne du Parc installé hors ⚫ hors service, 🔁 Mode supervision = Relevé ; jamais en Refacturation (Charge Unix) ;
// - période civile écoulée selon 🗓️ Fréquence décomptes (mois, trimestre, semestre, année), début ajusté à la mise
//   en service ; avertissements tarif gestionnaire vide et abonnement supervision pas actif.
// Étapes, sans nouveau champ : À préparer (rien pour la période) → À valider (commentaire « 🧾 Décompte préparé » et
// PDF joint à la borne) → Envoyés (commentaire « 🧾 Décompte validé et envoyé »). Le site n'envoie rien : le
// back-office envoie le PDF au gestionnaire et note l'envoi.
// Fichier pur : utilisable côté téléphone comme côté serveur.
import type { Jour } from '@/lib/joursOuvres';
import { ajouterJours, aujourdhuiParis, comparer } from '@/lib/joursOuvres';

export const CHAMPS_DECOMPTE = {
  contrat: 'a0505dec-e32f-485d-b501-2288a4c5f150', // 📜 Type de Contrat
  miseEnService: '5e301b44-b0b8-478a-90c2-86e0201ef9d5', // 📅 Date de Mise en Service
  mode: '4a9e7298-404b-4600-9456-38c77ef16e5d', // 🔁 Mode supervision
  abonnement: 'df349392-a330-4621-b8a2-e25c70035699', // 📡 Abonnement supervision
  tarif: '8f11a5d6-cc1d-4cbd-9ce9-16275088d6bd', // 💶 Tarif gestionnaire
  frequence: '865046fb-feef-4d6e-8e7d-cd5172534314', // 🗓️ Fréquence décomptes
};
const MOIS_PAR_PERIODE: Record<string, number> = { mensuelle: 1, trimestrielle: 3, semestrielle: 6, annuelle: 12 };
export const MARQUE_PREPARE = '🧾 Décompte préparé';
export const MARQUE_ENVOYE = '🧾 Décompte validé et envoyé';

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c?.id === id);
const vide = (v: any) => v === undefined || v === null || v === '';
function option(t: any, id: string): string {
  const f = champ(t, id);
  if (!f || vide(f.value)) return '';
  const o = (f.type_config?.options || []).find((x: any) => x.orderindex === Number(f.value) || x.id === f.value);
  return String(o?.name || '');
}
function jourDe(t: any, id: string): Jour | null {
  const v = champ(t, id)?.value;
  if (vide(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? aujourdhuiParis(new Date(n)) : null;
}

export const dateFr = (d: Jour) => `${String(d.j).padStart(2, '0')}/${String(d.m).padStart(2, '0')}/${d.a}`;
export const cleJour = (d: Jour) => `${d.a}-${String(d.m).padStart(2, '0')}-${String(d.j).padStart(2, '0')}`;
export const libellePeriode = (debut: Jour, fin: Jour) => `du ${dateFr(debut)} au ${dateFr(fin)}`;
// Nom du PDF joint à la borne (contient les deux dates : retrouvé sans ambiguïté)
export const reperePdf = (debut: Jour, fin: Jour) => `Décompte ${cleJour(debut)}_${cleJour(fin)}`;

// Période civile écoulée juste avant celle qui contient « aujourdhui »
function periodeEcoulee(aujourdhui: Jour, mois: number): { debut: Jour; fin: Jour } {
  const idx = Math.floor((aujourdhui.m - 1) / mois) * mois;
  const debutEnCours: Jour = { a: aujourdhui.a, m: idx + 1, j: 1 };
  const fin = ajouterJours(debutEnCours, -1);
  const total = debutEnCours.a * 12 + idx - mois;
  return { debut: { a: Math.floor(total / 12), m: (total % 12) + 1, j: 1 }, fin };
}

export type SuiviDecompte =
  | { etat: 'hors' }
  | { etat: 'a-completer'; manque: string }
  | { etat: 'periode'; debut: Jour; fin: Jour; frequence: string; ajuste: boolean; tarif: string; avertissements: string[] };

// Ce que la borne doit pour la dernière période écoulée (sans la fenêtre de 15 jours du rappel : l'écran montre la
// période tant qu'une nouvelle n'est pas écoulée)
export function suiviDecompte(t: any, aujourdhui: Jour): SuiviDecompte {
  if (String(t?.status?.type || '') === 'closed' || normal(t?.status?.status).includes('hors service')) return { etat: 'hors' };
  const mode = normal(option(t, CHAMPS_DECOMPTE.mode));
  if (mode.includes('refactur')) return { etat: 'hors' };
  if (!mode) return normal(option(t, CHAMPS_DECOMPTE.contrat)).includes('releve') ? { etat: 'a-completer', manque: '🔁 Mode supervision' } : { etat: 'hors' };
  if (!mode.includes('releve')) return { etat: 'hors' };
  const frequence = option(t, CHAMPS_DECOMPTE.frequence);
  const mois = MOIS_PAR_PERIODE[normal(frequence)];
  if (!mois) return { etat: 'a-completer', manque: '🗓️ Fréquence décomptes' };
  const p = periodeEcoulee(aujourdhui, mois);
  const mes = jourDe(t, CHAMPS_DECOMPTE.miseEnService);
  const avertissements: string[] = [];
  let debut = p.debut;
  let ajuste = false;
  if (mes) {
    if (comparer(mes, p.fin) > 0) return { etat: 'hors' };
    if (comparer(mes, p.debut) > 0) { debut = mes; ajuste = true; }
  } else avertissements.push('📅 Date de mise en service vide : vérifie le début réel de la période');
  const tarifBrut = champ(t, CHAMPS_DECOMPTE.tarif)?.value;
  const tarif = vide(tarifBrut) ? '' : String(tarifBrut);
  if (!tarif) avertissements.push('💶 Tarif gestionnaire vide : demande-le au syndic (date, période, HT ou TTC), ne suppose rien');
  const abo = option(t, CHAMPS_DECOMPTE.abonnement);
  if (normal(abo) !== 'actif') avertissements.push(`📡 Abonnement supervision « ${abo || 'vide'} » : les consommations à distance peuvent manquer`);
  return { etat: 'periode', debut, fin: p.fin, frequence, ajuste, tarif, avertissements };
}

// Borne suivie en relevé (compteur de Mon espace)
export const suivieEnReleve = (t: any, aujourdhui: Jour): boolean => suiviDecompte(t, aujourdhui).etat !== 'hors';

// Marques laissées en commentaire sur la borne
export const texteMarque = (marque: string, debut: Jour, fin: Jour) => `${marque} · période ${libellePeriode(debut, fin)}`;
