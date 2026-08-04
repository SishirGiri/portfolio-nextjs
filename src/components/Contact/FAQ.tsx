'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ScrollReveal from '@/components/ui/ScrollReveal';

const FAQS = [
  {
    q: 'How quickly do you reply?',
    a: 'Usually within 24 hours. I check my inbox daily and prioritize timely, clear communication so your project never stalls waiting on me.',
  },
  {
    q: 'Do you accept freelance work?',
    a: 'Yes. I am open to freelance projects of all sizes — from landing pages and audits to full web applications. Reach out via the form and I will respond within 24 hours.',
  },
  {
    q: 'Can you help with Technical SEO?',
    a: 'Absolutely. Technical SEO is one of my focus areas — site audits, performance optimization, structured data, on-page SEO, and measurable ranking improvements.',
  },
  {
    q: 'Do you build complete websites?',
    a: 'Yes. I work across the stack with React, Next.js, and Node.js, and I am comfortable with both front-end UI and back-end integration.',
  },
  {
    q: 'Are you available for internships?',
    a: 'Yes, I am actively seeking internship opportunities in software development, SEO, and AI where I can contribute and continue growing as an engineer.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="faq">
      <ScrollReveal direction="up">
        <div className="faq-header">
          <span className="section-number">03</span>
          <h2 className="faq-title">
            Frequently Asked <em>Questions</em>
          </h2>
        </div>
      </ScrollReveal>

      <div className="faq-list">
        {FAQS.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <ScrollReveal key={item.q} direction="up" delay={i * 0.05}>
              <div className={`faq-item ${isOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  className="faq-question"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                >
                  <span>{item.q}</span>
                  <span className="faq-icon" aria-hidden="true">+</span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-answer-${i}`}
                      className="faq-answer-wrap"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <p className="faq-answer">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </div>
  );
}
