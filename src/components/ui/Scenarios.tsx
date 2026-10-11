"use client";

// Écran Scénarios du relevé (lot 3.3, 10/10/2026), point 12 règle 2 des Décisions ERP.
// - mode "liste" : la fiche a déjà des scénarios, on les affiche et on peut en ajouter ;
// - mode "proposition" : fiche sans scénario, petite carte pour en créer au-dessus du relevé direct.
// Les scénarios se créent avec du réseau, avant de descendre au sous-sol.
// 11/10/2026 : scénarios triés par nom (A, B, C... et 2 avant 10), accord « relevés reçus ».
// 11/10/2026 (décision Matthieu) : scénario ajouté sur une fiche qui n'est plus « à visiter » :
// la fiche garde son statut (pas de retour en arrière), on affiche simplement un avertissement.
import { useState } from 'react';
import { CheckCircle, ChevronRight, ClipboardList, GitBranch, Info, Plus } from 'lucide-react';
import { Carte, TitreCarte, Alerte, BoutonPrincipal, Repere, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, ORANGE, GRIS, LABEL, CYAN_PALE } from '@/components/charte/couleurs';
import { estAVisiter, trierScenarios, type ScenarioResume } from '@/lib/scenarios';

export type { ScenarioResume };

// « 📝 devis à faire » -> « devis à faire »
const libelleStatut = (statut: string) => statut.replace(/^[^\p{L}]+/u, '').trim() || statut;

function Avertissement({ statutFiche }: { statutFiche: string }) {
  return (
    <div className="flex gap-3 rounded-[16px] p-4 text-[14px] leading-relaxed" style={{ backgroundColor: CYAN_PALE }}>
      <Info size={20} className="mt-0.5 shrink-0" color={LABEL} />
      <p>
        La fiche est déjà en <strong>« {libelleStatut(statutFiche)} »</strong> et y reste. Un nouveau scénario s'ajoute au chiffrage en cours : son relevé arrive dans sa propre sous-tâche.
      </p>
    </div>
  );
}

export function Scenarios({ affaireId, scenarios, mode, statutFiche = '' }: { affaireId: string; scenarios: ScenarioResume[]; mode: 'liste' | 'proposition'; statutFiche?: string }) {
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

  const tries = trierScenarios(scenarios);
  const recus = tries.filter((s) => !estAVisiter(s.statut)).length;
  const pluriel = tries.length > 1 ? 's' : '';
  const ficheAvancee = !!statutFiche && !estAVisiter(statutFiche);

  return (
    <div className="space-y-4">
      {mode === 'liste' && (
        <>
          <Repere>Scénarios de raccordement</Repere>
          <p className="px-1 text-[14px] leading-relaxed">
            {recus}/{tries.length} relevé{pluriel} reçu{pluriel}.
            {!ficheAvancee && ' La fiche passe en « devis à faire » quand tous les scénarios sont reçus.'}
          </p>
          {ficheAvancee && <Avertissement statutFiche={statutFiche} />}
          {tries.map((s) => {
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
            {mode === 'proposition' && ficheAvancee && <Avertissement statutFiche={statutFiche} />}
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
