'use client';

import { motion } from 'framer-motion';
import { Code2, Rocket, Globe, Brain, GraduationCap, Clapperboard, Search, TrendingUp } from 'lucide-react';
import AboutSectionHead from './AboutSectionHead';
import { fadeLeft, fadeRight, inViewport } from './motion';

const STORY = [
  {
    tag: 'The Beginning',
    title: 'Started Learning Programming',
    desc: 'Curiosity about how machines think led me to write my first lines of code — and I was hooked instantly.',
    icon: Code2,
    variant: 'left',
  },
  {
    tag: '2024 · Foundations',
    title: 'Studied Web Development',
    desc: 'Completed a Web Development Bootcamp and earned certifications in Python for Everyone, JavaScript Essentials, and Responsive Web Design (freeCodeCamp). Every concept I studied became a small project.',
    icon: GraduationCap,
    variant: 'right',
  },
  {
    tag: '+2 Management',
    title: 'Completed My Schooling',
    desc: 'Finished my +2 Management at Gurukul Bidhya Sadan, Pokhara — building the discipline and structured thinking I now bring into software.',
    icon: Rocket,
    variant: 'left',
  },
  {
    tag: 'First Builds',
    title: 'Built Real Projects',
    desc: 'Shipped Share Master (a share-market platform with dashboard), an E-Commerce site with Firebase auth & checkout, and an AI-assisted Calculator — learning full stack development hands-on.',
    icon: Globe,
    variant: 'right',
  },
  {
    tag: '2025 · University',
    title: 'Started Bachelor in IT (BIT)',
    desc: 'Began my Bachelor in Information Technology in Pokhara, formally diving into computer science, algorithms, and modern software development.',
    icon: Brain,
    variant: 'left',
  },
  {
    tag: 'Creative Step',
    title: 'Video Editing with CapCut',
    desc: 'Started creating and editing engaging short-form and social media content with CapCut — sharpening my eye for pacing, storytelling, and what keeps an audience watching.',
    icon: Clapperboard,
    variant: 'right',
  },
  {
    tag: 'Now · Current Role',
    title: 'SEO Specialist',
    desc: 'Currently working in Search Engine Optimization — focused on improving website visibility and search rankings through keyword research, on-page optimization, technical SEO, and content optimization to grow organic traffic.',
    icon: Search,
    variant: 'left',
  },
  {
    tag: 'Next Chapter',
    title: 'Current Professional Growth',
    desc: 'Blending my development skills with hands-on SEO and content work — building and optimizing websites that are both technically sound and easy to discover, while I continue learning through my BIT studies.',
    icon: TrendingUp,
    variant: 'right',
  },
];

/** 3. My Story — animated alternating timeline of my journey. */
export default function AboutStory() {
  return (
    <section className="about-section alt">
      <div className="container">
        <AboutSectionHead number="01" title="My" highlight="Story" />

        <div className="about-timeline">
          <div className="about-timeline-line" />
          {STORY.map((s, i) => {
            const v = s.variant === 'left' ? fadeLeft : fadeRight;
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                className="about-tl-item"
                variants={v}
                initial="hidden"
                whileInView="visible"
                viewport={inViewport}
              >
                <span className="about-tl-dot" />
                <div className="about-tl-card about-glass">
                  <span className="about-tl-icon">
                    <Icon />
                  </span>
                  <span className="about-tl-tag">{s.tag}</span>
                  <h3 className="about-tl-title">{s.title}</h3>
                  <p className="about-tl-desc">{s.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
