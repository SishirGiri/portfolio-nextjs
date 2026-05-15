"use client";

import dynamic from "next/dynamic";
import Typewriter from "./Typewriter";
import ScrollReveal from "@/components/ui/ScrollReveal";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

export default function HeroSection() {
  return (
    <section id="hero" className="hero">
      <HeroCanvas />
      <div className="scanlines" />

      <div className="hero-gradient-top" />
      <div className="hero-gradient-bottom" />

      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />
      <div className="hero-orb hero-orb-3" />

      <div className="hero-content">
        <div className="hero-badge">
          <span className="badge-dot" />
          Available for opportunities
        </div>

        <div className="hero-pre-line">
          <span className="pre-deco" />
          <p className="hero-pre">HELLO, WORLD. I&apos;M</p>
          <span className="pre-deco" />
        </div>

        <h1 className="hero-name" data-text="Sishir Bharati">
          Sishir Bharati
        </h1>

        <p className="hero-tagline">
          <Typewriter />
        </p>

        <div className="hero-divider">
          <span className="divider-dot" />
          <span className="divider-line" />
          <span className="divider-dot" />
        </div>

        <p className="hero-sub">
          Building intelligent systems from the foothills of Nepal. Turning
          curiosity into code, one commit at a time.
        </p>

        <div className="hero-actions">
          <a href="#projects" className="btn btn-primary">
            <span className="btn-text">View My Work</span>
            <span className="btn-glow" />
          </a>
          <a href="#contact" className="btn btn-ghost">
            Get In Touch
          </a>
        </div>

        <div className="hero-stats">
          <ScrollReveal direction="fade" delay={0.7}>
            <div className="stat-pill">
              <span className="stat-value">5+</span>
              <span className="stat-label">Projects</span>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.8}>
            <div className="stat-pill">
              <span className="stat-value">5+</span>
              <span className="stat-label">Languages</span>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.9}>
            <div className="stat-pill">
              <span className="stat-value">&infin;</span>
              <span className="stat-label">Curiosity</span>
            </div>
          </ScrollReveal>
        </div>
      </div>

      <div className="scroll-indicator">
        <div className="scroll-mouse">
          <div className="scroll-wheel" />
        </div>
        <span>Scroll to explore</span>
      </div>

      <div className="hero-side-line hero-side-left">
        <span /><span /><span />
      </div>
      <div className="hero-side-line hero-side-right">
        <span /><span /><span />
      </div>
    </section>
  );
}
