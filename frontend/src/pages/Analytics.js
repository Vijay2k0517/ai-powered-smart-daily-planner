import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Target, Clock, Award,
  Calendar, CheckCircle2, Zap, Loader2, Sparkles, Flame
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { api } from '../services/api';

const Analytics = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [streak, setStreak] = useState(null);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    averageTime: 0,
    productivity: 0
  });
  const [weeklyData, setWeeklyData] = useState([]);
  const [taskDistribution, setTaskDistribution] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        // Fetch real stats from backend
        const detailedStats = await api.getDetailedStats();
        
        const totalTasks = detailedStats.overview?.total_tasks || 0;
        const completedTasks = detailedStats.overview?.completed_tasks || 0;
        const avgDuration = detailedStats.average_task_duration_hours || 1.5;
        const prodScore = detailedStats.productivity_score || (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
        
        setStats({
          totalTasks: totalTasks,
          completedTasks: completedTasks,
          averageTime: Math.round(avgDuration * 60),
          productivity: prodScore
        });
        
        // Set weekly data from backend
        if (detailedStats.weekly_data && detailedStats.weekly_data.length > 0) {
          setWeeklyData(detailedStats.weekly_data);
        } else {
          // Default weekly data
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          setWeeklyData(days.map((day, i) => ({
            day,
            completed: Math.floor(Math.random() * 10) + 5,
            planned: Math.floor(Math.random() * 5) + 10
          })));
        }
        
        // Calculate task distribution from backend data
        const { high = 0, medium = 0, low = 0 } = detailedStats.priority_breakdown || {};
        const total = high + medium + low;
        
        if (total > 0) {
          setTaskDistribution([
            { name: 'High Priority', value: Math.round((high / total) * 100), color: '#F59E0B' },
            { name: 'Medium Priority', value: Math.round((medium / total) * 100), color: '#3B82F6' },
            { name: 'Low Priority', value: Math.round((low / total) * 100), color: '#64748B' }
          ]);
        } else {
          // Default distribution when no tasks
          setTaskDistribution([
            { name: 'High Priority', value: 33, color: '#F59E0B' },
            { name: 'Medium Priority', value: 34, color: '#3B82F6' },
            { name: 'Low Priority', value: 33, color: '#64748B' }
          ]);
        }
        
        // Fetch AI daily summary
        try {
          const summaryData = await api.getDailySummary();
          setAiSummary(summaryData.summary || "Keep up the great work! Track your tasks to see personalized insights.");
        } catch (e) {
          console.log('AI summary not available');
        }
        
        // Fetch streak
        const userId = localStorage.getItem('userId');
        if (userId) {
          try {
            const streakData = await api.getStreak(userId);
            setStreak(streakData);
            // Also save to localStorage for consistency
            localStorage.setItem('streak', JSON.stringify(streakData));
          } catch (e) {
            console.log('Streak not available from API, trying localStorage');
            // Try localStorage fallback
            const savedStreak = localStorage.getItem('streak');
            if (savedStreak) {
              setStreak(JSON.parse(savedStreak));
            }
          }
        } else {
          // No userId, try localStorage
          const savedStreak = localStorage.getItem('streak');
          if (savedStreak) {
            setStreak(JSON.parse(savedStreak));
          }
        }
        
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        // Fallback to localStorage data
        const tasks = JSON.parse(localStorage.getItem('userTasks') || '[]');
        setStats({
          totalTasks: tasks.length,
          completedTasks: Math.floor(tasks.length * 0.7),
          averageTime: tasks.length > 0 
            ? Math.round(tasks.reduce((sum, t) => sum + (t.duration?.[0] || 60), 0) / tasks.length)
            : 0,
          productivity: 78
        });
        
        // Default weekly data
        setWeeklyData([
          { day: 'Mon', completed: 8, planned: 10 },
          { day: 'Tue', completed: 12, planned: 14 },
          { day: 'Wed', completed: 10, planned: 12 },
          { day: 'Thu', completed: 15, planned: 15 },
          { day: 'Fri', completed: 11, planned: 13 },
          { day: 'Sat', completed: 6, planned: 8 },
          { day: 'Sun', completed: 4, planned: 6 }
        ]);
        
        setTaskDistribution([
          { name: 'High Priority', value: 35, color: '#F59E0B' },
          { name: 'Medium Priority', value: 45, color: '#3B82F6' },
          { name: 'Low Priority', value: 20, color: '#64748B' }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalytics();
  }, []);

  const productivityData = [
    { time: '9 AM', focus: 85 },
    { time: '10 AM', focus: 90 },
    { time: '11 AM', focus: 88 },
    { time: '12 PM', focus: 75 },
    { time: '1 PM', focus: 65 },
    { time: '2 PM', focus: 70 },
    { time: '3 PM', focus: 82 },
    { time: '4 PM', focus: 88 },
    { time: '5 PM', focus: 80 }
  ];

  const statCards = [
    {
      icon: <CheckCircle2 className="w-6 h-6" />,
      label: 'Completed Tasks',
      value: stats.completedTasks,
      color: 'bg-green-500/20 text-green-400',
      trend: '+12%'
    },
    {
      icon: <Target className="w-6 h-6" />,
      label: 'Total Tasks',
      value: stats.totalTasks,
      color: 'bg-blue-500/20 text-blue-400',
      trend: '+8%'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      label: 'Avg Time per Task',
      value: `${stats.averageTime}m`,
      color: 'bg-purple-500/20 text-purple-400',
      trend: '-5%'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      label: 'Productivity Score',
      value: `${stats.productivity}%`,
      color: 'bg-orange-500/20 text-orange-400',
      trend: '+15%'
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-slate-400">Track your productivity and insights</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Streak Card */}
          <motion.div
            className="bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl p-6 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                {streak?.streak_status === 'active' ? '🔥 Active' : streak?.streak_status === 'at_risk' ? '⚠️ At Risk' : '💤'}
              </span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {streak?.current_streak || 0} days
            </div>
            <div className="text-sm text-orange-100">
              Current Streak
            </div>
            {streak?.longest_streak > 0 && (
              <div className="mt-2 text-xs text-orange-200">
                Best: {streak.longest_streak} days
              </div>
            )}
          </motion.div>

          {statCards.map((stat, index) => (
            <motion.div
              key={index}
              data-testid={`stat-card-${index}`}
              className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center`}>
                  {stat.icon}
                </div>
                <span className="text-xs font-medium text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
                  {stat.trend}
                </span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-slate-400">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* AI Summary Card */}
        {aiSummary && (
          <motion.div
            className="bg-gradient-to-r from-purple-600/80 to-blue-600/80 backdrop-blur-xl rounded-3xl p-6 mb-8 text-white border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6" />
                <h3 className="text-lg font-bold">AI Daily Summary</h3>
              </div>
              <span className="text-xs px-3 py-1 bg-white/20 rounded-full">Powered by Gemini</span>
            </div>
            <p className="text-blue-100">{aiSummary}</p>
          </motion.div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Performance */}
          <motion.div
            data-testid="weekly-chart"
            className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Weekly Performance</h3>
                <p className="text-sm text-slate-400">Completed vs Planned Tasks</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#F1F5F9'
                  }}
                />
                <Legend />
                <Bar dataKey="completed" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="planned" fill="#475569" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Productivity Curve */}
          <motion.div
            data-testid="productivity-chart"
            className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Focus Level</h3>
                <p className="text-sm text-slate-400">Throughout the day</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#F1F5F9'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="focus" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Task Distribution */}
          <motion.div
            data-testid="distribution-chart"
            className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-400">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Task Distribution</h3>
                <p className="text-sm text-slate-400">By priority level</p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {taskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px', color: '#F1F5F9' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              {taskDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-slate-400">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{item.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Achievements */}
          <motion.div
            data-testid="achievements-section"
            className="bg-gradient-to-br from-blue-600/80 to-purple-600/80 backdrop-blur-xl rounded-3xl p-8 text-white border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Achievements</h3>
                <p className="text-sm text-blue-200">Your milestones</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { title: '21-Day Streak', desc: 'Completed tasks for 21 days straight', icon: '🔥' },
                { title: 'Early Bird', desc: 'Started 15 days before 9 AM', icon: '🌅' },
                { title: 'Productive Month', desc: 'Completed 150+ tasks this month', icon: '🎯' },
                { title: 'Priority Master', desc: 'Finished all high-priority tasks', icon: '⭐' }
              ].map((achievement, index) => (
                <div 
                  key={index}
                  data-testid={`achievement-${index}`}
                  className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl"
                >
                  <div className="text-3xl">{achievement.icon}</div>
                  <div>
                    <div className="font-semibold">{achievement.title}</div>
                    <div className="text-sm text-blue-200">{achievement.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
