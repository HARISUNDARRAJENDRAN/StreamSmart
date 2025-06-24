"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Pause, RotateCcw, Music, Coffee, Timer, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PomodoroSession {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: 'work' | 'short-break' | 'long-break';
}

const motivationalQuotes = [
  "When you feel like giving up, remember why you started 🌟",
  "Success is the sum of small efforts repeated day in and day out 💪",
  "The future depends on what you do today 🚀",
  "Focus on progress, not perfection ✨",
  "Every expert was once a beginner 🌱",
  "Your only limit is you 🔥",
  "Dream big, work hard, stay focused 🎯",
  "Consistency is the key to success 🗝️",
];

export default function ProductivityTimer() {
  // Pomodoro States
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60); // 25 minutes in seconds
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [currentSessionName, setCurrentSessionName] = useState('');
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSession[]>([]);
  const [currentSessionStartTime, setCurrentSessionStartTime] = useState<Date | null>(null);
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'short-break' | 'long-break'>('work');

  // Stopwatch States
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const stopwatchStartTimeRef = useRef<number>(0);

  // Common States
  const [currentQuote, setCurrentQuote] = useState('');
  const [activeTab, setActiveTab] = useState<'pomodoro' | 'stopwatch'>('pomodoro');

  // Refs for intervals
  const pomodoroIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize component
  useEffect(() => {
    // Load sessions from localStorage
    const savedSessions = localStorage.getItem('pomodoroSessions');
    if (savedSessions) {
      setPomodoroSessions(JSON.parse(savedSessions));
    }

    // Set random quote
    setCurrentQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  // Pomodoro functions
  const savePomodoroSession = useCallback(() => {
    if (currentSessionStartTime) {
      const session: PomodoroSession = {
        id: Date.now(),
        name: currentSessionName || `${pomodoroMode.charAt(0).toUpperCase() + pomodoroMode.slice(1)} Session`,
        startTime: currentSessionStartTime.toISOString(),
        endTime: new Date().toISOString(),
        duration: pomodoroMode === 'work' ? 25 * 60 : pomodoroMode === 'short-break' ? 5 * 60 : 15 * 60,
        type: pomodoroMode
      };

      const updatedSessions = [session, ...pomodoroSessions];
      setPomodoroSessions(updatedSessions);
      localStorage.setItem('pomodoroSessions', JSON.stringify(updatedSessions));
      setCurrentSessionStartTime(null);
      setCurrentSessionName('');
    }
  }, [currentSessionStartTime, currentSessionName, pomodoroMode, pomodoroSessions]);

  // Pomodoro timer effect
  useEffect(() => {
    if (isPomodoroRunning && pomodoroTime > 0) {
      pomodoroIntervalRef.current = setInterval(() => {
        setPomodoroTime(prev => {
          if (prev <= 1) {
            setIsPomodoroRunning(false);
            savePomodoroSession();
            // Show notification if supported
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Pomodoro Timer', {
                body: `${pomodoroMode === 'work' ? 'Work session' : 'Break'} completed!`,
                icon: '/favicon.ico'
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
  }, [isPomodoroRunning, pomodoroTime, savePomodoroSession]);

  // Stopwatch timer effect
  useEffect(() => {
    if (isStopwatchRunning) {
      stopwatchIntervalRef.current = setInterval(() => {
        const now = performance.now();
        setStopwatchTime(now - stopwatchStartTimeRef.current);
      }, 10);
    } else {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
        stopwatchIntervalRef.current = null;
      }
    }

    return () => {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
    };
  }, [isStopwatchRunning]);

  // Request notification permission
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

  // Stopwatch functions
  const startStopwatch = () => {
    if (!isStopwatchRunning) {
      stopwatchStartTimeRef.current = performance.now() - stopwatchTime;
    }
    setIsStopwatchRunning(true);
  };

  const pauseStopwatch = () => {
    setIsStopwatchRunning(false);
  };

  const resetStopwatch = () => {
    setIsStopwatchRunning(false);
    setStopwatchTime(0);
    stopwatchStartTimeRef.current = 0;
  };

  // Format time functions
  const formatPomodoroTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatStopwatchTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const formatSessionTime = (isoString: string): string => {
    return new Date(isoString).toLocaleString();
  };

  const openSpotifyFocus = () => {
    window.open('https://open.spotify.com/search/lofi%20focus%20study', '_blank');
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-red-950/20 to-black">
        {/* Floating particles */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-red-500/30 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
            }}
            animate={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
            }}
            transition={{
              duration: Math.random() * 20 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
        
        {/* Pulsing circles */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`circle-${i}`}
            className="absolute rounded-full border border-red-500/10"
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Top Bar */}
      <motion.div 
        className="relative z-20 flex items-center justify-between px-8 py-6 mt-4 border-b border-red-500/20 backdrop-blur-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Left Side - Title */}
        <motion.div 
          className="flex items-center space-x-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.h1 
            className="text-xl font-bold bg-gradient-to-r from-red-500 via-white to-red-500 bg-clip-text text-transparent"
            animate={{ 
              backgroundPosition: ["0%", "100%", "0%"],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            Productivity Hub
          </motion.h1>
          <motion.p 
            className="text-gray-400 text-sm hidden md:block"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Stay focused and achieve your goals
          </motion.p>
        </motion.div>

        {/* Right Side - Tab Selection */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pomodoro' | 'stopwatch')} className="w-auto">
            <TabsList className="grid w-full grid-cols-2 bg-red-950/30 border border-red-500/30">
              <TabsTrigger 
                value="pomodoro" 
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:bg-red-500/20 transition-all duration-300 font-medium"
              >
                <Timer className="w-4 h-4 mr-2" />
                Pomodoro
              </TabsTrigger>
              <TabsTrigger 
                value="stopwatch" 
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:bg-red-500/20 transition-all duration-300 font-medium"
              >
                <Coffee className="w-4 h-4 mr-2" />
                Stopwatch
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>
      </motion.div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex pt-4">
        {/* Left Control Panel - Contextual Controls */}
        {activeTab === 'pomodoro' && (
          <motion.div 
            className="w-72 flex flex-col justify-center space-y-4 px-6 py-8"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            {/* Mode Selection */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Timer Mode</h3>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  className={`w-full justify-start transition-all duration-300 py-3 ${
                    pomodoroMode === 'work' 
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' 
                      : 'bg-red-950/30 text-gray-300 hover:bg-red-500/20 border border-red-500/30'
                  }`}
                  onClick={() => changePomodoroMode('work')}
                >
                  Work (25m)
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  className={`w-full justify-start transition-all duration-300 py-3 ${
                    pomodoroMode === 'short-break' 
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' 
                      : 'bg-red-950/30 text-gray-300 hover:bg-red-500/20 border border-red-500/30'
                  }`}
                  onClick={() => changePomodoroMode('short-break')}
                >
                  Short Break (5m)
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  className={`w-full justify-start transition-all duration-300 py-3 ${
                    pomodoroMode === 'long-break' 
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' 
                      : 'bg-red-950/30 text-gray-300 hover:bg-red-500/20 border border-red-500/30'
                  }`}
                  onClick={() => changePomodoroMode('long-break')}
                >
                  Long Break (15m)
                </Button>
              </motion.div>
            </motion.div>

            {/* Session Name Input */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Session Name</h3>
              <Input
                value={currentSessionName}
                onChange={(e) => setCurrentSessionName(e.target.value)}
                placeholder="Name your session"
                className="bg-red-950/20 border-2 border-red-500/30 text-white placeholder-gray-400 focus:bg-red-950/30 focus:border-red-400 transition-all duration-300 text-sm py-2 backdrop-blur-sm"
              />
            </motion.div>

            {/* Session History Button */}
            <motion.div 
              className="pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <Button
                variant="outline"
                className="w-full border-red-500/30 text-red-400 hover:bg-red-950/30 hover:border-red-400 transition-all duration-300"
              >
                <History className="w-4 h-4 mr-2" />
                View Session History ({pomodoroSessions.length})
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Central Timer Area */}
        <div className="flex-1 flex flex-col justify-center items-center px-8">
          {activeTab === 'pomodoro' && (
            <motion.div 
              className="flex flex-col items-center space-y-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              {/* Circular Clock Timer */}
              <motion.div 
                className="relative flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.8, type: "spring" }}
              >
                {/* Outer Circle */}
                <motion.div
                  className="w-72 h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 xl:w-[28rem] xl:h-[28rem] rounded-full border-4 border-red-500/30 relative"
                  animate={{ rotate: isPomodoroRunning ? 360 : 0 }}
                  transition={{ duration: 60, repeat: isPomodoroRunning ? Infinity : 0, ease: "linear" }}
                >
                  {/* Progress Circle */}
                  <svg className="w-full h-full absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="rgba(239, 68, 68, 0.1)"
                      strokeWidth="2"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="url(#redGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - (pomodoroTime / (pomodoroMode === 'work' ? 25 * 60 : pomodoroMode === 'short-break' ? 5 * 60 : 15 * 60)))}`}
                      className="transition-all duration-1000 ease-out"
                      animate={{
                        filter: isPomodoroRunning ? [
                          "drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))",
                          "drop-shadow(0 0 20px rgba(239, 68, 68, 0.8))",
                          "drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))"
                        ] : "drop-shadow(0 0 5px rgba(239, 68, 68, 0.3))"
                      }}
                      transition={{ duration: 2, repeat: isPomodoroRunning ? Infinity : 0 }}
                    />
                    <defs>
                      <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="50%" stopColor="#dc2626" />
                        <stop offset="100%" stopColor="#b91c1c" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Clock Numbers */}
                  {[12, 3, 6, 9].map((num, index) => {
                    const angle = (index * 90 - 90) * (Math.PI / 180);
                    const x = 50 + 35 * Math.cos(angle);
                    const y = 50 + 35 * Math.sin(angle);
                    return (
                      <div
                        key={num}
                        className="absolute text-red-400 font-bold text-lg md:text-xl lg:text-2xl"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        {num}
                      </div>
                    );
                  })}

                  {/* Center Timer Display */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      className="text-center"
                      animate={{ 
                        scale: isPomodoroRunning ? [1, 1.05, 1] : 1,
                      }}
                      transition={{ duration: 2, repeat: isPomodoroRunning ? Infinity : 0 }}
                    >
                      <motion.div 
                        className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold font-mono text-white"
                        animate={{
                          textShadow: isPomodoroRunning ? [
                            "0 0 20px rgba(239, 68, 68, 0.5)",
                            "0 0 30px rgba(239, 68, 68, 0.8)",
                            "0 0 20px rgba(239, 68, 68, 0.5)"
                          ] : "0 0 10px rgba(239, 68, 68, 0.3)"
                        }}
                        transition={{ duration: 2, repeat: isPomodoroRunning ? Infinity : 0 }}
                      >
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={formatPomodoroTime(pomodoroTime)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                          >
                            {formatPomodoroTime(pomodoroTime)}
                          </motion.span>
                        </AnimatePresence>
                      </motion.div>
                      <motion.p 
                        className="text-red-400 text-sm md:text-base lg:text-lg font-semibold mt-2"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {pomodoroMode.replace('-', ' ').toUpperCase()}
                      </motion.p>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Control Buttons Row */}
              <motion.div 
                className="flex justify-center items-center gap-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={isPomodoroRunning ? pausePomodoroTimer : startPomodoroTimer}
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 text-lg transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 border-2 border-red-500"
                  >
                    <motion.div
                      animate={{ rotate: isPomodoroRunning ? 0 : 360 }}
                      transition={{ duration: 0.3 }}
                    >
                      {isPomodoroRunning ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                    </motion.div>
                    {isPomodoroRunning ? 'Pause' : 'Start'}
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={resetPomodoroTimer}
                    size="lg"
                    variant="outline"
                    className="border-2 border-red-500/50 text-red-400 hover:bg-red-950/30 hover:border-red-400 font-bold px-8 py-4 text-lg transition-all duration-300 backdrop-blur-sm"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Reset
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={openSpotifyFocus}
                    size="lg"
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold px-6 py-4 text-lg transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 border-2 border-red-500/50 backdrop-blur-sm"
                  >
                    <Music className="w-5 h-5 mr-2" />
                    Focus Music
                  </Button>
                </motion.div>
              </motion.div>

              {/* Motivational Quote */}
              <motion.div 
                className="text-center max-w-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.8 }}
              >
                <motion.p 
                  className="text-base italic text-white/80 font-light tracking-wide"
                  animate={{
                    textShadow: [
                      "0 0 10px rgba(239, 68, 68, 0.3)",
                      "0 0 15px rgba(239, 68, 68, 0.4)",
                      "0 0 10px rgba(239, 68, 68, 0.3)"
                    ]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  "{currentQuote}"
                </motion.p>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'stopwatch' && (
            <motion.div 
              className="flex flex-col items-center space-y-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {/* Stopwatch Display */}
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                <motion.div 
                  className="text-4xl md:text-6xl lg:text-8xl xl:text-9xl font-bold text-white font-mono tracking-wider leading-none"
                  animate={{ 
                    scale: isStopwatchRunning ? [1, 1.01, 1] : 1,
                    textShadow: isStopwatchRunning ? [
                      "0 0 30px rgba(255,255,255,0.3)",
                      "0 0 50px rgba(255,255,255,0.5)",
                      "0 0 30px rgba(255,255,255,0.3)"
                    ] : "0 0 20px rgba(255,255,255,0.2)"
                  }}
                  transition={{ 
                    duration: 1, 
                    repeat: isStopwatchRunning ? Infinity : 0, 
                    ease: "easeInOut" 
                  }}
                >
                  <motion.span
                    animate={{ 
                      color: isStopwatchRunning ? ["#ffffff", "#f0f0f0", "#ffffff"] : "#ffffff"
                    }}
                    transition={{ duration: 0.5, repeat: isStopwatchRunning ? Infinity : 0 }}
                  >
                    {formatStopwatchTime(stopwatchTime)}
                  </motion.span>
                </motion.div>
              </motion.div>

              {/* Control Buttons Row */}
              <motion.div 
                className="flex justify-center items-center gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={isStopwatchRunning ? pauseStopwatch : startStopwatch}
                    size="lg"
                    className="bg-white text-black hover:bg-gray-200 font-semibold px-8 py-4 text-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <motion.div
                      animate={{ rotate: isStopwatchRunning ? 0 : 360 }}
                      transition={{ duration: 0.3 }}
                    >
                      {isStopwatchRunning ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                    </motion.div>
                    {isStopwatchRunning ? 'Pause' : 'Start'}
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={resetStopwatch}
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-4 text-lg transition-all duration-300"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Reset
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={openSpotifyFocus}
                    size="lg"
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold px-6 py-4 text-lg transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 border-2 border-red-500/50 backdrop-blur-sm"
                  >
                    <Music className="w-5 h-5 mr-2" />
                    Focus Music
                  </Button>
                </motion.div>
              </motion.div>

              {/* Motivational Quote */}
              <motion.div 
                className="text-center max-w-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.8 }}
              >
                <motion.p 
                  className="text-base italic text-white/80 font-light tracking-wide"
                  animate={{
                    textShadow: [
                      "0 0 10px rgba(239, 68, 68, 0.3)",
                      "0 0 15px rgba(239, 68, 68, 0.4)",
                      "0 0 10px rgba(239, 68, 68, 0.3)"
                    ]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  "{currentQuote}"
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
} 