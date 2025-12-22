import React, { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { ScrollView } from '@/components/ui/scroll-view';
import { Switch } from '@/components/ui/switch';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { FloatingBottomBar } from '@/components/FloatingBottomBar';
import { View } from 'react-native';

type RootStackParamList = {
  Home: undefined;
  About: undefined;
  Settings: undefined;
  CoreTasks: undefined;
};

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

interface SettingsScreenProps {
  navigation: SettingsScreenNavigationProp;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { resetAccount, initializingTasks, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const handleResetAccount = () => {
    const performReset = async () => {
      try {
        setIsResetting(true);
        await resetAccount();
        if (Platform.OS === 'web') {
          window.alert('Your account has been reset with fresh tasks.');
        } else {
          Alert.alert('Success', 'Your account has been reset with fresh tasks.');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to reset account';
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Error', message);
        }
      } finally {
        setIsResetting(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Reset Account\n\nThis will delete all your tasks and restore the default core tasks. This action cannot be undone.'
      );
      if (confirmed) {
        void performReset();
      }
      return;
    }

    Alert.alert(
      'Reset Account',
      'Are you sure you want to reset your account? This will delete all your tasks and restore the default core tasks. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => void performReset(),
        },
      ]
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to sign out'
      );
    }
  };

  return (
    <View className="flex-1 bg-background-50 relative">
      <ScrollView className="flex-1 mb-24">
        <Box className="p-5 pb-10">
          <Heading size="xl" className="text-typography-900 mb-5 text-center">Settings</Heading>

          <Box className="bg-white p-4 rounded-lg mb-4">
            <Heading size="md" className="text-typography-900 mb-4">Preferences</Heading>

            <HStack className="justify-between items-center py-3 border-b border-outline-100">
              <Text size="md" className="text-typography-900">Enable Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
              />
            </HStack>

            <HStack className="justify-between items-center py-3 border-b border-outline-100">
              <Text size="md" className="text-typography-900">Dark Mode</Text>
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
              />
            </HStack>
          </Box>

          <Box className="bg-white p-4 rounded-lg mb-4">
            <Heading size="md" className="text-typography-900 mb-2.5">Account</Heading>

            <Pressable className="py-4 border-b border-outline-100">
              <HStack className="justify-between items-center">
                <Text size="md" className="text-typography-900">Profile Settings</Text>
                <Text size="xl" className="text-typography-400">›</Text>
              </HStack>
            </Pressable>

            <Pressable className="py-4 border-b border-outline-100">
              <HStack className="justify-between items-center">
                <Text size="md" className="text-typography-900">Privacy & Security</Text>
                <Text size="xl" className="text-typography-400">›</Text>
              </HStack>
            </Pressable>

            <Pressable className="py-4 border-b border-outline-100">
              <HStack className="justify-between items-center">
                <Text size="md" className="text-typography-900">Data & Storage</Text>
                <Text size="xl" className="text-typography-400">›</Text>
              </HStack>
            </Pressable>

            <Pressable
              className="py-4 border-b border-outline-100"
              onPress={() => navigation.navigate('CoreTasks')}
            >
              <HStack className="justify-between items-center">
                <Text size="md" className="text-typography-900">Core Tasks</Text>
                <Text size="xl" className="text-typography-400">›</Text>
              </HStack>
            </Pressable>
          </Box>

          <Box className="mt-4">
            <Button
              size="lg"
              variant="outline"
              action="negative"
              className="w-full mb-4"
              onPress={handleResetAccount}
              isDisabled={isResetting || initializingTasks}
            >
              {isResetting || initializingTasks ? (
                <Spinner size="sm" color="#dc2626" />
              ) : (
                <ButtonText>Reset Account</ButtonText>
              )}
            </Button>

            <Button
              size="lg"
              variant="outline"
              action="secondary"
              className="w-full mb-4"
              onPress={handleSignOut}
            >
              <ButtonText>Sign Out</ButtonText>
            </Button>
          </Box>
        </Box>
      </ScrollView>
      <FloatingBottomBar activeRoute="Settings" />
    </View>
  );
}
