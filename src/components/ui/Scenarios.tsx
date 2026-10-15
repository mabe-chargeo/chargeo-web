"use client";

// Écran des sous-relevés d'une fiche (lot 3.3 et point 21) :
// - Scenarios (mode "liste") : scénarios de raccordement OU emplacements des bornes (ancien modèle), avec ajout ;
// - Scenarios (mode "proposition") : fiche sans sous-relevé, création directe d'un scénario.
// Étape 4 (15/10/2026, PR #51) : plus de bouton « Plusieurs bornes ». Plusieurs bornes = plusieurs branches d'un même
// scénario (« Dupliquer la branche »). Les fiches à emplacements existantes restent affichées jusqu'à leur conversion.
// Les sous-relevés se créent avec du réseau, avant de descendre au sous-sol.
// Scénarios triés A, B, C ; emplacements 1, 2, 3. Pas de mélange sur une fiche (décision du 11/10/2026).
// Fiche qui n'est plus « à visiter » : elle garde son statut, un avertissement est affiché (décision du 11/10/2026).
import { useState } from 'react';
import { CheckCircle, ChevronRight, ClipboardList, GitBranch, Info, Plus, Zap } from 'lucide-react';
import { Carte, TitreCarte, Alerte, BoutonPrincipal, Repere, CHAMP, ETIQUETTE } from '@/components/charte/Appli';
import { CYAN, ORANGE, GRIS, LABEL, CYAN_PALE } from '@/components/charte/couleurs';
import { estAVisiter, trierScenarios, type ScenarioResume, type TypeSousReleve } from '@/lib/scenarios';

export type { ScenarioResume };

const TEXTES: Record<TypeSousReleve, {
  repere: string; ajouter: string; placeholder: string; bouton: string; vide: string; regle: string; reseau: string; echec: string;
}> = {
  scenario: {
    repere: 'Scénarios de raccordement',
    ajouter: 'Ajouter un scénario',
    placeholder: 'Ex : services généraux',
    bouton: 'Créer le scénario',
    vide: 'Donne un nom au scénario (ex : services généraux).',
    regle: 'La fiche passe en « devis à faire » quand tous les scénarios sont prêts à chiffrer.',
    reseau: 'Pas de réseau : crée les scénarios avant de descendre au sous-sol.',
    echec: "Le scénario n'a pas été créé. Vérifie le réseau et réessaie.",
  },
  emplacement: {
    repere: 'Emplacements des bornes',
    ajouter: 'Ajouter un emplacement',
    placeholder: 'Ex : auvent borne 1',
    bouton: "Ajouter l'emplacement",
    vide: "Donne un nom à l'emplacement (ex : auvent borne 1).",
    regle: 'La fiche passe en « devis à faire » quand le relevé du site et tous les emplacements sont reçus.',
    reseau: 'Pas de réseau : crée les emplacements avant de descendre au sous-sol.',
    echec: "L'emplacement n'a pas été créé. Vérifie le réseau et réessaie.",
  },
};

// « 📝 devis à faire » -> « devis à faire »
const libelleStatut = (statut: string) => statut.replace(/^[^\p{L}]+/u, '').trim() || statut;

function Avertissement({ statutFiche, type }: { statutFiche: string; type: TypeSousReleve }) {
  return (
    <div className="flex gap-3 rounded-[16px] p-4 text-[14px] leading-relaxed" style={{ backgroundColor: CYAN_PALE }}>
      <Info size={20} className="mt-0.5 shrink-0" color={LABEL} />
      <p>
        La fiche est déjà en <strong>« {libelleStatut(statutFiche)} »</strong> et y reste. Un nouveau {type === 'emplacement' ? 'emplacement' : 'scénario'} s'ajoute au chiffrage en cours : son relevé arrive dans sa propre sous-tâche.
      </p>
    </div>
  );
}

// Saisie du nom et création (rechargement complet ensuite : la page à jour est aussi gardée pour le hors-ligne)
function FormulaireAjout({ affaireId, type, versScenario = false }: { affaireId: string; type: TypeSousReleve; versScenario?: boolean }) {
  const t = TEXTES[type];
  const [nom, setNom] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  const ajouter = async () => {
    if (!nom.trim()) { setErreur(t.vide); return; }
    setEnvoi(true);
    setErreur('');
    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affaireId, nom: nom.trim(), type }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d?.id) {
        setErreur(d?.error ? `${d.error}.` : t.echec);
        setEnvoi(false);
        return;
      }
      // Premier scénario : on ouvre directement sa page pour créer ses éléments
      if (versScenario) { window.location.href = `/interne/metre/${d.id}`; return; }
      window.location.reload();
    } catch {
      setErreur(t.reseau);
      setEnvoi(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <label className={ETIQUETTE} htmlFor={`nom-${type}-${affaireId}`}>{type === 'emplacement' ? "Nom de l'emplacement" : 'Nom du scénario'}</label>
        <input
          id={`nom-${type}-${affaireId}`}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          maxLength={80}
          placeholder={t.placeholder}
          className={CHAMP}
        />
        {type === 'emplacement' && (
          <p className="ml-1 text-[13px] leading-relaxed">Une borne = un emplacement. Une borne double compte pour un seul.</p>
        )}
      </div>
      <BoutonPrincipal type="button" onClick={ajouter} disabled={envoi} inactif={envoi}>
        <Plus size={20} /> {envoi ? 'Création...' : t.bouton}
      </BoutonPrincipal>
      {erreur && <Alerte>{erreur}</Alerte>}
    </>
  );
}

export function Scenarios({
  affaireId,
  scenarios,
  mode,
  statutFiche = '',
  type = 'scenario',
  siteRecu = false,
}: {
  affaireId: string;
  scenarios: ScenarioResume[];
  mode: 'liste' | 'proposition';
  statutFiche?: string;
  type?: TypeSousReleve;
  siteRecu?: boolean;
}) {
  const ficheAvancee = !!statutFiche && !estAVisiter(statutFiche);

  // Fiche sans sous-relevé : création directe d'un scénario
  if (mode === 'proposition') {
    return (
      <Carte accent className="space-y-4">
        <TitreCarte icon={GitBranch}>Créer un scénario</TitreCarte>
        <p className="text-[14px] leading-relaxed">
          <strong>Un scénario = une façon de raccorder = un devis</strong> (ex : services généraux ou compteur de l'appartement).
        </p>
        <p className="text-[14px] leading-relaxed">
          <strong>Plusieurs bornes sur le site</strong> (ex : auvent et parking) : un seul scénario, puis « Dupliquer la branche » pour chaque borne.
        </p>
        {ficheAvancee && <Avertissement statutFiche={statutFiche} type="scenario" />}
        <FormulaireAjout affaireId={affaireId} type="scenario" versScenario />
        <p className="text-[13px] leading-relaxed">
          Le relevé de cette page sera remplacé par les éléments du scénario. Crée-le avec du réseau, avant de descendre.
        </p>
      </Carte>
    );
  }

  // Fiche avec sous-relevés : liste + ajout
  const t = TEXTES[type];
  const tries = trierScenarios(scenarios);
  const recus = tries.filter((s) => !estAVisiter(s.statut)).length;
  const pluriel = tries.length > 1 ? 's' : '';

  return (
    <div className="space-y-4">
      <Repere>{t.repere}</Repere>
      <p className="px-1 text-[14px] leading-relaxed">
        {type === 'emplacement'
          ? <>{recus}/{tries.length} emplacement{pluriel} reçu{pluriel} · relevé du site <strong>{siteRecu ? 'reçu' : 'à faire'}</strong>.</>
          : <>{recus}/{tries.length} scénario{pluriel} prêt{pluriel} à chiffrer.</>}
        {!ficheAvancee && ` ${t.regle}`}
      </p>
      {ficheAvancee && <Avertissement statutFiche={statutFiche} type={type} />}
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
              <p className="mt-1.5 text-[13px]">{fait ? (type === 'emplacement' ? 'Relevé reçu' : 'Prêt à chiffrer') : 'Relevé à faire'}</p>
            </div>
            <ChevronRight size={22} className="shrink-0" color={fait ? CYAN : ORANGE} />
          </button>
        );
      })}
      <div className="h-1" />
      <Carte className="space-y-4">
        <TitreCarte icon={type === 'emplacement' ? Zap : GitBranch}>{t.ajouter}</TitreCarte>
        <FormulaireAjout affaireId={affaireId} type={type} />
      </Carte>
    </div>
  );
}
