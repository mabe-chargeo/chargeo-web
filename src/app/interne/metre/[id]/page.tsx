import { notFound } from 'next/navigation';
import { MetreForm } from '@/components/ui/MetreForm';

async function getClickUpTaskName(taskId: string) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      headers: { 'Authorization': token },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.name;
  } catch (error) {
    return null;
  }
}

export default async function MetrePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const taskName = await getClickUpTaskName(resolvedParams.id);

  if (!taskName) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-[#032b60] text-white px-6 pb-8 pt-12 shadow-lg rounded-b-[2.5rem] mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0097b2]/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <p className="text-cyan-300 font-black uppercase tracking-[0.2em] text-[10px] mt-1">Visite Technique</p>
            <a href="/interne" className="text-white bg-white/20 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">
              ← Retour
            </a>
          </div>
          <h1 className="text-2xl font-black leading-tight truncate">{taskName}</h1>
        </div>
      </div>

      <main className="px-4 max-w-lg mx-auto">
        <MetreForm taskId={resolvedParams.id} taskName={taskName} />
      </main>
    </div>
  );
}