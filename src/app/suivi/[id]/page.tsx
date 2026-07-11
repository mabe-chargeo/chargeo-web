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

async function getDevisClient(taskData: any) {
  const token = process.env.COSTRUCTOR_API_KEY;
  if (!token) return [];

  const lienField = taskData.custom_fields?.find(
    (f: any) => f.id === 'd9f88e8f-4e20-4a98-aee8-3ded30fef5fc'
  );
  const match = (lienField?.value || '').match(/cnt_[a-z0-9]+/i);
  if (!match) return [];
  const contactId = match[0];

  try {
    const res = await fetch(
      `https://api.costructor.co/external/v1/quotes?customer=${contactId}&limit=50`,
      { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }
    );
    if (!res.ok) return [];
    const json = await res.json();

    return (json.data || [])
      .filter((q: any) => q.status !== 'draft' && q.status !== 'deleted' && q.status !== 'lost')
      .map((q: any) => ({
        numero: q.number,
        nom: q.name || 'Devis',
        accepte: q.status === 'accepted',
        total: (q.total / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
        pdfId: q.pdf?.id || null,
      }));
  } catch {
    return [];
  }
}

export default async function SuiviClientPage({ params }: { params: Promise<{ id: string }> }) {
  // Déballage de la promesse (Spécifique Next.js 15)
  const resolvedParams = await params;
  const taskData = await getClickUpTask(resolvedParams.id);
  const devis = taskData ? await getDevisClient(taskData) : [];

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
          
          {/* Bloc Statut - Frise Chronologique Dynamique */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
            
            <div className="flex justify-between items-center mb-8">
              <p className="text-xs font-black uppercase tracking-widest text-[#032b60]">Avancement du dossier</p>
              <div className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold capitalize flex items-center gap-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#0097b2]"></span>
                {statutActuel}
              </div>
            </div>
            
            <div className="relative border-l-2 border-slate-100 ml-3 md:ml-4 space-y-8">
              {(() => {
                const s = statutActuel.toLowerCase();
                
                // Définition de l'étape en cours selon tes statuts ClickUp (Chantiers + Parc)
                let currentStep = 0;
                if (s.includes('planifié')) currentStep = 1;
                if (s.includes('en cours')) currentStep = 2;
                if (s.includes('réalisé') || s.includes('terminé') || s.includes('service') || s.includes('surveillance') || s.includes('panne')) currentStep = 3;
                if (s.includes('annulé') || s.includes('hors service')) currentStep = -1; // Mode erreur

                const steps = [
                  { title: "Préparation du dossier", desc: "Vos informations sont en cours d'analyse et de préparation." },
                  { title: "Intervention planifiée", desc: "Une date a été fixée avec notre équipe technique." },
                  { title: "Chantier en cours", desc: "Nos techniciens sont mobilisés sur votre installation." },
                  { title: "Mise en service", desc: "Votre installation est finalisée et opérationnelle." }
                ];

                return steps.map((step, index) => {
                  const isActive = currentStep === index;
                  const isCompleted = currentStep > index;
                  const isUpcoming = currentStep < index;
                  
                  // Gestion spéciale si la borne est en panne dans le Parc Installé
                  const showSavWarning = isActive && index === 3 && (s.includes('surveillance') || s.includes('panne'));

                  return (
                    <div key={index} className="relative pl-8 transition-all duration-300">
                      
                      {/* Le point sur la frise */}
                      <div className={`absolute -left-[11px] top-1 h-5 w-5 rounded-full border-4 border-white flex items-center justify-center z-10
                        ${isActive && !showSavWarning ? 'bg-[#FF6B00] shadow-[0_0_12px_rgba(255,107,0,0.4)]' : ''}
                        ${isCompleted ? 'bg-[#0097b2]' : ''}
                        ${isUpcoming ? 'bg-slate-200' : ''}
                        ${showSavWarning ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]' : ''}
                      `}>
                        {/* Animation de pulsation uniquement sur l'étape active */}
                        {isActive && !showSavWarning && <span className="absolute h-full w-full rounded-full bg-[#FF6B00] opacity-50 animate-ping"></span>}
                        {showSavWarning && <span className="absolute h-full w-full rounded-full bg-red-500 opacity-50 animate-ping"></span>}
                      </div>

                      {/* Le texte de l'étape */}
                      <h4 className={`text-lg font-black tracking-tight
                        ${isActive && !showSavWarning ? 'text-[#FF6B00]' : ''}
                        ${isCompleted ? 'text-slate-800' : ''}
                        ${isUpcoming ? 'text-slate-400' : ''}
                        ${showSavWarning ? 'text-red-500' : ''}
                      `}>
                        {step.title}
                      </h4>
                      
                      <p className={`text-sm font-medium mt-1.5 leading-relaxed 
                        ${isActive || isCompleted ? 'text-slate-500' : 'text-slate-300'}
                      `}>
                        {showSavWarning ? "Votre borne nécessite une assistance. Notre équipe technique est sur le coup." : step.desc}
                      </p>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* NOUVEAU BLOC : Détails des champs personnalisés */}
          {(() => {
            // Fonction pour extraire intelligemment la valeur d'un champ par son nom
            const getCustomFieldValue = (fieldName: string) => {
              const field = taskData.custom_fields?.find((f: any) => f.name.includes(fieldName));
              if (!field || field.value == null) return null;
              
              // Si c'est un menu déroulant (dropdown)
              if (field.type === 'drop_down' && field.type_config?.options) {
                // ClickUp stocke parfois l'index, parfois l'ID
                const option = field.type_config.options.find(
                  (opt: any) => opt.orderindex === field.value || opt.id === field.value
                );
                return option ? option.name : null;
              }
              
              // Si c'est une date
              if (field.type === 'date') {
                return new Date(parseInt(field.value)).toLocaleDateString('fr-FR');
              }

              // Pour le texte simple
              return field.value;
            };

            // On récupère les valeurs basées sur les noms de tes champs dans ClickUp
            const modeleBorne = getCustomFieldValue("Modèle de Borne");
            const typeContrat = getCustomFieldValue("Type de Contrat");
            const finGarantie = getCustomFieldValue("Fin de Garantie");

            // Si au moins un champ est rempli, on affiche le bloc
            if (modeleBorne || typeContrat || finGarantie) {
              return (
                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <p className="text-xs font-black uppercase tracking-widest text-[#032b60] mb-6">Détails de votre installation</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {modeleBorne && (
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Matériel</p>
                        <p className="text-sm font-black text-slate-800">{modeleBorne}</p>
                      </div>
                    )}
                    
                    {typeContrat && (
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contrat Actif</p>
                        <p className="text-sm font-black text-[#0097b2]">{typeContrat}</p>
                      </div>
                    )}
                    
                    {finGarantie && (
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fin de garantie</p>
                        <p className="text-sm font-black text-slate-800">{finGarantie}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          })()}

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
            
            {devis.length > 0 && (
  <div className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
    <span className="text-[10px] font-black uppercase tracking-widest text-[#032b60]">Vos devis</span>
    <div className="mt-4 space-y-3">
      {devis.map((d: any) => (
        <div key={d.numero + (d.pdfId || '')} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
          <div>
            <p className="font-semibold text-slate-800">{d.nom}</p>
            <p className="text-sm text-slate-500">
              N° {d.numero} · {d.total}
              {d.accepte && <span className="ml-2 font-semibold text-[#0097b2]">✓ Accepté</span>}
            </p>
          </div>
          {d.pdfId && (
            <a href={`/api/devis-pdf/${d.pdfId}`} target="_blank" className="rounded-lg bg-[#0097b2] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              Voir le devis
            </a>
          )}
        </div>
      ))}
    </div>
  </div>
)}

<SavForm clientId={resolvedParams.id} nomClient={nomChantier} />
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}