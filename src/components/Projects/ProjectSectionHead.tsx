'use client';

import { motion } from 'framer-motion';
import { fadeIn, inViewport } from '@/components/About/motion';

/** Numbered, animated section header shared across Projects sections. */
export default function ProjectSectionHead({
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
      className="proj-block-head"
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={inViewport}
    >
      <span className="proj-block-num">{num}</span>
      <h2 className="proj-block-title">
        {title} <em>{highlight}</em>
      </h2>
      <div className="proj-block-line" />
    </motion.div>
  );
}
