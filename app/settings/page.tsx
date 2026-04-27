'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/Switch';
import { Spinner } from '@/components/ui/Spinner';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { FloatingBottomBar } from '@/components/layout/FloatingBottomBar';
import { CreateHouseholdModal } from '@/components/household/CreateHouseholdModal';
import { JoinHouseholdModal } from '@/components/household/JoinHouseholdModal';
import {
  Bell, Moon, User, ShieldCheck, List, ChevronRight,
  RotateCcw, LogOut, Copy, Share2, Home
} from 'lucide-react';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-800 ${className}`}>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background-light dark:bg-background-dark" />}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetAccount, initializingTasks, signOut, user, userProfile, updateProfile, household, leaveHousehold } = useAuth();

  const [firstName, setFirstName] = useState(userProfile?.first_name || '');
  const [lastName, setLastName] = useState(userProfile?.last_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const [budgetEnabled, setBudgetEnabled] = useState(userProfile?.budget_enabled !== false);
  const [timeBudget, setTimeBudget] = useState(userProfile?.daily_time_budget ?? 75);
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const [isResetting, setIsResetting] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    setDarkModeEnabled(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.first_name || '');
      setLastName(userProfile.last_name || '');
      setBudgetEnabled(userProfile.budget_enabled !== false);
      setTimeBudget(userProfile.daily_time_budget ?? 75);
    }
  }, [userProfile]);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code && !household) {
      setInviteCode(code);
      setJoinModalVisible(true);
    }
  }, [searchParams, household]);

  const handleDarkModeToggle = (value: boolean) => {
    setDarkModeEnabled(value);
    if (value) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      await updateProfile({ first_name: firstName, last_name: lastName });
      setProfileMessage('Profile updated successfully.');
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareInvite = async () => {
    if (!household?.invite_code) return;
    const url = `${window.location.origin}/settings?code=${household.invite_code}`;
    const text = `Join my household on Homekeep! Use code: ${household.invite_code} or open: ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
      } else {
        await navigator.clipboard.writeText(text);
        alert('Invite link copied to clipboard!');
      }
    } catch {
      // user cancelled share
    }
  };

  const handleLeaveHousehold = () => {
    if (window.confirm('Are you sure you want to leave this household? Shared tasks will no longer be visible.')) {
      leaveHousehold();
    }
  };

  const handleResetAccount = () => {
    if (!window.confirm('This will delete all your tasks and restore the default core tasks. This action cannot be undone.')) return;
    const performReset = async () => {
      try {
        setIsResetting(true);
        await resetAccount();
        alert('Your account has been reset with fresh tasks.');
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to reset account');
      } finally {
        setIsResetting(false);
      }
    };
    void performReset();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // signOut navigates away; ignore errors
    }
  };

  return (
    <div className="flex-1 bg-background-light dark:bg-background-dark min-h-screen pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-4 pt-12 pb-4 border-b border-gray-100/50 dark:border-white/5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      <div className="px-4 pt-4 pb-8 flex flex-col gap-6">

        {/* Profile */}
        <Card className="p-4">
          <div className="flex items-center gap-4 mb-6">
            <UserAvatar className="w-14 h-14" textClassName="text-xl" />
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {firstName && lastName ? `${firstName} ${lastName}` : firstName || user?.email || 'User'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Basic Member</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Enter first name"
                className="w-full h-11 px-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Enter last name"
                className="w-full h-11 px-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary"
              />
            </div>

            {profileMessage && (
              <p className={`text-sm ${profileMessage.includes('success') || profileMessage.includes('updated') ? 'text-green-600' : 'text-red-500'}`}>
                {profileMessage}
              </p>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="h-11 bg-gray-900 dark:bg-white rounded-full font-bold text-white dark:text-gray-900 hover:opacity-90 active:opacity-80 disabled:opacity-50 flex items-center justify-center"
            >
              {isSaving ? <Spinner size="sm" /> : 'Save Changes'}
            </button>
          </div>
        </Card>

        {/* Household */}
        <div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 ml-1">Household</p>
          <Card className="p-4">
            {household ? (
              <div className="flex flex-col items-center">
                <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">{household.name}</p>
                <p className="text-sm text-gray-500 mb-6">Member</p>

                <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
                  <QRCodeSVG
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/settings?code=${household.invite_code}`}
                    size={150}
                  />
                </div>

                <div className="w-full flex flex-col gap-4">
                  <div className="flex flex-col items-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Invite Code</p>
                    <button
                      onClick={handleShareInvite}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <span className="text-xl font-mono font-bold tracking-widest text-primary">{household.invite_code}</span>
                      <Copy size={16} className="text-primary" />
                    </button>
                  </div>

                  <button
                    onClick={handleShareInvite}
                    className="w-full h-11 bg-gray-900 dark:bg-white rounded-full font-bold text-white dark:text-gray-900 hover:opacity-90 active:opacity-80 flex items-center justify-center gap-2"
                  >
                    <Share2 size={16} />
                    Share Invite
                  </button>

                  <button
                    onClick={handleLeaveHousehold}
                    className="w-full h-11 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-full font-bold text-red-600 dark:text-red-400 hover:bg-red-100 active:opacity-80"
                  >
                    Leave Household
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Home size={32} className="text-primary" />
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">Create a Household</p>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-6 px-4 text-sm leading-relaxed">
                  Share tasks and manage your home together with family or roommates.
                </p>

                <div className="w-full flex flex-col gap-3">
                  <button
                    onClick={() => setCreateModalVisible(true)}
                    className="w-full h-11 bg-gray-900 dark:bg-white rounded-full font-bold text-white dark:text-gray-900 hover:opacity-90 active:opacity-80"
                  >
                    Create Household
                  </button>
                  <button
                    onClick={() => setJoinModalVisible(true)}
                    className="w-full h-11 bg-gray-100 dark:bg-zinc-800 rounded-full font-bold text-gray-900 dark:text-white hover:opacity-90 active:opacity-80"
                  >
                    Join Existing
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Preferences */}
        <div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 ml-1">Preferences</p>
          <Card className="overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Bell size={16} className="text-blue-500" />
                </div>
                <span className="text-base font-medium text-gray-900 dark:text-white">Push Notifications</span>
              </div>
              <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
            </div>
            <div className="flex justify-between items-center p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                  <Moon size={16} className="text-purple-500" />
                </div>
                <span className="text-base font-medium text-gray-900 dark:text-white">Dark Mode</span>
              </div>
              <Switch value={darkModeEnabled} onValueChange={handleDarkModeToggle} />
            </div>
          </Card>
        </div>

        {/* Time Budget */}
        <div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 ml-1">Time Budget</p>
          <Card className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex-1 mr-4">
                  <p className="text-base font-medium text-gray-900 dark:text-white">Enable Time Budget</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Limit daily tasks to a manageable amount. Overflow goes to &quot;Get Ahead&quot;.
                  </p>
                </div>
                <Switch
                  value={budgetEnabled}
                  onValueChange={async (value) => {
                    setBudgetEnabled(value);
                    setIsSavingBudget(true);
                    try {
                      await updateProfile({ budget_enabled: value });
                    } catch (e) {
                      console.error('Failed to save budget setting:', e);
                    } finally {
                      setIsSavingBudget(false);
                    }
                  }}
                />
              </div>

              {budgetEnabled && (
                <div className="pt-1">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Daily Time Budget</p>
                    <span className="px-3 py-1 bg-primary/20 rounded-full text-sm font-bold text-gray-800 dark:text-primary">
                      {timeBudget} min
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[30, 45, 60, 75, 90, 120, 150, 180].map((preset) => (
                      <button
                        key={preset}
                        onClick={async () => {
                          setTimeBudget(preset);
                          setIsSavingBudget(true);
                          try {
                            await updateProfile({ daily_time_budget: preset });
                          } catch (e) {
                            console.error('Failed to save time budget:', e);
                          } finally {
                            setIsSavingBudget(false);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${timeBudget === preset ? 'bg-primary text-gray-900' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'}`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tasks beyond this limit will appear in the &quot;Get Ahead&quot; section. Overdue tasks are sorted first.
                  </p>
                </div>
              )}

              {isSavingBudget && (
                <div className="flex items-center justify-center gap-2 py-1">
                  <Spinner size="sm" />
                  <span className="text-xs text-gray-500">Saving...</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Account */}
        <div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 ml-1">Account</p>
          <Card className="overflow-hidden">
            {[
              { label: 'Profile Settings', Icon: User, color: '#f59e0b', action: () => {} },
              { label: 'Privacy & Security', Icon: ShieldCheck, color: '#10b981', action: () => {} },
              { label: 'Core Maintenance Tasks', Icon: List, color: '#ec4899', action: () => router.push('/tasks') },
            ].map(({ label, Icon, color, action }, index, arr) => (
              <button
                key={label}
                onClick={action}
                className={`w-full flex justify-between items-center p-4 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 transition-colors text-left ${index !== arr.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span className="text-base font-medium text-gray-900 dark:text-white">{label}</span>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            ))}
          </Card>
        </div>

        {/* Danger Zone */}
        <div>
          <p className="text-sm font-bold text-red-500 uppercase tracking-wider mb-3 ml-1">Danger Zone</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleResetAccount}
              disabled={isResetting || initializingTasks}
              className="flex items-center justify-center gap-2 p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 font-bold text-red-600 dark:text-red-400 hover:bg-red-100 active:opacity-80 disabled:opacity-50"
            >
              {isResetting || initializingTasks ? <Spinner size="sm" /> : (
                <>
                  <RotateCcw size={18} />
                  Reset Account
                </>
              )}
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 active:opacity-80"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">Version 1.0.0 (Build 240)</p>
      </div>

      <FloatingBottomBar />

      <CreateHouseholdModal
        isVisible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />
      <JoinHouseholdModal
        isVisible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
        initialCode={inviteCode}
      />
    </div>
  );
}
