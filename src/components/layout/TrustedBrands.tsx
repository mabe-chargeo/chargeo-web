import React from 'react';
import { BrandLogo } from '@/components/ui/BrandLogo';

// Bandeau de marques d'origine, complété par Schneider et Peblar (logos vectorisés le 05/10/2026).
export function TrustedBrands() {
  return (
    <div className="bg-white border-b border-[#eceef1] py-8 md:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-4 md:flex md:flex-row md:justify-between items-center justify-items-center gap-y-8 gap-x-2 md:gap-8 text-slate-400">
        <BrandLogo name="HAGER" url="/logo-hager.jpg" />
        <BrandLogo name="SCHNEIDER ELECTRIC" url="/logo-schneider.svg" />
        <BrandLogo name="PEBLAR" url="/logo-peblar.svg" />
        <BrandLogo name="ABB" url="/logo-abb.svg" />
        <BrandLogo name="LEGRAND" url="/logo-legrand.png" />
        <BrandLogo name="AUTEL" url="/logo-autel.png" />
        <BrandLogo name="WALLBOX" url="/logo-wallbox.png" />
        <BrandLogo name="ALFEN" url="/logo-alfen.jpeg" />
      </div>
    </div>
  );
}
