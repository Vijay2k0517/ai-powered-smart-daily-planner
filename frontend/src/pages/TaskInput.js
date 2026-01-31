import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Sparkles, Clock, Flag, Calendar, Loader2, Wand2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { api } from '../services/api';

const TaskInput = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggestingPriority, setIsSuggestingPriority] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    duration: [60],
    priority: 'medium'
  });
  const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
  const [preferredTime, setPreferredTime] = useState('');

  const priorities = [
    { id: 'low', label: 'Low', color: 'bg-slate-700 text-slate-300 border-slate-600' },
    { id: 'medium', label: 'Medium', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { id: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' }
  ];

  const addTask = async () => {
    if (newTask.title.trim() && !isLoading) {
      setIsLoading(true);
      try {
        const taskData = {
          title: newTask.title,
          duration: newTask.duration[0] / 60, // Convert minutes to hours for backend
          priority: newTask.priority,
          deadline: deadline,
          preferred_time: preferredTime || null
        };
        
        const savedTask = await api.createTask(taskData);
        setTasks([...tasks, { 
          ...savedTask, 
          duration: [newTask.duration[0]], // Keep minutes for display
          preferred_time: preferredTime
        }]);
        setNewTask({ title: '', duration: [60], priority: 'medium' });
        setPreferredTime('');
      } catch (error) {
        console.error('Failed to save task:', error);
        // Fallback to local state if API fails
        setTasks([...tasks, { ...newTask, id: Date.now(), deadline, preferred_time: preferredTime }]);
        setNewTask({ title: '', duration: [60], priority: 'medium' });
        setPreferredTime('');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const removeTask = async (id) => {
    try {
      await api.deleteTask(id);
    } catch (error) {
      console.error('Failed to delete task from server:', error);
    }
    setTasks(tasks.filter(task => task.id !== id));
  };

  const generateSchedule = async () => {
    if (tasks.length > 0 && !isGenerating) {
      setIsGenerating(true);
      try {
        const result = await api.generateSchedule();
        // Store wellness tips for the Dashboard to display
        if (result.review && result.review.length > 0) {
          localStorage.setItem('wellnessTips', JSON.stringify(result.review));
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to generate schedule:', error);
        // Fallback - still navigate but schedule might not be AI-generated
        localStorage.setItem('userTasks', JSON.stringify(tasks));
        window.scrollTo({ top: 0, behavior: 'instant' });
        navigate('/dashboard');
      } finally {
        setIsGenerating(false);
      }
    }
  };

  // AI-powered priority suggestion
  const suggestPriority = async () => {
    if (!newTask.title.trim() || isSuggestingPriority) return;
    
    setIsSuggestingPriority(true);
    try {
      const response = await api.suggestPriority(newTask.title, deadline);
      setNewTask(prev => ({ ...prev, priority: response.suggested_priority }));
    } catch (error) {
      console.error('Failed to get AI priority suggestion:', error);
    } finally {
      setIsSuggestingPriority(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12">
      <div className="container mx-auto px-6 md:px-12 lg:px-16">
        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">Setup Progress</span>
            <span className="text-sm font-medium text-slate-400">Step 2 of 2</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: '50%' }}
              animate={{ width: '100%' }}
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
              What's on your agenda?
            </h1>
            <p className="text-lg text-slate-400">
              Add your tasks and let AI create the perfect schedule for you
            </p>
          </div>

          {/* Add Task Form */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">Add New Task</h2>
            
            {/* Task Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Task Name
              </label>
              <input
                data-testid="task-title-input"
                type="text"
                placeholder="e.g., Complete project presentation"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
                className="w-full bg-slate-800 border-transparent focus:bg-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 rounded-xl px-4 py-3 transition-all outline-none placeholder:text-slate-500 text-white"
              />
            </div>

            {/* Deadline Picker */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  When do you want to do this?
                </div>
              </label>
              
              {/* Quick Date Options */}
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { label: 'Today', days: 0 },
                  { label: 'Tomorrow', days: 1 },
                  { label: 'In 3 days', days: 3 },
                  { label: 'This week', days: 7 },
                ].map((option) => {
                  const optionDate = new Date();
                  optionDate.setDate(optionDate.getDate() + option.days);
                  const dateStr = optionDate.toISOString().split('T')[0];
                  const isSelected = deadline === dateStr;
                  
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setDeadline(dateStr)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              
              <input
                data-testid="task-deadline-input"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-slate-800 border-transparent focus:bg-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 rounded-xl px-4 py-3 transition-all outline-none text-white [color-scheme:dark]"
              />
            </div>

            {/* Preferred Time */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Preferred Time (optional)
                </div>
              </label>
              
              {/* Quick Time Options */}
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { label: 'Morning', time: '09:00', icon: '🌅' },
                  { label: 'Noon', time: '12:00', icon: '☀️' },
                  { label: 'Afternoon', time: '15:00', icon: '🌤️' },
                  { label: 'Evening', time: '18:00', icon: '🌆' },
                ].map((option) => {
                  const isSelected = preferredTime === option.time;
                  
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setPreferredTime(isSelected ? '' : option.time)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <span>{option.icon}</span>
                      {option.label}
                    </button>
                  );
                })}
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="flex-1 bg-slate-800 border-transparent focus:bg-slate-700 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 rounded-xl px-4 py-3 transition-all outline-none text-white [color-scheme:dark]"
                  placeholder="Select time"
                />
                {preferredTime && (
                  <button
                    type="button"
                    onClick={() => setPreferredTime('')}
                    className="px-4 py-3 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Gemini will try to schedule this task at your preferred time
              </p>
            </div>

            {/* Duration Slider */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Duration
                  </span>
                  <span className="text-lg font-semibold text-blue-400">
                    {newTask.duration[0]} minutes
                  </span>
                </div>
              </label>
              <Slider
                data-testid="task-duration-slider"
                value={newTask.duration}
                onValueChange={(val) => setNewTask({ ...newTask, duration: val })}
                min={15}
                max={240}
                step={15}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-slate-500 mt-2">
                <span>15 min</span>
                <span>4 hours</span>
              </div>
            </div>

            {/* Priority */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4" />
                    Priority
                  </div>
                  <button
                    onClick={suggestPriority}
                    disabled={!newTask.title.trim() || isSuggestingPriority}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-full hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSuggestingPriority ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    {isSuggestingPriority ? 'Analyzing...' : 'AI Suggest'}
                  </button>
                </div>
              </label>
              <div className="flex gap-3">
                {priorities.map((priority) => (
                  <button
                    key={priority.id}
                    data-testid={`priority-${priority.id}-btn`}
                    onClick={() => setNewTask({ ...newTask, priority: priority.id })}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all border-2 ${
                      newTask.priority === priority.id
                        ? priority.color + ' border-current'
                        : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Button */}
            <button
              data-testid="add-task-btn"
              onClick={addTask}
              disabled={!newTask.title.trim() || isLoading}
              className={`w-full flex items-center justify-center gap-2 rounded-full px-8 py-4 font-semibold transition-all ${
                newTask.title.trim() && !isLoading
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              {isLoading ? 'Adding...' : 'Add Task'}
            </button>
          </div>

          {/* Task List */}
          {tasks.length > 0 && (
            <motion.div
              className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 mb-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-semibold text-white mb-6">
                Your Tasks ({tasks.length})
              </h2>
              <div className="space-y-3">
                <AnimatePresence>
                  {tasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      data-testid={`task-item-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl hover:bg-slate-800 transition-colors border border-white/5"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-white mb-1">{task.title}</h3>
                        <div className="flex items-center flex-wrap gap-3 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {task.duration[0]} min
                          </span>
                          {task.preferred_time && (
                            <span className="flex items-center gap-1 text-purple-400">
                              📍 {task.preferred_time}
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                      <button
                        data-testid={`remove-task-btn-${index}`}
                        onClick={() => removeTask(task.id)}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Generate Schedule Button */}
          <div className="flex flex-col items-center gap-3">
            <button
              data-testid="generate-schedule-btn"
              onClick={generateSchedule}
              disabled={tasks.length === 0 || isGenerating}
              className={`flex items-center gap-3 rounded-full px-10 py-5 text-lg font-semibold transition-all ${
                tasks.length > 0 && !isGenerating
                  ? 'bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white shadow-lg shadow-purple-500/30 hover:scale-105 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
              {isGenerating ? 'Generating with Gemini AI...' : 'Generate AI Schedule'}
            </button>
            <span className="text-xs text-purple-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Powered by Google Gemini
            </span>
          </div>

          {tasks.length === 0 && (
            <motion.p
              className="text-center text-slate-500 mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Add at least one task to generate your AI-powered schedule
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TaskInput;
