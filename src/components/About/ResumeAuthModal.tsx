'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn, useSession } from 'next-auth/react';
import { X, ShieldCheck, AlertCircle, Download, Mail } from 'lucide-react';

/**
 * Google-login modal that gates the resume download.
 *
 * Flow: open modal → click "Continue with Google" → Google OAuth → redirect
 * back to /about → session appears → modal auto-triggers the protected
 * download (/api/resume) and closes. If sign-in fails or is cancelled, an
 * error is shown and no download ever starts. The resume URL is never
 * revealed until a valid session exists.
 *
 * Phone numbers and passwords are NEVER requested or stored — identity is
 * fully delegated to Google.
 */
export default function ResumeAuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);

  // As soon as a session appears, fetch the protected resume and dismiss.
  useEffect(() => {
    if (status !== 'authenticated' || !session) return;
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/resume');
      if (cancelled) return;
      if (!res.ok) {
        setError('Could not start the download. Please try again.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Sishir-Bharati-Resume.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onClose();
    })();
    return () => {
      cancelled = true;
    };
  }, [session, status, onClose]);

  // Reset error when reopening.
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const handleGoogle = () => {
    setError(null);
    // callbackUrl returns the user to /about after Google auth.
    signIn('google', { callbackUrl: '/about' });
  };

  // Lock background scroll while open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="resume-auth-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Sign in to download resume"
        >
          <motion.div
            className="resume-auth-modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="resume-auth-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="resume-auth-icon">
              <Download size={26} />
            </div>

            <h3 className="resume-auth-title">Download Resume</h3>
            <p className="resume-auth-desc">
              Sign in with Google to access the resume. Your identity is handled
              securely by Google — no passwords or phone numbers are collected here.
            </p>

            <button
              className="resume-auth-google"
              onClick={handleGoogle}
              disabled={status === 'loading'}
            >
              <GoogleIcon />
              {status === 'loading' ? 'Connecting…' : 'Continue with Google'}
            </button>

            <div className="resume-auth-note">
              <ShieldCheck size={13} />
              <span>Secure authentication · No data stored on this site</span>
            </div>

            {/* Divider */}
            <div className="resume-auth-divider" aria-hidden="true">
              <span className="resume-auth-divider-line" />
              <span className="resume-auth-divider-text">OR</span>
              <span className="resume-auth-divider-line" />
            </div>

            {/* Alternative: contact directly */}
            <div className="resume-auth-contact">
              <h4 className="resume-auth-contact-title">Prefer not to sign in?</h4>
              <p className="resume-auth-contact-desc">
                Contact Sishir directly to receive the latest version of my CV.
              </p>

              <div className="resume-auth-contact-actions">
                <motion.a
                  href="mailto:girisishir4@gmail.com?subject=Request%20for%20Sishir%27s%20Resume"
                  className="resume-auth-contact-btn primary"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  aria-label="Email Sishir"
                >
                  <Mail size={16} />
                  <span>Email Sishir</span>
                </motion.a>

                <div className="resume-auth-contact-row">
                  <motion.a
                    href="https://www.linkedin.com/in/sishir-giri-b620202a4/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resume-auth-contact-btn ghost"
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    aria-label="Contact Sishir on LinkedIn"
                    title="LinkedIn"
                  >
                    <LinkedinIcon />
                    <span>LinkedIn</span>
                  </motion.a>
                  <motion.a
                    href="/contact"
                    className="resume-auth-contact-btn ghost"
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                    aria-label="Open the contact page"
                  >
                    <span>Contact page</span>
                  </motion.a>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="resume-auth-error"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <AlertCircle size={14} /> {error}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Inline Google "G" mark so we don't add an icon dependency. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 12.9 3 4 11.9 4 23s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 34.3 26.7 35 24 35c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9.6 38.6 16.2 43 24 43z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.9 36.5 44 31 44 23c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

/** Inline LinkedIn mark (lucide 1.16 has no brand icons). */
function LinkedinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}
