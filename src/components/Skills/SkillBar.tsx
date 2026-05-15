"use client";

import { useEffect, useRef } from "react";

export default function SkillBar({
  name,
  pct,
  delay,
}: {
  name: string;
  pct: number;
  delay: number;
}) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.width = pct + "%";
          }, delay);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pct, delay]);

  return (
    <div className="skill-row">
      <div className="skill-info">
        <span className="skill-name">{name}</span>
        <span className="skill-pct">{pct}%</span>
      </div>
      <div className="skill-track">
        <div ref={fillRef} className="skill-fill" data-w={pct}>
          <div className="skill-shine" />
        </div>
      </div>
    </div>
  );
}
