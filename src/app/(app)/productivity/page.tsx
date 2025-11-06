"use client";

import { motion } from 'framer-motion';
import ProductivityTimer from '@/components/dashboard/productivity-timer';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Timer, 
  CalendarDays,
  Clock,
  TrendingUp,
  Target,
  Zap
} from 'lucide-react';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

// Types
type Priority = 'low' | 'medium' | 'high';

interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  dueDate?: string;
  createdAt: string;
}

interface Session {
  id: string;
  name: string;
  startTime: string;
  duration: number;
  type: 'work' | 'short-break' | 'long-break';
}

// Priority badge component
const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const styles = {
    high: 'bg-red-50 text-red-600 border-red-100',
    medium: 'bg-amber-50 text-amber-600 border-amber-100',
    low: 'bg-green-50 text-green-600 border-green-100'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[priority]}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
};

// Tasks Panel Component
function TasksPanel() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');

  // Load tasks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('productivityTasks');
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }
    }
  }, []);

  // Save tasks to localStorage
  useEffect(() => {
    if (tasks.length > 0 || localStorage.getItem('productivityTasks')) {
      localStorage.setItem('productivityTasks', JSON.stringify(tasks));
    }
  }, [tasks]);

  const addTask = useCallback(() => {
    if (!title.trim()) return;
    
    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      title: title.trim(),
      done: false,
      priority,
      dueDate: dueDate || undefined,
      createdAt: new Date().toISOString()
    };
    
    setTasks(prev => [newTask, ...prev]);
    setTitle('');
    setDueDate('');
  }, [title, priority, dueDate]);

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, done: !t.done } : t
    ));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  const pending = useMemo(() => tasks.filter(t => !t.done), [tasks]);
  const completed = useMemo(() => tasks.filter(t => t.done), [tasks]);
  const completionRate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  return (
    <motion.div 
      variants={itemVariants}
      className="bg-white rounded-[20px] border border-black/5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow duration-300"
    >
      {/* Header */}
      <div className="p-5 border-b border-black/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
            <h3 className="text-[15px] font-semibold text-black">Tasks</h3>
          </div>
          {tasks.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 bg-black/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-black rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-xs text-black/50 font-medium">
                {completed.length}/{tasks.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Task Input */}
      <div className="p-5 space-y-3">
        <div className="relative">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="What needs to be done?"
            className="h-10 text-sm bg-white border-black/10 rounded-full pl-4 pr-12 focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
          />
          <Button 
            onClick={addTask} 
            disabled={!title.trim()}
            className="absolute right-1 top-1 h-8 w-8 bg-black text-white hover:bg-black/90 rounded-full p-0 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          <select 
            value={priority} 
            onChange={e => setPriority(e.target.value as Priority)} 
            className="flex-1 h-8 bg-black/[0.02] border border-black/5 rounded-full px-3 text-xs text-black/70 focus:border-black/20 focus:bg-white outline-none transition-all"
          >
            <option value="high">⚡ High</option>
            <option value="medium">● Medium</option>
            <option value="low">○ Low</option>
          </select>
          <input 
            type="date" 
            value={dueDate} 
            onChange={e => setDueDate(e.target.value)} 
            className="flex-1 h-8 bg-black/[0.02] border border-black/5 rounded-full px-3 text-xs text-black/70 focus:border-black/20 focus:bg-white outline-none transition-all"
          />
        </div>
      </div>

      {/* Clean Task List */}
      <div className="px-5 pb-5 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
        {pending.length === 0 && completed.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs text-black/40">No tasks yet</p>
          </div>
        )}

        {pending.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="group flex items-start gap-2.5 p-3 rounded-[10px] border border-black/5 bg-white hover:border-black/10 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all"
          >
            <button
              onClick={() => toggleTask(task.id)}
              className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border border-black/20 hover:border-black hover:bg-black/5 transition-all"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-black leading-relaxed break-words">
                {task.title}
              </div>
              {(task.priority !== 'medium' || task.dueDate) && (
                <div className="flex items-center gap-1.5 mt-1">
                  {task.priority === 'high' && (
                    <span className="text-[10px] text-red-600">High</span>
                  )}
                  {task.priority === 'low' && (
                    <span className="text-[10px] text-green-600">Low</span>
                  )}
                  {task.dueDate && (
                    <span className="text-[10px] text-black/40">
                      {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => deleteTask(task.id)}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5 text-black/40 hover:text-red-600" />
            </button>
          </motion.div>
        ))}

        {completed.length > 0 && (
          <>
            {pending.length > 0 && <div className="h-px bg-black/5 my-3" />}
            {completed.map(task => (
              <div
                key={task.id}
                className="group flex items-start gap-2.5 p-3 rounded-[10px] opacity-50"
              >
                <CheckCircle2 className="flex-shrink-0 w-4 h-4 text-black/40 mt-0.5" />
                <div className="flex-1 text-xs text-black/60 line-through break-words">
                  {task.title}
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5 text-black/40 hover:text-red-600" />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
}

// Sessions Panel Component
function SessionsPanel() {
  const [sessions, setSessions] = useState<Session[]>([]);

  // Load sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pomodoroSessions');
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load sessions:', error);
      }
    }

    // Listen for new sessions
    const handleStorageChange = () => {
      const updated = localStorage.getItem('pomodoroSessions');
      if (updated) {
        try {
          setSessions(JSON.parse(updated));
        } catch (error) {
          console.error('Failed to update sessions:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const today = new Date().toDateString();
  
  const weekStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return date;
  }, []);

  const stats = useMemo(() => {
    let todayCount = 0, todaySecs = 0, weekCount = 0, weekSecs = 0;
    
    sessions.forEach((session) => {
      const startDate = new Date(session.startTime);
      const duration = Number(session.duration || 0);
      
      if (startDate.toDateString() === today) {
        todayCount += 1;
        todaySecs += duration;
      }
      if (startDate >= weekStart) {
        weekCount += 1;
        weekSecs += duration;
      }
    });
    
    return { todayCount, todaySecs, weekCount, weekSecs };
  }, [sessions, today, weekStart]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getSessionIcon = (type: string) => {
    switch (type) {
      case 'work':
        return '🎯';
      case 'short-break':
        return '☕';
      case 'long-break':
        return '🌴';
      default:
        return '⏱️';
    }
  };

  return (
    <motion.div 
      variants={itemVariants}
      className="bg-white rounded-[20px] border border-black/5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow duration-300"
    >
      {/* Header */}
      <div className="p-5 border-b border-black/5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
          <h3 className="text-[15px] font-semibold text-black">Focus Stats</h3>
        </div>
      </div>

      {/* Stats */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-[12px] bg-gradient-to-br from-black/[0.03] to-black/[0.01] border border-black/5"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-1 rounded-full bg-black"></div>
              <div className="text-[10px] text-black/50 uppercase tracking-wider font-medium">Today</div>
            </div>
            <div className="text-2xl font-bold text-black">{stats.todayCount}</div>
            <div className="text-xs text-black/40 mt-1">{formatTime(stats.todaySecs)}</div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-[12px] bg-gradient-to-br from-black/[0.03] to-black/[0.01] border border-black/5"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-1 rounded-full bg-black"></div>
              <div className="text-[10px] text-black/50 uppercase tracking-wider font-medium">Week</div>
            </div>
            <div className="text-2xl font-bold text-black">{stats.weekCount}</div>
            <div className="text-xs text-black/40 mt-1">{formatTime(stats.weekSecs)}</div>
          </motion.div>
        </div>

        {/* Recent Sessions */}
        <div>
          <div className="text-xs text-black/50 mb-2">Recent</div>
          
          <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
            {sessions.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-black/40">No sessions yet</p>
              </div>
            ) : (
              sessions.slice(0, 10).map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center justify-between p-2.5 rounded-[10px] border border-black/5 hover:border-black/10 transition-all"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="text-xs text-black/60 truncate">
                      {session.name}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-[10px] text-black/40">
                    {formatTime(session.duration)}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Main Productivity Page
export default function ProductivityPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="container mx-auto px-6 py-10 max-w-[1600px]">
        {/* Elegant Header */}
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={containerVariants}
          className="mb-10"
        >
          <motion.div 
            variants={itemVariants}
            className="flex items-center gap-3 mb-3"
          >
            <div className="w-1 h-8 bg-black rounded-full"></div>
            <h1 className="text-[42px] font-semibold leading-tight tracking-[-0.03em] text-black">
              Productivity
            </h1>
          </motion.div>
        </motion.div>

        {/* Main Layout - Full Width Timer Above */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-6"
        >
          {/* Timer - Full Width */}
          <motion.div variants={itemVariants}>
            <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-[24px] overflow-hidden border border-black/5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <ProductivityTimer />
            </div>
          </motion.div>

          {/* Tasks and Stats - Side by Side */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <TasksPanel />
            <SessionsPanel />
          </motion.div>
        </motion.div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.15);
        }

        /* Smooth animations */
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </div>
  );
}