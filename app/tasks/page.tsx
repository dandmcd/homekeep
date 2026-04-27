'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/Spinner';
import { ManageCoreTaskModal } from '@/components/household/ManageCoreTaskModal';
import { CoreTask, Frequency, frequencyLabels, frequencyOrder } from '@/lib/database.types';
import { ArrowLeft, Plus, Info, Pencil, Lock, Wrench } from 'lucide-react';

const TASK_SET_DOTS: Record<string, string> = {
  apartment: '#22c55e',
  homeowner: '#3b82f6',
  pool_owner: '#00CED1',
  pet_owner: '#FF9500',
};

export default function TasksPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [tasks, setTasks] = useState<CoreTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CoreTask | null>(null);

  const fetchCoreTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('core_tasks')
        .select('*')
        .order('created_at', { ascending: true });
      if (fetchError) throw fetchError;
      setTasks(data as CoreTask[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load core tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoreTasks(); }, [fetchCoreTasks]);

  const tasksByFrequency = tasks.reduce((acc, task) => {
    if (!acc[task.frequency]) acc[task.frequency] = [];
    acc[task.frequency].push(task);
    return acc;
  }, {} as Record<Frequency, CoreTask[]>);

  if (loading && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-gray-500">Loading core tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-4 pt-12 pb-4 border-b border-gray-100/50 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-surface-light dark:bg-surface-dark flex items-center justify-center shadow-sm hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition-all"
            >
              <ArrowLeft size={20} className="text-gray-900 dark:text-white" />
            </button>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">Core Maintenance</p>
              <p className="text-xs text-gray-500">{isAdmin ? 'Admin Mode' : 'System Defaults'}</p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => { setSelectedTask(null); setModalVisible(true); }}
              className="w-10 h-10 rounded-full bg-gray-900 dark:bg-primary flex items-center justify-center shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              <Plus size={20} className="text-white dark:text-gray-900" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 pb-10">
        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-6 border border-blue-100 dark:border-blue-900/50">
          <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
            These are the default tasks added for all new users. They serve as the foundation for a healthy home maintenance schedule.
            {isAdmin && ' As an Admin, you can tap any task to edit or delete it.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl mb-6 border border-red-100 dark:border-red-900/50">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {frequencyOrder.map((frequency) => {
          const frequencyTasks = tasksByFrequency[frequency];
          if (!frequencyTasks || frequencyTasks.length === 0) return null;
          return (
            <div key={frequency} className="mb-6">
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 ml-1">
                {frequencyLabels[frequency]}
              </p>
              <div className="flex flex-col gap-3">
                {frequencyTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => { if (isAdmin) { setSelectedTask(task); setModalVisible(true); } }}
                    disabled={!isAdmin}
                    className={`flex items-center gap-3 p-3 bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-800 text-left w-full ${isAdmin ? 'hover:bg-gray-50 dark:hover:bg-zinc-800 active:bg-gray-100 cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <Wrench size={18} className="text-gray-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-gray-900 dark:text-white truncate">{task.name}</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs text-gray-400">
                          {task.room ? `${task.room} · ` : ''}{frequencyLabels[task.frequency]}{task.estimated_time ? ` · ${task.estimated_time} min` : ''}
                        </span>
                        {isAdmin && task.task_set && task.task_set.map(set => (
                          <span
                            key={set}
                            className="inline-block w-2 h-2 rounded-full ml-1"
                            style={{ backgroundColor: TASK_SET_DOTS[set] || '#9ca3af' }}
                          />
                        ))}
                      </div>
                    </div>

                    {isAdmin ? (
                      <Pencil size={14} className="text-gray-400 flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <Lock size={14} className="text-gray-400" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center py-20 gap-3">
            <Wrench size={48} className="text-gray-300" />
            <p className="text-lg text-gray-400 font-medium">No core tasks found</p>
          </div>
        )}
      </div>

      <ManageCoreTaskModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={fetchCoreTasks}
        taskToEdit={selectedTask}
      />
    </div>
  );
}
