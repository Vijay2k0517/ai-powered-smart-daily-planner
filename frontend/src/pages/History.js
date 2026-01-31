import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, CheckCircle2, Circle,
  TrendingUp, Award, ChevronRight, Loader2
} from 'lucide-react';
import { api } from '../services/api';

const History = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          // Demo data for guests
          setHistory([
            {
              id: 1,
              date: new Date().toISOString().split('T')[0],
              total_tasks: 5,
              completed_tasks: 3,
              completion_rate: 60,
              schedule: [
                { task: "Morning workout", start: "07:00", end: "08:00" },
                { task: "Team meeting", start: "09:00", end: "10:00" },
                { task: "Project work", start: "10:30", end: "12:30" }
              ],
              wellness_tips: ["Great job staying active!", "Consider a short break after lunch"]
            }
          ]);
          setIsLoading(false);
          return;
        }
        
        const result = await api.getPlanHistory(userId, 30);
        setHistory(result.history || []);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistory();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateString === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getCompletionColor = (rate) => {
    if (rate >= 80) return 'from-green-400 to-emerald-500';
    if (rate >= 50) return 'from-yellow-400 to-amber-500';
    return 'from-red-400 to-rose-500';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12">
      <div className="container mx-auto px-6 md:px-12 lg:px-16 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Plan History</h1>
            <p className="text-slate-400">Review your past productivity plans</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full border border-blue-500/30">
            <Calendar className="w-5 h-5 text-blue-400" />
            <span className="text-blue-400 font-medium">{history.length} plans</span>
          </div>
        </div>

        {/* History List */}
        {history.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-md rounded-3xl p-12 text-center border border-white/10"
          >
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No history yet</h3>
            <p className="text-slate-400 mb-6">Start planning your days to build your history!</p>
            <button
              onClick={() => navigate('/tasks')}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Create Your First Plan
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {history.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
                className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden cursor-pointer hover:bg-white/10 transition-all"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCompletionColor(plan.completion_rate)} flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{plan.completion_rate}%</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{formatDate(plan.date)}</h3>
                        <p className="text-sm text-slate-400">
                          {plan.completed_tasks} of {plan.total_tasks} tasks completed
                        </p>
                      </div>
                    </div>
                    <ChevronRight 
                      className={`w-5 h-5 text-slate-500 transition-transform ${
                        selectedPlan === plan.id ? 'rotate-90' : ''
                      }`} 
                    />
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {selectedPlan === plan.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-6 pt-6 border-t border-white/10"
                      >
                        {/* Schedule */}
                        {plan.schedule && plan.schedule.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Schedule
                            </h4>
                            <div className="space-y-2">
                              {plan.schedule.map((item, idx) => (
                                <div 
                                  key={idx}
                                  className="flex items-center gap-3 text-sm"
                                >
                                  <span className="text-slate-500 w-24">
                                    {item.start} - {item.end}
                                  </span>
                                  <span className="text-slate-300">{item.task}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Wellness Tips */}
                        {plan.wellness_tips && plan.wellness_tips.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                              <Award className="w-4 h-4" />
                              AI Tips from that day
                            </h4>
                            <div className="space-y-2">
                              {plan.wellness_tips.map((tip, idx) => (
                                <div 
                                  key={idx}
                                  className="flex items-start gap-2 text-sm text-slate-400"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                                  {tip}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl p-8 text-white"
          >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Your Progress Summary
            </h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-bold">
                  {Math.round(history.reduce((acc, h) => acc + h.completion_rate, 0) / history.length)}%
                </div>
                <div className="text-blue-100">Avg Completion</div>
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {history.reduce((acc, h) => acc + h.completed_tasks, 0)}
                </div>
                <div className="text-blue-100">Tasks Done</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{history.length}</div>
                <div className="text-blue-100">Days Planned</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default History;
