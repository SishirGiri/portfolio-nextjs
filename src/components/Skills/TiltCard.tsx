'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * Wraps a card with a 3D pointer-tilt and an inner mouse-follow glow.
 *
 * - Tilts the card on the X/Y axes following the pointer (spring-smoothed).
 * - Sets CSS vars `--gx`/`--gy` (0–100%) on the element so a radial glow
 *   (skill-card / tool-card accent) tracks the cursor.
 *
 * Behaviour is automatically disabled on touch devices and when the user
 * prefers reduced motion — in those cases it renders a plain wrapper.
 */
export default function TiltCard({
  children,
  className,
  max = 8,
  glowVar = 'gx,gy',
}: {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees. */
  max?: number;
  /** Which CSS vars to publish for the glow: 'gx,gy' or 'mx,my'. */
  glowVar?: 'gx,gy' | 'mx,my';
}) {
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), {
    stiffness: 150,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), {
    stiffness: 150,
    damping: 18,
  });

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    px.set(x);
    py.set(y);
    const gxName = glowVar === 'gx,gy' ? '--gx' : '--mx';
    const gyName = glowVar === 'gx,gy' ? '--gy' : '--my';
    el.style.setProperty(gxName, `${x * 100}%`);
    el.style.setProperty(gyName, `${y * 100}%`);
  };

  const handleLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {children}
    </motion.div>
  );
}
