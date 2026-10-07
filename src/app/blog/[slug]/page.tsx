import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Building, Home, Lightbulb, ListChecks, Phone } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HautPhoto } from "@/components/charte/HautPhoto";
import { Meta, GuidesLies, BlocOffres, type GuideResume } from "@/components/charte/Guides";
import { articles, formatDate, getArticle, type Article, type Block } from "@/content/blog";
import { SOURCES_GUIDES } from "@/content/sources-guides";

// Modèle d'article, charte 2026 (maquette validée le 05/10/2026).
// Inchangé : génération statique, métadonnées SEO, JSON-LD, liens [texte](/adresse), figures, guides liés, CTA, avertissement.
// 07/10/2026 (SEO, confiance) : auteur nommé (visible et dans le JSON-LD) et encadré
// « Sources officielles » en fin d'article (liens dans src/content/sources-guides.ts).

const AUTEUR = { nom: "Mathieu Belengri", role: "fondateur de CHARGéO" };

const NAVY = "#032b60";
const CYAN = "#0097b2";
const LABEL = "#007f96";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: `${article.title} | CHARGÉO`,
    description: article.description,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      publishedTime: article.date,
      locale: "fr_FR",
      images: [{ url: article.cover.src, alt: article.cover.alt }],
    },
  };
}

// Transforme les liens écrits [texte](/adresse) dans le contenu en vrais liens cliquables
const LIEN = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const STYLE_LIEN = "font-semibold text-[#0097b2] underline decoration-2 underline-offset-4 decoration-[#0097b2]/40 hover:decoration-[#0097b2]";

function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  LIEN.lastIndex = 0;
  while ((m = LIEN.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const label = m[1];
    const href = m[2];
    parts.push(
      href.startsWith("/") ? (
        <Link key={i++} href={href} className={STYLE_LIEN}>
          {label}
        </Link>
      ) : (
        <a key={i++} href={href} target="_blank" rel="noopener noreferrer" className={STYLE_LIEN}>
          {label}
        </a>
      )
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

// Ancre lisible pour chaque intertitre (sommaire)
function ancre(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function Puce() {
  return <span className="mt-[11px] h-[10px] w-[10px] shrink-0 rounded-full" style={{ backgroundColor: CYAN }} />;
}

function BlockView({ block, lead = false }: { block: Block; lead?: boolean }) {
  switch (block.type) {
    case "h2":
      return (
        <div className="pt-6">
          <span className="block h-[10px] w-16 rounded-[5px]" style={{ backgroundColor: CYAN }} />
          <h2 id={ancre(block.text)} className="mt-5 scroll-mt-28 text-[26px] font-bold leading-tight sm:text-[30px]">{block.text}</h2>
        </div>
      );
    case "p":
      return lead ? (
        <p className="text-[19px] font-medium leading-[1.65] sm:text-[21px]">
          <Inline text={block.text} />
        </p>
      ) : (
        <p className="text-[17px] leading-[1.75] sm:text-[18px]">
          <Inline text={block.text} />
        </p>
      );
    case "ul":
      return (
        <ul className="space-y-4">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-4 text-[17px] leading-[1.7] sm:text-[18px]">
              <Puce />
              <span><Inline text={item} /></span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="space-y-4">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-4 text-[17px] leading-[1.7] sm:text-[18px]">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white" style={{ backgroundColor: CYAN }}>{i + 1}</span>
              <span><Inline text={item} /></span>
            </li>
          ))}
        </ol>
      );
    case "callout":
      return (
        <div className="flex gap-5 rounded-[20px] p-6" style={{ backgroundColor: "#e3f4f7", boxShadow: `inset 5px 0 0 ${CYAN}` }}>
          <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[12px]" style={{ backgroundColor: CYAN }}>
            <Lightbulb size={22} color="#ffffff" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: LABEL }}>À retenir</p>
            <p className="mt-1 text-[17px] leading-relaxed"><Inline text={block.text} /></p>
          </div>
        </div>
      );
    case "figure":
      return (
        <figure className="rounded-[24px] p-5 sm:p-7" style={{ backgroundColor: "#eceef1", boxShadow: "0 8px 22px rgba(3,43,96,0.10)" }}>
          <div className="rounded-[18px] bg-white p-4 sm:p-6">
            <Image
              src={block.src}
              alt={block.alt}
              width={block.width}
              height={block.height}
              unoptimized
              className="mx-auto h-auto w-full max-w-2xl"
            />
          </div>
          {block.caption && (
            <figcaption className="mt-4 text-center text-[14px] font-medium" style={{ color: LABEL }}>{block.caption}</figcaption>
          )}
        </figure>
      );
    default:
      return null;
  }
}

// 2 guides à lire ensuite : d'abord ceux de la même catégorie, puis les autres
function guidesLies(article: Article): Article[] {
  const autres = articles.filter((a) => a.slug !== article.slug);
  const memeCategorie = autres.filter((a) => a.category === article.category);
  const reste = autres.filter((a) => a.category !== article.category);
  return [...memeCategorie, ...reste].slice(0, 2);
}

function resume(a: Article): GuideResume {
  return {
    slug: a.slug, title: a.title, description: a.description, category: a.category,
    readingMinutes: a.readingMinutes, dateTexte: formatDate(a.date), cover: { src: a.cover.src, alt: a.cover.alt },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const lies = guidesLies(article);
  const sommaire = article.blocks.filter((b): b is Extract<Block, { type: "h2" }> => b.type === "h2");
  const copro = article.category.toLowerCase().includes("copro");
  const sources = SOURCES_GUIDES[article.slug] ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    image: `https://www.chargeo.fr${article.cover.src}`,
    datePublished: article.date,
    dateModified: article.date,
    inLanguage: "fr-FR",
    mainEntityOfPage: `https://www.chargeo.fr/blog/${article.slug}`,
    author: {
      "@type": "Person",
      "@id": "https://www.chargeo.fr/#mathieu-belengri",
      name: AUTEUR.nom,
      jobTitle: "Fondateur",
      worksFor: { "@id": "https://www.chargeo.fr/#entreprise" },
    },
    publisher: {
      "@type": "Organization",
      name: "CHARGÉO",
      logo: {
        "@type": "ImageObject",
        url: "https://www.chargeo.fr/CHARGEO_LOGO_COMPLET_FOND_TRANSPARENT_2026-01-24.png",
      },
    },
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans antialiased" style={{ color: NAVY }}>
      <Navbar transparent />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main>
        <HautPhoto
          img={article.cover.src}
          alt={article.cover.alt}
          eyebrow={`Guides & conseils · ${article.category}`}
          eyeIcon={copro ? Building : Home}
          minH="600px"
          titreClass="sm:text-[48px] lg:text-[56px]"
          titre={article.title}
        >
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Meta g={resume(article)} light />
            <p className="text-[14px] font-semibold" style={{ color: "#a9d8e6" }}>Par {AUTEUR.nom}, {AUTEUR.role}</p>
            <Link href="/blog" className="inline-flex items-center gap-2 text-[16px] font-medium text-white underline decoration-white/40 underline-offset-[6px] hover:decoration-white">
              <ArrowLeft size={17} /> Tous les guides
            </Link>
          </div>
        </HautPhoto>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-14 px-6 py-16 lg:grid-cols-[1fr_340px] lg:py-20">
            <article className="min-w-0 max-w-[760px] space-y-7">
              {article.blocks.map((block, i) => (
                <BlockView key={i} block={block} lead={i === 0 && block.type === "p"} />
              ))}
              {sources.length > 0 && (
                <div className="rounded-[20px] p-6" style={{ backgroundColor: "#eceef1" }}>
                  <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: LABEL }}>Sources officielles</p>
                  <ul className="mt-3 space-y-2">
                    {sources.map((src) => (
                      <li key={src.href} className="text-[15px] leading-relaxed">
                        <a href={src.href} target="_blank" rel="noopener noreferrer" className={STYLE_LIEN}>{src.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>

            <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
              {sommaire.length > 0 && (
                <nav aria-label="Sommaire" className="rounded-[24px] p-7" style={{ backgroundColor: "#eceef1", boxShadow: "0 8px 22px rgba(3,43,96,0.10)" }}>
                  <div className="flex items-center gap-3">
                    <ListChecks size={22} color={CYAN} />
                    <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: LABEL }}>Dans ce guide</p>
                  </div>
                  <ol className="mt-5 space-y-4">
                    {sommaire.map((s, i) => (
                      <li key={i}>
                        <a href={`#${ancre(s.text)}`} className="group flex gap-3 text-[15px] font-semibold leading-snug hover:text-[#0097b2]">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white transition-colors group-hover:bg-[#0097b2]" style={{ backgroundColor: NAVY }}>{i + 1}</span>
                          {s.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
              <div className="rounded-[24px] p-7" style={{ backgroundColor: NAVY }}>
                <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "#69e8ff" }}>{copro ? "Votre copropriété" : "Votre projet"}</p>
                <p className="mt-2 text-[22px] font-bold leading-snug text-white">{copro ? "On prépare votre dossier d’AG." : "On prépare votre devis."}</p>
                <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "#a9d8e6" }}>
                  {copro
                    ? "Étude, devis part collective et part individuelle, estimation ADVENIR, présence en assemblée."
                    : "Visite technique gratuite, prix ferme, démarches et aides gérées pour vous."}
                </p>
                <Link href={article.cta.href} className="mt-6 flex items-center justify-between gap-3 rounded-full px-6 py-3.5 text-[16px] font-semibold text-white" style={{ backgroundColor: "#FF6B00" }}>
                  {article.cta.label} <ArrowRight size={18} className="shrink-0" />
                </Link>
                <a href="tel:+33485692204" className="mt-5 flex items-center gap-2 text-[15px] font-semibold text-white hover:underline">
                  <Phone size={16} color="#69e8ff" /> Standard : 04 85 69 22 04
                </a>
              </div>
            </aside>
          </div>
        </section>

        {lies.length > 0 && <GuidesLies guides={lies.map(resume)} />}

        <BlocOffres />

        <div className="bg-white">
          <p className="mx-auto max-w-7xl px-6 pb-12 text-[13px] leading-relaxed" style={{ color: LABEL }}>
            Informations données à titre indicatif à la date de publication. La réglementation et les aides évoluent : votre devis CHARGéO précise toujours ce qui s&apos;applique à votre projet.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
