import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { MetreForm } from '@/components/ui/MetreForm';

// Page de relevé : logique inchangée (lecture de la tâche + segment déjà posé).
// 10/10/2026 : en-tête à la charte 2026.
const SEGMENT_OPTIONS: Record<number, string> = { 0: 'RES', 1: 'DAP', 2: 'COP', 3: 'PAR', 4: 'FLT', 5: 'TER' };

async function getClickUpTaskData(taskId: string) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      headers: { 'Authorization': token },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();

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
    <div className="min-h-screen bg-white font-sans antialiased" style={{ color: '#032b60' }}>
      <header className="mb-6 px-6 pb-8 pt-10" style={{ backgroundColor: '#032b60' }}>
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-4">
            <img src="/logo-chargeo-blanc.svg" alt="CHARGéO" className="h-9 w-auto" />
            <a href="/interne" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white">
              <ArrowLeft size={16} /> Planning
            </a>
          </div>
          <p className="mt-6 text-[12px] font-extrabold uppercase tracking-[0.14em]" style={{ color: '#7fd3e2' }}>Visite technique</p>
          <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.015em] text-white">{taskData.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4">
        <MetreForm taskId={resolvedParams.id} taskName={taskData.name} initialSegment={taskData.segment} />
      </main>
    </div>
  );
}
