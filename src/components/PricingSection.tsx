'use client';

import { motion } from 'framer-motion';
import { Check, Zap, Users, MessageSquare, BarChart3, Shield, Headphones, Zap as ZapIcon } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: 29,
    features: [
      '5,000 messages/month',
      '1 chatbot',
      'Basic analytics',
      'Email support',
      'API access',
    ],
    popular: false,
  },
  {
    name: 'Pro',
    price: 99,
    features: [
      '50,000 messages/month',
      '5 chatbots',
      'Advanced analytics',
      'Priority support',
      'Full API access',
      'Custom integrations',
      'Team collaboration',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 299,
    features: [
      'Unlimited messages',
      'Unlimited chatbots',
      'Enterprise analytics',
      '24/7 dedicated support',
      'Custom AI models',
      'White-label solution',
      'SSO & advanced security',
      'Dedicated account manager',
    ],
    popular: false,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
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

export default function PricingSection() {
  return (
    <section id="pricing" className="relative py-24 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#111827] via-[#0B1020] to-[#111827]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#06B6D4]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl" />

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
            Pricing Plans
          </span>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">Choose Your Plan</span>
          </h2>
          <p className="text-xl text-[#9CA3AF] max-w-2xl mx-auto">
            Flexible pricing options to match your business needs
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -10 }}
              className="relative group"
            >
              {plan.popular && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10"
                >
                  <div className="px-4 py-1 bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] rounded-full text-sm font-semibold text-white">
                    Most Popular
                  </div>
                </motion.div>
              )}

              <div className={`relative h-full rounded-2xl p-8 transition-all duration-300 ${
                plan.popular
                  ? 'bg-gradient-to-br from-[#06B6D4]/20 to-[#8B5CF6]/20 border-2 border-[#06B6D4] glow-cyan'
                  : 'glass border border-[#8B5CF6]/20 group-hover:border-[#8B5CF6]/50'
              }`}>
                {/* Plan Name */}
                <h3 className={`text-2xl font-bold mb-2 ${
                  plan.popular ? 'text-[#06B6D4]' : 'text-[#E5E7EB]'
                }`}>
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mb-6">
                  <span className={`text-5xl font-bold ${
                    plan.popular ? 'text-[#06B6D4]' : 'text-[#E5E7EB]'
                  }`}>
                    ${plan.price}
                  </span>
                  <span className="text-[#9CA3AF]">/month</span>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                        plan.popular ? 'text-[#06B6D4]' : 'text-[#8B5CF6]'
                      }`} />
                      <span className="text-[#9CA3AF]">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] text-white hover:shadow-lg hover:shadow-cyan-500/50'
                      : 'glass text-[#E5E7EB] hover:bg-[#8B5CF6]/20'
                  }`}
                >
                  Get Started
                </button>

                {/* Hover Glow Effect */}
                {plan.popular && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#06B6D4]/0 via-[#06B6D4]/10 to-[#8B5CF6]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl" />
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}