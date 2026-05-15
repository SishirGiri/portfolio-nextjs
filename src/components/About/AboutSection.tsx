import ScrollReveal from "@/components/ui/ScrollReveal";

export default function AboutSection() {
  return (
    <section id="about" className="section about">
      <div className="container">
        <ScrollReveal>
          <div className="section-header">
            <span className="section-number">01</span>
            <h2 className="section-title">
              About <em>Me</em>
            </h2>
            <div className="section-line" />
          </div>
        </ScrollReveal>

        <div className="about-grid">
          <div className="about-visual">
            <ScrollReveal direction="left">
              <div className="avatar-frame">
                <div className="avatar-inner">
                  <div className="avatar-initials">SB</div>
                  <div className="orbit-ring ring-1" />
                  <div className="orbit-ring ring-2" />
                  <div className="frame-corner c-tl" />
                  <div className="frame-corner c-tr" />
                  <div className="frame-corner c-bl" />
                  <div className="frame-corner c-br" />
                </div>
                <div className="avatar-glow" />
              </div>

              <div className="info-card card-location">
                <span>&#x1F4CD;</span> Pokhara, Nepal
              </div>
              <div className="info-card card-status">
                <span className="pulse-dot" /> Learning &amp; Building
              </div>
            </ScrollReveal>
          </div>

          <div className="about-text">
            <ScrollReveal direction="right">
              <h3 className="about-headline">
                Turning <span className="neon-text">curiosity</span> into
                <br />
                real-world solutions.
              </h3>

              <p>
                I&apos;m a passionate student from <strong>Nepal</strong>, on a
                mission to master programming and artificial intelligence. What
                started as a question &mdash; <em>&quot;how do machines think?&quot;</em>{" "}
                &mdash; turned into a deep obsession with code, algorithms, and
                the limitless potential of AI.
              </p>
              <p>
                I work primarily with{" "}
                <strong>C, JavaScript, HTML/CSS</strong>, and I&apos;m actively
                expanding into <strong>Python and machine learning</strong>. I
                believe the best way to learn is to build &mdash; so every
                concept I study becomes a project.
              </p>
              <p>
                Outside of coding, I explore Kathmandu&apos;s tech community,
                contribute to open-source, and dream of building AI tools that
                solve real problems for people in South Asia and beyond.
              </p>

              <div className="about-tags">
                <span className="tag"># Open Source</span>
                <span className="tag"># AI Research</span>
                <span className="tag"># Problem Solver</span>
                <span className="tag"># Nepal Tech</span>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
