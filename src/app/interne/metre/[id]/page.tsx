import { notFound } from 'next/navigation';
import { MetreForm } from '@/components/ui/MetreForm';
import { Scenarios, type ScenarioResume } from '@/components/ui/Scenarios';
import { PageAppli, EnTeteAppli, ContenuAppli } from '@/components/charte/Appli';
import { lireTacheQualification } from '@/lib/listesClickUp';

// Page de relevé (lots 3.2 et 3.3, 10/10/2026). La fiche doit appartenir à la liste autorisée
// (vraie Qualification en production, TEST en preview), sinon page introuvable.
// Trois cas (point 12 des Décisions ERP) :
// - fiche sans scénario : relevé direct, comme avant, avec la possibilité de créer des scénarios ;
// - fiche avec scénarios : écran Scénarios (un relevé par scénario) ;
// - scénario : relevé complet, avec retour vers les scénarios de la fiche.
const SEGMENT_OPTIONS: Record<number, string> = { 0: 'RES', 1: 'DAP', 2: 'COP', 3: 'PAR', 4: 'FLT', 5: 'TER' };

async function lireFiche(taskId: string) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return null;
  try {
    const lecture = await lireTacheQualification(taskId, token, { sousTaches: true });
    if (!lecture.ok) return null;
    const data = lecture.tache;

    // Segment déjà posé
    const segmentField = data.custom_fields?.find((f: any) => f.id === 'dbdacf18-1d26-4c58-9bbb-b4a9e443daa2');
    let segment = '';
    if (segmentField && segmentField.value !== undefined && segmentField.value !== null) {
      const idx = typeof segmentField.value === 'number' ? segmentField.value : parseInt(segmentField.value);
      segment = SEGMENT_OPTIONS[idx] || '';
    }

    const scenarios: ScenarioResume[] = (Array.isArray(data.subtasks) ? data.subtasks : []).map((s: any) => ({
      id: String(s.id),
      nom: String(s.name || ''),
      statut: String(s.status?.status || ''),
    }));

    let parent: { id: string; nom: string } | null = null;
    if (data.parent) {
      const lp = await lireTacheQualification(String(data.parent), token);
      parent = { id: String(data.parent), nom: lp.ok ? String(lp.tache?.name || 'Fiche') : 'Fiche' };
    }

    return { name: data.name as string, segment, scenarios, parent };
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

  // Scénario : relevé complet, retour vers les scénarios de la fiche
  if (fiche.parent) {
    return (
      <PageAppli>
        <EnTeteAppli surtitre={`Scénario · ${fiche.parent.nom}`} titre={fiche.name} retour={{ href: `/interne/metre/${fiche.parent.id}`, libelle: 'Scénarios' }} />
        <ContenuAppli>
          <MetreForm taskId={taskId} taskName={fiche.name} initialSegment={fiche.segment} />
        </ContenuAppli>
      </PageAppli>
    );
  }

  // Fiche avec scénarios : écran Scénarios
  if (fiche.scenarios.length > 0) {
    return (
      <PageAppli>
        <EnTeteAppli surtitre="Visite technique" titre={fiche.name} retour={{ href: '/interne', libelle: 'Planning' }} />
        <ContenuAppli>
          <Scenarios affaireId={taskId} scenarios={fiche.scenarios} mode="liste" />
        </ContenuAppli>
      </PageAppli>
    );
  }

  // Fiche sans scénario : relevé direct, comme avant
  return (
    <PageAppli>
      <EnTeteAppli surtitre="Visite technique" titre={fiche.name} retour={{ href: '/interne', libelle: 'Planning' }} />
      <ContenuAppli className="space-y-5">
        <Scenarios affaireId={taskId} scenarios={[]} mode="proposition" />
        <MetreForm taskId={taskId} taskName={fiche.name} initialSegment={fiche.segment} />
      </ContenuAppli>
    </PageAppli>
  );
}
