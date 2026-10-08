import React from 'react';
import { Scale } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import type { Metadata } from 'next';
import { HautPhoto } from '@/components/charte/HautPhoto';

// Mentions légales et confidentialité, charte 2026.
// 06/10/2026 : partie cookies réécrite pour décrire exactement ce que fait le
// site (Tag Manager qui charge Analytics et Ads, après accord), titre et adresse
// canonique propres à la page.
// 07/10/2026 : prénom du directeur de la publication corrigé (Mathieu, un seul t).
// 08/10/2026 (audit) : adresse légale actuelle de Vercel Inc. (Covina).
// 08/10/2026 (Kbis du 08/10/2026) : SAS à associé unique, capital 5 000 €, RCS Thonon-les-Bains 130 946 346.
// Reste à ajouter : TVA intracommunautaire, médiateur de la consommation, assurance décennale, numéro Qualifelec.
export const metadata: Metadata = {
  title: 'Mentions légales et confidentialité | CHARGÉO',
  description: "Mentions légales, politique de confidentialité et cookies du site CHARGéO, installateur de bornes de recharge à Thonon-les-Bains.",
  alternates: { canonical: '/mentions-legales' },
};
const NAVY = '#032b60';
const CYAN = '#0097b2';
const LABEL = '#007f96';
const LIEN = 'font-semibold text-[#0097b2] underline underline-offset-4';

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-[#dfe3e8] pt-7 first:border-t-0 first:pt-0">
      <h2 className="text-[22px] font-bold">{titre}</h2>
      {children}
    </section>
  );
}

function Partie({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] p-7 sm:p-10" style={{ backgroundColor: '#eceef1', boxShadow: '0 8px 22px rgba(3,43,96,0.10)' }}>
      <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: LABEL }}>{label}</p>
      <div className="mt-6 space-y-7 text-[16px] leading-relaxed">{children}</div>
    </div>
  );
}

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans antialiased" style={{ color: NAVY }}>
      <Navbar transparent />

      <main>
        <HautPhoto
          img="/hero-chargeo.webp"
          eyebrow="Informations légales"
          eyeIcon={Scale}
          minH="440px"
          titre="Mentions légales et confidentialité."
        />

        <section className="bg-white">
          <div className="mx-auto max-w-4xl space-y-8 px-6 py-20">
            <span className="block h-[10px] w-[120px] rounded-[5px]" style={{ backgroundColor: CYAN }} />

            {/* PARTIE MENTIONS LÉGALES */}
            <Partie label="Mentions légales">
              <Bloc titre="1. Éditeur et hébergement">
                <p>
                  <strong>Éditeur :</strong> CHARGéO, société par actions simplifiée à associé unique au capital de 5 000 €<br />
                  <strong>Immatriculation :</strong> RCS Thonon-les-Bains 130 946 346<br />
                  <strong>Siège social :</strong> 89, chemin de la Ballastière, 74200 Thonon-les-Bains<br />
                  <strong>Président et directeur de la publication :</strong> Mathieu BELENGRI<br />
                  <strong>Contact :</strong> contact@chargeo.fr | 04 85 69 22 04
                </p>
                <p>
                  Le site internet est hébergé par <strong>Vercel Inc.</strong>, situé au 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis (<a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className={LIEN}>vercel.com</a>).
                </p>
              </Bloc>
              <Bloc titre="2. Propriété intellectuelle">
                <p>
                  CHARGéO est propriétaire des droits de propriété intellectuelle ou détient les droits d'usage sur tous les éléments accessibles sur le site internet. Toute reproduction, représentation, modification ou publication de tout ou partie des éléments du site est interdite sans autorisation écrite préalable.
                </p>
              </Bloc>
            </Partie>

            {/* PARTIE CONFIDENTIALITÉ (RGPD) */}
            <Partie label="Politique de confidentialité">
              <Bloc titre="1. Données collectées et finalité">
                <p>
                  CHARGéO collecte vos données personnelles (Nom, Prénom, Email, Téléphone) via les formulaires du site dans le but de :
                </p>
                <ul className="space-y-2">
                  {[
                    "Réaliser l'étude technique de votre projet d'installation IRVE.",
                    "Planifier une visite technique gratuite.",
                    "Vous envoyer des offres commerciales liées à nos services.",
                  ].map((t) => (
                    <li key={t} className="flex gap-3"><span className="mt-[9px] h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CYAN }} />{t}</li>
                  ))}
                </ul>
              </Bloc>
              <Bloc titre="2. Traitement et sécurité">
                <p>
                  Vos données sont strictement confidentielles. Elles sont traitées par notre équipe interne et stockées de manière sécurisée via notre outil de gestion (ClickUp Inc.). <strong>Aucune donnée n'est revendue à des tiers.</strong>
                </p>
                <p>
                  Vos informations sont conservées le temps de la relation commerciale, et au maximum 3 ans après notre dernier contact pour la prospection.
                </p>
              </Bloc>
              <Bloc titre="3. Candidatures">
                <p>
                  Les informations transmises par le formulaire de recrutement (identité, coordonnées, diplôme, permis, formation, CV) servent uniquement à étudier votre candidature. Elles sont enregistrées dans notre outil de gestion (ClickUp Inc.) et conservées au plus 2 ans après notre dernier contact, puis supprimées. Vous pouvez à tout moment demander à les consulter, les corriger ou les supprimer en écrivant à : <strong>contact@chargeo.fr</strong>.
                </p>
              </Bloc>
              <Bloc titre="4. Cookies et mesure d'audience">
                <p>
                  Le site utilise <strong>Google Tag Manager</strong> (Google Ireland Ltd), un outil qui charge nos services de mesure : <strong>Google Analytics</strong>, pour mesurer l'audience et comprendre comment le site est consulté, et <strong>Google Ads</strong>, pour mesurer l'efficacité de nos annonces et vous en proposer de pertinentes.
                </p>
                <p>
                  Ces services ne déposent de cookie qu'avec votre accord, donné via le bandeau affiché lors de votre première visite. Tant que vous n'avez pas accepté, ou si vous refusez, aucun cookie de mesure ni publicitaire n'est déposé : seuls des signaux anonymes, sans cookie, peuvent être transmis à Google (mode Consentement de Google).
                </p>
                <p>
                  Votre choix est conservé 6 mois dans un cookie technique (chargeo-gdpr-consent). Les cookies de mesure d'audience sont conservés 13 mois au plus. Google peut traiter ces données hors de l'Union européenne, dans le cadre du Data Privacy Framework entre l'Union européenne et les États-Unis.
                </p>
                <p>
                  Vous pouvez changer d'avis à tout moment : effacez les cookies de ce site dans votre navigateur, le bandeau s'affichera de nouveau à votre prochaine visite.
                </p>
              </Bloc>
              <Bloc titre="5. Vos droits">
                <p>
                  Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition au traitement de vos données. Pour les exercer, contactez-nous directement à : <strong>contact@chargeo.fr</strong>.
                </p>
              </Bloc>
            </Partie>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
