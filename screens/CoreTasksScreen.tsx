import React, { useEffect, useState } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { Center } from '@/components/ui/center';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/lib/supabase';
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
  const [tasks, setTasks] = useState<CoreTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCoreTasks() {
      try {
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
    }

    fetchCoreTasks();
  }, []);

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

  if (loading) {
    return (
      <Center className="flex-1 bg-background-50">
        <Spinner size="lg" />
        <Text size="md" className="text-typography-500 mt-4">
          Loading core tasks...
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
          onPress={() => navigation.goBack()}
        >
          <ButtonText>Go Back</ButtonText>
        </Button>
      </Center>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background-50">
      <Box className="p-5 pb-10">
        <Heading size="xl" className="text-typography-900 mb-2 text-center">
          Core Maintenance Tasks
        </Heading>
        <Text size="sm" className="text-typography-500 mb-5 text-center">
          These are the default tasks that will be added for new users. Tasks
          cannot be modified.
        </Text>

        {frequencyOrder.map((frequency) => {
          const frequencyTasks = tasksByFrequency[frequency];
          if (!frequencyTasks || frequencyTasks.length === 0) {
            return null;
          }

          return (
            <Box key={frequency} className="bg-white p-4 rounded-lg mb-4">
              <Heading size="md" className="text-typography-900 mb-3">
                {frequencyLabels[frequency]}
              </Heading>
              <VStack space="sm">
                {frequencyTasks.map((task) => (
                  <Box
                    key={task.id}
                    className="py-3 px-3 bg-background-50 rounded-md"
                  >
                    <Text size="md" className="text-typography-800">
                      {task.name}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </Box>
          );
        })}

        {tasks.length === 0 && (
          <Center className="py-10">
            <Text size="lg" className="text-typography-400">
              No core tasks found
            </Text>
            <Text size="sm" className="text-typography-400 mt-2 text-center">
              Run the seed SQL in your Supabase dashboard to add core tasks.
            </Text>
          </Center>
        )}

        <Button
          size="xl"
          variant="solid"
          action="primary"
          className="mt-5"
          onPress={() => navigation.goBack()}
        >
          <ButtonText>Back to Settings</ButtonText>
        </Button>
      </Box>
    </ScrollView>
  );
}
