"use client";

import { useEffect, useRef, useState } from "react";
import { useCountUp } from "@/hooks/useCountUp";

/**
 * Premium hero stat card with an animated count-up. The counter runs once when
 * the card scrolls into view.
 */
export default function StatCard({
  value,
  suffix = "+",
  label,
  delay = 0,
}: {
  value: number;
  suffix?: string;
  label: string;
  delay?: number;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const display = useCountUp(value, active);

  return (
    <li
      ref={ref}
      className="stat-card"
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      <span className="stat-card-value">
        {display}
        {suffix}
      </span>
      <span className="stat-card-label">{label}</span>
    </li>
  );
}
