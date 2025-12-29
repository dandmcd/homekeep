import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing, useAnimatedStyle, withSpring, FadeIn, FadeOut } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface TaskDetails {
    frequency?: string;
    dueDate?: string;
    room?: string;
    description?: string;
}

interface TaskDetailsModalProps {
    isVisible: boolean;
    onClose: () => void;
    onComplete: () => void;
    taskName: string;
    durationMinutes: number;
    taskDetails?: TaskDetails;
}

export function TaskDetailsModal({ isVisible, onClose, onComplete, taskName, durationMinutes, taskDetails }: TaskDetailsModalProps) {
    const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
    const [isActive, setIsActive] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const progress = useSharedValue(1);
    const detailsHeight = useSharedValue(0);

    // Cap size at 300px for larger screens to prevent overflow
    const timerSize = Math.min(width * 0.8, 300);
    const R = (timerSize - 30) / 2; // Adjust radius based on actual size and stroke width
    const CIRCLE_LENGTH = 2 * Math.PI * R;

    useEffect(() => {
        if (isVisible) {
            // Reset timer when opened
            setTimeLeft(durationMinutes * 60);
            setIsActive(false);
            progress.value = 1;
            setShowDetails(false);
            detailsHeight.value = 0;
        }
    }, [isVisible, durationMinutes]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    const newVal = prev - 1;
                    progress.value = withTiming(newVal / (durationMinutes * 60), {
                        duration: 1000,
                        easing: Easing.linear,
                    });
                    return newVal;
                });
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if (interval) clearInterval(interval);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft, durationMinutes]);

    const toggleTimer = () => {
        setIsActive(!isActive);
    };

    const toggleDetails = () => {
        setShowDetails(!showDetails);
        // Animate roughly 0 -> 150 height. 
        // Accurate height measuring with reanimated needs onLayout, keeping it simple fixed height for now or just visual standard spring
        // Actually, let's just use boolean toggle for logic and maybe opacity/transform if needed, 
        // but for a simple modal, a springy height is nice.
        detailsHeight.value = withSpring(showDetails ? 0 : 1, { damping: 15 });
    };

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: CIRCLE_LENGTH * (1 - progress.value),
    }));

    const detailsStyle = useAnimatedStyle(() => {
        return {
            opacity: detailsHeight.value,
            transform: [
                { translateY: (1 - detailsHeight.value) * -20 },
                { scale: 0.9 + (detailsHeight.value * 0.1) }
            ],
            height: showDetails ? 'auto' : 0, // Fallback for layout
            overflow: 'hidden',
            marginTop: detailsHeight.value * 24 // 6 * 4
        };
    });

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Helper to format frequency nicely
    const formatFrequency = (freq?: string) => {
        if (!freq) return 'One-time';
        return freq.charAt(0).toUpperCase() + freq.slice(1);
    }

    return (
        <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet" transparent={false}>
            <View style={styles.container} className="bg-background-light dark:bg-background-dark">
                <Box className="p-6 flex-1 items-center justify-center relative">

                    {/* Close Button */}
                    <Pressable onPress={onClose} className="absolute top-4 right-4 p-2 z-10">
                        <MaterialIcons name="close" size={24} color="#9ca3af" />
                    </Pressable>

                    <Text className="text-2xl font-bold mb-8 text-center text-gray-900 dark:text-white">{taskName}</Text>

                    <View style={styles.timerContainer}>
                        <Svg width={timerSize} height={timerSize} viewBox={`0 0 ${timerSize} ${timerSize}`}>
                            <Circle
                                cx={timerSize / 2}
                                cy={timerSize / 2}
                                r={R}
                                stroke="#e5e7eb"
                                strokeWidth={15}
                                fill="transparent"
                            />
                            <AnimatedCircle
                                cx={timerSize / 2}
                                cy={timerSize / 2}
                                r={R}
                                stroke="#5bec13"
                                strokeWidth={15}
                                fill="transparent"
                                strokeDasharray={CIRCLE_LENGTH}
                                animatedProps={animatedProps}
                                strokeLinecap="round"
                                rotation="-90"
                                origin={`${timerSize / 2}, ${timerSize / 2}`}
                            />
                        </Svg>
                        <View style={styles.timeTextContainer}>
                            <Text className="text-6xl font-bold font-mono text-gray-900 dark:text-white">
                                {formatTime(timeLeft)}
                            </Text>
                            <Text className="text-gray-500 mt-2">{isActive ? 'Focusing...' : 'Paused'}</Text>
                        </View>
                    </View>

                    <View className="mt-12 flex-row space-x-8 items-center justify-center">
                        <View className="items-center">
                            <Pressable
                                onPress={toggleTimer}
                                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                                className={`w-20 h-20 rounded-full items-center justify-center shadow-sm ${isActive ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}
                            >
                                <MaterialIcons name={isActive ? "pause" : "play-arrow"} size={40} color={isActive ? "#fbbf24" : "#5bec13"} />
                            </Pressable>
                            <Text className="text-sm font-medium text-gray-500 mt-2">{isActive ? 'Pause' : 'Start'}</Text>
                        </View>

                        <View className="items-center">
                            <Pressable
                                onPress={onComplete}
                                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                                className="w-20 h-20 rounded-full items-center justify-center bg-blue-100 dark:bg-blue-900/30 shadow-sm"
                            >
                                <MaterialIcons name="check" size={40} color="#3b82f6" />
                            </Pressable>
                            <Text className="text-sm font-medium text-gray-500 mt-2">Finish</Text>
                        </View>
                    </View>

                    {/* Details Expander */}
                    <View className="w-full max-w-[300px] mt-8 items-center">
                        <Pressable onPress={toggleDetails} className="flex-row items-center space-x-1 p-2">
                            <Text className="text-primary font-bold text-sm">
                                {showDetails ? 'Hide Details' : 'Show Details'}
                            </Text>
                            <MaterialIcons
                                name={showDetails ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                size={20}
                                color="#5bec13"
                            />
                        </Pressable>

                        {showDetails && (
                            <Animated.View
                                entering={FadeIn.duration(300)}
                                exiting={FadeOut.duration(200)}
                                className="w-full bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800 rounded-xl p-4 mt-4 shadow-sm"
                            >
                                <View className="space-y-3">
                                    <View className="flex-row items-center space-x-3">
                                        <View className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center">
                                            <MaterialIcons name="loop" size={18} color="#5bec13" />
                                        </View>
                                        <View>
                                            <Text className="text-xs text-gray-500 uppercase font-bold">Frequency</Text>
                                            <Text className="text-gray-900 dark:text-white font-medium">{formatFrequency(taskDetails?.frequency)}</Text>
                                        </View>
                                    </View>

                                    <View className="flex-row items-center space-x-3">
                                        <View className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center">
                                            <MaterialIcons name="home" size={18} color="#5bec13" />
                                        </View>
                                        <View>
                                            <Text className="text-xs text-gray-500 uppercase font-bold">Room</Text>
                                            <Text className="text-gray-900 dark:text-white font-medium">{taskDetails?.room || 'General'}</Text>
                                        </View>
                                    </View>

                                    <View className="flex-row items-center space-x-3">
                                        <View className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center">
                                            <MaterialIcons name="event" size={18} color="#5bec13" />
                                        </View>
                                        <View>
                                            <Text className="text-xs text-gray-500 uppercase font-bold">Due Date</Text>
                                            <Text className="text-gray-900 dark:text-white font-medium">{taskDetails?.dueDate ? new Date(taskDetails.dueDate).toLocaleDateString() : 'Today'}</Text>
                                        </View>
                                    </View>
                                </View>
                            </Animated.View>
                        )}
                    </View>

                </Box>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    timerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    timeTextContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

