import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// SecureStore adapter for Supabase auth session persistence
const ExpoSecureStoreAdapter = {
    getItem: (key: string) => {
        return SecureStore.getItemAsync(key);
    },
    setItem: (key: string, value: string) => {
        SecureStore.setItemAsync(key, value);
    },
    removeItem: (key: string) => {
        SecureStore.deleteItemAsync(key);
    },
};

// Web storage adapter (SecureStore doesn't work on web)
const WebStorageAdapter = {
    getItem: (key: string) => {
        if (typeof window !== "undefined") {
            return Promise.resolve(localStorage.getItem(key));
        }
        return Promise.resolve(null);
    },
    setItem: (key: string, value: string) => {
        if (typeof window !== "undefined") {
            localStorage.setItem(key, value);
        }
        return Promise.resolve();
    },
    removeItem: (key: string) => {
        if (typeof window !== "undefined") {
            localStorage.removeItem(key);
        }
        return Promise.resolve();
    },
};

// Supabase project credentials
// Get these from: https://supabase.com/dashboard/project/_/settings/api
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL";
// Use Publishable Key (preferred) or Anon Key (legacy) for client-side apps
const supabasePublishableKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    "YOUR_SUPABASE_PUBLISHABLE_KEY";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
        storage: Platform.OS === "web" ? WebStorageAdapter : ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
