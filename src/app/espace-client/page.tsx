import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EspaceClientForm } from '@/components/ui/EspaceClientForm';

export default async function EspaceClientPage({
  searchParams,
}: {
  searchParams: Promise<{ dossier?: string }>;
}) {
  const params = await searchParams;
  const dossier = typeof params?.dossier === 'string' ? params.dossier : '';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#0097b2]/20 flex flex-col">
      <Navbar isHome={false} showFloatingCta={false} />

      <main className="flex-grow max-w-xl mx-auto px-6 pt-32 pb-20 w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-[#032b60] uppercase tracking-tighter mb-4">
            Espace <span className="text-[#0097b2]">client</span>
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Suivez l&apos;avancement de votre chantier, retrouvez vos devis et contactez notre assistance.
          </p>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
          <EspaceClientForm defaultDossier={dossier} />
        </div>

        <p className="mt-8 text-center text-sm text-slate-400 font-medium leading-relaxed">
          Votre numéro de dossier figure dans les emails que nous vous envoyons. Vous ne le retrouvez pas ? Appelez-nous au{' '}
          <a href="tel:0485692204" className="font-bold text-[#032b60] hover:text-[#0097b2]">04 85 69 22 04</a>.
        </p>
      </main>

      <Footer />
    </div>
  );
}
