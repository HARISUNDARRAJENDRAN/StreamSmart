"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Coffee, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PomodoroSession {
  id: string;
  name: string;
  startTime: string;
  duration: number;
  type: 'work' | 'short-break' | 'long-break';
}

export default function ProductivityTimer() {
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [currentSessionName, setCurrentSessionName] = useState('');
  const [currentSessionStartTime, setCurrentSessionStartTime] = useState<Date | null>(null);
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'short-break' | 'long-break'>('work');
  
  const pomodoroIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);

  const savePomodoroSession = useCallback(() => {
    if (currentSessionStartTime) {
      const session: PomodoroSession = {
        id: crypto.randomUUID(),
        name: currentSessionName || `${pomodoroMode.charAt(0).toUpperCase() + pomodoroMode.slice(1).replace('-', ' ')} Session`,
        startTime: currentSessionStartTime.toISOString(),
        duration: pomodoroMode === 'work' ? 25 * 60 : pomodoroMode === 'short-break' ? 5 * 60 : 15 * 60,
        type: pomodoroMode
      };

      const saved = localStorage.getItem('pomodoroSessions');
      const sessions = saved ? JSON.parse(saved) : [];
      localStorage.setItem('pomodoroSessions', JSON.stringify([session, ...sessions]));
      
      setCurrentSessionStartTime(null);
      setCurrentSessionName('');
    }
  }, [currentSessionStartTime, currentSessionName, pomodoroMode]);

  useEffect(() => {
    if (isPomodoroRunning && pomodoroTime > 0) {
      pomodoroIntervalRef.current = setInterval(() => {
        setPomodoroTime(prev => {
          if (prev <= 1) {
            setIsPomodoroRunning(false);
            savePomodoroSession();
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Timer Complete!', {
                body: `${pomodoroMode.replace('-', ' ')} session finished!`
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
        pomodoroIntervalRef.current = null;
      }
    }

    return () => {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
      }
    };
  }, [isPomodoroRunning, pomodoroTime, savePomodoroSession, pomodoroMode]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const startPomodoroTimer = () => {
    if (!isPomodoroRunning && !currentSessionStartTime) {
      setCurrentSessionStartTime(new Date());
    }
    setIsPomodoroRunning(true);
  };

  const pausePomodoroTimer = () => {
    setIsPomodoroRunning(false);
  };

  const resetPomodoroTimer = () => {
    if (isPomodoroRunning || currentSessionStartTime) {
      savePomodoroSession();
    }
    setIsPomodoroRunning(false);
    setCurrentSessionStartTime(null);
    const defaultTimes = { work: 25 * 60, 'short-break': 5 * 60, 'long-break': 15 * 60 };
    setPomodoroTime(defaultTimes[pomodoroMode]);
  };

  const changePomodoroMode = (mode: 'work' | 'short-break' | 'long-break') => {
    if (isPomodoroRunning || currentSessionStartTime) {
      savePomodoroSession();
    }
    setIsPomodoroRunning(false);
    setCurrentSessionStartTime(null);
    setPomodoroMode(mode);
    const times = { work: 25 * 60, 'short-break': 5 * 60, 'long-break': 15 * 60 };
    setPomodoroTime(times[mode]);
  };

  const formatPomodoroTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = pomodoroMode === 'work' 
    ? (pomodoroTime / (25 * 60)) * 100 
    : pomodoroMode === 'short-break'
    ? (pomodoroTime / (5 * 60)) * 100
    : (pomodoroTime / (15 * 60)) * 100;

  const getTimerIcon = () => {
    if (pomodoroMode === 'work') return <Zap className="w-5 h-5" />;
    return <Coffee className="w-5 h-5" />;
  };

  return (
    <div className="w-full p-10">
      <div className="max-w-4xl mx-auto">
        {/* Mode Pills */}
        <div className="flex justify-center gap-2 mb-12">
          {[
            { mode: 'work' as const, label: 'Focus', time: '25m', icon: '🎯' },
            { mode: 'short-break' as const, label: 'Break', time: '5m', icon: '☕' },
            { mode: 'long-break' as const, label: 'Rest', time: '15m', icon: '🌴' }
          ].map((item) => (
            <motion.button
              key={item.mode}
              onClick={() => changePomodoroMode(item.mode)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                pomodoroMode === item.mode
                  ? 'bg-black text-white shadow-lg'
                  : 'bg-white text-black/60 hover:text-black border border-black/10'
              }`}
            >
              <span className="mr-1.5">{item.icon}</span>
              {item.label}
              <span className="ml-1.5 text-xs opacity-70">{item.time}</span>
            </motion.button>
          ))}
        </div>

        {/* Circular Timer */}
        <div className="relative mb-12">
          <div className="flex justify-center">
            <div className="relative w-[320px] h-[320px]">
              {/* Outer Ring */}
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="rgba(0,0,0,0.05)"
                  strokeWidth="4"
                />
                <motion.circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (progress / 100)}`}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={pomodoroMode === 'work' ? '#000' : pomodoroMode === 'short-break' ? '#1f1f1f' : '#050505'} />
                    <stop offset="100%" stopColor={pomodoroMode === 'work' ? '#404040' : pomodoroMode === 'short-break' ? '#3a3a3a' : '#161616'} />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  key={pomodoroTime}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <div className="mb-3 opacity-50">{getTimerIcon()}</div>
                  <div className="text-6xl font-bold tracking-tight text-black mb-2">
                    {formatPomodoroTime(pomodoroTime)}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-black/40 font-medium">
                    {pomodoroMode.replace('-', ' ')}
                  </div>
                </motion.div>
              </div>

              {/* Pulse Effect When Running */}
              <AnimatePresence>
                {isPomodoroRunning && (
                  <motion.div
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.1, opacity: 0 }}
                    exit={{ scale: 1, opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-2 border-black/20"
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Session Name - Appears on hover/focus */}
        <AnimatePresence>
          {(showNameInput || currentSessionName) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <input
                type="text"
                value={currentSessionName}
                onChange={(e) => setCurrentSessionName(e.target.value)}
                onBlur={() => !currentSessionName && setShowNameInput(false)}
                placeholder="Name this session..."
                className="w-full h-10 px-4 bg-white border border-black/10 rounded-full text-sm text-center focus:border-black focus:outline-none transition-all"
                autoFocus
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isPomodoroRunning ? pausePomodoroTimer : startPomodoroTimer}
            className={`h-14 px-10 rounded-full text-sm font-semibold text-white shadow-lg transition-all ${
              pomodoroMode === 'work' 
                ? 'bg-black hover:bg-black/90' 
                : pomodoroMode === 'short-break'
                ? 'bg-gradient-to-r from-gray-900 to-gray-700 hover:from-black hover:to-gray-800'
                : 'bg-gradient-to-r from-black to-gray-800 hover:from-black/90 hover:to-gray-700'
            }`}
          >
            {isPomodoroRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2 inline" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2 inline" />
                Start
              </>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetPomodoroTimer}
            className="h-14 w-14 rounded-full border border-black/10 hover:bg-black/5 transition-all flex items-center justify-center"
          >
            <RotateCcw className="w-4 h-4 text-black/60" />
          </motion.button>

          {!showNameInput && !currentSessionName && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNameInput(true)}
              className="h-14 px-6 rounded-full border border-black/10 hover:bg-black/5 text-sm text-black/60 transition-all"
            >
              + Name session
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
