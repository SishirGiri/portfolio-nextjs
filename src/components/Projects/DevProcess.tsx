'use client';

import { motion } from 'framer-motion';
import {
  Search,
  PencilRuler,
  Palette,
  Code2,
  TestTube,
  Gauge,
  Rocket,
  RefreshCw,
} from 'lucide-react';
import { staggerContainer, staggerItem, inViewport } from '@/components/About/motion';

const STEPS = [
  { label: 'Research', icon: Search },
  { label: 'Planning', icon: PencilRuler },
  { label: 'UI/UX Design', icon: Palette },
  { label: 'Development', icon: Code2 },
  { label: 'Testing', icon: TestTube },
  { label: 'SEO Optimization', icon: Gauge },
  { label: 'Deployment', icon: Rocket },
  { label: 'Maintenance', icon: RefreshCw },
];

/** §6 — Horizontal development-process timeline. */
export default function DevProcess() {
  return (
    <div className="proj-process-wrap">
      <motion.div
        className="proj-process-track"
        variants={staggerContainer(0.1)}
        initial="hidden"
        whileInView="visible"
        viewport={inViewport}
      >
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div key={step.label} className="proj-process-step" variants={staggerItem}>
              {i < STEPS.length - 1 && <span className="proj-process-connector" aria-hidden="true" />}
              <span className="proj-process-node">
                <Icon />
              </span>
              <span className="proj-process-index">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="proj-process-label">{step.label}</span>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
