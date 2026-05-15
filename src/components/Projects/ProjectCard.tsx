"use client";

import Link from "next/link";
import { projects } from "@/data/projects";

const ExternalLinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

export default function ProjectCard({
  project,
  index,
}: {
  project: (typeof projects)[0];
  index: number;
}) {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    const tiltX = -dy * 6;
    const tiltY = dx * 6;
    card.style.transform = `translateY(-8px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.transform = "";
    card.style.transition = "transform 0.5s ease";
    setTimeout(() => {
      card.style.transition = "";
    }, 500);
  };

  return (
    <article
      className="project-card"
      style={{ "--i": index } as React.CSSProperties}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="card-glow-border" />
      <div className="card-header">
        <div className={`card-icon-wrap ${project.accentClass}`}>
          {project.icon}
        </div>
        <div className="card-links">
          <a
            href={project.demoUrl}
            className="icon-btn"
            title="View Demo"
            target="_blank"
            rel="noopener"
          >
            <ExternalLinkIcon />
          </a>
          <a
            href={project.githubUrl}
            className="icon-btn"
            title="GitHub"
            target="_blank"
            rel="noopener"
          >
            <GitHubIcon />
          </a>
        </div>
      </div>
      <div className="card-body">
        <div className="card-tags">
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
      </div>
      <div className="card-footer">
        <div className="card-tech">{project.tech}</div>
        <Link href={`/projects/${project.slug}`} className="card-cta">
          Explore &rarr;
        </Link>
      </div>
    </article>
  );
}
