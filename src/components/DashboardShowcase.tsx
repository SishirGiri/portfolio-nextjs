'use client';

import { motion } from 'framer-motion';
import { MessageSquare, TrendingUp, Zap, Clock, Users, Settings, Terminal, BarChart3, Activity, CheckCircle, AlertCircle, Play } from 'lucide-react';

export default function DashboardShowcase() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#111827] via-[#0B1020] to-[#111827]" />
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
            AI Dashboard
          </span>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">Powerful Analytics</span>
          </h2>
          <p className="text-xl text-[#9CA3AF] max-w-2xl mx-auto">
            Real-time insights and intelligent automation at your fingertips
          </p>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          {/* Main Dashboard Container */}
          <div className="glass-strong rounded-3xl p-6 border border-[#8B5CF6]/20">
            {/* Dashboard Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#06B6D4] to-[#8B5CF6] flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#E5E7EB]">NeuroBot Dashboard</h3>
                  <p className="text-sm text-[#9CA3AF]">Real-time monitoring</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-[#06B6D4] rounded-full animate-pulse" />
                <span className="text-sm text-[#06B6D4] font-medium">Live</span>
              </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stats Panel */}
              <div className="lg:col-span-2 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="glass rounded-xl p-4 border border-[#06B6D4]/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Users className="w-5 h-5 text-[#06B6D4]" />
                      <span className="text-xs text-[#06B6D4] bg-[#06B6D4]/10 px-2 py-1 rounded">+12%</span>
                    </div>
                    <div className="text-2xl font-bold text-[#E5E7EB]">24,891</div>
                    <div className="text-sm text-[#9CA3AF]">Active Users</div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="glass rounded-xl p-4 border border-[#8B5CF6]/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <MessageSquare className="w-5 h-5 text-[#8B5CF6]" />
                      <span className="text-xs text-[#8B5CF6] bg-[#8B5CF6]/10 px-2 py-1 rounded">+8%</span>
                    </div>
                    <div className="text-2xl font-bold text-[#E5E7EB]">1.2M</div>
                    <div className="text-sm text-[#9CA3AF]">Messages</div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="glass rounded-xl p-4 border border-[#4F46E5]/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Zap className="w-5 h-5 text-[#4F46E5]" />
                      <span className="text-xs text-[#4F46E5] bg-[#4F46E5]/10 px-2 py-1 rounded">+15%</span>
                    </div>
                    <div className="text-2xl font-bold text-[#E5E7EB]">99.9%</div>
                    <div className="text-sm text-[#9CA3AF]">Uptime</div>
                  </motion.div>
                </div>

                {/* Charts Area */}
                <div className="glass rounded-xl p-6 border border-[#06B6D4]/20">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-[#E5E7EB]">Performance Metrics</h4>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-[#06B6D4] rounded-full mr-2" />
                        <span className="text-xs text-[#9CA3AF]">Requests</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-[#8B5CF6] rounded-full mr-2" />
                        <span className="text-xs text-[#9CA3AF]">Responses</span>
                      </div>
                    </div>
                  </div>
                  {/* Animated Chart */}
                  <div className="h-48 flex items-end justify-between space-x-2">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((height, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className={`flex-1 rounded-t-lg ${
                          i % 2 === 0 ? 'bg-[#06B6D4]/60' : 'bg-[#8B5CF6]/60'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Side Panel */}
              <div className="space-y-6">
                {/* AI Chat Interface */}
                <div className="glass rounded-xl p-4 border border-[#8B5CF6]/20">
                  <h4 className="font-semibold text-[#E5E7EB] mb-3 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2 text-[#8B5CF6]" />
                    AI Assistant
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4 text-[#8B5CF6]" />
                      </div>
                      <div className="bg-[#8B5CF6]/10 rounded-lg p-2 text-sm text-[#E5E7EB]">
                        How can I help you today?
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 flex-row-reverse space-x-reverse">
                      <div className="w-8 h-8 rounded-full bg-[#06B6D4]/20 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-[#06B6D4]" />
                      </div>
                      <div className="bg-[#06B6D4]/10 rounded-lg p-2 text-sm text-[#E5E7EB]">
                        Show me analytics
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terminal Panel */}
                <div className="glass rounded-xl p-4 border border-[#4F46E5]/20 font-mono text-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Terminal className="w-4 h-4 text-[#4F46E5]" />
                      <span className="text-[#E5E7EB]">Terminal</span>
                    </div>
                    <motion.div
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-2 h-2 bg-[#06B6D4] rounded-full"
                    />
                  </div>
                  <div className="space-y-2 text-[#9CA3AF]">
                    <div>
                      <span className="text-[#06B6D4]">$</span> neurobot deploy
                    </div>
                    <div>
                      <span className="text-[#8B5CF6]">✓</span> Deploying to production...
                    </div>
                    <div>
                      <span className="text-[#8B5CF6]">✓</span> Build completed in 2.3s
                    </div>
                    <div>
                      <span className="text-[#8B5CF6]">✓</span> Live at https://neurobot.ai
                    </div>
                  </div>
                </div>

                {/* Automation Workflow */}
                <div className="glass rounded-xl p-4 border border-[#06B6D4]/20">
                  <h4 className="font-semibold text-[#E5E7EB] mb-3 flex items-center">
                    <Settings className="w-4 h-4 mr-2 text-[#06B6D4]" />
                    Workflows
                  </h4>
                  <div className="space-y-3">
                    {[
                      { name: 'Chat Processing', status: 'active', icon: CheckCircle },
                      { name: 'Data Analysis', status: 'active', icon: CheckCircle },
                      { name: 'Response Generation', status: 'pending', icon: Clock },
                    ].map((workflow) => (
                      <div key={workflow.name} className="flex items-center justify-between">
                        <span className="text-sm text-[#9CA3AF]">{workflow.name}</span>
                        <workflow.icon className={`w-4 h-4 ${
                          workflow.status === 'active' ? 'text-[#06B6D4]' : 'text-[#9CA3AF]'
                        }`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Elements */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute -top-4 -right-4 w-20 h-20 glass rounded-2xl border border-[#06B6D4]/30 flex items-center justify-center"
          >
            <TrendingUp className="w-10 h-10 text-[#06B6D4]" />
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -bottom-4 -left-4 w-20 h-20 glass rounded-2xl border border-[#8B5CF6]/30 flex items-center justify-center"
          >
            <BarChart3 className="w-10 h-10 text-[#8B5CF6]" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}