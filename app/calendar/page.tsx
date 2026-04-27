'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/Spinner';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { FloatingBottomBar } from '@/components/layout/FloatingBottomBar';
import { TaskDetailsModal } from '@/components/tasks/TaskDetailsModal';
import { ConfirmCompleteModal } from '@/components/tasks/ConfirmCompleteModal';
import { Frequency, frequencyLabels } from '@/lib/database.types';
import { calculateNextDueDate, formatDate } from '@/lib/scheduling';
import { CalendarDays, Timer, ChevronRight, ChevronLeft, Check, Home as HomeIcon } from 'lucide-react';

interface TaskEventItem {
  id: string;
  user_task_id: string;
  name: string;
  status: 'pending' | 'completed' | 'skipped';
  frequency?: Frequency;
  due_date: string;
  room?: string;
  estimated_time?: number;
  icon?: string;
  assigned_to?: string | null;
  household_id?: string | null;
  preferred_weekday?: number;
}

function MonthCalendar({
  selectedDate,
  onSelectDate,
  markedDates,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  markedDates: Set<string>;
}) {
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate + 'T00:00:00'));
  const today = new Date().toISOString().split('T')[0];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const toDateStr = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-white/5 p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
          <ChevronLeft size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <span className="text-sm font-bold text-gray-900 dark:text-white">{monthLabel}</span>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
          <ChevronRight size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = toDateStr(day);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          const hasTask = markedDates.has(dateStr);
          return (
            <button
              key={i}
              onClick={() => onSelectDate(dateStr)}
              className={`relative flex flex-col items-center justify-center h-9 rounded-full text-sm font-semibold transition-colors ${isSelected ? 'bg-primary text-gray-900' : isToday ? 'text-primary' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'}`}
            >
              {day}
              {hasTask && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { user, userProfile, household, householdMembers } = useAuth();
  const [tasks, setTasks] = useState<TaskEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeTask, setActiveTask] = useState<TaskEventItem | null>(null);
  const [isTimerVisible, setIsTimerVisible] = useState(false);
  const [confirmTask, setConfirmTask] = useState<TaskEventItem | null>(null);

  const fetchEvents = useCallback(async (startDate: Date, endDate: Date, silent = false) => {
    if (!user) { setLoading(false); return; }
    try {
      if (!silent) setLoading(true);
      const { data, error } = await supabase
        .from('task_events')
        .select(`
          id, due_date, status, user_task_id,
          user_task:user_tasks (
            id, name, frequency, room, assigned_to, household_id, preferred_weekday,
            core_task:core_tasks ( name, frequency, icon, room, estimated_time )
          )
        `)
        .gte('due_date', startDate.toISOString().split('T')[0])
        .lte('due_date', endDate.toISOString().split('T')[0])
        .order('due_date', { ascending: true });
      if (error) throw error;

      const mapped: TaskEventItem[] = (data as any[]).map((event) => ({
        id: event.id,
        user_task_id: event.user_task_id,
        name: event.user_task?.name || event.user_task?.core_task?.name || 'Unknown Task',
        status: event.status,
        frequency: event.user_task?.frequency || event.user_task?.core_task?.frequency,
        due_date: event.due_date,
        room: event.user_task?.room || event.user_task?.core_task?.room,
        estimated_time: event.user_task?.estimated_time || event.user_task?.core_task?.estimated_time,
        icon: event.user_task?.core_task?.icon,
        assigned_to: event.user_task?.assigned_to,
        household_id: event.user_task?.household_id,
        preferred_weekday: event.user_task?.preferred_weekday,
      }));

      setTasks(prev => {
        const newIds = new Set(mapped.map(t => t.id));
        return [...prev.filter(t => !newIds.has(t.id)), ...mapped];
      });
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 2);
    fetchEvents(start, end);
  }, [fetchEvents]);

  const handleToggleStatus = async (item: TaskEventItem) => {
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    setIsTimerVisible(false);
    setActiveTask(null);

    try {
      const { error } = await supabase
        .from('task_events')
        .update({ status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null })
        .eq('id', item.id);
      if (error) throw error;

      if (newStatus === 'completed' && item.frequency) {
        const nextDue = calculateNextDueDate(item.frequency, new Date(), item.frequency === 'weekly' ? item.preferred_weekday : undefined);
        await supabase.from('task_events').insert({ user_task_id: item.user_task_id, status: 'pending', due_date: formatDate(nextDue) });
        const start = new Date(); start.setDate(1);
        const end = new Date(start); end.setMonth(end.getMonth() + 2);
        fetchEvents(start, end, true);
      }

      setTasks(prev => prev.map(t => t.id === item.id ? { ...t, status: newStatus as TaskEventItem['status'] } : t));
    } catch (err) {
      console.error('Error updating task:', err);
      alert(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleTaskUpdate = (taskId: string, updates: { household_id?: string | null; assigned_to?: string | null; preferred_weekday?: number }) => {
    setTasks(prev => prev.map(t => (t.id === taskId || t.user_task_id === taskId) ? { ...t, ...updates } : t));
    if (activeTask?.id === taskId || activeTask?.user_task_id === taskId) {
      setActiveTask(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleCircleClick = (task: TaskEventItem) => {
    if (task.status === 'completed') {
      handleToggleStatus(task);   // un-complete: no confirmation needed
      return;
    }
    if (task.frequency) {
      setConfirmTask(task);       // recurring pending→complete: show modal
    } else {
      handleToggleStatus(task);   // one-time: no confirmation
    }
  };

  const dateStrip = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const displayName = userProfile?.first_name || user?.email?.split('@')[0] || 'User';

  const tasksForDate = tasks.filter(t => t.due_date === selectedDate);
  const activeTasks = tasksForDate.filter(t => t.status !== 'completed');
  const completedTasks = tasksForDate.filter(t => t.status === 'completed');

  const markedDates = new Set(tasks.filter(t => t.status === 'pending').map(t => t.due_date));

  const selectedLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md pt-12 px-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <UserAvatar className="w-10 h-10" textClassName="text-xs" />
            <div>
              <p className="text-xs font-semibold text-text-muted dark:text-gray-400 uppercase tracking-wider">{greeting}</p>
              <p className="text-lg font-bold text-text-main dark:text-white leading-tight">{displayName}! ☀️</p>
            </div>
          </div>
          <div className="flex bg-surface-light dark:bg-surface-dark rounded-full p-1 border border-gray-100 dark:border-white/10">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${viewMode === 'week' ? 'bg-primary text-gray-900' : 'text-text-muted dark:text-gray-400'}`}
            >Week</button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${viewMode === 'month' ? 'bg-primary text-gray-900' : 'text-text-muted dark:text-gray-400'}`}
            >Month</button>
          </div>
        </div>

        {viewMode === 'week' && (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {dateStrip.map((date, i) => {
              const dateStr = date.toISOString().split('T')[0];
              const isSelected = selectedDate === dateStr;
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = date.getDate();
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center gap-0.5 w-14 h-16 rounded-full border transition-colors ${isSelected ? 'bg-primary border-primary' : 'bg-surface-light dark:bg-surface-dark border-transparent dark:border-white/5'}`}
                >
                  <span className={`text-xs font-bold uppercase ${isSelected ? 'text-gray-900' : 'text-text-muted dark:text-gray-400'}`}>{dayName}</span>
                  <span className={`text-lg font-bold leading-none ${isSelected ? 'text-gray-900' : 'text-text-main dark:text-white'}`}>{dayNum}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 pt-2">
        {viewMode === 'month' && (
          <MonthCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} markedDates={markedDates} />
        )}

        {/* Task list */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center border-2 border-background-light dark:border-background-dark">
            <CalendarDays size={18} className="text-sky-500" />
          </div>
          <p className="text-sm font-bold text-text-muted dark:text-gray-400 tracking-wider uppercase">Tasks for {selectedLabel}</p>
        </div>

        <div className="ml-12 flex flex-col gap-3">
          {loading ? (
            <div className="flex justify-center py-4"><Spinner size="sm" /></div>
          ) : (
            <>
              <AnimatePresence initial={false}>
                {activeTasks.length > 0 ? activeTasks.map(task => (
                  <motion.div
                    key={task.id}
                    layout
                    exit={{ x: -100, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="flex items-center justify-between p-3 pr-4 rounded-[1.25rem] bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800">
                      <button
                        onClick={() => handleCircleClick(task)}
                        className="w-10 h-10 flex items-center justify-center -ml-2 mr-1 active:opacity-50 flex-shrink-0"
                      >
                        <span className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 block" />
                      </button>

                      <button
                        className="flex-1 flex items-center gap-3 min-w-0"
                        onClick={() => task.estimated_time ? (setActiveTask(task), setIsTimerVisible(true)) : handleToggleStatus(task)}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                          <Timer size={14} className="text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-bold text-text-main dark:text-white truncate">{task.name}</p>
                          <p className="text-xs text-text-muted dark:text-gray-500 font-medium">
                            {task.household_id && <HomeIcon size={10} className="inline text-blue-500 mr-1" />}
                            {task.room ? `${task.room} · ` : ''}
                            {task.frequency ? frequencyLabels[task.frequency] : 'One-time'}
                            {task.estimated_time ? ` · ${task.estimated_time} min` : ''}
                          </p>
                        </div>
                        {task.assigned_to && householdMembers.find(m => m.user_id === task.assigned_to) && (
                          <UserAvatar
                            className="w-7 h-7 flex-shrink-0"
                            textClassName="text-xs"
                            name={householdMembers.find(m => m.user_id === task.assigned_to)?.profile?.first_name}
                          />
                        )}
                      </button>

                      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        {task.estimated_time ? (
                          <Timer size={16} className="text-gray-400" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-300" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                )) : (
                  <p className="text-gray-400 italic text-sm">No pending tasks for this day</p>
                )}
              </AnimatePresence>

              {completedTasks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Completed</p>
                  <div className="flex flex-col gap-2">
                    {completedTasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-3 bg-surface-light/50 dark:bg-surface-dark/50 rounded-xl border border-gray-100 dark:border-gray-800/50">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <Check size={12} className="text-gray-900" strokeWidth={3} />
                        </div>
                        <div className="flex-1 min-w-0 opacity-50">
                          <p className="text-base font-medium dark:text-white line-through truncate">{task.name}</p>
                          <p className="text-xs text-gray-500">Completed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <FloatingBottomBar />

      {activeTask && (
        <TaskDetailsModal
          isVisible={isTimerVisible}
          onClose={() => setIsTimerVisible(false)}
          onComplete={() => handleToggleStatus(activeTask)}
          taskName={activeTask.name}
          durationMinutes={activeTask.estimated_time || 15}
          taskDetails={{
            frequency: activeTask.frequency,
            room: activeTask.room,
            dueDate: activeTask.due_date,
            assignedTo: activeTask.assigned_to,
            householdId: activeTask.household_id,
            preferredWeekday: activeTask.preferred_weekday,
            id: activeTask.user_task_id,
          }}
          household={household}
          members={householdMembers}
          onTaskUpdate={handleTaskUpdate}
        />
      )}

      {confirmTask && (
        <ConfirmCompleteModal
          isVisible={!!confirmTask}
          taskName={confirmTask.name}
          frequency={confirmTask.frequency as Frequency}
          preferredWeekday={confirmTask.preferred_weekday}
          currentDueDate={confirmTask.due_date}
          room={confirmTask.room}
          onConfirm={() => { handleToggleStatus(confirmTask); setConfirmTask(null); }}
          onCancel={() => setConfirmTask(null)}
        />
      )}
    </div>
  );
}
