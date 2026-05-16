'use client';

import { motion } from 'framer-motion';
import { Mail, ArrowRight, Github, Linkedin } from 'lucide-react';

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
    { icon: Github, href: 'https://github.com/Sishir-giri', label: 'GitHub' },
    { icon: Linkedin, href: 'https://www.linkedin.com/in/sishir-giri-b620202a4/', label: 'LinkedIn' },
    { icon: Mail, href: 'mailto:contact@neurobot.ai', label: 'Email' },
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