'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp';
import { projectStats } from '@/data/projects';
import { staggerContainer, staggerItem, inViewport } from '@/components/About/motion';

const STATS = [
  { key: 'completed', label: 'Projects Completed', value: projectStats.completed },
  { key: 'technologies', label: 'Technologies Used', value: projectStats.technologies },
  { key: 'featured', label: 'Featured Projects', value: projectStats.featured },
  { key: 'categories', label: 'Categories', value: projectStats.categories },
] as const;

/** A single animated counter card. */
function StatCard({ label, value }: { label: string; value: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const display = useCountUp(value, inView, 1.4);
  return (
    <motion.div ref={ref} variants={staggerItem} className="proj-stat-card">
      <div className="proj-stat-value">{display}</div>
      <div className="proj-stat-label">{label}</div>
    </motion.div>
  );
}

/** §5 — Animated statistic cards (derived, honest counts). */
export default function ProjectStats() {
  return (
    <motion.div
      className="proj-stats-grid"
      variants={staggerContainer(0.1)}
      initial="hidden"
      whileInView="visible"
      viewport={inViewport}
    >
      {STATS.map((s) => (
        <StatCard key={s.key} label={s.label} value={s.value} />
      ))}
    </motion.div>
  );
}
