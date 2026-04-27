'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, Calendar, Plus, BarChart3, Settings } from 'lucide-react';

export function FloatingBottomBar() {
  const router = useRouter();
  const pathname = usePathname();

  const getColor = (route: string) =>
    pathname.startsWith(route) ? '#5bec13' : '#9ca3af';

  const navBtn = (route: string, Icon: React.ElementType, label: string) => (
    <button
      aria-label={label}
      onClick={() => router.push(route)}
      className="w-12 h-12 flex items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-zinc-800 transition-colors"
    >
      <Icon size={24} color={getColor(route)} strokeWidth={2} />
    </button>
  );

  return (
    <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="pointer-events-auto bg-white/90 dark:bg-[#1f2b18]/90 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-xl rounded-full p-2 flex items-center justify-between flex-row min-w-[300px] px-4 gap-1">
        {navBtn('/home', Home, 'Home')}
        {navBtn('/calendar', Calendar, 'Calendar')}

        {/* Central FAB */}
        <button
          aria-label="Core tasks"
          onClick={() => router.push('/tasks')}
          className="-mt-8 mb-1 w-14 h-14 bg-primary rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-2xl active:scale-95 transition-transform"
        >
          <Plus size={32} color="#131811" strokeWidth={2.5} />
        </button>

        <button
          aria-label="Stats (coming soon)"
          className="w-12 h-12 flex items-center justify-center rounded-full cursor-not-allowed"
        >
          <BarChart3 size={24} color="#9ca3af" strokeWidth={2} />
        </button>

        {navBtn('/settings', Settings, 'Settings')}
      </div>
    </div>
  );
}
