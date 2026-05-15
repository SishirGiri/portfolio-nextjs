"use client";

import ScrollReveal from "@/components/ui/ScrollReveal";
import type { Project } from "@/data/projects";

export default function ProjectFeatures({ project }: { project: Project }) {
  return (
    <section className="pp-section pp-section-alt">
      <div className="container">
        <ScrollReveal>
          <div className="pp-section-header">
            <span className="pp-section-number">02</span>
            <h2 className="pp-section-title">Key <em>Features</em></h2>
            <div className="pp-section-line" />
          </div>
        </ScrollReveal>
        <div className="pp-features-grid">
          {project.features.map((feature, i) => (
            <ScrollReveal key={feature.title} direction="up" delay={i * 0.08}>
              <div className="pp-feature-card">
                <span className="pp-feature-icon">{feature.icon}</span>
                <h3 className="pp-feature-title">{feature.title}</h3>
                <p className="pp-feature-desc">{feature.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
