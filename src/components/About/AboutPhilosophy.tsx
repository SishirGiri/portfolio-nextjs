'use client';

import { motion } from 'framer-motion';
import { scaleIn, inViewport } from './motion';

/** 4. Philosophy — glass quote card explaining my approach to programming. */
export default function AboutPhilosophy() {
  return (
    <section className="about-section">
      <div className="container">
        <motion.div
          className="about-glass about-quote"
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={inViewport}
        >
          <div className="about-quote-mark">&ldquo;</div>
          <p className="about-quote-text">
            I don&apos;t just build websites — I build{' '}
            <span className="hl">digital experiences</span> designed to be discovered,
            perform at scale, and create measurable impact through the power of
            development and SEO.
          </p>
          <div className="about-quote-author">— My Philosophy</div>
        </motion.div>
      </div>
    </section>
  );
}
