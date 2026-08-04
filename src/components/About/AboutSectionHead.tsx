'use client';

import { motion } from 'framer-motion';
import { fadeIn, inViewport } from './motion';

/** Consistent numbered section header used across the About page. */
export default function AboutSectionHead({
  number,
  title,
  highlight,
}: {
  number: string;
  title: string;
  highlight: string;
}) {
  return (
    <motion.div
      className="about-section-head"
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={inViewport}
    >
      <span className="about-section-num">{number}</span>
      <h2 className="about-section-title">
        {title} <em>{highlight}</em>
      </h2>
      <div className="about-section-line" />
    </motion.div>
  );
}
