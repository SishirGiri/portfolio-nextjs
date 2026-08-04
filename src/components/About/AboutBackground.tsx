'use client';

import { useEffect, useRef } from 'react';

/**
 * Shared background layer for the About page: animated grid, floating
 * blurred orbs, soft glowing particles, and a mouse-tracked spotlight.
 * Purely decorative — `pointer-events: none`, sits behind `.about-content`.
 */
export default function AboutBackground() {
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = spotRef.current;
    if (!el) return;
    if (window.matchMedia('(pointer: coarse)').matches) return; // skip on touch

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--mx', `${e.clientX}px`);
        el.style.setProperty('--my', `${e.clientY}px`);
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="about-bg" aria-hidden="true">
      <div className="about-page-grid" />
      <div className="about-orb about-orb-a" />
      <div className="about-orb about-orb-b" />
      <div className="about-orb about-orb-c" />
      <div className="about-particles" />
      <div className="about-spotlight" ref={spotRef} />
    </div>
  );
}
