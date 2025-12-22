import React, { useEffect, useState, useLayoutEffect } from 'react';
import { Alert, Platform, ImageBackground, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Pressable } from '@/components/ui/pressable';
import { Center } from '@/components/ui/center';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Frequency } from '@/lib/database.types';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FloatingBottomBar } from '@/components/FloatingBottomBar';

type RootStackParamList = {
    Home: undefined;
    About: undefined;
    Settings: undefined;
    CoreTasks: undefined;
    Calendar: undefined;
};

type CalendarScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Calendar'>;

interface CalendarScreenProps {
    navigation: CalendarScreenNavigationProp;
}

interface TaskEventItem {
    id: string;
    name: string;
    status: 'pending' | 'completed' | 'skipped';
    frequency?: Frequency;
    due_date: string;
}

// Group tasks by date
interface GroupedTasks {
    [date: string]: TaskEventItem[];
}

export default function CalendarScreen({ navigation }: CalendarScreenProps) {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<TaskEventItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Hide default header
    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    useEffect(() => {
        fetchEvents();
    }, [user]);

    const fetchEvents = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('task_events')
                .select(`
                  id,
                  due_date,
                  status,
                  user_task:user_tasks (
                    name,
                    frequency,
                    core_task:core_tasks (
                      name,
                      frequency
                    )
                  )
                `)
                .gte('due_date', new Date().toISOString().split('T')[0]) // Only future/today
                .order('due_date', { ascending: true })
                .limit(100);

            if (error) throw error;

            const mappedTasks: TaskEventItem[] = data.map((event: any) => ({
                id: event.id,
                name: event.user_task?.name || event.user_task?.core_task?.name || 'Unknown Task',
                status: event.status,
                frequency: event.user_task?.frequency || event.user_task?.core_task?.frequency,
                due_date: event.due_date,
            }));

            setTasks(mappedTasks);
        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (item: TaskEventItem) => {
        try {
            const newStatus = item.status === 'completed' ? 'pending' : 'completed';

            const { error } = await supabase
                .from('task_events')
                .update({
                    status: newStatus,
                    completed_at: newStatus === 'completed' ? new Date().toISOString() : null
                })
                .eq('id', item.id);

            if (error) throw error;

            setTasks(prev => prev.map(t =>
                t.id === item.id ? { ...t, status: newStatus as TaskEventItem['status'] } : t
            ));

        } catch (err) {
            console.error('Error updating task:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
            if (Platform.OS === 'web') {
                window.alert(errorMessage);
            } else {
                Alert.alert('Error', errorMessage);
            }
        }
    };

    // Helper to generate dates for strip
    const generateDateStrip = () => {
        const dates = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    const dateStrip = generateDateStrip();

    if (loading) {
        return (
            <View className="flex-1 bg-background-light dark:bg-background-dark relative">
                <Center className="flex-1">
                    <Spinner size="lg" color="#5bec13" />
                    <Text size="md" className="text-gray-500 mt-4">Loading schedule...</Text>
                </Center>
                <FloatingBottomBar activeRoute="Calendar" />
            </View>
        );
    }

    // Split tasks for the timeline demo (Morning, Afternoon, Evening)
    // using simple logic: standard tasks -> Morning, others -> Afternoon/Evening just for layout demo
    // Ideally we would have time-of-day in the DB.
    const morningTasks = tasks.slice(0, 2);
    const afternoonTasks = tasks.slice(2, 3);
    const eveningTasks = tasks.slice(3, 5);

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark relative">
            {/* Sticky Header */}
            <View className="sticky top-0 z-40 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md pt-12 px-4 pb-2">
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center space-x-3">
                        <View className="rounded-full overflow-hidden border-2 border-primary w-10 h-10 bg-gray-200 justify-center items-center">
                            {/* Placeholder Avatar */}
                            <Text className="text-xs font-bold text-gray-500">U</Text>
                        </View>
                        <View>
                            <Text className="text-xs font-semibold text-text-muted dark:text-gray-400 uppercase tracking-wider">Good Morning</Text>
                            <Text className="text-lg font-bold leading-tight">Alex! ☀️</Text>
                        </View>
                    </View>
                    <View className="flex-row gap-2">
                        <Pressable className="w-10 h-10 rounded-full bg-surface-light dark:bg-surface-dark items-center justify-center shadow-sm">
                            <MaterialIcons name="search" size={24} color="#131811" />
                        </Pressable>
                        <Pressable className="w-10 h-10 rounded-full bg-surface-light dark:bg-surface-dark items-center justify-center shadow-sm relative">
                            <MaterialIcons name="notifications-none" size={24} color="#131811" />
                            <View className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                        </Pressable>
                    </View>
                </View>

                {/* Date Strip */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-2">
                    <View className="flex-row gap-3">
                        {dateStrip.map((date, index) => {
                            const isSelected = index === 0; // Select today
                            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                            const dayNum = date.getDate();

                            return (
                                <Pressable
                                    key={index}
                                    className={`flex-col h-16 w-14 shrink-0 items-center justify-center gap-1 rounded-full border ${isSelected
                                        ? 'bg-primary border-primary shadow-sm'
                                        : 'bg-surface-light dark:bg-surface-dark border-transparent dark:border-white/5'
                                        }`}
                                >
                                    <Text className={`text-xs font-bold uppercase ${isSelected ? 'text-[#131811]' : 'text-text-muted dark:text-gray-400'}`}>
                                        {dayName}
                                    </Text>
                                    <View className={`w-7 h-7 flex items-center justify-center rounded-full ${isSelected ? 'bg-black/10' : 'bg-transparent'}`}>
                                        <Text className={`text-lg font-bold leading-none ${isSelected ? 'text-[#131811]' : 'text-text-main dark:text-white'}`}>
                                            {dayNum}
                                        </Text>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>

            <ScrollView className="flex-1 px-4 pt-2 mb-24" showsVerticalScrollIndicator={false}>
                {/* Progress Widget */}
                <View className="flex-col gap-3 p-5 rounded-xl bg-surface-light dark:bg-surface-dark shadow-sm mb-6">
                    <View className="flex-row gap-6 justify-between items-center">
                        <Text className="text-text-main dark:text-white text-base font-bold">You're crushing it! 🔥</Text>
                        <Text className="text-text-muted dark:text-primary text-sm font-semibold">4/6 done</Text>
                    </View>
                    <View className="h-3 w-full rounded-full bg-[#f2f4f0] dark:bg-white/10 overflow-hidden">
                        <View className="h-full rounded-full bg-primary" style={{ width: '66%' }} />
                    </View>
                </View>

                {/* Hero Card: Today's Focus */}
                <View className="mb-6">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-text-main dark:text-white tracking-tight text-xl font-bold">Today's Focus</Text>
                        <Pressable>
                            <Text className="text-sm font-medium text-text-muted dark:text-primary">View All</Text>
                        </Pressable>
                    </View>
                    <View className="relative overflow-hidden rounded-2xl bg-surface-light dark:bg-surface-dark shadow-sm">
                        {/* Image Placeholder */}
                        <View className="w-full bg-gray-300 h-32 relative bg-emerald-700">
                            <View className="absolute inset-0 bg-black/30" />
                            <View className="absolute bottom-3 left-4 right-4 flex-row justify-between items-end">
                                <View className="bg-white/20 px-3 py-1 rounded-full border border-white/30">
                                    <Text className="text-white text-xs font-bold tracking-wide">HIGH PRIORITY</Text>
                                </View>
                            </View>
                        </View>
                        {/* Content Area */}
                        <View className="p-5 flex-col gap-4">
                            <View className="flex-row justify-between items-start">
                                <View>
                                    <Text className="text-text-main dark:text-white text-xl font-bold leading-tight mb-1">Water the plants</Text>
                                    <View className="flex-row items-center gap-2 text-text-muted dark:text-gray-400">
                                        <MaterialIcons name="location-on" size={18} color="#6f8961" />
                                        <Text className="text-sm font-medium text-text-muted">Living Room</Text>
                                        <Text className="text-xs text-text-muted">•</Text>
                                        <Text className="text-sm font-medium text-text-muted">15 mins</Text>
                                    </View>
                                </View>
                                <Pressable className="w-12 h-12 rounded-full bg-primary items-center justify-center shadow-lg active:scale-95">
                                    <MaterialIcons name="check" size={24} color="#131811" />
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Timeline Feed */}
                <View className="flex-col gap-0 relative">
                    {/* Vertical Line Guide */}
                    <View className="absolute left-[19px] top-4 bottom-0 w-[2px] bg-gray-200 dark:bg-white/10 rounded-full z-0" />

                    {/* Group: Morning */}
                    <View className="relative z-10 pb-6">
                        <View className="flex-row items-center gap-4 mb-4">
                            <View className="w-10 h-10 rounded-full bg-[#e3f6fc] dark:bg-[#1a3b47] items-center justify-center border-[3px] border-background-light dark:border-background-dark">
                                <MaterialIcons name="wb-sunny" size={20} color="#0ea5e9" />
                            </View>
                            <Text className="text-sm font-bold text-text-muted dark:text-gray-400 tracking-wider uppercase">Morning Routine</Text>
                        </View>

                        <View className="ml-12 flex-col space-y-3">
                            {morningTasks.map(task => (
                                <View key={task.id} className="group flex-row items-center justify-between p-3 pr-4 rounded-[1.25rem] bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm">
                                    <View className="flex-row items-center gap-3">
                                        <Pressable
                                            onPress={() => handleToggleStatus(task)}
                                            className={`w-6 h-6 rounded-full border-2 ${task.status === 'completed' ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'} items-center justify-center`}
                                        >
                                            {task.status === 'completed' && <MaterialIcons name="check" size={14} color="#131811" />}
                                        </Pressable>
                                        <View className="flex-col">
                                            <Text className="text-text-main dark:text-white font-bold text-sm">{task.name}</Text>
                                            <Text className="text-text-muted dark:text-gray-500 text-xs font-medium">8:00 AM • Kitchen</Text>
                                        </View>
                                    </View>
                                    <View className="bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">
                                        <Text className="text-gray-500 text-[10px] font-bold">15m</Text>
                                    </View>
                                </View>
                            ))}
                            {morningTasks.length === 0 && <Text className="text-gray-400 italic text-sm">No morning tasks</Text>}
                        </View>
                    </View>

                    {/* Group: Afternoon */}
                    <View className="relative z-10 pb-6">
                        <View className="flex-row items-center gap-4 mb-4">
                            <View className="w-10 h-10 rounded-full bg-[#fdf4db] dark:bg-[#423414] items-center justify-center border-[3px] border-background-light dark:border-background-dark">
                                <MaterialIcons name="wb-cloudy" size={20} color="#f59e0b" />
                            </View>
                            <Text className="text-sm font-bold text-text-muted dark:text-gray-400 tracking-wider uppercase">Afternoon Projects</Text>
                        </View>
                        <View className="ml-12 flex-col space-y-3">
                            {/* Static Example Item if no database items */}
                            {afternoonTasks.length === 0 && (
                                <View className="group flex-row items-center justify-between p-3 pr-4 rounded-[1.25rem] bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm">
                                    <View className="flex-row items-center gap-3">
                                        <Pressable className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 items-center justify-center" />
                                        <View className="flex-col">
                                            <Text className="text-text-main dark:text-white font-bold text-sm">HVAC Filter Change</Text>
                                            <Text className="text-text-muted dark:text-gray-500 text-xs font-medium">2:00 PM • Monthly</Text>
                                        </View>
                                    </View>
                                    <View className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">
                                        <Text className="text-blue-600 dark:text-blue-400 text-[10px] font-bold">Maint</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Group: Evening */}
                    <View className="relative z-10 pb-6">
                        <View className="flex-row items-center gap-4 mb-4">
                            <View className="w-10 h-10 rounded-full bg-[#e8e4f5] dark:bg-[#2e2642] items-center justify-center border-[3px] border-background-light dark:border-background-dark">
                                <MaterialIcons name="bedtime" size={20} color="#8b5cf6" />
                            </View>
                            <Text className="text-sm font-bold text-text-muted dark:text-gray-400 tracking-wider uppercase">Evening Tidy</Text>
                        </View>
                        <View className="ml-12 flex-col space-y-3">
                            {/* Static Example + Add Button */}
                            <View className="group flex-row items-center justify-between p-3 pr-4 rounded-[1.25rem] bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm">
                                <View className="flex-row items-center gap-3">
                                    <Pressable className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 items-center justify-center" />
                                    <View className="flex-col">
                                        <Text className="text-text-main dark:text-white font-bold text-sm">Wipe Counters</Text>
                                        <Text className="text-text-muted dark:text-gray-500 text-xs font-medium">8:00 PM • Kitchen</Text>
                                    </View>
                                </View>
                                <View className="bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md">
                                    <Text className="text-purple-600 dark:text-purple-400 text-[10px] font-bold">Daily</Text>
                                </View>
                            </View>

                            <Pressable className="flex-row items-center justify-center p-3 rounded-[1.25rem] border-2 border-dashed border-gray-200 dark:border-white/10 active:bg-gray-50">
                                <Text className="text-gray-400 text-sm font-bold">+ Add Evening Task</Text>
                            </Pressable>
                        </View>
                    </View>

                </View>
            </ScrollView>


            {/* Floating Action Bar */}
            <FloatingBottomBar activeRoute="Calendar" />
        </View>
    );
}

