'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import { X } from 'lucide-react';

interface CreateHouseholdModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export function CreateHouseholdModal({ isVisible, onClose }: CreateHouseholdModalProps) {
  const { createHousehold } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setError('Please enter a household name'); return; }
    setError('');
    try {
      setLoading(true);
      await createHousehold(name.trim());
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create household');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={isVisible} onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-text-main dark:text-white">Create Household</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-700">
            <X size={16} className="text-text-main dark:text-white" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-text-muted dark:text-gray-400 uppercase tracking-wider block mb-1">Household Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. The Smiths"
              className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-text-main dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={loading}
            className="h-12 bg-gray-900 dark:bg-white rounded-xl font-semibold text-white dark:text-gray-900 hover:opacity-90 active:opacity-80 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <Spinner size="sm" /> : 'Create Household'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
