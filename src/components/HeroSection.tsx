'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Play, ArrowRight, Bot, Cpu, Zap, BarChart3, MessageSquare, Globe } from 'lucide-react';

export default function HeroSection() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useSpring(useTransform(scrollY, [0, 1000], [0, 300]), { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  const floatingIcons = [
    { Icon: Bot, delay: 0, x: -200, y: -100 },
    { Icon: Cpu, delay: 1, x: 200, y: -150 },
    { Icon: Zap, delay: 2, x: -150, y: 100 },
    { Icon: BarChart3, delay: 3, x: 180, y: 120 },
    { Icon: MessageSquare, delay: 4, x: -220, y: 50 },
    { Icon: Globe, delay: 5, x: 220, y: -80 },
  ];

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B1020] via-[#111827] to-[#0B1020]" />
      
      {/* Glowing Orbs */}
      <motion.div
        style={{ y }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#06B6D4]/20 rounded-full blur-3xl animate-pulse"
      />
      <motion.div
        style={{ y: useTransform(scrollY, [0, 1000], [0, -200]), animationDelay: '1s' }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8B5CF6]/20 rounded-full blur-3xl animate-pulse"
      />
      <motion.div
        style={{ y: useTransform(scrollY, [0, 1000], [0, 100]), animationDelay: '2s' }}
        className="absolute top-1/2 left-1/2 w-80 h-80 bg-[#4F46E5]/10 rounded-full blur-3xl animate-pulse"
      />

      {/* Mouse Follow Glow */}
      <motion.div
        className="pointer-events-none fixed w-96 h-96 rounded-full blur-[100px] bg-[#06B6D4]/30"
        animate={{
          x: mousePosition.x - 192,
          y: mousePosition.y - 192,
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
      />

      {/* Floating Particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="particle bg-[#06B6D4]"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 4,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Floating Icons */}
      {floatingIcons.map(({ Icon, delay, x, y }) => (
        <motion.div
          key={delay}
          className="absolute"
          style={{ left: '50%', top: '50%' }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            x: [x, x * 1.2, x],
            y: [y, y * 0.8, y],
            rotate: [0, 360, 720],
          }}
          transition={{
            duration: 10,
            delay: delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className="p-4 glass rounded-2xl">
            <Icon className="w-8 h-8 text-[#06B6D4]" />
          </div>
        </motion.div>
      ))}

      {/* Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <div className="inline-flex items-center px-4 py-2 glass rounded-full mb-6">
            <span className="w-2 h-2 bg-[#06B6D4] rounded-full animate-pulse mr-2" />
            <span className="text-sm text-[#06B6D4] font-medium">AI-Powered Platform</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
        >
          <span className="gradient-text">Build Smarter</span>
          <br />
          <span className="text-[#E5E7EB]">with AI Automation</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl md:text-2xl text-[#9CA3AF] max-w-3xl mx-auto mb-12 leading-relaxed"
        >
          Transform your business with intelligent chatbots, advanced NLP processing, and 
          seamless enterprise automation. The future of AI is here.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <button className="group px-8 py-4 bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] rounded-xl font-semibold text-lg hover:shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 flex items-center space-x-2">
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="group px-8 py-4 glass rounded-xl font-semibold text-lg hover:bg-[#06B6D4]/20 transition-all duration-300 flex items-center space-x-2 border border-[#06B6D4]/30">
            <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Watch Demo</span>
          </button>
        </motion.div>

        {/* AI Robot Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="relative animate-float">
            <div className="w-full h-64 md:h-96 glass rounded-3xl border border-[#06B6D4]/30 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#06B6D4]/10 to-[#8B5CF6]/10" />
              <div className="relative h-full flex items-center justify-center">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute w-64 h-64 border-2 border-[#06B6D4]/30 rounded-full"
                />
                <motion.div
                  animate={{
                    rotate: [360, 0],
                  }}
                  transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                  className="absolute w-48 h-48 border-2 border-[#8B5CF6]/30 rounded-full"
                />
                <div className="relative z-10">
                  <Bot className="w-32 h-32 text-[#06B6D4] animate-pulse" />
                </div>
              </div>
            </div>
            
            {/* Stats */}
            <div className="absolute -bottom-4 left-4 glass px-4 py-2 rounded-xl">
              <div className="text-2xl font-bold text-[#06B6D4]">10M+</div>
              <div className="text-sm text-[#9CA3AF]">Active Users</div>
            </div>
            <div className="absolute -bottom-4 right-4 glass px-4 py-2 rounded-xl">
              <div className="text-2xl font-bold text-[#8B5CF6]">99.9%</div>
              <div className="text-sm text-[#9CA3AF]">Uptime</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-[#06B6D4]/50 rounded-full flex items-start justify-center p-2"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 bg-[#06B6D4] rounded-full"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}