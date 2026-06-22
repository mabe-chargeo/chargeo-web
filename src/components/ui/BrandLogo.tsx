"use client";

import React, { useState } from 'react';
import Image from 'next/image';

export const BrandLogo = ({ name, url }: { name: string, url: string }) => {
  const [error, setError] = useState(false); 
  return (
    <div className="flex items-center justify-center h-12 w-28 sm:w-32 group">
        {!error ? (
          <Image 
            src={url} 
            alt={name} 
            width={128}
            height={48}
            loading="lazy"
            onError={() => setError(true)}
            className="max-h-6 md:max-h-8 max-w-full object-contain opacity-40 grayscale transition-all duration-500 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-110" 
          />
        ) : (
          <span className="font-black text-[10px] uppercase opacity-20 text-center group-hover:opacity-100 transition-opacity">{name}</span>
        )}
    </div>
  );
};