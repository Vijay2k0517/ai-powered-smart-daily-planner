import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Calendar, Zap, X } from 'lucide-react';
import { api } from '../services/api';

const StreakWidget = ({ onClose }) => {
  const [streak, setStreak] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (userId) {
          const streakData = await api.getStreak(userId);
          setStreak(streakData);
          
          // Show celebration for milestones
          if (streakData.current_streak > 0 && 
              (streakData.current_streak === 7 || 
               streakData.current_streak === 30 || 
               streakData.current_streak === 100 ||
               streakData.current_streak % 50 === 0)) {
            setShowCelebration(true);
          }
        } else {
          // Demo data for guests
          const savedStreak = localStorage.getItem('guestStreak');
          if (savedStreak) {
            setStreak(JSON.parse(savedStreak));
          } else {
            setStreak({
              current_streak: 0,
              longest_streak: 0,
              total_active_days: 0,
              streak_status: 'broken'
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch streak:', error);
      }
    };
    
    fetchStreak();
  }, []);

  const getStreakMessage = () => {
    if (!streak) return '';
    
    if (streak.streak_status === 'active') {
      if (streak.current_streak >= 30) return "🔥 Unstoppable! You're on fire!";
      if (streak.current_streak >= 14) return "🌟 Two weeks strong! Amazing!";
      if (streak.current_streak >= 7) return "💪 One week streak! Keep it up!";
      if (streak.current_streak >= 3) return "🎯 Great momentum! 3 days!";
      return "✨ You're doing great!";
    } else if (streak.streak_status === 'at_risk') {
      return "⚠️ Complete a task to keep your streak!";
    } else {
      return "🌱 Start your streak today!";
    }
  };

  const getFlameColor = () => {
    if (!streak) return 'text-slate-300';
    if (streak.current_streak >= 30) return 'text-orange-500';
    if (streak.current_streak >= 7) return 'text-amber-500';
    if (streak.current_streak >= 1) return 'text-yellow-500';
    return 'text-slate-300';
  };

  if (!streak) return null;

  return (
    <>
      {/* Celebration Modal */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowCelebration(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ 
                  duration: 0.5,
                  repeat: 3
                }}
                className="text-6xl mb-4"
              >
                🔥
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {streak.current_streak} Day Streak!
              </h2>
              <p className="text-slate-400 mb-6">
                You've been crushing it! Keep the momentum going!
              </p>
              <button
                onClick={() => setShowCelebration(false)}
                className="px-6 py-3 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Keep Going! 🚀
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streak Widget */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-orange-500/20 to-amber-500/10 rounded-2xl p-6 border border-orange-500/20 relative"
      >
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 text-orange-400/60 hover:text-orange-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-4 mb-4">
          <motion.div
            animate={streak.current_streak > 0 ? { 
              scale: [1, 1.1, 1],
            } : {}}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              repeatType: 'reverse'
            }}
            className={`w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center`}
          >
            <Flame className="w-7 h-7 text-white" />
          </motion.div>
          <div>
            <div className="text-3xl font-bold text-white">
              {streak.current_streak}
            </div>
            <div className="text-sm text-slate-400">Day Streak</div>
          </div>
        </div>

        <p className="text-slate-300 font-medium mb-4">{getStreakMessage()}</p>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/5">
            <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{streak.longest_streak}</div>
            <div className="text-xs text-slate-500">Best</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/5">
            <Calendar className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{streak.total_active_days}</div>
            <div className="text-xs text-slate-500">Total Days</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/5">
            <Zap className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">
              {streak.streak_status === 'active' ? '✓' : streak.streak_status === 'at_risk' ? '!' : '—'}
            </div>
            <div className="text-xs text-slate-500">Today</div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default StreakWidget;
