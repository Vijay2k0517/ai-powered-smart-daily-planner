/**
 * API Service Layer for Smart Daily Planner
 * Connects frontend to FastAPI backend
 */

const API_BASE = 'http://localhost:8000';

// Helper function for API calls with error handling
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

export const api = {
  // ============================================
  // Health Check
  // ============================================
  healthCheck: () => apiCall('/health'),

  // ============================================
  // Task Management
  // ============================================
  createTask: (task) => apiCall('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  }),

  getTasks: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    const query = params.toString();
    return apiCall(`/tasks${query ? `?${query}` : ''}`);
  },

  getTask: (id) => apiCall(`/tasks/${id}`),

  updateTaskStatus: (id, status) => apiCall(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),

  deleteTask: (id) => apiCall(`/tasks/${id}`, {
    method: 'DELETE',
  }),

  // ============================================
  // AI Schedule Generation
  // ============================================
  generateSchedule: () => apiCall('/generate-schedule', {
    method: 'POST',
  }),

  getSchedule: (date = null) => {
    const params = date ? `?schedule_date=${date}` : '';
    return apiCall(`/schedule${params}`);
  },

  // ============================================
  // AI Chat
  // ============================================
  sendChatMessage: (message) => apiCall('/ai-chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),

  // ============================================
  // Analytics
  // ============================================
  getStats: () => apiCall('/stats'),
  
  getDetailedStats: () => apiCall('/stats/detailed'),

  // ============================================
  // User Profile
  // ============================================
  saveProfile: (profile) => apiCall('/user-profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  }),

  getProfile: () => apiCall('/user-profile'),

  // ============================================
  // 🏆 AI Wow Features (Powered by Gemini)
  // ============================================
  breakdownTask: (taskTitle) => apiCall('/ai-breakdown', {
    method: 'POST',
    body: JSON.stringify({ task_title: taskTitle }),
  }),

  getSmartSuggestion: (context = null) => apiCall('/smart-suggestion', {
    method: 'POST',
    body: JSON.stringify({ context }),
  }),

  getDailySummary: () => apiCall('/daily-summary'),

  getGoalRecommendations: (role, workHours = 8) => apiCall('/ai-goal-recommendations', {
    method: 'POST',
    body: JSON.stringify({ role, work_hours: workHours }),
  }),

  suggestPriority: (taskTitle, deadline = null) => apiCall('/ai-suggest-priority', {
    method: 'POST',
    body: JSON.stringify({ task_title: taskTitle, deadline }),
  }),

  // ============================================
  // 🔐 Authentication
  // ============================================
  register: (email, name, password) => apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, name, password }),
  }),

  login: (email, password) => apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),

  getUser: (userId) => apiCall(`/auth/user/${userId}`),

  // ============================================
  // 🎯 User Preferences/Onboarding
  // ============================================
  savePreferences: (userId, preferences) => apiCall(`/preferences/${userId}`, {
    method: 'POST',
    body: JSON.stringify(preferences),
  }),

  getPreferences: (userId) => apiCall(`/preferences/${userId}`),

  // ============================================
  // 🔥 Streaks
  // ============================================
  getStreak: (userId) => apiCall(`/streak/${userId}`),

  checkinStreak: (userId) => apiCall(`/streak/${userId}/checkin`, {
    method: 'POST',
  }),

  // ============================================
  // 📜 Plan History
  // ============================================
  getPlanHistory: (userId, limit = 10) => apiCall(`/history/${userId}?limit=${limit}`),

  savePlanHistory: (userId) => apiCall(`/history/${userId}`, {
    method: 'POST',
  }),
};

export default api;
