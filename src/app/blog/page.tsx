import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { articles, formatDate } from "@/content/blog";

export const metadata: Metadata = {
  title: "Guides borne de recharge à Thonon & Chablais | CHARGÉO",
  description:
    "Nos guides pour installer une borne de recharge à Thonon, Évian et dans le Chablais : droit à la prise, choix de la borne, aides ADVENIR en copropriété.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const sorted = [...articles].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#0097b2]/20">
      <Navbar isHome={false} />

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-20">
        <div className="inline-flex items-center gap-2 bg-[#0097b2]/10 px-4 py-2 rounded-full border border-[#0097b2]/20 mb-6">
          <BookOpen size={16} className="text-[#0097b2]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#0097b2]">Guides & conseils</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-[#032b60] uppercase tracking-tighter mb-6 leading-tight">
          Tout comprendre sur la <span className="text-[#0097b2]">recharge</span>
        </h1>
        <p className="text-slate-500 font-medium text-base md:text-lg leading-relaxed max-w-2xl mb-12">
          Des réponses claires aux questions que se posent les particuliers, les entreprises et les copropriétés du Chablais avant d&apos;installer une borne.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {sorted.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="group flex flex-col bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md hover:border-[#0097b2]/30 transition-all overflow-hidden"
            >
              <div className="relative aspect-video overflow-hidden bg-[#032b60]">
                <Image
                  src={article.cover.src}
                  alt={article.cover.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="flex flex-col flex-grow p-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#0097b2] mb-3">{article.category}</span>
                <h2 className="text-xl md:text-2xl font-black text-[#032b60] tracking-tight leading-snug mb-3 group-hover:text-[#0097b2] transition-colors">
                  {article.title}
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-grow">{article.description}</p>
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span className="flex items-center gap-2">
                    <Clock size={14} /> {article.readingMinutes} min · {formatDate(article.date)}
                  </span>
                  <ArrowRight size={18} className="text-[#032b60] group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
