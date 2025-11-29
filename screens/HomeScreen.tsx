import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { Center } from '@/components/ui/center';

type RootStackParamList = {
  Home: undefined;
  About: undefined;
  Settings: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <Center className="flex-1 bg-background-50 p-5">
      <Heading size="2xl" className="text-typography-900 mb-2.5">Welcome to Homekeep!</Heading>
      <Text size="lg" className="text-typography-500 mb-10 text-center">Your home management companion</Text>

      <VStack space="md" className="w-full max-w-[300px]">
        <Button
          size="xl"
          variant="solid"
          action="primary"
          onPress={() => navigation.navigate('About')}
        >
          <ButtonText>Learn More</ButtonText>
        </Button>

        <Button
          size="xl"
          variant="solid"
          action="primary"
          onPress={() => navigation.navigate('Settings')}
        >
          <ButtonText>Settings</ButtonText>
        </Button>
      </VStack>
    </Center>
  );
}
