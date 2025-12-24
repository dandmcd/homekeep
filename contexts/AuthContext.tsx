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
import { UserTask, CoreTask, Frequency, UserProfile } from "../lib/database.types";
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
    initializingTasks: boolean;
    userProfile: UserProfile | null;
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    resetAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [initializingTasks, setInitializingTasks] = useState(false);

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

    // Reset account - delete all user tasks and mark as not initialized
    const resetAccount = useCallback(async (): Promise<void> => {
        if (!user) return;

        try {
            setInitializingTasks(true);

            // Hard delete all user tasks
            const { error: deleteError } = await supabase
                .from('user_tasks')
                .delete()
                .eq('user_id', user.id);

            if (deleteError) {
                console.error('Error deleting user tasks:', deleteError);
                throw deleteError;
            }

            // Mark user as not initialized
            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ initialized: false, updated_at: new Date().toISOString() })
                .eq('user_id', user.id);

            if (updateError) {
                console.error('Error updating user profile:', updateError);
                throw updateError;
            }

            setIsInitialized(false);

            // Re-initialize with fresh core tasks
            await initializeUserTasks(user);
        } catch (err) {
            console.error('Error in resetAccount:', err);
            throw err;
        } finally {
            setInitializingTasks(false);
        }
    }, [user, initializeUserTasks]);

    // Handle user initialization check and auto-initialize
    const handleUserInit = useCallback(async (currentUser: User): Promise<void> => {
        const userId = currentUser.id;
        console.log('handleUserInit started for:', userId);
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking user profile:', error);
            throw error;
        }

        const initialized = data?.initialized ?? false;
        setIsInitialized(initialized);

        if (data) {
            setUserProfile(data);
        }

        if (!initialized) {
            console.log('User not initialized, starting initializeUserTasks...');
            await initializeUserTasks(currentUser);
            console.log('initializeUserTasks completed');
        } else {
            console.log('User already initialized in database, skipping task creation');
        }

        console.log('handleUserInit finished');
    }, [initializeUserTasks]);

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
        updateProfile,
        loading,
        isInitialized,
        initializingTasks,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        resetAccount,
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
