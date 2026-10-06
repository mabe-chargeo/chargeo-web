"use client";

// Page Copropriétés, charte 2026 (gabarit commun des offres).
// Inchangé : simulateur ADVENIR, barre mobile, CTA flottant, ContactForm typeClient="Copropriété" et texte de simulation.
import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Building, Zap, Plug, BadgeEuro, PiggyBank, ShieldCheck, Award, Leaf, Landmark,
} from 'lucide-react';

import { Navbar } from '@/components/layout/Navbar';
import { TrustedBrands } from '@/components/layout/TrustedBrands';
import { Footer } from '@/components/layout/Footer';
import { ReviewsCarousel } from '@/components/ui/ReviewsCarousel';
import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { SimulatorCopro } from '@/components/ui/SimulatorCopro';
import { ContactForm } from '@/components/ui/ContactForm';
import { NAVY } from '@/components/charte/Charte';
import {
  HautOffre, BandeauChiffres, CartesSolutions, Etapes, MethodeCas, BlocAides, PortailCourt, BlocContact, BlocFaq, BarreMobile,
} from '@/components/charte/PageOffre';

export default function CoproprietePage() {
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [subventions, setSubventions] = useState(0);
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
      text: "Résidence de 30 places : artère posée une fois pour toutes, 3 résidents raccordés dès le départ. ADVENIR finance 50 % de l'infrastructure, jusqu'à 12 500 € HT.",
      author: "Infrastructure collective",
      location: "Thonon-les-Bains",
      image: "/hero-copro.webp"
    },
    {
      text: "Un résident veut sa borne : on vérifie la puissance, on prépare le dossier pour le syndic, et la recharge est pilotée pour ne jamais faire disjoncter l'immeuble.",
      author: "Droit à la prise",
      location: "Évian-les-Bains",
      image: "/tech-chargeo.webp"
    },
    {
      text: "Côté syndic, rien à gérer : chaque résident équipé a son sous-compteur et reçoit sa facture au kWh réellement consommé.",
      author: "Gestion simplifiée",
      location: "Chablais",
      image: "/hero-chargeo.webp"
    }
  ];

  const faqs = [
    { q: "L'infrastructure IRVE collective a-t-elle un coût pour l'immeuble ?", a: "Elle est subventionnée à 50 % par la prime ADVENIR, jusqu'à 12 500 € HT pour un parking jusqu'à 100 places (+125 € HT par place au-delà), pour un vote en AG à partir du 1er avril 2026. Une surprime jusqu'à 8 000 € HT couvre les travaux en extérieur. Le reste à charge éventuel dépend de la complexité technique du parking et de sa configuration." },
    { q: "Comment est facturée l'électricité ?", a: "Notre solution de supervision gère tout de A à Z. Chaque résident équipé dispose de son propre sous-compteur intelligent. Les factures lui sont envoyées directement (prélèvement automatique), en fonction de sa consommation réelle." },
    { q: "Et si l'infrastructure collective n'est pas votée en AG ?", a: "En dernier recours, il est possible d'envisager un branchement individuel 'Droit à la Prise'. C'est une démarche légale où le résident paie son propre tirage, mais elle est souvent moins évolutive que le collectif." },
    { q: "L'immeuble risque-t-il de disjoncter ?", a: "Absolument pas. L'infrastructure collective intègre un système de délestage dynamique (Load Balancing) qui répartit intelligemment la puissance disponible entre tous les véhicules branchés." }
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pb-24 font-sans antialiased lg:pb-0" style={{ color: NAVY }}>
      <Navbar transparent showFloatingCta={showFloatingCta} onCtaClick={versFormulaire} ctaText="Étude pour AG" />

      <BarreMobile
        visible={showFloatingCta}
        label="Aides possibles"
        valeur={`+${Math.round(subventions).toLocaleString('fr-FR')} € d’aides`}
        bouton="Étude AG"
        onClick={versFormulaire}
      />

      <main>
        <HautOffre
          img="/hero-copro.webp"
          alt="Résidence équipée de bornes de recharge"
          eyeIcon={Users}
          eyebrow="Solutions pour résidentiel collectif"
          titre1="Valorisez votre"
          titre2="copropriété."
          texte="Ne louez pas votre parking à un opérateur national. Investissez dans votre propre infrastructure pour garantir votre indépendance et sécuriser vos assemblées générales."
          cta="Évaluer les subventions"
          lien="Créer un dossier AG"
          pills={["Présentation par un expert IRVE", "La copro reste propriétaire", "Sans contrat à vie"]}
          ctaRef={heroRef}
        />

        <BandeauChiffres chiffres={[
          { icon: BadgeEuro, big: "50 %", label: "financés par ADVENIR" },
          { icon: PiggyBank, big: "12 500 € HT", label: "de prime jusqu’à 100 places" },
          { icon: Building, big: "Propriétaire", label: "la copro possède son réseau" },
          { icon: ShieldCheck, big: "Aucun", label: "abonnement imposé" },
        ]} />

        <TrustedBrands />

        <CartesSolutions
          titre="Une solution pour chaque situation de l’immeuble."
          intro="Infrastructure pour tout le parking, borne partagée ou borne d’un seul résident : nous chiffrons ce dont votre immeuble a vraiment besoin."
          solutions={[
            {
              icon: Building, img: "/review-syndic.webp", label: "Pour tout l’immeuble", title: "Infrastructure collective",
              text: "L’artère est posée une fois pour toutes. Chaque résident se raccorde ensuite quand il le souhaite, sans nouveaux travaux dans les parties communes.",
              points: ["Prime ADVENIR jusqu’à 12 500 € HT", "Load Balancing : l’immeuble ne disjoncte pas", "La copropriété reste propriétaire"],
              cta: "Chiffrer l’infrastructure",
            },
            {
              icon: Zap, img: "/tech-chargeo.webp", label: "Pour les résidents", title: "Borne partagée",
              text: "Une ou plusieurs bornes en accès partagé sur le parking, pour les résidents qui n’ont pas de place équipée.",
              points: ["Refacturation au kWh ou simple relevé", "Accès réservé aux résidents", "Supervision et maintenance"],
              cta: "Étudier une borne partagée",
            },
            {
              icon: Plug, img: "/review-resident.webp", label: "Pour un résident", title: "Borne du résident",
              text: "Droit à la prise ou raccordement à l’infrastructure existante : nous préparons le dossier pour le syndic et garantissons la conformité.",
              points: ["Dossier technique pour le syndic", "Sous-compteur individuel", "Recharge pilotée sur la puissance de l’immeuble"],
              cta: "Équiper une place",
            },
          ]}
        />

        <Etapes etapes={[
          { t: "Étude gratuite", d: "Visite du parking, puissance disponible, nombre de places : le chiffrage est précis." },
          { t: "Vote en AG", d: "Nous présentons le projet aux copropriétaires et répondons aux questions techniques." },
          { t: "Travaux", d: "Pose de l’infrastructure, suivi de chantier rigoureux, conformité garantie." },
          { t: "Raccordement des résidents", d: "Chaque résident se raccorde à son rythme, avec son sous-compteur." },
        ]} />

        <MethodeCas
          titre="L’infrastructure maîtrisée."
          texte="Nous offrons une tranquillité d’esprit aux syndics de copropriété tout en garantissant un service optimal pour les résidents utilisateurs."
          lignes={[
            { icon: ShieldCheck, t: "Support stratégique en AG", d: "À vos côtés en assemblée générale pour rassurer et répondre aux questions techniques." },
            { icon: Award, t: "Suivi de chantier rigoureux", d: "De l’étude de faisabilité à la mise en service, une exécution rapide et conforme." },
            { icon: Users, t: "Gestion simplifiée", d: "Fini les demandes individuelles en cascade : la facturation de chaque résident est gérée en toute transparence." },
          ]}
        >
          {/* CARROUSEL CAS TYPES (à basculer en variant="avis" avec de vrais avis clients) */}
          <ReviewsCarousel reviews={casTypes} variant="cas" />
        </MethodeCas>

        <section id="simulateur" className="bg-white py-24 lg:py-28">
          <SimulatorCopro onResultChange={(val, data) => { setSubventions(val); setSimData(data || ""); }} />
        </section>

        <BlocAides
          titre="Indépendance totale, aides comprises."
          texte="Fuyez les abonnements sur 15 ans : la copropriété investit, possède son propre réseau et mobilise les aides pour réduire le reste à charge."
          cartes={[
            { icon: BadgeEuro, t: "ADVENIR infrastructure", d: "50 % jusqu’à 12 500 € HT jusqu’à 100 places, +125 € HT par place au-delà, pour un vote en AG à partir du 1er avril 2026." },
            { icon: Leaf, t: "Surprime extérieur", d: "Jusqu’à 8 000 € HT pour les travaux de voirie et de cheminement en extérieur." },
            { icon: Landmark, t: "Sérénité des syndics", d: "Devis standardisés, quote-part collective et individuelle claire : fin de la surcharge administrative." },
          ]}
        />

        <PortailCourt />

        <BlocContact
          sectionRef={formRef}
          titre="Préparons votre étude pour l’AG."
          texte="Nos experts réalisent l’analyse de faisabilité technique et le montage financier pour votre immeuble."
          alerte={["Nos plannings d’AG se remplissent vite.", "Demandez votre étude gratuite dès aujourd’hui."]}
          jointe="Remplissez ce formulaire, votre estimation de subventions est jointe à la demande."
        >
          <ContactForm
            typeClient="Copropriété"
            simulation={`Subventions : +${Math.round(subventions)}€ | Réglages : ${simData}`}
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
