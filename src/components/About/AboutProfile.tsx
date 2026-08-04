'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { MapPin, Download, GraduationCap } from 'lucide-react';
import { scaleIn, fadeIn, inViewport } from './motion';
import ResumeAuthModal from './ResumeAuthModal';

/** Starts the protected download (only succeeds when authenticated). */
async function downloadResume() {
  const res = await fetch('/api/resume');
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Sishir-Bharati-Resume.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * 2. Profile Area — glowing avatar, availability badge, role, location,
 * and a Resume Download button gated behind Google login. If the visitor
 * is already signed in, the download starts immediately; otherwise the
 * login modal opens first.
 */
export default function AboutProfile() {
  const { status } = useSession();
  const [authOpen, setAuthOpen] = useState(false);

  const handleDownload = async () => {
    if (status === 'authenticated') {
      await downloadResume();
    } else {
      setAuthOpen(true);
    }
  };

  return (
    <section className="about-section">
      <div className="container">
        <motion.div
          className="about-profile"
          initial="hidden"
          whileInView="visible"
          viewport={inViewport}
        >
          <motion.div className="about-avatar" variants={scaleIn}>
            <div className="about-avatar-glow" />
            <div className="about-avatar-ring" />
            <div className="about-avatar-mask" />
            <div className="about-avatar-inner">SB</div>
          </motion.div>

          <motion.div className="about-profile-meta" variants={fadeIn}>
            <span className="about-available">
              <span className="pulse-dot" /> Available for Opportunities
            </span>
            <span className="about-profile-role">Computer Science Student</span>
            <span className="about-profile-loc">
              <MapPin /> Pokhara, Nepal
            </span>
            <span className="about-profile-loc" style={{ gap: '7px' }}>
              <GraduationCap style={{ width: 15, height: 15, color: 'var(--cyan)' }} />
              Aspiring Software Engineer
            </span>

            <motion.button
              type="button"
              onClick={handleDownload}
              className="btn btn-primary"
              whileHover={{ y: -3 }}
              transition={{ duration: 0.25 }}
              style={{ marginTop: '8px' }}
            >
              <Download size={16} /> Download Resume
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      <ResumeAuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  );
}
