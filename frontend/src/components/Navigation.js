import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, BarChart3, History, User, LogOut, 
  Home, ListTodo, Target, ChevronDown 
} from 'lucide-react';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, [location]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showUserMenu && !e.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('userTasks');
    localStorage.removeItem('userSetup');
    localStorage.removeItem('userPreferences');
    localStorage.removeItem('streak');
    localStorage.removeItem('wellnessTips');
    setShowUserMenu(false);
    navigate('/');
  };

  const handleNavClick = (path) => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    navigate(path);
  };

  const isActive = (path) => location.pathname === path;

  // Don't show nav on landing page and auth pages
  if (['/', '/auth', '/onboarding'].includes(location.pathname)) {
    return null;
  }

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/tasks', icon: ListTodo, label: 'Tasks' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/history', icon: History, label: 'History' },
  ];

  return (
    <nav className="bg-slate-950/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-6 py-2">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.button 
            onClick={() => handleNavClick('/dashboard')}
            className="flex items-center gap-2 hover:opacity-90 transition-all group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent hidden sm:inline">
              Smart Planner
            </span>
          </motion.button>

          {/* Navigation Links - Centered pill design */}
          <div className="flex items-center bg-slate-800/50 rounded-full p-1 border border-white/5">
            {navItems.map(({ path, icon: Icon, label }) => (
              <motion.button
                key={path}
                onClick={() => handleNavClick(path)}
                className={`relative flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-full transition-all text-sm font-medium ${
                  isActive(path)
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive(path) && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg shadow-blue-500/25"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={`w-4 h-4 relative z-10 ${isActive(path) ? 'text-white' : ''}`} />
                <span className="hidden md:inline relative z-10">{label}</span>
              </motion.button>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center">
            {user ? (
              <div className="relative user-menu-container">
                <motion.button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-slate-800/50 border border-white/5 hover:border-white/10 hover:bg-slate-800 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center ring-2 ring-white/10">
                    <span className="text-white font-semibold text-xs">
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden md:inline text-sm font-medium text-slate-200 pr-1">
                    {user.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                </motion.button>

                {/* Dropdown */}
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
                    >
                      <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/5">
                        <p className="text-sm font-semibold text-white">{user.name}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            handleNavClick('/goals');
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        >
                          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <Target className="w-4 h-4 text-blue-400" />
                          </div>
                          <span className="text-sm font-medium">New Plan</span>
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                            <LogOut className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium">Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                onClick={() => handleNavClick('/auth')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:shadow-lg hover:shadow-blue-500/25 transition-all text-sm font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
