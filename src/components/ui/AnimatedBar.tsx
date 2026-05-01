"use client";

import React, { useState, useEffect, useRef } from 'react';

export function AnimatedBar({ percent, isVisible, triggerKey, wrapperClass, innerClass, delay = 0 }: { 
  percent: number, isVisible: boolean, triggerKey: number, wrapperClass: string, innerClass: string, delay?: number 
}) {
  const [width, setWidth] = useState(0);
  const hasAppearedRef = useRef(false);

  useEffect(() => {
    setWidth(0);
    hasAppearedRef.current = false;
  }, [triggerKey]);

  useEffect(() => {
    if (!isVisible || hasAppearedRef.current) return;
    const t = setTimeout(() => {
      setWidth(percent);
      hasAppearedRef.current = true;
    }, 50 + delay);
    return () => clearTimeout(t);
  }, [percent, isVisible, triggerKey, delay]);

  return (
    <div className={wrapperClass}>
      <div
        className={innerClass}
        style={{
          width: `${width}%`,
          transition: width === 0 ? 'none' : `width 2.5s cubic-bezier(0.16, 1, 0.3, 1)`
        }}
      ></div>
    </div>
  );
}