'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Bot, Zap, Lock, CreditCard, Users, MessageSquare, Database } from 'lucide-react';

const faqs = [
  {
    question: 'What is NeuroBot AI?',
    answer: 'NeuroBot AI is an advanced AI-powered platform that provides intelligent chatbots, natural language processing, and enterprise automation solutions. Our platform uses cutting-edge machine learning to deliver exceptional conversational experiences and streamline business operations.',
    icon: HelpCircle,
  },
  {
    question: 'How does the AI chatbot work?',
    answer: 'Our AI chatbot uses advanced natural language understanding (NLU) and machine learning to comprehend user intent, context, and sentiment. It learns from interactions to improve responses over time, providing personalized and accurate support 24/7.',
    icon: Bot,
  },
  {
    question: 'Can I integrate NeuroBot AI with my existing systems?',
    answer: 'Yes! NeuroBot AI offers robust API integrations and pre-built connectors for popular platforms like Slack, Microsoft Teams, CRM systems, and custom applications. Our documentation makes integration quick and straightforward.',
    icon: Zap,
  },
  {
    question: 'Is my data secure with NeuroBot AI?',
    answer: 'Absolutely. We implement enterprise-grade security measures including end-to-end encryption, SOC 2 compliance, GDPR compliance, and regular security audits. Your data is stored in secure, isolated environments with strict access controls.',
    icon: Lock,
  },
  {
    question: 'What pricing plans are available?',
    answer: 'We offer flexible pricing plans: Starter ($29/month), Pro ($99/month), and Enterprise (custom). Each plan includes different message limits, chatbot counts, and features. All plans include our core AI capabilities and API access.',
    icon: CreditCard,
  },
  {
    question: 'How do I get started?',
    answer: 'Getting started is easy! Simply sign up for an account, choose your plan, and follow our intuitive setup wizard. You can have your first AI chatbot up and running in minutes. Our support team is available 24/7 to help you get the most out of NeuroBot AI.',
    icon: Users,
  },
  {
    question: 'What kind of support do you offer?',
    answer: 'We provide comprehensive support including email, live chat, and phone support (depending on your plan). Pro and Enterprise customers get priority support with dedicated account managers. Our extensive documentation and community forums are also available.',
    icon: MessageSquare,
  },
  {
    question: 'Can I customize the AI models?',
    answer: 'Yes! Enterprise customers can fine-tune AI models on their own data, create custom responses, and build specialized chatbots for different use cases. Our platform provides tools for training, testing, and deploying custom AI models.',
    icon: Database,
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="relative py-24 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#111827] via-[#0B1020] to-[#111827]" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#06B6D4]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 glass rounded-full text-[#4F46E5] font-semibold text-sm mb-4">
            FAQ
          </span>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">Frequently Asked Questions</span>
          </h2>
          <p className="text-xl text-[#9CA3AF] max-w-2xl mx-auto">
            Everything you need to know about NeuroBot AI
          </p>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={faq.question}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <div
                className={`glass rounded-2xl overflow-hidden transition-all duration-300 border ${
                  openIndex === index
                    ? 'border-[#06B6D4] glow-cyan'
                    : 'border-[#8B5CF6]/20 hover:border-[#8B5CF6]/50'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        openIndex === index
                          ? 'bg-[#06B6D4]/20'
                          : 'bg-[#8B5CF6]/20'
                      }`}
                    >
                      <faq.icon
                        className={`w-6 h-6 ${
                          openIndex === index ? 'text-[#06B6D4]' : 'text-[#8B5CF6]'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-lg font-semibold ${
                        openIndex === index ? 'text-[#06B6D4]' : 'text-[#E5E7EB]'
                      }`}
                    >
                      {faq.question}
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown
                      className={`w-6 h-6 ${
                        openIndex === index ? 'text-[#06B6D4]' : 'text-[#9CA3AF]'
                      }`}
                    />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-2">
                        <div className="pl-16 text-[#9CA3AF] leading-relaxed">
                          {faq.answer}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}