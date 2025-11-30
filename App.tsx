import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import AboutScreen from './screens/AboutScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import CoreTasksScreen from './screens/CoreTasksScreen';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Center } from '@/components/ui/center';
import { Spinner } from '@/components/ui/spinner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import '@/global.css';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  About: undefined;
  Settings: undefined;
  CoreTasks: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <Center className="flex-1">
        <Spinner size="lg" />
      </Center>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {session ? (
        // Authenticated screens
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Homekeep' }}
          />
          <Stack.Screen
            name="About"
            component={AboutScreen}
            options={{ title: 'About' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
          <Stack.Screen
            name="CoreTasks"
            component={CoreTasksScreen}
            options={{ title: 'Core Tasks' }}
          />
        </>
      ) : (
        // Unauthenticated screens
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <GluestackUIProvider mode="light">
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <Navigation />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GluestackUIProvider>
  );
}
