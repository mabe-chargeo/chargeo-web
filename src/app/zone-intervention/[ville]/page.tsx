// src/app/zone-intervention/[ville]/page.tsx
// Page d'une commune (07/10/2026, SEO local). Contenu et sources : src/content/villes.ts.
// 07/10/2026 (images) : une photo de haut de page différente par commune, plus une illustration
// dans le corps de la page. Ce sont des images d'illustration, jamais présentées comme nos chantiers.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Briefcase, Building, Home, MapPin, Phone } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HautPhoto } from "@/components/charte/HautPhoto";
import { BlocOffres } from "@/components/charte/Guides";
import { Barre, Lbl, Titre } from "@/components/charte/Charte";
import { articles } from "@/content/blog";
import { villes, getVille, pct, nombre, type Offre } from "@/content/villes";

const NAVY = "#032b60";
const CYAN = "#0097b2";
const LABEL = "#007f96";
const GRIS = "#eceef1";
const BASE = "https://www.chargeo.fr";

const OFFRES: Record<Offre, { titre: string; texte: string; href: string; Icone: typeof Home }> = {
  particuliers: { titre: "Particuliers", texte: "Maison, droit à la prise", href: "/particuliers", Icone: Home },
  copropriete: { titre: "Copropriétés", texte: "Infrastructure collective, dossier d'AG", href: "/copropriete", Icone: Building },
  pro: { titre: "Entreprises", texte: "Flotte, tertiaire, recharge des salariés", href: "/pro", Icone: Briefcase },
};

// Photos par commune : haut de page et illustration (choisies selon le parc de logements).
// 12 photos différentes : aucune n'est reprise d'une commune à l'autre.
const PHOTOS: Record<string, { haut: string; illus: string; alt: string }> = {
  "thonon-les-bains": { haut: "/photo-parking-residence.webp", illus: "/review-cs.webp", alt: "Parking souterrain de résidence équipé d'une borne de recharge" },
  "evian-les-bains": { haut: "/photo-residence-lac.webp", illus: "/photo-hotel-lac.webp", alt: "Bornes de recharge sur le parking d'un hôtel au bord du lac" },
  publier: { haut: "/photo-maison-carport.webp", illus: "/review-domicile.webp", alt: "Borne de recharge murale sur une maison face aux montagnes" },
  douvaine: { haut: "/photo-maison-crepuscule.webp", illus: "/photo-coffret-protection.webp", alt: "Coffret de protection électrique d'une borne de recharge" },
  annemasse: { haut: "/photo-parking-voitures.webp", illus: "/photo-technicien-tableau.webp", alt: "Technicien au tableau électrique d'un parking de copropriété" },
  annecy: { haut: "/photo-residence-soir.webp", illus: "/photo-voiture-sous-sol.webp", alt: "Voiture électrique dans un parking souterrain de copropriété" },
};

type Props = { params: Promise<{ ville: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return villes.map((v) => ({ ville: v.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ville } = await params;
  const v = getVille(ville);
  if (!v) return {};
  return {
    title: v.metaTitre,
    description: v.metaDescription,
    alternates: { canonical: `/zone-intervention/${v.slug}` },
    openGraph: { type: "website", title: v.metaTitre, description: v.metaDescription, locale: "fr_FR" },
  };
}

export default async function VillePage({ params }: Props) {
  const { ville } = await params;
  const v = getVille(ville);
  if (!v) notFound();

  const photo = PHOTOS[v.slug];
  const url = `${BASE}/zone-intervention/${v.slug}`;
  const guides = v.guides
    .map((s) => articles.find((a) => a.slug === s))
    .filter((a): a is (typeof articles)[number] => Boolean(a));
  const autres = villes.filter((x) => x.slug !== v.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: `Installation de bornes de recharge à ${v.nom}`,
        serviceType: "Installation de bornes de recharge pour véhicules électriques",
        url,
        provider: { "@id": `${BASE}/#entreprise` },
        areaServed: { "@type": "City", name: v.slug === "publier" ? "Publier" : v.nom, containedInPlace: { "@type": "AdministrativeArea", name: "Haute-Savoie" } },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${BASE}/` },
          { "@type": "ListItem", position: 2, name: "Zone d'intervention", item: `${BASE}/zone-intervention` },
          { "@type": "ListItem", position: 3, name: v.nom, item: url },
        ],
      },
    ],
  };

  const chiffres = [
    { valeur: nombre(v.population), legende: `habitants (Insee, ${v.anneePopulation})` },
    { valeur: pct(v.appartements), legende: `d'appartements (Insee, ${v.anneeLogements})` },
    { valeur: pct(v.maisons), legende: `de maisons (Insee, ${v.anneeLogements})` },
    { valeur: pct(v.secondaires), legende: `de résidences secondaires (Insee, ${v.anneeLogements})` },
    v.km === 0
      ? { valeur: "Sur place", legende: "notre équipe est basée à Thonon" }
      : { valeur: `≈ ${v.km} km`, legende: `depuis Thonon, environ ${v.minutes < 60 ? `${v.minutes} min` : `1 h ${String(v.minutes - 60).padStart(2, "0")}`}` },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans antialiased" style={{ color: NAVY }}>
      <Navbar transparent />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main>
        <HautPhoto
          img={photo?.haut ?? v.image}
          eyebrow={`Zone d'intervention · ${v.intercommunalite}`}
          eyeIcon={MapPin}
          minH="600px"
          titreClass="sm:text-[48px] lg:text-[60px]"
          titre={`Installation de bornes de recharge à ${v.nom}`}
          sous={v.accroche}
        >
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link href="/#contact" className="inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-[16px] font-semibold text-white" style={{ backgroundColor: "#FF6B00" }}>
              Demander une étude <ArrowRight size={18} />
            </Link>
            <Link href="/zone-intervention" className="inline-flex items-center gap-2 text-[16px] font-medium text-white underline decoration-white/40 underline-offset-[6px] hover:decoration-white">
              <ArrowLeft size={17} /> Toute notre zone d&apos;intervention
            </Link>
          </div>
        </HautPhoto>

        {/* Chiffres clés de la commune */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 pt-16 lg:pt-20">
            <Barre />
            <Titre>{v.nom} en chiffres.</Titre>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {chiffres.map((c) => (
                <li key={c.legende} className="rounded-[24px] p-6" style={{ backgroundColor: GRIS }}>
                  <p className="text-[30px] font-bold leading-none" style={{ color: CYAN }}>{c.valeur}</p>
                  <p className="mt-3 text-[15px] leading-snug">{c.legende}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Ce qui compte pour une borne dans cette commune */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
            <Barre />
            <Titre>Ce qui compte pour votre borne à {v.nom}.</Titre>
            <div className="mt-10 grid gap-7 lg:grid-cols-3">
              {v.enjeux.map((e) => (
                <article key={e.titre} className="rounded-[24px] p-8" style={{ backgroundColor: GRIS, boxShadow: "0 8px 22px rgba(3,43,96,0.10)" }}>
                  <h3 className="text-[22px] font-bold leading-snug">{e.titre}</h3>
                  <p className="mt-4 text-[16px] leading-relaxed">{e.texte}</p>
                </article>
              ))}
            </div>

            {photo && (
              <div className="relative mt-10 h-[240px] overflow-hidden rounded-[24px] sm:h-[340px] lg:h-[400px]" style={{ boxShadow: "0 8px 22px rgba(3,43,96,0.14)" }}>
                <Image src={photo.illus} alt={photo.alt} fill sizes="(max-width: 1280px) 100vw, 1232px" className="object-cover" />
              </div>
            )}

            <div className="mt-10 grid gap-7 lg:grid-cols-2">
              <div className="rounded-[24px] p-8" style={{ backgroundColor: NAVY }}>
                <Lbl light>Recharge publique</Lbl>
                <p className="mt-4 text-[16px] leading-relaxed text-white">{v.rechargePublique}</p>
              </div>
              <div className="rounded-[24px] p-8" style={{ backgroundColor: NAVY }}>
                <Lbl light>Aides locales</Lbl>
                <p className="mt-4 text-[16px] leading-relaxed text-white">{v.aidesLocales}</p>
              </div>
            </div>

            {v.deplacement && (
              <p className="mt-7 rounded-[20px] p-6 text-[16px] leading-relaxed" style={{ backgroundColor: GRIS }}>
                <strong>Déplacement :</strong> {v.deplacement}
              </p>
            )}
          </div>
        </section>

        {/* Offres, dans l'ordre le plus utile pour la commune */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 pb-16">
            <Barre />
            <Titre>Votre situation à {v.nom}.</Titre>
            <ul className="mt-10 grid gap-5 md:grid-cols-3">
              {v.offres.map((o) => {
                const { titre, texte, href, Icone } = OFFRES[o];
                return (
                  <li key={o}>
                    <Link href={href} className="group flex h-full items-center gap-5 rounded-[20px] p-6 transition-transform hover:-translate-y-1" style={{ backgroundColor: GRIS, color: NAVY }}>
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px]" style={{ backgroundColor: CYAN }}>
                        <Icone size={26} color="#ffffff" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[20px] font-bold">{titre}</span>
                        <span className="block text-[14px]">{texte}</span>
                      </span>
                      <ArrowRight size={20} color={CYAN} className="shrink-0 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            {guides.length > 0 && (
              <div className="pt-12">
                <Lbl>Nos guides utiles à {v.nom}</Lbl>
                <ul className="mt-5 grid gap-4 md:grid-cols-3">
                  {guides.map((g) => (
                    <li key={g.slug}>
                      <Link href={`/blog/${g.slug}`} className="group flex h-full flex-col justify-between gap-4 rounded-[20px] p-6 transition-transform hover:-translate-y-1" style={{ backgroundColor: GRIS, color: NAVY }}>
                        <span className="text-[17px] font-bold leading-snug">{g.title}</span>
                        <span className="inline-flex items-center gap-2 text-[15px] font-semibold" style={{ color: CYAN }}>
                          Lire le guide <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <BlocOffres
          titre={`Un projet de borne à ${v.nom} ?`}
          sous={v.deplacement ? "Prix ferme après étude, conditions de déplacement annoncées dès le premier appel. Choisissez votre situation :" : undefined}
        />

        {/* Sources et autres communes */}
        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-7 px-6 pb-16 lg:grid-cols-[1fr_380px]">
            <div className="rounded-[20px] p-6" style={{ backgroundColor: GRIS }}>
              <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: LABEL }}>Sources</p>
              <ul className="mt-3 space-y-2">
                {v.sources.map((s) => (
                  <li key={s.href} className="text-[15px] leading-relaxed">
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0097b2] underline decoration-2 underline-offset-4 decoration-[#0097b2]/40 hover:decoration-[#0097b2]">{s.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <nav aria-label="Autres communes" className="rounded-[20px] p-6" style={{ backgroundColor: NAVY }}>
              <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "#69e8ff" }}>Nous intervenons aussi à</p>
              <ul className="mt-4 space-y-3">
                {autres.map((x) => (
                  <li key={x.slug}>
                    <Link href={`/zone-intervention/${x.slug}`} className="inline-flex items-center gap-2 text-[16px] font-medium text-white hover:text-[#69e8ff]">
                      <MapPin size={16} color="#69e8ff" /> {x.nom}
                    </Link>
                  </li>
                ))}
              </ul>
              <a href="tel:+33485692204" className="mt-6 flex items-center gap-2 text-[15px] font-semibold text-white hover:underline">
                <Phone size={16} color="#69e8ff" /> Standard : 04 85 69 22 04
              </a>
            </nav>
          </div>
          <p className="mx-auto max-w-7xl px-6 pb-12 text-[13px] leading-relaxed" style={{ color: LABEL }}>
            Chiffres Insee et informations publiques vérifiés en octobre 2026. Les distances sont des ordres de grandeur depuis notre base de Thonon. Les aides évoluent : votre devis CHARGéO précise toujours ce qui s&apos;applique à votre projet. Photos d&apos;illustration.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
