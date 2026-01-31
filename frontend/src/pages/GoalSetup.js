import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Briefcase, Laptop, ArrowRight, Clock, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { api } from '../services/api';

const GoalSetup = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('');
  const [workingHours, setWorkingHours] = useState([8]);
  const [mainGoal, setMainGoal] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  // Clear old tasks when starting a new plan
  useEffect(() => {
    const clearOldTasks = async () => {
      try {
        // Clear local storage
        localStorage.removeItem('userTasks');
        localStorage.removeItem('wellnessTips');
        localStorage.removeItem('userSetup');
        
        // Clear tasks from backend
        const tasks = await api.getTasks();
        for (const task of tasks) {
          try {
            await api.deleteTask(task.id);
          } catch (e) {
            console.error('Failed to delete task:', e);
          }
        }
      } catch (error) {
        console.error('Error clearing tasks:', error);
      }
    };
    
    clearOldTasks();
  }, []);

  // Fetch AI goal recommendations when role is selected
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!selectedRole) return;
      
      setIsLoadingRecommendations(true);
      try {
        const response = await api.getGoalRecommendations(selectedRole, workingHours[0]);
        setAiRecommendations(response.recommendations || []);
      } catch (error) {
        console.error('Failed to fetch AI recommendations:', error);
        setAiRecommendations([]);
      } finally {
        setIsLoadingRecommendations(false);
      }
    };
    
    fetchRecommendations();
  }, [selectedRole, workingHours]);

  const roles = [
    {
      id: 'student',
      title: 'Student',
      icon: <GraduationCap className="w-12 h-12" />,
      description: 'Balance studies, assignments, and personal time',
      image: 'https://images.pexels.com/photos/9572338/pexels-photo-9572338.jpeg'
    },
    {
      id: 'professional',
      title: 'Professional',
      icon: <Briefcase className="w-12 h-12" />,
      description: 'Optimize work tasks and meetings efficiently',
      image: 'https://images.pexels.com/photos/19238352/pexels-photo-19238352.jpeg'
    },
    {
      id: 'freelancer',
      title: 'Freelancer',
      icon: <Laptop className="w-12 h-12" />,
      description: 'Manage multiple projects and client deadlines',
      image: 'https://images.pexels.com/photos/5239813/pexels-photo-5239813.jpeg'
    }
  ];

  const commonGoals = [
    'Increase productivity',
    'Better work-life balance',
    'Meet all deadlines',
    'Learn new skills',
    'Health and fitness',
    'Personal projects'
  ];

  const handleContinue = () => {
    if (selectedRole && mainGoal) {
      // Store preferences in localStorage for now
      localStorage.setItem('userSetup', JSON.stringify({
        role: selectedRole,
        workingHours: workingHours[0],
        mainGoal
      }));
      window.scrollTo({ top: 0, behavior: 'instant' });
      navigate('/tasks');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12">
      <div className="container mx-auto px-6 md:px-12 lg:px-16">
        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">Setup Progress</span>
            <span className="text-sm font-medium text-slate-400">Step 1 of 2</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: '50%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Let's personalize your experience
            </h1>
            <p className="text-lg text-slate-400">
              Tell us a bit about yourself to optimize your daily planning
            </p>
          </div>

          {/* Role Selection */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-6">
              What best describes you?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {roles.map((role) => (
                <motion.div
                  key={role.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${role.title} role`}
                  aria-pressed={selectedRole === role.id}
                  data-testid={`role-card-${role.id}`}
                  onClick={() => setSelectedRole(role.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedRole(role.id)}
                  className={`relative overflow-hidden cursor-pointer rounded-3xl border-2 transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/50 ${
                    selectedRole === role.id
                      ? 'border-emerald-500 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                      : 'border-white/10 hover:border-blue-400/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="aspect-square relative">
                    <img
                      src={role.image}
                      alt={role.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        {role.icon}
                      </div>
                      <h3 className="text-xl font-semibold">{role.title}</h3>
                    </div>
                    <p className="text-sm text-white/80">{role.description}</p>
                  </div>
                  {selectedRole === role.id && (
                    <motion.div
                      className="absolute top-4 right-4 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      aria-hidden="true"
                    >
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Working Hours */}
          <div className="mb-12 bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                <Clock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-semibold text-white">
                Daily working hours
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400">How many hours can you dedicate daily?</span>
                <span className="text-2xl font-bold text-blue-400">{workingHours[0]} hours</span>
              </div>
              <Slider
                data-testid="working-hours-slider"
                value={workingHours}
                onValueChange={setWorkingHours}
                min={1}
                max={16}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-slate-500">
                <span>1 hour</span>
                <span>16 hours</span>
              </div>
            </div>
          </div>

          {/* Main Goal */}
          <div className="mb-12 bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10">
            <h2 className="text-2xl font-semibold text-white mb-6">
              What's your main goal?
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {commonGoals.map((goal) => (
                <button
                  key={goal}
                  aria-label={`Select goal: ${goal}`}
                  aria-pressed={mainGoal === goal}
                  data-testid={`goal-option-${goal.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setMainGoal(goal)}
                  className={`px-4 py-3 rounded-full text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                    mainGoal === goal
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                data-testid="custom-goal-input"
                type="text"
                aria-label="Custom goal input"
                placeholder="Or write your own goal..."
                value={!commonGoals.includes(mainGoal) ? mainGoal : ''}
                onChange={(e) => setMainGoal(e.target.value)}
                className="w-full bg-slate-800 border-2 border-transparent focus:bg-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 rounded-xl px-4 py-3 transition-all outline-none placeholder:text-slate-500 text-white"
              />
              {mainGoal && !commonGoals.includes(mainGoal) && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
              )}
            </div>
          </div>

          {/* AI Goal Recommendations */}
          {selectedRole && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 backdrop-blur-md rounded-3xl p-8 border border-purple-500/30"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">AI Recommended Goals</h2>
                    <p className="text-sm text-purple-300">Personalized for {selectedRole}s</p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full">Powered by Gemini</span>
              </div>
              
              {isLoadingRecommendations ? (
                <div className="flex items-center justify-center py-8 gap-3 text-purple-300">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing your profile...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiRecommendations.map((rec, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setMainGoal(rec.title)}
                      className={`text-left p-4 rounded-2xl border transition-all ${
                        mainGoal === rec.title
                          ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/20'
                          : 'bg-slate-800/50 border-white/10 hover:border-purple-400/50 hover:bg-purple-500/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          mainGoal === rec.title ? 'bg-purple-500' : 'bg-slate-700'
                        }`}>
                          {mainGoal === rec.title ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : (
                            <span className="text-xs text-slate-400">{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <h3 className={`font-medium mb-1 ${mainGoal === rec.title ? 'text-purple-300' : 'text-white'}`}>
                            {rec.title}
                          </h3>
                          <p className="text-sm text-slate-400">{rec.description}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Continue Button */}
          <div className="flex justify-center">
            <button
              data-testid="continue-to-tasks-btn"
              aria-label="Continue to tasks page"
              aria-disabled={!selectedRole || !mainGoal}
              onClick={handleContinue}
              disabled={!selectedRole || !mainGoal}
              className={`flex items-center gap-2 rounded-full px-8 py-4 font-semibold transition-all focus:outline-none focus:ring-4 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                selectedRole && mainGoal
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              Continue to Tasks
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Progress indicator */}
          {selectedRole && mainGoal && (
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mt-4 text-emerald-400 text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              All set! Click continue to proceed
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default GoalSetup;
