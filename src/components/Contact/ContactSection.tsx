'use client';

import { motion } from 'framer-motion';
import ScrollReveal from '@/components/ui/ScrollReveal';
import ContactBackground from './ContactBackground';
import ContactForm from './ContactForm';
import WhyWorkWithMe from './WhyWorkWithMe';
import FAQ from './FAQ';
import ContactCTA from './ContactCTA';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function ContactSection() {
  return (
    <section id="contact" className="section contact">
      <ContactBackground />

      <div className="container contact-container">
        {/* §1 — HERO */}
        <div className="contact-hero">
          <ScrollReveal direction="up">
            <span className="section-number">01</span>
          </ScrollReveal>
          <motion.h1
            className="contact-hero-title"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
          >
            Let&apos;s Build Something <em>Amazing</em> Together
          </motion.h1>
          <ScrollReveal direction="up" delay={0.1}>
            <p className="contact-hero-sub">
              Whether it&apos;s a software project, Technical SEO consultation,
              freelance opportunity, internship, or collaboration, I&apos;d love
              to hear from you.
            </p>
          </ScrollReveal>
        </div>

        {/* §2 — CONTACT LAYOUT (profile card + form) */}
        <ContactForm />

        {/* §3 — WHY WORK WITH ME */}
        <WhyWorkWithMe />

        {/* §4 — FAQ */}
        <FAQ />

        {/* §5 — LET'S CONNECT CTA */}
        <ContactCTA />
      </div>
    </section>
  );
}
