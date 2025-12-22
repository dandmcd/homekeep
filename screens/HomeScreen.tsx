import React, { useEffect, useState, useLayoutEffect } from 'react';
import { Alert, Platform, ImageBackground } from 'react-native';
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
import { UserTask, frequencyLabels, Frequency } from '@/lib/database.types';
import { View } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FloatingBottomBar } from '@/components/FloatingBottomBar';
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
  const { user, isInitialized, initializingTasks } = useAuth();
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hide default header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    async function fetchUserTasks() {
      if (!user) {
        setLoading(false);
        return;
      }

      if (!isInitialized) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('user_tasks')
          .select(`
            id,
            user_id,
            core_task_id,
            name,
            frequency,
            created_at,
            core_task:core_tasks (
              id,
              name,
              frequency,
              created_at,
              icon
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        const transformedTasks = (data || []).map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          core_task_id: item.core_task_id,
          name: item.name,
          frequency: item.frequency,
          created_at: item.created_at,
          core_task: item.core_task,
        }));

        setTasks(transformedTasks);
      } catch (err) {
        console.error('Error fetching user tasks:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    }

    fetchUserTasks();
  }, [user, isInitialized]);

  const handleDeleteTask = (task: UserTask) => {
    const taskName = task.core_task?.name || task.name || 'this task';
    // Simplified delete for this UI demo, ideally would implement same logic as before
    Alert.alert('Not implemented', `Delete ${taskName} functionality coming soon in this UI.`);
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
                <View className="rounded-full overflow-hidden border-2 border-primary w-10 h-10 bg-gray-200 justify-center items-center">
                  {/* Placeholder avatar if image fails or not available */}
                  <Text className="text-xs font-bold text-gray-500">U</Text>
                  {/* If you had a real image URL, use <Image source={{ uri: '...' }} className="w-full h-full" /> */}
                </View>
                <View className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-white dark:border-background-dark rounded-full" />
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
            Good Morning,{'\n'}Alex! ☀️
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
                  <Text className="text-2xl font-bold dark:text-white">40%</Text>
                  <Text className="text-sm text-gray-400">crushed</Text>
                </HStack>
              </Box>
              <Box className="flex-row items-center space-x-2 px-3 py-1.5 bg-primary/20 dark:bg-primary/10 rounded-full">
                <MaterialIcons name="local-fire-department" size={16} color="#5bec13" />
                <Text className="text-xs font-bold text-gray-800 dark:text-primary">
                  5 Day Streak!
                </Text>
              </Box>
            </HStack>
            <View className="relative h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <View className="absolute top-0 left-0 h-full bg-primary rounded-full" style={{ width: '40%' }} />
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
            {/* Card 1 */}
            <Card className="w-[220px] h-[200px] justify-between relative overflow-hidden group">
              <View className="absolute top-0 right-0 p-4 opacity-10">
                <MaterialIcons name="cleaning-services" size={80} color="#5bec13" />
              </View>
              <Box>
                <View className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center mb-3">
                  <MaterialIcons name="cleaning-services" size={20} color="#5bec13" />
                </View>
                <Text className="font-bold text-lg leading-tight mb-1 dark:text-white">Kitchen Deep Clean</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">Est. 45 mins</Text>
              </Box>
              <Pressable className="w-full py-2.5 rounded-full bg-[#131811] dark:bg-white active:opacity-90 items-center">
                <Text className="text-white dark:text-[#131811] font-bold text-sm">Start Timer</Text>
              </Pressable>
            </Card>

            {/* Card 2 */}
            <Card className="w-[220px] h-[200px] justify-between relative overflow-hidden">
              <View className="absolute top-0 right-0 p-4 opacity-10">
                <MaterialCommunityIcons name="watering-can" size={80} color="#3b82f6" />
              </View>
              <Box>
                <View className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center mb-3">
                  <MaterialCommunityIcons name="flower" size={20} color="#3b82f6" />
                </View>
                <Text className="font-bold text-lg leading-tight mb-1 dark:text-white">Water Plants</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">Living Room & Hall</Text>
              </Box>
              <Pressable className="w-full py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 items-center">
                <Text className="text-gray-900 dark:text-white font-bold text-sm">Mark Done</Text>
              </Pressable>
            </Card>

            {/* Card 3 */}
            <Card className="w-[220px] h-[200px] justify-between relative overflow-hidden">
              <View className="absolute top-0 right-0 p-4 opacity-10">
                <MaterialIcons name="bolt" size={80} color="#fb923c" />
              </View>
              <Box>
                <View className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 items-center justify-center mb-3">
                  <MaterialIcons name="bolt" size={24} color="#fb923c" />
                </View>
                <Text className="font-bold text-lg leading-tight mb-1 dark:text-white">Pay Electric Bill</Text>
                <Text className="text-xs text-red-500 font-bold">Due Today!</Text>
              </Box>
              <Pressable className="w-full py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 items-center">
                <Text className="text-gray-900 dark:text-white font-bold text-sm">Pay Now</Text>
              </Pressable>
            </Card>
          </ScrollView>
        </Box>

        {/* Morning Routine List */}
        <Box className="px-4 mb-8">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">Morning Routine</Text>
          <VStack className="space-y-2">
            {/* Item 1: Static example */}
            <Pressable className="flex-row items-center p-3 bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <View className="w-6 h-6 rounded-full bg-primary mr-4 items-center justify-center">
                <MaterialIcons name="check" size={14} color="#131811" style={{ fontWeight: 'bold' }} />
              </View>
              <View className="flex-1 opacity-50">
                <Text className="text-base font-medium dark:text-white line-through decoration-primary">Make the bed</Text>
                <Text className="text-xs text-gray-500">Bedroom • 5 min</Text>
              </View>
            </Pressable>

            {/* Dynamic Items from DB */}
            {tasks.slice(0, 10).map((task) => {
              const iconName = task.core_task?.icon;
              return (
                <Pressable key={task.id} className="flex-row items-center p-3 bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm active:scale-[0.99] transition-transform">
                  <View className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 mr-3" />

                  {/* Task Icon */}
                  <View className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mr-3">
                    {getTaskIcon(iconName, 16, "#555")}
                  </View>

                  <View className="flex-1">
                    <Text className="text-base font-medium dark:text-white">{task.name || task.core_task?.name || 'Task'}</Text>
                    <Text className="text-xs text-gray-500">{task.frequency ? frequencyLabels[task.frequency] : 'Daily'} • 15 min</Text>
                  </View>
                  <View className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 items-center justify-center">
                    <MaterialIcons name="timer" size={20} color="#9ca3af" />
                  </View>
                </Pressable>
              )
            })}

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
      </ScrollView>

      {/* Floating Action Bar */}
      <FloatingBottomBar activeRoute="Home" />
    </View>
  );
}
