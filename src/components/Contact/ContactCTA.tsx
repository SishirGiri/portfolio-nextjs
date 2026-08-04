'use client';

import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { SITE } from '@/lib/constants';

export default function ContactCTA() {
  return (
    <ScrollReveal direction="up">
      <div className="contact-cta">
        <div className="contact-cta-glow" aria-hidden="true" />
        <div className="contact-cta-content">
          <span className="section-number">04</span>
          <h2 className="contact-cta-title">
            Let&apos;s Create Something <em>Amazing</em>
          </h2>
          <p className="contact-cta-sub">
            Whether you&apos;re looking for a developer, Technical SEO specialist,
            or collaborator, I&apos;m always excited to discuss new ideas.
          </p>
          <div className="contact-cta-btns">
            <a href={`mailto:${SITE.email}`} className="btn btn-primary">
              <span className="btn-text">Send Email</span>
              <span className="btn-icon">&rarr;</span>
              <span className="btn-glow" />
            </a>
            <Link href="/projects" className="btn btn-ghost">
              <span className="btn-text">View Projects</span>
            </Link>
            <Link href="/about" className="btn btn-ghost">
              <span className="btn-text">Download Resume</span>
            </Link>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}
