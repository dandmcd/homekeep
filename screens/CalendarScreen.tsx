import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Spinner } from '@/components/ui/spinner';
import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { frequencyLabels, Frequency } from '@/lib/database.types';

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

export default function CalendarScreen() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<TaskEventItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, [user]);

    const fetchEvents = async () => {
        if (!user) return;

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
                .limit(100); // Limit to next 100 events

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
            if (Platform.OS === 'web') {
                window.alert('Failed to load schedule');
            } else {
                Alert.alert('Error', 'Failed to load schedule');
            }
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

            // Update local state
            setTasks(prev => prev.map(t =>
                t.id === item.id ? { ...t, status: newStatus as TaskEventItem['status'] } : t
            ));

        } catch (err) {
            console.error('Error updating task:', err);
            if (Platform.OS === 'web') {
                window.alert('Failed to update task');
            } else {
                Alert.alert('Error', 'Failed to update task');
            }
        }
    };

    // Group tasks by date
    const groupedTasks: GroupedTasks = tasks.reduce((acc, task) => {
        if (!acc[task.due_date]) {
            acc[task.due_date] = [];
        }
        acc[task.due_date].push(task);
        return acc;
    }, {} as GroupedTasks);

    const sortedDates = Object.keys(groupedTasks).sort();

    const formatDate = (dateString: string) => {
        const date = new Date(dateString + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.getTime() === today.getTime()) {
            return 'Today';
        } else if (date.getTime() === tomorrow.getTime()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        }
    };

    if (loading) {
        return (
            <Center className="flex-1 bg-background-50">
                <Spinner size="lg" />
                <Text size="md" className="text-typography-500 mt-4">Loading schedule...</Text>
            </Center>
        );
    }

    if (tasks.length === 0) {
        return (
            <Center className="flex-1 bg-background-50 p-5">
                <Text size="lg" className="text-typography-500 text-center">No upcoming tasks scheduled</Text>
                <Text size="sm" className="text-typography-400 mt-2 text-center">
                    Tasks will appear here once they are generated.
                </Text>
            </Center>
        );
    }

    return (
        <ScrollView className="flex-1 bg-background-50">
            <Box className="p-4 pb-10">
                <Heading size="lg" className="text-typography-900 mb-4">Upcoming Tasks</Heading>

                <VStack space="lg">
                    {sortedDates.map(date => (
                        <Box key={date}>
                            <Text size="sm" className="text-typography-500 font-bold mb-2 uppercase tracking-wide">
                                {formatDate(date)}
                            </Text>

                            <VStack space="sm">
                                {groupedTasks[date].map(task => {
                                    const isCompleted = task.status === 'completed';

                                    return (
                                        <Pressable
                                            key={task.id}
                                            onPress={() => handleToggleStatus(task)}
                                            className={`bg-white p-4 rounded-lg border-l-4 ${isCompleted ? 'border-success-500' : 'border-primary-500'
                                                }`}
                                        >
                                            <HStack className="justify-between items-center">
                                                <Box className="flex-1 mr-3">
                                                    <Text
                                                        size="md"
                                                        className={`font-medium ${isCompleted
                                                                ? 'text-typography-400 line-through'
                                                                : 'text-typography-900'
                                                            }`}
                                                    >
                                                        {task.name}
                                                    </Text>
                                                    {task.frequency && (
                                                        <Text size="xs" className="text-typography-500 mt-1">
                                                            {frequencyLabels[task.frequency as Frequency]}
                                                        </Text>
                                                    )}
                                                </Box>

                                                <Box className={`px-3 py-1 rounded-full ${isCompleted ? 'bg-success-100' : 'bg-primary-50'
                                                    }`}>
                                                    <Text
                                                        size="xs"
                                                        className={`font-medium ${isCompleted ? 'text-success-700' : 'text-primary-700'
                                                            }`}
                                                    >
                                                        {isCompleted ? '✓ Done' : 'Tap to Complete'}
                                                    </Text>
                                                </Box>
                                            </HStack>
                                        </Pressable>
                                    );
                                })}
                            </VStack>
                        </Box>
                    ))}
                </VStack>
            </Box>
        </ScrollView>
    );
}
