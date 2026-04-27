'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/Spinner';
import { TaskSet } from '@/lib/database.types';
import { Home, Building2, Plus, Waves, Dog, Timer, List, Info, Check } from 'lucide-react';

type PrimaryTaskSet = 'apartment' | 'homeowner' | 'empty';
type AddonTaskSet = 'pool_owner' | 'pet_owner';

interface CardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  color: string;
  multi?: boolean;
}

function SelectCard({ icon, title, description, selected, onSelect, color, multi = false }: CardProps) {
  return (
    <button
      onClick={onSelect}
      style={{ borderColor: selected ? color : 'transparent' }}
      className="w-full flex flex-row items-center gap-4 bg-white dark:bg-surface-dark rounded-2xl p-4 border-2 shadow-sm text-left hover:shadow-md active:scale-[0.99] transition-all"
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-text-main dark:text-white">{title}</p>
        <p className="text-sm text-text-muted dark:text-gray-400 mt-0.5 leading-snug">{description}</p>
      </div>
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 24,
          height: 24,
          borderRadius: multi ? 6 : 12,
          border: `2px solid ${selected ? color : '#D1D1D6'}`,
          backgroundColor: selected && multi ? color : 'transparent',
        }}
      >
        {selected && (multi
          ? <Check size={14} color="#fff" strokeWidth={3} />
          : <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        )}
      </div>
    </button>
  );
}

export default function OnboardingPage() {
  const { initializeWithTaskSet, updateProfile } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [primarySet, setPrimarySet] = useState<PrimaryTaskSet | null>(null);
  const [addons, setAddons] = useState<AddonTaskSet[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [budgetMode, setBudgetMode] = useState<'managed' | 'all'>('managed');

  const toggleAddon = (addon: AddonTaskSet) =>
    setAddons(prev => prev.includes(addon) ? prev.filter(a => a !== addon) : [...prev, addon]);

  const handleContinue = async () => {
    if (step === 1 && primarySet) {
      setStep(primarySet === 'empty' ? 3 : 2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    if (!primarySet) return;
    try {
      setIsInitializing(true);
      await updateProfile({ budget_enabled: budgetMode === 'managed', daily_time_budget: budgetMode === 'managed' ? 75 : null });
      if (primarySet === 'empty') {
        await initializeWithTaskSet('empty');
      } else {
        await initializeWithTaskSet([primarySet, ...addons] as TaskSet[]);
      }
    } catch (err) {
      console.error('Failed to initialize:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(primarySet === 'empty' ? 1 : 2);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7] dark:bg-background-dark">
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Header */}
        <div className="flex flex-col items-center px-5 pt-14 pb-2">
          <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
            <Home size={48} color="#007AFF" />
          </div>
          <h1 className="text-2xl font-bold text-text-main dark:text-white text-center">
            {step === 1 ? 'Welcome to Homekeep' : step === 2 ? 'Optional Add-ons' : 'Daily Planning Mode'}
          </h1>
          <p className="text-text-muted dark:text-gray-400 text-center mt-2 text-base leading-relaxed px-4">
            {step === 1
              ? "Your personal home maintenance assistant. Let's get you set up with the right tasks for your living situation."
              : step === 2
                ? 'Do you have any of these? Add specialized maintenance tasks.'
                : 'How would you like to manage your daily tasks?'}
          </p>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 mt-5">
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: step >= n ? 24 : 8, backgroundColor: step >= n ? '#007AFF' : '#D1D1D6' }}
            />
          ))}
        </div>

        <div className="px-5 mt-8 flex flex-col gap-3">
          {step === 1 && (
            <>
              <p className="text-base font-semibold text-text-main dark:text-white mb-1">Choose your starting point:</p>
              <SelectCard icon={<Plus size={32} color="#8E8E93" />} title="Start Fresh" description="Begin with an empty slate. Add tasks as you need them." selected={primarySet === 'empty'} onSelect={() => setPrimarySet('empty')} color="#8E8E93" />
              <SelectCard icon={<Building2 size={32} color="#34C759" />} title="Apartment Living" description="Indoor cleaning and maintenance tasks perfect for renters." selected={primarySet === 'apartment'} onSelect={() => setPrimarySet('apartment')} color="#34C759" />
              <SelectCard icon={<Home size={32} color="#007AFF" />} title="Homeowner" description="Complete task set including exterior, yard, and seasonal maintenance." selected={primarySet === 'homeowner'} onSelect={() => setPrimarySet('homeowner')} color="#007AFF" />
              <div className="flex items-start gap-3 bg-gray-100 dark:bg-zinc-800 rounded-xl p-4 mt-2">
                <Info size={18} color="#8E8E93" className="flex-shrink-0 mt-0.5" />
                <p className="text-sm text-text-muted dark:text-gray-400 leading-relaxed">You can always add, remove, or customize tasks later from the settings.</p>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-base font-semibold text-text-main dark:text-white mb-1">Select any that apply (optional):</p>
              <SelectCard icon={<Waves size={32} color="#00CED1" />} title="Pool Owner" description="Pool maintenance including water chemistry, cleaning, and seasonal open/close." selected={addons.includes('pool_owner')} onSelect={() => toggleAddon('pool_owner')} color="#00CED1" multi />
              <SelectCard icon={<Dog size={32} color="#FF9500" />} title="Pet Owner" description="Pet care tasks like bedding wash, grooming, and cleaning pet areas." selected={addons.includes('pet_owner')} onSelect={() => toggleAddon('pet_owner')} color="#FF9500" multi />
              <div className="flex items-start gap-3 bg-gray-100 dark:bg-zinc-800 rounded-xl p-4 mt-2">
                <Info size={18} color="#8E8E93" className="flex-shrink-0 mt-0.5" />
                <p className="text-sm text-text-muted dark:text-gray-400 leading-relaxed">You can skip this step and add these later from settings.</p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-base font-semibold text-text-main dark:text-white mb-1">Choose your daily task management style:</p>
              <SelectCard icon={<Timer size={32} color="#5bec13" />} title="Managed (Recommended)" description="Show ~75 minutes of tasks per day. Overflow tasks go to 'Get Ahead' section." selected={budgetMode === 'managed'} onSelect={() => setBudgetMode('managed')} color="#5bec13" />
              <SelectCard icon={<List size={32} color="#007AFF" />} title="All Due Tasks" description="Show all tasks that are due today or overdue. Can be overwhelming if you have many tasks." selected={budgetMode === 'all'} onSelect={() => setBudgetMode('all')} color="#007AFF" />
              <div className="flex items-start gap-3 bg-gray-100 dark:bg-zinc-800 rounded-xl p-4 mt-2">
                <Info size={18} color="#8E8E93" className="flex-shrink-0 mt-0.5" />
                <p className="text-sm text-text-muted dark:text-gray-400 leading-relaxed">You can change this anytime in Settings → Time Budget.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-zinc-700 px-5 pt-4 pb-8 flex gap-3">
        {(step === 2 || step === 3) && (
          <button
            onClick={handleBack}
            className="flex-1 h-14 border-2 border-gray-200 dark:border-zinc-600 rounded-2xl font-semibold text-text-main dark:text-white hover:border-gray-400 active:opacity-80 transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={handleContinue}
          disabled={(step === 1 && !primarySet) || isInitializing}
          className={`h-14 bg-primary rounded-2xl font-semibold text-text-main hover:opacity-90 active:opacity-80 disabled:opacity-50 transition-opacity flex items-center justify-center ${step === 2 || step === 3 ? 'flex-1' : 'w-full'}`}
        >
          {isInitializing ? <Spinner size="sm" /> : (step === 3 ? 'Get Started' : 'Continue')}
        </button>
      </div>
    </div>
  );
}
