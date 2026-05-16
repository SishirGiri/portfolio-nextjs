'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Brain, Zap, Globe, Database, Cloud } from 'lucide-react';

const services = [
  {
    icon: MessageSquare,
    title: 'AI Chatbot Development',
    description: 'Custom intelligent chatbots tailored to your business needs with advanced conversational capabilities.',
  },
  {
    icon: Brain,
    title: 'Machine Learning Solutions',
    description: 'Cutting-edge ML models and algorithms to solve complex business problems and drive innovation.',
  },
  {
    icon: Zap,
    title: 'AI Enterprise Automation',
    description: 'Streamline operations with intelligent automation that learns and adapts to your workflows.',
  },
  {
    icon: MessageSquare,
    title: 'Conversational AI',
    description: 'Natural language understanding and generation for seamless human-computer interactions.',
  },
  {
    icon: Globe,
    title: 'AI API Integration',
    description: 'Seamlessly integrate AI capabilities into your existing applications with our robust APIs.',
  },
  {
    icon: Cloud,
    title: 'Cloud AI Infrastructure',
    description: 'Scalable cloud-based AI infrastructure that grows with your business demands.',
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

export default function ServicesSection() {
  return (
    <section id="services" className="relative py-24 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B1020] via-[#111827] to-[#0B1020]" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#8B5CF6]/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 glass rounded-full text-[#4F46E5] font-semibold text-sm mb-4">
            Our Services
          </span>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">AI-Powered Solutions</span>
          </h2>
          <p className="text-xl text-[#9CA3AF] max-w-2xl mx-auto">
            Comprehensive AI services designed to transform your business operations
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              variants={itemVariants}
              whileHover={{ scale: 1.03, y: -5 }}
              className="relative group"
            >
              <div className="glass rounded-2xl p-8 h-full transition-all duration-300 border border-[#4F46E5]/20 hover:border-[#4F46E5]/50">
                {/* Icon */}
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#4F46E5]/20 to-[#8B5CF6]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <service.icon className="w-8 h-8 text-[#4F46E5]" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold mb-3 text-[#E5E7EB] group-hover:text-[#4F46E5] transition-colors">
                  {service.title}
                </h3>

                {/* Description */}
                <p className="text-[#9CA3AF] leading-relaxed">
                  {service.description}
                </p>

                {/* Hover Effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#4F46E5]/0 via-[#4F46E5]/5 to-[#8B5CF6]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}