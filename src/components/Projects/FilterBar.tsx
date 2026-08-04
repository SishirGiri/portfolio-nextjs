'use client';

import { motion } from 'framer-motion';

export type FilterKey = string;

/** §2 — Sticky filter bar with an animated active pill (Framer Motion layoutId). */
export default function FilterBar({
  categories,
  active,
  onChange,
}: {
  categories: { key: FilterKey; label: string }[];
  active: FilterKey;
  onChange: (key: FilterKey) => void;
}) {
  return (
    <div className="proj-filter-wrap">
      <div className="container">
        <div className="proj-filter" role="tablist" aria-label="Project categories">
          {categories.map((c) => {
            const isActive = c.key === active;
            return (
              <button
                key={c.key}
                role="tab"
                aria-selected={isActive}
                className={`proj-filter-btn ${isActive ? 'active' : ''}`}
                onClick={() => onChange(c.key)}
              >
                {isActive && (
                  <motion.span
                    layoutId="proj-filter-pill"
                    className="proj-filter-pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
