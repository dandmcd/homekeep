import React, { useState, useEffect } from 'react';
import { Modal, TextInput, View, Pressable, ScrollView, Platform } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Spinner } from '@/components/ui/spinner';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CoreTask, Frequency, frequencyLabels, frequencyOrder, TaskSet } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

interface ManageCoreTaskModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    taskToEdit?: CoreTask | null;
}

export function ManageCoreTaskModal({
    visible,
    onClose,
    onSuccess,
    taskToEdit,
}: ManageCoreTaskModalProps) {
    const [name, setName] = useState('');
    const [frequency, setFrequency] = useState<Frequency>('weekly');
    const [room, setRoom] = useState('');
    const [estimatedTime, setEstimatedTime] = useState('');
    const [icon, setIcon] = useState('');
    const [taskSets, setTaskSets] = useState<TaskSet[]>(['homeowner']);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            if (taskToEdit) {
                setName(taskToEdit.name);
                setFrequency(taskToEdit.frequency);
                setRoom(taskToEdit.room || '');
                setEstimatedTime(taskToEdit.estimated_time?.toString() || '');
                setIcon(taskToEdit.icon || '');
                setTaskSets(taskToEdit.task_set || ['homeowner']);
            } else {
                // Reset for new task
                setName('');
                setFrequency('weekly');
                setRoom('');
                setEstimatedTime('');
                setIcon('');
                setTaskSets(['homeowner']);
            }
            setError(null);
        }
    }, [visible, taskToEdit]);

    const toggleTaskSet = (set: TaskSet) => {
        setTaskSets(prev => {
            if (prev.includes(set)) {
                // Don't allow removing all sets
                if (prev.length === 1) return prev;
                return prev.filter(s => s !== set);
            } else {
                return [...prev, set];
            }
        });
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Task name is required');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const taskData = {
                name: name.trim(),
                frequency,
                room: room.trim() || null,
                estimated_time: estimatedTime ? parseInt(estimatedTime, 10) : null,
                icon: icon.trim() || null,
                task_set: taskSets,
            };

            if (taskToEdit) {
                // Update existing task
                const { error: updateError } = await supabase
                    .from('core_tasks')
                    .update(taskData)
                    .eq('id', taskToEdit.id);

                if (updateError) throw updateError;
            } else {
                // Create new task
                const { error: insertError } = await supabase
                    .from('core_tasks')
                    .insert(taskData);

                if (insertError) throw insertError;
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error saving core task:', err);
            setError(err instanceof Error ? err.message : 'Failed to save task');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!taskToEdit) return;

        if (Platform.OS === 'web') {
            if (!window.confirm('Are you sure you want to delete this core task?')) {
                return;
            }
        }

        try {
            setSaving(true);
            const { error: deleteError } = await supabase
                .from('core_tasks')
                .delete()
                .eq('id', taskToEdit.id);

            if (deleteError) throw deleteError;

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error deleting core task:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete task');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/50">
                <Box className="bg-surface-light dark:bg-surface-dark rounded-t-3xl h-[85%] w-full flex-col shadow-2xl overflow-hidden">
                    {/* Header */}
                    <HStack className="items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                        <Text className="text-xl font-bold text-gray-900 dark:text-white">
                            {taskToEdit ? 'Edit Core Task' : 'New Core Task'}
                        </Text>
                        <Pressable
                            onPress={onClose}
                            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center active:opacity-70"
                        >
                            <MaterialIcons name="close" size={24} color="#6b7280" />
                        </Pressable>
                    </HStack>

                    <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
                        <VStack className="space-y-6 pb-10">

                            {error && (
                                <Box className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50">
                                    <Text className="text-red-600 dark:text-red-400 font-medium">{error}</Text>
                                </Box>
                            )}

                            {/* Name */}
                            <Box>
                                <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Task Name</Text>
                                <TextInput
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="e.g., Clean Filters"
                                    placeholderTextColor="#9ca3af"
                                    className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-base text-gray-900 dark:text-white"
                                />
                            </Box>

                            {/* Frequency */}
                            <Box>
                                <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Frequency</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-2">
                                    <HStack className="space-x-2 pr-4">
                                        {frequencyOrder.map((freq) => (
                                            <Pressable
                                                key={freq}
                                                onPress={() => setFrequency(freq)}
                                                className={`px-4 py-2 rounded-full border ${frequency === freq
                                                    ? 'bg-primary dark:bg-primary border-primary'
                                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                                    }`}
                                            >
                                                <Text
                                                    className={`font-medium ${frequency === freq
                                                        ? 'text-[#131811] dark:text-[#131811]'
                                                        : 'text-gray-600 dark:text-gray-300'
                                                        }`}
                                                >
                                                    {frequencyLabels[freq]}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </HStack>
                                </ScrollView>
                            </Box>

                            {/* Room */}
                            <Box>
                                <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Room / Area (Optional)</Text>
                                <TextInput
                                    value={room}
                                    onChangeText={setRoom}
                                    placeholder="e.g., Kitchen"
                                    placeholderTextColor="#9ca3af"
                                    className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-base text-gray-900 dark:text-white"
                                />
                            </Box>

                            {/* Estimated Time */}
                            <Box>
                                <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Estimated Time (Min)</Text>
                                <TextInput
                                    value={estimatedTime}
                                    onChangeText={setEstimatedTime}
                                    placeholder="e.g., 15"
                                    keyboardType="numeric"
                                    placeholderTextColor="#9ca3af"
                                    className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-base text-gray-900 dark:text-white"
                                />
                            </Box>

                            {/* Icon */}
                            <Box>
                                <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Icon Name (Material Icons)</Text>
                                <TextInput
                                    value={icon}
                                    onChangeText={setIcon}
                                    placeholder="e.g., cleaning-services"
                                    autoCapitalize="none"
                                    placeholderTextColor="#9ca3af"
                                    className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-base text-gray-900 dark:text-white"
                                />
                                <Text className="text-xs text-gray-400 mt-2">
                                    Use 'mci:' prefix for MaterialCommunityIcons (e.g. mci:broom)
                                </Text>
                            </Box>

                            {/* Task Sets */}
                            <Box>
                                <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Task Sets</Text>
                                <Text className="text-xs text-gray-400 mb-3">
                                    Select which onboarding sets should include this task
                                </Text>
                                <HStack className="space-x-3">
                                    <Pressable
                                        onPress={() => toggleTaskSet('apartment')}
                                        className={`flex-1 p-4 rounded-xl border flex-row items-center justify-center ${taskSets.includes('apartment')
                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                            }`}
                                    >
                                        <MaterialIcons
                                            name="business"
                                            size={20}
                                            color={taskSets.includes('apartment') ? '#22c55e' : '#9ca3af'}
                                        />
                                        <Text className={`ml-2 font-medium ${taskSets.includes('apartment')
                                                ? 'text-green-700 dark:text-green-400'
                                                : 'text-gray-600 dark:text-gray-400'
                                            }`}>
                                            Apartment
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => toggleTaskSet('homeowner')}
                                        className={`flex-1 p-4 rounded-xl border flex-row items-center justify-center ${taskSets.includes('homeowner')
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                            }`}
                                    >
                                        <MaterialIcons
                                            name="home"
                                            size={20}
                                            color={taskSets.includes('homeowner') ? '#3b82f6' : '#9ca3af'}
                                        />
                                        <Text className={`ml-2 font-medium ${taskSets.includes('homeowner')
                                                ? 'text-blue-700 dark:text-blue-400'
                                                : 'text-gray-600 dark:text-gray-400'
                                            }`}>
                                            Homeowner
                                        </Text>
                                    </Pressable>
                                </HStack>
                            </Box>

                            {/* Actions */}
                            <VStack className="space-y-4 pt-4">
                                <Pressable
                                    onPress={handleSave}
                                    disabled={saving}
                                    className="bg-[#131811] dark:bg-[#5bec13] p-4 rounded-2xl items-center active:opacity-90"
                                >
                                    {saving ? (
                                        <Spinner color="#fff" />
                                    ) : (
                                        <Text className="text-white dark:text-[#131811] font-bold text-lg">
                                            {taskToEdit ? 'Save Changes' : 'Create Task'}
                                        </Text>
                                    )}
                                </Pressable>

                                {taskToEdit && (
                                    <Pressable
                                        onPress={handleDelete}
                                        disabled={saving}
                                        className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl items-center border border-red-100 dark:border-red-900/50 active:bg-red-100"
                                    >
                                        <Text className="text-red-600 dark:text-red-400 font-bold text-lg">
                                            Delete Task
                                        </Text>
                                    </Pressable>
                                )}
                            </VStack>

                        </VStack>
                    </ScrollView>
                </Box>
            </View>
        </Modal>
    );
}
