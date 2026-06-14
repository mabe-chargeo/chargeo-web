import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#0097b2]/20">
      <Navbar isHome={false} />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <h1 className="text-4xl md:text-5xl font-black text-[#032b60] uppercase tracking-tighter mb-8 leading-tight">
          Mentions Légales & <br/><span className="text-[#0097b2]">Confidentialité</span>
        </h1>

        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-10 text-sm text-slate-600 leading-relaxed">
          
          {/* PARTIE MENTIONS LÉGALES */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
              <span className="text-xs font-black uppercase tracking-widest text-[#032b60]">Mentions Légales</span>
            </div>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-[#032b60] uppercase tracking-wider">1. Éditeur et Hébergement</h2>
              <p>
                <strong>Propriétaire / Éditeur :</strong> CHARGéO (Entreprise en cours de création)<br />
                <strong>Siège social :</strong> 8, Avenue du général De Gaulle, 74200 THONON-LES-BAINS<br />
                <strong>Directeur de la publication :</strong> Matthieu BELENGRI<br />
                <strong>Contact :</strong> contact@chargeo.fr | 04 85 69 22 04
              </p>
              <p className="pt-2">
                Le site internet est hébergé par <strong>Vercel Inc.</strong>, situé au 950 High St, Palo Alto, CA 94301, États-Unis (<a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-[#0097b2] underline">vercel.com</a>).
              </p>
            </section>

            <section className="space-y-3 border-t border-slate-100 pt-6">
              <h2 className="text-lg font-black text-[#032b60] uppercase tracking-wider">2. Propriété intellectuelle</h2>
              <p>
                CHARGéO est propriétaire des droits de propriété intellectuelle ou détient les droits d'usage sur tous les éléments accessibles sur le site internet. Toute reproduction, représentation, modification ou publication de tout ou partie des éléments du site est interdite sans autorisation écrite préalable.
              </p>
            </section>
          </div>

          {/* PARTIE CONFIDENTIALITÉ (RGPD) */}
          <div className="space-y-6 border-t-[3px] border-slate-100 pt-10">
            <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
              <span className="text-xs font-black uppercase tracking-widest text-[#032b60]">Politique de Confidentialité</span>
            </div>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-[#032b60] uppercase tracking-wider">1. Données collectées et finalité</h2>
              <p>
                CHARGéO collecte vos données personnelles (Nom, Prénom, Email, Téléphone) via les formulaires du site dans le but de :
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Réaliser l'étude technique de votre projet d'installation IRVE.</li>
                <li>Planifier une visite technique gratuite.</li>
                <li>Vous envoyer des offres commerciales liées à nos services.</li>
              </ul>
            </section>

            <section className="space-y-3 border-t border-slate-100 pt-6">
              <h2 className="text-lg font-black text-[#032b60] uppercase tracking-wider">2. Traitement et sécurité</h2>
              <p>
                Vos données sont strictement confidentielles. Elles sont traitées par notre équipe interne et stockées de manière sécurisée via notre outil de gestion (ClickUp Inc.). <strong>Aucune donnée n'est revendue à des tiers.</strong>
              </p>
              <p>
                Vos informations sont conservées le temps de la relation commerciale, et au maximum 3 ans après notre dernier contact pour la prospection.
              </p>
            </section>

            <section className="space-y-3 border-t border-slate-100 pt-6">
              <h2 className="text-lg font-black text-[#032b60] uppercase tracking-wider">3. Cookies et traceurs publicitaires</h2>
              <p>
                Lors de votre navigation sur le site, des cookies peuvent être déposés sur votre terminal, sous réserve de votre consentement explicite via notre bandeau dédié.
              </p>
              <p>
                Nous utilisons ces traceurs (notamment <strong>Google Ads</strong> et <strong>Google Analytics</strong>) pour mesurer notre audience, analyser le trafic, et vous proposer des annonces publicitaires ciblées. Vous pouvez retirer votre consentement à tout moment en effaçant les cookies de votre navigateur.
              </p>
            </section>

            <section className="space-y-3 border-t border-slate-100 pt-6">
              <h2 className="text-lg font-black text-[#032b60] uppercase tracking-wider">4. Vos droits</h2>
              <p>
                Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition au traitement de vos données. Pour les exercer, contactez-nous directement à : <strong>contact@chargeo.fr</strong>.
              </p>
            </section>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}