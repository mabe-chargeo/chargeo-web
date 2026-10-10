import { notFound } from 'next/navigation';
import { MetreForm } from '@/components/ui/MetreForm';
import { PageAppli, EnTeteAppli, ContenuAppli } from '@/components/charte/Appli';
import { lireTacheQualification } from '@/lib/listesClickUp';

// Page de relevé (lot 3.2, 10/10/2026) : la fiche doit appartenir à la liste autorisée
// (vraie Qualification en production, TEST en preview), sinon page introuvable.
const SEGMENT_OPTIONS: Record<number, string> = { 0: 'RES', 1: 'DAP', 2: 'COP', 3: 'PAR', 4: 'FLT', 5: 'TER' };

async function getClickUpTaskData(taskId: string) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return null;
  try {
    const lecture = await lireTacheQualification(taskId, token);
    if (!lecture.ok) return null;
    const data = lecture.tache;

    // Extraire le segment s'il est déjà posé
    const segmentField = data.custom_fields?.find((f: any) => f.id === 'dbdacf18-1d26-4c58-9bbb-b4a9e443daa2');
    let segment = '';
    if (segmentField && segmentField.value !== undefined && segmentField.value !== null) {
      const idx = typeof segmentField.value === 'number' ? segmentField.value : parseInt(segmentField.value);
      segment = SEGMENT_OPTIONS[idx] || '';
    }

    return { name: data.name as string, segment };
  } catch (error) {
    return null;
  }
}

export default async function MetrePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const taskData = await getClickUpTaskData(resolvedParams.id);

  if (!taskData) {
    notFound();
  }

  return (
    <PageAppli>
      <EnTeteAppli surtitre="Visite technique" titre={taskData.name} retour={{ href: '/interne', libelle: 'Planning' }} />
      <ContenuAppli>
        <MetreForm taskId={resolvedParams.id} taskName={taskData.name} initialSegment={taskData.segment} />
      </ContenuAppli>
    </PageAppli>
  );
}
