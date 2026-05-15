import ScrollReveal from "@/components/ui/ScrollReveal";
import SkillBar from "./SkillBar";
import { skills, hexBadges } from "@/data/skills";

export default function SkillsSection() {
  return (
    <section id="skills" className="section skills">
      <div className="container">
        <ScrollReveal>
          <div className="section-header">
            <span className="section-number">03</span>
            <h2 className="section-title">
              My <em>Toolkit</em>
            </h2>
            <div className="section-line" />
          </div>
        </ScrollReveal>

        <div className="skills-layout">
          <div className="skills-bars">
            <ScrollReveal direction="left">
              <h3 className="skills-subtitle">Proficiency Levels</h3>
              {skills.map((skill, i) => (
                <SkillBar
                  key={skill.name}
                  name={skill.name}
                  pct={skill.pct}
                  delay={i * 120}
                />
              ))}
            </ScrollReveal>
          </div>

          <div className="skills-hex">
            <ScrollReveal direction="right">
              <h3 className="skills-subtitle">Technologies</h3>
              <div className="hex-grid">
                {hexBadges.map((badge) => (
                  <div key={badge.label} className={`hex-badge ${badge.className}`}>
                    <div className="hex-inner">
                      <span className="hex-icon">{badge.icon}</span>
                      <span className="hex-label">{badge.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
