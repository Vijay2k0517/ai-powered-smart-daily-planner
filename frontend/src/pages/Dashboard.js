import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Circle, Sparkles, Send, 
  Clock, Calendar, RefreshCw, MessageSquare, Loader2,
  Heart, Droplet, Footprints, Trash2, Plus, Zap, ChevronDown, ChevronUp, Wand2, X
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { api } from '../services/api';
import StreakWidget from '../components/StreakWidget';

const Dashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [user, setUser] = useState(null);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [wellnessTips, setWellnessTips] = useState([]);
  const [smartSuggestion, setSmartSuggestion] = useState('');
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [expandedTask, setExpandedTask] = useState(null);
  const [taskSubtasks, setTaskSubtasks] = useState({});
  const [isBreakingDown, setIsBreakingDown] = useState(null);
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', message: 'Hi! I\'m your AI productivity assistant powered by Gemini. Ask me anything about time management, task prioritization, or how to be more productive!' }
  ]);

  const formatTimeFromHHMM = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatTime = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const generateLocalSchedule = (taskList) => {
    const startHour = 9;
    let currentTime = startHour;
    
    const scheduledTasks = taskList
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .map(task => {
        const startTime = currentTime;
        const durationHours = (task.duration?.[0] || 60) / 60;
        currentTime += durationHours;
        
        return {
          ...task,
          startTime: formatTime(startHour + (startTime - startHour)),
          endTime: formatTime(startHour + (currentTime - startHour))
        };
      });
    
    setSchedule(scheduledTasks);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tasks and schedule from backend
        const [tasksData, scheduleData] = await Promise.all([
          api.getTasks(),
          api.getSchedule()
        ]);
        
        // Transform tasks for display
        const transformedTasks = tasksData.map(t => ({ 
          ...t, 
          duration: [Math.round(t.duration * 60)], // Convert hours to minutes
          completed: t.status === 'completed'
        }));
        
        setTasks(transformedTasks);
        setCompletedTasks(transformedTasks.filter(t => t.completed).map(t => t.id));
        
        // Transform schedule for display
        if (scheduleData && scheduleData.length > 0) {
          const transformedSchedule = scheduleData.map(s => ({
            id: s.id,
            title: s.task_title,
            startTime: formatTimeFromHHMM(s.start_time),
            endTime: formatTimeFromHHMM(s.end_time),
            duration: [60] // Default display
          }));
          setSchedule(transformedSchedule);
        } else if (transformedTasks.length > 0) {
          // Fallback to local schedule generation
          generateLocalSchedule(transformedTasks);
        }
        
        // Load wellness tips from localStorage
        const savedTips = localStorage.getItem('wellnessTips');
        if (savedTips) {
          setWellnessTips(JSON.parse(savedTips));
        }
        
        // Load user data
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        // Fetch AI smart suggestion
        fetchSmartSuggestion();
      } catch (error) {
        console.error('Failed to fetch data from backend:', error);
        // Fallback to localStorage
        const savedTasks = localStorage.getItem('userTasks');
        if (savedTasks) {
          const parsedTasks = JSON.parse(savedTasks);
          setTasks(parsedTasks.map(t => ({ ...t, completed: false })));
          generateLocalSchedule(parsedTasks);
        } else {
          navigate('/tasks');
        }
      }
    };
    
    fetchData();
  }, [navigate]);

  const toggleTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    const newStatus = task.completed ? 'pending' : 'completed';
    
    // Optimistic update
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
    
    if (!completedTasks.includes(taskId)) {
      setCompletedTasks([...completedTasks, taskId]);
      
      // Check-in for streak when completing a task
      const userId = localStorage.getItem('userId');
      if (userId) {
        try {
          await api.checkinStreak(userId);
        } catch (error) {
          console.error('Failed to update streak:', error);
        }
      }
    } else {
      setCompletedTasks(completedTasks.filter(id => id !== taskId));
    }
    
    // Sync with backend
    try {
      await api.updateTaskStatus(taskId, newStatus);
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const deleteTask = async (taskId) => {
    // Optimistic update
    setTasks(tasks.filter(t => t.id !== taskId));
    setCompletedTasks(completedTasks.filter(id => id !== taskId));
    
    // Remove from schedule if present
    setSchedule(schedule.filter(s => s.id !== taskId));
    
    // Sync with backend
    try {
      await api.deleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const completionPercentage = tasks.length > 0 
    ? Math.round((completedTasks.length / tasks.length) * 100) 
    : 0;

  const regenerateSchedule = async () => {
    setIsRegenerating(true);
    try {
      const result = await api.generateSchedule();
      if (result.schedule && result.schedule.length > 0) {
        const transformedSchedule = result.schedule.map((s, index) => ({
          id: index,
          title: s.task,
          startTime: formatTimeFromHHMM(s.start),
          endTime: formatTimeFromHHMM(s.end),
          duration: [60]
        }));
        setSchedule(transformedSchedule);
        
        // Update wellness tips if provided
        if (result.review && result.review.length > 0) {
          setWellnessTips(result.review);
          localStorage.setItem('wellnessTips', JSON.stringify(result.review));
        }
      }
    } catch (error) {
      console.error('Failed to regenerate schedule:', error);
      const incompleteTasks = tasks.filter(t => !t.completed);
      generateLocalSchedule(incompleteTasks);
    } finally {
      setIsRegenerating(false);
    }
  };

  const sendChatMessage = async () => {
    if (chatMessage.trim() && !isLoadingChat) {
      const userMessage = chatMessage;
      setChatMessage('');
      setChatHistory(prev => [...prev, { role: 'user', message: userMessage }]);
      setIsLoadingChat(true);
      
      try {
        const response = await api.sendChatMessage(userMessage);
        setChatHistory(prev => [...prev, { role: 'assistant', message: response.reply }]);
      } catch (error) {
        console.error('AI chat failed:', error);
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          message: 'Sorry, I\'m having trouble connecting right now. Try again in a moment!' 
        }]);
      } finally {
        setIsLoadingChat(false);
      }
    }
  };

  // Fetch AI smart suggestion
  const fetchSmartSuggestion = async () => {
    setIsLoadingSuggestion(true);
    try {
      const response = await api.getSmartSuggestion();
      setSmartSuggestion(response.suggestion);
    } catch (error) {
      console.error('Failed to fetch smart suggestion:', error);
      setSmartSuggestion("🎯 Focus on your highest priority tasks first to build momentum!");
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  // Break down a task into subtasks using AI
  const breakdownTask = async (taskId, taskTitle) => {
    if (taskSubtasks[taskId]) {
      // Toggle visibility if already loaded
      setExpandedTask(expandedTask === taskId ? null : taskId);
      return;
    }
    
    setIsBreakingDown(taskId);
    try {
      const response = await api.breakdownTask(taskTitle);
      setTaskSubtasks(prev => ({
        ...prev,
        [taskId]: response.subtasks
      }));
      setExpandedTask(taskId);
    } catch (error) {
      console.error('Failed to breakdown task:', error);
    } finally {
      setIsBreakingDown(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-6 py-8">
        {/* AI Smart Suggestion Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-2xl p-4 border border-purple-500/30"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-purple-300">AI Smart Tip</span>
                <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">Powered by Gemini</span>
              </div>
              {isLoadingSuggestion ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Getting personalized suggestion...</span>
                </div>
              ) : (
                <p className="text-slate-200">{smartSuggestion}</p>
              )}
            </div>
            <button
              onClick={fetchSmartSuggestion}
              disabled={isLoadingSuggestion}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Get new suggestion"
            >
              <RefreshCw className={`w-4 h-4 text-purple-400 ${isLoadingSuggestion ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </motion.div>

        {/* Streak Widget and Progress */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Streak Widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1"
          >
            <StreakWidget />
          </motion.div>

          {/* Progress Bar */}
          <motion.div
            data-testid="progress-section"
            className="lg:col-span-2 bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Today's Progress</h2>
                <p className="text-slate-400">
                  {completedTasks.length} of {tasks.length} tasks completed
                </p>
              </div>
              <div className="text-4xl font-bold text-blue-400">
                {completionPercentage}%
              </div>
            </div>
            <Progress value={completionPercentage} className="h-3 bg-slate-700" />
          </motion.div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Task List */}
          <motion.div
            data-testid="task-list-section"
            className="lg:col-span-7 bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Task List</h2>
              <button
                data-testid="add-more-tasks-btn"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'instant' });
                  navigate('/tasks');
                }}
                className="text-blue-400 hover:text-blue-300 font-medium text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add more
              </button>
            </div>
            
            <div className="space-y-3">
              <AnimatePresence>
                {tasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    data-testid={`task-checkbox-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rounded-2xl transition-all ${
                      task.completed
                        ? 'bg-slate-800/50 opacity-60'
                        : 'bg-blue-500/10 border border-white/5'
                    }`}
                  >
                    <div 
                      onClick={() => toggleTask(task.id)}
                      className="flex items-start gap-4 p-4 cursor-pointer hover:bg-blue-500/10 rounded-2xl"
                    >
                      <div className="pt-1">
                        {task.completed ? (
                          <CheckCircle2 className="w-6 h-6 text-blue-400" />
                        ) : (
                          <Circle className="w-6 h-6 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-medium mb-1 ${
                          task.completed ? 'line-through text-slate-500' : 'text-white'
                        }`}>
                          {task.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {task.duration[0]} min
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            task.priority === 'high' 
                              ? 'bg-orange-500/20 text-orange-400'
                              : task.priority === 'medium'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-slate-700 text-slate-400'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* AI Breakdown Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            breakdownTask(task.id, task.title);
                          }}
                          disabled={isBreakingDown === task.id}
                          className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-xl transition-colors"
                          title="AI Task Breakdown"
                        >
                          {isBreakingDown === task.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : expandedTask === task.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <Wand2 className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(task.id);
                          }}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* AI Subtasks Breakdown */}
                    <AnimatePresence>
                      {expandedTask === task.id && taskSubtasks[task.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-4 pb-4 overflow-hidden"
                        >
                          <div className="mt-2 pt-3 border-t border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles className="w-4 h-4 text-purple-400" />
                              <span className="text-xs font-medium text-purple-400">AI-Generated Subtasks</span>
                              <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">Gemini</span>
                            </div>
                            <div className="space-y-2 pl-2">
                              {taskSubtasks[task.id].map((subtask, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm">
                                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                  <span className="text-slate-300 flex-1">{subtask.subtask}</span>
                                  <span className="text-xs text-purple-400">{subtask.duration_minutes}m</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Timeline View */}
          <motion.div
            data-testid="timeline-section"
            className="lg:col-span-5 bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Timeline</h2>
              <button
                data-testid="regenerate-schedule-btn"
                onClick={regenerateSchedule}
                disabled={isRegenerating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full hover:bg-blue-500/30 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>

            <div className="space-y-4">
              {schedule.map((item, index) => {
                const isCompleted = completedTasks.includes(item.id);
                return (
                  <motion.div
                    key={item.id}
                    data-testid={`timeline-item-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative pl-8 pb-6 ${
                      index !== schedule.length - 1 ? 'border-l-2' : ''
                    } ${isCompleted ? 'border-blue-500' : 'border-slate-700'}`}
                  >
                    <div className={`absolute left-0 top-0 w-4 h-4 rounded-full transform -translate-x-[9px] ${
                      isCompleted ? 'bg-blue-500' : 'bg-slate-600'
                    }`} />
                    <div className="text-sm font-medium text-slate-400 mb-1">
                      {item.startTime} - {item.endTime}
                    </div>
                    <div className={`font-medium ${isCompleted ? 'text-slate-500 line-through' : 'text-white'}`}>
                      {item.title}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {item.duration[0]} minutes
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Wellness Tips Section */}
            {wellnessTips.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl border border-green-500/20"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-green-500" />
                    AI Wellness Tips
                  </h3>
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">Powered by Gemini</span>
                </div>
                <ul className="space-y-3">
                  {wellnessTips.map((tip, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-start gap-3 text-green-300"
                    >
                      <span className="w-2 h-2 mt-2 rounded-full bg-green-500 flex-shrink-0" />
                      <span>{tip}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* AI Chat Floating Button */}
      <button
        data-testid="ai-chat-toggle-btn"
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
        style={{ zIndex: 9999 }}
      >
        {showChat ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {/* AI Chat Panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            data-testid="ai-chat-panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-8 w-96 max-w-[calc(100vw-4rem)] bg-slate-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden z-40"
          >
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">AI Assistant</h3>
                  <p className="text-sm text-purple-100">Ask me anything about your schedule</p>
                </div>
                <span className="text-xs px-2 py-1 bg-white/20 rounded-full">Gemini</span>
              </div>
            </div>
            
            <div className="h-80 overflow-y-auto p-6 space-y-4">
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  data-testid={`chat-message-${index}`}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-100'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              ))}
              {isLoadingChat && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-100 px-4 py-3 rounded-2xl flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI is thinking...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  data-testid="chat-input"
                  type="text"
                  placeholder="Ask AI for productivity tips..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  disabled={isLoadingChat}
                  className="flex-1 bg-slate-800 border-transparent focus:bg-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2 transition-all outline-none placeholder:text-slate-500 text-white text-sm disabled:opacity-50"
                />
                <button
                  data-testid="send-chat-btn"
                  onClick={sendChatMessage}
                  disabled={isLoadingChat || !chatMessage.trim()}
                  className="w-10 h-10 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {isLoadingChat ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
