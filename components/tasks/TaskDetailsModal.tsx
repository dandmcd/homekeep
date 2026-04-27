'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { supabase } from '@/lib/supabase';
import {
  X, Play, Pause, Check, ChevronDown, ChevronUp,
  Calendar, Home, Clock, Share2, User
} from 'lucide-react';
import { Frequency, frequencyLabels, WEEKDAY_LABELS, Household, HouseholdMemberProfile } from '@/lib/database.types';

interface TaskDetails {
  frequency?: Frequency;
  room?: string;
  dueDate?: string;
  assignedTo?: string | null;
  householdId?: string | null;
  preferredWeekday?: number;
  id: string;
}

interface TaskDetailsModalProps {
  isVisible: boolean;
  onClose: () => void;
  onComplete: () => void;
  taskName: string;
  durationMinutes: number;
  taskDetails: TaskDetails;
  household: Household | null;
  members: HouseholdMemberProfile[];
  onTaskUpdate: (taskId: string, updates: { household_id?: string | null; assigned_to?: string | null; preferred_weekday?: number }) => void;
}

const CIRCLE_R = 45;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;

export function TaskDetailsModal({
  isVisible,
  onClose,
  onComplete,
  taskName,
  durationMinutes,
  taskDetails,
  household,
  members,
  onTaskUpdate,
}: TaskDetailsModalProps) {
  const totalSeconds = durationMinutes * 60;
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isShared, setIsShared] = useState(!!taskDetails.householdId);
  const [assignedTo, setAssignedTo] = useState(taskDetails.assignedTo || '');
  const [preferredWeekday, setPreferredWeekday] = useState<number | undefined>(taskDetails.preferredWeekday);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isVisible) {
      setIsRunning(false);
      setTimeLeft(totalSeconds);
      setShowDetails(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isVisible, totalSeconds]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = 1 - timeLeft / totalSeconds;
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

  const handleShareToggle = async (value: boolean) => {
    if (!household) return;
    setIsSaving(true);
    try {
      const householdId = value ? household.id : null;
      const { error } = await supabase
        .from('user_tasks')
        .update({ household_id: householdId })
        .eq('id', taskDetails.id);
      if (error) throw error;
      setIsShared(value);
      onTaskUpdate(taskDetails.id, { household_id: householdId });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssign = async (userId: string) => {
    setIsSaving(true);
    try {
      const assignedToVal = userId || null;
      const { error } = await supabase
        .from('user_tasks')
        .update({ assigned_to: assignedToVal })
        .eq('id', taskDetails.id);
      if (error) throw error;
      setAssignedTo(userId);
      onTaskUpdate(taskDetails.id, { assigned_to: assignedToVal });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWeekdayChange = async (day: number) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_tasks')
        .update({ preferred_weekday: day })
        .eq('id', taskDetails.id);
      if (error) throw error;
      setPreferredWeekday(day);
      onTaskUpdate(taskDetails.id, { preferred_weekday: day });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={isVisible} onClose={onClose}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-main dark:text-white flex-1 mr-4 leading-tight" style={{ wordBreak: 'break-word' }}>
            {taskName}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors flex-shrink-0">
            <X size={16} className="text-text-main dark:text-white" />
          </button>
        </div>

        {/* Timer Circle */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r={CIRCLE_R} stroke="#e5e7eb" strokeWidth="8" fill="none" />
              <circle
                cx="50" cy="50" r={CIRCLE_R}
                stroke="#5bec13" strokeWidth="8" fill="none"
                strokeDasharray={CIRCLE_CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: isRunning ? 'stroke-dashoffset 1s linear' : 'none' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-text-main dark:text-white tabular-nums">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="text-xs text-text-muted dark:text-gray-400">
                {durationMinutes} min
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setIsRunning(r => !r)}
              className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition-all"
            >
              {isRunning ? <Pause size={24} color="#131811" /> : <Play size={24} color="#131811" />}
            </button>
            <button
              onClick={() => { onComplete(); onClose(); }}
              className="w-14 h-14 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition-all"
            >
              <Check size={24} color={undefined} className="text-white dark:text-gray-900" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Details Toggle */}
        <button
          onClick={() => setShowDetails(d => !d)}
          className="w-full flex items-center justify-between py-3 border-t border-gray-100 dark:border-zinc-700 text-sm font-medium text-text-muted dark:text-gray-400 hover:text-text-main dark:hover:text-white transition-colors"
        >
          <span>Details</span>
          {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Details Panel */}
        <div
          className="overflow-hidden transition-all duration-300"
          style={{ maxHeight: showDetails ? 400 : 0 }}
        >
          <div className="py-4 flex flex-col gap-4">
            {/* Task info */}
            <div className="flex flex-col gap-2 text-sm">
              {taskDetails.frequency && (
                <div className="flex items-center gap-2 text-text-muted dark:text-gray-400">
                  <Clock size={14} />
                  <span>{frequencyLabels[taskDetails.frequency]}</span>
                </div>
              )}
              {taskDetails.room && (
                <div className="flex items-center gap-2 text-text-muted dark:text-gray-400">
                  <Home size={14} />
                  <span>{taskDetails.room}</span>
                </div>
              )}
              {taskDetails.dueDate && (
                <div className="flex items-center gap-2 text-text-muted dark:text-gray-400">
                  <Calendar size={14} />
                  <span>Due {new Date(taskDetails.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              )}
            </div>

            {/* Share with household */}
            {household && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 size={16} className="text-text-muted dark:text-gray-400" />
                  <span className="text-sm font-medium text-text-main dark:text-white">Share with household</span>
                </div>
                {isSaving ? <Spinner size="sm" /> : (
                  <Switch value={isShared} onValueChange={handleShareToggle} />
                )}
              </div>
            )}

            {/* Assign to member */}
            {household && isShared && members.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-muted dark:text-gray-400 uppercase tracking-wider mb-2">Assign to</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAssign('')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!assignedTo ? 'bg-primary border-primary text-text-main' : 'border-gray-200 dark:border-zinc-600 text-text-muted dark:text-gray-400'}`}
                  >
                    Anyone
                  </button>
                  {members.map(m => (
                    <button
                      key={m.user_id}
                      onClick={() => handleAssign(m.user_id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${assignedTo === m.user_id ? 'bg-primary border-primary text-text-main' : 'border-gray-200 dark:border-zinc-600 text-text-muted dark:text-gray-400'}`}
                    >
                      <User size={12} />
                      {m.profile?.first_name || 'Member'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preferred weekday (weekly tasks) */}
            {taskDetails.frequency === 'weekly' && (
              <div>
                <p className="text-xs font-semibold text-text-muted dark:text-gray-400 uppercase tracking-wider mb-2">Preferred Day</p>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_LABELS.map((label, index) => (
                    <button
                      key={index}
                      onClick={() => handleWeekdayChange(index)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${preferredWeekday === index ? 'bg-primary text-text-main' : 'bg-gray-100 dark:bg-zinc-700 text-text-muted dark:text-gray-400'}`}
                    >
                      {label.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
