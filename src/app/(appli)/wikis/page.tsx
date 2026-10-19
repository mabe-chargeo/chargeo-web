"use client";

// Wikis (17/10/2026, 19 h 25) : le guide de l'entreprise (Portail de l'ERP) et le mode d'emploi de chaque liste,
// lisibles dans l'application, selon le rôle. Chaque carte ouvre /wikis/<clé>.
// 22 h 20 : ouvert depuis l'onglet Consulter, le retour y ramène.
import { useEffect, useState } from 'react';
import { BookOpen, ChevronRight, RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Carte, Alerte } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';
import { adresses } from '@/lib/adresses';

type Index = { groupes: string[]; wikis: { cle: string; titre: string; groupe: string }[] };

export default function WikisPage() {
  const [index, setIndex] = useState<Index | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/interne/wiki', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
        else setIndex(data as Index);
      } catch {
        setErreur('Impossible de joindre le serveur.');
      }
    })();
  }, []);

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Modes d’emploi" titre="Wikis" retour={{ href: adresses.consulter, libelle: 'Consulter' }} />
      <ContenuAppli className="space-y-3">
        {erreur && <Alerte>{erreur}</Alerte>}
        {!index && !erreur && (
          <Carte className="p-8 text-center"><RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} /></Carte>
        )}
        {index?.groupes.map((g) => (
          <div key={g} className="space-y-2 pb-3">
            <div className="pt-1"><Repere>{g}</Repere></div>
            {index.wikis.filter((w) => w.groupe === g).map((w) => (
              <a key={w.cle} href={adresses.wiki(w.cle)} className="flex items-center gap-3 rounded-[16px] bg-white p-4 ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-[0.98]">
                <BookOpen size={18} className="shrink-0" color={CYAN} />
                <span className="min-w-0 grow text-[16px] font-bold leading-tight">{w.titre}</span>
                <ChevronRight size={20} className="shrink-0" color={CYAN} />
              </a>
            ))}
          </div>
        ))}
      </ContenuAppli>
    </PageAppli>
  );
}
