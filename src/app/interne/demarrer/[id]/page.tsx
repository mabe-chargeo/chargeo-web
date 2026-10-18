"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Play, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte } from '@/components/charte/Appli';
import { CYAN, ORANGE } from '@/components/charte/couleurs';

type Donnees = { id: string; nom: string; statut: string; ecritureAutorisee: boolean };
const normal = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^[^a-z0-9]+/i, '').trim();

export default function DemarrerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id || '');
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [message, setMessage] = useState('');
  const [chargement, setChargement] = useState(true);
  const [action, setAction] = useState(false);
  const charger = async () => {
    setChargement(true);
    const r = await fetch(`/api/interne/demarrer?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setMessage(d?.error || 'Lecture impossible'); else setDonnees(d);
    setChargement(false);
  };
  useEffect(() => { if (id) charger(); }, [id]);
  const demarrer = async () => {
    setAction(true); setMessage('');
    const r = await fetch('/api/interne/demarrer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setMessage(d?.error || 'Démarrage impossible'); else { setMessage('Chantier démarré.'); await charger(); }
    setAction(false);
  };
  const statut = normal(donnees?.statut || '');
  const peutDemarrer = statut === 'planifie' || statut === 'preparation';
  return (
    <PageAppli>
      <EnTeteAppli surtitre="Réception" titre="Démarrer le chantier" action={<a href="/interne/interventions" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white"><ArrowLeft size={16} /> Interventions</a>} />
      <ContenuAppli className="space-y-4">
        {chargement && <Carte className="p-8 text-center"><RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} /></Carte>}
        {message && <Alerte>{message}</Alerte>}
        {donnees && <Carte className="space-y-4">
          <p className="text-[18px] font-bold">{donnees.nom}</p>
          <p className="text-[15px]">Statut actuel : <strong>{donnees.statut}</strong></p>
          {!donnees.ecritureAutorisee && <Alerte>En preview, seuls les chantiers « Test » sont modifiables.</Alerte>}
          {peutDemarrer && donnees.ecritureAutorisee && <button disabled={action} onClick={demarrer} className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[17px] font-bold text-white disabled:opacity-50" style={{ backgroundColor: ORANGE }}><Play size={20} /> {action ? 'Démarrage…' : '🚧 Démarrer le chantier'}</button>}
          {!peutDemarrer && <p className="flex items-center gap-2 font-semibold" style={{ color: '#16a34a' }}><CheckCircle2 size={20} /> Ce chantier est déjà en cours ou terminé.</p>}
          {statut === 'encours' && <button onClick={() => router.push('/interne/reception')} className="w-full rounded-full px-6 py-4 text-[16px] font-bold text-white" style={{ backgroundColor: CYAN }}>Ouvrir la réception</button>}
        </Carte>}
      </ContenuAppli>
    </PageAppli>
  );
}
