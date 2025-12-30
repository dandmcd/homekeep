import React from 'react';
import { View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
    Home: undefined;
    Calendar: undefined;
    Settings: undefined;
    CoreTasks: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface FloatingBottomBarProps {
    activeRoute: 'Home' | 'Calendar' | 'Settings';
}

export function FloatingBottomBar({ activeRoute }: FloatingBottomBarProps) {
    const navigation = useNavigation<NavigationProp>();

    const getIconColor = (routeName: string) => {
        return activeRoute === routeName ? '#5bec13' : '#9ca3af';
    };

    return (
        <View className="absolute bottom-6 left-0 right-0 items-center z-50 pointer-events-box-none">
            <View className="bg-surface-light/90 dark:bg-[#1f2b18]/90 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-xl rounded-full p-2 flexDirection-row items-center justify-between flex-row min-w-[300px] px-4">
                <Pressable
                    className="w-12 h-12 items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-zinc-800"
                    onPress={() => navigation.navigate('Home')}
                >
                    <MaterialIcons name="home" size={24} color={getIconColor('Home')} />
                </Pressable>

                <Pressable
                    className="w-12 h-12 items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-zinc-800"
                    onPress={() => navigation.navigate('Calendar')}
                >
                    <MaterialIcons name="calendar-today" size={24} color={getIconColor('Calendar')} />
                </Pressable>

                {/* Main FAB */}
                <Pressable
                    className="w-14 h-14 bg-primary rounded-full items-center justify-center -mt-8 mb-1 border-4 border-white dark:border-gray-900 shadow-2xl active:scale-95 transition-transform"
                    style={{ shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 10 }}
                    onPress={() => navigation.navigate('CoreTasks')}
                >
                    <MaterialIcons name="add" size={32} color="#131811" />
                </Pressable>

                <Pressable className="w-12 h-12 items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-zinc-800">
                    <MaterialIcons name="bar-chart" size={24} color="#9ca3af" />
                </Pressable>

                <Pressable
                    className="w-12 h-12 items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-zinc-800"
                    onPress={() => navigation.navigate('Settings')}
                >
                    <MaterialIcons name="settings" size={24} color={getIconColor('Settings')} />
                </Pressable>
            </View>
        </View>
    );
}
