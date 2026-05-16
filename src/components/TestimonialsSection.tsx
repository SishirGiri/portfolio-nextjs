'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'CEO, TechFlow',
    avatar: 'SJ',
    content: 'NeuroBot AI transformed our customer service. Response times dropped by 80% and customer satisfaction skyrocketed.',
    rating: 5,
  },
  {
    name: 'Michael Chen',
    role: 'CTO, DataMinds',
    avatar: 'MC',
    content: 'The AI automation features are incredible. We automated 90% of our repetitive tasks and saved countless hours.',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'Product Manager, InnovateCo',
    avatar: 'ER',
    content: 'Best AI platform we have ever used. The chatbot understands context better than any other solution we have tried.',
    rating: 5,
  },
  {
    name: 'David Kim',
    role: 'Founder, StartupHub',
    avatar: 'DK',
    content: 'NeuroBot AI helped us scale from 100 to 10,000 users without hiring additional support staff. Amazing ROI!',
    rating: 5,
  },
  {
    name: 'Lisa Thompson',
    role: 'VP Operations, ScaleUp',
    avatar: 'LT',
    content: 'The analytics dashboard provides invaluable insights. We can now make data-driven decisions in real-time.',
    rating: 5,
  },
  {
    name: 'James Wilson',
    role: 'Director of Engineering, TechCorp',
    avatar: 'JW',
    content: 'Integration was seamless. The API is well-documented and the support team is incredibly responsive.',
    rating: 5,
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
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative py-24 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B1020] via-[#111827] to-[#0B1020]" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#4F46E5]/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 glass rounded-full text-[#8B5CF6] font-semibold text-sm mb-4">
            Testimonials
          </span>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">What Our Clients Say</span>
          </h2>
          <p className="text-xl text-[#9CA3AF] max-w-2xl mx-auto">
            Trusted by leading companies worldwide
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              variants={itemVariants}
              whileHover={{ scale: 1.03, y: -5 }}
              className="relative group"
            >
              <div className="glass rounded-2xl p-8 h-full transition-all duration-300 border border-[#8B5CF6]/20 hover:border-[#8B5CF6]/50">
                {/* Quote Icon */}
                <Quote className="w-12 h-12 text-[#8B5CF6]/20 mb-4" />

                {/* Rating */}
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-[#06B6D4] fill-[#06B6D4]" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-[#E5E7EB] mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#06B6D4] to-[#8B5CF6] flex items-center justify-center mr-4">
                    <span className="text-white font-bold">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-[#E5E7EB]">{testimonial.name}</div>
                    <div className="text-sm text-[#9CA3AF]">{testimonial.role}</div>
                  </div>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#8B5CF6]/0 via-[#8B5CF6]/5 to-[#4F46E5]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Auto-scroll Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-16 flex justify-center"
        >
          <div className="flex space-x-2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-3 h-3 rounded-full bg-[#06B6D4]"
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}