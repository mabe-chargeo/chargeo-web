// Un espace par rôle (page « Un espace par rôle (proposition du 17/10/2026, 10 h 30) » du Doc de la carte des menus).
// Principe validé par Matthieu le 17/10/2026 : 3 niveaux seulement. Mon espace = les vues du rôle dans l'ordre de son
// travail, chacune avec son compteur ; une vue = la liste des fiches ; la fiche, toujours la même, avec le bloc 📇 Contact.
// Espace Commercial validé le 17/10 à 10 h 44 (9 vues + bouton Nouveau lead). Les autres rôles restent à valider.
// Fichier pur (aucun accès réseau) : utilisable côté téléphone comme côté serveur. L'affichage ne donne aucun droit.
import type { Jour } from '@/lib/joursOuvres';
import { aujourdhuiParis, comparer } from '@/lib/joursOuvres';

export type SourceVue = 'qualification' | 'prospection' | 'contacts' | 'aucune';

export type VueEspace = {
  cle: string;
  emoji: string;
  libelle: string;
  description: string;
  href: string;
  source: SourceVue;
  // Clé de la vue dans sa source (vuesFiches pour Qualification, VUES_PROSPECTION pour Prospection)
  vue?: string;
  // Compteur en orange quand il n'est pas à zéro (travail en retard ou du jour)
  urgent?: boolean;
};

export type Espace = { titre: string; creer?: { libelle: string; href: string }; vues: VueEspace[] };

export const ESPACES: Partial<Record<'commercial' | 'chargeOperation' | 'poseur' | 'backOffice' | 'direction', Espace>> = {
  commercial: {
    titre: 'Espace commercial',
    creer: { libelle: 'Nouveau lead', href: '/interne/bientot/lead' },
    vues: [
      { cle: 'a-appeler', emoji: '📞', libelle: "À appeler aujourd'hui", description: 'Prospects dont la date de rappel est aujourd’hui ou passée', href: '/interne/prospection?vue=a-appeler', source: 'prospection', vue: 'a-appeler', urgent: true },
      { cle: 'chasse', emoji: '🚀', libelle: 'Pipeline chasse', description: 'Tous les prospects par étape, filtre LinkedIn', href: '/interne/prospection?vue=chasse', source: 'prospection', vue: 'chasse' },
      { cle: 'a-caler', emoji: '📅', libelle: 'Visites à caler', description: 'Relevés sans date de visite : appeler le client', href: '/interne/fiches?vue=a-caler', source: 'qualification', vue: 'a-caler' },
      { cle: 'devis-a-chiffrer', emoji: '📝', libelle: 'Devis à chiffrer', description: 'Relevé reçu, devis à faire dans Costructor', href: '/interne/fiches?vue=devis-a-chiffrer', source: 'qualification', vue: 'devis-a-chiffrer' },
      { cle: 'relances-echues', emoji: '📩', libelle: 'Relances devis', description: 'Relance du jour ou en retard', href: '/interne/fiches?vue=relances-echues', source: 'qualification', vue: 'relances-echues', urgent: true },
      { cle: 'en-negociation', emoji: '🔥', libelle: 'En négociation', description: 'Devis discutés avec le client', href: '/interne/fiches?vue=en-negociation', source: 'qualification', vue: 'en-negociation' },
      { cle: 'toutes', emoji: '💰', libelle: 'Pipeline vente', description: 'Toutes les affaires, rangées par étape', href: '/interne/fiches?vue=toutes', source: 'qualification', vue: 'toutes' },
      { cle: 'planifies', emoji: '🗺️', libelle: 'Agenda des visites', description: 'Visites calées, aujourd’hui et à venir (carte à venir)', href: '/interne/fiches?vue=planifies', source: 'qualification', vue: 'planifies' },
      { cle: 'contacts', emoji: '👥', libelle: 'Contacts', description: 'Syndics, conseils syndicaux, gestionnaires', href: '/interne/contacts', source: 'contacts' },
    ],
  },
};

// ── Prospection (Chasse) ❄️ ──
export const PROSPECTION_ID = '901519675281';
export const SOURCE_PROSPECT_ID = '473aa581-a6b1-43c7-8c2e-efd683954a6c';
// Ordre des étapes de la liste (lu le 17/10/2026)
export const ETAPES_PROSPECTION = ['a traiter', 'en traitement', 'contacte', 'nurturing', 'rdv fixe', 'pas interesse'];

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const jourDe = (ms: unknown): Jour | null => {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? aujourdhuiParis(new Date(n)) : null;
};
const termine = (t: any) => { const s = normal(t?.status?.status); return s.includes('rdv fixe') || s.includes('pas interesse') || s.includes('archive'); };

export const VUES_PROSPECTION: Record<string, { libelle: string; filtre: (t: any, a: Jour) => boolean }> = {
  // Vue ClickUp 📞 À APPELER AUJOURD'HUI : échéance du jour ou passée, prospects encore en cours
  'a-appeler': { libelle: "À appeler aujourd'hui", filtre: (t, a) => { const j = jourDe(t?.due_date); return !termine(t) && !!j && comparer(j, a) <= 0; } },
  // Vue ClickUp 🚀 PIPELINE CHASSE : tous les prospects ouverts, par étape
  chasse: { libelle: 'Pipeline chasse', filtre: () => true },
};

export const etapeProspect = (t: any): number => {
  const s = normal(t?.status?.status);
  const i = ETAPES_PROSPECTION.findIndex((e) => s.includes(e));
  return i < 0 ? ETAPES_PROSPECTION.length : i;
};

// Ordre des étapes de Qualification (« Pipeline vente » en colonnes, empilées sur téléphone)
export const ETAPES_QUALIFICATION = ['a visiter', 'devis a faire', 'devis envoy', 'negociation', 'gagn', 'perdu'];
export const etapeQualification = (statut: string): number => {
  const s = normal(statut);
  const i = ETAPES_QUALIFICATION.findIndex((e) => s.includes(e));
  return i < 0 ? ETAPES_QUALIFICATION.length : i;
};
