'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { supabase } from '@/lib/supabase';
import { CoreTask, Frequency, frequencyLabels, frequencyOrder, TaskSet } from '@/lib/database.types';
import { X } from 'lucide-react';

interface ManageCoreTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  taskToEdit?: CoreTask | null;
}

const TASK_SETS: { key: TaskSet; label: string; color: string }[] = [
  { key: 'apartment', label: 'Apartment', color: '#22c55e' },
  { key: 'homeowner', label: 'Homeowner', color: '#3b82f6' },
  { key: 'pool_owner', label: 'Pool', color: '#00CED1' },
  { key: 'pet_owner', label: 'Pet', color: '#FF9500' },
];

export function ManageCoreTaskModal({ visible, onClose, onSuccess, taskToEdit }: ManageCoreTaskModalProps) {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [room, setRoom] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [icon, setIcon] = useState('');
  const [taskSets, setTaskSets] = useState<TaskSet[]>(['homeowner']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      if (taskToEdit) {
        setName(taskToEdit.name);
        setFrequency(taskToEdit.frequency);
        setRoom(taskToEdit.room || '');
        setEstimatedTime(taskToEdit.estimated_time?.toString() || '');
        setIcon(taskToEdit.icon || '');
        setTaskSets(taskToEdit.task_set || ['homeowner']);
      } else {
        setName(''); setFrequency('weekly'); setRoom(''); setEstimatedTime(''); setIcon(''); setTaskSets(['homeowner']);
      }
      setError('');
    }
  }, [visible, taskToEdit]);

  const toggleTaskSet = (set: TaskSet) =>
    setTaskSets(prev => prev.includes(set) ? (prev.length > 1 ? prev.filter(s => s !== set) : prev) : [...prev, set]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Task name is required'); return; }
    setError('');
    try {
      setSaving(true);
      const taskData = {
        name: name.trim(),
        frequency,
        room: room.trim() || null,
        estimated_time: estimatedTime ? parseInt(estimatedTime, 10) : null,
        icon: icon.trim() || null,
        task_set: taskSets,
      };
      if (taskToEdit) {
        const { error: e } = await supabase.from('core_tasks').update(taskData).eq('id', taskToEdit.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('core_tasks').insert(taskData);
        if (e) throw e;
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!taskToEdit) return;
    if (!window.confirm('Are you sure you want to delete this core task?')) return;
    try {
      setSaving(true);
      const { error: e } = await supabase.from('core_tasks').delete().eq('id', taskToEdit.id);
      if (e) throw e;
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-text-main dark:text-white">{taskToEdit ? 'Edit Core Task' : 'New Core Task'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-700">
            <X size={16} className="text-text-main dark:text-white" />
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="flex flex-col gap-5">
          <div>
            <label className="text-xs font-bold text-text-muted dark:text-gray-400 uppercase tracking-wider block mb-1.5">Task Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Clean Filters"
              className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-text-main dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary" />
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted dark:text-gray-400 uppercase tracking-wider block mb-1.5">Frequency</label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {frequencyOrder.map(freq => (
                <button key={freq} onClick={() => setFrequency(freq)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors flex-shrink-0 ${frequency === freq ? 'bg-primary border-primary text-text-main' : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-text-muted dark:text-gray-400'}`}>
                  {frequencyLabels[freq]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-text-muted dark:text-gray-400 uppercase tracking-wider block mb-1.5">Room (Optional)</label>
              <input type="text" value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g., Kitchen"
                className="w-full h-10 px-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-text-main dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-text-muted dark:text-gray-400 uppercase tracking-wider block mb-1.5">Est. Time (min)</label>
              <input type="number" value={estimatedTime} onChange={e => setEstimatedTime(e.target.value)} placeholder="15"
                className="w-full h-10 px-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-text-main dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted dark:text-gray-400 uppercase tracking-wider block mb-1.5">Icon (lucide name, optional)</label>
            <input type="text" value={icon} onChange={e => setIcon(e.target.value)} placeholder="e.g., sparkles" autoCapitalize="none"
              className="w-full h-10 px-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-text-main dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:border-primary" />
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted dark:text-gray-400 uppercase tracking-wider block mb-2">Task Sets</label>
            <div className="grid grid-cols-2 gap-2">
              {TASK_SETS.map(({ key, label, color }) => (
                <button key={key} onClick={() => toggleTaskSet(key)}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-colors ${taskSets.includes(key) ? 'border-2' : 'border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'}`}
                  style={taskSets.includes(key) ? { borderColor: color, backgroundColor: color + '15' } : {}}>
                  <span className="text-sm font-medium" style={taskSets.includes(key) ? { color } : { color: '#9ca3af' }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="h-12 bg-gray-900 dark:bg-primary rounded-xl font-semibold text-white dark:text-text-main hover:opacity-90 active:opacity-80 disabled:opacity-50 flex items-center justify-center">
              {saving ? <Spinner size="sm" /> : (taskToEdit ? 'Save Changes' : 'Create Task')}
            </button>
            {taskToEdit && (
              <button onClick={handleDelete} disabled={saving}
                className="h-12 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 active:opacity-80 disabled:opacity-50">
                Delete Task
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
