'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ChevronLeft } from 'lucide-react';

export default function AboutPage() {
  const router = useRouter();

  return (
    <AppShell>
      <div className="overflow-y-auto min-h-screen bg-background-light dark:bg-background-dark">
        {/* Header */}
        <div className="sticky top-0 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft size={20} className="text-text-main dark:text-white" />
          </button>
          <h1 className="text-xl font-bold text-text-main dark:text-white">About Homekeep</h1>
        </div>

        <div className="p-5 pb-10 flex flex-col gap-4">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-text-main dark:text-white mb-2">What is Homekeep?</h2>
            <p className="text-text-muted dark:text-gray-400 leading-relaxed">
              Homekeep is your personal home management assistant. Keep track of maintenance tasks,
              warranties, and important home information all in one place.
            </p>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-text-main dark:text-white mb-3">Features</h2>
            <div className="flex flex-col gap-2">
              {[
                'Track home maintenance tasks',
                'Store warranty information',
                'Set reminders for important dates',
                'Organize home documents',
                'Share tasks with household members',
              ].map((f) => (
                <p key={f} className="text-text-muted dark:text-gray-400">• {f}</p>
              ))}
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-text-main dark:text-white mb-2">Version</h2>
            <p className="text-text-muted dark:text-gray-400">1.0.0</p>
          </div>

          <button
            onClick={() => router.push('/home')}
            className="mt-2 h-12 bg-primary rounded-xl font-semibold text-text-main hover:opacity-90 active:opacity-80 transition-opacity"
          >
            Back to Home
          </button>
        </div>
      </div>
    </AppShell>
  );
}
