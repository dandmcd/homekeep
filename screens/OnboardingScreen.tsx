import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Center } from '@/components/ui/center';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { TaskSet } from '@/lib/database.types';
import { Ionicons } from '@expo/vector-icons';

type TaskSetOption = TaskSet | 'empty';

interface TaskSetCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    selected: boolean;
    onSelect: () => void;
    color: string;
}

function TaskSetCard({ icon, title, description, selected, onSelect, color }: TaskSetCardProps) {
    return (
        <TouchableOpacity
            onPress={onSelect}
            style={[
                styles.card,
                selected && styles.cardSelected,
                selected && { borderColor: color },
            ]}
            activeOpacity={0.8}
        >
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={32} color={color} />
            </View>
            <VStack space="xs" className="flex-1">
                <Text className="text-lg font-bold text-typography-900">{title}</Text>
                <Text className="text-sm text-typography-500">{description}</Text>
            </VStack>
            <View style={[styles.radio, selected && { borderColor: color }]}>
                {selected && <View style={[styles.radioInner, { backgroundColor: color }]} />}
            </View>
        </TouchableOpacity>
    );
}

export default function OnboardingScreen() {
    const { initializeWithTaskSet, loading } = useAuth();
    const [selectedSet, setSelectedSet] = useState<TaskSetOption | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);

    const handleContinue = async () => {
        if (!selectedSet) return;

        try {
            setIsInitializing(true);
            await initializeWithTaskSet(selectedSet);
        } catch (error) {
            console.error('Failed to initialize:', error);
            // Could show an alert here
        } finally {
            setIsInitializing(false);
        }
    };

    if (loading) {
        return (
            <Center className="flex-1 bg-background-50">
                <Spinner size="lg" />
            </Center>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="home" size={48} color="#007AFF" />
                    </View>
                    <Heading size="2xl" className="text-typography-900 text-center mt-4">
                        Welcome to Homekeep
                    </Heading>
                    <Text className="text-typography-500 text-center mt-2 text-base px-4">
                        Your personal home maintenance assistant. Let's get you set up with
                        the right tasks for your living situation.
                    </Text>
                </View>

                {/* Task Set Selection */}
                <VStack space="md" className="w-full px-5 mt-8">
                    <Text className="text-lg font-semibold text-typography-900 mb-2">
                        Choose your starting point:
                    </Text>

                    <TaskSetCard
                        icon="add-circle-outline"
                        title="Start Fresh"
                        description="Begin with an empty slate. Add tasks as you need them."
                        selected={selectedSet === 'empty'}
                        onSelect={() => setSelectedSet('empty')}
                        color="#8E8E93"
                    />

                    <TaskSetCard
                        icon="business-outline"
                        title="Apartment Living"
                        description="Indoor cleaning and maintenance tasks perfect for renters."
                        selected={selectedSet === 'apartment'}
                        onSelect={() => setSelectedSet('apartment')}
                        color="#34C759"
                    />

                    <TaskSetCard
                        icon="home-outline"
                        title="Homeowner"
                        description="Complete task set including exterior, yard, and seasonal maintenance."
                        selected={selectedSet === 'homeowner'}
                        onSelect={() => setSelectedSet('homeowner')}
                        color="#007AFF"
                    />
                </VStack>

                {/* Info Note */}
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
                    <Text className="text-sm text-typography-500 flex-1 ml-2">
                        You can always add, remove, or customize tasks later from the settings.
                    </Text>
                </View>
            </ScrollView>

            {/* Bottom Button */}
            <View style={styles.bottomBar}>
                <Button
                    size="xl"
                    variant="solid"
                    action="primary"
                    onPress={handleContinue}
                    disabled={!selectedSet || isInitializing}
                    className="w-full"
                    style={[
                        styles.continueButton,
                        !selectedSet && styles.buttonDisabled,
                    ]}
                >
                    {isInitializing ? (
                        <Spinner size="sm" color="white" />
                    ) : (
                        <ButtonText className="text-lg font-semibold">
                            Get Started
                        </ButtonText>
                    )}
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F7',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 100,
    },
    header: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#E5F1FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardSelected: {
        backgroundColor: '#FFFFFF',
        shadowOpacity: 0.1,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    radio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#D1D1D6',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F0F0F5',
        marginHorizontal: 20,
        marginTop: 24,
        padding: 16,
        borderRadius: 12,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 34,
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    continueButton: {
        borderRadius: 14,
        height: 56,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});
