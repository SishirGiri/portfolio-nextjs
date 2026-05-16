'use client';

import { motion } from 'framer-motion';
import { Mail, ArrowRight } from 'lucide-react';

const Github = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015-2.895-.015-3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const Linkedin = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { name: 'Features', href: '#features' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'Services', href: '#services' },
      { name: 'API', href: '#' },
    ],
    Company: [
      { name: 'About', href: '#' },
      { name: 'Blog', href: '#' },
      { name: 'Careers', href: '#' },
      { name: 'Contact', href: '#' },
    ],
    Resources: [
      { name: 'Documentation', href: '#' },
      { name: 'Help Center', href: '#faq' },
      { name: 'Community', href: '#' },
      { name: 'Status', href: '#' },
    ],
    Legal: [
      { name: 'Privacy Policy', href: '#' },
      { name: 'Terms of Service', href: '#' },
      { name: 'Cookie Policy', href: '#' },
      { name: 'GDPR', href: '#' },
    ],
  };

  const socialLinks = [
    { icon: Github, href: 'https://github.com/SishirGiri', label: 'GitHub' },
    { icon: Linkedin, href: 'https://www.linkedin.com/in/sishir-giri-b620202a4/', label: 'LinkedIn' },
    { icon: Mail, href: 'mailto:girisishir4@gmail.com', label: 'Email' },
  ];

  return (
    <footer className="relative bg-[#0B1020] border-t border-[#8B5CF6]/20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#111827]/50" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#06B6D4] to-[#8B5CF6] flex items-center justify-center">
                  <span className="text-white font-bold text-xl">N</span>
                </div>
                <span className="text-2xl font-bold gradient-text">NeuroBot AI</span>
              </div>
              
              <p className="text-[#9CA3AF] mb-6 leading-relaxed">
                Transform your business with intelligent AI automation. Build smarter chatbots, 
                automate workflows, and gain valuable insights with our cutting-edge platform.
              </p>

              {/* Social Links */}
              <div className="flex space-x-4">
                {socialLinks.map((social) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 glass rounded-lg flex items-center justify-center border border-[#8B5CF6]/20 hover:border-[#06B6D4] hover:bg-[#06B6D4]/10 transition-all duration-300"
                  >
                    <social.icon className="w-5 h-5 text-[#9CA3AF] hover:text-[#06B6D4]" />
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links], index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <h3 className="text-[#E5E7EB] font-semibold mb-4">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-[#9CA3AF] hover:text-[#06B6D4] transition-colors duration-300 flex items-center group"
                    >
                      {link.name}
                      <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Newsletter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 glass rounded-2xl p-8 border border-[#8B5CF6]/20"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-[#E5E7EB] mb-2">Stay Updated</h3>
              <p className="text-[#9CA3AF]">
                Subscribe to our newsletter for the latest AI insights and product updates.
              </p>
            </div>
            <div className="flex w-full md:w-auto gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-80 px-6 py-3 bg-[#0B1020] border border-[#8B5CF6]/30 rounded-xl text-[#E5E7EB] placeholder-[#9CA3AF] focus:outline-none focus:border-[#06B6D4] transition-colors"
              />
              <button className="px-6 py-3 bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </motion.div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 pt-8 border-t border-[#8B5CF6]/20 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <p className="text-[#9CA3AF] text-sm">
            © {currentYear} NeuroBot AI. All rights reserved.
          </p>
          <div className="flex items-center space-x-6 text-sm text-[#9CA3AF]">
            <a href="#" className="hover:text-[#06B6D4] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#06B6D4] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#06B6D4] transition-colors">Cookies</a>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}