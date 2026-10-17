"use client";

// Agenda de la semaine pour caler un rendez-vous (17/10/2026, 22 h 42, Matthieu : « est-ce qu'il ne serait pas possible
// de faire une interface plutôt avec un tableau, un vrai agenda avec les créneaux, les jours, et on clique sur un
// créneau libre pour le placer »). Lundi à vendredi en colonnes, 8 h à 18 h en lignes de 30 min.
// - blocs : ce qui occupe déjà les personnes (rendez-vous de l'ERP avec type, nom et ville ; agenda Google « Occupé »).
//   « proche » = même ville que le rendez-vous à caler (vert), pour regrouper une tournée.
// - journees : événements sur toute la journée (chantier sans heure, congé, garde…) : bandeau orange en tête de
//   colonne, sans bloquer les créneaux (décision de Matthieu du 17/10, 22 h 18).
// - Un créneau est libre si le rendez-vous tient sans chevaucher un bloc, marge de route comprise, et n'est pas déjà
//   passé. Cliquer un créneau libre le choisit (blocs turquoise).
// 17/10, 22 h 49 (poses) : departs = heures de départ possibles (8 h et 13 h 30 pour une pose) ; segments = ce que
// le rendez-vous occupe s'il part de ce créneau (plusieurs demi-journées, sur plusieurs jours). Par défaut, un
// rendez-vous de « duree » minutes à chaque demi-heure.
// Composant d'affichage, sans lecture réseau.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CYAN, ORANGE } from '@/components/charte/couleurs';

export type BlocAgenda = { jour: string; debut: number; fin: number; titre: string; detail?: string; ton: 'erp' | 'agenda' | 'proche' };
export type JourneeAgenda = { jour: string; titre: string };
type Seg = { jour: string; debut: number; fin: number };

const DEBUT = 8 * 60;
const FIN = 18 * 60;
const PAS = 30;
const HAUTEUR = 26;
const VERT = '#16a34a';

const parisAujourdhui = () => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const v = (t: string) => p.find((x) => x.type === t)?.value || '00';
  return { jour: `${v('year')}-${v('month')}-${v('day')}`, minutes: Number(v('hour')) * 60 + Number(v('minute')) };
};
const decaler = (iso: string, n: number) => {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j + n, 12)).toISOString().slice(0, 10);
};
const jourSemaine = (iso: string) => {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j, 12)).getUTCDay();
};
export const libelleJourCourt = (iso: string) => {
  const [a, m, j] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, j, 12)));
};
export const heureDe = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}h${String(min % 60).padStart(2, '0')}`;

// Lundi de la semaine affichée : la semaine en cours, ou la suivante le samedi et le dimanche
function lundi(semaine: number): string {
  const a = parisAujourdhui().jour;
  const w = jourSemaine(a);
  const base = w === 6 ? decaler(a, 2) : w === 0 ? decaler(a, 1) : decaler(a, 1 - w);
  return decaler(base, semaine * 7);
}

export default function AgendaSemaine({
  blocs,
  journees,
  duree,
  marge,
  choix,
  onChoisir,
  semaine,
  onSemaine,
  semainesMax = 3,
  departs,
  segments,
}: {
  blocs: BlocAgenda[];
  journees: JourneeAgenda[];
  duree: number;
  marge: number;
  choix: { jour: string; minutes: number } | null;
  onChoisir: (jour: string, minutes: number) => void;
  semaine: number;
  onSemaine: (n: number) => void;
  semainesMax?: number;
  departs?: number[];
  segments?: (jour: string, minutes: number) => Seg[];
}) {
  const debutSemaine = lundi(semaine);
  const jours = [0, 1, 2, 3, 4].map((i) => decaler(debutSemaine, i));
  const maintenant = parisAujourdhui();
  const lignes: number[] = [];
  for (let m = DEBUT; m < FIN; m += PAS) lignes.push(m);
  const hauteur = lignes.length * HAUTEUR;
  const segs = (jour: string, m: number): Seg[] => (segments ? segments(jour, m) : [{ jour, debut: m, fin: m + duree }]);
  const starts = departs && departs.length ? departs : lignes;

  const libre = (jour: string, m: number) => {
    const s = segs(jour, m);
    if (!s.length) return false;
    if (jour < maintenant.jour || (jour === maintenant.jour && m <= maintenant.minutes)) return false;
    return s.every((x) => x.fin <= FIN && !blocs.some((b) => b.jour === x.jour && x.debut < b.fin + marge && x.fin > b.debut - marge));
  };
  const haut = (m: number) => ((Math.max(m, DEBUT) - DEBUT) / PAS) * HAUTEUR;
  const taille = (d: number, f: number) => Math.max(HAUTEUR - 2, ((Math.min(f, FIN) - Math.max(d, DEBUT)) / PAS) * HAUTEUR - 2);
  const choisis = choix ? segs(choix.jour, choix.minutes) : [];

  return (
    <div className="rounded-[20px] bg-white p-2 ring-[1.5px] ring-[#dfe3e8]">
      <div className="flex items-center justify-between px-1 pb-2">
        <button onClick={() => onSemaine(semaine - 1)} disabled={semaine <= 0} aria-label="Semaine précédente" className="flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30">
          <ChevronLeft size={20} color={CYAN} />
        </button>
        <p className="text-[14px] font-bold">Semaine du {libelleJourCourt(debutSemaine)}</p>
        <button onClick={() => onSemaine(semaine + 1)} disabled={semaine >= semainesMax} aria-label="Semaine suivante" className="flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30">
          <ChevronRight size={20} color={CYAN} />
        </button>
      </div>

      <div className="grid gap-x-1" style={{ gridTemplateColumns: '34px repeat(5, minmax(0, 1fr))' }}>
        <div />
        {jours.map((j) => {
          const [, , d] = j.split('-');
          const nom = libelleJourCourt(j).split(' ')[0];
          return (
            <div key={j} className="pb-1 text-center leading-tight">
              <p className="text-[11px] font-semibold uppercase text-slate-500">{nom}</p>
              <p className="text-[15px] font-bold" style={j === maintenant.jour ? { color: CYAN } : undefined}>{Number(d)}</p>
            </div>
          );
        })}

        <div />
        {jours.map((j) => {
          const liste = journees.filter((x) => x.jour === j);
          return (
            <div key={`jr-${j}`} className="min-h-[4px] space-y-0.5 pb-1">
              {liste.map((x, i) => (
                <p key={i} className="truncate rounded-[6px] px-1 py-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: ORANGE }} title={x.titre}>{x.titre}</p>
              ))}
            </div>
          );
        })}

        <div className="relative" style={{ height: hauteur }}>
          {lignes.filter((m) => m % 60 === 0).map((m) => (
            <p key={m} className="absolute right-1 text-[10px] font-semibold text-slate-400" style={{ top: haut(m) - 6 }}>{Math.floor(m / 60)}h</p>
          ))}
        </div>
        {jours.map((j) => (
          <div key={`col-${j}`} className="relative rounded-[8px] bg-[#f4f6f8]" style={{ height: hauteur }}>
            {lignes.map((m) => (
              <div key={`l${m}`} className={`pointer-events-none absolute left-0 right-0 border-t ${m % 60 === 0 ? 'border-[#dfe3e8]' : 'border-dashed border-[#e8ebee]'}`} style={{ top: haut(m) }} />
            ))}
            {starts.map((m, i) => {
              const ok = libre(j, m);
              const suivant = departs && departs.length ? (starts[i + 1] ?? FIN) : m + PAS;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={!ok}
                  onClick={() => onChoisir(j, m)}
                  aria-label={`${libelleJourCourt(j)} à ${heureDe(m)}${ok ? '' : ' (pris)'}`}
                  className={`absolute left-0 right-0 ${ok ? 'bg-white/90 active:bg-[#e6f6f9]' : 'cursor-default bg-transparent'} ${departs ? 'rounded-[6px] ring-1 ring-inset ring-[#dfe3e8]' : ''}`}
                  style={{ top: haut(m) + (departs ? 1 : 0), height: ((Math.min(suivant, FIN) - m) / PAS) * HAUTEUR - (departs ? 2 : 0) }}
                >
                  {departs && ok && <span className="text-[10px] font-semibold text-slate-400">{m < 12 * 60 ? 'matin' : 'après-midi'}</span>}
                </button>
              );
            })}
            {blocs.filter((b) => b.jour === j && b.fin > DEBUT && b.debut < FIN).map((b, i) => (
              <div
                key={i}
                className="pointer-events-none absolute left-0.5 right-0.5 overflow-hidden rounded-[6px] px-1 py-0.5"
                style={{
                  top: haut(b.debut) + 1,
                  height: taille(b.debut, b.fin),
                  backgroundColor: b.ton === 'agenda' ? '#cfd5dc' : b.ton === 'proche' ? '#dcfce7' : '#d6eef3',
                  boxShadow: `inset 3px 0 0 ${b.ton === 'agenda' ? '#94a3b8' : b.ton === 'proche' ? VERT : CYAN}`,
                }}
                title={[b.titre, b.detail].filter(Boolean).join(' · ')}
              >
                <p className="truncate text-[9px] font-bold leading-tight">{heureDe(b.debut)} {b.titre}</p>
                {b.detail && <p className="truncate text-[9px] leading-tight">{b.detail}</p>}
              </div>
            ))}
            {choisis.filter((s) => s.jour === j).map((s, i) => (
              <div key={`c${i}`} className="pointer-events-none absolute left-0.5 right-0.5 rounded-[6px] px-1 py-0.5 text-white" style={{ top: haut(s.debut) + 1, height: taille(s.debut, s.fin), backgroundColor: CYAN }}>
                <p className="text-[10px] font-bold leading-tight">{heureDe(s.debut)}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 pt-2 text-[11px] font-semibold text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-white ring-1 ring-[#dfe3e8]" /> libre, touche pour choisir</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#d6eef3' }} /> RDV ERP</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#dcfce7' }} /> même ville</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#cfd5dc' }} /> agenda Google</span>
      </div>
    </div>
  );
}
