'use client';

import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
} from 'framer-motion';
import type { Skill } from '@/data/skills';
import { staggerItem } from '@/components/About/motion';
import TiltCard from './TiltCard';

const ACCENT_CLASS: Record<Skill['accent'], string> = {
  cyan: 'acc-cyan',
  violet: 'acc-violet',
  pink: 'acc-pink',
  green: 'acc-green',
  amber: 'acc-amber',
  blue: 'acc-blue',
  orange: 'acc-orange',
};

/** Animated count-up hook — runs once when `active` becomes true. */
function useCountUp(target: number, active: boolean, duration = 1.2) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const [value, setValue] = useState(0);
  useEffect(() => {
    const unsub = rounded.on('change', (v) => setValue(v));
    return () => unsub();
  }, [rounded]);
  useEffect(() => {
    if (!active) return;
    const controls = animate(mv, target, {
      duration,
      ease: [0.4, 0, 0.2, 1],
    });
    return () => controls.stop();
  }, [active, target, duration, mv]);
  return value;
}

/** Premium skill card: icon, name, description, level, animated count-up % + bar. */
export default function SkillCard({ skill }: { skill: Skill }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const pct = useCountUp(skill.pct, inView);
  const Icon = skill.icon;

  return (
    <motion.div
      ref={ref}
      variants={staggerItem}
      className={`skill-card ${ACCENT_CLASS[skill.accent]}`}
    >
      <TiltCard className="skill-card-inner" max={6}>
        <div className="skill-card-top">
          <span className="skill-card-icon">
            <Icon />
          </span>
          <span className="skill-card-pct">
            {pct}
            <span className="sym">%</span>
          </span>
        </div>
        <h3 className="skill-card-name">{skill.name}</h3>
        <p className="skill-card-cat">{skill.level}</p>
        <p className="skill-card-desc">{skill.desc}</p>
        <div className="skill-card-bar-wrap">
          <div className="skill-card-bar">
            <motion.div
              className="skill-card-fill"
              initial={{ width: 0 }}
              animate={inView ? { width: `${skill.pct}%` } : {}}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
            />
          </div>
        </div>
      </TiltCard>
    </motion.div>
  );
}
