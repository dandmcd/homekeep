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
import {
  calculateNextDueDate,
  formatDate,
  getFrequencyPriority,
  getTaskUrgencyTier,
  getDaysUntilDue,
  DEFAULT_DAILY_TIME_BUDGET_MINUTES,
  TaskUrgencyTier
} from '@/lib/scheduling';
import { View } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { UserAvatar } from '@/components/UserAvatar';
import { FloatingBottomBar } from '@/components/FloatingBottomBar';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';

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
  const { user, userProfile, isInitialized, initializingTasks, household, householdMembers } = useAuth();
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [pendingTaskMap, setPendingTaskMap] = useState<Map<string, string>>(new Map()); // taskId -> dueDate
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timer State
  const [activeTask, setActiveTask] = useState<UserTask | null>(null);
  const [isTimerVisible, setIsTimerVisible] = useState(false);

  // Filter State for Today's Tasks
  const [taskFilter, setTaskFilter] = useState<'all' | 'private' | 'household'>('all');

  // Get Ahead section collapsed state
  const [isGetAheadCollapsed, setIsGetAheadCollapsed] = useState(true);

  // User's daily time budget from profile settings
  // If budget_enabled is false, use a very large number to effectively disable budget
  const budgetEnabled = userProfile?.budget_enabled !== false;
  const dailyTimeBudget = budgetEnabled
    ? (userProfile?.daily_time_budget ?? DEFAULT_DAILY_TIME_BUDGET_MINUTES)
    : 999999; // Effectively unlimited when disabled

  // Progress bar width (measured via onLayout)
  const [progressBarWidth, setProgressBarWidth] = useState(0);

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
        let query = supabase
          .from('user_tasks')
          .select(`
            id,
            user_id,
            household_id,
            assigned_to,
            core_task_id,
            name,
            frequency,
            room,
            estimated_time,
            preferred_weekday,
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


        if (household) {
          query = query.or(`user_id.eq.${user.id}, household_id.eq.${household.id}`);
        } else {
          query = query.eq('user_id', user.id);
        }

        const { data: tasksData, error: tasksError } = await query
          .order('created_at', { ascending: true });

        if (tasksError) throw tasksError;

        const transformedTasks = (tasksData || []).map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          household_id: item.household_id,
          assigned_to: item.assigned_to,
          core_task_id: item.core_task_id,
          name: item.name,
          frequency: item.frequency || item.core_task?.frequency,
          room: item.room || item.core_task?.room,
          estimated_time: item.estimated_time || item.core_task?.estimated_time,
          preferred_weekday: item.preferred_weekday,
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

  /**
   * Get the urgency tier for a task based on its frequency and due date.
   * This powers the tiered display system.
   */
  const getTaskTier = (task: UserTask): TaskUrgencyTier => {
    const frequency = (task.frequency || task.core_task?.frequency) as Frequency;
    const dueDate = pendingTaskMap.get(task.id) || null;
    return getTaskUrgencyTier(frequency, dueDate);
  };

  /**
   * Check if task should appear in primary list (Today's Tasks + Focus)
   * Primary list = overdue + urgent + primary tier tasks within time budget
   */
  const isTaskPrimary = (task: UserTask): boolean => {
    const tier = getTaskTier(task);
    return tier === 'overdue' || tier === 'urgent' || tier === 'primary';
  };

  /**
   * Legacy function - now checks if task has any pending event (for progress calculation)
   */
  const isTaskRelevant = (task: UserTask) => {
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

  const filterTaskByType = (task: UserTask) => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'private') return !task.household_id;
    if (taskFilter === 'household') return !!task.household_id;
    return true;
  };

  /**
   * Sort all incomplete tasks by priority for budget allocation.
   * Order: overdue → urgent → primary (by frequency, then time)
   */
  const getSortedActiveTasks = () => {
    const activeTasks = tasks.filter(t => !completedTaskIds.has(t.id));

    return activeTasks.sort((a, b) => {
      // First: Sort by urgency tier (overdue first, then urgent, then primary, then get_ahead)
      const tierOrder: Record<TaskUrgencyTier, number> = {
        overdue: 0,
        urgent: 1,
        primary: 2,
        get_ahead: 3
      };
      const aTier = tierOrder[getTaskTier(a)];
      const bTier = tierOrder[getTaskTier(b)];
      if (aTier !== bTier) return aTier - bTier;

      // Second: Sort by frequency priority (daily > weekly > monthly > seasonal)
      const aFreq = (a.frequency || a.core_task?.frequency) as Frequency;
      const bFreq = (b.frequency || b.core_task?.frequency) as Frequency;
      const aFreqPriority = getFrequencyPriority(aFreq);
      const bFreqPriority = getFrequencyPriority(bFreq);
      if (aFreqPriority !== bFreqPriority) return aFreqPriority - bFreqPriority;

      // Third: Sort by estimated time (shortest first for quick wins)
      return (a.estimated_time || 10) - (b.estimated_time || 10);
    });
  };

  /**
   * Split tasks into budgeted (Today's Tasks) and overflow (Get Ahead) based on time budget.
   * STRICT BUDGET: All tasks (including overdue) count against the budget.
   * Tasks are sorted by urgency, so overdue tasks fill the budget first.
   */
  const getBudgetedTasks = () => {
    const sorted = getSortedActiveTasks();
    const budgeted: UserTask[] = [];
    const overflow: UserTask[] = [];
    let currentTime = 0;
    let overdueCount = 0;
    let overdueInOverflow = 0;

    for (const task of sorted) {
      const tier = getTaskTier(task);
      const taskTime = task.estimated_time || 10;

      // Check if this task fits in the budget
      const fitsInBudget = currentTime + taskTime <= dailyTimeBudget;

      if (fitsInBudget) {
        budgeted.push(task);
        currentTime += taskTime;
        if (tier === 'overdue') overdueCount++;
      } else {
        overflow.push(task);
        if (tier === 'overdue') overdueInOverflow++;
      }
    }

    return {
      budgeted,
      overflow,
      totalTime: currentTime,
      overdueCount,
      overdueInOverflow  // Tasks that are overdue but didn't fit in budget
    };
  };

  /**
   * Get tasks for "Focus for Today" cards - top 4 from budgeted tasks
   */
  const getFocusTasks = () => {
    const { budgeted } = getBudgetedTasks();
    return budgeted.slice(0, 4);
  };

  /**
   * Get tasks for "Today's Tasks" list - all budgeted tasks (excluding focus ones shown separately)
   */
  const getTodaysTasks = () => {
    const { budgeted } = getBudgetedTasks();
    return budgeted;
  };

  /**
   * Get tasks for the "Get Ahead" section.
   * Includes: overflow from budget + tasks not yet urgent
   */
  const getGetAheadTasks = () => {
    const { overflow } = getBudgetedTasks();
    // Sort overflow by due date (earliest first)
    return overflow.sort((a, b) => {
      const aDue = pendingTaskMap.get(a.id);
      const bDue = pendingTaskMap.get(b.id);
      if (aDue && bDue) return aDue.localeCompare(bDue);
      if (aDue) return -1;
      if (bDue) return 1;
      return 0;
    });
  };

  /**
   * Get current time load info for display
   */
  const getTimeLoadInfo = () => {
    const { totalTime, budgeted, overflow } = getBudgetedTasks();
    return {
      totalTime,
      budgetedCount: budgeted.length,
      overflowCount: overflow.length,
      isOverBudget: totalTime > dailyTimeBudget
    };
  };

  const getDailyProgress = () => {
    // Count all tasks that are "relevant" for today:
    // - Daily frequency tasks
    // - Tasks with pending events due today or overdue
    const relevantTasks = tasks.filter(t => isTaskRelevant(t));
    const completedRelevant = relevantTasks.filter(t => completedTaskIds.has(t.id));

    const totalDue = relevantTasks.length;
    const totalDone = completedRelevant.length;

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
        // Pass preferred_weekday for weekly tasks to align to the correct day
        const nextDueDate = calculateNextDueDate(
          frequency as Frequency,
          new Date(),
          frequency === 'weekly' ? task.preferred_weekday : undefined
        );
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

  const handleTaskUpdate = (taskId: string, updates: { household_id?: string | null; assigned_to?: string | null; preferred_weekday?: number }) => {
    // Update the local tasks state to keep it in sync with the database
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    ));
    // Also update activeTask if it's the one being updated
    if (activeTask?.id === taskId) {
      setActiveTask(prev => prev ? { ...prev, ...updates } : null);
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
            {greeting}{displayName ? `, ${'\n'}${displayName} ! ☀️` : '! ☀️'}
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
            <View
              className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"
              onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
            >
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: progressBarWidth * (getDailyProgress().percent / 100) }}
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
          <HStack className="items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">Today's Tasks</Text>

            {/* Filter Toggle */}
            {household && (
              <View className="flex-row bg-surface-light dark:bg-surface-dark rounded-full p-1 border border-gray-100 dark:border-gray-700">
                <Pressable
                  onPress={() => setTaskFilter('all')}
                  className={`px-2.5 py-1 rounded-full ${taskFilter === 'all' ? 'bg-primary' : 'bg-transparent'}`}
                >
                  <Text className={`text-xs font-bold ${taskFilter === 'all' ? 'text-[#131811]' : 'text-gray-500 dark:text-gray-400'}`}>All</Text>
                </Pressable>
                <Pressable
                  onPress={() => setTaskFilter('private')}
                  className={`px-2.5 py-1 rounded-full flex-row items-center ${taskFilter === 'private' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-transparent'}`}
                >
                  <MaterialIcons name="person" size={12} color={taskFilter === 'private' ? '#374151' : '#9ca3af'} style={{ marginRight: 2 }} />
                  <Text className={`text-xs font-bold ${taskFilter === 'private' ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>Mine</Text>
                </Pressable>
                <Pressable
                  onPress={() => setTaskFilter('household')}
                  className={`px-2.5 py-1 rounded-full flex-row items-center ${taskFilter === 'household' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-transparent'}`}
                >
                  <MaterialIcons name="home" size={12} color={taskFilter === 'household' ? '#3b82f6' : '#9ca3af'} style={{ marginRight: 2 }} />
                  <Text className={`text-xs font-bold ${taskFilter === 'household' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Shared</Text>
                </Pressable>
              </View>
            )}
          </HStack>
          <VStack className="space-y-2">
            {getTodaysTasks().filter(t => !activeFocusTaskIds.has(t.id) && filterTaskByType(t))
              .map((task) => {
                const iconName = task.core_task?.icon;
                const tier = getTaskTier(task);
                const isOverdue = tier === 'overdue';
                const dueDate = pendingTaskMap.get(task.id);
                const daysOverdue = dueDate ? -getDaysUntilDue(dueDate) : 0;

                return (
                  <Animated.View
                    key={task.id}
                    exiting={SlideOutLeft.duration(300)}
                    layout={Layout.springify().delay(200)}
                  >
                    <View
                      className={`flex-row items-center p-3 rounded-xl shadow-sm ${isOverdue
                        ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800'
                        : 'bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800'
                        }`}
                    >
                      {/* Mark Done Circle */}
                      <Pressable
                        onPress={() => handleMarkDone(task)}
                        className="w-10 h-10 items-center justify-center mr-1 -ml-2 active:opacity-50"
                        hitSlop={10}
                      >
                        <View className={`w-6 h-6 rounded-full border-2 ${isOverdue ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                          }`} />
                      </Pressable>

                      {/* Task Content - Tapping this opens timer if easy, or toggle done */}
                      <Pressable
                        className="flex-1 flex-row items-center"
                        onPress={() => task.estimated_time ? handleStartTimer(task) : handleMarkDone(task)}
                      >
                        {/* Task Icon */}
                        <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'
                          }`}>
                          {getTaskIcon(iconName, 16, isOverdue ? "#dc2626" : "#555")}
                        </View>

                        <View className="flex-1 mr-2">
                          <HStack className="items-center space-x-2">
                            <Text className="text-base font-medium dark:text-white flex-shrink" numberOfLines={1}>
                              {task.name || task.core_task?.name || 'Task'}
                            </Text>
                            {isOverdue && (
                              <View className="px-1.5 py-0.5 bg-red-500 rounded">
                                <Text className="text-[10px] font-bold text-white">OVERDUE</Text>
                              </View>
                            )}
                          </HStack>
                          <Text className="text-xs text-gray-500">
                            {task.household_id && <MaterialIcons name="home" size={12} color="#3b82f6" style={{ marginRight: 4 }} />}
                            {task.room ? `${task.room} • ` : ''}
                            {task.frequency ? frequencyLabels[task.frequency] : 'Daily'}
                            {task.estimated_time ? ` • ${task.estimated_time} min` : ''}
                            {isOverdue && daysOverdue > 0 && (
                              <Text className="text-red-500 font-medium"> • {daysOverdue}d overdue</Text>
                            )}
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

                        <View className={`w-8 h-8 rounded-full items-center justify-center ${isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-50 dark:bg-gray-800'
                          }`}>
                          {task.estimated_time ? (
                            <MaterialIcons name="timer" size={20} color={isOverdue ? "#dc2626" : "#9ca3af"} />
                          ) : (
                            <MaterialIcons name="chevron-right" size={20} color={isOverdue ? "#dc2626" : "#d1d5db"} />
                          )}
                        </View>
                      </Pressable>
                    </View>
                  </Animated.View>
                )
              })}

            {/* Completed Tasks (Collapsible-ish, just list them checked for now) */}
            {tasks.filter(t => completedTaskIds.has(t.id) && filterTaskByType(t)).slice(0, 5).map((task) => (
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

            {tasks.filter(t => filterTaskByType(t)).length === 0 && (
              <Text className="text-gray-400 italic text-center py-4">
                {taskFilter === 'all' ? 'No tasks yet. Add some!' :
                  taskFilter === 'private' ? 'No private tasks' :
                    'No shared household tasks'}
              </Text>
            )}

            {/* Alert: All budgeted tasks complete but overflow exists */}
            {getTodaysTasks().filter(t => !completedTaskIds.has(t.id)).length === 0 &&
              getGetAheadTasks().length > 0 && (
                <Pressable
                  onPress={() => setIsGetAheadCollapsed(false)}
                  className="flex-row items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 mt-2"
                >
                  <View className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center mr-3">
                    <MaterialIcons name="celebration" size={24} color="#16a34a" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-green-800 dark:text-green-200">
                      All done for today! 🎉
                    </Text>
                    <Text className="text-sm text-green-600 dark:text-green-400">
                      {getGetAheadTasks().length} more tasks waiting in Get Ahead
                    </Text>
                  </View>
                  <MaterialIcons name="arrow-forward" size={20} color="#16a34a" />
                </Pressable>
              )}

            {/* Alert: Overdue tasks pushed to Get Ahead due to budget */}
            {getBudgetedTasks().overdueInOverflow > 0 && (
              <Pressable
                onPress={() => setIsGetAheadCollapsed(false)}
                className="flex-row items-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 mt-2"
              >
                <View className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 items-center justify-center mr-3">
                  <MaterialIcons name="warning" size={24} color="#d97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-amber-800 dark:text-amber-200">
                    {getBudgetedTasks().overdueInOverflow} overdue tasks in Get Ahead
                  </Text>
                  <Text className="text-sm text-amber-600 dark:text-amber-400">
                    Budget is full. Tap to view and add more.
                  </Text>
                </View>
                <MaterialIcons name="arrow-forward" size={20} color="#d97706" />
              </Pressable>
            )}
          </VStack>
        </Box>

        {/* Get Ahead Section - Tasks that can be done early */}
        {getGetAheadTasks().length > 0 && (
          <Box className="px-4 mb-8">
            <Pressable
              onPress={() => setIsGetAheadCollapsed(!isGetAheadCollapsed)}
              className="flex-row items-center justify-between mb-3"
            >
              <HStack className="items-center space-x-2">
                <MaterialIcons name="trending-up" size={20} color="#5bec13" />
                <Text className="text-lg font-bold text-gray-900 dark:text-white">Get Ahead</Text>
                <View className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {getGetAheadTasks().length} tasks
                  </Text>
                </View>
              </HStack>
              <MaterialIcons
                name={isGetAheadCollapsed ? "expand-more" : "expand-less"}
                size={24}
                color="#9ca3af"
              />
            </Pressable>

            {!isGetAheadCollapsed && (
              <VStack className="space-y-2">
                {getGetAheadTasks().slice(0, 5).map((task) => {
                  const iconName = task.core_task?.icon;
                  const dueDate = pendingTaskMap.get(task.id);
                  const daysUntil = dueDate ? getDaysUntilDue(dueDate) : null;

                  return (
                    <Animated.View
                      key={task.id}
                      exiting={SlideOutLeft.duration(300)}
                      layout={Layout.springify().delay(200)}
                    >
                      <View
                        className="flex-row items-center p-3 bg-surface-light/70 dark:bg-surface-dark/70 rounded-xl border border-dashed border-gray-200 dark:border-gray-700"
                      >
                        {/* Mark Done Circle */}
                        <Pressable
                          onPress={() => handleMarkDone(task)}
                          className="w-10 h-10 items-center justify-center mr-1 -ml-2 active:opacity-50"
                          hitSlop={10}
                        >
                          <View className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600" />
                        </Pressable>

                        {/* Task Content */}
                        <Pressable
                          className="flex-1 flex-row items-center"
                          onPress={() => task.estimated_time ? handleStartTimer(task) : handleMarkDone(task)}
                        >
                          {/* Task Icon */}
                          <View className="w-8 h-8 rounded-full bg-gray-100/50 dark:bg-gray-800/50 items-center justify-center mr-3">
                            {getTaskIcon(iconName, 16, "#888")}
                          </View>

                          <View className="flex-1 mr-2">
                            <Text className="text-base font-medium text-gray-600 dark:text-gray-300" numberOfLines={1}>
                              {task.name || task.core_task?.name || 'Task'}
                            </Text>
                            <HStack className="items-center space-x-1">
                              <Text className="text-xs text-gray-400">
                                {task.frequency ? frequencyLabels[task.frequency] : ''}
                                {task.estimated_time ? ` • ${task.estimated_time} min` : ''}
                              </Text>
                              {daysUntil !== null && (
                                <View className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded">
                                  <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                    {daysUntil === 0 ? 'Today' :
                                      daysUntil === 1 ? 'Tomorrow' :
                                        `${daysUntil} days`}
                                  </Text>
                                </View>
                              )}
                            </HStack>
                          </View>

                          <View className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 items-center justify-center">
                            <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
                          </View>
                        </Pressable>
                      </View>
                    </Animated.View>
                  );
                })}

                {getGetAheadTasks().length > 5 && (
                  <Pressable className="py-2">
                    <Text className="text-sm font-medium text-primary text-center">
                      View all {getGetAheadTasks().length} tasks →
                    </Text>
                  </Pressable>
                )}
              </VStack>
            )}
          </Box>
        )}

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
        <TaskDetailsModal
          isVisible={isTimerVisible}
          onClose={() => setIsTimerVisible(false)}
          onComplete={() => handleMarkDone(activeTask)}
          taskName={activeTask.name || activeTask.core_task?.name || 'Task'}
          durationMinutes={activeTask.estimated_time || 15}
          taskDetails={{
            frequency: activeTask.frequency || activeTask.core_task?.frequency,
            room: activeTask.room || activeTask.core_task?.room,
            dueDate: pendingTaskMap.get(activeTask.id),
            assignedTo: activeTask.assigned_to,
            householdId: activeTask.household_id,
            preferredWeekday: activeTask.preferred_weekday,
            id: activeTask.id
          }}
          household={household}
          members={householdMembers}
          onTaskUpdate={handleTaskUpdate}
        />
      )
      }
    </View >
  );
}
