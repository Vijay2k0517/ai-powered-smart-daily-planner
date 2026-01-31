import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Sparkles, ArrowRight, Loader2, Flame, Play } from 'lucide-react';
import { api } from '../services/api';

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  // Demo account credentials
  const DEMO_EMAIL = 'demo@smartplanner.com';
  const DEMO_PASSWORD = 'demo123';

  const handleDemoLogin = async () => {
    setError('');
    setIsDemoLoading(true);
    
    try {
      const result = await api.login(DEMO_EMAIL, DEMO_PASSWORD);
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('userId', result.user.id);
      
      if (result.streak) {
        localStorage.setItem('streak', JSON.stringify(result.streak));
      }
      
      // Demo user goes directly to dashboard to see their data
      navigate('/dashboard');
    } catch (err) {
      setError('Demo account not available. Please try again or create a new account.');
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await api.login(formData.email, formData.password);
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('userId', result.user.id);
        
        if (result.streak) {
          localStorage.setItem('streak', JSON.stringify(result.streak));
        }
        
        // Check if user has completed onboarding
        if (!result.has_completed_onboarding) {
          navigate('/onboarding');
        } else {
          navigate('/tasks');
        }
      } else {
        // Register
        await api.register(formData.email, formData.name, formData.password);
        // Auto-login after registration
        const loginResult = await api.login(formData.email, formData.password);
        localStorage.setItem('user', JSON.stringify(loginResult.user));
        localStorage.setItem('userId', loginResult.user.id);
        navigate('/onboarding');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Smart Daily Planner</h1>
          <p className="text-slate-400">AI-powered productivity at your fingertips</p>
        </div>

        {/* Auth Card */}
        <motion.div
          layout
          className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20"
        >
          {/* Tabs */}
          <div className="flex bg-white/10 rounded-xl p-1 mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                isLogin
                  ? 'bg-white text-slate-900'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                !isLogin
                  ? 'bg-white text-slate-900'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-6"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                      required={!isLogin}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isDemoLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Demo Login */}
          {isLogin && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-transparent text-white/40">or try with demo</span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isLoading || isDemoLoading}
                className="mt-4 w-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 font-semibold py-4 rounded-xl hover:bg-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isDemoLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Try Demo Account
                  </>
                )}
              </button>
              <p className="text-center text-white/30 text-xs mt-2">
                Pre-loaded with 21-day streak & sample data
              </p>
            </div>
          )}

          {/* Streak Teaser */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center justify-center gap-3 text-white/60">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-sm">Build your productivity streak!</span>
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
          </div>
        </motion.div>

        {/* Skip for now link */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/goals')}
            className="text-white/50 hover:text-white/80 text-sm transition-colors"
          >
            Continue as guest →
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
