"use client";

// Un wiki ClickUp lu dans l'application (17/10/2026, 19 h 25) : la page du Doc « 📖 Wiki - <liste> » (ou du Portail de
// l'ERP), affichée en Markdown, sans ouvrir ClickUp. Retour : l'écran d'où l'on vient, sinon l'index des wikis.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';
import Markdown from '@/components/ui/Markdown';

type Page = { cle: string; titre: string; groupe: string; nom: string; contenu: string };

export default function WikiPage() {
  const params = useParams<{ cle: string }>();
  const cle = String(params?.cle || '');
  const [page, setPage] = useState<Page | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!cle) return;
    (async () => {
      try {
        const res = await fetch(`/api/interne/wiki?cle=${encodeURIComponent(cle)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
        else setPage(data as Page);
      } catch {
        setErreur('Impossible de joindre le serveur.');
      }
    })();
  }, [cle]);

  return (
    <PageAppli>
      <EnTeteAppli surtitre={page ? `📖 Wiki · ${page.groupe}` : '📖 Wiki'} titre={page?.titre || 'Wiki'} retour={{ href: '/interne/wiki', libelle: 'Wikis' }} />
      <ContenuAppli className="space-y-4">
        {erreur && <Alerte>{erreur}</Alerte>}
        {!page && !erreur && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement du wiki...</p>
          </Carte>
        )}
        {page && (page.contenu.trim() ? <Markdown texte={page.contenu} /> : <Carte><p className="text-[15px]">Cette page est vide pour l’instant.</p></Carte>)}
        {page && <a href="/interne/wiki" className="block pt-4 text-center text-[15px] font-semibold" style={{ color: CYAN }}>Tous les wikis</a>}
      </ContenuAppli>
    </PageAppli>
  );
}
