'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { projects, featuredProject, type Project } from '@/data/projects';
import ProjectsBackground from './ProjectsBackground';
import ProjectsHero from './ProjectsHero';
import FilterBar from './FilterBar';
import ProjectCard from './ProjectCard';
import ProjectModal from './ProjectModal';
import FeaturedProject from './FeaturedProject';
import ProjectStats from './ProjectStats';
import DevProcess from './DevProcess';
import OpenSource from './OpenSource';
import ProjectsCTA from './ProjectsCTA';
import ProjectSectionHead from './ProjectSectionHead';

/** Filter categories — only show those with ≥1 matching project. */
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Web Development', label: 'Web Development' },
  { key: 'SEO', label: 'SEO' },
  { key: 'AI / Machine Learning', label: 'AI / Machine Learning' },
  { key: 'JavaScript', label: 'JavaScript' },
  { key: 'Python', label: 'Python' },
];

function matches(p: Project, key: string): boolean {
  if (key === 'all') return true;
  if (p.category === key) return true;
  if (p.language === key) return true;
  return false;
}

export default function ProjectsSection() {
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState<Project | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Hide filter chips that have zero matches (keeps the bar honest).
  const visibleFilters = useMemo(
    () => FILTERS.filter((f) => projects.some((p) => matches(p, f.key))),
    [],
  );

  const filtered = useMemo(
    () => projects.filter((p) => matches(p, filter)),
    [filter],
  );

  const openModal = (p: Project) => {
    setActive(p);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  return (
    <section id="projects" className="section projects">
      <div className="projects-page">
        <ProjectsBackground />

        <div className="container projects-content">
          {/* §1 Hero */}
          <ProjectsHero />

          {/* §2 Filter bar */}
          <FilterBar
            categories={visibleFilters}
            active={filter}
            onChange={setFilter}
          />

          {/* §3 Project grid (animated filter transitions) */}
          <div className="proj-block" style={{ paddingTop: 24 }}>
            <motion.div className="proj-grid" layout>
              <AnimatePresence mode="popLayout">
                {filtered.map((p) => (
                  <motion.div
                    key={p.slug}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ProjectCard project={p} onOpen={openModal} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* §4 Featured project */}
          <div className="proj-block alt">
            <ProjectSectionHead num="01" title="Featured" highlight="Project" />
            <FeaturedProject project={featuredProject} />
          </div>

          {/* §5 Statistics */}
          <div className="proj-block">
            <ProjectSectionHead num="02" title="Project" highlight="Statistics" />
            <ProjectStats />
          </div>

          {/* §6 Development process */}
          <div className="proj-block alt">
            <ProjectSectionHead num="03" title="Development" highlight="Process" />
            <DevProcess />
          </div>

          {/* §7 Open source */}
          <div className="proj-block">
            <ProjectSectionHead num="04" title="Open" highlight="Source" />
            <OpenSource />
          </div>

          {/* §8 CTA */}
          <div className="proj-block alt">
            <ProjectsCTA />
          </div>
        </div>
      </div>

      <ProjectModal project={active} open={modalOpen} onClose={closeModal} />
    </section>
  );
}
