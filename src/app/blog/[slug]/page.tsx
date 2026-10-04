import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { articles, formatDate, getArticle, type Block } from "@/content/blog";

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

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "h2":
      return <h2 className="text-2xl md:text-3xl font-black text-[#032b60] tracking-tight pt-6">{block.text}</h2>;
    case "p":
      return <p className="text-slate-600 text-base md:text-lg leading-relaxed">{block.text}</p>;
    case "ul":
      return (
        <ul className="list-disc pl-6 space-y-3 text-slate-600 text-base md:text-lg leading-relaxed marker:text-[#0097b2]">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal pl-6 space-y-3 text-slate-600 text-base md:text-lg leading-relaxed marker:font-black marker:text-[#0097b2]">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case "callout":
      return (
        <div className="bg-[#0097b2]/10 border border-[#0097b2]/20 rounded-2xl p-5 md:p-6 text-[#032b60] font-medium leading-relaxed">
          {block.text}
        </div>
      );
    case "figure":
      return (
        <figure className="py-2">
          <Image
            src={block.src}
            alt={block.alt}
            width={block.width}
            height={block.height}
            unoptimized
            className="w-full h-auto max-w-xl mx-auto rounded-2xl"
          />
          {block.caption && (
            <figcaption className="text-center text-sm text-slate-400 font-medium mt-3">{block.caption}</figcaption>
          )}
        </figure>
      );
    default:
      return null;
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

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
    author: { "@type": "Organization", name: "CHARGÉO", url: "https://www.chargeo.fr" },
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#0097b2]/20">
      <Navbar isHome={false} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#032b60] mb-8 transition-colors"
        >
          <ArrowLeft size={16} /> Tous les guides
        </Link>

        <span className="block text-[10px] font-black uppercase tracking-widest text-[#0097b2] mb-4">{article.category}</span>
        <h1 className="text-3xl md:text-5xl font-black text-[#032b60] tracking-tighter leading-tight mb-6">{article.title}</h1>
        <p className="flex items-center gap-2 text-xs text-slate-400 font-bold mb-8">
          <Clock size={14} /> {article.readingMinutes} min de lecture · Publié le {formatDate(article.date)}
        </p>

        <div className="relative aspect-video rounded-[2rem] overflow-hidden mb-10 bg-[#032b60] shadow-sm">
          <Image
            src={article.cover.src}
            alt={article.cover.alt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>

        <article className="bg-white p-6 sm:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
          {article.blocks.map((block, i) => (
            <BlockView key={i} block={block} />
          ))}
        </article>

        <div className="mt-10 bg-[#032b60] rounded-[2rem] p-8 md:p-10 text-center">
          <p className="text-white font-black text-xl md:text-2xl uppercase tracking-tight mb-3">Un projet de borne dans le Chablais ?</p>
          <p className="text-blue-100/70 font-medium mb-6">Étude gratuite, prix ferme, installateur local.</p>
          <Link
            href={article.cta.href}
            className="inline-flex items-center gap-3 bg-[#FF6B00] hover:bg-[#E66000] text-white px-8 py-4 rounded-full font-black transition-all"
          >
            {article.cta.label} <ArrowRight size={18} />
          </Link>
        </div>

        <p className="mt-8 text-xs text-slate-400 leading-relaxed">
          Informations données à titre indicatif à la date de publication. La réglementation et les aides évoluent : votre devis CHARGéO précise toujours ce qui s&apos;applique à votre projet.
        </p>
      </main>

      <Footer />
    </div>
  );
}
