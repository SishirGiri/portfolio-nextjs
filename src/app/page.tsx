'use client';

import Link from 'next/link';
import PageShell from '@/components/PageShell';
import HeroSection from '@/components/Hero/HeroSection';
import ScrollReveal from '@/components/ui/ScrollReveal';

const exploreCards = [
  {
    href: '/about',
    icon: '01',
    iconClass: 'p1',
    title: 'About',
    blurb: 'My story, my mission, and the curiosity that drives me to build.',
  },
  {
    href: '/projects',
    icon: '02',
    iconClass: 'p3',
    title: 'Projects',
    blurb: 'A selection of things I have designed, coded, and shipped.',
  },
  {
    href: '/skills',
    icon: '03',
    iconClass: 'p8',
    title: 'Skills',
    blurb: 'The languages, tools, and technologies in my toolkit.',
  },
  {
    href: '/contact',
    icon: '04',
    iconClass: 'p4',
    title: 'Contact',
    blurb: 'Have an idea or just want to say hello? My inbox is open.',
  },
];

export default function Home() {
  return (
    <PageShell>
      <HeroSection />

      <section className="explore">
        <div className="container">
          <ScrollReveal>
            <div className="section-header">
              <span className="section-number">01</span>
              <h2 className="section-title">
                Explore <em>More</em>
              </h2>
              <div className="section-line" />
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <p className="explore-intro">
              Welcome to my corner of the internet. Each section below is its
              own page &mdash; dive in to learn about who I am, what I&apos;ve
              built, the tools I use, and how to get in touch.
            </p>
          </ScrollReveal>

          <div className="explore-grid">
            {exploreCards.map((card, i) => (
              <ScrollReveal key={card.title} direction="up" delay={i * 0.1}>
                <Link href={card.href} className="explore-card">
                  <div className={`explore-card-icon ${card.iconClass}`}>
                    {card.icon}
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.blurb}</p>
                  <span className="explore-card-cta">
                    Visit page <span aria-hidden="true">&rarr;</span>
                  </span>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
