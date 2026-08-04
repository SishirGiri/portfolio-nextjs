"use client";

import { useEffect, useRef } from "react";

const DEFAULT_PHRASES = [
  "Computer Science Student",
  "Software Developer",
  "Technical SEO Specialist",
  "AI Learner",
];

/**
 * Local typewriter for the hero. Accepts a `phrases` prop so the hero can show
 * its own role strings without mutating the shared TYPEWRITER_PHRASES constant.
 */
export default function HeroTypewriter({
  phrases = DEFAULT_PHRASES,
}: {
  phrases?: string[];
}) {
  const elRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    let pIdx = 0;
    let cIdx = 0;
    let deleting = false;
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      const phrase = phrases[pIdx];

      if (!deleting) {
        el.textContent = phrase.slice(0, cIdx + 1);
        cIdx++;
        if (cIdx === phrase.length) {
          deleting = true;
          timeout = setTimeout(tick, 1800);
          return;
        }
      } else {
        el.textContent = phrase.slice(0, cIdx - 1);
        cIdx--;
        if (cIdx === 0) {
          deleting = false;
          pIdx = (pIdx + 1) % phrases.length;
          timeout = setTimeout(tick, 400);
          return;
        }
      }

      timeout = setTimeout(tick, deleting ? 45 : 80);
    };

    timeout = setTimeout(tick, 1000);
    return () => clearTimeout(timeout);
  }, [phrases]);

  return <span ref={elRef} className="type-cursor" />;
}
