import React, { useEffect, useState, useLayoutEffect } from 'react';
import { Alert, Platform, ImageBackground } from 'react-native';
import Animated, { SlideOutLeft, Layout } from 'react-native-reanimated';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Center } from '@/components/ui/center';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Pressable } from '@/components/ui/pressable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { UserTask, frequencyLabels, Frequency, TaskEvent } from '@/lib/database.types';
import { calculateNextDueDate, formatDate } from '@/lib/scheduling';
import { View } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { UserAvatar } from '@/components/UserAvatar';
import { FloatingBottomBar } from '@/components/FloatingBottomBar';
import { TaskTimer } from '@/components/TaskTimer';

// Custom helper component for consistent card styling
function Card({ children, className, style }: { children: React.ReactNode; className?: string; style?: any }) {
  return (
    <View
      className={`bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 ${className || ''}`}
      style={style}
    >
      {children}
    </View>
  );
}

type RootStackParamList = {
  Home: undefined;
  Calendar: undefined;
  Settings: undefined;
  CoreTasks: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, userProfile, isInitialized, initializingTasks } = useAuth();
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [pendingTaskMap, setPendingTaskMap] = useState<Map<string, string>>(new Map()); // taskId -> dueDate
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timer State
  const [activeTask, setActiveTask] = useState<UserTask | null>(null);
  const [isTimerVisible, setIsTimerVisible] = useState(false);

  // Hide default header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    async function fetchData() {
      if (!user || !isInitialized) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 1. Fetch User Tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('user_tasks')
          .select(`
            id,
            user_id,
            core_task_id,
            name,
            frequency,
            room,
            estimated_time,
            created_at,
            core_task:core_tasks (
              id,
              name,
              frequency,
              created_at,
              icon,
              room,
              estimated_time
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (tasksError) throw tasksError;

        const transformedTasks = (tasksData || []).map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          core_task_id: item.core_task_id,
          name: item.name,
          frequency: item.frequency || item.core_task?.frequency,
          room: item.room || item.core_task?.room,
          estimated_time: item.estimated_time || item.core_task?.estimated_time,
          created_at: item.created_at,
          core_task: item.core_task,
        }));

        setTasks(transformedTasks);

        const taskIds = transformedTasks.map(t => t.id);

        // 2. Fetch Todays Events (Completed Tasks)
        // Get start of today in ISO format
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        const { data: eventsData, error: eventsError } = await supabase
          .from('task_events')
          .select('*')
          .eq('status', 'completed')
          .gte('completed_at', todayStr);

        if (eventsError) {
          console.warn('Error fetching events:', eventsError);
        }

        const events = (eventsData as TaskEvent[]) || [];
        setCompletedTaskIds(new Set(events.map(e => e.user_task_id)));

        // 3. Fetch Pending Events (For Due Dates)
        // We need to know which tasks are actually due today or overdue
        if (taskIds.length > 0) {
          const { data: pendingData, error: pendingError } = await supabase
            .from('task_events')
            .select('*')
            .in('user_task_id', taskIds)
            .eq('status', 'pending');

          if (pendingError) {
            console.warn('Error fetching pending events:', pendingError);
          } else {
            const pendingMap = new Map<string, string>();
            (pendingData as TaskEvent[]).forEach(event => {
              // If there are multiple pending events for a task, we generally want the earliest one (due first)
              // or just any that makes it "due". 
              // Let's store the earliest due date found for each task.
              const currentDue = pendingMap.get(event.user_task_id);
              if (!currentDue || event.due_date < currentDue) {
                pendingMap.set(event.user_task_id, event.due_date);
              }
            });
            setPendingTaskMap(pendingMap);
          }
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, isInitialized]);

  const handleDeleteTask = (task: UserTask) => {
    const taskName = task.core_task?.name || task.name || 'this task';
    // Simplified delete for this UI demo, ideally would implement same logic as before
    Alert.alert('Not implemented', `Delete ${taskName} functionality coming soon in this UI.`);
  };

  const isTaskRelevant = (task: UserTask) => {
    // 1. If it's completed today, it's NOT relevant for the "To Do" list (but handled by getFocusTasks filtering already)
    // BUT caller handles completion check usually. Let's assume this checks "should it appear in the potential list"

    // Always show Daily tasks
    if (task.frequency === 'daily') return true;

    // Show if we have a pending event that is due today or in the past
    const dueDate = pendingTaskMap.get(task.id);
    if (dueDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      return dueDate <= todayStr;
    }

    return false;
  };

  const getFocusTasks = () => {
    // Filter tasks not completed today AND are relevant
    const activeTasks = tasks.filter(t => !completedTaskIds.has(t.id) && isTaskRelevant(t));

    // Priority Score Logic (Lower is better)
    // 1. Overdue (Not implemented yet, assumed separate)
    // 2. Daily Frequency (assumed "due")
    // 3. Morning Room (Bedroom, Bathroom, Kitchen)

    return activeTasks.sort((a, b) => {
      // Prioritize Daily
      const aFreq = a.frequency === 'daily' ? 0 : 1;
      const bFreq = b.frequency === 'daily' ? 0 : 1;
      if (aFreq !== bFreq) return aFreq - bFreq;

      // Then Estimated Time (Shortest first)
      return (a.estimated_time || 999) - (b.estimated_time || 999);
    }).slice(0, 3);
  };

  const getDailyProgress = () => {
    // Denominator: Tasks Due Today
    // For now, assume "Daily" tasks + any others due (or roughly total active tasks for the day)
    // Simplified: Count of Daily Tasks + Completed Tasks (if they weren't daily)
    // Better: Just use total count of "Focus candidates" + Completed? 
    // Let's use: All Daily Tasks + Any other task that was completed today.

    const dailyTasks = tasks.filter(t => t.frequency === 'daily');
    const completedDaily = dailyTasks.filter(t => completedTaskIds.has(t.id));
    const otherCompleted = tasks.filter(t => t.frequency !== 'daily' && completedTaskIds.has(t.id));

    const totalDue = dailyTasks.length + otherCompleted.length; // Dynamic denominator
    const totalDone = completedDaily.length + otherCompleted.length;

    return {
      percent: totalDue > 0 ? Math.round((totalDone / totalDue) * 100) : 0,
      count: totalDone,
      total: totalDue
    };
  };

  const handleMarkDone = async (task: UserTask) => {
    try {
      // Optimistic Update
      setCompletedTaskIds(prev => new Set(prev).add(task.id));

      // Close timer if open
      setIsTimerVisible(false);
      setActiveTask(null);

      const { error } = await supabase
        .from('task_events')
        .insert({
          user_task_id: task.id,
          status: 'completed',
          due_date: new Date().toISOString().split('T')[0], // Today
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      // Schedule the next occurrence for recurring tasks
      const frequency = task.frequency || task.core_task?.frequency;
      if (frequency) {
        const nextDueDate = calculateNextDueDate(frequency as Frequency);
        const { error: nextError } = await supabase
          .from('task_events')
          .insert({
            user_task_id: task.id,
            status: 'pending',
            due_date: formatDate(nextDueDate)
          });

        if (nextError) {
          console.warn('Error scheduling next occurrence:', nextError);
          // Don't throw - the completion was successful, just log the scheduling issue
        }
      }

    } catch (err) {
      console.error('Error marking done:', err);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
      // Revert optimistic update
      setCompletedTaskIds(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const handleStartTimer = (task: UserTask) => {
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

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const greeting = getTimeBasedGreeting();
  const displayName = userProfile?.first_name ? userProfile.first_name : null;

  if (initializingTasks || loading) {
    return (
      <View className="flex-1 bg-background-light dark:bg-background-dark relative">
        <Center className="flex-1">
          <Spinner size="lg" color="#5bec13" />
          <Text size="md" className="text-gray-500 mt-4">Setting things up...</Text>
        </Center>
        <FloatingBottomBar activeRoute="Home" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background-light dark:bg-background-dark relative">
        <Center className="flex-1 p-5">
          <Text size="lg" className="text-red-500 text-center mb-4">{error}</Text>
        </Center>
        <FloatingBottomBar activeRoute="Home" />
      </View>
    );
  }

  const focusTasks = getFocusTasks();
  const activeFocusTaskIds = new Set(focusTasks.map(t => t.id));

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark relative">
      <ScrollView className="flex-1 mb-24" showsVerticalScrollIndicator={false}>
        {/* Top App Bar */}
        <Box className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 px-4 pt-12 pb-2 backdrop-blur-md">
          <HStack className="items-center justify-between">
            <HStack className="items-center space-x-3">
              <Pressable
                onPress={() => navigation.navigate('Settings')}
                className="relative active:opacity-80"
              >
                <UserAvatar className="w-10 h-10" textClassName="text-xs" />
              </Pressable>
            </HStack>
            <Pressable className="w-10 h-10 rounded-full bg-surface-light dark:bg-surface-dark shadow-sm items-center justify-center active:bg-gray-100 dark:active:bg-gray-800">
              <MaterialIcons name="notifications-none" size={24} color={user ? "#131811" : "#888"} />
            </Pressable>
          </HStack>
        </Box>

        {/* Greeting & Status */}
        <Box className="px-4 pt-2 pb-6">
          <Text className="text-3xl font-bold leading-tight mb-1 text-gray-900 dark:text-white">
            {greeting}{displayName ? `,${'\n'}${displayName}! ☀️` : '! ☀️'}
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            Let's keep the house sparkling today.
          </Text>

          {/* Progress Card */}
          <Card className="mt-6">
            <HStack className="justify-between items-end mb-3">
              <Box>
                <Text className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Daily Progress
                </Text>
                <HStack className="items-baseline space-x-1 mt-1">
                  <Text className="text-2xl font-bold dark:text-white">{getDailyProgress().percent}%</Text>
                  <Text className="text-sm text-gray-400">completed</Text>
                </HStack>
              </Box>
              <Box className="flex-row items-center space-x-2 px-3 py-1.5 bg-primary/20 dark:bg-primary/10 rounded-full">
                <MaterialIcons name="local-fire-department" size={16} color="#5bec13" />
                <Text className="text-xs font-bold text-gray-800 dark:text-primary">
                  {getDailyProgress().count}/{getDailyProgress().total} Tasks
                </Text>
              </Box>
            </HStack>
            <View className="relative h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <View
                className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${getDailyProgress().percent}%` }}
              />
            </View>
          </Card>
        </Box>

        {/* Focus For Today */}
        <Box className="mb-8">
          <HStack className="px-4 items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">Focus for Today</Text>
            <Pressable>
              <Text className="text-xs font-bold text-primary">View All</Text>
            </Pressable>
          </HStack>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }} className="gap-4">
            {getFocusTasks().length === 0 ? (
              <Card className="w-[300px] h-[200px] justify-center items-center">
                <MaterialIcons name="check-circle" size={48} color="#5bec13" />
                <Text className="text-lg font-bold mt-4 dark:text-white">All caught up!</Text>
                <Text className="text-gray-500 mt-2 text-center">You've completed your focus tasks for today.</Text>
              </Card>
            ) : (
              getFocusTasks().map((task) => (
                <Card key={task.id} className="w-[220px] h-[200px] justify-between relative overflow-hidden group">
                  <View className="absolute top-0 right-0 p-4 opacity-10">
                    {getTaskIcon(task.core_task?.icon, 80, "#5bec13")}
                  </View>
                  <Box>
                    <View className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center mb-3">
                      {getTaskIcon(task.core_task?.icon, 20, "#5bec13")}
                    </View>
                    <Text className="font-bold text-lg leading-tight mb-1 dark:text-white" numberOfLines={2}>{task.name || task.core_task?.name}</Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {task.room ? `${task.room} • ` : ''}
                      {task.estimated_time ? `${task.estimated_time} min` : 'Quick Task'}
                    </Text>
                  </Box>

                  {task.estimated_time ? (
                    <Pressable
                      onPress={() => handleStartTimer(task)}
                      className="w-full py-2.5 rounded-full bg-[#131811] dark:bg-white active:opacity-90 items-center"
                    >
                      <Text className="text-white dark:text-[#131811] font-bold text-sm">Start Timer</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => handleMarkDone(task)}
                      className="w-full py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 items-center"
                    >
                      <Text className="text-gray-900 dark:text-white font-bold text-sm">Mark Done</Text>
                    </Pressable>
                  )}
                </Card>
              ))
            )}
          </ScrollView>
        </Box>

        {/* Morning Routine / Quick Tasks List */}
        <Box className="px-4 mb-8">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">Today's Tasks</Text>
          <VStack className="space-y-2">
            {tasks.filter(t => !completedTaskIds.has(t.id) && !activeFocusTaskIds.has(t.id) && isTaskRelevant(t))
              .map((task) => {
                const iconName = task.core_task?.icon;
                return (
                  <Animated.View
                    key={task.id}
                    exiting={SlideOutLeft.duration(300)}
                    layout={Layout.springify().delay(200)}
                  >
                    <View
                      className="flex-row items-center p-3 bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm"
                    >
                      {/* Mark Done Circle */}
                      <Pressable
                        onPress={() => handleMarkDone(task)}
                        className="w-10 h-10 items-center justify-center mr-1 -ml-2 active:opacity-50"
                        hitSlop={10}
                      >
                        <View className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                      </Pressable>

                      {/* Task Content - Tapping this opens timer if easy, or toggle done */}
                      <Pressable
                        className="flex-1 flex-row items-center"
                        onPress={() => task.estimated_time ? handleStartTimer(task) : handleMarkDone(task)}
                      >
                        {/* Task Icon */}
                        <View className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mr-3">
                          {getTaskIcon(iconName, 16, "#555")}
                        </View>

                        <View className="flex-1">
                          <Text className="text-base font-medium dark:text-white" numberOfLines={1}>{task.name || task.core_task?.name || 'Task'}</Text>
                          <Text className="text-xs text-gray-500">
                            {task.room ? `${task.room} • ` : ''}
                            {task.frequency ? frequencyLabels[task.frequency] : 'Daily'}
                            {task.estimated_time ? ` • ${task.estimated_time} min` : ''}
                          </Text>
                        </View>

                        <View className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 items-center justify-center">
                          {task.estimated_time ? (
                            <MaterialIcons name="timer" size={20} color="#9ca3af" />
                          ) : (
                            <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
                          )}
                        </View>
                      </Pressable>
                    </View>
                  </Animated.View>
                )
              })}

            {/* Completed Tasks (Collapsible-ish, just list them checked for now) */}
            {tasks.filter(t => completedTaskIds.has(t.id)).slice(0, 5).map((task) => (
              <View key={task.id} className="flex-row items-center p-3 bg-surface-light/50 dark:bg-surface-dark/50 rounded-xl border border-gray-100 dark:border-gray-800/50">
                <View className="w-6 h-6 rounded-full bg-primary mr-4 items-center justify-center">
                  <MaterialIcons name="check" size={14} color="#131811" style={{ fontWeight: 'bold' }} />
                </View>
                <View className="flex-1 opacity-50">
                  <Text className="text-base font-medium dark:text-white line-through decoration-primary" numberOfLines={1}>
                    {task.name || task.core_task?.name}
                  </Text>
                  <Text className="text-xs text-gray-500">Completed</Text>
                </View>
              </View>
            ))}

            {tasks.length === 0 && (
              <Text className="text-gray-400 italic text-center py-4">No tasks yet. Add some!</Text>
            )}
          </VStack>
        </Box>

        {/* Home Health Widget */}
        <Box className="px-4 mb-6">
          <View className="bg-gray-900 dark:bg-surface-dark rounded-xl p-5 flex-row items-center justify-between shadow-lg relative overflow-hidden">
            {/* Decorative */}
            <View className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />

            <View className="z-10">
              <Text className="font-bold text-lg mb-1 text-white">Home Health</Text>
              <Text className="text-gray-400 text-sm mb-3">All systems operational</Text>
              <HStack className="space-x-2">
                <View className="px-2 py-1 rounded bg-white/10">
                  <Text className="text-xs font-medium text-white">HVAC OK</Text>
                </View>
                <View className="px-2 py-1 rounded bg-white/10">
                  <Text className="text-xs font-medium text-white">Filters OK</Text>
                </View>
              </HStack>
            </View>

            <View className="z-10 w-14 h-14 rounded-full border-4 border-primary/30 items-center justify-center relative">
              <MaterialIcons name="health-and-safety" size={30} color="#5bec13" />
              <View className="absolute inset-0 border-4 border-primary rounded-full border-l-transparent border-b-transparent rotate-45" />
            </View>
          </View>
        </Box>
      </ScrollView >

      {/* Floating Action Bar */}
      < FloatingBottomBar activeRoute="Home" />

      {activeTask && (
        <TaskTimer
          isVisible={isTimerVisible}
          onClose={() => setIsTimerVisible(false)}
          onComplete={() => handleMarkDone(activeTask)}
          taskName={activeTask.name || activeTask.core_task?.name || 'Task'}
          durationMinutes={activeTask.estimated_time || 15}
        />
      )
      }
    </View >
  );
}
