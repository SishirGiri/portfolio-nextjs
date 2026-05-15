"use client";

import { useState, useRef } from "react";
import emailjs from "@emailjs/browser";
import { SITE, SOCIAL_LINKS } from "@/lib/constants";

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.4.6A3 3 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.8.6 9.4.6 9.4.6s7.6 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8zM9.8 15.5v-7l6.2 3.5-6.2 3.5z" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.5 0h-3v16.2a3.3 3.3 0 1 1-3.3-3.3c.3 0 .6 0 .9.1v-3.1a6.4 6.4 0 1 0 5.4 6.3V8.4c1.2.9 2.6 1.5 4.1 1.6V6.9c-2.3-.2-4.1-2.1-4.1-4.4z" />
  </svg>
);

const iconMap: Record<string, () => React.ReactElement> = {
  github: GitHubIcon,
  linkedin: LinkedInIcon,
  youtube: YouTubeIcon,
  tiktok: TikTokIcon,
};

export default function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;

    setSending(true);
    setFeedback(null);

    try {
      await emailjs.sendForm(
        SITE.emailjsServiceId,
        SITE.emailjsTemplateId,
        formRef.current,
        SITE.emailjsPublicKey
      );
      setFeedback({
        type: "success",
        message: "Message sent successfully!",
      });
      formRef.current.reset();
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to send message. Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="contact-layout">
      <div className="contact-info">
        <ScrollReveal direction="left">
          <div className="contact-card">
            <h3>Let&apos;s Build Something Together</h3>
            <p>
              Currently open to internships, collaborative projects, and learning
              opportunities.
            </p>

            <div className="contact-details">
              <div className="contact-item">
                <div className="ci-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <span className="ci-label">Email</span>
                  <a href={`mailto:${SITE.email}`} className="ci-value">
                    {SITE.email}
                  </a>
                </div>
              </div>
              <div className="contact-item">
                <div className="ci-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <span className="ci-label">Location</span>
                  <span className="ci-value">Pokhara, Nepal &#x1F1F3;&#x1F1F5;</span>
                </div>
              </div>
            </div>

            <div className="social-links">
              {SOCIAL_LINKS.map((link) => {
                const Icon = iconMap[link.icon];
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener"
                    className="social-btn"
                    aria-label={link.label}
                  >
                    {Icon && <Icon />}
                    <span>{link.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </ScrollReveal>
      </div>

      <ScrollReveal direction="right">
        <form
          ref={formRef}
          className="contact-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="form-group">
            <label htmlFor="name">Your Name</label>
            <div className="input-wrap">
              <input
                type="text"
                id="name"
                name="from_name"
                placeholder="Sishir Giri"
                required
              />
              <div className="input-line" />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrap">
              <input
                type="email"
                id="email"
                name="from_email"
                placeholder="sishir@example.com"
                required
              />
              <div className="input-line" />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <div className="input-wrap">
              <input
                type="text"
                id="subject"
                name="subject"
                placeholder="Project collaboration"
              />
              <div className="input-line" />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="message">Message</label>
            <div className="input-wrap">
              <textarea
                id="message"
                name="message"
                rows={5}
                placeholder="Tell me about your idea..."
                required
              />
              <div className="input-line" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={sending}>
            <span className="btn-text">{sending ? "Sending..." : "Send Message"}</span>
            {!sending && <span className="btn-icon">&rarr;</span>}
            <span className="btn-glow" />
          </button>
          {feedback && (
            <div className={`form-feedback ${feedback.type}`}>
              {feedback.message}
            </div>
          )}
        </form>
      </ScrollReveal>
    </div>
  );
}

function ScrollReveal({
  children,
  direction,
}: {
  children: React.ReactNode;
  direction: "left" | "right" | "up" | "fade";
}) {
  return <div className={`reveal-${direction}`}>{children}</div>;
}
