// Vues des fiches de l'application équipe (structure validée par Matthieu le 16/10/2026, 23 h 22 : « réfléchir comme si
// c'étaient des vues ClickUp »). Une vue = un filtre sur les fiches principales de Qualification (la fiche voyageuse),
// avec son libellé, ses rôles et son tri. Source unique : l'écran Fiches (sous-menu des vues, compteurs) et Ma journée
// (cartes qui ouvrent la vue) lisent les mêmes règles, donc les mêmes chiffres.
// Pas d'accès réseau ici : fonctions pures sur les tâches lues par l'appelant.
import { estAVisiter } from '@/lib/listesClickUp';
import { aujourdhuiParis, comparer, type Jour } from '@/lib/joursOuvres';
import type { Role } from '@/lib/roles';

export const DATE_VISITE_ID = '3e633a82-89e3-4895-80d6-04ad25bbccd4';
const LIEU_CHANTIER_ID = '5b9cbfd6-535c-4416-b530-776f949ce432';
const ADRESSE_ID = '990a7f3b-989f-416d-9a80-eba5654b228d';

export type CleVue =
  | 'a-caler'
  | 'planifies'
  | 'en-retard'
  | 'devis-a-chiffrer'
  | 'devis-envoyes'
  | 'relances-echues'
  | 'en-negociation'
  | 'gagnees'
  | 'toutes';
export type Tri = 'dateVisite' | 'echeance' | 'maj';
export type Vue = {
  cle: CleVue;
  libelle: string;
  description: string;
  roles: Role[];
  filtre: (t: any, aujourdhui: Jour) => boolean;
  tri: Tri;
};

export const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export const champ = (t: any, id: string) => (Array.isArray(t?.custom_fields) ? t.custom_fields : []).find((c: any) => c?.id === id);
const statut = (t: any) => normal(t?.status?.status);

export const jourDe = (ms: unknown): Jour | null => {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? aujourdhuiParis(new Date(n)) : null;
};
export const dateVisiteDe = (t: any): number | null => {
  const n = Number(champ(t, DATE_VISITE_ID)?.value);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const visite = (t: any) => jourDe(dateVisiteDe(t));
const aVisiter = (t: any) => estAVisiter(t?.status?.status);

// Nom de l'option d'un menu déroulant (« 🏢 Syndic »), vide si rien
export function nomOption(t: any, id: string): string {
  const f = champ(t, id);
  const v = f?.value;
  if (v === undefined || v === null || v === '') return '';
  const o = (f?.type_config?.options || []).find((x: any) => x.orderindex === Number(v) || x.id === v);
  return String(o?.name || '');
}

// Option sans son emoji de tête (« 🏢 Syndic » → « Syndic »)
export const sansEmoji = (s: string) => s.replace(/^[^A-Za-z0-9\u00C0-\u017F]+/, '').trim();

export function adresseDe(t: any): string {
  for (const id of [LIEU_CHANTIER_ID, ADRESSE_ID]) {
    const v = champ(t, id)?.value;
    const a = v?.formatted_address || (typeof v === 'string' ? v : '');
    if (a) return String(a);
  }
  return '';
}

// « jeu. 15/10 », et « jeu. 15/10 à 14h30 » si l'heure est précisée (date sans heure enregistrée à 0 h ou 4 h)
export function libelleDate(ms: number, avecHeure = true): string {
  const d = new Date(ms);
  const jour = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: '2-digit', month: '2-digit' }).format(d);
  if (!avecHeure) return jour;
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const h = parts.find((p) => p.type === 'hour')?.value || '00';
  const m = parts.find((p) => p.type === 'minute')?.value || '00';
  return m === '00' && (h === '00' || h === '04') ? jour : `${jour} à ${h}h${m}`;
}

export const VUES: Vue[] = [
  {
    cle: 'a-caler', libelle: 'À caler', description: 'Relevés sans date de visite : appeler le client pour fixer le rendez-vous',
    roles: ['commercial', 'chargeOperation'], filtre: (t) => aVisiter(t) && !visite(t), tri: 'maj',
  },
  {
    cle: 'planifies', libelle: 'Relevés planifiés', description: "Visites calées, aujourd'hui et à venir",
    roles: ['chargeOperation', 'commercial'],
    filtre: (t, a) => { const j = visite(t); return aVisiter(t) && !!j && comparer(j, a) >= 0; }, tri: 'dateVisite',
  },
  {
    cle: 'en-retard', libelle: 'Relevés en retard', description: 'Date de visite passée, relevé pas encore envoyé',
    roles: ['chargeOperation', 'commercial'],
    filtre: (t, a) => { const j = visite(t); return aVisiter(t) && !!j && comparer(j, a) < 0; }, tri: 'dateVisite',
  },
  {
    cle: 'devis-a-chiffrer', libelle: 'Devis à chiffrer', description: 'Fiches en 📝 devis à faire : relevé reçu, devis à faire dans Costructor',
    roles: ['commercial'], filtre: (t) => statut(t).includes('devis a faire'), tri: 'maj',
  },
  {
    cle: 'devis-envoyes', libelle: 'Devis envoyés', description: 'Fiches en 📩 devis envoyé, avec leur date de relance',
    roles: ['commercial'], filtre: (t) => statut(t).includes('devis envoy'), tri: 'echeance',
  },
  {
    cle: 'relances-echues', libelle: 'Relances échues', description: "Devis envoyés dont la relance est aujourd'hui ou passée",
    roles: ['commercial'],
    filtre: (t, a) => { const j = jourDe(t?.due_date); return statut(t).includes('devis envoy') && !!j && comparer(j, a) <= 0; }, tri: 'echeance',
  },
  {
    cle: 'en-negociation', libelle: 'En négociation', description: 'Fiches en 🔥 en négociation',
    roles: ['commercial'], filtre: (t) => statut(t).includes('negociation'), tri: 'maj',
  },
  {
    cle: 'gagnees', libelle: 'Gagnées', description: 'Fiches en 🏆 gagné (elles partent ensuite au Planning chantiers)',
    roles: ['commercial', 'backOffice'], filtre: (t) => statut(t).includes('gagn'), tri: 'maj',
  },
  {
    cle: 'toutes', libelle: 'Toutes', description: 'Toutes les fiches ouvertes de Qualification',
    roles: ['commercial', 'chargeOperation', 'backOffice'], filtre: () => true, tri: 'maj',
  },
];

export const vueDe = (cle: string | null | undefined): Vue | undefined => VUES.find((v) => v.cle === cle);

// Vues accessibles : toutes pour la direction, sinon celles d'au moins un de ses rôles
export const vuesVisibles = (roles: Role[]): Vue[] =>
  roles.includes('direction') ? VUES : VUES.filter((v) => v.roles.some((r) => roles.includes(r)));

export function trier(taches: any[], tri: Tri): any[] {
  const cle = (t: any): number => {
    if (tri === 'dateVisite') return dateVisiteDe(t) ?? Number.MAX_SAFE_INTEGER;
    if (tri === 'echeance') return Number(t?.due_date) || Number.MAX_SAFE_INTEGER;
    return -(Number(t?.date_updated) || 0);
  };
  return [...taches].sort((a, b) => cle(a) - cle(b));
}
