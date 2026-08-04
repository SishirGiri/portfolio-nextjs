'use client';

import { useEffect, useRef } from 'react';

/**
 * Decorative background for the Skills section:
 * masked grid, floating neon orbs, soft particles, and a mouse spotlight.
 * The spotlight is driven by `--mx`/`--my` CSS vars set from pointer move.
 * Pointer tracking is skipped on touch devices.
 */
export default function SkillsBackground() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
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
    <div ref={sectionRef} className="skills-bg" aria-hidden="true">
      <div className="skills-bg-grid" />
      <div className="skills-orb skills-orb-a" />
      <div className="skills-orb skills-orb-b" />
      <div className="skills-orb skills-orb-c" />
      <div className="skills-particles" />
      <div className="skills-spotlight" />
    </div>
  );
}
