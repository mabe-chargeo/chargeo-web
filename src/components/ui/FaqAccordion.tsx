"use client";

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

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

  return (
    <div className="space-y-4">
      {faqs.map((faq, idx) => (
        <div key={idx} className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow">
          <button 
            onClick={() => setOpenFaq(openFaq === idx ? null : idx)} 
            aria-expanded={openFaq === idx ? "true" : "false"}
            className="w-full flex items-center justify-between p-6 md:p-8 text-left hover:bg-slate-50 transition-colors focus:outline-none"
          >
            <span className="font-black text-lg pr-4 md:pr-8" style={{ color: brandNavy }}>{faq.q}</span>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ml-4 transition-colors duration-300 ${openFaq === idx ? 'bg-[#0097b2] text-white' : 'bg-slate-50 text-[#0097b2]'}`}>
              <ChevronDown className={`transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`} size={20} />
            </div>
          </button>
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openFaq === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-6 md:p-8 bg-slate-50 text-slate-500 font-medium leading-relaxed border-t border-slate-100">
              {faq.a}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}