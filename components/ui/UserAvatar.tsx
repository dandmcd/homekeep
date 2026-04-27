'use client';

import { useAuth } from '@/contexts/AuthContext';

interface UserAvatarProps {
  className?: string;
  textClassName?: string;
  name?: string;
}

export function UserAvatar({ className, textClassName, name }: UserAvatarProps) {
  const { user, userProfile } = useAuth();

  const displayBuffer = name || userProfile?.first_name || user?.email || 'U';
  const initial = displayBuffer.charAt(0).toUpperCase();

  return (
    <div
      className={`rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-primary ${className || 'w-14 h-14'}`}
    >
      <span className={`font-bold text-gray-500 dark:text-gray-300 ${textClassName || 'text-lg'}`}>
        {initial}
      </span>
    </div>
  );
}
