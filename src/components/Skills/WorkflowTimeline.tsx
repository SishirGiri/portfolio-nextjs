'use client';

import { motion } from 'framer-motion';
import { workflow } from '@/data/skills';
import { staggerContainer, staggerItem, inViewport } from '@/components/About/motion';

/** §7 — Horizontal workflow timeline with animated steps + connectors. */
export default function WorkflowTimeline() {
  return (
    <div className="workflow-wrap">
      <motion.div
        className="workflow-track"
        variants={staggerContainer(0.12)}
        initial="hidden"
        whileInView="visible"
        viewport={inViewport}
      >
        {workflow.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div key={step.label} className="workflow-step" variants={staggerItem}>
              {i < workflow.length - 1 && <span className="workflow-connector" aria-hidden="true" />}
              <span className="workflow-node">
                <Icon />
              </span>
              <span className="workflow-index">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="workflow-label">{step.label}</span>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
