import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { ScrollView } from '@/components/ui/scroll-view';

type RootStackParamList = {
  Home: undefined;
  About: undefined;
  Settings: undefined;
};

type AboutScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'About'>;

interface AboutScreenProps {
  navigation: AboutScreenNavigationProp;
}

export default function AboutScreen({ navigation }: AboutScreenProps) {
  return (
    <ScrollView className="flex-1 bg-background-50">
      <Box className="p-5 pb-10">
        <Heading size="xl" className="text-typography-900 mb-5 text-center">About Homekeep</Heading>

        <Box className="bg-white p-4 rounded-lg mb-4">
          <Heading size="md" className="text-typography-900 mb-2.5">What is Homekeep?</Heading>
          <Text size="md" className="text-typography-600 leading-md mb-1">
            Homekeep is your personal home management assistant. Keep track of
            maintenance tasks, warranties, and important home information all in
            one place.
          </Text>
        </Box>

        <Box className="bg-white p-4 rounded-lg mb-4">
          <Heading size="md" className="text-typography-900 mb-2.5">Features</Heading>
          <VStack space="xs">
            <Text size="md" className="text-typography-600">• Track home maintenance tasks</Text>
            <Text size="md" className="text-typography-600">• Store warranty information</Text>
            <Text size="md" className="text-typography-600">• Set reminders for important dates</Text>
            <Text size="md" className="text-typography-600">• Organize home documents</Text>
          </VStack>
        </Box>

        <Box className="bg-white p-4 rounded-lg mb-4">
          <Heading size="md" className="text-typography-900 mb-2.5">Version</Heading>
          <Text size="md" className="text-typography-600">1.0.0</Text>
        </Box>

        <Button
          size="xl"
          variant="solid"
          action="primary"
          className="mt-5"
          onPress={() => navigation.goBack()}
        >
          <ButtonText>Back to Home</ButtonText>
        </Button>
      </Box>
    </ScrollView>
  );
}
