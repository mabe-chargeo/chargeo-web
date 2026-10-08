"use client";

// Page Entreprises, charte 2026 (gabarit commun des offres).
// Simulateur : économies de la flotte à la place des revenus de recharge (décision du 05/10/2026).
// Inchangé : barre mobile, CTA flottant, ContactForm typeClient="Entreprise" (seul le libellé du texte de simulation change).
// 07/10/2026 (images) : les cas types ne répètent plus les photos des cartes.
// 08/10/2026 (audit de véracité) : plus de « loi LOM » pour les flottes (taxe incitative du CIBS depuis 2025),
// obligations parkings (CCH L113-13), fiscalité formulée prudemment, plus de promesse absolue sur l'abonnement.
import React, { useState, useEffect, useRef } from 'react';
import {
  Building, Car, Home, CreditCard, Gauge, Receipt, ShieldCheck, Wrench, FileText, Award, Wifi, QrCode,
} from 'lucide-react';

import { Navbar } from '@/components/layout/Navbar';
import { TrustedBrands } from '@/components/layout/TrustedBrands';
import { Footer } from '@/components/layout/Footer';
import { ReviewsCarousel } from '@/components/ui/ReviewsCarousel';
import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { SimulatorPro } from '@/components/ui/SimulatorPro';
import { ContactForm } from '@/components/ui/ContactForm';
import { NAVY } from '@/components/charte/Charte';
import {
  HautOffre, BandeauChiffres, CartesSolutions, Etapes, MethodeCas, BlocAides, PortailCourt, BlocContact, BlocFaq, BarreMobile,
} from '@/components/charte/PageOffre';

export default function ProPage() {
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [economies, setEconomies] = useState(0);
  const [simData, setSimData] = useState("");

  const formRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const showFloatingCta = !isHeroVisible && !isFormVisible;
  const versFormulaire = () => document.getElementById('formulaire-devis')?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    const observerOptions = { threshold: 0 };
    const heroObserver = new IntersectionObserver(([entry]) => setIsHeroVisible(entry.isIntersecting), observerOptions);
    const formObserver = new IntersectionObserver(([entry]) => setIsFormVisible(entry.isIntersecting), observerOptions);
    if (heroRef.current) heroObserver.observe(heroRef.current);
    if (formRef.current) formObserver.observe(formRef.current);
    return () => {
      heroObserver.disconnect();
      formObserver.disconnect();
    };
  }, []);

  // Exemples de projets types (pas des avis clients). À remplacer par de vrais avis, avec variant="avis", dès les premiers chantiers.
  const casTypes = [
    {
      text: "Parking de PME avec plusieurs véhicules électriques : pilotage dynamique de la charge pour recharger toute la flotte dans la puissance disponible du site.",
      author: "Flotte & PME",
      location: "Thonon-les-Bains",
      image: "/photo-parking-entreprise.webp"
    },
    {
      text: "Hôtel avec parking visiteurs : bornes avec paiement par QR code, vous fixez le tarif au kWh et les revenus vous sont reversés chaque mois.",
      author: "Hôtel & tertiaire",
      location: "Évian-les-Bains",
      image: "/photo-hotel-lac.webp"
    },
    {
      text: "Commerciaux qui rechargent à la maison : badge RFID, consommation pro isolée, relevé mensuel pour le remboursement en note de frais.",
      author: "Domicile collaborateurs",
      location: "Annemasse",
      image: "/photo-badge-rfid.webp"
    }
  ];

  const faqs = [
    { q: "Combien ma flotte économise-t-elle vraiment ?", a: "Le simulateur compare le carburant consommé aujourd'hui et l'électricité rechargée demain sur vos bornes. S'y ajoutent les avantages fiscaux des véhicules 100 % électriques (exonération des taxes annuelles CO2 et polluants, plafond d'amortissement plus élevé, TVA sur l'électricité déductible dans les conditions habituelles), que nous chiffrons avec vous lors de l'audit." },
    { q: "Comment fonctionne la monétisation ?", a: "C'est très simple : nous installons des bornes communicantes. Vous décidez du tarif appliqué au kWh. Notre logiciel s'occupe de facturer l'utilisateur final par QR Code et vous reverse les revenus mensuellement." },
    { q: "Domicile Collaborateurs : Comment rembourser l'électricité ?", a: "Notre logiciel isole la consommation liée au véhicule professionnel grâce au badge RFID du salarié. Chaque mois, un relevé détaillé permet le remboursement en note de frais." },
    { q: "Quelles obligations pour les flottes et les parkings ?", a: "Flottes : depuis 2025, une entreprise dont la flotte compte au moins 100 véhicules paie une taxe annuelle incitative si la part de véhicules à faibles émissions est inférieure à l'objectif (18 % en 2026). Parkings : depuis le 1er janvier 2025, un bâtiment non résidentiel existant de plus de 20 places doit compter des points de recharge, sauf exceptions (notamment un bâtiment possédé et occupé par une PME). Le détail est dans nos guides entreprises." },
    { q: "Quels sont les avantages fiscaux ?", a: "Les véhicules 100 % électriques sont exonérés des taxes annuelles CO2 et polluants (ex-TVS). Leur amortissement est déductible dans une limite plus élevée (30 000 € pour une voiture de moins de 20 g de CO2/km), et la TVA sur l'électricité de recharge est déductible dans les conditions habituelles. À valider avec votre expert-comptable selon votre situation." }
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pb-24 font-sans antialiased lg:pb-0" style={{ color: NAVY }}>
      <Navbar transparent showFloatingCta={showFloatingCta} onCtaClick={versFormulaire} ctaText="Audit B2B gratuit" />

      <BarreMobile
        visible={showFloatingCta}
        label="Économies de la flotte"
        valeur={`+${Math.round(economies).toLocaleString('fr-FR')} € / an`}
        bouton="Audit B2B"
        onClick={versFormulaire}
      />

      <main>
        <HautOffre
          img="/hero-pro.webp"
          alt="Parking d’entreprise équipé de bornes de recharge"
          eyeIcon={Building}
          eyebrow="Solutions pour entreprises & B2B"
          titre1="L’obligation devient"
          titre2="une opportunité."
          texte="Maîtrisez la puissance électrique de votre flotte d’entreprise, équipez vos collaborateurs à domicile, ou transformez votre parking visiteurs (hôtel, ERP) en un service attractif."
          cta="Estimer mes économies"
          lien="Ou demander un audit B2B"
          pills={["Audit technique gratuit", "Smart Charging", "Split-Billing"]}
          ctaRef={heroRef}
        />

        <BandeauChiffres chiffres={[
          { icon: Gauge, big: "Smart Charging", label: "dans la puissance du site" },
          { icon: Receipt, big: "Split-Billing", label: "note de frais automatique" },
          { icon: QrCode, big: "Paiement au kWh", label: "vous fixez le tarif" },
          { icon: ShieldCheck, big: "Conformité", label: "parkings mis aux normes" },
        ]} />

        <TrustedBrands />

        <CartesSolutions
          titre="Une solution pour chaque modèle économique."
          intro="Nous avons segmenté nos offres pour répondre aux exigences comptables, fiscales et RH propres à votre entreprise."
          solutions={[
            {
              icon: Car, img: "/review-flotte.webp", label: "Flotte", title: "Flotte & PME",
              text: "Électrifiez votre parking. Le Smart Charging pilote dynamiquement la charge pour limiter les surcoûts liés à votre abonnement électrique.",
              points: ["Bornes 7,4 à 22 kW", "Load Balancing sur la puissance du site", "Supervision et maintenance"],
              cta: "Équiper ma flotte",
            },
            {
              icon: CreditCard, img: "/review-hotel.webp", label: "Visiteurs et salariés", title: "Tertiaire & parkings",
              text: "Hôtels, ERP, bureaux : transformez l’obligation d’équipement en un nouveau service, avec des bornes accessibles à vos clients et collaborateurs.",
              points: ["Paiement par QR code ou badge", "Vous fixez le tarif au kWh", "Revenus reversés chaque mois"],
              cta: "Équiper mon parking",
            },
            {
              icon: Home, img: "/review-domicile.webp", label: "Collaborateurs", title: "Domicile collaborateurs",
              text: "La fin des notes de frais complexes. Grâce au Split-Billing, la consommation professionnelle de votre salarié est isolée pour un remboursement automatisé.",
              points: ["Borne posée chez le salarié", "Badge RFID dédié au véhicule pro", "Relevé mensuel détaillé"],
              cta: "Équiper mes collaborateurs",
            },
          ]}
        />

        <Etapes etapes={[
          { t: "Audit gratuit", d: "Un ingénieur IRVE examine votre site, votre puissance disponible et vos usages." },
          { t: "Devis", d: "Un chiffrage précis, avec les leviers fiscaux de votre entreprise." },
          { t: "Pose", d: "Installation planifiée pour ne pas perturber votre activité." },
          { t: "Pilotage et refacturation", d: "Smart Charging, paiement visiteurs, relevés pour les notes de frais." },
        ]} />

        <MethodeCas
          titre="Chaque entreprise est unique."
          texte="Flotte, visiteurs ou salariés à domicile : la technique s’adapte à votre modèle économique, pas l’inverse."
          lignes={[
            { icon: Wifi, t: "Pilotage dynamique", d: "Toute la flotte rechargée dans la puissance disponible du site, sans hausse d’abonnement dans la plupart des cas." },
            { icon: CreditCard, t: "Badge RFID salarié", d: "Consommation pro isolée, relevé mensuel détaillé pour la note de frais." },
            { icon: Wrench, t: "SAV local", d: "Les techniciens qui ont posé vos bornes interviennent en cas de panne." },
          ]}
        >
          {/* CARROUSEL CAS TYPES (à basculer en variant="avis" avec de vrais avis clients) */}
          <ReviewsCarousel reviews={casTypes} variant="cas" />
        </MethodeCas>

        <section id="simulateur" className="bg-white py-24 lg:py-28">
          <SimulatorPro onResultChange={(val, data) => { setEconomies(val); setSimData(data || ""); }} />
        </section>

        <BlocAides
          titre="Tirez parti des leviers financiers."
          texte="L’électrification de vos parkings n’est pas qu’une contrainte légale, c’est une opportunité fiscale. Nous gérons l’administratif pour que vous mobilisiez les leviers auxquels vous avez droit."
          cartes={[
            { icon: Building, t: "Obligations parkings", d: "Mise en conformité de vos parkings avec les obligations du Code de la construction, en vigueur depuis le 1er janvier 2025." },
            { icon: FileText, t: "Exonération ex-TVS", d: "Exonération totale des taxes annuelles CO2 et polluants (ex-TVS) pour les véhicules 100 % électriques." },
            { icon: Award, t: "Amortissement & TVA", d: "Amortissement déductible jusqu’à 30 000 € pour une voiture électrique, et TVA sur l’électricité de recharge déductible dans les conditions habituelles." },
          ]}
        />

        <PortailCourt />

        <BlocContact
          sectionRef={formRef}
          titre="Demander un audit B2B."
          texte="Un ingénieur IRVE examine la faisabilité technique de votre entreprise et chiffre votre projet."
          alerte={["Nos créneaux d’audit se remplissent vite.", "Complétez le formulaire aujourd’hui pour bloquer votre étude."]}
          jointe="Remplissez ce formulaire, votre estimation d’économies est jointe à la demande."
        >
          <ContactForm
            typeClient="Entreprise"
            simulation={`Économies flotte estimées : +${Math.round(economies)}€/an | Réglages : ${simData}`}
          />
        </BlocContact>

        <BlocFaq>
          <FaqAccordion faqs={faqs} />
        </BlocFaq>
      </main>

      <Footer />
    </div>
  );
}
