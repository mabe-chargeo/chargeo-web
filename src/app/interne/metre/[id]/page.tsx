import { notFound } from 'next/navigation';
import { MetreForm } from '@/components/ui/MetreForm';
import { Scenarios } from '@/components/ui/Scenarios';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere } from '@/components/charte/Appli';
import { lireTacheQualification } from '@/lib/listesClickUp';
import { trierScenarios, typeDesSousReleves, typeSousReleve, type ScenarioResume } from '@/lib/scenarios';
import { lireSiteRecu } from '@/lib/releveSite';

// Page de relevé (lots 3.2, 3.3 et point 21). La fiche doit appartenir à la liste autorisée
// (vraie Qualification en production, TEST en preview), sinon page introuvable.
// Cinq cas :
// - fiche sans sous-relevé : relevé complet, avec la proposition « plusieurs bornes ou plusieurs raccordements » ;
// - fiche avec scénarios : écran Scénarios (un relevé complet par scénario), triés A, B, C ;
// - scénario : relevé complet, retour vers les scénarios ;
// - fiche avec emplacements (point 21) : liste des emplacements + relevé commun du site sur la fiche ;
// - emplacement : relevé réduit à la borne (matériel, support, cheminement, percements, photo), segment du site.
const SEGMENT_OPTIONS: Record<number, string> = { 0: 'RES', 1: 'DAP', 2: 'COP', 3: 'PAR', 4: 'FLT', 5: 'TER' };
const SEGMENT_ID = 'dbdacf18-1d26-4c58-9bbb-b4a9e443daa2';

function segmentDe(tache: any): string {
  const champ = tache?.custom_fields?.find((f: any) => f.id === SEGMENT_ID);
  if (!champ || champ.value === undefined || champ.value === null) return '';
  const idx = typeof champ.value === 'number' ? champ.value : parseInt(champ.value);
  return SEGMENT_OPTIONS[idx] || '';
}

async function lireFiche(taskId: string) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return null;
  try {
    const lecture = await lireTacheQualification(taskId, token, { sousTaches: true });
    if (!lecture.ok) return null;
    const data = lecture.tache;

    const sousReleves: ScenarioResume[] = trierScenarios((Array.isArray(data.subtasks) ? data.subtasks : []).map((s: any) => ({
      id: String(s.id),
      nom: String(s.name || ''),
      statut: String(s.status?.status || ''),
    })));
    const type = typeDesSousReleves(sousReleves);
    const siteRecu = type === 'emplacement' ? await lireSiteRecu(taskId, token) : false;

    let parent: { id: string; nom: string; segment: string } | null = null;
    if (data.parent) {
      const lp = await lireTacheQualification(String(data.parent), token);
      parent = {
        id: String(data.parent),
        nom: lp.ok ? String(lp.tache?.name || 'Fiche') : 'Fiche',
        segment: lp.ok ? segmentDe(lp.tache) : '',
      };
    }

    return {
      name: data.name as string,
      statut: String(data.status?.status || ''),
      segment: segmentDe(data),
      sousReleves,
      type,
      siteRecu,
      parent,
    };
  } catch (error) {
    return null;
  }
}

export default async function MetrePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const taskId = resolvedParams.id;
  const fiche = await lireFiche(taskId);

  if (!fiche) {
    notFound();
  }

  // Sous-relevé : emplacement (relevé réduit) ou scénario (relevé complet)
  if (fiche.parent) {
    const estEmplacement = typeSousReleve(fiche.name) === 'emplacement';
    const retourListe = {
      href: `/interne/metre/${fiche.parent.id}`,
      libelle: estEmplacement ? 'Retour aux emplacements' : 'Retour aux scénarios',
    };
    return (
      <PageAppli>
        <EnTeteAppli
          surtitre={`${estEmplacement ? 'Emplacement' : 'Scénario'} · ${fiche.parent.nom}`}
          titre={fiche.name}
          retour={{ href: retourListe.href, libelle: estEmplacement ? 'Emplacements' : 'Scénarios' }}
        />
        <ContenuAppli>
          <MetreForm
            taskId={taskId}
            taskName={fiche.name}
            initialSegment={estEmplacement ? (fiche.segment || fiche.parent.segment) : fiche.segment}
            retour={retourListe}
            mode={estEmplacement ? 'emplacement' : 'complet'}
          />
        </ContenuAppli>
      </PageAppli>
    );
  }

  // Fiche avec emplacements : liste des bornes + relevé commun du site
  if (fiche.type === 'emplacement') {
    return (
      <PageAppli>
        <EnTeteAppli surtitre="Visite technique" titre={fiche.name} retour={{ href: '/interne', libelle: 'Planning' }} />
        <ContenuAppli className="space-y-5">
          <Scenarios affaireId={taskId} scenarios={fiche.sousReleves} mode="liste" type="emplacement" siteRecu={fiche.siteRecu} statutFiche={fiche.statut} />
          <div className="h-1" />
          <Repere>Relevé commun du site</Repere>
          <p className="px-1 text-[14px] leading-relaxed">
            {fiche.siteRecu
              ? 'Déjà reçu. Tu peux le renvoyer pour corriger une valeur.'
              : 'Tableau, puissance, terre, réseau et zone : une seule fois pour tout le site.'}
          </p>
          <MetreForm taskId={taskId} taskName={fiche.name} initialSegment={fiche.segment} mode="site" />
        </ContenuAppli>
      </PageAppli>
    );
  }

  // Fiche avec scénarios : écran Scénarios
  if (fiche.type === 'scenario') {
    return (
      <PageAppli>
        <EnTeteAppli surtitre="Visite technique" titre={fiche.name} retour={{ href: '/interne', libelle: 'Planning' }} />
        <ContenuAppli>
          <Scenarios affaireId={taskId} scenarios={fiche.sousReleves} mode="liste" type="scenario" statutFiche={fiche.statut} />
        </ContenuAppli>
      </PageAppli>
    );
  }

  // Fiche sans sous-relevé : relevé complet, comme avant
  return (
    <PageAppli>
      <EnTeteAppli surtitre="Visite technique" titre={fiche.name} retour={{ href: '/interne', libelle: 'Planning' }} />
      <ContenuAppli className="space-y-5">
        <Scenarios affaireId={taskId} scenarios={[]} mode="proposition" statutFiche={fiche.statut} />
        <MetreForm taskId={taskId} taskName={fiche.name} initialSegment={fiche.segment} />
      </ContenuAppli>
    </PageAppli>
  );
}
