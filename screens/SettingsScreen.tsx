import React, { useState, useLayoutEffect } from 'react';
import { Alert, Platform, View, TextInput, Share } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Switch } from '@/components/ui/switch';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { ScrollView } from '@/components/ui/scroll-view';
import { useAuth } from '@/contexts/AuthContext';
import { FloatingBottomBar } from '@/components/FloatingBottomBar';
import { UserAvatar } from '@/components/UserAvatar';
import { MaterialIcons } from '@expo/vector-icons';
import { CreateHouseholdModal } from '@/components/CreateHouseholdModal';
import { JoinHouseholdModal } from '@/components/JoinHouseholdModal';

type RootStackParamList = {
  Home: undefined;
  About: undefined;
  Settings: { inviteCode?: string };
  CoreTasks: undefined;
};

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

interface SettingsScreenProps {
  navigation: SettingsScreenNavigationProp;
  route: RouteProp<RootStackParamList, 'Settings'>;
}

// Custom helper component for consistent card styling
function Card({ children, className, style }: { children: React.ReactNode; className?: string; style?: any }) {
  return (
    <View
      className={`bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 ${className || ''}`}
      style={style}
    >
      {children}
    </View>
  );
}

export default function SettingsScreen({ navigation, route }: SettingsScreenProps) {
  const { resetAccount, initializingTasks, signOut, user, userProfile, updateProfile, household, leaveHousehold } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const [firstName, setFirstName] = useState(userProfile?.first_name || '');
  const [lastName, setLastName] = useState(userProfile?.last_name || '');
  const [isSaving, setIsSaving] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  React.useEffect(() => {
    if (route.params?.inviteCode && !household) {
      setInviteCode(route.params.inviteCode);
      setJoinModalVisible(true);
    }
  }, [route.params?.inviteCode, household]);

  const handleShareInvite = async () => {
    if (!household?.invite_code) return;
    try {
      const url = `homekeep://join?code=${household.invite_code}`;
      await Share.share({
        message: `Join my household on Homekeep! Use code: ${household.invite_code} or click: ${url}`,
        url: url, // iOS supports url param
      });
    } catch (error) {
      Alert.alert('Error sharing invite');
    }
  };

  const handleLeaveHousehold = () => {
    Alert.alert(
      'Leave Household',
      'Are you sure you want to leave this household? Shared tasks will no longer be visible.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: leaveHousehold }
      ]
    );
  };

  React.useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.first_name || '');
      setLastName(userProfile.last_name || '');
    }
  }, [userProfile]);

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      await updateProfile({ first_name: firstName, last_name: lastName });
      if (Platform.OS === 'web') {
        window.alert('Profile updated successfully.');
      } else {
        Alert.alert('Success', 'Profile updated successfully.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Hide default header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

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
    <View className="flex-1 bg-background-light dark:bg-background-dark relative">
      {/* Sticky Top Bar */}
      <Box className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 px-4 pt-12 pb-4 backdrop-blur-md border-b border-gray-100/50 dark:border-white/5">
        <HStack className="items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">Settings</Text>
        </HStack>
      </Box>

      <ScrollView className="flex-1 mb-[80px]" showsVerticalScrollIndicator={false}>
        <Box className="px-4 pt-4 pb-8 space-y-6">

          {/* User Profile Section */}
          <Card>
            <HStack className="items-center space-x-4 mb-6">
              <UserAvatar className="w-14 h-14" textClassName="text-xl" />
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  {firstName && lastName ? `${firstName} ${lastName}` : firstName || user?.email || 'User'}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">Basic Member</Text>
              </View>
            </HStack>

            <Box className="space-y-4">
              <Box>
                <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 ml-1">First Name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter first name"
                  placeholderTextColor="#9ca3af"
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white"
                />
              </Box>
              <Box>
                <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 ml-1">Last Name</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter last name"
                  placeholderTextColor="#9ca3af"
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white"
                />
              </Box>

              <Pressable
                onPress={handleSaveProfile}
                disabled={isSaving}
                className={`py-3 rounded-full items-center ${isSaving ? 'bg-gray-300' : 'bg-[#131811] dark:bg-white'}`}
              >
                {isSaving ? <Spinner size="sm" color="#fff" /> : <Text className="text-white dark:text-[#131811] font-bold">Save Changes</Text>}
              </Pressable>
            </Box>
          </Card>

          {/* Household Section */}
          <Box>
            <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 ml-2">Household</Text>
            <Card>
              {household ? (
                <View className="items-center">
                  <Text className="text-xl font-bold text-gray-900 dark:text-white mb-1">{household.name}</Text>
                  <Text className="text-sm text-gray-500 mb-6">Member</Text>

                  <View className="bg-white p-4 rounded-xl shadow-sm mb-6">
                    <QRCode
                      value={`homekeep://join?code=${household.invite_code}`}
                      size={150}
                    />
                  </View>

                  <View className="w-full space-y-4">
                    <View className="items-center">
                      <Text className="text-xs text-gray-500 uppercase tracking-wider mb-1">Invite Code</Text>
                      <Pressable
                        onPress={handleShareInvite}
                        className="flex-row items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg"
                      >
                        <Text className="text-xl font-mono font-bold tracking-widest text-primary">{household.invite_code}</Text>
                        <MaterialIcons name="content-copy" size={16} color="#5bec13" />
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={handleShareInvite}
                      className="w-full py-3 bg-[#131811] dark:bg-white rounded-full items-center active:opacity-90"
                    >
                      <Text className="text-white dark:text-[#131811] font-bold">Share Invite</Text>
                    </Pressable>

                    <Pressable
                      onPress={handleLeaveHousehold}
                      className="w-full py-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-full items-center active:opacity-90"
                    >
                      <Text className="text-red-600 dark:text-red-400 font-bold">Leave Household</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View className="items-center py-4">
                  <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
                    <MaterialIcons name="home-work" size={32} color="#5bec13" />
                  </View>
                  <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">Create a Household</Text>
                  <Text className="text-center text-gray-500 dark:text-gray-400 mb-6 px-4">
                    Share tasks and manage your home together with family or roommates.
                  </Text>

                  <View className="w-full space-y-3">
                    <Pressable
                      onPress={() => setCreateModalVisible(true)}
                      className="w-full py-3 bg-[#131811] dark:bg-white rounded-full items-center active:opacity-90"
                    >
                      <Text className="text-white dark:text-[#131811] font-bold">Create Household</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setJoinModalVisible(true)}
                      className="w-full py-3 bg-gray-100 dark:bg-gray-800 rounded-full items-center active:opacity-90"
                    >
                      <Text className="text-gray-900 dark:text-white font-bold">Join Existing</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </Card>
          </Box>

          {/* Preferences */}
          <Box>
            <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 ml-2">Preferences</Text>
            <Card className="p-0 overflow-hidden">
              <HStack className="justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
                <HStack className="items-center space-x-3">
                  <View className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center">
                    <MaterialIcons name="notifications" size={18} color="#3b82f6" />
                  </View>
                  <Text className="text-base font-medium text-gray-900 dark:text-white">Push Notifications</Text>
                </HStack>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#e5e7eb', true: '#5bec13' }}
                  thumbColor={Platform.OS === 'ios' ? '#fff' : '#fff'}
                />
              </HStack>

              <HStack className="justify-between items-center p-4">
                <HStack className="items-center space-x-3">
                  <View className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/20 items-center justify-center">
                    <MaterialIcons name="dark-mode" size={18} color="#8b5cf6" />
                  </View>
                  <Text className="text-base font-medium text-gray-900 dark:text-white">Dark Mode</Text>
                </HStack>
                <Switch
                  value={darkModeEnabled}
                  onValueChange={setDarkModeEnabled}
                  trackColor={{ false: '#e5e7eb', true: '#5bec13' }}
                />
              </HStack>
            </Card>
          </Box>

          {/* Account */}
          <Box>
            <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 ml-2">Account</Text>
            <Card className="p-0 overflow-hidden">
              {[
                { label: 'Profile Settings', icon: 'person', color: '#f59e0b', action: () => { } },
                { label: 'Privacy & Security', icon: 'security', color: '#10b981', action: () => { } },
                { label: 'Core Maintenance Tasks', icon: 'list-alt', color: '#ec4899', action: () => navigation.navigate('CoreTasks') },
              ].map((item, index, arr) => (
                <Pressable
                  key={item.label}
                  onPress={item.action}
                  className={`flex-row justify-between items-center p-4 active:bg-gray-50 dark:active:bg-white/5 ${index !== arr.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}
                >
                  <HStack className="items-center space-x-3">
                    <View className={`w-8 h-8 rounded-full items-center justify-center`} style={{ backgroundColor: `${item.color}20` }}>
                      <MaterialIcons name={item.icon as any} size={18} color={item.color} />
                    </View>
                    <Text className="text-base font-medium text-gray-900 dark:text-white">{item.label}</Text>
                  </HStack>
                  <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
                </Pressable>
              ))}
            </Card>
          </Box>

          {/* Danger Zone */}
          <Box>
            <Text className="text-sm font-bold text-red-500 uppercase tracking-wider mb-3 ml-2">Danger Zone</Text>
            <View className="space-y-3">
              <Pressable
                onPress={handleResetAccount}
                disabled={isResetting || initializingTasks}
                className="flex-row items-center justify-center p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 active:opacity-80"
              >
                {isResetting || initializingTasks ? (
                  <Spinner size="sm" color="#dc2626" />
                ) : (
                  <HStack className="items-center space-x-2">
                    <MaterialIcons name="restart-alt" size={20} color="#dc2626" />
                    <Text className="text-red-600 dark:text-red-400 font-bold">Reset Account</Text>
                  </HStack>
                )}
              </Pressable>

              <Pressable
                onPress={handleSignOut}
                className="flex-row items-center justify-center p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark active:bg-gray-50 dark:active:bg-gray-800"
              >
                <HStack className="items-center space-x-2">
                  <MaterialIcons name="logout" size={20} color="#6b7280" />
                  <Text className="text-gray-600 dark:text-gray-300 font-bold">Sign Out</Text>
                </HStack>
              </Pressable>
            </View>
          </Box>

          <Text className="text-center text-xs text-gray-400 mt-4">Version 1.0.0 (Build 240)</Text>

        </Box>
      </ScrollView>
      <FloatingBottomBar activeRoute="Settings" />

      <CreateHouseholdModal
        isVisible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />
      <JoinHouseholdModal
        isVisible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
        initialCode={inviteCode}
      />
    </View>
  );
}
