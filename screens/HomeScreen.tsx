import React, { useEffect, useState } from 'react';
import { Alert, Platform, TextInput } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Center } from '@/components/ui/center';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Pressable } from '@/components/ui/pressable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { UserTask, frequencyLabels, Frequency, frequencyOrder } from '@/lib/database.types';

type RootStackParamList = {
  Home: undefined;
  About: undefined;
  Settings: undefined;
  CoreTasks: undefined;
  Calendar: undefined;
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
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskFrequency, setNewTaskFrequency] = useState<Frequency>('weekly');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    async function fetchUserTasks() {
      console.log('HomeScreen effect - user:', !!user, 'isInitialized:', isInitialized);

      if (!user) {
        console.log('No user, skipping fetch');
        setLoading(false);
        return;
      }

      if (!isInitialized) {
        console.log('User not initialized yet, skipping fetch');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching user tasks...');
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
              created_at
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        console.log('Fetched tasks:', data?.length || 0);

        // Transform the data to match UserTask interface
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

  const handleAddTask = async () => {
    if (!newTaskName.trim() || !user) return;

    setIsAdding(true);
    try {
      // Insert directly into user_tasks for custom tasks
      const { data: userTaskData, error: userTaskError } = await supabase
        .from('user_tasks')
        .insert({
          user_id: user.id,
          name: newTaskName.trim(),
          frequency: newTaskFrequency,
          // core_task_id is null for custom tasks
        })
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
            created_at
          )
        `)
        .single();

      if (userTaskError) throw userTaskError;

      // Update local state
      const newTask: UserTask = {
        id: userTaskData.id,
        user_id: userTaskData.user_id,
        core_task_id: userTaskData.core_task_id,
        name: userTaskData.name ?? undefined,
        frequency: (userTaskData.frequency as Frequency) ?? undefined,
        created_at: userTaskData.created_at,
        core_task: Array.isArray(userTaskData.core_task) ? userTaskData.core_task[0] : userTaskData.core_task,
      };

      setTasks(prev => [...prev, newTask]);
      setNewTaskName('');
      setNewTaskFrequency('weekly');

    } catch (err) {
      console.error('Error adding task:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add task';
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsAdding(false);
    }
  };



  const handleDeleteTask = (task: UserTask) => {
    const taskName = task.core_task?.name || 'this task';

    const performDelete = async () => {
      try {
        setDeletingTaskId(task.id);

        const { error: deleteError } = await supabase
          .from('user_tasks')
          .delete()
          .eq('id', task.id);

        if (deleteError) {
          throw deleteError;
        }

        // Remove from local state
        setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
      } catch (err) {
        console.error('Error deleting task:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove task';
        if (Platform.OS === 'web') {
          window.alert(errorMessage);
        } else {
          Alert.alert('Error', errorMessage);
        }
      } finally {
        setDeletingTaskId(null);
      }
    };

    // Use window.confirm on web, Alert.alert on native
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to remove "${taskName}" from your list?`)) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Remove Task',
        `Are you sure you want to remove "${taskName}" from your list?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: performDelete,
          },
        ]
      );
    }
  };

  if (initializingTasks) {
    return (
      <Center className="flex-1 bg-background-50">
        <Spinner size="lg" />
        <Text size="md" className="text-typography-500 mt-4">
          Setting up your tasks...
        </Text>
      </Center>
    );
  }

  if (loading) {
    return (
      <Center className="flex-1 bg-background-50">
        <Spinner size="lg" />
        <Text size="md" className="text-typography-500 mt-4">
          Loading your tasks...
        </Text>
      </Center>
    );
  }

  if (error) {
    return (
      <Center className="flex-1 bg-background-50 p-5">
        <Text size="lg" className="text-error-500 text-center mb-4">
          {error}
        </Text>
        <Button
          size="md"
          variant="solid"
          action="primary"
          onPress={() => navigation.navigate('Settings')}
        >
          <ButtonText>Go to Settings</ButtonText>
        </Button>
      </Center>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background-50">
      <Box className="p-5 pb-10">
        <Heading size="xl" className="text-typography-900 mb-2 text-center">
          Your Tasks
        </Heading>
        <Text size="sm" className="text-typography-500 mb-5 text-center">
          {tasks.length} tasks assigned to your account
        </Text>

        <Box className="bg-white p-4 rounded-lg mb-6">
          <Heading size="md" className="mb-3">Add New Task</Heading>
          <VStack space="md">
            <TextInput
              placeholder="Task Name"
              value={newTaskName}
              onChangeText={setNewTaskName}
              style={{
                borderWidth: 1,
                borderColor: '#e5e5e5',
                padding: 12,
                borderRadius: 8,
                fontSize: 16,
              }}
            />

            <Box>
              <Text size="xs" className="mb-2 text-typography-500">Frequency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <HStack space="sm" className="pb-2">
                  {frequencyOrder.map((freq) => (
                    <Pressable
                      key={freq}
                      onPress={() => setNewTaskFrequency(freq)}
                      className={`px-3 py-2 rounded-full border ${newTaskFrequency === freq
                        ? 'bg-primary-500 border-primary-500'
                        : 'bg-white border-outline-200'
                        }`}
                    >
                      <Text
                        size="xs"
                        className={
                          newTaskFrequency === freq ? 'text-white' : 'text-typography-600'
                        }
                      >
                        {frequencyLabels[freq]}
                      </Text>
                    </Pressable>
                  ))}
                </HStack>
              </ScrollView>
            </Box>

            <Button
              size="md"
              variant="solid"
              action="primary"
              onPress={handleAddTask}
              isDisabled={isAdding || !newTaskName.trim()}
            >
              {isAdding ? (
                <Spinner color="white" />
              ) : (
                <ButtonText>Add Task</ButtonText>
              )}
            </Button>
          </VStack>
        </Box>

        {tasks.length === 0 ? (
          <Center className="py-10">
            <Text size="lg" className="text-typography-400">
              No tasks found
            </Text>
            <Text size="sm" className="text-typography-400 mt-2 text-center">
              Tasks will appear here once your account is set up.
            </Text>
          </Center>
        ) : (
          <VStack space="sm">
            {tasks.map((task) => (
              <Box
                key={task.id}
                className="bg-white p-4 rounded-lg"
              >
                <HStack className="justify-between items-center">
                  <VStack space="xs" className="flex-1 mr-3">
                    <Text size="md" className="text-typography-900 font-medium">
                      {task.name || task.core_task?.name || 'Unknown Task'}
                    </Text>
                    <Text size="sm" className="text-typography-500">
                      {(task.frequency || task.core_task?.frequency)
                        ? frequencyLabels[(task.frequency || task.core_task?.frequency) as Frequency]
                        : 'Unknown frequency'}
                    </Text>
                  </VStack>
                  <Pressable
                    onPress={() => handleDeleteTask(task)}
                    disabled={deletingTaskId === task.id}
                    className="p-2 rounded-md bg-error-50 active:bg-error-100"
                  >
                    {deletingTaskId === task.id ? (
                      <Spinner size="sm" color="#dc2626" />
                    ) : (
                      <Text size="sm" className="text-error-600 font-medium">
                        Remove
                      </Text>
                    )}
                  </Pressable>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}

        <VStack space="md" className="mt-8">
          <Button
            size="xl"
            variant="solid"
            action="primary"
            onPress={() => navigation.navigate('About')}
          >
            <ButtonText>Learn More</ButtonText>
          </Button>

          <Button
            size="xl"
            variant="solid"
            action="positive"
            onPress={() => navigation.navigate('Calendar')}
          >
            <ButtonText>View Schedule</ButtonText>
          </Button>

          <Button
            size="xl"
            variant="outline"
            action="secondary"
            onPress={() => navigation.navigate('Settings')}
          >
            <ButtonText>Settings</ButtonText>
          </Button>
        </VStack>
      </Box>
    </ScrollView>
  );
}
