"use client";

import { useState, useRef, useCallback } from "react";
import { SITE } from "@/lib/constants";
import ScrollReveal from "@/components/ui/ScrollReveal";

const LANGUAGES = [
  { flag: "🇬🇧", name: "English", level: "Fluent", dataLevel: "fluent" },
  { flag: "🇳🇵", name: "Nepali", level: "Native", dataLevel: "native" },
  { flag: "🇮🇳", name: "Hindi", level: "Fluent", dataLevel: "fluent" },
  { flag: "🇩🇪", name: "German", level: "Learning", dataLevel: "learning" },
  { flag: "🇰🇷", name: "Korean", level: "Learning", dataLevel: "learning" },
];

const MAX_MESSAGE = 500;

export default function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msgLen, setMsgLen] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;

    const form = formRef.current;
    const name = (form.querySelector("#name") as HTMLInputElement).value.trim();
    const email = (form.querySelector("#email") as HTMLInputElement).value.trim();
    const message = (form.querySelector("#message") as HTMLTextAreaElement).value.trim();

    if (!name) {
      setFeedback({ type: "error", message: "Please enter your name." });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFeedback({ type: "error", message: "Please enter a valid email address." });
      return;
    }
    if (!message) {
      setFeedback({ type: "error", message: "Please write a message." });
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      const res = await fetch(SITE.formspreeUrl, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setFeedback({ type: "success", message: "Message sent successfully!" });
        form.reset();
        setMsgLen(0);
      } else {
        setFeedback({ type: "error", message: "Failed to send message. Please try again." });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to send message. Please try again." });
    } finally {
      setSending(false);
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SITE.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  // Magnetic button: translate a few px toward the cursor, spring back on leave.
  const handleMagneticMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * 0.15}px, ${y * 0.25}px)`;
  }, []);
  const handleMagneticLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = "";
  }, []);

  return (
    <div className="contact-layout">
      {/* ───────────── LEFT — premium profile card (35%) ───────────── */}
      <ScrollReveal direction="left">
        <div className="profile-card">
          {/* Contact info rows */}
          <div className="profile-contact">
            <div className="profile-contact-row">
              <span className="profile-contact-icon" aria-hidden="true">📍</span>
              <span className="profile-contact-label">Pokhara, Nepal</span>
            </div>
            <div className="profile-contact-row">
              <span className="profile-contact-icon" aria-hidden="true">📧</span>
              <a href={`mailto:${SITE.email}`} className="profile-contact-label profile-contact-link">
                {SITE.email}
              </a>
              <button
                type="button"
                className="copy-btn"
                onClick={handleCopyEmail}
                aria-label="Copy email address"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <div className="profile-contact-row">
              <span className="profile-contact-icon" aria-hidden="true">🌍</span>
              <span className="profile-contact-label">GMT +5:45 (Nepal Time)</span>
            </div>
            <div className="profile-contact-row">
              <span className="profile-contact-icon" aria-hidden="true">⏱</span>
              <span className="profile-contact-label">Replies within 24 hours</span>
            </div>
          </div>

          {/* Languages */}
          <div className="info-block">
            <span className="info-block-title">🗣 Languages</span>
            <ul className="info-lang-list">
              {LANGUAGES.map((l) => (
                <li key={l.name} className="info-lang" data-level={l.dataLevel}>
                  <span className="info-lang-flag" aria-hidden="true">{l.flag}</span>
                  <span className="info-lang-info">
                    <span className="info-lang-name">{l.name}</span>
                    <span className="info-lang-level">{l.level}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </ScrollReveal>

      {/* ───────────── RIGHT — form (65%) ───────────── */}
      <ScrollReveal direction="right">
        <form ref={formRef} className="contact-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-wrap">
              <input type="text" id="name" name="name" placeholder="Sishir Giri" required />
              <div className="input-line" />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrap">
              <input type="email" id="email" name="email" placeholder="sishir@example.com" required />
              <div className="input-line" />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <div className="input-wrap">
              <input type="text" id="subject" name="subject" placeholder="Project collaboration" />
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
                maxLength={MAX_MESSAGE}
                onChange={(e) => setMsgLen(e.target.value.length)}
              />
              <div className="input-line" />
            </div>
            <div className="char-counter" aria-live="polite">
              <span>{msgLen}/{MAX_MESSAGE}</span>
            </div>
          </div>
          <button
            ref={submitBtnRef}
            type="submit"
            className="btn btn-primary btn-full magnetic-btn"
            disabled={sending}
            onMouseMove={handleMagneticMove}
            onMouseLeave={handleMagneticLeave}
          >
            <span className="btn-text">{sending ? "Sending..." : "Send Message"}</span>
            {!sending && <span className="btn-icon">&rarr;</span>}
            <span className="btn-glow" />
          </button>
          {feedback && (
            <div className={`form-feedback ${feedback.type}`} role="status">
              {feedback.message}
            </div>
          )}
        </form>
      </ScrollReveal>
    </div>
  );
}
