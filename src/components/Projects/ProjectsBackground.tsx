'use client';

import { useEffect, useRef } from 'react';

/**
 * Decorative background for the Projects page:
 * masked grid, floating neon orbs, soft particles, and a mouse spotlight.
 * Pointer tracking is skipped on touch devices.
 */
export default function ProjectsBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const handle = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty('--mx', `${x}%`);
      el.style.setProperty('--my', `${y}%`);
    };
    window.addEventListener('pointermove', handle);
    return () => window.removeEventListener('pointermove', handle);
  }, []);

  return (
    <div ref={ref} className="projects-bg" aria-hidden="true">
      <div className="projects-bg-grid" />
      <div className="projects-orb projects-orb-a" />
      <div className="projects-orb projects-orb-b" />
      <div className="projects-orb projects-orb-c" />
      <div className="projects-particles" />
      <div className="projects-spotlight" />
    </div>
  );
}
