// Lecture générique des champs personnalisés ClickUp (écrans de liste et fiche générique, 17/10/2026).
// Chaque champ rempli devient { nom, texte, type, lien?, liens? } lisible sur téléphone, quel que soit son type.
// Fichier pur (aucun accès réseau).

export type ChampLu = {
  id: string;
  nom: string;
  type: string;
  texte: string;
  // URL, email (mailto:) ou téléphone (tel:)
  lien?: string;
  // Tâches reliées (relations)
  taches?: { id: string; nom: string }[];
};

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const EXCLUS = ['baseline_'];

export const dateCourte = (ms: unknown, avecHeure = false): string => {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return '';
  const d = new Date(n);
  const options: Intl.DateTimeFormatOptions = { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' };
  if (avecHeure) { options.hour = '2-digit'; options.minute = '2-digit'; }
  const texte = new Intl.DateTimeFormat('fr-FR', options).format(d);
  return avecHeure ? texte.replace(' 00:00', '').replace(' 04:00', '') : texte;
};

const nombre = (v: unknown, decimales = 2) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: decimales }).format(Number(v));

export function lireChamp(c: any): ChampLu | null {
  if (!c || EXCLUS.some((x) => normal(c.name).startsWith(x))) return null;
  const v = c.value;
  const type = String(c.type || '');
  const base = { id: String(c.id), nom: String(c.name || ''), type };
  const vide = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
  if (vide && type !== 'formula') return null;
  const options: any[] = c.type_config?.options || [];
  switch (type) {
    case 'drop_down': {
      const o = options.find((x) => x.orderindex === Number(v) || x.id === v);
      return o ? { ...base, texte: String(o.name || '') } : null;
    }
    case 'labels': {
      const noms = (Array.isArray(v) ? v : []).map((id: any) => options.find((x) => x.id === id)?.label || options.find((x) => x.id === id)?.name).filter(Boolean);
      return noms.length ? { ...base, texte: noms.join(', ') } : null;
    }
    case 'date':
      return { ...base, texte: dateCourte(v, true) };
    case 'currency':
      return { ...base, texte: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c.type_config?.currency_type || 'EUR' }).format(Number(v)) };
    case 'number':
      return { ...base, texte: nombre(v, c.type_config?.precision ?? 2) };
    case 'checkbox':
      return v === true || v === 'true' ? { ...base, texte: 'Oui' } : null;
    case 'users':
      return { ...base, texte: (Array.isArray(v) ? v : []).map((u: any) => u?.username || u?.email).filter(Boolean).join(', ') };
    case 'tasks':
    case 'list_relationship': {
      const taches = (Array.isArray(v) ? v : []).filter((x: any) => x?.id).map((x: any) => ({ id: String(x.id), nom: String(x.name || '') }));
      return taches.length ? { ...base, texte: taches.map((x) => x.nom).join(', '), taches } : null;
    }
    case 'url':
      return { ...base, texte: String(v), lien: String(v) };
    case 'email':
      return { ...base, texte: String(v), lien: `mailto:${v}` };
    case 'phone':
      return { ...base, texte: String(v), lien: `tel:${String(v).replace(/\s+/g, '')}` };
    case 'location': {
      const adresse = v?.formatted_address ? String(v.formatted_address) : '';
      return adresse ? { ...base, texte: adresse, lien: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}` } : null;
    }
    case 'attachment':
      return { ...base, texte: `${(Array.isArray(v) ? v : []).length} fichier(s)` };
    case 'manual_progress':
    case 'automatic_progress': {
      const p = Number(v?.percent_complete ?? v?.current ?? v);
      return Number.isFinite(p) ? { ...base, texte: `${Math.round(p)} %` } : null;
    }
    case 'emoji':
      return { ...base, texte: `${v} / ${c.type_config?.count || 5}` };
    case 'formula':
      return vide ? null : { ...base, texte: typeof v === 'number' ? nombre(v) : String(v) };
    default:
      return typeof v === 'object' ? null : { ...base, texte: String(v) };
  }
}

// Tous les champs remplis d'une tâche, dans l'ordre de ClickUp
export const champsLus = (t: any): ChampLu[] =>
  (Array.isArray(t?.custom_fields) ? t.custom_fields : []).map(lireChamp).filter((c: ChampLu | null): c is ChampLu => !!c);

// Champs clés d'une carte : ceux dont le nom contient un des mots, dans l'ordre des mots
export function champsCles(t: any, mots: string[], max = 3): ChampLu[] {
  const tous = champsLus(t);
  const sortie: ChampLu[] = [];
  for (const m of mots) {
    const c = tous.find((x) => normal(x.nom).includes(normal(m)) && !sortie.includes(x));
    if (c) sortie.push(c);
    if (sortie.length >= max) break;
  }
  return sortie;
}

// La tâche est-elle à la personne : assignée, ou dans un champ Personnes (Technicien…)
export function estAMoiPartout(t: any, moi: number): boolean {
  if ((Array.isArray(t?.assignees) ? t.assignees : []).some((u: any) => Number(u?.id) === Number(moi))) return true;
  return (Array.isArray(t?.custom_fields) ? t.custom_fields : []).some(
    (c: any) => c?.type === 'users' && Array.isArray(c.value) && c.value.some((u: any) => Number(u?.id) === Number(moi)),
  );
}
