'use client';

import { motion } from 'framer-motion';
import type { Tool } from '@/data/skills';
import { staggerItem } from '@/components/About/motion';
import TiltCard from './TiltCard';

const ACCENT_CLASS: Record<Tool['accent'], string> = {
  cyan: 'acc-cyan',
  violet: 'acc-violet',
  pink: 'acc-pink',
  green: 'acc-green',
  amber: 'acc-amber',
  blue: 'acc-blue',
  orange: 'acc-orange',
};

/** §5 — Tool/platform icon card with hover glow + 3D tilt. */
export default function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  return (
    <motion.div
      variants={staggerItem}
      className={`tool-card ${ACCENT_CLASS[tool.accent]}`}
    >
      <TiltCard className="tool-card-inner" max={8}>
        <span className="tool-icon">
          <Icon />
        </span>
        <h3 className="tool-name">{tool.name}</h3>
        <p className="tool-desc">{tool.desc}</p>
      </TiltCard>
    </motion.div>
  );
}
