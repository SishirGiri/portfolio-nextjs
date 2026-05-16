'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Cpu, Zap, BarChart3, Radio, Globe, ExternalLink } from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'AI Chatbot',
    description: 'Intelligent conversational AI that understands context and provides personalized responses.',
    special: true,
  },
  {
    icon: Cpu,
    title: 'NLP Processing',
    description: 'Advanced natural language processing for accurate text analysis and understanding.',
  },
  {
    icon: Zap,
    title: 'Smart Automation',
    description: 'Automate repetitive tasks with intelligent workflows and decision-making capabilities.',
  },
  {
    icon: BarChart3,
    title: 'AI Analytics',
    description: 'Gain insights with AI-powered analytics and predictive modeling for your data.',
  },
  {
    icon: Radio,
    title: 'Real-Time Responses',
    description: 'Lightning-fast responses with sub-second latency for seamless user experiences.',
  },
  {
    icon: Globe,
    title: 'API Integration',
    description: 'Easy integration with existing systems through our robust and flexible API.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B1020] via-[#111827] to-[#0B1020]" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#06B6D4]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 glass rounded-full text-[#06B6D4] font-semibold text-sm mb-4">
            Powerful Features
          </span>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">Everything You Need</span>
          </h2>
          <p className="text-xl text-[#9CA3AF] max-w-2xl mx-auto">
            Comprehensive AI tools and features to transform your business operations
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -5 }}
              className="relative group"
            >
              <div className={`glass rounded-2xl p-8 h-full transition-all duration-300 ${
                feature.special ? 'border-[#06B6D4]/50 glow-cyan' : 'border-[#8B5CF6]/20'
              } group-hover:border-[#06B6D4]/50`}>
                {/* Icon */}
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${
                  feature.special ? 'bg-[#06B6D4]/20' : 'bg-[#8B5CF6]/20'
                }`}>
                  <feature.icon className={`w-8 h-8 ${
                    feature.special ? 'text-[#06B6D4]' : 'text-[#8B5CF6]'
                  }`} />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold mb-3 text-[#E5E7EB] group-hover:text-[#06B6D4] transition-colors">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-[#9CA3AF] mb-6 leading-relaxed">
                  {feature.description}
                </p>

                {/* Special Buttons for AI Chatbot */}
                {feature.special && (
                  <div className="flex flex-col gap-3">
                     <a
                       href="http://localhost:3000"
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex items-center justify-center gap-2 px-6 py-3 bg-[#06B6D4]/20 hover:bg-[#06B6D4]/30 rounded-xl font-semibold transition-all duration-300 border border-[#06B6D4]/30 hover:border-[#06B6D4] hover:glow-cyan group/btn"
                      >
                        <span>View Project</span>
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-opacity ml-2" />
                      </a>
                     <a
                       href="http://localhost:3000"
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/50 group/btn2"
                     >
                       <span>Live Demo</span>
                       <ExternalLink className="w-4 h-4 group-hover/btn2:translate-x-1 transition-transform" />
                     </a>
                  </div>
                )}
              </div>

              {/* Glow Effect */}
              {feature.special && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#06B6D4]/0 via-[#06B6D4]/10 to-[#06B6D4]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl" />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}