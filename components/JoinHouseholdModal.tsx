import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Text } from './ui/text';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

interface JoinHouseholdModalProps {
    isVisible: boolean;
    onClose: () => void;
    initialCode?: string;
}

export function JoinHouseholdModal({ isVisible, onClose, initialCode = '' }: JoinHouseholdModalProps) {
    const { joinHousehold } = useAuth();
    const [code, setCode] = useState(initialCode);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isVisible && initialCode) {
            setCode(initialCode);
        }
    }, [isVisible, initialCode]);

    const handleJoin = async () => {
        if (!code.trim()) return;

        try {
            setLoading(true);
            setError(null);
            await joinHousehold(code.trim().toUpperCase());
            setCode('');
            onClose();
        } catch (err) {
            setError('Invalid invite code or already a member.');
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
                        <Text className="text-xl font-bold dark:text-white">Join Household</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 -mr-2">
                            <MaterialIcons name="close" size={24} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    <View className="space-y-4">
                        <View>
                            <Text className="text-sm font-medium text-gray-500 mb-2">Invite Code</Text>
                            <TextInput
                                className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-base text-gray-900 dark:text-white font-mono uppercase"
                                placeholder="e.g. A1B2C3"
                                placeholderTextColor="#9ca3af"
                                value={code}
                                onChangeText={(text) => setCode(text.toUpperCase())}
                                autoFocus={!initialCode}
                                maxLength={6}
                            />
                        </View>

                        {error && (
                            <Text className="text-red-500 text-sm p-2 bg-red-50 rounded-lg">{error}</Text>
                        )}

                        <TouchableOpacity
                            onPress={handleJoin}
                            disabled={loading || !code.trim()}
                            className={`w-full h-12 flex-row items-center justify-center rounded-full mt-4 ${loading || !code.trim()
                                    ? 'bg-gray-200 dark:bg-zinc-800'
                                    : 'bg-primary'
                                }`}
                        >
                            {loading ? (
                                <ActivityIndicator color={code.trim() ? '#131811' : '#9ca3af'} />
                            ) : (
                                <Text
                                    className={`font-bold text-base ${loading || !code.trim()
                                            ? 'text-gray-400 dark:text-zinc-500'
                                            : 'text-[#131811]'
                                        }`}
                                >
                                    Join Household
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
