import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { Alert, Platform, ImageBackground, View, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { SlideOutLeft, Layout } from 'react-native-reanimated';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Pressable } from '@/components/ui/pressable';
import { Center } from '@/components/ui/center';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Frequency, frequencyLabels } from '@/lib/database.types';
import { calculateNextDueDate, formatDate } from '@/lib/scheduling';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { UserAvatar } from '@/components/UserAvatar';
import { FloatingBottomBar } from '@/components/FloatingBottomBar';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';

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
    user_task_id: string;
    name: string;
    status: 'pending' | 'completed' | 'skipped';
    frequency?: Frequency;
    due_date: string;
    room?: string;
    estimated_time?: number;
    icon?: string;
    assigned_to?: string;
    household_id?: string;
}

// Group tasks by date
interface GroupedTasks {
    [date: string]: TaskEventItem[];
}

export default function CalendarScreen({ navigation }: CalendarScreenProps) {
    const { user, userProfile, household, householdMembers } = useAuth();
    const [tasks, setTasks] = useState<TaskEventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().split('T')[0]);

    // Timer State
    const [activeTask, setActiveTask] = useState<TaskEventItem | null>(null);
    const [isTimerVisible, setIsTimerVisible] = useState(false);

    // Hide default header
    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    useEffect(() => {
        // Initial fetch: 2 months from today
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 2);
        fetchEvents(startDate, endDate);
    }, [user]);

    const fetchEvents = async (startDate: Date, endDate: Date, silent = false) => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            if (!silent) setLoading(true);
            const { data, error } = await supabase
                .from('task_events')
                .select(`
                  id,
                  due_date,
                  status,
                  user_task_id,
                  user_task:user_tasks (
                    id,
                    name,
                    frequency,
                    room,
                    assigned_to,
                    household_id,
                    core_task:core_tasks (
                      name,
                      frequency,
                      icon,
                      room,
                      estimated_time
                    )
                  )
                `)
                .gte('due_date', startDate.toISOString().split('T')[0])
                .lte('due_date', endDate.toISOString().split('T')[0])
                .order('due_date', { ascending: true });

            if (error) throw error;

            const mappedTasks: TaskEventItem[] = data.map((event: any) => ({
                id: event.id,
                user_task_id: event.user_task_id,
                name: event.user_task?.name || event.user_task?.core_task?.name || 'Unknown Task',
                status: event.status,
                frequency: event.user_task?.frequency || event.user_task?.core_task?.frequency,
                due_date: event.due_date,
                room: event.user_task?.room || event.user_task?.core_task?.room,
                estimated_time: event.user_task?.estimated_time || event.user_task?.core_task?.estimated_time,
                icon: event.user_task?.core_task?.icon,
                assigned_to: event.user_task?.assigned_to,
                household_id: event.user_task?.household_id,
            }));

            // Merge with existing tasks, avoiding duplicates
            setTasks(prev => {
                const newIds = new Set(mappedTasks.map(t => t.id));
                const filteredPrev = prev.filter(t => !newIds.has(t.id));
                return [...filteredPrev, ...mappedTasks];
            });
        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // When month changes in calendar view
    const handleMonthChange = (date: DateData) => {
        setCurrentMonth(date.dateString);
        // Fetch 2 months window around the new month
        const start = new Date(date.timestamp);
        start.setDate(1); // Start of month
        const end = new Date(start);
        end.setMonth(end.getMonth() + 2); // Fetch 2 months ahead
        fetchEvents(start, end);
    };

    const handleToggleStatus = async (item: TaskEventItem) => {
        try {
            const newStatus = item.status === 'completed' ? 'pending' : 'completed';

            // Close timer if open
            setIsTimerVisible(false);
            setActiveTask(null);

            const { error } = await supabase
                .from('task_events')
                .update({
                    status: newStatus,
                    completed_at: newStatus === 'completed' ? new Date().toISOString() : null
                })
                .eq('id', item.id);

            if (error) throw error;

            // Schedule the next occurrence when completing a recurring task
            if (newStatus === 'completed' && item.frequency) {
                const nextDueDate = calculateNextDueDate(item.frequency);
                const { error: nextError } = await supabase
                    .from('task_events')
                    .insert({
                        user_task_id: item.user_task_id,
                        status: 'pending',
                        due_date: formatDate(nextDueDate)
                    });

                if (nextError) {
                    console.warn('Error scheduling next occurrence:', nextError);
                } else {
                    // Optimistically refetch simply to ensure UI is fresh
                    const start = new Date(currentMonth);
                    start.setDate(1);
                    const end = new Date(start);
                    end.setMonth(end.getMonth() + 2);
                    fetchEvents(start, end, true);
                }
            }

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

    const handleStartTimer = (task: TaskEventItem) => {
        setActiveTask(task);
        setIsTimerVisible(true);
    };

    // Helper to render the correct icon family
    const getTaskIcon = (iconName?: string, size = 20, color = "#5bec13") => {
        if (!iconName) return <MaterialIcons name="cleaning-services" size={size} color={color} />;

        if (iconName.startsWith('mci:')) {
            const name = iconName.replace('mci:', '') as any;
            return <MaterialCommunityIcons name={name} size={size} color={color} />;
        }

        return <MaterialIcons name={iconName as any} size={size} color={color} />;
    };

    // Helper to generate dates for strip
    const generateDateStrip = () => {
        const dates = [];
        const today = new Date();
        // Show a week starting from today or selected date? 
        // Let's stick to "This Week" starting from Today for the week view strip
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    const dateStrip = generateDateStrip();

    // Prepare marked dates for calendar
    const markedDates: any = {};
    tasks.forEach(task => {
        if (task.status !== 'completed' && task.status !== 'skipped') {
            markedDates[task.due_date] = { marked: true, dotColor: '#5bec13' };
        }
    });
    // Highlight selected date
    markedDates[selectedDate] = {
        ...markedDates[selectedDate],
        selected: true,
        selectedColor: '#5bec13',
        selectedTextColor: '#131811'
    };


    const getTimeBasedGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const greeting = getTimeBasedGreeting();
    const displayName = userProfile?.first_name ? userProfile.first_name : (user?.email?.split('@')[0] || 'User');

    // Filter tasks for the selected date
    const tasksForSelectedDate = tasks.filter(t => t.due_date === selectedDate);
    const activeTasks = tasksForSelectedDate.filter(t => t.status !== 'completed');
    const completedTasks = tasksForSelectedDate.filter(t => t.status === 'completed');

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark relative">
            {/* Sticky Header */}
            <View className="sticky top-0 z-40 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md pt-12 px-4 pb-2">
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center space-x-3">
                        <UserAvatar className="w-10 h-10" textClassName="text-xs" />
                        <View>
                            <Text className="text-xs font-semibold text-text-muted dark:text-gray-400 uppercase tracking-wider">{greeting}</Text>
                            <Text className="text-lg font-bold leading-tight">{displayName}! ☀️</Text>
                        </View>
                    </View>

                    {/* View Toggle */}
                    <View className="flex-row bg-surface-light dark:bg-surface-dark rounded-full p-1 border border-gray-100 dark:border-white/10">
                        <TouchableOpacity
                            onPress={() => setViewMode('week')}
                            className={`px-3 py-1.5 rounded-full ${viewMode === 'week' ? 'bg-primary' : 'bg-transparent'}`}
                        >
                            <Text className={`text-xs font-bold ${viewMode === 'week' ? 'text-[#131811]' : 'text-text-muted dark:text-gray-400'}`}>Week</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setViewMode('month')}
                            className={`px-3 py-1.5 rounded-full ${viewMode === 'month' ? 'bg-primary' : 'bg-transparent'}`}
                        >
                            <Text className={`text-xs font-bold ${viewMode === 'month' ? 'text-[#131811]' : 'text-text-muted dark:text-gray-400'}`}>Month</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Week View Date Strip */}
                {viewMode === 'week' && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-2">
                        <View className="flex-row gap-3">
                            {dateStrip.map((date, index) => {
                                const dateStr = date.toISOString().split('T')[0];
                                const isSelected = selectedDate === dateStr;
                                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                                const dayNum = date.getDate();

                                return (
                                    <Pressable
                                        key={index}
                                        onPress={() => setSelectedDate(dateStr)}
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
                )}
            </View>

            <ScrollView className="flex-1 px-4 pt-2 mb-24" showsVerticalScrollIndicator={false}>
                {/* Month View Calendar */}
                {viewMode === 'month' && (
                    <View className="mb-6 rounded-2xl overflow-hidden bg-surface-light dark:bg-surface-dark shadow-sm border border-gray-100 dark:border-white/5">
                        <Calendar
                            current={currentMonth}
                            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
                            onMonthChange={handleMonthChange}
                            markedDates={markedDates}
                            theme={{
                                backgroundColor: 'transparent',
                                calendarBackground: 'transparent', // Let container bg show through
                                textSectionTitleColor: '#6b7280',
                                selectedDayBackgroundColor: '#5bec13',
                                selectedDayTextColor: '#131811',
                                todayTextColor: '#5bec13',
                                dayTextColor: '#131811', // Need to handle dark mode dynamically if possible, hardcoded for now or use transparent
                                textDisabledColor: '#d9e1e8',
                                dotColor: '#5bec13',
                                selectedDotColor: '#131811',
                                arrowColor: '#5bec13',
                                monthTextColor: '#131811',
                                indicatorColor: '#5bec13',
                                textDayFontWeight: '600',
                                textMonthFontWeight: 'bold',
                                textDayHeaderFontWeight: '600',
                                textDayFontSize: 14,
                                textMonthFontSize: 16,
                                textDayHeaderFontSize: 12
                            }}
                            // Force dark mode styles if needed via key prop or just rely on container
                            key={userProfile?.id}
                        />
                    </View>
                )}

                {/* Task List for Selected Date */}
                <View className="flex-col gap-0 relative">
                    <View className="flex-row items-center gap-4 mb-4">
                        <View className="w-10 h-10 rounded-full bg-[#e3f6fc] dark:bg-[#1a3b47] items-center justify-center border-[3px] border-background-light dark:border-background-dark">
                            <MaterialIcons name="event-note" size={20} color="#0ea5e9" />
                        </View>
                        <Text className="text-sm font-bold text-text-muted dark:text-gray-400 tracking-wider uppercase">
                            Tasks for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                    </View>

                    <View className="ml-12 flex-col space-y-3">
                        {loading ? (
                            <ActivityIndicator />
                        ) : (
                            <>
                                {activeTasks.length > 0 ? (
                                    activeTasks.map(task => {
                                        const iconName = task.icon;
                                        return (
                                            <Animated.View
                                                key={task.id}
                                                exiting={SlideOutLeft.duration(300)}
                                                layout={Layout.springify().delay(200)}
                                            >
                                                <View className="group flex-row items-center justify-between p-3 pr-4 rounded-[1.25rem] bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm">

                                                    {/* Mark Done Circle */}
                                                    <Pressable
                                                        onPress={() => handleToggleStatus(task)}
                                                        className="w-10 h-10 items-center justify-center mr-1 -ml-2 active:opacity-50"
                                                        hitSlop={10}
                                                    >
                                                        <View className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                                                    </Pressable>

                                                    {/* Task Content */}
                                                    <Pressable
                                                        className="flex-1 flex-row items-center"
                                                        onPress={() => task.estimated_time ? handleStartTimer(task) : handleToggleStatus(task)}
                                                    >
                                                        {/* Task Icon */}
                                                        <View className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mr-3">
                                                            {getTaskIcon(iconName, 16, "#555")}
                                                        </View>

                                                        <View className="flex-1 mr-2">
                                                            <Text className="text-text-main dark:text-white font-bold text-sm" numberOfLines={1}>{task.name}</Text>
                                                            <Text className="text-text-muted dark:text-gray-500 text-xs font-medium">
                                                                {task.household_id && <MaterialIcons name="home" size={12} color="#3b82f6" style={{ marginRight: 4 }} />}
                                                                {task.room ? `${task.room} • ` : ''}
                                                                {task.frequency ? frequencyLabels[task.frequency as Frequency] : 'One-time'}
                                                                {task.estimated_time ? ` • ${task.estimated_time} min` : ''}
                                                            </Text>
                                                        </View>

                                                        {/* Assignee Avatar */}
                                                        {task.assigned_to && householdMembers.find(m => m.user_id === task.assigned_to) && (
                                                            <View className="mr-3">
                                                                <UserAvatar
                                                                    className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800"
                                                                    textClassName="text-xs"
                                                                    name={householdMembers.find(m => m.user_id === task.assigned_to)?.profile?.first_name}
                                                                />
                                                            </View>
                                                        )}
                                                    </Pressable>

                                                    <View className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 items-center justify-center">
                                                        {task.estimated_time ? (
                                                            <MaterialIcons name="timer" size={20} color="#9ca3af" />
                                                        ) : (
                                                            <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
                                                        )}
                                                    </View>
                                                </View>
                                            </Animated.View>
                                        );
                                    })
                                ) : (
                                    <Text className="text-gray-400 italic text-sm">No pending tasks for this day</Text>
                                )}

                                {/* Completed Tasks Section */}
                                {completedTasks.length > 0 && (
                                    <View className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Completed</Text>
                                        <View className="space-y-2">
                                            {completedTasks.map(task => (
                                                <View key={task.id} className="flex-row items-center p-3 bg-surface-light/50 dark:bg-surface-dark/50 rounded-xl border border-gray-100 dark:border-gray-800/50">
                                                    <View className="w-6 h-6 rounded-full bg-primary mr-4 items-center justify-center">
                                                        <MaterialIcons name="check" size={14} color="#131811" style={{ fontWeight: 'bold' }} />
                                                    </View>
                                                    <View className="flex-1 opacity-50">
                                                        <Text className="text-base font-medium dark:text-white line-through decoration-primary" numberOfLines={1}>
                                                            {task.name}
                                                        </Text>
                                                        <Text className="text-xs text-gray-500">Completed</Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>

            <FloatingBottomBar activeRoute="Calendar" />

            {activeTask && (
                <TaskDetailsModal
                    isVisible={isTimerVisible}
                    onClose={() => setIsTimerVisible(false)}
                    onComplete={() => handleToggleStatus(activeTask)}
                    taskName={activeTask.name}
                    durationMinutes={activeTask.estimated_time || 15}
                    taskDetails={{
                        frequency: activeTask.frequency,
                        room: activeTask.room,
                        dueDate: activeTask.due_date,
                        assignedTo: activeTask.assigned_to,
                        householdId: activeTask.household_id,
                        id: activeTask.id
                    }}
                    household={household}
                    members={householdMembers}
                />
            )}
        </View>
    );
}

// Simple ActivityIndicator fallback
function ActivityIndicator() {
    return (
        <Center className="py-4">
            <Spinner size="sm" color="#5bec13" />
        </Center>
    )
}

