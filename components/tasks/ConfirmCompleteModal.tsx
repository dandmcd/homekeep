'use client';

import { Modal } from '@/components/ui/Modal';
import { calculateNextDueDate } from '@/lib/scheduling';
import { Frequency, frequencyLabels } from '@/lib/database.types';
import { X, Clock, Home, Calendar } from 'lucide-react';

interface ConfirmCompleteModalProps {
  isVisible: boolean;
  taskName: string;
  frequency: Frequency;
  preferredWeekday?: number;
  currentDueDate?: string;
  room?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmCompleteModal({
  isVisible,
  taskName,
  frequency,
  preferredWeekday,
  currentDueDate,
  room,
  onConfirm,
  onCancel,
}: ConfirmCompleteModalProps) {
  const nextDue = calculateNextDueDate(
    frequency,
    new Date(),
    frequency === 'weekly' ? preferredWeekday : undefined
  );

  return (
    <Modal visible={isVisible} onClose={onCancel}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-text-main dark:text-white flex-1 mr-4 leading-tight" style={{ wordBreak: 'break-word' }}>
            {taskName}
          </h2>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors flex-shrink-0"
          >
            <X size={16} className="text-text-main dark:text-white" />
          </button>
        </div>

        <p className="text-sm text-text-muted dark:text-gray-400 mb-5">
          Mark this task as complete?
        </p>

        {/* Details section */}
        <div className="flex flex-col gap-2.5 mb-6 text-sm">
          <div className="flex items-center gap-2 text-text-muted dark:text-gray-400">
            <Clock size={14} className="flex-shrink-0" />
            <span>{frequencyLabels[frequency]}</span>
          </div>

          {room && (
            <div className="flex items-center gap-2 text-text-muted dark:text-gray-400">
              <Home size={14} className="flex-shrink-0" />
              <span>{room}</span>
            </div>
          )}

          {currentDueDate && (
            <div className="flex items-center gap-2 text-text-muted dark:text-gray-400">
              <Calendar size={14} className="flex-shrink-0" />
              <span>
                Due{' '}
                {new Date(currentDueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-text-muted dark:text-gray-400">
            <Calendar size={14} className="flex-shrink-0" />
            <span>
              Next due{' '}
              <span className="text-text-main dark:text-white font-semibold">
                {nextDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-full border border-gray-200 dark:border-zinc-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 active:opacity-80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-full bg-primary text-sm font-semibold text-text-main hover:opacity-90 active:scale-95 transition-all"
          >
            Mark Complete
          </button>
        </div>
      </div>
    </Modal>
  );
}
