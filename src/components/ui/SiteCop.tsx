"use client";

// Carte « Le site » du relevé d'un scénario COP (Phase 8, étape 7, PR #59).
// Mathieu, 02/11/2026 à 21 h 29, sur la carte « Le projet » de la fiche affaire : « ce n'est pas sa place ». Choix du
// 03/11 à 6 h 18 : les places de parking (réserve IRVE, plafond ADVENIR infra) et la date de dépôt du permis (assiette
// ADVENIR infra) se relèvent ici, sur le scénario COP, le seul qui s'en sert. Lu et écrit par /api/interne/elements
// (site=1, action « site »).
// 03/11, passe 2 de la recette (écarts 44, 57, 68) : ce sont des données du site, gardées sur la fiche. Un autre scénario
// COP du même site les affiche déjà remplies, rien n'est redemandé ; la carte n'apparaît que sur un scénario dont le
// segment est COP (jamais en RIC, ni sur un scénario sans segment).
// La date du permis affiche sa conséquence ADVENIR sous le champ (règle validée, reprise de l'ancienne carte).
import { useEffect, useState } from 'react';
import { Building2, Check, RefreshCw } from 'lucide-react';
import { Carte, TitreCarte, Alerte, BoutonPrincipal, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';

type Site = { segment: string; places: number | null; permis: string; manquants: string[] };
const URL = '/api/interne/elements';

// Assiette ADVENIR infrastructure selon la date de dépôt du permis (règle validée)
function aideAdvenir(d: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return '';
  const [j, m, a] = [d.slice(8, 10), d.slice(5, 7), d.slice(0, 4)];
  const date = `${j}/${m}/${a}`;
  if (d < '2017-01-01') return `Permis du ${date} : avant 2017, assiette ADVENIR complète.`;
  if (d <= '2021-03-10') return `Permis du ${date} : entre 2017 et le 10/03/2021, assiette ADVENIR réduite.`;
  return `Permis du ${date} : après le 10/03/2021, pas d’aide ADVENIR infrastructure.`;
}

// segmentInitial : gardé pour la compatibilité de l'appel, la carte suit le segment du scénario lu sur le serveur
export function SiteCop({ scenarioId }: { scenarioId: string; segmentInitial?: string }) {
  const [s, setS] = useState<Site | null>(null);
  const [places, setPlaces] = useState('');
  const [permis, setPermis] = useState('');
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const remplir = (j: Site) => {
    setS(j);
    setPlaces(j.places === null || j.places === undefined ? '' : String(j.places));
    setPermis(j.permis || '');
  };
  const lire = async () => {
    try {
      const res = await fetch(`${URL}?scenarioId=${encodeURIComponent(scenarioId)}&site=1`, { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.success) remplir(j as Site);
    } catch {
      // hors ligne : la carte reste masquée
    }
  };
  useEffect(() => { lire(); }, [scenarioId]);
  useEffect(() => {
    const auRetour = () => { if (document.visibilityState === 'visible') lire(); };
    document.addEventListener('visibilitychange', auRetour);
    return () => document.removeEventListener('visibilitychange', auRetour);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  if (!s || s.segment !== 'COP') return null;

  const change = places !== (s.places === null ? '' : String(s.places)) || permis !== (s.permis || '');
  const enregistrer = async () => {
    setEnvoi(true);
    setErreur('');
    setMessage('');
    try {
      const res = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'site', scenarioId, places: places === '' ? null : Number(places), permis }),
      });
      const j = await res.json().catch(() => ({}));
      if (j?.segment !== undefined) remplir(j as Site);
      if (!res.ok || !j?.success) setErreur(j?.error || (j?.rates?.length ? `Non enregistré : ${j.rates.join(', ')}.` : 'Rien n’a été enregistré.'));
      else setMessage('Site enregistré sur la fiche (valable pour tous les scénarios).');
    } catch {
      setErreur('Pas de réseau : rien n’a été modifié.');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Carte className="space-y-4">
      <TitreCarte icon={Building2}>Le site</TitreCarte>
      <p className="text-[13px] leading-relaxed">Données du site, communes à tous les scénarios de la fiche.</p>
      <div className="space-y-2">
        <label className={ETIQUETTE} htmlFor={`places-${scenarioId}`}>Nombre de places de parking</label>
        <input id={`places-${scenarioId}`} type="number" inputMode="numeric" min={0} className={CHAMP} value={places} onChange={(ev) => setPlaces(ev.target.value)} placeholder="Ex : 30" />
        <p className="ml-1 text-[13px]">Sert à la réserve IRVE et à l’aide ADVENIR.</p>
      </div>
      <div className="space-y-2">
        <label className={ETIQUETTE} htmlFor={`permis-${scenarioId}`}>Date de dépôt du permis (ADVENIR)</label>
        <input id={`permis-${scenarioId}`} type="date" className={CHAMP} value={permis} onChange={(ev) => setPermis(ev.target.value)} />
        {permis && <p className="ml-1 text-[13px] font-semibold" style={{ color: CYAN }}>{aideAdvenir(permis)}</p>}
      </div>
      {s.manquants.length > 0 && <p className="text-[13px]">Champ absent de cette liste : {s.manquants.join(', ')}.</p>}
      {erreur && <Alerte>{erreur}</Alerte>}
      {message && <p className="flex items-center gap-1.5 px-1 text-[14px] font-semibold" style={{ color: '#16a34a' }}><Check size={16} /> {message}</p>}
      <BoutonPrincipal type="button" onClick={enregistrer} disabled={envoi || !change} inactif={envoi || !change}>
        {envoi ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />} {envoi ? 'Enregistrement…' : 'Enregistrer le site'}
      </BoutonPrincipal>
    </Carte>
  );
}
