'use client';

import { motion } from 'framer-motion';
import {
  programming,
  seo,
  ai,
  tools,
  learning,
} from '@/data/skills';
import {
  staggerContainer,
  inViewport,
} from '@/components/About/motion';
import SkillsBackground from './SkillsBackground';
import SkillsHero from './SkillsHero';
import SkillSectionHead from './SkillSectionHead';
import SkillCard from './SkillCard';
import ToolCard from './ToolCard';
import LearningCard from './LearningCard';
import WorkflowTimeline from './WorkflowTimeline';

/** Renders a staggered grid of skill cards for a given group. */
function SkillGroup({ items }: { items: typeof programming }) {
  return (
    <motion.div
      className="skills-card-grid"
      variants={staggerContainer(0.07)}
      initial="hidden"
      whileInView="visible"
      viewport={inViewport}
    >
      {items.map((s) => (
        <SkillCard key={s.name} skill={s} />
      ))}
    </motion.div>
  );
}

export default function SkillsSection() {
  return (
    <section id="skills" className="section skills">
      <SkillsBackground />

      <div className="container skills-content">
        {/* §1 — Hero */}
        <SkillsHero />

        {/* §2 — Programming */}
        <div className="skills-block">
          <SkillSectionHead num="01" title="Programming" highlight="Languages" />
          <SkillGroup items={programming} />
        </div>

        {/* §3 — SEO */}
        <div className="skills-block alt">
          <SkillSectionHead num="02" title="SEO" highlight="Expertise" />
          <SkillGroup items={seo} />
        </div>

        {/* §4 — AI & Machine Learning */}
        <div className="skills-block">
          <SkillSectionHead num="03" title="AI &amp; Machine" highlight="Learning" />
          <SkillGroup items={ai} />
        </div>

        {/* §5 — Tools & Platforms */}
        <div className="skills-block alt">
          <SkillSectionHead num="04" title="Tools &amp;" highlight="Platforms" />
          <motion.div
            className="tools-grid"
            variants={staggerContainer(0.06)}
            initial="hidden"
            whileInView="visible"
            viewport={inViewport}
          >
            {tools.map((t) => (
              <ToolCard key={t.name} tool={t} />
            ))}
          </motion.div>
        </div>

        {/* §6 — Currently Learning */}
        <div className="skills-block">
          <SkillSectionHead num="05" title="Currently" highlight="Learning" />
          <motion.div
            className="learning-grid"
            variants={staggerContainer(0.08)}
            initial="hidden"
            whileInView="visible"
            viewport={inViewport}
          >
            {learning.map((l) => (
              <LearningCard key={l.name} item={l} />
            ))}
          </motion.div>
        </div>

        {/* §7 — Workflow */}
        <div className="skills-block alt">
          <SkillSectionHead num="06" title="My" highlight="Workflow" />
          <WorkflowTimeline />
        </div>
      </div>
    </section>
  );
}
