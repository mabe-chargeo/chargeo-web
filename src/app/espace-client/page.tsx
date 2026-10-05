import { ClipboardList, FileSignature, LifeBuoy, Lock, Phone } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EspaceClientForm } from '@/components/ui/EspaceClientForm';
import { HautPhoto } from '@/components/charte/HautPhoto';

// Espace client, charte 2026. Inchangé : paramètre ?dossier=, EspaceClientForm et /api/espace-client.
const NAVY = '#032b60';
const CYAN = '#0097b2';
const LABEL = '#007f96';

const ATOUTS = [
  { icon: ClipboardList, t: 'Suivi du chantier', d: 'Chaque étape, du devis signé à la mise en service.' },
  { icon: FileSignature, t: 'Vos devis', d: 'À consulter et signer en ligne, quand vous le souhaitez.' },
  { icon: LifeBuoy, t: 'Assistance', d: 'Un problème ? Signalez-le, nos techniciens vous rappellent.' },
];

export default async function EspaceClientPage({
  searchParams,
}: {
  searchParams: Promise<{ dossier?: string }>;
}) {
  const params = await searchParams;
  const dossier = typeof params?.dossier === 'string' ? params.dossier : '';

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white font-sans antialiased" style={{ color: NAVY }}>
      <Navbar transparent showFloatingCta={false} />

      <main className="grow">
        <HautPhoto
          img="/hero-chargeo.webp"
          eyebrow="Votre espace client CHARGéO"
          eyeIcon={Lock}
          minH="460px"
          titre="Suivez tout, en ligne."
          sous="Suivez l’avancement de votre chantier, retrouvez vos devis et contactez notre assistance."
        />

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-14 px-6 py-20 lg:grid-cols-5 lg:gap-16 lg:py-24">
            <div className="lg:col-span-2">
              <span className="block h-[10px] w-[120px] rounded-[5px]" style={{ backgroundColor: CYAN }} />
              <h2 className="mt-8 text-[32px] font-bold leading-[1.14] tracking-[-0.015em] sm:text-[40px]">Accéder à mon dossier.</h2>
              <p className="mt-5 text-[18px] leading-relaxed">Votre espace est inclus sans frais et accessible 24/7.</p>
              <div className="mt-9 space-y-4">
                {ATOUTS.map((a) => (
                  <div key={a.t} className="flex items-center gap-5 rounded-[20px] p-5" style={{ backgroundColor: '#eceef1' }}>
                    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: CYAN }}>
                      <a.icon size={24} color="#ffffff" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p className="text-[17px] font-bold">{a.t}</p>
                      <p className="text-[15px] leading-relaxed">{a.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="rounded-[24px] p-6 sm:p-10" style={{ backgroundColor: '#eceef1', boxShadow: '0 8px 22px rgba(3,43,96,0.10)' }}>
                <h3 className="text-[26px] font-bold">Identifiez-vous</h3>
                <p className="mb-8 mt-2 text-[16px]">Votre numéro de dossier et l’email utilisé lors de votre demande.</p>
                <EspaceClientForm defaultDossier={dossier} />
              </div>
              <div className="mt-6 flex items-start gap-4 rounded-[20px] p-5" style={{ backgroundColor: '#e3f4f7', boxShadow: `inset 5px 0 0 ${CYAN}` }}>
                <Phone size={20} color={CYAN} className="mt-0.5 shrink-0" />
                <p className="text-[15px] leading-relaxed">
                  Votre numéro de dossier figure dans les emails que nous vous envoyons. Vous ne le retrouvez pas ? Appelez le standard au{' '}
                  <a href="tel:+33485692204" className="font-bold hover:underline" style={{ color: LABEL }}>04 85 69 22 04</a>.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
