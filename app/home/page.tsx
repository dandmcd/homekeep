'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { UserTask, frequencyLabels, Frequency, TaskEvent } from '@/lib/database.types';
import {
  calculateNextDueDate,
  formatDate,
  getFrequencyPriority,
  getTaskUrgencyTier,
  getDaysUntilDue,
  DEFAULT_DAILY_TIME_BUDGET_MINUTES,
  TaskUrgencyTier
} from '@/lib/scheduling';
import { Spinner } from '@/components/ui/Spinner';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { FloatingBottomBar } from '@/components/layout/FloatingBottomBar';
import { TaskDetailsModal } from '@/components/tasks/TaskDetailsModal';
import { ConfirmCompleteModal } from '@/components/tasks/ConfirmCompleteModal';
import {
  Bell, Timer, ChevronRight, Check, Flame, TrendingUp,
  ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, User, Home as HomeIcon
} from 'lucide-react';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-800 p-5 ${className}`}>
      {children}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, userProfile, isInitialized, initializingTasks, household, householdMembers } = useAuth();
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [pendingTaskMap, setPendingTaskMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<UserTask | null>(null);
  const [isTimerVisible, setIsTimerVisible] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'private' | 'household'>('all');
  const [isGetAheadCollapsed, setIsGetAheadCollapsed] = useState(true);
  const [confirmTask, setConfirmTask] = useState<UserTask | null>(null);

  const budgetEnabled = userProfile?.budget_enabled !== false;
  const dailyTimeBudget = budgetEnabled
    ? (userProfile?.daily_time_budget ?? DEFAULT_DAILY_TIME_BUDGET_MINUTES)
    : 999999;

  useEffect(() => {
    async function fetchData() {
      if (!user || !isInitialized) { setLoading(false); return; }
      try {
        setLoading(true);
        let query = supabase.from('user_tasks').select(`
          id, user_id, household_id, assigned_to, core_task_id, name, frequency, room,
          estimated_time, preferred_weekday, created_at,
          core_task:core_tasks ( id, name, frequency, created_at, icon, room, estimated_time )
        `);
        if (household) {
          query = query.or(`user_id.eq.${user.id},household_id.eq.${household.id}`);
        } else {
          query = query.eq('user_id', user.id);
        }
        const { data: tasksData, error: tasksError } = await query.order('created_at', { ascending: true });
        if (tasksError) throw tasksError;

        const transformed = ((tasksData || []) as any[]).map(item => ({
          id: item.id,
          user_id: item.user_id,
          household_id: item.household_id,
          assigned_to: item.assigned_to,
          core_task_id: item.core_task_id,
          name: item.name,
          frequency: item.frequency || item.core_task?.frequency,
          room: item.room || item.core_task?.room,
          estimated_time: item.estimated_time || item.core_task?.estimated_time,
          preferred_weekday: item.preferred_weekday,
          created_at: item.created_at,
          core_task: item.core_task,
        })) as UserTask[];
        setTasks(transformed);

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const { data: eventsData } = await supabase
          .from('task_events').select('*').eq('status', 'completed').gte('completed_at', today.toISOString());
        setCompletedTaskIds(new Set(((eventsData as TaskEvent[]) || []).map(e => e.user_task_id)));

        const taskIds = transformed.map(t => t.id);
        if (taskIds.length > 0) {
          const { data: pendingData } = await supabase
            .from('task_events').select('*').in('user_task_id', taskIds).eq('status', 'pending');
          const pendingMap = new Map<string, string>();
          ((pendingData as TaskEvent[]) || []).forEach(event => {
            const cur = pendingMap.get(event.user_task_id);
            if (!cur || event.due_date < cur) pendingMap.set(event.user_task_id, event.due_date);
          });
          setPendingTaskMap(pendingMap);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, isInitialized, household]);

  const getTaskTier = (task: UserTask): TaskUrgencyTier => {
    const frequency = (task.frequency || task.core_task?.frequency) as Frequency;
    return getTaskUrgencyTier(frequency, pendingTaskMap.get(task.id) || null);
  };

  const isTaskRelevant = (task: UserTask) => {
    if (task.frequency === 'daily') return true;
    const dueDate = pendingTaskMap.get(task.id);
    if (dueDate) return dueDate <= new Date().toISOString().split('T')[0];
    return false;
  };

  const filterTaskByType = (task: UserTask) => {
    if (taskFilter === 'private') return !task.household_id;
    if (taskFilter === 'household') return !!task.household_id;
    return true;
  };

  const getSortedActiveTasks = () => {
    const tierOrder: Record<TaskUrgencyTier, number> = { overdue: 0, urgent: 1, primary: 2, get_ahead: 3 };
    return tasks.filter(t => !completedTaskIds.has(t.id)).sort((a, b) => {
      const aTier = tierOrder[getTaskTier(a)]; const bTier = tierOrder[getTaskTier(b)];
      if (aTier !== bTier) return aTier - bTier;
      const aFreq = (a.frequency || a.core_task?.frequency) as Frequency;
      const bFreq = (b.frequency || b.core_task?.frequency) as Frequency;
      const aFP = getFrequencyPriority(aFreq); const bFP = getFrequencyPriority(bFreq);
      if (aFP !== bFP) return aFP - bFP;
      return (a.estimated_time || 10) - (b.estimated_time || 10);
    });
  };

  const getBudgetedTasks = () => {
    const sorted = getSortedActiveTasks();
    const budgeted: UserTask[] = []; const overflow: UserTask[] = [];
    let currentTime = 0; let overdueInOverflow = 0;
    for (const task of sorted) {
      const tier = getTaskTier(task);
      const taskTime = task.estimated_time || 10;
      if (currentTime + taskTime <= dailyTimeBudget) {
        budgeted.push(task); currentTime += taskTime;
      } else {
        overflow.push(task);
        if (tier === 'overdue') overdueInOverflow++;
      }
    }
    return { budgeted, overflow, totalTime: currentTime, overdueInOverflow };
  };

  const getTodaysTasks = () => getBudgetedTasks().budgeted;
  const getFocusTasks = () => getTodaysTasks().slice(0, 4);
  const getGetAheadTasks = () => {
    const { overflow } = getBudgetedTasks();
    return overflow.sort((a, b) => {
      const aDue = pendingTaskMap.get(a.id); const bDue = pendingTaskMap.get(b.id);
      if (aDue && bDue) return aDue.localeCompare(bDue);
      return aDue ? -1 : bDue ? 1 : 0;
    });
  };

  const getDailyProgress = () => {
    const relevant = tasks.filter(t => isTaskRelevant(t));
    const done = relevant.filter(t => completedTaskIds.has(t.id));
    return { percent: relevant.length > 0 ? Math.round((done.length / relevant.length) * 100) : 0, count: done.length, total: relevant.length };
  };

  const handleMarkDone = async (task: UserTask) => {
    setCompletedTaskIds(prev => new Set(prev).add(task.id));
    setIsTimerVisible(false); setActiveTask(null);
    try {
      const { error } = await supabase.from('task_events').insert({
        user_task_id: task.id, status: 'completed',
        due_date: new Date().toISOString().split('T')[0], completed_at: new Date().toISOString()
      });
      if (error) throw error;
      const frequency = task.frequency || task.core_task?.frequency;
      if (frequency) {
        const nextDue = calculateNextDueDate(frequency as Frequency, new Date(), frequency === 'weekly' ? task.preferred_weekday : undefined);
        await supabase.from('task_events').insert({ user_task_id: task.id, status: 'pending', due_date: formatDate(nextDue) });
      }
    } catch (err) {
      setCompletedTaskIds(prev => { const n = new Set(prev); n.delete(task.id); return n; });
      alert('Failed to save progress. Please try again.');
    }
  };

  const handleTaskUpdate = (taskId: string, updates: { household_id?: string | null; assigned_to?: string | null; preferred_weekday?: number }) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    if (activeTask?.id === taskId) setActiveTask(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleCircleClick = (task: UserTask) => {
    const frequency = task.frequency || task.core_task?.frequency;
    if (frequency) {
      setConfirmTask(task);
    } else {
      handleMarkDone(task);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const displayName = userProfile?.first_name || null;

  if (initializingTasks || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center gap-4 pb-24">
        <Spinner size="lg" />
        <p className="text-gray-500">Setting things up...</p>
        <FloatingBottomBar />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center pb-24">
        <p className="text-red-500 text-center px-5">{error}</p>
        <FloatingBottomBar />
      </div>
    );
  }

  const focusTasks = getFocusTasks();
  const activeFocusIds = new Set(focusTasks.map(t => t.id));
  const progress = getDailyProgress();
  const { overdueInOverflow } = getBudgetedTasks();
  const todaysTasks = getTodaysTasks();
  const getAheadTasks = getGetAheadTasks();

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">
      {/* Top App Bar */}
      <div className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-4 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/settings')} className="active:opacity-80">
            <UserAvatar className="w-10 h-10" textClassName="text-xs" />
          </button>
          <button className="w-10 h-10 rounded-full bg-surface-light dark:bg-surface-dark flex items-center justify-center">
            <Bell size={22} className="text-text-main dark:text-white" />
          </button>
        </div>
      </div>

      {/* Greeting & Progress */}
      <div className="px-4 pt-2 pb-6">
        <h1 className="text-3xl font-bold leading-tight mb-1 text-gray-900 dark:text-white">
          {greeting}{displayName ? `, ${displayName}! ☀️` : '! ☀️'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Let&apos;s keep the house sparkling today.</p>

        <Card className="mt-6">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Daily Progress</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{progress.percent}%</span>
                <span className="text-sm text-gray-400">completed</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 dark:bg-primary/10 rounded-full">
              <Flame size={14} className="text-primary" />
              <span className="text-xs font-bold text-gray-800 dark:text-primary">{progress.count}/{progress.total} Tasks</span>
            </div>
          </div>
          <div className="h-3 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Focus For Today */}
      <div className="mb-8">
        <div className="px-4 flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Focus for Today</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x">
          {focusTasks.length === 0 ? (
            <Card className="w-[300px] flex-shrink-0 flex flex-col items-center justify-center h-[200px] snap-start">
              <Check size={48} className="text-primary mb-4" />
              <p className="text-lg font-bold dark:text-white">All caught up!</p>
              <p className="text-gray-500 mt-2 text-center text-sm">You&apos;ve completed your focus tasks for today.</p>
            </Card>
          ) : focusTasks.map(task => (
            <Card key={task.id} className="w-[220px] flex-shrink-0 h-[200px] flex flex-col justify-between relative overflow-hidden snap-start">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Timer size={80} className="text-primary" />
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                  <Timer size={18} className="text-primary" />
                </div>
                <p className="font-bold text-lg leading-tight mb-1 dark:text-white line-clamp-2">{task.name || task.core_task?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {task.room ? `${task.room} · ` : ''}{task.estimated_time ? `${task.estimated_time} min` : 'Quick Task'}
                </p>
              </div>
              {task.estimated_time ? (
                <button
                  onClick={() => { setActiveTask(task); setIsTimerVisible(true); }}
                  className="w-full py-2.5 rounded-full bg-gray-900 dark:bg-white font-bold text-sm text-white dark:text-gray-900 hover:opacity-90 active:opacity-80"
                >Start Timer</button>
              ) : (
                <button
                  onClick={() => handleCircleClick(task)}
                  className="w-full py-2.5 rounded-full bg-gray-100 dark:bg-zinc-800 font-bold text-sm text-gray-900 dark:text-white hover:bg-gray-200 active:opacity-80"
                >Mark Done</button>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="px-4 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Today&apos;s Tasks</h2>
          {household && (
            <div className="flex bg-surface-light dark:bg-surface-dark rounded-full p-1 border border-gray-100 dark:border-zinc-700 text-xs font-bold">
              {(['all', 'private', 'household'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  className={`px-2.5 py-1 rounded-full flex items-center gap-0.5 transition-colors ${f === 'all' && taskFilter === f ? 'bg-primary text-gray-900' : f === 'private' && taskFilter === f ? 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-200' : f === 'household' && taskFilter === f ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {f === 'private' && <User size={10} className="mr-0.5" />}
                  {f === 'household' && <HomeIcon size={10} className="mr-0.5" />}
                  {f === 'all' ? 'All' : f === 'private' ? 'Mine' : 'Shared'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {todaysTasks.filter(t => !activeFocusIds.has(t.id) && filterTaskByType(t)).map(task => {
              const tier = getTaskTier(task);
              const isOverdue = tier === 'overdue';
              const dueDate = pendingTaskMap.get(task.id);
              const daysOverdue = dueDate ? -getDaysUntilDue(dueDate) : 0;

              return (
                <motion.div key={task.id} layout exit={{ x: -100, opacity: 0 }} transition={{ duration: 0.25 }}>
                  <div className={`flex items-center p-3 rounded-xl ${isOverdue ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800' : 'bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800'}`}>
                    <button
                      onClick={() => handleCircleClick(task)}
                      className="w-10 h-10 flex items-center justify-center -ml-2 mr-1 flex-shrink-0 active:opacity-50"
                    >
                      <span className={`w-6 h-6 rounded-full border-2 block ${isOverdue ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                    </button>
                    <button
                      className="flex-1 flex items-center gap-3 min-w-0"
                      onClick={() => task.estimated_time ? (setActiveTask(task), setIsTimerVisible(true)) : handleMarkDone(task)}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-zinc-800'}`}>
                        <Timer size={14} className={isOverdue ? 'text-red-600' : 'text-gray-500'} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-medium text-text-main dark:text-white truncate">{task.name || task.core_task?.name || 'Task'}</p>
                          {isOverdue && <span className="flex-shrink-0 text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded">OVERDUE</span>}
                        </div>
                        <p className="text-xs text-gray-500">
                          {task.household_id && <HomeIcon size={10} className="inline text-blue-500 mr-1" />}
                          {task.room ? `${task.room} · ` : ''}
                          {task.frequency ? frequencyLabels[task.frequency as Frequency] : 'Daily'}
                          {task.estimated_time ? ` · ${task.estimated_time} min` : ''}
                          {isOverdue && daysOverdue > 0 && <span className="text-red-500 font-medium"> · {daysOverdue}d overdue</span>}
                        </p>
                      </div>
                      {task.assigned_to && householdMembers.find(m => m.user_id === task.assigned_to) && (
                        <UserAvatar className="w-7 h-7 flex-shrink-0" textClassName="text-xs" name={householdMembers.find(m => m.user_id === task.assigned_to)?.profile?.first_name} />
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-50 dark:bg-zinc-800'}`}>
                        {task.estimated_time ? <Timer size={16} className={isOverdue ? 'text-red-600' : 'text-gray-400'} /> : <ChevronRight size={16} className={isOverdue ? 'text-red-400' : 'text-gray-300'} />}
                      </div>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {tasks.filter(t => completedTaskIds.has(t.id) && filterTaskByType(t)).slice(0, 5).map(task => (
            <div key={task.id} className="flex items-center p-3 bg-surface-light/50 dark:bg-surface-dark/50 rounded-xl border border-gray-100 dark:border-gray-800/50">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center mr-4 flex-shrink-0">
                <Check size={12} className="text-gray-900" strokeWidth={3} />
              </div>
              <div className="flex-1 opacity-50 min-w-0">
                <p className="text-base font-medium dark:text-white line-through truncate">{task.name || task.core_task?.name}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </div>
          ))}

          {tasks.filter(t => filterTaskByType(t)).length === 0 && (
            <p className="text-gray-400 italic text-center py-4">
              {taskFilter === 'all' ? 'No tasks yet. Add some!' : taskFilter === 'private' ? 'No private tasks' : 'No shared household tasks'}
            </p>
          )}

          {todaysTasks.filter(t => !completedTaskIds.has(t.id)).length === 0 && getAheadTasks.length > 0 && (
            <button
              onClick={() => setIsGetAheadCollapsed(false)}
              className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 mt-2 text-left w-full"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Check size={22} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-green-800 dark:text-green-200">All done for today! 🎉</p>
                <p className="text-sm text-green-600 dark:text-green-400">{getAheadTasks.length} more tasks waiting in Get Ahead</p>
              </div>
              <ChevronRight size={18} className="text-green-600 flex-shrink-0" />
            </button>
          )}

          {overdueInOverflow > 0 && (
            <button
              onClick={() => setIsGetAheadCollapsed(false)}
              className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 mt-2 text-left w-full"
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={22} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-amber-800 dark:text-amber-200">{overdueInOverflow} overdue tasks in Get Ahead</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">Budget is full. Tap to view and add more.</p>
              </div>
              <ChevronRight size={18} className="text-amber-600 flex-shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* Get Ahead */}
      {getAheadTasks.length > 0 && (
        <div className="px-4 mb-8">
          <button
            onClick={() => setIsGetAheadCollapsed(!isGetAheadCollapsed)}
            className="flex items-center justify-between mb-3 w-full"
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">Get Ahead</span>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400">{getAheadTasks.length} tasks</span>
            </div>
            {isGetAheadCollapsed ? <ChevronDown size={22} className="text-gray-400" /> : <ChevronUp size={22} className="text-gray-400" />}
          </button>

          {!isGetAheadCollapsed && (
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {getAheadTasks.slice(0, 5).map(task => {
                  const dueDate = pendingTaskMap.get(task.id);
                  const daysUntil = dueDate ? getDaysUntilDue(dueDate) : null;
                  return (
                    <motion.div key={task.id} layout exit={{ x: -100, opacity: 0 }} transition={{ duration: 0.25 }}>
                      <div className="flex items-center p-3 bg-surface-light/70 dark:bg-surface-dark/70 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <button onClick={() => handleCircleClick(task)} className="w-10 h-10 flex items-center justify-center -ml-2 mr-1 flex-shrink-0 active:opacity-50">
                          <span className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 block" />
                        </button>
                        <button
                          className="flex-1 flex items-center gap-3 min-w-0"
                          onClick={() => task.estimated_time ? (setActiveTask(task), setIsTimerVisible(true)) : handleMarkDone(task)}
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-100/50 dark:bg-zinc-800/50 flex items-center justify-center flex-shrink-0">
                            <Timer size={14} className="text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-base font-medium text-gray-600 dark:text-gray-300 truncate">{task.name || task.core_task?.name || 'Task'}</p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-400">
                                {task.frequency ? frequencyLabels[task.frequency as Frequency] : ''}
                                {task.estimated_time ? ` · ${task.estimated_time} min` : ''}
                              </span>
                              {daysUntil !== null && (
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                  {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {getAheadTasks.length > 5 && (
                <p className="text-sm font-medium text-primary text-center py-2 cursor-pointer">View all {getAheadTasks.length} tasks →</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Home Health Widget */}
      <div className="px-4 mb-6">
        <div className="bg-gray-900 dark:bg-surface-dark rounded-xl p-5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          <div className="relative z-10">
            <p className="font-bold text-lg mb-1 text-white">Home Health</p>
            <p className="text-gray-400 text-sm mb-3">All systems operational</p>
            <div className="flex gap-2">
              <span className="px-2 py-1 rounded bg-white/10 text-xs font-medium text-white">HVAC OK</span>
              <span className="px-2 py-1 rounded bg-white/10 text-xs font-medium text-white">Filters OK</span>
            </div>
          </div>
          <div className="relative z-10 w-14 h-14 rounded-full border-4 border-primary/30 flex items-center justify-center">
            <ShieldCheck size={28} className="text-primary" />
          </div>
        </div>
      </div>

      <FloatingBottomBar />

      {activeTask && (
        <TaskDetailsModal
          isVisible={isTimerVisible}
          onClose={() => setIsTimerVisible(false)}
          onComplete={() => handleMarkDone(activeTask)}
          taskName={activeTask.name || activeTask.core_task?.name || 'Task'}
          durationMinutes={activeTask.estimated_time || 15}
          taskDetails={{
            frequency: activeTask.frequency || activeTask.core_task?.frequency,
            room: activeTask.room || activeTask.core_task?.room,
            dueDate: pendingTaskMap.get(activeTask.id),
            assignedTo: activeTask.assigned_to,
            householdId: activeTask.household_id,
            preferredWeekday: activeTask.preferred_weekday,
            id: activeTask.id,
          }}
          household={household}
          members={householdMembers}
          onTaskUpdate={handleTaskUpdate}
        />
      )}

      {confirmTask && (
        <ConfirmCompleteModal
          isVisible={!!confirmTask}
          taskName={confirmTask.name || confirmTask.core_task?.name || 'Task'}
          frequency={(confirmTask.frequency || confirmTask.core_task?.frequency) as Frequency}
          preferredWeekday={confirmTask.preferred_weekday}
          currentDueDate={pendingTaskMap.get(confirmTask.id)}
          room={confirmTask.room || confirmTask.core_task?.room}
          onConfirm={() => { handleMarkDone(confirmTask); setConfirmTask(null); }}
          onCancel={() => setConfirmTask(null)}
        />
      )}
    </div>
  );
}
