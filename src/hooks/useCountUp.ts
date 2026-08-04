'use client';

import { useEffect, useState } from 'react';
import { animate, useMotionValue, useTransform } from 'framer-motion';

/**
 * Animated count-up hook.
 *
 * Runs once when `active` becomes true, animating from 0 → `target` and
 * returning the rounded integer as it updates. Pairs with `useInView`.
 *
 * Extracted from the Skills page so the Projects stat cards can reuse it.
 */
export function useCountUp(target: number, active: boolean, duration = 1.4) {
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
