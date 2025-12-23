import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/contexts/AuthContext';

interface UserAvatarProps {
    className?: string; // For Tailwind classes to override size/colors if needed
    size?: number; // Optional numeric size if we want to use it for calculations, but className is preferred for styles
    textClassName?: string; // For text size/style overrides
}

export function UserAvatar({ className, textClassName }: UserAvatarProps) {
    const { user, userProfile } = useAuth();

    const firstName = userProfile?.first_name;
    const initial = (firstName || user?.email || 'U').charAt(0).toUpperCase();

    return (
        <View
            className={`rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center border-2 border-primary ${className || 'w-14 h-14'}`}
        >
            <Text className={`font-bold text-gray-500 dark:text-gray-300 ${textClassName || ''}`}>
                {initial}
            </Text>
        </View>
    );
}
