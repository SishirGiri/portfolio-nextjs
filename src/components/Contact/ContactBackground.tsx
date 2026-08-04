'use client';

import { useEffect, useRef } from 'react';

/**
 * Contact page background — animated grid, floating gradient orbs, and a
 * mouse-tracked spotlight. Decorative only (aria-hidden, no pointer events).
 * Mirrors the About/Projects/Skills background pattern.
 */
export default function ContactBackground() {
  const bgRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Skip on touch devices — no mouse to track.
    if (window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const el = bgRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        el.style.setProperty('--my', `${e.clientY - rect.top}px`);
        rafRef.current = null;
      });
    };

    el.addEventListener('mousemove', onMove);
    return () => {
      el.removeEventListener('mousemove', onMove);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="contact-bg" aria-hidden="true" ref={bgRef}>
      <div className="contact-bg-grid" />
      <div className="contact-bg-orb contact-bg-orb-1" />
      <div className="contact-bg-orb contact-bg-orb-2" />
      <div className="contact-bg-orb contact-bg-orb-3" />
      <div className="contact-bg-spotlight" />
    </div>
  );
}
