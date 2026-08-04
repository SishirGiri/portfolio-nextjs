'use client';

import Link from 'next/link';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import type { Project } from '@/data/projects';
import { ExternalLink, Lock, ArrowRight } from 'lucide-react';
import { GitHubIcon } from './icons';

/**
 * §3 (modal) — Quick project preview.
 *
 * Shows overview, key highlights, tech, and action buttons. The "Case Study"
 * button deep-links to the full `/projects/[slug]` detail page (kept distinct
 * from this quick preview).
 */
export default function ProjectModal({
  project,
  open,
  onClose,
}: {
  project: Project | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} label={project ? project.title : 'Project preview'}>
      {project && (
        <div className="pm-body">
          <div className="pm-media">
            {project.thumbnailUrl ? (
              <Image
                src={project.thumbnailUrl}
                alt={`${project.title} preview`}
                fill
                unoptimized
                className="pm-img"
              />
            ) : (
              <span className="pm-emoji">{project.icon}</span>
            )}
          </div>

          <span className="pm-tag">
            {project.category} · {project.date}
          </span>
          <h2 className="pm-title">{project.title}</h2>
          <p className="pm-overview">{project.overview}</p>

          {project.highlights && project.highlights.length > 0 && (
            <>
              <div className="pm-section-label">Key Highlights</div>
              <ul className="pm-highlights">
                {project.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </>
          )}

          <div className="pm-section-label">Technologies</div>
          <div className="pm-tech">
            {project.techStack.map((t) => (
              <span key={t.name} className="chip">
                <span aria-hidden="true">{t.icon}</span>
                {t.name}
              </span>
            ))}
          </div>

          <div className="pm-actions">
            {project.demoUrl && project.demoUrl !== '#' &&
              (project.demoUrl.startsWith('/') ? (
                <Link href={project.demoUrl} className="proj-btn primary">
                  <ExternalLink /> Live Demo
                </Link>
              ) : (
                <a
                  href={project.demoUrl}
                  className="proj-btn primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink /> Live Demo
                </a>
              ))}

            {project.isPrivate || !project.githubUrl || project.githubUrl === '#' ? (
              <span className="proj-card-private">
                <Lock /> Private Repository
              </span>
            ) : (
              <a
                href={project.githubUrl}
                className="proj-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitHubIcon /> GitHub
              </a>
            )}

            <Link href={`/projects/${project.slug}`} className="proj-btn ghost">
              Case Study <ArrowRight />
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
