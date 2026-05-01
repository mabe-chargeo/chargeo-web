"use client";

import React, { useState, useEffect, useRef } from 'react';

export function FadeIn({ children, delay = 0, direction = 'up' }: { children: React.ReactNode, delay?: number, direction?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      { threshold: 0.15 }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, []);

  let startClass = 'translate-y-12 opacity-0';
  if (direction === 'left') startClass = '-translate-x-12 opacity-0';
  if (direction === 'right') startClass = 'translate-x-12 opacity-0';
  if (direction === 'scale') startClass = 'scale-90 opacity-0';

  return (
    <div 
      ref={ref} 
      className={`transition-all duration-1000 ease-out ${isVisible ? 'translate-y-0 translate-x-0 scale-100 opacity-100' : startClass}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}