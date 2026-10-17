// Demi-journées de pose (17/10/2026, 22 h 49, choix de Matthieu : « je choisis la durée à chaque fois (½ j, 1 j, 2 j…) »).
// Une pose commence le matin (8 h) ou l'après-midi (13 h 30) et dure un nombre de demi-journées ouvrées (lundi au
// vendredi) : matin 8 h → 12 h, après-midi 13 h 30 → 17 h 30. Stockée dans le Planning Chantiers : 📅 Date Intervention
// (début) et ⏳ Durée intervention (½ journée, 1 jour, 1,5 jour, 2 jours, 3 jours, 4 jours, 5 jours ; option lue par son
// nom, jamais par sa position).
// Fichier pur : utilisable côté téléphone comme côté serveur.

export const MATIN = { debut: 8 * 60, fin: 12 * 60 };
export const APRES_MIDI = { debut: 13 * 60 + 30, fin: 17 * 60 + 30 };
export const DEPARTS_POSE = [MATIN.debut, APRES_MIDI.debut];
export const DUREES_POSE = ['½ journée', '1 jour', '1,5 jour', '2 jours', '3 jours', '4 jours', '5 jours'];
export type Segment = { jour: string; debut: number; fin: number };

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// « ½ journée » → 1, « 1 jour » → 2, « 1,5 jour » → 3, « 2 jours » → 4 ; 0 si inconnu
export function demiJourneesDe(libelle: string): number {
  const n = normal(libelle);
  if (!n) return 0;
  if (n.includes('½') || n.includes('demi') || n.includes('1/2')) return 1;
  const m = n.replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  return m ? Math.max(1, Math.round(Number(m[1]) * 2)) : 0;
}

export const decalerJour = (iso: string, n: number) => {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j + n, 12)).toISOString().slice(0, 10);
};
const jourSemaine = (iso: string) => {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j, 12)).getUTCDay();
};

// Demi-journées occupées par une pose qui commence ce jour-là (matin si avant midi), fusionnées par jour
export function segmentsPose(jour: string, minutes: number, demi: number): Segment[] {
  const res: Segment[] = [];
  let restants = Math.max(1, demi);
  let j = jour;
  let pm = minutes >= MATIN.fin;
  for (let garde = 0; restants > 0 && garde < 60; garde++) {
    const w = jourSemaine(j);
    if (w === 0 || w === 6) { j = decalerJour(j, 1); pm = false; continue; }
    const dernier = res[res.length - 1];
    if (pm && dernier && dernier.jour === j && dernier.fin === MATIN.fin) dernier.fin = APRES_MIDI.fin;
    else res.push({ jour: j, debut: pm ? APRES_MIDI.debut : MATIN.debut, fin: pm ? APRES_MIDI.fin : MATIN.fin });
    restants--;
    if (pm) { j = decalerJour(j, 1); pm = false; } else pm = true;
  }
  return res;
}

export const libelleJour = (iso: string) => {
  const [a, m, j] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, j, 12)));
};

// « mar. 20 oct. matin », « mar. 20 oct. (journée) », « du mar. 20 oct. au mer. 21 oct. midi »
export function libellePose(segs: Segment[]): string {
  if (!segs.length) return '';
  const a = segs[0];
  const b = segs[segs.length - 1];
  if (segs.length === 1) {
    if (a.debut === MATIN.debut && a.fin === APRES_MIDI.fin) return `${libelleJour(a.jour)} (journée)`;
    return `${libelleJour(a.jour)} ${a.debut < MATIN.fin ? 'matin' : 'après-midi'}`;
  }
  return `du ${libelleJour(a.jour)}${a.debut >= MATIN.fin ? ' après-midi' : ''} au ${libelleJour(b.jour)}${b.fin <= MATIN.fin ? ' midi' : ' soir'}`;
}

// « 2026-10-22 » + minutes depuis minuit, heure de Paris → horodatage
export function parisVersMs(jour: string, minutes: number): number {
  const [a, m, j] = jour.split('-').map(Number);
  const essai = Date.UTC(a, m - 1, j, Math.floor(minutes / 60), minutes % 60);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(essai));
  const p = (t: string) => Number(parts.find((x) => x.type === t)?.value);
  const vuParis = Date.UTC(p('year'), p('month') - 1, p('day'), p('hour'), p('minute'));
  return essai - (vuParis - essai);
}

// « AAAA-MM-JJ » à Paris, et minutes depuis minuit si l'heure est précisée (date sans heure : 0 h ou 4 h)
export function jourEtMinutes(ms: unknown): { jour: string; minutes: number | null } | null {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return null;
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(n));
  const v = (t: string) => p.find((x) => x.type === t)?.value || '00';
  const h = Number(v('hour'));
  const mi = Number(v('minute'));
  return { jour: `${v('year')}-${v('month')}-${v('day')}`, minutes: mi === 0 && (h === 0 || h === 4) ? null : h * 60 + mi };
}

// Ville d'une adresse (« 41 Av. Anna de Noailles, 74500 Évian-les-Bains, France » → « Évian-les-Bains »)
export function villeDe(adresse: string): string {
  const m = adresse.match(/\b\d{5}\s+([^,]+)/);
  if (m) return m[1].trim();
  const morceaux = adresse.split(',').map((s) => s.trim()).filter(Boolean);
  return morceaux.length > 1 ? morceaux[morceaux.length - 2] : morceaux[0] || '';
}
