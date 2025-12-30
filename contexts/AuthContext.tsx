import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { generateTaskEventsForUser } from "../lib/scheduling";
import { UserTask, CoreTask, Frequency, UserProfile, Household, HouseholdMember, HouseholdMemberProfile, TaskSet } from "../lib/database.types";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { makeRedirectUri } from "expo-auth-session";

// Required for web browser auth session
WebBrowser.maybeCompleteAuthSession();

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

    // Create redirect URI for OAuth
    const redirectUri = makeRedirectUri({
        scheme: "homekeep",
        path: "auth/callback",
    });

    // Initialize user tasks by copying all core tasks to user_tasks
    const initializeUserTasks = useCallback(async (user: User): Promise<void> => {
        const userId = user.id;

        // Try to extract name from metadata
        const metadata = user.user_metadata || {};
        const fullName = metadata.full_name || metadata.name || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // First, create or update user profile (as not initialized yet)
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .upsert(
                {
                    user_id: userId,
                    initialized: false,
                    first_name: firstName,
                    last_name: lastName,
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: 'user_id',
                }
            )
            .select()
            .single();

        if (profileError) {
            console.error('Error creating user profile:', profileError);
            throw profileError;
        }

        if (profile) {
            setUserProfile(profile);
        }

        // Get all core tasks with frequency
        const { data: coreTasks, error: coreTasksError } = await supabase
            .from('core_tasks')
            .select('id, frequency');

        if (coreTasksError) {
            console.error('Error fetching core tasks:', coreTasksError);
            throw coreTasksError;
        }

        if (coreTasks && coreTasks.length > 0) {
            // Insert user tasks for each core task
            const userTasksData = coreTasks.map((task) => ({
                user_id: userId,
                core_task_id: task.id,
            }));

            const { data: insertedTasks, error: insertError } = await supabase
                .from('user_tasks')
                .insert(userTasksData)
                .select();

            if (insertError) {
                console.error('Error inserting user tasks:', insertError);
                throw insertError;
            }

            // Generate task events
            if (insertedTasks) {
                // Map frequency back to inserted tasks for the generator
                const taskMap = new Map(coreTasks.map(ct => [ct.id, ct.frequency as Frequency]));
                const fullTasks: UserTask[] = insertedTasks.map(t => ({
                    id: t.id,
                    user_id: t.user_id,
                    core_task_id: t.core_task_id,
                    created_at: t.created_at,
                    core_task: {
                        id: t.core_task_id,
                        frequency: taskMap.get(t.core_task_id!) as Frequency,
                    } as CoreTask
                }));

                const events = generateTaskEventsForUser(fullTasks);

                if (events.length > 0) {
                    const { error: eventError } = await supabase
                        .from('task_events')
                        .insert(events);

                    if (eventError) {
                        console.error('Error inserting task events:', eventError);
                        // We don't throw here to avoid breaking the whole init flow, but log it
                    }
                }
            }
        }

        // Mark user as initialized
        const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ initialized: true, updated_at: new Date().toISOString() })
            .eq('user_id', userId);

        if (updateError) {
            console.error('Error updating user profile:', updateError);
            throw updateError;
        }

        setIsInitialized(true);
    }, []);

    // Initialize user with selected task sets (called from onboarding screen)
    const initializeWithTaskSet = useCallback(async (taskSets: TaskSet[] | 'empty'): Promise<void> => {
        if (!user) return;

        const userId = user.id;
        setInitializingTasks(true);

        try {
            // Try to extract name from metadata
            const metadata = user.user_metadata || {};
            const fullName = metadata.full_name || metadata.name || '';
            const nameParts = fullName.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Determine primary task set (first non-addon set)
            const primarySet = taskSets === 'empty' ? null :
                (taskSets.find(s => s === 'apartment' || s === 'homeowner') || taskSets[0]);

            // First, create or update user profile
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
                    {
                        onConflict: 'user_id',
                    }
                )
                .select()
                .single();

            if (profileError) {
                console.error('Error creating user profile:', profileError);
                throw profileError;
            }

            // If not 'empty', create tasks from the selected sets
            if (taskSets !== 'empty' && taskSets.length > 0) {
                // Get core tasks for any of the selected sets using OR filter
                // Build filter for tasks that overlap with any of the selected sets
                const { data: coreTasks, error: coreTasksError } = await supabase
                    .from('core_tasks')
                    .select('id, frequency, task_set')
                    .or(taskSets.map(set => `task_set.cs.{${set}}`).join(','));

                if (coreTasksError) {
                    console.error('Error fetching core tasks:', coreTasksError);
                    throw coreTasksError;
                }

                if (coreTasks && coreTasks.length > 0) {
                    // Insert user tasks for each core task
                    const userTasksData = coreTasks.map((task) => ({
                        user_id: userId,
                        core_task_id: task.id,
                    }));

                    const { data: insertedTasks, error: insertError } = await supabase
                        .from('user_tasks')
                        .insert(userTasksData)
                        .select();

                    if (insertError) {
                        console.error('Error inserting user tasks:', insertError);
                        throw insertError;
                    }

                    // Generate task events
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
                            } as CoreTask
                        }));

                        const events = generateTaskEventsForUser(fullTasks);

                        if (events.length > 0) {
                            const { error: eventError } = await supabase
                                .from('task_events')
                                .insert(events);

                            if (eventError) {
                                console.error('Error inserting task events:', eventError);
                            }
                        }
                    }
                }
            }

            // Mark user as initialized and tutorial completed
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

            if (updateError) {
                console.error('Error updating user profile:', updateError);
                throw updateError;
            }

            if (updatedProfile) {
                setUserProfile(updatedProfile);
            }

            setIsInitialized(true);
            setTutorialCompleted(true);
        } catch (err) {
            console.error('Error in initializeWithTaskSet:', err);
            throw err;
        } finally {
            setInitializingTasks(false);
        }
    }, [user]);

    // Reset account - delete all user tasks and mark as not initialized
    const resetAccount = useCallback(async (): Promise<void> => {
        if (!user) return;

        try {
            setInitializingTasks(true);

            // Hard delete all user tasks (cascade should delete task_events)
            const { error: deleteError } = await supabase
                .from('user_tasks')
                .delete()
                .eq('user_id', user.id);

            if (deleteError) {
                console.error('Error deleting user tasks:', deleteError);
                throw deleteError;
            }

            // Mark user as not initialized and reset tutorial
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

            if (updateError) {
                console.error('Error updating user profile:', updateError);
                throw updateError;
            }

            if (updatedProfile) {
                setUserProfile(updatedProfile);
            }

            setIsInitialized(false);
            setTutorialCompleted(false);
            // Don't re-initialize - let user go through onboarding again
        } catch (err) {
            console.error('Error in resetAccount:', err);
            throw err;
        } finally {
            setInitializingTasks(false);
        }
    }, [user]);

    // Handle user initialization check - NO auto-initialize, wait for onboarding
    const handleUserInit = useCallback(async (currentUser: User): Promise<void> => {
        const userId = currentUser.id;
        console.log('handleUserInit started for:', userId);
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error checking user profile:', error);
            throw error;
        }

        const initialized = data?.initialized ?? false;
        const tutorialDone = data?.tutorial_completed ?? false;

        setIsInitialized(initialized);
        setTutorialCompleted(tutorialDone);

        if (data) {
            setUserProfile(data);
        } else {
            // Create a minimal profile for new users (they'll complete it in onboarding)
            console.log('No profile found, creating minimal profile for onboarding...');
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

            if (createError) {
                console.error('Error creating user profile:', createError);
                // Don't throw - let them proceed to onboarding anyway
            } else if (newProfile) {
                setUserProfile(newProfile);
            }
        }

        console.log('handleUserInit finished, tutorialCompleted:', tutorialDone);

        // Fetch Household
        const { data: memberData, error: memberError } = await supabase
            .from('household_members')
            .select('*, household:households(*)')
            .eq('user_id', userId)
            .maybeSingle();

        if (memberError) {
            console.error('Error fetching household member data:', memberError);
        }

        if (memberData && memberData.household) {
            setHousehold(memberData.household as unknown as Household);

            // Fetch all members
            const { data: members } = await supabase
                .from('household_members')
                .select('*, profile:user_profiles(*)')
                .eq('household_id', (memberData.household as Household).id);

            if (members) {
                setHouseholdMembers(members as unknown as HouseholdMemberProfile[]);
            }
        } else {
            setHousehold(null);
            setHouseholdMembers([]);
        }
    }, []);

    const createHousehold = useCallback(async (name: string): Promise<void> => {
        if (!user) return;
        try {
            setLoading(true);
            const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            // 1. Create Household
            const { data: householdData, error: createError } = await supabase
                .from('households')
                .insert({
                    name,
                    owner_id: user.id,
                    invite_code: inviteCode
                })
                .select()
                .single();

            if (createError) throw createError;

            // 2. Add creator as member (owner)
            const { error: memberError } = await supabase
                .from('household_members')
                .insert({
                    household_id: householdData.id,
                    user_id: user.id,
                    role: 'owner'
                });

            if (memberError) throw memberError;

            setHousehold(householdData);
        } catch (error) {
            console.error('Error creating household:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user]);

    const joinHousehold = useCallback(async (code: string): Promise<void> => {
        if (!user) return;
        try {
            setLoading(true);

            // 1. Find household by code using RPC to bypass RLS
            const { data: householdData, error: findError } = await supabase
                .rpc('get_household_by_invite_code', { code })
                .maybeSingle();

            if (findError || !householdData) {
                console.error('Error finding household:', findError);
                throw new Error('Invalid invite code');
            }

            const household = householdData as unknown as Household;

            // 2. Add user as member
            const { error: joinError } = await supabase
                .from('household_members')
                .insert({
                    household_id: household.id,
                    user_id: user.id,
                    role: 'member'
                });

            if (joinError) throw joinError;

            setHousehold(household);
        } catch (error) {
            console.error('Error joining household:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user]);

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
        } catch (error) {
            console.error('Error leaving household:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user, household]);

    useEffect(() => {
        let isMounted = true;

        // Prime session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!isMounted) return;
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
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

    // Initialize user tasks when user changes
    useEffect(() => {
        if (!user) {
            setIsInitialized(false);
            return;
        }

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
                if (!cancelled) {
                    setInitializingTasks(false);
                }
            }
        };

        init();

        return () => {
            cancelled = true;
        };
    }, [user, handleUserInit]);

    const signInWithGoogle = useCallback(async () => {
        try {
            setLoading(true);

            // Get the OAuth URL from Supabase
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: redirectUri,
                    skipBrowserRedirect: true,
                },
            });

            if (error) throw error;
            if (!data.url) throw new Error("No OAuth URL returned");

            // Open the browser for authentication
            const result = await WebBrowser.openAuthSessionAsync(
                data.url,
                redirectUri
            );

            if (result.type === "success") {
                // Extract the URL and get the session
                const url = result.url;

                // Parse the URL to get the access token and refresh token
                const params = new URL(url).hash.substring(1);
                const urlParams = new URLSearchParams(params);

                const accessToken = urlParams.get("access_token");
                const refreshToken = urlParams.get("refresh_token");

                if (accessToken && refreshToken) {
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (sessionError) throw sessionError;
                }
            }
        } catch (error) {
            console.error("Google sign-in error:", error);
            setLoading(false);
            throw error;
        }
    }, [redirectUri]);

    const signInWithEmail = useCallback(async (email: string, password: string) => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        } catch (error) {
            console.error("Email sign-in error:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const signUpWithEmail = useCallback(async (email: string, password: string) => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) throw error;
        } catch (error) {
            console.error("Email sign-up error:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const signOut = useCallback(async () => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error("Sign out error:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setUserProfile(data);
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    }, [user]);

    const value = {
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
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
