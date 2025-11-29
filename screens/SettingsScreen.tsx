import React, { useState } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { ScrollView } from '@/components/ui/scroll-view';
import { Switch } from '@/components/ui/switch';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';

type RootStackParamList = {
  Home: undefined;
  About: undefined;
  Settings: undefined;
};

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

interface SettingsScreenProps {
  navigation: SettingsScreenNavigationProp;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState<boolean>(false);

  return (
    <ScrollView className="flex-1 bg-background-50">
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
        </Box>

        <Button
          size="xl"
          variant="solid"
          action="primary"
          className="mt-5"
          onPress={() => navigation.navigate('Home')}
        >
          <ButtonText>Back to Home</ButtonText>
        </Button>
      </Box>
    </ScrollView>
  );
}
