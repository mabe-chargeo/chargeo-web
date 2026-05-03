import React from 'react';
import { BrandLogo } from '@/components/ui/BrandLogo';

export function TrustedBrands() {
  return (
    <div className="bg-white border-y border-slate-100 py-8 md:py-10">
      {/* C'est ici que la magie opère : grid grid-cols-3 sur mobile, md:flex sur PC */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-3 md:flex md:flex-row md:justify-between items-center justify-items-center gap-y-8 gap-x-2 md:gap-12 text-slate-400">
        <BrandLogo name="HAGER" url="/logo-hager.jpg" />
<BrandLogo name="AUTEL" url="https://mms.businesswire.com/media/20230321006038/fr/1595853/4/AUTEL_New_Energy_Logo.jpg" />        <BrandLogo name="WALLBOX" url="/logo-wallbox.png" />
        <BrandLogo name="ALFEN" url="/logo-alfen.jpeg" />
        <BrandLogo name="LEGRAND" url="/logo-legrand.png" />
        <BrandLogo name="ABB" url="/logo-abb.svg" />
      </div>
    </div>
  );
}