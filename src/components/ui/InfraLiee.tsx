"use client";

// Étape 8 du plan du 15/10/2026 (PR #51) : sur la fiche d'un nouveau client, si une infra CHARGéO (projet COP) existe à
// la même adresse, l'application propose de rattacher ce client comme résident (segment RIC, lien vers l'infra, Tarif
// type recopié en scénario). Rien n'est rattaché sans clic. Données et action : /api/interne/infra.
import { useEffect, useState } from 'react';
import { Building2, Link2 } from 'lucide-react';
import { Carte, TitreCarte, Alerte } from '@/components/charte/Appli';
import { LABEL } from '@/components/charte/couleurs';

type Candidat = { id: string; nom: string; liste: string; memeAdresse: boolean; distance: number | null; tarifs: { id: string; nom: string }[] };
type Donnees = { rattache: { id: string; nom: string } | null; candidats: Candidat[]; droits: { scenarios: boolean } };

const libelleTarif = (nom: string) => nom.replace(/^Tarif type · /, '').replace(/^\s*Sc[ée]nario\s+[A-Za-z0-9]+\s*:\s*/, '').trim() || nom;

export function InfraLiee({ affaireId }: { affaireId: string }) {
  const [d, setD] = useState<Donnees | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/interne/infra?affaireId=${encodeURIComponent(affaireId)}`, { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j?.success) setD(j as Donnees);
      } catch { /* hors ligne : carte masquée */ }
    })();
  }, [affaireId]);

  if (!d) return null;

  if (d.rattache) {
    return (
      <Carte className="space-y-2">
        <TitreCarte icon={Link2}>🔗 Infrastructure liée</TitreCarte>
        <p className="text-[14px] leading-relaxed">Résident rattaché à <strong>{d.rattache.nom}</strong> (segment RIC).</p>
      </Carte>
    );
  }
  if (!d.candidats.length) return null;

  const rattacher = async (infraId: string, tarifId: string | null) => {
    setOccupe(true);
    setErreur('');
    try {
      const res = await fetch('/api/interne/infra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affaireId, infraId, tarifId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        setErreur(j?.error ? `${j.error}.` : "Le rattachement n'a pas abouti.");
        setOccupe(false);
        return;
      }
      if (j.scenarioId) window.location.href = `/interne/metre/${j.scenarioId}`;
      else window.location.reload();
    } catch {
      setErreur("Pas de réseau : rien n'a été rattaché.");
      setOccupe(false);
    }
  };

  const bouton = (libelle: string, action: () => void) => (
    <button
      type="button"
      onClick={action}
      disabled={occupe}
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-left text-[13px] font-semibold ring-[1.5px] ring-[#dfe3e8] disabled:opacity-50"
      style={{ color: LABEL }}
    >
      {libelle}
    </button>
  );

  return (
    <Carte accent className="space-y-4">
      <TitreCarte icon={Building2}>🏢 Infra CHARGéO à cette adresse</TitreCarte>
      <p className="text-[14px] leading-relaxed">
        Si ce client est résident de cette copropriété, rattache-le : segment RIC, lien vers l&apos;infra et éléments du Tarif type recopiés dans un nouveau scénario.
      </p>
      {d.candidats.map((c) => (
        <div key={c.id} className="space-y-2 rounded-[18px] bg-white p-4 ring-[1.5px] ring-[#eceef1]">
          <p className="text-[16px] font-bold leading-tight">{c.nom}</p>
          <p className="text-[13px]">{c.liste} · {c.memeAdresse ? 'même adresse' : `à ${c.distance} m`}{c.tarifs.length ? '' : ' · pas de Tarif type'}</p>
          {d.droits.scenarios ? (
            <div className="flex flex-wrap gap-2">
              {c.tarifs.map((t) => (
                <span key={t.id}>{bouton(`Rattacher et recopier « ${libelleTarif(t.nom)} »`, () => rattacher(c.id, t.id))}</span>
              ))}
              {bouton(c.tarifs.length ? 'Rattacher sans Tarif type' : 'Rattacher en RIC', () => rattacher(c.id, null))}
            </div>
          ) : (
            <p className="text-[13px]">Rattachement réservé au commercial et à la direction.</p>
          )}
        </div>
      ))}
      {occupe && <p className="px-1 text-[14px] font-semibold" style={{ color: LABEL }}>Rattachement en cours…</p>}
      {erreur && <Alerte>{erreur}</Alerte>}
    </Carte>
  );
}
