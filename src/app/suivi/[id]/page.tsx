import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SavForm } from '@/components/ui/SavForm';

// L'appel sécurisé vers ClickUp pour lire l'état de la borne (côté serveur)
async function getClickUpTask(taskId: string) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return null;

  try {
    const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}?custom_task_ids=true`, {
      headers: { 'Authorization': token },
      cache: 'no-store', // Pas de cache, on veut le statut en direct
    });

    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    return null;
  }
}

export default async function SuiviClientPage({ params }: { params: Promise<{ id: string }> }) {
  // Déballage de la promesse (Spécifique Next.js 15)
  const resolvedParams = await params;
  const taskData = await getClickUpTask(resolvedParams.id);

  // Si on ne trouve pas le dossier, on affiche une page 404
  if (!taskData) {
    notFound();
  }

  const nomChantier = taskData.name;
  const statutActuel = taskData.status.status; 

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#0097b2]/20 flex flex-col">
      <Navbar isHome={false} showFloatingCta={false} />

      <main className="flex-grow max-w-3xl mx-auto px-6 pt-32 pb-20 w-full">
        
        {/* En-tête de la page */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-[#032b60] uppercase tracking-tighter mb-4">
            Suivi de votre <span className="text-[#0097b2]">dossier</span>
          </h1>
          <h2 className="text-lg text-slate-500 font-medium">{nomChantier}</h2>
        </div>

        <div className="space-y-8">
          
          {/* Bloc Statut de la borne */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-xs font-black uppercase tracking-widest text-[#032b60] mb-4">Statut actuel</p>
            <div className="flex items-center gap-4">
              <span className="relative flex h-4 w-4 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0097b2] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#0097b2]"></span>
              </span>
              <p className="text-2xl font-black capitalize text-slate-800">
                {statutActuel}
              </p>
            </div>
            <p className="text-sm text-slate-500 mt-4 leading-relaxed font-medium">
              Ce statut reflète l'état de votre installation dans notre base de données.
            </p>
          </div>

          {/* Bloc Formulaire SAV */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#032b60]">Assistance Technique</span>
              </div>
              <h3 className="text-2xl font-black text-[#032b60] uppercase tracking-tight mb-2">
                Un problème avec votre borne ?
              </h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                Utilisez ce formulaire pour nous signaler tout dysfonctionnement. Votre demande sera traitée en priorité par nos techniciens locaux.
              </p>
            </div>
            
            <SavForm clientId={resolvedParams.id} nomClient={nomChantier} />
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}