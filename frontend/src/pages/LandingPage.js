import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Brain, Sparkles, Clock, Target, Zap, Flame, LogIn, MessageSquare, ListTodo, Wand2, ArrowRight } from 'lucide-react';
import LiquidEther from '../components/liquidether';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI-Powered",
      description: "Smart scheduling that learns from your habits"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Goal-Oriented",
      description: "Align your daily tasks with long-term goals"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Time Optimized",
      description: "Maximize productivity with intelligent planning"
    },
    {
      icon: <Flame className="w-8 h-8" />,
      title: "Streaks",
      description: "Build habits with daily productivity streaks"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Real-time Updates",
      description: "Dynamic scheduling that adapts throughout the day"
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Timeline View",
      description: "Visualize your entire day at a glance"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* LiquidEther Animated Background */}
      <div className="absolute inset-0 z-0">
        <LiquidEther
          colors={['#1e3a8a', '#7c3aed', '#0891b2', '#1e40af']}
          mouseForce={25}
          cursorSize={120}
          autoDemo={true}
          autoSpeed={0.4}
          autoIntensity={2.5}
          resolution={0.5}
          className="w-full h-full"
        />
      </div>
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/80 z-[1]" />

      {/* Top Bar */}
      <div className="absolute top-0 right-0 p-6 z-20">
        <button
          onClick={() => navigate('/auth')}
          className="px-6 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-medium hover:bg-white/20 transition-colors"
        >
          Sign In
        </button>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-6 md:px-12 lg:px-16 py-16 relative z-10">
        <div className="flex items-center justify-center min-h-[80vh]">
          {/* Center: Typography */}
          <motion.div 
            className="max-w-3xl text-center space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-full text-sm font-medium text-blue-300">
              <Sparkles className="w-4 h-4" />
              AI-Powered Planning
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] text-white">
              Your AI-powered<br />daily planner
            </h1>
            
            <p className="text-lg md:text-xl leading-relaxed text-slate-300 max-w-2xl mx-auto">
              Transform your chaotic schedule into an optimized masterpiece. Let AI handle the planning while you focus on what matters most.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                data-testid="get-started-btn"
                onClick={() => navigate('/auth')}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full px-8 py-4 font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30"
              >
                Get Started Free
              </button>
              <button
                data-testid="learn-more-btn"
                onClick={() => navigate('/goals')}
                className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20 rounded-full px-8 py-4 font-medium transition-all hover:border-white/40"
              >
                Try as Guest
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* How It Works - Gemini Flow */}
      <div className="container mx-auto px-6 md:px-12 lg:px-16 py-24 relative z-10">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-400/30 rounded-full text-sm font-medium text-purple-300 mb-6">
            <Sparkles className="w-4 h-4" />
            Powered by Google Gemini
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-4">
            How it works
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Your personalized AI planning experience in 4 simple steps
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2">
          {[
            { icon: <LogIn className="w-6 h-6" />, title: "Login", desc: "Create your account" },
            { icon: <Target className="w-6 h-6" />, title: "Set Goals", desc: "AI suggests goals for you" },
            { icon: <ListTodo className="w-6 h-6" />, title: "Enter Tasks", desc: "Add what you need to do" },
            { icon: <Wand2 className="w-6 h-6" />, title: "Gemini Plans", desc: "AI creates your schedule" },
          ].map((step, index) => (
            <React.Fragment key={index}>
              <motion.div
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 ${
                  index === 3 
                    ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30' 
                    : 'bg-white/10 text-blue-400 border border-white/20'
                }`}>
                  {step.icon}
                </div>
                <div className="text-xs text-purple-400 font-medium mb-1">Step {index + 1}</div>
                <h3 className="text-lg font-semibold text-white mb-1">{step.title}</h3>
                <p className="text-sm text-slate-400 max-w-[120px]">{step.desc}</p>
              </motion.div>
              
              {index < 3 && (
                <motion.div
                  className="hidden md:flex items-center text-slate-600"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                >
                  <ArrowRight className="w-6 h-6" />
                </motion.div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Gemini Badge */}
        <motion.div
          className="mt-12 flex justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30 rounded-full">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-slate-300">
              AI Schedule Generation • Smart Suggestions • Task Breakdown • Wellness Tips
            </span>
          </div>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 md:px-12 lg:px-16 py-24 relative z-10">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-4">
            Everything you need to plan smarter
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Powerful features designed to optimize your productivity and bring clarity to your day
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              data-testid={`feature-card-${index}`}
              className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-8 transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer group hover:-translate-y-1"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-2xl flex items-center justify-center text-blue-400 mb-4 group-hover:from-blue-500/50 group-hover:to-purple-500/50 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 md:px-12 lg:px-16 py-24 relative z-10">
        <motion.div 
          className="bg-gradient-to-br from-blue-600/80 to-purple-600/80 backdrop-blur-xl rounded-3xl p-12 md:p-16 text-center border border-white/20"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to transform your productivity?
          </h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who've already optimized their daily planning with AI
          </p>
          <button
            data-testid="cta-get-started-btn"
            onClick={() => navigate('/setup')}
            className="bg-white text-blue-600 hover:bg-blue-50 rounded-full px-8 py-4 font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg"
          >
            Start Planning Smarter
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;
