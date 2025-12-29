import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Text } from './ui/text';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

interface CreateHouseholdModalProps {
    isVisible: boolean;
    onClose: () => void;
}

export function CreateHouseholdModal({ isVisible, onClose }: CreateHouseholdModalProps) {
    const { createHousehold } = useAuth();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!name.trim()) return;

        try {
            setLoading(true);
            setError(null);
            await createHousehold(name.trim());
            setName('');
            onClose();
        } catch (err) {
            setError('Failed to create household. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={isVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-center items-center bg-black/50 p-4">
                <View className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-sm p-6 shadow-xl">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-xl font-bold dark:text-white">Create Household</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 -mr-2">
                            <MaterialIcons name="close" size={24} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    <View className="space-y-4">
                        <View>
                            <Text className="text-sm font-medium text-gray-500 mb-2">Household Name</Text>
                            <TextInput
                                className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-base text-gray-900 dark:text-white"
                                placeholder="e.g. My Castle"
                                placeholderTextColor="#9ca3af"
                                value={name}
                                onChangeText={setName}
                                autoFocus
                            />
                        </View>

                        {error && (
                            <Text className="text-red-500 text-sm p-2 bg-red-50 rounded-lg">{error}</Text>
                        )}

                        <TouchableOpacity
                            onPress={handleCreate}
                            disabled={loading || !name.trim()}
                            className={`w-full h-12 flex-row items-center justify-center rounded-full mt-4 ${loading || !name.trim()
                                    ? 'bg-gray-200 dark:bg-zinc-800'
                                    : 'bg-primary'
                                }`}
                        >
                            {loading ? (
                                <ActivityIndicator color={name.trim() ? '#131811' : '#9ca3af'} />
                            ) : (
                                <Text
                                    className={`font-bold text-base ${loading || !name.trim()
                                            ? 'text-gray-400 dark:text-zinc-500'
                                            : 'text-[#131811]'
                                        }`}
                                >
                                    Create Household
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
