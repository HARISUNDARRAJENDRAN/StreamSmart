"use client";

import { motion } from 'framer-motion';
import ProductivityTimer from '@/components/dashboard/productivity-timer';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, PlusCircle, CheckCircle2, History, Timer, CalendarDays } from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

type Priority = 'low' | 'medium' | 'high';
interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  dueDate?: string; // ISO date
}

function TasksPanel() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState<string>('');

  // Load and persist to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('productivityTasks');
    if (saved) setTasks(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem('productivityTasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    if (!title.trim()) return;
    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      title: title.trim(),
      done: false,
      priority,
      dueDate: dueDate || undefined,
    };
    setTasks(prev => [newTask, ...prev]);
    setTitle('');
    setPriority('medium');
    setDueDate('');
  };

  const toggleTask = (id: string) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const pending = tasks.filter(t => !t.done);
  const completed = tasks.filter(t => t.done);

  const priorityBadge = (p: Priority) => (
    <Badge variant="outline" className="text-xs" style={{ borderColor: 'hsl(var(--border))' }}>
      {p === 'high' && <span className="text-red-400">High</span>}
      {p === 'medium' && <span className="text-yellow-300">Medium</span>}
      {p === 'low' && <span className="text-green-400">Low</span>}
    </Badge>
  );

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Tasks</span>
          <Badge variant="secondary">{completed.length}/{tasks.length} done</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Add a task..."
            className="flex-1"
          />
          <Button onClick={addTask} className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Add
          </Button>
        </div>
        <div className="flex gap-2">
          <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="bg-background border border-border rounded px-2 py-2 text-sm">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-background border border-border rounded px-2 py-2 text-sm" />
        </div>

        {/* Pending */}
        <div className="space-y-2">
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground">No pending tasks.</p>
          )}
          {pending.map(task => (
            <div key={task.id} className="flex items-center justify-between p-2 rounded border border-border bg-background/60">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => toggleTask(task.id)}>
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </Button>
                <div>
                  <div className="text-sm text-foreground">{task.title}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {priorityBadge(task.priority)}
                    {task.dueDate && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{task.dueDate}</span>}
                  </div>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => deleteTask(task.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {/* Completed */}
        {completed.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Completed</div>
            {completed.map(task => (
              <div key={task.id} className="flex items-center justify-between p-2 rounded border border-border bg-background/40 opacity-80">
                <div className="flex items-center gap-2 line-through">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm">{task.title}</span>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteTask(task.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SessionsPanel() {
  const [sessions, setSessions] = useState<Array<{date: string; completed: number}>>([]);
  useEffect(() => {
    const saved = localStorage.getItem('pomodoroSessions');
    if (saved) setSessions(JSON.parse(saved));
  }, []);

  const today = new Date().toDateString();
  const weekStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return date;
  }, []);

  const { todayCount, todaySecs, weekCount, weekSecs } = useMemo(() => {
    let tc = 0, ts = 0, wc = 0, ws = 0;
    sessions.forEach(s => {
      const start = new Date(s.startTime);
      const secs = Number(s.duration || 0);
      if (start.toDateString() === today) { tc += 1; ts += secs; }
      if (start >= weekStart) { wc += 1; ws += secs; }
    });
    return { todayCount: tc, todaySecs: ts, weekCount: wc, weekSecs: ws };
  }, [sessions, today, weekStart]);

  const formatMins = (secs: number) => `${Math.round(secs / 60)}m`;

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-4 h-4" /> Session History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded bg-background/60 text-center">
            <div className="text-xs text-muted-foreground">Today</div>
            <div className="text-lg font-semibold">{todayCount} • {formatMins(todaySecs)}</div>
          </div>
          <div className="p-3 rounded bg-background/60 text-center">
            <div className="text-xs text-muted-foreground">This Week</div>
            <div className="text-lg font-semibold">{weekCount} • {formatMins(weekSecs)}</div>
          </div>
        </div>
        <div className="space-y-2 max-h-72 overflow-auto pr-1">
          {sessions.length === 0 && (
            <p className="text-sm text-muted-foreground">No sessions yet. Start a timer to log your first session.</p>
          )}
          {sessions.slice(0, 20).map(s => (
            <div key={s.id} className="flex items-center justify-between p-2 rounded border border-border bg-background/60">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-sm text-foreground">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.startTime).toLocaleString()}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{formatMins(s.duration)}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProductivityPage() {
  return (
    <div className="space-y-6">
      <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Productivity Hub</h1>
        <p className="text-sm text-muted-foreground">Focus tools, tasks, and session history in one place.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Large Timer */}
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="lg:col-span-8">
          <div className="rounded-2xl overflow-hidden border border-border bg-background">
            <ProductivityTimer />
          </div>
        </motion.div>

        {/* Right: Sidebar (Tasks + Sessions) */}
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
          <TasksPanel />
          <SessionsPanel />
        </motion.div>
      </div>
    </div>
  );
}