"use client";

import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import Image from 'next/image';

interface Review {
  text: string;
  author: string;
  location: string;
  image: string;
}

interface ReviewsCarouselProps {
  reviews: Review[];
}

export function ReviewsCarousel({ reviews }: ReviewsCarouselProps) {
  const [currentReview, setCurrentReview] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
        setCurrentReview((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-slate-100 rounded-[3rem] -rotate-3 shadow-sm transition-transform duration-700 hover:rotate-0"></div>
      
      <div className="relative w-full rounded-[2.5rem] shadow-2xl aspect-4/5 bg-slate-200 overflow-hidden border-8 border-white group">
        {reviews.map((review, idx) => (
          <Image 
            key={idx}
            src={review.image} 
            alt={`Témoignage de ${review.author}`}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            priority={idx === 0}
            className={`object-cover object-center transition-all duration-1000 ease-in-out ${idx === currentReview ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-110'}`}
          />
        ))}
        <div className="absolute inset-0 bg-linear-to-t from-[#032b60]/80 via-transparent to-transparent z-10 opacity-60 mix-blend-multiply"></div>
      </div>

      <div className="absolute -bottom-10 -left-4 md:-left-10 bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 w-[90%] sm:max-w-md min-h-55 flex flex-col justify-between z-20 hover:-translate-y-2 transition-transform duration-500">
        <div>
            <div className="flex gap-1 text-yellow-400 mb-4">
               {[1,2,3,4,5].map(s => <Star key={s} size={14} fill="currentColor" stroke="none" />)}
            </div>
            <div className="relative overflow-hidden h-48 sm:h-36">
              {reviews.map((review, idx) => (
                <div key={idx} className={`absolute inset-0 transition-all duration-700 ${idx === currentReview ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                  <p className="text-sm font-bold text-slate-700 italic leading-relaxed">&quot;{review.text}&quot;</p>
                  <p className="mt-3 font-black text-[10px] uppercase tracking-widest text-[#0097b2]">&mdash; {review.author}, {review.location}</p>
                </div>
              ))}
            </div>
        </div>
        <div className="flex gap-2 mt-4 justify-center">
            {reviews.map((_, idx) => (
                <button 
                    key={idx} 
                    onClick={() => setCurrentReview(idx)}
                    aria-label={`Voir le témoignage ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentReview ? 'w-6 bg-[#0097b2]' : 'w-2 bg-slate-200 hover:bg-slate-300'}`} 
                ></button>
            ))}
        </div>
      </div>
    </div>
  );
}