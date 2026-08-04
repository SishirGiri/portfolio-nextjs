'use client';

import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
} from 'framer-motion';
import type { Learning } from '@/data/skills';
import { staggerItem } from '@/components/About/motion';

const ACCENT_CLASS: Record<Learning['accent'], string> = {
  cyan: 'acc-cyan',
  violet: 'acc-violet',
  pink: 'acc-pink',
  green: 'acc-green',
  amber: 'acc-amber',
  blue: 'acc-blue',
  orange: 'acc-orange',
};

const RADIUS = 42;
const CIRC = 2 * Math.PI * RADIUS;

/** §6 — Learning card with an animated SVG progress ring (count-up). */
export default function LearningCard({ item }: { item: Learning }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const Icon = item.icon;

  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const [pct, setPct] = useState(0);
  const [offset, setOffset] = useState(CIRC);

  useEffect(() => {
    const unsub = rounded.on('change', (v) => {
      setPct(v);
      setOffset(CIRC - (v / 100) * CIRC);
    });
    return () => unsub();
  }, [rounded]);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, item.pct, {
      duration: 1.4,
      ease: [0.4, 0, 0.2, 1],
      delay: 0.1,
    });
    return () => controls.stop();
  }, [inView, item.pct, mv]);

  return (
    <motion.div
      ref={ref}
      variants={staggerItem}
      className={`learning-card ${ACCENT_CLASS[item.accent]}`}
    >
      <div className="learning-ring">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle className="learning-ring-bg" cx="48" cy="48" r={RADIUS} />
          <circle
            className="learning-ring-fg"
            cx="48"
            cy="48"
            r={RADIUS}
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="learning-ring-center">
          {pct}
          <span className="sym">%</span>
        </div>
      </div>
      <div className="learning-icon-row">
        <Icon />
        <span className="learning-name">{item.name}</span>
      </div>
      <span className="learning-status">In Progress</span>
    </motion.div>
  );
}
