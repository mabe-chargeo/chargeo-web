"use client";

// Écran Scénarios du relevé (lot 3.3, 10/10/2026), point 12 règle 2 des Décisions ERP.
// - mode "liste" : la fiche a déjà des scénarios, on les affiche et on peut en ajouter ;
// - mode "proposition" : fiche sans scénario, petite carte pour en créer au-dessus du relevé direct.
// Les scénarios se créent avec du réseau, avant de descendre au sous-sol.
import { useState } from 'react';
import { CheckCircle, ChevronRight, ClipboardList, GitBranch, Plus } from 'lucide-react';
import { Carte, TitreCarte, Alerte, BoutonPrincipal, Repere, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, ORANGE, GRIS, LABEL } from '@/components/charte/couleurs';

export type ScenarioResume = { id: string; nom: string; statut: string };

const estAVisiter = (statut: string) => statut.toUpperCase().includes('VISITER');

export function Scenarios({ affaireId, scenarios, mode }: { affaireId: string; scenarios: ScenarioResume[]; mode: 'liste' | 'proposition' }) {
  const [ouvert, setOuvert] = useState(mode === 'liste');
  const [nom, setNom] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  const ajouter = async () => {
    if (!nom.trim()) {
      setErreur('Donne un nom au scénario (ex : services généraux).');
      return;
    }
    setEnvoi(true);
    setErreur('');
    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affaireId, nom: nom.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d?.id) {
        setErreur(d?.error ? `${d.error}.` : "Le scénario n'a pas été créé. Vérifie le réseau et réessaie.");
        setEnvoi(false);
        return;
      }
      // Rechargement complet : la page à jour est aussi gardée pour le hors-ligne
      window.location.reload();
    } catch {
      setErreur('Pas de réseau : crée les scénarios avant de descendre au sous-sol.');
      setEnvoi(false);
    }
  };

  const recus = scenarios.filter((s) => !estAVisiter(s.statut)).length;

  return (
    <div className="space-y-4">
      {mode === 'liste' && (
        <>
          <Repere>Scénarios de raccordement</Repere>
          <p className="px-1 text-[14px] leading-relaxed">
            {recus}/{scenarios.length} relevé{scenarios.length > 1 ? 's' : ''} reçu{recus > 1 ? 's' : ''}. La fiche passe en « devis à faire » quand tous les scénarios sont reçus.
          </p>
          {scenarios.map((s) => {
            const fait = !estAVisiter(s.statut);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { window.location.href = `/interne/metre/${s.id}`; }}
                className="flex w-full items-center gap-4 rounded-[20px] p-5 text-left transition-transform active:scale-[0.98]"
                style={{ backgroundColor: GRIS }}
              >
                <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: fait ? CYAN : ORANGE }}>
                  {fait ? <CheckCircle size={22} color="#ffffff" strokeWidth={1.8} /> : <ClipboardList size={22} color="#ffffff" strokeWidth={1.8} />}
                </div>
                <div className="min-w-0 grow">
                  <p className="text-[17px] font-bold leading-tight">{s.nom}</p>
                  <p className="mt-1.5 text-[13px]">{fait ? 'Relevé reçu' : 'Relevé à faire'}</p>
                </div>
                <ChevronRight size={22} className="shrink-0" color={fait ? CYAN : ORANGE} />
              </button>
            );
          })}
          <div className="h-1" />
        </>
      )}

      <Carte accent={mode === 'proposition'} className="space-y-4">
        <TitreCarte icon={GitBranch}>{mode === 'liste' ? 'Ajouter un scénario' : 'Plusieurs façons de raccorder ?'}</TitreCarte>
        {!ouvert ? (
          <>
            <p className="text-[14px] leading-relaxed">
              Exemple : services généraux ou compteur de l'appartement. Chaque scénario a son propre relevé. Pour un simple choix de matériel, coche plutôt « Matériels à chiffrer » dans le relevé.
            </p>
            <button
              type="button"
              onClick={() => setOuvert(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-semibold ring-[1.5px] ring-[#dfe3e8]"
              style={{ color: LABEL }}
            >
              <Plus size={18} /> Créer des scénarios
            </button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className={ETIQUETTE} htmlFor={`nom-scenario-${affaireId}`}>Nom du scénario</label>
              <input
                id={`nom-scenario-${affaireId}`}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                maxLength={80}
                placeholder="Ex : services généraux"
                className={CHAMP}
              />
            </div>
            <BoutonPrincipal type="button" onClick={ajouter} disabled={envoi} inactif={envoi}>
              <Plus size={20} /> {envoi ? 'Création...' : 'Ajouter le scénario'}
            </BoutonPrincipal>
            {mode === 'proposition' && (
              <p className="text-[13px] leading-relaxed">
                Le relevé de cette page sera alors remplacé par un relevé par scénario. Crée-les avec du réseau, avant de descendre.
              </p>
            )}
          </>
        )}
        {erreur && <Alerte>{erreur}</Alerte>}
      </Carte>
    </div>
  );
}
