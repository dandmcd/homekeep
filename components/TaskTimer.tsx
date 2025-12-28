import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TaskTimerProps {
    isVisible: boolean;
    onClose: () => void;
    onComplete: () => void;
    taskName: string;
    durationMinutes: number;
}

export function TaskTimer({ isVisible, onClose, onComplete, taskName, durationMinutes }: TaskTimerProps) {
    const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
    const [isActive, setIsActive] = useState(false);

    const progress = useSharedValue(1);

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

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: CIRCLE_LENGTH * (1 - progress.value),
    }));

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

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
