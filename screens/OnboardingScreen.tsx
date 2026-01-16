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

type PrimaryTaskSet = 'apartment' | 'homeowner' | 'empty';
type AddonTaskSet = 'pool_owner' | 'pet_owner';

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

interface AddonCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    checked: boolean;
    onToggle: () => void;
    color: string;
}

function AddonCard({ icon, title, description, checked, onToggle, color }: AddonCardProps) {
    return (
        <TouchableOpacity
            onPress={onToggle}
            style={[
                styles.card,
                checked && styles.cardSelected,
                checked && { borderColor: color },
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
            <View style={[styles.checkbox, checked && { backgroundColor: color, borderColor: color }]}>
                {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
        </TouchableOpacity>
    );
}

export default function OnboardingScreen() {
    const { initializeWithTaskSet, updateProfile, loading } = useAuth();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [primarySet, setPrimarySet] = useState<PrimaryTaskSet | null>(null);
    const [addons, setAddons] = useState<AddonTaskSet[]>([]);
    const [isInitializing, setIsInitializing] = useState(false);
    const [budgetMode, setBudgetMode] = useState<'managed' | 'all'>('managed');

    const toggleAddon = (addon: AddonTaskSet) => {
        setAddons(prev =>
            prev.includes(addon)
                ? prev.filter(a => a !== addon)
                : [...prev, addon]
        );
    };

    const handleContinue = async () => {
        if (step === 1 && primarySet) {
            if (primarySet === 'empty') {
                // Skip step 2 for empty selection, go directly to step 3
                setStep(3);
            } else {
                setStep(2);
            }
        } else if (step === 2) {
            setStep(3);
        } else if (step === 3) {
            await finishOnboarding();
        }
    };

    const finishOnboarding = async () => {
        if (!primarySet) return;

        try {
            setIsInitializing(true);

            // Save budget preference
            await updateProfile({
                budget_enabled: budgetMode === 'managed',
                daily_time_budget: budgetMode === 'managed' ? 75 : null
            });

            if (primarySet === 'empty') {
                await initializeWithTaskSet('empty');
            } else {
                // Combine primary set with addons
                const taskSets: TaskSet[] = [primarySet, ...addons];
                await initializeWithTaskSet(taskSets);
            }
        } catch (error) {
            console.error('Failed to initialize:', error);
        } finally {
            setIsInitializing(false);
        }
    };

    const handleBack = () => {
        if (step === 2) {
            setStep(1);
        } else if (step === 3) {
            // If we came from empty selection, go back to step 1
            if (primarySet === 'empty') {
                setStep(1);
            } else {
                setStep(2);
            }
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
                        {step === 1 ? 'Welcome to Homekeep' : step === 2 ? 'Optional Add-ons' : 'Daily Planning Mode'}
                    </Heading>
                    <Text className="text-typography-500 text-center mt-2 text-base px-4">
                        {step === 1
                            ? "Your personal home maintenance assistant. Let's get you set up with the right tasks for your living situation."
                            : step === 2
                                ? 'Do you have any of these? Add specialized maintenance tasks.'
                                : 'How would you like to manage your daily tasks?'}
                    </Text>
                </View>

                {/* Step Indicator */}
                <HStack space="sm" className="justify-center mt-6">
                    <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
                    <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
                    <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
                </HStack>

                {step === 1 ? (
                    /* Step 1: Primary Task Set Selection */
                    <VStack space="md" className="w-full px-5 mt-8">
                        <Text className="text-lg font-semibold text-typography-900 mb-2">
                            Choose your starting point:
                        </Text>

                        <TaskSetCard
                            icon="add-circle-outline"
                            title="Start Fresh"
                            description="Begin with an empty slate. Add tasks as you need them."
                            selected={primarySet === 'empty'}
                            onSelect={() => setPrimarySet('empty')}
                            color="#8E8E93"
                        />

                        <TaskSetCard
                            icon="business-outline"
                            title="Apartment Living"
                            description="Indoor cleaning and maintenance tasks perfect for renters."
                            selected={primarySet === 'apartment'}
                            onSelect={() => setPrimarySet('apartment')}
                            color="#34C759"
                        />

                        <TaskSetCard
                            icon="home-outline"
                            title="Homeowner"
                            description="Complete task set including exterior, yard, and seasonal maintenance."
                            selected={primarySet === 'homeowner'}
                            onSelect={() => setPrimarySet('homeowner')}
                            color="#007AFF"
                        />
                    </VStack>
                ) : step === 2 ? (
                    /* Step 2: Add-on Task Sets */
                    <VStack space="md" className="w-full px-5 mt-8">
                        <Text className="text-lg font-semibold text-typography-900 mb-2">
                            Select any that apply (optional):
                        </Text>

                        <AddonCard
                            icon="water-outline"
                            title="Pool Owner"
                            description="Pool maintenance including water chemistry, cleaning, and seasonal open/close."
                            checked={addons.includes('pool_owner')}
                            onToggle={() => toggleAddon('pool_owner')}
                            color="#00CED1"
                        />

                        <AddonCard
                            icon="paw-outline"
                            title="Pet Owner"
                            description="Pet care tasks like bedding wash, grooming, and cleaning pet areas."
                            checked={addons.includes('pet_owner')}
                            onToggle={() => toggleAddon('pet_owner')}
                            color="#FF9500"
                        />

                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
                            <Text className="text-sm text-typography-500 flex-1 ml-2">
                                You can skip this step and add these later from settings.
                            </Text>
                        </View>
                    </VStack>
                ) : (
                    /* Step 3: Time Budget Preference */
                    <VStack space="md" className="w-full px-5 mt-8">
                        <Text className="text-lg font-semibold text-typography-900 mb-2">
                            Choose your daily task management style:
                        </Text>

                        <TaskSetCard
                            icon="timer-outline"
                            title="Managed (Recommended)"
                            description="Show ~75 minutes of tasks per day. Overflow tasks go to 'Get Ahead' section."
                            selected={budgetMode === 'managed'}
                            onSelect={() => setBudgetMode('managed')}
                            color="#5bec13"
                        />

                        <TaskSetCard
                            icon="list-outline"
                            title="All Due Tasks"
                            description="Show all tasks that are due today or overdue. Can be overwhelming if you have many tasks."
                            selected={budgetMode === 'all'}
                            onSelect={() => setBudgetMode('all')}
                            color="#007AFF"
                        />

                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
                            <Text className="text-sm text-typography-500 flex-1 ml-2">
                                You can change this anytime in Settings → Time Budget.
                            </Text>
                        </View>
                    </VStack>
                )}

                {step === 1 && (
                    /* Info Note for Step 1 */
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
                        <Text className="text-sm text-typography-500 flex-1 ml-2">
                            You can always add, remove, or customize tasks later from the settings.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Bottom Buttons */}
            <View style={styles.bottomBar}>
                {(step === 2 || step === 3) && (
                    <Button
                        size="xl"
                        variant="outline"
                        onPress={handleBack}
                        className="flex-1 mr-3"
                        style={styles.backButton}
                    >
                        <ButtonText className="text-lg font-semibold text-typography-700">
                            Back
                        </ButtonText>
                    </Button>
                )}
                <Button
                    size="xl"
                    variant="solid"
                    action="primary"
                    onPress={handleContinue}
                    disabled={(step === 1 && !primarySet) || isInitializing}
                    className={(step === 2 || step === 3) ? "flex-1" : "w-full"}
                    style={[
                        styles.continueButton,
                        (step === 1 && !primarySet) && styles.buttonDisabled,
                    ]}
                >
                    {isInitializing ? (
                        <Spinner size="sm" color="white" />
                    ) : (
                        <ButtonText className="text-lg font-semibold">
                            {step === 1 ? 'Continue' : step === 2 ? 'Continue' : 'Get Started'}
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
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D1D1D6',
    },
    stepDotActive: {
        backgroundColor: '#007AFF',
        width: 24,
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
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#D1D1D6',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
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
        flexDirection: 'row',
    },
    backButton: {
        borderRadius: 14,
        height: 56,
    },
    continueButton: {
        borderRadius: 14,
        height: 56,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});
