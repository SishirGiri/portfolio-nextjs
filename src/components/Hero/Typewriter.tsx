"use client";

import { useEffect, useRef } from "react";
import { TYPEWRITER_PHRASES } from "@/lib/constants";

export default function Typewriter() {
  const elRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    let pIdx = 0;
    let cIdx = 0;
    let deleting = false;
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      const phrase = TYPEWRITER_PHRASES[pIdx];

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
          pIdx = (pIdx + 1) % TYPEWRITER_PHRASES.length;
          timeout = setTimeout(tick, 400);
          return;
        }
      }

      timeout = setTimeout(tick, deleting ? 45 : 80);
    };

    timeout = setTimeout(tick, 1000);
    return () => clearTimeout(timeout);
  }, []);

  return <span ref={elRef} className="type-cursor" />;
}
