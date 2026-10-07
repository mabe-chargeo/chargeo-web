"use client";

// Page Particuliers, charte 2026 (gabarit commun des offres).
// Inchangé : simulateur, barre mobile, CTA flottant, ContactForm typeClient="Particulier" et texte de simulation.
// 07/10/2026 (images) : les cas types n'utilisent plus la photo du haut de page.
import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Home, Building, Plug, Calendar, BadgeEuro, Receipt, Clock, Award, Wrench, ShieldCheck,
} from 'lucide-react';

import { Navbar } from '@/components/layout/Navbar';
import { TrustedBrands } from '@/components/layout/TrustedBrands';
import { Footer } from '@/components/layout/Footer';
import { ReviewsCarousel } from '@/components/ui/ReviewsCarousel';
import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { SimulatorParticuliers } from '@/components/ui/SimulatorParticuliers';
import { ContactForm } from '@/components/ui/ContactForm';
import { NAVY } from '@/components/charte/Charte';
import {
  HautOffre, BandeauChiffres, CartesSolutions, Etapes, MethodeCas, BlocAides, PortailCourt, BlocContact, BlocFaq, BarreMobile,
} from '@/components/charte/PageOffre';

export default function ParticuliersPage() {
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [savings, setSavings] = useState(0);
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
      text: "Maison avec un abonnement 9 kVA : wallbox 7,4 kW avec délesteur, la recharge baisse toute seule quand le four tourne. Prix ferme annoncé après la visite gratuite.",
      author: "Maison individuelle",
      location: "Thonon-les-Bains",
      image: "/photo-maison-carport.webp"
    },
    {
      text: "Aller-retour Thonon–Genève chaque jour : la wallbox récupère environ 40 km par heure, la batterie est pleine le matin, au tarif des heures creuses.",
      author: "Frontalier",
      location: "Chablais",
      image: "/tech-chargeo.webp"
    },
    {
      text: "Appartement avec place de parking : dossier technique préparé pour le syndic, borne posée après le délai légal, prime ADVENIR jusqu'à 1 000 € HT selon le raccordement.",
      author: "Droit à la prise",
      location: "Évian-les-Bains",
      image: "/photo-residence-lac.webp"
    }
  ];

  const faqs = [
    { q: "Quelles sont les aides de l'État ?", a: "En maison comme en appartement, l'installation de votre borne par un installateur qualifié IRVE bénéficie d'une TVA réduite à 5,5 % (le crédit d'impôt a disparu au 1er janvier 2026). En appartement, la prime ADVENIR peut financer en plus 50 % de votre borne, jusqu'à 1 000 € HT, selon le raccordement de votre place (services généraux de l'immeuble ou point de livraison dédié). Nous gérons tout l'administratif." },
    { q: "Quel est le délai d'installation ?", a: "Après votre demande de devis, une visite technique gratuite est planifiée. L'installation se fait généralement sous 10 à 15 jours après validation du devis." },
    { q: "Compatibilité véhicule ?", a: "Standard européen Type 2, compatible avec 100% des véhicules électriques et hybrides du marché." },
    { q: "Qualification IRVE ?", a: "Il s'agit d'une qualification obligatoire pour installer des points de charge dont la puissance est supérieure à 3,7kW. Elle garantit votre sécurité, la validité de votre assurance habitation et la garantie de votre véhicule." }
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pb-24 font-sans antialiased lg:pb-0" style={{ color: NAVY }}>
      <Navbar transparent showFloatingCta={showFloatingCta} onCtaClick={versFormulaire} ctaText="Être rappelé(e)" />

      <BarreMobile
        visible={showFloatingCta}
        label="Mon estimation"
        valeur={`+${Math.round(savings).toLocaleString('fr-FR')} € / an`}
        bouton="Me faire rappeler"
        onClick={versFormulaire}
      />

      <main>
        <HautOffre
          img="/hero-particulier.webp"
          alt="Borne de recharge installée chez un particulier"
          eyeIcon={MapPin}
          eyebrow="Intervention sur le Chablais et la Haute-Savoie"
          titre1="L’installation"
          titre2="clé en main."
          texte="En maison individuelle ou en appartement (droit à la prise), partez l’esprit léger. Nous gérons 100 % des démarches administratives, juridiques et techniques."
          cta="Calculer mes économies"
          lien="Ou demander à être rappelé"
          pills={["Visite technique gratuite", "Prix ferme", "Qualifié IRVE"]}
          ctaRef={heroRef}
        />

        <BandeauChiffres chiffres={[
          { icon: Calendar, big: "Visite", label: "technique gratuite" },
          { icon: BadgeEuro, big: "Prix ferme", label: "annoncé au devis" },
          { icon: Receipt, big: "TVA 5,5 %", label: "sur l’installation" },
          { icon: Clock, big: "10 à 15 jours", label: "après validation du devis" },
        ]} />

        <TrustedBrands />

        <CartesSolutions
          titre="Une solution pour chaque logement."
          intro="Maison, appartement ou résidence déjà équipée : le matériel est choisi après la visite, selon votre tableau électrique et votre abonnement."
          solutions={[
            {
              icon: Home, img: "/review-particulier-1.webp", label: "Maison", title: "Maison individuelle",
              text: "Une borne posée à prix ferme, raccordée à votre tableau, avec délesteur si votre abonnement est juste.",
              points: ["Borne 7,4 kW, ou 11 kW en triphasé", "Protections dédiées et mise en service", "TVA réduite et démarches gérées"],
              cta: "Demander mon devis maison",
            },
            {
              icon: Building, img: "/review-resident.webp", label: "Appartement", title: "Le droit à la prise",
              text: "Peur d’affronter votre syndic ? Nous préparons le dossier technique et le courrier de notification, prêts à envoyer en recommandé.",
              points: ["Dossier technique pour le syndic", "Pose après le délai légal", "Prime ADVENIR selon le raccordement"],
              cta: "Lancer mon droit à la prise",
            },
            {
              icon: Plug, img: "/review-particulier-2.webp", label: "Copropriété équipée", title: "Raccorder ma place",
              text: "Votre immeuble a déjà son infrastructure collective ? Nous raccordons votre place et posons votre borne, sans nouveaux travaux dans les parties communes.",
              points: ["Raccordement à l’artère existante", "Borne et sous-compteur posés", "Prix ferme par place"],
              cta: "Demander mon raccordement",
            },
          ]}
        />

        <Etapes etapes={[
          { t: "Visite gratuite", d: "Un expert IRVE local vérifie votre installation électrique et le cheminement." },
          { t: "Devis ferme", d: "Un prix ferme, sans surprise, avec les aides auxquelles vous avez droit." },
          { t: "Pose", d: "Installation sous 10 à 15 jours après validation du devis." },
          { t: "Mise en service et suivi", d: "Certificat de conformité, puis suivi de votre borne dans le temps." },
        ]} />

        <MethodeCas
          titre="Une méthode standardisée."
          texte="CHARGéO repose sur une transparence absolue. Nos experts IRVE locaux se déplacent gratuitement pour vous fournir un devis précis et sans surprise."
          lignes={[
            { icon: MapPin, t: "Vos experts locaux", d: "Une équipe d’artisans qualifiés IRVE basée à Thonon-les-Bains, pas une plateforme nationale." },
            { icon: Award, t: "Qualification IRVE", d: "Obligatoire au-delà de 3,7 kW, indispensable pour votre assurance." },
            { icon: Wrench, t: "SAV et maintenance", d: "Notre équipe locale intervient rapidement et suit tout notre parc installé." },
          ]}
        >
          {/* CARROUSEL CAS TYPES (à basculer en variant="avis" avec de vrais avis clients) */}
          <ReviewsCarousel reviews={casTypes} variant="cas" />
        </MethodeCas>

        <section id="simulateur" className="bg-white py-24 lg:py-28">
          <SimulatorParticuliers onResultChange={(val, data) => { setSavings(val); setSimData(data || ""); }} />
        </section>

        <BlocAides
          titre="Les aides, nous les montons pour vous."
          texte="Vous n’avez rien à remplir : nous appliquons la TVA réduite et montons votre dossier de prime quand vous y avez droit."
          cartes={[
            { icon: Receipt, t: "TVA réduite à 5,5 %", d: "Sur l’installation de votre borne par un installateur qualifié IRVE, en maison comme en appartement." },
            { icon: BadgeEuro, t: "Prime ADVENIR en appartement", d: "50 % de votre borne, jusqu’à 1 000 € HT, selon le raccordement de votre place. Nous montons le dossier." },
            { icon: ShieldCheck, t: "Conformité certifiée", d: "De la visite technique jusqu’à l’attestation de conformité électrique, tout est fait dans les règles." },
          ]}
        />

        <PortailCourt />

        <BlocContact
          sectionRef={formRef}
          titre="Planifier ma visite technique."
          texte="Un expert IRVE local se déplace gratuitement pour évaluer la faisabilité et vous établir un devis précis."
          alerte={["Nos plannings se remplissent vite.", "Réservez votre visite technique aujourd’hui."]}
          jointe="Remplissez ce formulaire, votre estimation d’économies est jointe à la demande."
        >
          <ContactForm
            typeClient="Particulier"
            simulation={`Gain estimé : +${Math.round(savings)}€/an | Réglages : ${simData}`}
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
