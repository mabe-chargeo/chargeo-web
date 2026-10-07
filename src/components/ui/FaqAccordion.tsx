"use client";

// FAQ en accordéon, charte 2026 (cartes grises arrondies). Mêmes props qu'avant.
// 07/10/2026 (SEO) : chaque question est un vrai intertitre (h3 autour du bouton,
// motif recommandé pour les accordéons), la réponse est reliée à sa question, et
// les guides du blog liés à la page sont proposés sous la FAQ (GuidesLiens).
import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { GuidesLiens } from '@/components/ui/GuidesLiens';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqAccordionProps {
  faqs: FaqItem[];
  brandNavy?: string;
  brandTeal?: string;
}

export function FaqAccordion({ faqs, brandNavy = "#032b60", brandTeal = "#0097b2" }: FaqAccordionProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const base = useId();

  return (
    <div className="space-y-4">
      {faqs.map((faq, idx) => {
        const ouvert = openFaq === idx;
        const idQ = `${base}-q${idx}`;
        const idR = `${base}-r${idx}`;
        return (
          <div key={idx} className="overflow-hidden rounded-[20px]" style={{ backgroundColor: '#eceef1', boxShadow: '0 8px 22px rgba(3,43,96,0.08)' }}>
            <h3 className="m-0">
            <button
              type="button"
              id={idQ}
              onClick={() => setOpenFaq(ouvert ? null : idx)}
              aria-expanded={ouvert ? "true" : "false"}
              aria-controls={idR}
              className="flex w-full items-center justify-between gap-6 p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0097b2] md:px-8"
            >
              <span className="text-[17px] font-bold sm:text-[18px]" style={{ color: brandNavy }}>{faq.q}</span>
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-300"
                style={{ backgroundColor: ouvert ? brandTeal : '#ffffff', color: ouvert ? '#ffffff' : brandTeal }}
              >
                <ChevronDown size={20} className={`transition-transform duration-300 ${ouvert ? 'rotate-180' : ''}`} />
              </span>
            </button>
            </h3>
            <div id={idR} role="region" aria-labelledby={idQ} className={`overflow-hidden transition-all duration-500 ease-in-out ${ouvert ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <p className="px-6 pb-7 text-[16px] leading-relaxed md:px-8" style={{ color: brandNavy }}>{faq.a}</p>
            </div>
          </div>
        );
      })}
      <GuidesLiens />
    </div>
  );
}
