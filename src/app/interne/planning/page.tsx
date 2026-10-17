"use client";

// Planning (lot B des écrans manquants, 17/10/2026). LECTURE SEULE.
// Deux vues, comme la carte des menus : Master planning (tout, par jour) et Planning techs (par installateur, puis par
// jour). Filtres Poses, Dépannages, Visites de maintenance. En tête : en retard (date passée, pas terminé), puis les
// jours à venir, puis « Sans date » (à planifier). Chaque ligne ouvre la fiche (affaire pour une pose, générique sinon).
// 17/10/2026, 18 h 22 (Planning réceptions et Planning logistique de la liste du 11/10) : filtre 🚚 Livraisons (commandes
// matériel et achats fournisseurs par date de livraison), absent du Planning techs (pas de technicien).
// ?types=livraison (ou depannage, visite, pose, séparés par des virgules) ouvre le planning sur ces filtres.
import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, MapPin, RefreshCw, User } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte } from '@/components/charte/Appli';
import { CYAN, GRIS, ORANGE } from '@/components/charte/couleurs';

type Type = 'pose' | 'visite' | 'depannage' | 'livraison';
type Item = { id: string; type: Type; nom: string; statut: string; couleurStatut: string; jour: string; heure: string; techniciens: { id: string; nom: string }[]; adresse: string; lien: string; origine?: string };

const TYPES: { cle: Type; libelle: string; emoji: string }[] = [
  { cle: 'pose', libelle: 'Poses', emoji: '🏗️' },
  { cle: 'depannage', libelle: 'Dépannages', emoji: '🚨' },
  { cle: 'visite', libelle: 'Visites', emoji: '🔧' },
  { cle: 'livraison', libelle: 'Livraisons', emoji: '🚚' },
];
const TOUS: Type[] = ['pose', 'depannage', 'visite', 'livraison'];
const emojiDe = (t: Type) => TYPES.find((x) => x.cle === t)?.emoji || '';

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
  }, []);

  const visibles = items.filter((i) => types.includes(i.type));
  const basculer = (t: Type) => setTypes((l) => (l.includes(t) ? (l.length > 1 ? l.filter((x) => x !== t) : l) : [...l, t]));

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

  // Planning techs : un bloc par installateur, plus « Non affecté » ; les livraisons n'ont pas de technicien
  const pourTechs = visibles.filter((i) => i.type !== 'livraison');
  const techniciens = pourTechs.reduce((acc: { id: string; nom: string }[], i) => {
    for (const t of i.techniciens) if (!acc.some((x) => x.id === t.id)) acc.push(t);
    return acc;
  }, []).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const nonAffectes = pourTechs.filter((i) => !i.techniciens.length);

  const quand = (i: Item) => {
    if (i.type === 'livraison') return i.jour ? `${i.origine || 'Livraison'} · livraison prévue` : `${i.origine || 'Livraison'} · date de livraison à renseigner`;
    return i.heure || (i.jour ? 'heure à caler' : 'à planifier');
  };

  const ligne = (i: Item, avecTech: boolean) => (
    <a key={`${i.type}-${i.id}`} href={i.lien} className="block rounded-[16px] bg-white p-4 ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-[0.98]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-slate-500">
            {emojiDe(i.type)} {quand(i)} · <span style={{ color: i.couleurStatut || undefined }}>{i.statut}</span>
          </p>
          <p className="mt-0.5 text-[16px] font-bold leading-tight">{i.nom}</p>
          {i.adresse && <p className="mt-1 flex items-center gap-1 truncate text-[13px]"><MapPin size={13} className="shrink-0" color={CYAN} /> {i.adresse}</p>}
          {avecTech && i.type !== 'livraison' && (
            <p className="mt-1 flex items-center gap-1 text-[13px] font-semibold" style={{ color: i.techniciens.length ? undefined : ORANGE }}>
              <User size={13} className="shrink-0" color={i.techniciens.length ? CYAN : ORANGE} /> {i.techniciens.length ? i.techniciens.map((t) => t.nom).join(', ') : 'Technicien à affecter'}
            </p>
          )}
        </div>
        <ChevronRight size={20} className="shrink-0" color={CYAN} />
      </div>
    </a>
  );

  const blocJours = (liste: Item[], avecTech: boolean) =>
    groupes(liste).map((g) => (
      <div key={g.titre} className="space-y-2">
        <p className="px-1 text-[13px] font-extrabold uppercase tracking-[0.1em]" style={{ color: g.urgent ? ORANGE : undefined }}>{g.titre} · {g.items.length}</p>
        {g.items.map((i) => ligne(i, avecTech))}
      </div>
    ));

  const boutonRetour = (
    <a href="/interne/espace" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
      <ArrowLeft size={16} /> Mon espace
    </a>
  );

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Chantiers, SAV, maintenance et livraisons" titre="Planning" action={boutonRetour} />
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
        {vue === 'techs' && types.includes('livraison') && <p className="px-1 text-[13px]">Les livraisons n’ont pas de technicien : elles sont dans le Master planning.</p>}
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
              const siens = pourTechs.filter((i) => i.techniciens.some((x) => x.id === t.id));
              return (
                <div key={t.id} className="space-y-3 rounded-[20px] p-4" style={{ backgroundColor: GRIS }}>
                  <Repere>{t.nom} · {siens.length}</Repere>
                  {blocJours(siens, false)}
                </div>
              );
            })}
            {nonAffectes.length > 0 && (
              <div className="space-y-3 rounded-[20px] p-4" style={{ backgroundColor: GRIS }}>
                <Repere>Non affecté · {nonAffectes.length}</Repere>
                {blocJours(nonAffectes, false)}
              </div>
            )}
          </>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
