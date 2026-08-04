'use client';

import { motion } from 'framer-motion';
import { fadeIn, inViewport } from '@/components/About/motion';

/** Numbered, animated section header shared across Skills sections. */
export default function SkillSectionHead({
  num,
  title,
  highlight,
}: {
  num: string;
  title: string;
  highlight: string;
}) {
  return (
    <motion.div
      className="skills-block-head"
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={inViewport}
    >
      <span className="skills-block-num">{num}</span>
      <h2 className="skills-block-title">
        {title} <em>{highlight}</em>
      </h2>
      <div className="skills-block-line" />
    </motion.div>
  );
}
