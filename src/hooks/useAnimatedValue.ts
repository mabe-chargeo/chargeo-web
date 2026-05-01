"use client";

import { useState, useEffect, useRef } from 'react';

export function useAnimatedValue(target: number, duration: number = 1000, isVisible: boolean, triggerKey: number) {
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    setDisplayValue(0);
    hasAnimatedRef.current = false;
  }, [triggerKey]);

  useEffect(() => {
    if (!isVisible || hasAnimatedRef.current) return;

    let startTimestamp: number | null = null;
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 4);
      
      setDisplayValue(target * easeOut);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        hasAnimatedRef.current = true;
      }
    };

    const timer = setTimeout(() => {
      animationFrame = window.requestAnimationFrame(step);
    }, 50);

    return () => {
      clearTimeout(timer);
      if (animationFrame) window.requestAnimationFrame(step);
    };
  }, [isVisible, target, triggerKey, duration]);

  return displayValue;
}