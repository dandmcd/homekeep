import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text } from '@/components/ui/text';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Center } from '@/components/ui/center';
import { Spinner } from '@/components/ui/spinner';
import { ScrollView } from '@/components/ui/scroll-view';
import { View, Pressable, Platform } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ManageCoreTaskModal } from '@/components/ManageCoreTaskModal';
import {
  CoreTask,
  Frequency,
  frequencyLabels,
  frequencyOrder,
} from '@/lib/database.types';

type RootStackParamList = {
  Home: undefined;
  About: undefined;
  Settings: undefined;
  CoreTasks: undefined;
};

type CoreTasksScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CoreTasks'
>;

interface CoreTasksScreenProps {
  navigation: CoreTasksScreenNavigationProp;
}

export default function CoreTasksScreen({ navigation }: CoreTasksScreenProps) {
  const { isAdmin } = useAuth();
  const [tasks, setTasks] = useState<CoreTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Admin Editing State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CoreTask | null>(null);

  // Hide default header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const fetchCoreTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('core_tasks')
        .select('*')
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setTasks(data as CoreTask[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load core tasks'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoreTasks();
  }, [fetchCoreTasks]);

  const handleEditTask = (task: CoreTask) => {
    if (!isAdmin) return;
    setSelectedTask(task);
    setModalVisible(true);
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setModalVisible(true);
  };

  const handleModalSuccess = () => {
    fetchCoreTasks();
  };

  // Group tasks by frequency
  const tasksByFrequency = tasks.reduce(
    (acc, task) => {
      if (!acc[task.frequency]) {
        acc[task.frequency] = [];
      }
      acc[task.frequency].push(task);
      return acc;
    },
    {} as Record<Frequency, CoreTask[]>
  );

  // Helper to render the correct icon family
  const getTaskIcon = (iconName?: string, size = 20, color = "#5bec13") => {
    if (!iconName) return <MaterialIcons name="cleaning-services" size={size} color={color} />;

    if (iconName.startsWith('mci:')) {
      const name = iconName.replace('mci:', '') as any;
      return <MaterialCommunityIcons name={name} size={size} color={color} />;
    }

    return <MaterialIcons name={iconName as any} size={size} color={color} />;
  };

  if (loading && tasks.length === 0) {
    return (
      <View className="flex-1 bg-background-light dark:bg-background-dark relative">
        <Center className="flex-1">
          <Spinner size="lg" color="#5bec13" />
          <Text size="md" className="text-gray-500 mt-4">Loading core tasks...</Text>
        </Center>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark relative">
      {/* Sticky Header */}
      <Box className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 px-4 pt-12 pb-4 backdrop-blur-md border-b border-gray-100/50 dark:border-white/5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Pressable
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-surface-light dark:bg-surface-dark items-center justify-center shadow-sm mr-4 active:bg-gray-100 dark:active:bg-gray-800"
            >
              <MaterialIcons name="arrow-back" size={24} color="#131811" />
            </Pressable>
            <View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white">Core Maintenance</Text>
              <Text className="text-xs text-gray-500">{isAdmin ? 'Admin Mode' : 'System Defaults'}</Text>
            </View>
          </View>

          {isAdmin && (
            <Pressable
              onPress={handleCreateTask}
              className="w-10 h-10 rounded-full bg-[#131811] dark:bg-[#5bec13] items-center justify-center shadow-sm active:opacity-80"
            >
              <MaterialIcons name="add" size={24} color={Platform.OS === 'ios' ? '#fff' : '#fff'} />
            </Pressable>
          )}
        </View>
      </Box>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Floating Add Button for Mobile (Bottom Right) if preferred, but Header button is cleaner */}

        <Box className="p-4 pb-10">

          <View className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-6 border border-blue-100 dark:border-blue-900/50 flex-row items-start space-x-3">
            <MaterialIcons name="info-outline" size={24} color="#2563eb" />
            <Text className="flex-1 text-sm text-blue-800 dark:text-blue-300 leading-5">
              These are the default tasks that are added for all new users. They serve as the foundation for a healthy home maintenance schedule.
              {isAdmin && "\n\nAs an Admin, you can tap any task to edit or delete it."}
            </Text>
          </View>

          {error && (
            <View className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl mb-6 border border-red-100 dark:border-red-900/50">
              <Text className="text-red-700 dark:text-red-400">{error}</Text>
            </View>
          )}

          {frequencyOrder.map((frequency) => {
            const frequencyTasks = tasksByFrequency[frequency];
            if (!frequencyTasks || frequencyTasks.length === 0) {
              return null;
            }

            return (
              <Box key={frequency} className="mb-6">
                <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 ml-2">
                  {frequencyLabels[frequency]}
                </Text>

                <VStack className="space-y-3">
                  {frequencyTasks.map((task) => (
                    <Pressable
                      key={task.id}
                      onPress={() => handleEditTask(task)}
                      disabled={!isAdmin}
                      className={`flex-row items-center p-3 bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm ${isAdmin ? 'active:bg-gray-50 dark:active:bg-gray-800' : ''}`}
                    >
                      <View className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 items-center justify-center mr-3">
                        {getTaskIcon(task.icon, 20, "#555")}
                      </View>

                      <View className="flex-1">
                        <Text className="text-base font-bold text-gray-900 dark:text-white">
                          {task.name}
                        </Text>
                        <Text className="text-xs text-gray-400">
                          {task.room ? `${task.room} • ` : ''}
                          {frequencyLabels[task.frequency]}
                          {task.estimated_time ? ` • ${task.estimated_time} min` : ''}
                        </Text>
                      </View>

                      {isAdmin ? (
                        <MaterialIcons name="edit" size={16} color="#9ca3af" />
                      ) : (
                        <View className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 items-center justify-center">
                          <MaterialIcons name="lock-outline" size={16} color="#9ca3af" />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </VStack>
              </Box>
            );
          })}

          {tasks.length === 0 && !loading && !error && (
            <Center className="py-20">
              <MaterialIcons name="playlist-remove" size={48} color="#d1d5db" />
              <Text className="text-lg text-gray-400 font-medium mt-3">
                No core tasks found
              </Text>
            </Center>
          )}

        </Box>
      </ScrollView>

      <ManageCoreTaskModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={handleModalSuccess}
        taskToEdit={selectedTask}
      />
    </View>
  );
}
