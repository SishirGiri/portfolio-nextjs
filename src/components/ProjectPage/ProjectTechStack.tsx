"use client";

import ScrollReveal from "@/components/ui/ScrollReveal";
import type { Project } from "@/data/projects";

export default function ProjectTechStack({ project }: { project: Project }) {
  return (
    <section className="pp-section">
      <div className="container">
        <ScrollReveal>
          <div className="pp-section-header">
            <span className="pp-section-number">03</span>
            <h2 className="pp-section-title">Tech <em>Stack</em></h2>
            <div className="pp-section-line" />
          </div>
        </ScrollReveal>
        <div className="pp-tech-grid">
          {project.techStack.map((tech, i) => (
            <ScrollReveal key={tech.name} direction="up" delay={i * 0.07}>
              <div className="pp-tech-card">
                <span className="pp-tech-icon">{tech.icon}</span>
                <span className="pp-tech-name">{tech.name}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
