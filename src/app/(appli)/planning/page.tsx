"use client";

// Planning (lot B des écrans manquants, 17/10/2026).
// Deux vues, comme la carte des menus : Master planning (tout, par jour) et Planning techs (par installateur, puis par
// jour). En tête : en retard (date passée, pas terminé), puis les jours à venir, puis « Sans date » (à planifier).
// Chaque ligne ouvre la fiche (affaire pour une pose ou un relevé, générique sinon).
// 17/10/2026, 18 h 34 (Matthieu : « le planning c'est pour planifier avec les clients, les interventions chantier, les
// dépannages, les visites de maintenance et éventuellement aussi les relevés techniques ») : filtres Poses, Dépannages,
// Visites, Relevés. Plus de livraisons (ajoutées par erreur à 18 h 22).
// ?types=releve (ou depannage, visite, pose, séparés par des virgules) ouvre le planning sur ces filtres.
// 17/10, 23 h 16 (Matthieu : « Y a rien à faire dans le planning ? ») : on planifie depuis le planning. Relevé à visiter :
//   « Caler le relevé » ou « Décaler » (/affaires/<id>/caler : commercial, chef de chantier, direction). Pose à planifier,
//   en préparation ou planifiée : « Planifier la pose » ou « Décaler » (/chantiers/<id>/planifier : chef de chantier,
//   direction). Les boutons suivent les rôles de /api/interne/moi ; chaque route contrôle elle-même les droits.
// 18/10, 8 h 31 (Matthieu : « Fais maintenance et SAV ») : visite de maintenance (à planifier ou rdv confirmé) et
//   dépannage (ticket ouvert) : « Caler » ou « Décaler » (/maintenance/<id>/caler, /sav/<id>/caler : chef de chantier, direction).
// 19/10/2026 (2e lot de cohérence) : cartes et boutons sur les briques communes (src/components/charte/Appli.tsx),
// bouton Retour de l'en-tête commun.
// 19/10/2026, 18 h 43 : adresses des écrans lues dans src/lib/adresses.ts.
import { useEffect, useState } from 'react';
import { CalendarPlus, ChevronRight, MapPin, RefreshCw, User } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';
import { adresses } from '@/lib/adresses';

type Type = 'pose' | 'visite' | 'depannage' | 'releve';
type Item = { id: string; type: Type; nom: string; statut: string; couleurStatut: string; jour: string; heure: string; techniciens: { id: string; nom: string }[]; adresse: string; lien: string };

const TYPES: { cle: Type; libelle: string; emoji: string }[] = [
  { cle: 'pose', libelle: 'Poses', emoji: '🏗️' },
  { cle: 'depannage', libelle: 'Dépannages', emoji: '🚨' },
  { cle: 'visite', libelle: 'Visites', emoji: '🔧' },
  { cle: 'releve', libelle: 'Relevés', emoji: '📋' },
];
const TOUS: Type[] = ['pose', 'depannage', 'visite', 'releve'];
const emojiDe = (t: Type) => TYPES.find((x) => x.cle === t)?.emoji || '';
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const ROLES_CALER = ['direction', 'commercial', 'chargeOperation'];
const ROLES_PLANIFIER = ['direction', 'chargeOperation'];

const aujourdhui = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const libelleJour = (jour: string, auj: string) => {
  if (jour === auj) return "Aujourd'hui";
  const d = new Date(`${jour}T12:00:00`);
  const demain = new Date(`${auj}T12:00:00`);
  demain.setDate(demain.getDate() + 1);
  const texte = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  return d.toDateString() === demain.toDateString() ? `Demain, ${texte}` : texte.charAt(0).toUpperCase() + texte.slice(1);
};

export default function PlanningPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [avertissements, setAvertissements] = useState<string[]>([]);
  const [vue, setVue] = useState<'master' | 'techs'>('master');
  const [types, setTypes] = useState<Type[]>(TOUS);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [auj, setAuj] = useState('');
  const [roles, setRoles] = useState<string[]>([]);

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    setAuj(aujourdhui());
    try {
      const res = await fetch('/api/interne/planning', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
      else { setItems(data.items || []); setAvertissements(data.avertissements || []); }
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('vue') === 'techs') setVue('techs');
    const demandes = String(params.get('types') || '').split(',').filter((t): t is Type => TOUS.indexOf(t as Type) >= 0);
    if (demandes.length) setTypes(demandes);
    charger();
    fetch('/api/interne/moi', { cache: 'no-store' }).then((r) => r.json()).then((j) => setRoles(Array.isArray(j?.roles) ? j.roles.map(String) : [])).catch(() => null);
  }, []);

  const visibles = items.filter((i) => types.includes(i.type));
  const basculer = (t: Type) => setTypes((l) => (l.includes(t) ? (l.length > 1 ? l.filter((x) => x !== t) : l) : [...l, t]));
  const peutCaler = roles.some((r) => ROLES_CALER.includes(r));
  const peutPlanifier = roles.some((r) => ROLES_PLANIFIER.includes(r));

  // Action de planification d'une ligne (ou rien)
  const actionDe = (i: Item): { href: string; libelle: string } | null => {
    const s = normal(i.statut);
    if (i.type === 'releve' && peutCaler && s.includes('a visiter')) return { href: adresses.calerReleve(i.id), libelle: i.jour ? 'Décaler le relevé' : 'Caler le relevé' };
    if (i.type === 'pose' && peutPlanifier && (s.includes('a planifier') || s.includes('preparation') || s.includes('planifie'))) return { href: adresses.planifierPose(i.id), libelle: i.jour ? 'Décaler la pose' : 'Planifier la pose' };
    if (i.type === 'visite' && peutPlanifier) return { href: adresses.calerVisite(i.id), libelle: i.jour ? 'Décaler la visite' : 'Caler la visite' };
    if (i.type === 'depannage' && peutPlanifier) return { href: adresses.calerDepannage(i.id), libelle: i.jour ? 'Décaler le dépannage' : 'Caler le dépannage' };
    return null;
  };

  // Groupes par jour : en retard, jours à venir dans l'ordre, sans date
  const groupes = (liste: Item[]) => {
    const retard = liste.filter((i) => i.jour && i.jour < auj);
    const jours = liste.map((i) => i.jour).filter((j, k, t) => !!j && j >= auj && t.indexOf(j) === k).sort();
    const sansDate = liste.filter((i) => !i.jour);
    const sortie: { titre: string; items: Item[]; urgent?: boolean }[] = [];
    if (retard.length) sortie.push({ titre: 'En retard', items: retard.sort((a, b) => a.jour.localeCompare(b.jour)), urgent: true });
    for (const j of jours) sortie.push({ titre: libelleJour(j, auj), items: liste.filter((i) => i.jour === j).sort((a, b) => a.heure.localeCompare(b.heure)) });
    if (sansDate.length) sortie.push({ titre: 'Sans date (à planifier)', items: sansDate });
    return sortie;
  };

  // Planning techs : un bloc par personne, plus « Non affecté »
  const techniciens = visibles.reduce((acc: { id: string; nom: string }[], i) => {
    for (const t of i.techniciens) if (!acc.some((x) => x.id === t.id)) acc.push(t);
    return acc;
  }, []).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const nonAffectes = visibles.filter((i) => !i.techniciens.length);

  const ligne = (i: Item, avecTech: boolean) => {
    const action = actionDe(i);
    return (
      <div key={`${i.type}-${i.id}`} className="rounded-[16px] bg-white p-4 ring-[1.5px] ring-[#dfe3e8]">
        <a href={i.lien} className="flex items-start justify-between gap-3 transition-transform active:scale-[0.98]">
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-slate-500">
              {emojiDe(i.type)} {i.heure || (i.jour ? 'heure à caler' : 'à planifier')} · <span style={{ color: i.couleurStatut || undefined }}>{i.statut}</span>
            </p>
            <p className="mt-0.5 text-[16px] font-bold leading-tight">{i.nom}</p>
            {i.adresse && <p className="mt-1 flex items-center gap-1 truncate text-[13px]"><MapPin size={13} className="shrink-0" color={CYAN} /> {i.adresse}</p>}
            {avecTech && (
              <p className="mt-1 flex items-center gap-1 text-[13px] font-semibold" style={{ color: i.techniciens.length ? undefined : ORANGE }}>
                <User size={13} className="shrink-0" color={i.techniciens.length ? CYAN : ORANGE} /> {i.techniciens.length ? i.techniciens.map((t) => t.nom).join(', ') : 'Technicien à affecter'}
              </p>
            )}
          </div>
          <ChevronRight size={20} className="shrink-0" color={CYAN} />
        </a>
        {action && (
          <a href={action.href} className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-bold text-white transition-transform active:scale-95" style={{ backgroundColor: CYAN }}>
            <CalendarPlus size={15} /> {action.libelle}
          </a>
        )}
      </div>
    );
  };

  const blocJours = (liste: Item[], avecTech: boolean) =>
    groupes(liste).map((g) => (
      <div key={g.titre} className="space-y-2">
        <p className="px-1 text-[13px] font-extrabold uppercase tracking-[0.1em]" style={{ color: g.urgent ? ORANGE : undefined }}>{g.titre} · {g.items.length}</p>
        {g.items.map((i) => ligne(i, avecTech))}
      </div>
    ));

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Interventions planifiées avec les clients" titre="Planning" retour={{ href: adresses.aTraiter, libelle: "Mon espace" }} />
      <ContenuAppli className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-full bg-[#eef1f4] p-1">
          {(['master', 'techs'] as const).map((v) => (
            <button key={v} onClick={() => setVue(v)} className={`rounded-full py-2.5 text-[15px] font-bold ${vue === v ? 'bg-white shadow' : ''}`}>
              {v === 'master' ? 'Master planning' : 'Planning techs'}
            </button>
          ))}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {TYPES.map((t) => {
            const actif = types.includes(t.cle);
            const n = items.filter((i) => i.type === t.cle).length;
            return (
              <button key={t.cle} onClick={() => basculer(t.cle)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[14px] font-bold ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`} style={actif ? { backgroundColor: CYAN } : undefined}>
                {t.emoji} {t.libelle}
                <span className={`rounded-full px-2 text-[12px] ${actif ? 'bg-white/25' : 'bg-[#eceef1]'}`}>{n}</span>
              </button>
            );
          })}
          <button onClick={charger} aria-label="Actualiser" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-[1.5px] ring-[#dfe3e8]">
            <RefreshCw size={16} color={CYAN} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {erreur && <Alerte>{erreur}</Alerte>}
        {avertissements.length > 0 && <Alerte>{avertissements.join(' ; ')}.</Alerte>}
        {loading && !items.length && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement du planning...</p>
          </Carte>
        )}
        {!loading && !erreur && !visibles.length && <Carte className="text-center"><p className="text-[15px] font-semibold">Rien de prévu.</p></Carte>}

        {vue === 'master' && blocJours(visibles, true)}

        {vue === 'techs' && (
          <>
            {techniciens.map((t) => {
              const siens = visibles.filter((i) => i.techniciens.some((x) => x.id === t.id));
              return (
                <Carte key={t.id} className="space-y-3">
                  <Repere>{t.nom} · {siens.length}</Repere>
                  {blocJours(siens, false)}
                </Carte>
              );
            })}
            {nonAffectes.length > 0 && (
              <Carte className="space-y-3">
                <Repere>Non affecté · {nonAffectes.length}</Repere>
                {blocJours(nonAffectes, false)}
              </Carte>
            )}
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
