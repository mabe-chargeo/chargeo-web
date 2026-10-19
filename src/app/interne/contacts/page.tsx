"use client";

// Annuaire de l'espace Commercial (validé par Matthieu le 17/10/2026), partagé avec le back-office.
// Recherche par nom ou société, filtre par rôle (comme la vue ClickUp « Annuaire des Contacts » regroupée par rôle), et
// pour chaque contact les mêmes boutons que le bloc 📇 Contact : Appeler, Google Voice, SMS, Gmail.
// 17/10, 13 h 13 (Matthieu) : tous les contacts, clients compris. Les clients (Qualification, Planning, Parc) et les
// prospects ont leur pastille de rôle et leur nom ouvre la fiche affaire unique.
// 19/10/2026 (2e lot de cohérence) : cartes et boutons sur les briques communes (src/components/charte/Appli.tsx),
// liens ClickUp réservés à la direction et au back-office, bouton Retour de l'en-tête commun.
import { useEffect, useState } from 'react';
import { ChevronRight, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, CHAMP } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';
import { useRoleAppli } from '@/components/charte/roleAppli';
import { BoutonsContact } from '@/components/ui/BlocContact';

type Contact = { id: string; nom: string; role: string; societe: string; tel: string; email: string; url: string; fiche: string };

const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// Clients et prospects d'abord dans les pastilles, puis les rôles de la liste Contacts
const ORDRE = ['Client', 'Prospect'];

export default function ContactsPage() {
  const { role: roleAppli } = useRoleAppli();
  const voitClickUp = roleAppli === 'direction' || roleAppli === 'backOffice';
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [avertissements, setAvertissements] = useState<string[]>([]);
  const [moi, setMoi] = useState('');
  const [recherche, setRecherche] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch('/api/interne/contacts', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) setErreur(data?.error || `Lecture impossible (${res.status})`);
      else {
        setContacts(data.contacts || []);
        setAvertissements(Array.isArray(data.avertissements) ? data.avertissements : []);
        setMoi(String(data.moi || ''));
      }
    } catch {
      setErreur('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { charger(); }, []);

  const roles = contacts.map((c) => c.role).filter((r, i, t) => !!r && t.indexOf(r) === i).sort((a, b) => {
    const ia = ORDRE.indexOf(a);
    const ib = ORDRE.indexOf(b);
    if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    return a.localeCompare(b, 'fr');
  });
  const q = normal(recherche.trim());
  const visibles = contacts.filter((c) => (!role || c.role === role) && (!q || normal(`${c.nom} ${c.societe} ${c.tel} ${c.email}`).includes(q)));

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Annuaire" titre="Contacts" retour={{ href: "/interne/espace", libelle: "Mon espace" }} />
      <ContenuAppli className="space-y-4">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" color={CYAN} />
          <input className={`${CHAMP} pl-11`} placeholder="Nom, société, téléphone ou email" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {['', ...roles].map((r) => {
            const actif = r === role;
            const n = r ? contacts.filter((c) => c.role === r).length : contacts.length;
            return (
              <button
                key={r || 'tous'}
                onClick={() => setRole(r)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[14px] font-bold transition-transform active:scale-95 ${actif ? 'text-white' : 'bg-white ring-[1.5px] ring-[#dfe3e8]'}`}
                style={actif ? { backgroundColor: CYAN } : undefined}
              >
                {r ? (r === 'Client' ? 'Clients' : r === 'Prospect' ? 'Prospects' : r) : 'Tous'}
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
        {loading && !contacts.length && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement des contacts...</p>
          </Carte>
        )}
        {!loading && !erreur && !visibles.length && (
          <Carte className="text-center"><p className="text-[15px] font-semibold">Aucun contact trouvé.</p></Carte>
        )}

        {visibles.map((c) => (
          <Carte key={c.id} className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {(c.role || c.societe) && <p className="text-[12px] font-bold text-slate-500">{[c.role, c.societe].filter(Boolean).join(' · ')}</p>}
                {c.fiche ? (
                  <a href={c.fiche} className="mt-0.5 flex items-center gap-1 text-[17px] font-bold leading-tight">
                    {c.nom} <ChevronRight size={18} className="shrink-0" color={CYAN} />
                  </a>
                ) : (
                  <p className="mt-0.5 text-[17px] font-bold leading-tight">{c.nom}</p>
                )}
                {c.tel && <p className="mt-1 text-[14px]">{c.tel}</p>}
              </div>
              {voitClickUp && <a href={c.url} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir dans ClickUp" className="shrink-0"><ExternalLink size={18} color={CYAN} /></a>}
            </div>
            <BoutonsContact tel={c.tel} email={c.email} moi={moi} />
          </Carte>
        ))}
      </ContenuAppli>
    </PageAppli>
  );
}
