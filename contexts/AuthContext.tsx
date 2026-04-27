'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { generateTaskEventsForUser } from '../lib/scheduling';
import {
  UserTask,
  CoreTask,
  Frequency,
  UserProfile,
  Household,
  HouseholdMemberProfile,
  TaskSet,
} from '../lib/database.types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isInitialized: boolean;
  tutorialCompleted: boolean;
  initializingTasks: boolean;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetAccount: () => Promise<void>;
  initializeWithTaskSet: (taskSets: TaskSet[] | 'empty') => Promise<void>;
  household: Household | null;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (code: string) => Promise<void>;
  leaveHousehold: () => Promise<void>;
  householdMembers: HouseholdMemberProfile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [initializingTasks, setInitializingTasks] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMemberProfile[]>([]);

  const initializeWithTaskSet = useCallback(async (taskSets: TaskSet[] | 'empty'): Promise<void> => {
    if (!user) return;

    const userId = user.id;
    setInitializingTasks(true);

    try {
      const metadata = user.user_metadata || {};
      const fullName = metadata.full_name || metadata.name || '';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const primarySet = taskSets === 'empty' ? null :
        (taskSets.find(s => s === 'apartment' || s === 'homeowner') || taskSets[0]);

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: userId,
            initialized: false,
            tutorial_completed: false,
            selected_task_set: primarySet,
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (profileError) throw profileError;
      void profile;

      if (taskSets !== 'empty' && taskSets.length > 0) {
        const { data: coreTasks, error: coreTasksError } = await supabase
          .from('core_tasks')
          .select('id, frequency, task_set')
          .or(taskSets.map(set => `task_set.cs.{${set}}`).join(','));

        if (coreTasksError) throw coreTasksError;

        if (coreTasks && coreTasks.length > 0) {
          const userTasksData = coreTasks.map((task) => ({
            user_id: userId,
            core_task_id: task.id,
          }));

          const { data: insertedTasks, error: insertError } = await supabase
            .from('user_tasks')
            .insert(userTasksData)
            .select();

          if (insertError) throw insertError;

          if (insertedTasks) {
            const taskMap = new Map(coreTasks.map(ct => [ct.id, ct.frequency as Frequency]));
            const fullTasks: UserTask[] = insertedTasks.map(t => ({
              id: t.id,
              user_id: t.user_id,
              core_task_id: t.core_task_id,
              created_at: t.created_at,
              core_task: {
                id: t.core_task_id,
                frequency: taskMap.get(t.core_task_id!) as Frequency,
              } as CoreTask,
            }));

            const events = generateTaskEventsForUser(fullTasks);

            if (events.length > 0) {
              await supabase.from('task_events').insert(events);
            }
          }
        }
      }

      const { data: updatedProfile, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          initialized: true,
          tutorial_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      if (updatedProfile) setUserProfile(updatedProfile);
      setIsInitialized(true);
      setTutorialCompleted(true);
    } catch (err) {
      console.error('Error in initializeWithTaskSet:', err);
      throw err;
    } finally {
      setInitializingTasks(false);
    }
  }, [user]);

  const resetAccount = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      setInitializingTasks(true);

      const { error: deleteError } = await supabase
        .from('user_tasks')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      const { data: updatedProfile, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          initialized: false,
          tutorial_completed: false,
          selected_task_set: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (updatedProfile) setUserProfile(updatedProfile);

      setIsInitialized(false);
      setTutorialCompleted(false);
    } catch (err) {
      console.error('Error in resetAccount:', err);
      throw err;
    } finally {
      setInitializingTasks(false);
    }
  }, [user]);

  const handleUserInit = useCallback(async (currentUser: User): Promise<void> => {
    const userId = currentUser.id;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    const initialized = data?.initialized ?? false;
    const tutorialDone = data?.tutorial_completed ?? false;

    setIsInitialized(initialized);
    setTutorialCompleted(tutorialDone);

    if (data) {
      setUserProfile(data);
    } else {
      const metadata = currentUser.user_metadata || {};
      const fullName = metadata.full_name || metadata.name || '';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          initialized: false,
          tutorial_completed: false,
          first_name: firstName,
          last_name: lastName,
        })
        .select()
        .single();

      if (!createError && newProfile) setUserProfile(newProfile);
    }

    const { data: memberData, error: memberError } = await supabase
      .from('household_members')
      .select('*, household:households(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError) console.error('Error fetching household:', memberError);

    if (memberData && memberData.household) {
      setHousehold(memberData.household as unknown as Household);

      const { data: members } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', (memberData.household as Household).id);

      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        const membersWithProfiles = members.map(member => ({
          ...member,
          profile: profileMap.get(member.user_id) || null,
        })) as unknown as HouseholdMemberProfile[];

        setHouseholdMembers(membersWithProfiles);
      } else {
        setHouseholdMembers([]);
      }
    } else {
      setHousehold(null);
      setHouseholdMembers([]);
    }
  }, []);

  const fetchHouseholdMembers = useCallback(async (householdId: string): Promise<void> => {
    const { data: members, error: membersError } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', householdId);

    if (membersError) { console.error(membersError); return; }
    if (!members || members.length === 0) { setHouseholdMembers([]); return; }

    const userIds = members.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const membersWithProfiles = members.map(member => ({
      ...member,
      profile: profileMap.get(member.user_id) || null,
    })) as unknown as HouseholdMemberProfile[];

    setHouseholdMembers(membersWithProfiles);
  }, []);

  const createHousehold = useCallback(async (name: string): Promise<void> => {
    if (!user) return;
    try {
      setLoading(true);
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: householdData, error: createError } = await supabase
        .from('households')
        .insert({ name, owner_id: user.id, invite_code: inviteCode })
        .select()
        .single();

      if (createError) throw createError;

      const { error: memberError } = await supabase
        .from('household_members')
        .insert({ household_id: householdData.id, user_id: user.id, role: 'owner' });

      if (memberError) throw memberError;

      setHousehold(householdData);
      await fetchHouseholdMembers(householdData.id);
    } catch (error) {
      console.error('Error creating household:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, fetchHouseholdMembers]);

  const joinHousehold = useCallback(async (code: string): Promise<void> => {
    if (!user) return;
    try {
      setLoading(true);

      const { data: householdData, error: findError } = await supabase
        .rpc('get_household_by_invite_code', { code })
        .maybeSingle();

      if (findError || !householdData) throw new Error('Invalid invite code');

      const hh = householdData as unknown as Household;

      const { error: joinError } = await supabase
        .from('household_members')
        .insert({ household_id: hh.id, user_id: user.id, role: 'member' });

      if (joinError) throw joinError;

      setHousehold(hh);
      await fetchHouseholdMembers(hh.id);
    } catch (error) {
      console.error('Error joining household:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, fetchHouseholdMembers]);

  const leaveHousehold = useCallback(async (): Promise<void> => {
    if (!user || !household) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', household.id)
        .eq('user_id', user.id);

      if (error) throw error;
      setHousehold(null);
      setHouseholdMembers([]);
    } catch (error) {
      console.error('Error leaving household:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, household]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) { setIsInitialized(false); return; }

    let cancelled = false;
    const init = async () => {
      setInitializingTasks(true);
      try {
        await handleUserInit(user);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to initialize user:', err);
          setIsInitialized(false);
        }
      } finally {
        if (!cancelled) setInitializingTasks(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [user, handleUserInit]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    if (data) setUserProfile(data);
  }, [user]);

  const value: AuthContextType = {
    session,
    user,
    userProfile,
    isAdmin: userProfile?.role === 'admin',
    updateProfile,
    loading,
    isInitialized,
    tutorialCompleted,
    initializingTasks,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetAccount,
    initializeWithTaskSet,
    household,
    householdMembers,
    createHousehold,
    joinHousehold,
    leaveHousehold,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
