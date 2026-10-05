"use client";

// Carrousel des cas types / avis clients, charte 2026. Mêmes props qu'avant (reviews, variant).
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface Review {
  text: string;
  author: string;
  location: string;
  image: string;
}

interface ReviewsCarouselProps {
  reviews: Review[];
  // "avis" (par défaut) = vrais avis clients, avec étoiles et guillemets.
  // "cas" = exemples de projets types, clairement présentés comme tels (pas d'étoiles, badge "Exemple de projet").
  variant?: "avis" | "cas";
}

export function ReviewsCarousel({ reviews, variant = "avis" }: ReviewsCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [pause, setPause] = useState(false);
  const isCas = variant === "cas";
  const n = reviews.length;

  useEffect(() => {
    if (pause || n < 2) return;
    const timer = setInterval(() => setCurrent((p) => (p + 1) % n), 6000);
    return () => clearInterval(timer);
  }, [n, pause]);

  const aller = (i: number) => setCurrent(((i % n) + n) % n);

  return (
    <div
      className="overflow-hidden rounded-[24px] bg-white"
      style={{ boxShadow: "0 8px 22px rgba(3,43,96,0.14)" }}
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
    >
      <div className="relative h-[280px] overflow-hidden sm:h-[340px]">
        {reviews.map((r, idx) => (
          <Image
            key={idx}
            src={r.image}
            alt={isCas ? `Illustration : ${r.author}` : `Témoignage de ${r.author}`}
            fill
            sizes="(max-width: 1024px) 100vw, 560px"
            className={`object-cover transition-all duration-1000 ease-in-out ${idx === current ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}
          />
        ))}
        <span className="absolute left-5 top-5 rounded-full px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-white" style={{ backgroundColor: '#0097b2' }}>
          {isCas ? 'Exemple de projet' : 'Avis client'}
        </span>
      </div>
      <div className="p-7 sm:p-8">
        <div className="relative min-h-[190px] sm:min-h-[160px]">
          {reviews.map((r, idx) => (
            <div key={idx} className={`absolute inset-0 transition-all duration-700 ${idx === current ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`} aria-hidden={idx !== current}>
              <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: '#007f96' }}>
                {isCas ? 'Cas type' : 'Avis'} · {r.author} · {r.location}
              </p>
              {!isCas && (
                <div className="mt-3 flex gap-1 text-[#0097b2]">
                  {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={15} fill="currentColor" stroke="none" />)}
                </div>
              )}
              <p className="mt-3 text-[18px] font-medium leading-relaxed text-[#032b60] sm:text-[19px]">« {r.text} »</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            {reviews.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => aller(idx)}
                aria-label={isCas ? `Voir l'exemple ${idx + 1}` : `Voir le témoignage ${idx + 1}`}
                className="h-2.5 rounded-full transition-all duration-300"
                style={{ width: idx === current ? 28 : 10, backgroundColor: idx === current ? '#0097b2' : '#cfd6de' }}
              />
            ))}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => aller(current - 1)} aria-label="Précédent" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eceef1] text-[#032b60] transition-colors hover:bg-[#dfe3e8]">
              <ChevronLeft size={20} />
            </button>
            <button type="button" onClick={() => aller(current + 1)} aria-label="Suivant" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0097b2] text-white transition-colors hover:bg-[#032b60]">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
