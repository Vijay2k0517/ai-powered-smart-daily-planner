import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Moon, Clock, Target, Brain, Coffee, 
  Zap, BookOpen, Briefcase, ArrowRight, ArrowLeft,
  AlertCircle, Smartphone, ListTodo, Battery, Check
} from 'lucide-react';
import { api } from '../services/api';

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [answers, setAnswers] = useState({
    work_style: '',
    productivity_goal: '',
    work_hours_start: '09:00',
    work_hours_end: '18:00',
    break_preference: '',
    biggest_challenge: ''
  });

  const questions = [
    {
      id: 'work_style',
      title: "When are you most productive?",
      subtitle: "Understanding your natural rhythm helps us schedule tasks optimally",
      options: [
        { id: 'early_bird', label: 'Early Bird', description: 'I do my best work in the morning', icon: Sun, color: 'from-yellow-400 to-orange-500' },
        { id: 'night_owl', label: 'Night Owl', description: 'I come alive in the evening', icon: Moon, color: 'from-purple-500 to-indigo-600' },
        { id: 'flexible', label: 'Flexible', description: 'I can adapt to any schedule', icon: Clock, color: 'from-blue-400 to-cyan-500' }
      ]
    },
    {
      id: 'productivity_goal',
      title: "What's your main productivity goal?",
      subtitle: "We'll tailor suggestions based on what matters most to you",
      options: [
        { id: 'focus', label: 'Deep Focus', description: 'Minimize distractions, maximize output', icon: Brain, color: 'from-violet-500 to-purple-600' },
        { id: 'balance', label: 'Work-Life Balance', description: 'Stay productive without burning out', icon: Coffee, color: 'from-green-400 to-emerald-500' },
        { id: 'learning', label: 'Learn & Grow', description: 'Develop new skills and knowledge', icon: BookOpen, color: 'from-blue-400 to-indigo-500' },
        { id: 'career', label: 'Career Growth', description: 'Advance professionally', icon: Briefcase, color: 'from-amber-400 to-orange-500' }
      ]
    },
    {
      id: 'break_preference',
      title: "How do you prefer to take breaks?",
      subtitle: "We'll remind you to rest at the right intervals",
      options: [
        { id: 'pomodoro', label: 'Pomodoro Style', description: '25 min work, 5 min break', icon: Clock, color: 'from-red-400 to-rose-500' },
        { id: 'long_blocks', label: 'Long Focus Blocks', description: '90 min work, 20 min break', icon: Zap, color: 'from-amber-400 to-yellow-500' },
        { id: 'flexible', label: 'Flexible', description: 'Break when I feel like it', icon: Coffee, color: 'from-teal-400 to-cyan-500' }
      ]
    },
    {
      id: 'biggest_challenge',
      title: "What's your biggest productivity challenge?",
      subtitle: "We'll provide targeted tips to help you overcome it",
      options: [
        { id: 'procrastination', label: 'Procrastination', description: 'I tend to delay starting tasks', icon: AlertCircle, color: 'from-red-400 to-pink-500' },
        { id: 'distractions', label: 'Distractions', description: 'I get easily sidetracked', icon: Smartphone, color: 'from-purple-400 to-violet-500' },
        { id: 'overload', label: 'Task Overload', description: 'I have too much on my plate', icon: ListTodo, color: 'from-orange-400 to-amber-500' },
        { id: 'motivation', label: 'Low Energy', description: 'I struggle to stay motivated', icon: Battery, color: 'from-blue-400 to-cyan-500' }
      ]
    }
  ];

  const handleSelect = (questionId, optionId) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleNext = async () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      // Save preferences and navigate
      setIsLoading(true);
      try {
        const userId = localStorage.getItem('userId');
        if (userId) {
          await api.savePreferences(userId, answers);
        }
        localStorage.setItem('userPreferences', JSON.stringify(answers));
        navigate('/tasks');
      } catch (error) {
        console.error('Failed to save preferences:', error);
        // Still navigate even if saving fails
        localStorage.setItem('userPreferences', JSON.stringify(answers));
        navigate('/tasks');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const currentQuestion = questions[step];
  const isAnswered = answers[currentQuestion.id] !== '';
  const progress = ((step + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12">
      <div className="container mx-auto px-6 md:px-12 lg:px-16 max-w-3xl">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-400">Getting to know you</span>
            <span className="text-sm font-medium text-slate-400">
              Question {step + 1} of {questions.length}
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white/5 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white/10"
          >
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                {currentQuestion.title}
              </h1>
              <p className="text-lg text-slate-400">
                {currentQuestion.subtitle}
              </p>
            </div>

            {/* Options Grid */}
            <div className={`grid gap-4 ${currentQuestion.options.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              {currentQuestion.options.map((option) => {
                const Icon = option.icon;
                const isSelected = answers[currentQuestion.id] === option.id;
                
                return (
                  <motion.button
                    key={option.id}
                    onClick={() => handleSelect(currentQuestion.id, option.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                    
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    
                    <h3 className="font-semibold text-white mb-1">{option.label}</h3>
                    <p className="text-sm text-slate-400">{option.description}</p>
                  </motion.button>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-10">
              <button
                onClick={handleBack}
                disabled={step === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  step === 0
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              
              <button
                onClick={handleNext}
                disabled={!isAnswered || isLoading}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all ${
                  isAnswered
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Saving...
                  </span>
                ) : (
                  <>
                    {step === questions.length - 1 ? "Let's Go!" : 'Continue'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Skip Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/tasks')}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
