"use client";

import { useEffect, useRef } from "react";

type Direction = "up" | "left" | "right" | "fade";

const classMap: Record<Direction, string> = {
  up: "reveal-up",
  left: "reveal-left",
  right: "reveal-right",
  fade: "reveal",
};

export default function ScrollReveal({
  children,
  direction = "fade",
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${classMap[direction]}${className ? ` ${className}` : ""}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
